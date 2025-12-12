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

interface DealResult {
    hands: Card[][];
    remainingDeck: Card[];
    discarded: Card[];
}

export function prepareRoundDeck(
    currentDeck: Card[],
    roundIndex: number,
    numPlayers: number,
    cardsPerPlayer: number,
    seed: string
): DealResult {
    let deck = [...currentDeck];
    const totalNeeded = numPlayers * cardsPerPlayer;
    const cardsToDiscard = deck.length - totalNeeded;

    let discarded: Card[] = [];

    if (cardsToDiscard < 0) {
        throw new Error(`Not enough cards! Needed ${totalNeeded}, have ${deck.length}`);
    }

    if (cardsToDiscard > 0) {
        if (roundIndex === 0) {
            // Priority Discard: Remove lowest rank/suit
            // Sort Ascending (Lowest first)
            // Priority: Rank (primary), Suit (secondary)
            deck.sort((a, b) => {
                if (a.rank !== b.rank) return a.rank - b.rank;
                return SUITS.indexOf(a.suit) - SUITS.indexOf(b.suit);
            });
            discarded = deck.slice(0, cardsToDiscard);
            deck = deck.slice(cardsToDiscard);
        } else {
            // Random Discard
            // Shuffle first
            deck = shuffleDeck(deck, seed + '-discard');
            discarded = deck.slice(0, cardsToDiscard);
            deck = deck.slice(cardsToDiscard);
        }
    }

    // Now deck has exactly 'totalNeeded' cards
    // Shuffle for dealing
    deck = shuffleDeck(deck, seed + '-deal');

    const hands: Card[][] = Array.from({ length: numPlayers }, () => []);
    let cardIndex = 0;

    for (let i = 0; i < cardsPerPlayer; i++) {
        for (let p = 0; p < numPlayers; p++) {
            hands[p].push(deck[cardIndex++]);
        }
    }

    // Sort hands for display (Suit then Rank Descending)
    hands.forEach(hand => {
        hand.sort((a, b) => {
            if (a.suit !== b.suit) return SUITS.indexOf(a.suit) - SUITS.indexOf(b.suit);
            return b.rank - a.rank;
        });
    });

    return {
        hands,
        remainingDeck: deck.slice(cardIndex),
        discarded
    };
}
