import { Card, Suit } from './types';
import seedrandom from 'seedrandom';

export const SUITS: Suit[] = ['clubs', 'diamonds', 'hearts', 'spades'];

export function createDeck(): Card[] {
    const deck: Card[] = [];
    for (const suit of SUITS) {
        for (let rank = 2; rank <= 14; rank++) {
            let id = `${rank}${suit[0].toUpperCase()}`;
            if (rank === 14) id = `A${suit[0].toUpperCase()}`;
            else if (rank === 13) id = `K${suit[0].toUpperCase()}`;
            else if (rank === 12) id = `Q${suit[0].toUpperCase()}`;
            else if (rank === 11) id = `J${suit[0].toUpperCase()}`;

            deck.push({ rank, suit, id });
        }
    }
    return deck;
}

export function shuffleDeck(deck: Card[], seed?: string): Card[] {
    const rng = seed ? seedrandom(seed) : Math.random;
    const newDeck = [...deck];
    for (let i = newDeck.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1));
        [newDeck[i], newDeck[j]] = [newDeck[j], newDeck[i]];
    }
    return newDeck;
}

interface DealOptions {
    seed?: string;
    discardStrategy?: 'random' | 'priority';
    cardsPerPlayer?: number; // Override if needed, otherwise calculated
}

export function dealCards(numPlayers: number, options: DealOptions = {}): { hands: Card[][], remaining: Card[] } {
    let deck = createDeck();
    const cardsPerPlayer = options.cardsPerPlayer || Math.floor(52 / numPlayers);
    const totalCardsNeeded = numPlayers * cardsPerPlayer;
    const cardsToDiscard = 52 - totalCardsNeeded;

    if (options.discardStrategy === 'priority' && cardsToDiscard > 0) {
        // Priority Discard: Remove lowest cards first.
        // Order: 2♣, 2♦, 2♥, 2♠, 3♣... (Rank primary, Suit secondary)
        // Suit order for sorting: Clubs (0), Diamonds (1), Hearts (2), Spades (3)
        // We want to REMOVE the lowest.

        // Sort Low to High
        deck.sort((a, b) => {
            if (a.rank !== b.rank) return a.rank - b.rank;
            return SUITS.indexOf(a.suit) - SUITS.indexOf(b.suit);
        });

        // Remove the first 'cardsToDiscard' cards (the lowest ones)
        // The remaining cards are the "High" cards.
        deck = deck.slice(cardsToDiscard);
    }

    // Now shuffle the deck (either full 52 if random discard, or the subset if priority)
    // Wait, if 'random' discard, we shuffle 52 then take top N.
    // If 'priority' discard, we filtered first, then shuffle the remaining.

    deck = shuffleDeck(deck, options.seed);

    // If random discard, we just take the first totalCardsNeeded.
    // The rest are "remaining" (discarded).

    const hands: Card[][] = Array.from({ length: numPlayers }, () => []);
    let cardIndex = 0;

    for (let i = 0; i < cardsPerPlayer; i++) {
        for (let p = 0; p < numPlayers; p++) {
            if (cardIndex < deck.length) {
                hands[p].push(deck[cardIndex]);
                cardIndex++;
            }
        }
    }

    // Sort hands for player convenience
    hands.forEach(hand => {
        hand.sort((a, b) => {
            if (a.suit !== b.suit) return SUITS.indexOf(a.suit) - SUITS.indexOf(b.suit);
            return b.rank - a.rank; // Descending rank
        });
    });

    return { hands, remaining: deck.slice(cardIndex) };
}
