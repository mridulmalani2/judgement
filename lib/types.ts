export type Suit = 'clubs' | 'diamonds' | 'hearts' | 'spades';

export interface Card {
    rank: number; // 2-14 (11=J, 12=Q, 13=K, 14=A)
    suit: Suit;
    id: string; // Unique ID (e.g., "AS", "10H")
}

export interface Player {
    id: string;
    name: string;
    seatIndex: number; // 0 to numPlayers-1
    isHost: boolean;
    connected: boolean;
    isAway: boolean;
    currentBet: number | null; // null if not yet bet
    tricksWon: number;
    totalPoints: number;
    hand: Card[]; // Private to the player (host stores all)
}

export interface PlayedCard {
    seatIndex: number;
    card: Card;
}

export type GamePhase = 'lobby' | 'dealing' | 'betting' | 'playing' | 'scoring' | 'finished';

export interface GameState {
    roomCode: string;
    players: Player[];
    roundIndex: number; // 0-based
    cardsPerPlayer: number;
    trump: Suit;
    dealerSeatIndex: number;
    currentLeaderSeatIndex: number; // Who leads the current trick
    currentTrick: PlayedCard[];
    phase: GamePhase;
    deckSeed: string; // For reproducible shuffling if needed
    scoresHistory: { [playerId: string]: number }[]; // History of scores per round
}

export interface GameAction {
    type: 'JOIN' | 'START_GAME' | 'BET' | 'PLAY_CARD' | 'NEXT_ROUND' | 'END_GAME' | 'KICK_PLAYER' | 'TOGGLE_AWAY';
    payload?: any;
    playerId: string;
}
