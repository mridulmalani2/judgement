import { getTrickWinner, calculateScores, canBet, getAutoPlayCard } from './gameEngine';
import { Card, PlayedCard, Player, Suit } from './types';

describe('Game Engine', () => {
    describe('canBet', () => {
        it('should allow any bet for non-last players', () => {
            expect(canBet(5, [1, 2], 4, 10)).toBe(true);
        });

        it('should prevent last player from making bets sum equal to total cards', () => {
            // 4 players, 10 cards. Bets so far: 2, 3, 2 (Total 7).
            // Last player cannot bet 3 (7+3=10).
            expect(canBet(3, [2, 3, 2], 4, 10)).toBe(false);
            // Can bet 2 (Total 9)
            expect(canBet(2, [2, 3, 2], 4, 10)).toBe(true);
            // Can bet 4 (Total 11)
            expect(canBet(4, [2, 3, 2], 4, 10)).toBe(true);
        });
    });

    describe('calculateScores', () => {
        it('should calculate correct scores based on formula (N+1)*10 + N', () => {
            const players: Partial<Player>[] = [
                { id: 'p1', currentBet: 0, tricksWon: 0 }, // (0+1)*10 + 0 = 10
                { id: 'p2', currentBet: 1, tricksWon: 1 }, // (1+1)*10 + 1 = 21
                { id: 'p3', currentBet: 2, tricksWon: 2 }, // (2+1)*10 + 2 = 32
                { id: 'p4', currentBet: 5, tricksWon: 4 }, // 0
            ];

            const scores = calculateScores(players as Player[]);
            expect(scores['p1']).toBe(10);
            expect(scores['p2']).toBe(21);
            expect(scores['p3']).toBe(32);
            expect(scores['p4']).toBe(0);
        });
    });

    describe('getAutoPlayCard', () => {
        const trump: Suit = 'spades';
        const hand: Card[] = [
            { id: '2H', rank: 2, suit: 'hearts' },
            { id: 'AH', rank: 14, suit: 'hearts' },
            { id: '5C', rank: 5, suit: 'clubs' },
            { id: '2S', rank: 2, suit: 'spades' }, // Trump
        ];

        it('should play lowest non-trump when leading', () => {
            const card = getAutoPlayCard(hand, [], trump);
            // Lowest non-trump is 2H or 5C. 2H is rank 2, 5C is rank 5.
            // Should be 2H.
            expect(card.id).toBe('2H');
        });

        it('should play Ace of lead suit if available', () => {
            const trick: PlayedCard[] = [{ seatIndex: 0, card: { id: '3H', rank: 3, suit: 'hearts' } }];
            const card = getAutoPlayCard(hand, trick, trump);
            expect(card.id).toBe('AH');
        });

        it('should play lowest of lead suit if no Ace', () => {
            const handNoAce = hand.filter(c => c.id !== 'AH');
            const trick: PlayedCard[] = [{ seatIndex: 0, card: { id: '3H', rank: 3, suit: 'hearts' } }];
            const card = getAutoPlayCard(handNoAce, trick, trump);
            expect(card.id).toBe('2H');
        });

        it('should play lowest non-trump if cannot follow suit', () => {
            const trick: PlayedCard[] = [{ seatIndex: 0, card: { id: '3D', rank: 3, suit: 'diamonds' } }];
            // Hand has no diamonds. Should play lowest non-trump (2H or 5C).
            const card = getAutoPlayCard(hand, trick, trump);
            expect(card.id).toBe('2H');
        });
    });
});
