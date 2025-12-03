import { dealCards } from './deck';
import { Card } from './types';

describe('Deck Logic', () => {
    it('should deal correct number of cards', () => {
        // 4 players, 52 cards. 13 cards each.
        const { hands, remaining } = dealCards(4);
        expect(hands.length).toBe(4);
        expect(hands[0].length).toBe(13);
        expect(remaining.length).toBe(0);
    });

    it('should discard cards correctly with priority strategy', () => {
        // 5 players. 52 cards.
        // Max equal cards = floor(52/5) = 10.
        // Total used = 50. Discard = 2.
        // Priority discard should remove 2 lowest cards (2C, 2D).

        const { hands, remaining } = dealCards(5, { discardStrategy: 'priority', seed: 'test-seed' });

        // Check that hands do NOT contain 2C or 2D
        const allCards = hands.flat();
        const has2C = allCards.some(c => c.id === '2C');
        const has2D = allCards.some(c => c.id === '2D');

        expect(has2C).toBe(false);
        expect(has2D).toBe(false);

        // Check that we have 50 cards total
        expect(allCards.length).toBe(50);
    });

    it('should handle 13-card limit for 2 players with priority discard', () => {
        // 2 players. Max cards capped at 13 (logic in Room.tsx, but here we test dealCards with explicit count).
        // We request 13 cards per player. Total 26. Discard 26.

        const { hands, remaining } = dealCards(2, {
            discardStrategy: 'priority',
            cardsPerPlayer: 13,
            seed: 'test-seed-2'
        });

        expect(hands.length).toBe(2);
        expect(hands[0].length).toBe(13);

        // Total used = 26.
        const allCards = hands.flat();
        expect(allCards.length).toBe(26);

        // Priority discard should have removed the lowest 26 cards.
        // The remaining 26 cards should be the highest rank/suit combinations.
        // E.g. 2C is definitely gone.
        expect(allCards.some(c => c.id === '2C')).toBe(false);
    });
});
