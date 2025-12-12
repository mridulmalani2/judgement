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

export interface GameSettings {
    discardStrategy: 'random' | 'priority';
    autoPlayEnabled: boolean;
    allowSpectators: boolean;
}

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
    settings: GameSettings;
    lastUpdate?: number; // Timestamp for change detection in polling mode
    currentDeck: Card[]; // Persistent deck that shrinks over time
    playedPile: Card[]; // Cards played in the current round
}

export type GameAction =
    | { type: 'START_GAME', payload?: { initialCardsPerPlayer: number } }
    | { type: 'BET', playerId: string, bet: number }
    | { type: 'PLAY_CARD', playerId: string, card: Card }
    | { type: 'NEXT_ROUND' }
    | { type: 'UPDATE_SETTINGS', settings: Partial<GameSettings> }
    | { type: 'TOGGLE_AWAY', playerId: string }
    | { type: 'RENAME_PLAYER', playerId: string, newName: string }
    | { type: 'END_GAME' }
    | { type: 'JOIN', playerId: string, payload: { name: string } };
