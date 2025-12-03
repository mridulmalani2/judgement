import { Server, Socket } from 'socket.io';
import { v4 as uuidv4 } from 'uuid';
import { GameState, Player, GameAction, Card, Suit } from '../lib/types';
import { createDeck, shuffleDeck, dealCards } from '../lib/deck';
import {
    getTrickWinner,
    isValidPlay,
    calculateScores,
    canBet,
    getAutoPlayCard
} from '../lib/gameEngine';

interface RoomState {
    gameState: GameState;
    lastActivity: number;
}

const rooms: { [roomId: string]: RoomState } = {};

export function setupSocketIO(io: Server) {
    io.on('connection', (socket: Socket) => {
        console.log('Client connected:', socket.id);

        socket.on('join_room', ({ roomId, player }: { roomId: string, player: Player }) => {
            socket.join(roomId);

            if (!rooms[roomId]) {
                // Initialize new room
                // Initialize new room
                rooms[roomId] = {
                    gameState: {
                        roomCode: roomId,
                        players: [],
                        roundIndex: 0,
                        cardsPerPlayer: 0,
                        trump: 'spades',
                        dealerSeatIndex: 0,
                        currentLeaderSeatIndex: 0,
                        phase: 'lobby',
                        currentTrick: [],
                        scoresHistory: [],
                        deckSeed: uuidv4(),
                        settings: {
                            discardStrategy: 'random',
                            autoPlayEnabled: true,
                            allowSpectators: true
                        }
                    },
                    lastActivity: Date.now()
                };
            }

            const room = rooms[roomId];
            const existingPlayerIndex = room.gameState.players.findIndex(p => p.id === player.id);

            if (existingPlayerIndex !== -1) {
                // Reconnect existing player
                room.gameState.players[existingPlayerIndex].connected = true;
                // Update socket ID mapping if needed (omitted for simplicity, usually handled by auth)
            } else {
                // Add new player
                if (room.gameState.phase === 'lobby') {
                    room.gameState.players.push({
                        ...player,
                        connected: true,
                        tricksWon: 0,
                        hand: [],
                        isHost: room.gameState.players.length === 0, // First player is host
                        seatIndex: room.gameState.players.length,
                        isAway: false,
                        currentBet: null,
                        totalPoints: 0
                    });
                } else {
                    // Spectator or reconnect logic could go here
                    socket.emit('error', 'Game already started');
                    return;
                }
            }

            io.to(roomId).emit('state_update', room.gameState);
        });

        socket.on('game_action', ({ roomId, action }: { roomId: string, action: GameAction }) => {
            const room = rooms[roomId];
            if (!room) return;

            try {
                const newState = processGameAction(room.gameState, action);
                room.gameState = newState;
                room.lastActivity = Date.now();
                io.to(roomId).emit('state_update', room.gameState);
            } catch (error: any) {
                socket.emit('error', error.message);
            }
        });

        socket.on('disconnect', () => {
            console.log('Client disconnected:', socket.id);
            // Handle player disconnect (mark as away)
            // This requires mapping socket.id to roomId/playerId, which we haven't implemented yet.
            // For a robust implementation, we'd need a socket-to-player map.
        });
    });
}

function startRound(state: GameState) {
    const numPlayers = state.players.length;
    // Cap at 13 cards max, even if fewer players
    const maxCards = Math.min(Math.floor(52 / numPlayers), 13);
    state.cardsPerPlayer = maxCards - state.roundIndex;

    if (state.cardsPerPlayer <= 0) {
        state.phase = 'finished';
        return;
    }

    const { hands } = dealCards(numPlayers, {
        seed: state.deckSeed + state.roundIndex, // Change seed per round
        discardStrategy: state.settings.discardStrategy,
        cardsPerPlayer: state.cardsPerPlayer
    });

    state.players.forEach((p, i) => {
        p.hand = hands[i];
        p.currentBet = null;
        p.tricksWon = 0;
    });

    state.trump = ['spades', 'hearts', 'diamonds', 'clubs'][state.roundIndex % 4] as Suit;
    state.dealerSeatIndex = state.roundIndex % numPlayers;
    state.currentLeaderSeatIndex = (state.dealerSeatIndex + 1) % numPlayers; // First to bet is left of dealer
    state.phase = 'betting';
    state.currentTrick = [];
}

