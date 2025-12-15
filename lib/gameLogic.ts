import { GameState, GameAction, Suit, Player, GameSettings } from './types';
import { prepareRoundDeck, createDeck } from './deck';
import {
    getTrickWinner,
    isValidPlay,
    calculateScores,
    canBet
} from './gameEngine';

// Helper to start a round (or continue game)
// Returns updated state (mutated if passed, or copy)
function playRound(state: GameState, seed: string): GameState {
    const numPlayers = state.players.length;

    // Round 1 calculates cardsPerPlayer from user input (already set in START_GAME)
    // Subsequent rounds: cardsPerPlayer - 1
    if (state.roundIndex > 0) {
        state.cardsPerPlayer = state.cardsPerPlayer - 1;
    }

    if (state.cardsPerPlayer < 1) {
        state.phase = 'finished';
        return state;
    }

    try {
        const { hands, remainingDeck, discarded } = prepareRoundDeck(
            state.currentDeck,
            state.roundIndex,
            numPlayers,
            state.cardsPerPlayer,
            seed
        );

        state.players.forEach((p, i) => {
            p.hand = hands[i];
            p.currentBet = null;
            p.tricksWon = 0;
        });

        // The 'currentDeck' in state becomes the remaining cards
        state.currentDeck = remainingDeck;

        // Trump rotation: Spades -> Hearts -> Diamonds -> Clubs
        const trumpOrder: Suit[] = ['spades', 'hearts', 'diamonds', 'clubs'];
        state.trump = trumpOrder[state.roundIndex % 4];

        state.dealerSeatIndex = state.roundIndex % numPlayers;
        state.currentLeaderSeatIndex = (state.dealerSeatIndex + 1) % numPlayers;
        state.phase = 'betting';
        state.currentTrick = [];
        state.playedPile = [];

    } catch (e) {
        console.error("Failed to start round:", e);
        state.phase = 'finished';
    }
    return state;
}

