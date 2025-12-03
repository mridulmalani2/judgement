import { Card, GameState, PlayedCard, Player, Suit } from './types';

export function getTrickWinner(trick: PlayedCard[], trump: Suit): number {
    if (trick.length === 0) return -1;

    const leadSuit = trick[0].card.suit;
    let winningCardIndex = 0;
    let winningCard = trick[0].card;

    for (let i = 1; i < trick.length; i++) {
        const current = trick[i].card;

        // If current is trump and winning wasn't, current wins
        if (current.suit === trump && winningCard.suit !== trump) {
            winningCard = current;
            winningCardIndex = i;
        }
        // If both are trump, higher rank wins
        else if (current.suit === trump && winningCard.suit === trump) {
            if (current.rank > winningCard.rank) {
                winningCard = current;
                winningCardIndex = i;
            }
        }
        // If neither is trump (or winning is trump and current isn't), check lead suit
        else if (current.suit === leadSuit && winningCard.suit === leadSuit) {
            if (current.rank > winningCard.rank) {
                winningCard = current;
                winningCardIndex = i;
            }
        }
    }

    return trick[winningCardIndex].seatIndex;
}

export function isValidPlay(card: Card, hand: Card[], trick: PlayedCard[], trump: Suit): boolean {
    // If leading, any card is valid
    if (trick.length === 0) return true;

    const leadSuit = trick[0].card.suit;

    // Check if player has lead suit
    const hasLeadSuit = hand.some(c => c.suit === leadSuit);

    if (hasLeadSuit) {
        // Must follow suit
        return card.suit === leadSuit;
    }

    // If don't have lead suit, can play anything (including trump)
    return true;
}

export function calculateScores(players: Player[]): { [playerId: string]: number } {
    const scores: { [playerId: string]: number } = {};

    players.forEach(p => {
        const bet = p.currentBet || 0;
        const won = p.tricksWon;

        if (bet === won) {
            // Formula: (N + 1) * 10 + N
            scores[p.id] = (bet + 1) * 10 + bet;
        } else {
            scores[p.id] = 0;
        }
    });

    return scores;
}

export function canBet(bet: number, currentBets: number[], numPlayers: number, cardsPerPlayer: number): boolean {
    // If this is the LAST player (currentBets.length === numPlayers - 1)
    if (currentBets.length === numPlayers - 1) {
        const currentSum = currentBets.reduce((a, b) => a + b, 0);
        // The sum of all bets cannot equal the total number of tricks (cardsPerPlayer)
        return (currentSum + bet) !== cardsPerPlayer;
    }

    return true;
}

export function getAutoPlayCard(hand: Card[], trick: PlayedCard[], trump: Suit): Card {
    // Rule:
    // Off-turn (following): Play Ace if lead suit present; else lowest of lead suit.
    // On-turn (leading): Lowest non-trump.

    if (hand.length === 0) throw new Error("Cannot autoplay with empty hand");

    // Leading
    if (trick.length === 0) {
        // Lowest non-trump
        const nonTrumps = hand.filter(c => c.suit !== trump);
        if (nonTrumps.length > 0) {
            // Sort by rank ascending
            nonTrumps.sort((a, b) => a.rank - b.rank);
            return nonTrumps[0];
        }
        // If only trumps, play lowest trump
        const trumps = hand.filter(c => c.suit === trump);
        trumps.sort((a, b) => a.rank - b.rank);
        return trumps[0];
    }

    // Following
    const leadSuit = trick[0].card.suit;
    const leadSuitCards = hand.filter(c => c.suit === leadSuit);

    if (leadSuitCards.length > 0) {
        // Check for Ace
        const ace = leadSuitCards.find(c => c.rank === 14);
        if (ace) return ace;

        // Else lowest of lead suit
        leadSuitCards.sort((a, b) => a.rank - b.rank);
        return leadSuitCards[0];
    }

    // No lead suit
    // Play lowest non-trump (if available), else lowest trump?
    // User didn't specify exactly for this case, but "lowest non-trump" is a good general "throw away" strategy.
    const nonTrumps = hand.filter(c => c.suit !== trump);
    if (nonTrumps.length > 0) {
        nonTrumps.sort((a, b) => a.rank - b.rank);
        return nonTrumps[0];
    }

    // Only trumps left
    const trumps = hand.filter(c => c.suit === trump);
    trumps.sort((a, b) => a.rank - b.rank);
    return trumps[0];
}