function processGameAction(state: GameState, action: GameAction): GameState {
    const newState = JSON.parse(JSON.stringify(state)); // Deep copy

    switch (action.type) {
        case 'START_GAME':
            if (newState.phase !== 'lobby' && newState.phase !== 'finished') throw new Error("Game already started");
            newState.roundIndex = 0;
            newState.scoresHistory = [];
            newState.players.forEach((p: Player) => { p.totalPoints = 0; p.tricksWon = 0; p.currentBet = null; });
            startRound(newState);
            return newState;

        case 'BET':
            const playerIndex = newState.players.findIndex((p: Player) => p.id === action.playerId);
            if (playerIndex === -1) return newState;

            // Validate bet
            if (!canBet(action.bet, newState.players.map((p: Player) => p.currentBet || 0).slice(0, playerIndex), newState.players.length, newState.cardsPerPlayer)) {
                throw new Error("Invalid bet");
            }

            newState.players[playerIndex].currentBet = action.bet;

            // Move turn
            newState.currentLeaderSeatIndex = (newState.currentLeaderSeatIndex + 1) % newState.players.length;

            // Check if all bets placed
            const allBetsPlaced = newState.players.every((p: Player) => p.currentBet !== null);
            if (allBetsPlaced) {
                newState.phase = 'playing';
                // Leader is left of dealer
                newState.currentLeaderSeatIndex = (newState.dealerSeatIndex + 1) % newState.players.length;
            }
            return newState;

        case 'PLAY_CARD':
            const pIndex = newState.players.findIndex((p: Player) => p.id === action.playerId);
            if (pIndex === -1) return newState;

            const player = newState.players[pIndex];
            const card = action.card;

            // Validate play
            if (!isValidPlay(card, player.hand, newState.currentTrick, newState.trump)) {
                throw new Error("Invalid play");
            }

            // Remove card from hand
            player.hand = player.hand.filter((c: Card) => !(c.suit === card.suit && c.rank === card.rank));

            // Add to trick
            newState.currentTrick.push({ seatIndex: pIndex, card: card });

            // Move turn
            newState.currentLeaderSeatIndex = (newState.currentLeaderSeatIndex + 1) % newState.players.length;

            // Check if trick complete
            if (newState.currentTrick.length === newState.players.length) {
                // Determine winner
                const winnerSeatIndex = getTrickWinner(newState.currentTrick, newState.trump);

                // Update tricks won
                newState.players[winnerSeatIndex].tricksWon = (newState.players[winnerSeatIndex].tricksWon || 0) + 1;

                newState.currentTrick = [];
                newState.currentLeaderSeatIndex = winnerSeatIndex;

                // Check if round complete (hands empty)
                if (newState.players[0].hand.length === 0) {
                    // Calculate scores
                    const roundScores = calculateScores(newState.players);
                    newState.players.forEach((p: Player) => {
                        p.totalPoints = (p.totalPoints || 0) + (roundScores[p.id] || 0);
                    });

                    // Next round logic
                    newState.roundIndex++;
                    startRound(newState);
                }
            }
            return newState;

        case 'UPDATE_SETTINGS':
            newState.settings = { ...newState.settings, ...action.settings };
            return newState;

        case 'TOGGLE_AWAY':
            const awayPlayer = newState.players.find((p: Player) => p.id === action.playerId);
            if (awayPlayer) {
                awayPlayer.isAway = !awayPlayer.isAway;
            }
            return newState;

        case 'RENAME_PLAYER':
            const renamePlayer = newState.players.find((p: Player) => p.id === action.playerId);
            if (renamePlayer) {
                renamePlayer.name = action.newName;
            }
            return newState;

        case 'END_GAME':
            newState.phase = 'finished';
            return newState;

        default:
            return state;
    }
}
