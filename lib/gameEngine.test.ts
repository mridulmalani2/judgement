import { getTrickWinner, calculateScores, canBet, getAutoPlayCard, isValidPlay } from './gameEngine';
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

    describe('isValidPlay', () => {
        const trump: Suit = 'spades';
        const hand: Card[] = [
            { id: '2H', rank: 2, suit: 'hearts' },
            { id: '5C', rank: 5, suit: 'clubs' },
        ];

        it('should allow any card if leading', () => {
            expect(isValidPlay(hand[0], hand, [], trump)).toBe(true);
        });

        it('should require following suit if possible', () => {
            // Leading Hearts. Must play 2H.
            const trick: PlayedCard[] = [{ seatIndex: 0, card: { id: 'KH', rank: 13, suit: 'hearts' } }];
            expect(isValidPlay(hand[0], hand, trick, trump)).toBe(true); // 2H is valid
            expect(isValidPlay(hand[1], hand, trick, trump)).toBe(false); // 5C is invalid
        });

        it('should allow any card if cannot follow suit', () => {
            // Leading Diamonds. Hand has none. Can play anything.
            const trick: PlayedCard[] = [{ seatIndex: 0, card: { id: 'KD', rank: 13, suit: 'diamonds' } }];
            expect(isValidPlay(hand[0], hand, trick, trump)).toBe(true);
            expect(isValidPlay(hand[1], hand, trick, trump)).toBe(true);
        });
    });

    describe('getTrickWinner', () => {
        const trump: Suit = 'spades';
        // Mock Cards: 10H, KH, 2S (Trump), 5C
        const trickBase: PlayedCard[] = [
            { seatIndex: 0, card: { id: '10H', rank: 10, suit: 'hearts' } }, // Lead
            { seatIndex: 1, card: { id: 'KH', rank: 13, suit: 'hearts' } },
        ];

        it('should return highest rank of lead suit if no trumps', () => {
            const trick = [...trickBase, { seatIndex: 2, card: { id: '2H', rank: 2, suit: 'hearts' } }];
            // KH (seat 1) should win
            expect(getTrickWinner(trick, trump)).toBe(1);
        });

        it('should return trump player if trump played', () => {
            const trick = [...trickBase, { seatIndex: 2, card: { id: '2S', rank: 2, suit: 'spades' } }];
            // 2S (seat 2) is trump. Even though low rank, it beats Hearts.
            expect(getTrickWinner(trick, trump)).toBe(2);
        });

        it('should return highest trump if multiple trumps', () => {
            const trick = [
                ...trickBase, // 10H, KH
                { seatIndex: 2, card: { id: '2S', rank: 2, suit: 'spades' } },
                { seatIndex: 3, card: { id: 'AS', rank: 14, suit: 'spades' } }
            ];
            // AS (seat 3) beats 2S
            expect(getTrickWinner(trick, trump)).toBe(3);
        });

        it('should ignore higher ranks of non-lead non-trump suits', () => {
            // Lead: 10H. Played: KH (winner so far). Played: AC (Clubs, high rank but off suit).
            const trick = [
                { seatIndex: 0, card: { id: '10H', rank: 10, suit: 'hearts' } },
                { seatIndex: 1, card: { id: 'KH', rank: 13, suit: 'hearts' } },
                { seatIndex: 2, card: { id: 'AC', rank: 14, suit: 'clubs' } }
            ];
            // AC is off-suit and not trump. KH (seat 1) still wins.
            expect(getTrickWinner(trick, trump)).toBe(1);
        });
    });
});
