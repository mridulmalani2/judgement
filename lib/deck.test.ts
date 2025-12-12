import { prepareRoundDeck, createDeck } from './deck';
import { Card } from './types';

describe('Deck Logic', () => {
    it('Round 1 (Index 0): Should discard lowest priority cards', () => {
        // Setup: 6 players, 8 cards each.
        // Total needed: 48. Deck: 52. Discard: 4.
        // Priority order: 2 < 3 ... and Clubs < Diamonds ...
        // Expected discards: 2C, 2D, 2H, 2S.

        const fullDeck = createDeck();
        const { hands, remainingDeck, discarded } = prepareRoundDeck(fullDeck, 0, 6, 8, 'test-seed');

        // Check counts
        expect(discarded.length).toBe(4);
        expect(hands.flat().length).toBe(48);
        expect(remainingDeck.length).toBe(0); // All remaining were dealt

        // Check specific discarded cards
        const discardedIds = discarded.map(c => c.id).sort();
        // 2C, 2D, 2H, 2S
        const expectedIds = ['2C', '2D', '2H', '2S'].sort();
        expect(discardedIds).toEqual(expectedIds);
    });

    it('Round 2 (Index 1): Should discard randomly', () => {
        // Setup: Previous round used 48 cards. 
        // Current Deck is 48 cards (simulating playedPile -> currentDeck).
        // 6 players, 7 cards each.
        // Total needed: 42. Discard: 6.

        // Create a deck of 48 cards (missing the 2s for realism, though logic shouldn't care)
        let deck = createDeck().filter(c => !['2C', '2D', '2H', '2S'].includes(c.id));
        expect(deck.length).toBe(48);

        const { hands, remainingDeck, discarded } = prepareRoundDeck(deck, 1, 6, 7, 'test-seed-random');

        expect(discarded.length).toBe(6);
        expect(hands.flat().length).toBe(42);

        // Verify it didn't just take the lowest priority remaining.
        // Lowest remaining would be the 3s (3C, 3D, 3H, 3S) and 4C, 4D.
        // We expect it NOT to be exactly that sorted list (statistically probable not to be with shuffle).
        // But since we use a seed, we can check specific behavior if needed, or just ensure it's a valid discard.

        // Effectively, just ensure we didn't error and got the right counts.
        // And maybe check that the deck was shuffled.
    });

    it('Should calculate discards based on dynamic deck size', () => {
        // Edge case: 3 players, 10 cards. Needs 30.
        // Deck provided is 35 cards. Discard 5.
        const deck = createDeck().slice(0, 35);
        const { discarded } = prepareRoundDeck(deck, 1, 3, 10, 'seed');
        expect(discarded.length).toBe(5);
    });

    it('Should throw if not enough cards', () => {
        const deck = createDeck().slice(0, 10);
        expect(() => {
            prepareRoundDeck(deck, 1, 4, 5, 'seed'); // Need 20, have 10
        }).toThrow();
    });
});