// Pure-ish reducer for Game Actions
// Throws error if action is invalid, returns new GameState if valid
export function processGameAction(currentState: GameState, action: GameAction): GameState {
    // Deep copy to ensure immutability from outside perspective
    let newState: GameState = JSON.parse(JSON.stringify(currentState));

    // Common Action Processing
    switch (action.type) {
        case 'JOIN':
            const joinAction = action as any;
            if (newState.players.some((p: Player) => p.id === joinAction.playerId)) {
                // Reconnect existing
                const p = newState.players.find((p: Player) => p.id === joinAction.playerId);
                if (p) p.connected = true;
            } else {
                // New Joiner
                const newPlayer: Player = {
                    id: joinAction.playerId,
                    name: joinAction.payload.name,
                    seatIndex: newState.players.length,
                    isHost: false,
                    connected: true,
                    isAway: false,
                    currentBet: null,
                    tricksWon: 0,
                    totalPoints: 0,
                    hand: []
                };
                newState.players.push(newPlayer);
            }
            break;

        case 'START_GAME':
            if (newState.phase !== 'lobby' && newState.phase !== 'finished') {
                throw new Error("Cannot start game - not in lobby");
            }

            // Initialize match
            newState.roundIndex = 0;
            newState.scoresHistory = [];
            newState.players.forEach((p: Player) => { p.totalPoints = 0; p.tricksWon = 0; p.currentBet = null; p.hand = []; });

            // Set initial deck (52 cards)
            newState.currentDeck = createDeck();
            newState.playedPile = [];

            // Set initial cards per player
            const payload = (action as any).payload;
            if (payload && payload.initialCardsPerPlayer) {
                newState.cardsPerPlayer = payload.initialCardsPerPlayer;
            } else {
                // Default fallback
                newState.cardsPerPlayer = Math.floor(52 / newState.players.length);
            }

            playRound(newState, newState.deckSeed);
            break;

        case 'BET':
            const playerIndex = newState.players.findIndex(p => p.id === action.playerId);
            if (playerIndex === -1) throw new Error("Player not found");

            // Check phase? Usually Phase check logic is in UI, but good to have here
            if (newState.phase !== 'betting') throw new Error("Not betting phase");

            // Turn check?
            if (newState.players[newState.currentLeaderSeatIndex].id !== action.playerId) {
                throw new Error("Not your turn to bet");
            }

            const currentValidBets = newState.players
                .filter(p => p.currentBet !== null)
                .map(p => p.currentBet as number);

            if (!canBet(action.bet, currentValidBets, newState.players.length, newState.cardsPerPlayer)) {
                throw new Error("Invalid bet (Dealer constraint)");
            }

            newState.players[playerIndex].currentBet = action.bet;
            newState.currentLeaderSeatIndex = (newState.currentLeaderSeatIndex + 1) % newState.players.length;

            // If all bets placed, switch to playing
            if (newState.players.every(p => p.currentBet !== null)) {
                newState.phase = 'playing';
                // Leader adds 1 from dealer.
                // Actually, the trick leader should be the one to left of dealer.
                // In BETTING, we rotated currentLeaderSeatIndex.
                // Once everyone bet, we need to reset to the first player to play.
                // Who leads the first trick? The one left of dealer.
                newState.currentLeaderSeatIndex = (newState.dealerSeatIndex + 1) % newState.players.length;
            }
            break;

        case 'PLAY_CARD':
            const pIndex = newState.players.findIndex(p => p.id === action.playerId);
            if (pIndex === -1) throw new Error("Player not found");

            if (newState.phase !== 'playing') throw new Error("Not playing phase");

            // Turn check
            if (newState.players[newState.currentLeaderSeatIndex].id !== action.playerId) {
                throw new Error("Not your turn to play");
            }

            const player = newState.players[pIndex];
            const card = action.card;

            if (!isValidPlay(card, player.hand, newState.currentTrick, newState.trump)) {
                throw new Error("Invalid card play");
            }

            player.hand = player.hand.filter(c => !(c.suit === card.suit && c.rank === card.rank));
            newState.currentTrick.push({ seatIndex: pIndex, card: card });
            newState.currentLeaderSeatIndex = (newState.currentLeaderSeatIndex + 1) % newState.players.length;

            if (newState.currentTrick.length === newState.players.length) {
                const winnerSeatIndex = getTrickWinner(newState.currentTrick, newState.trump);
                newState.players[winnerSeatIndex].tricksWon = (newState.players[winnerSeatIndex].tricksWon || 0) + 1;

                // Move trick cards to playedPile
                const trickCards = newState.currentTrick.map(pc => pc.card);
                if (!newState.playedPile) newState.playedPile = [];
                newState.playedPile.push(...trickCards);

                newState.currentTrick = [];
                newState.currentLeaderSeatIndex = winnerSeatIndex;

                if (newState.players[0].hand.length === 0) {
                    // Round finished
                    const roundScores = calculateScores(newState.players);
                    newState.players.forEach(p => {
                        p.totalPoints = (p.totalPoints || 0) + (roundScores[p.id] || 0);
                    });
                    newState.roundIndex++;

                    // Prepare deck for next round
                    newState.currentDeck = [...newState.playedPile];
                    newState.playedPile = [];

                    playRound(newState, newState.deckSeed + newState.roundIndex);
                }
            }
            break;

        case 'UPDATE_SETTINGS':
            const updateSettingsAction = action as { type: 'UPDATE_SETTINGS', settings: Partial<GameSettings> };
            newState.settings = { ...newState.settings, ...updateSettingsAction.settings };
            break;

        case 'TOGGLE_AWAY':
            const awayPlayer = newState.players.find((p: Player) => p.id === action.playerId);
            if (awayPlayer) awayPlayer.isAway = !awayPlayer.isAway;
            break;

        case 'RENAME_PLAYER':
            const renamePlayer = newState.players.find((p: Player) => p.id === action.playerId);
            if (renamePlayer) renamePlayer.name = action.newName;
            break;

        case 'END_GAME':
            newState.phase = 'finished';
            break;
    }

    return newState;
}
