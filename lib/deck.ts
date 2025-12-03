import { Card, Suit } from './types';

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

export function shuffleDeck(deck: Card[]): Card[] {
    // Fisher-Yates shuffle
    const newDeck = [...deck];
    for (let i = newDeck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newDeck[i], newDeck[j]] = [newDeck[j], newDeck[i]];
    }
    return newDeck;
}

export function dealCards(numPlayers: number): { hands: Card[][], remaining: Card[] } {
    const deck = shuffleDeck(createDeck());
    const cardsPerPlayer = Math.floor(52 / numPlayers);

    // We want to deal 'cardsPerPlayer' to each player.
    // The remaining cards are discarded (randomly, since we shuffled).

    const hands: Card[][] = Array.from({ length: numPlayers }, () => []);

    let cardIndex = 0;
    // Deal round-robin or chunks? 
    // Plan said: "Deal cardsPerPlayer cards to each player... Stop dealing when dealCount reached."
    // Standard deal is usually 1 at a time or all at once. 
    // Let's do 1 at a time for tradition, but logically it's the same if shuffled.

    for (let i = 0; i < cardsPerPlayer; i++) {
        for (let p = 0; p < numPlayers; p++) {
            hands[p].push(deck[cardIndex]);
            cardIndex++;
        }
    }

    // Sort hands for convenience (by Suit then Rank)
    hands.forEach(hand => {
        hand.sort((a, b) => {
            if (a.suit !== b.suit) return SUITS.indexOf(a.suit) - SUITS.indexOf(b.suit);
            return b.rank - a.rank; // Descending rank
        });
    });

    return { hands, remaining: deck.slice(cardIndex) };
}
