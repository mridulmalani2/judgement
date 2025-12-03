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
        // If current is lead suit and winning was not (and not trump), current wins (shouldn't happen if logic correct)
        // Actually, if winning was not lead suit and not trump, it means it was a discard? 
        // But the first card sets the lead suit, so winningCard starts as lead suit.
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
            scores[p.id] = (bet + 1) * 10 + bet;
        } else {
            scores[p.id] = 0;
        }
    });

    return scores;
}

export function canBet(bet: number, currentBets: number[], numPlayers: number, cardsPerPlayer: number): boolean {
    // currentBets includes bets from players before this one
    // If this is the LAST player (currentBets.length === numPlayers - 1)
    // Then sum(currentBets) + bet !== cardsPerPlayer

    if (currentBets.length === numPlayers - 1) {
        const currentSum = currentBets.reduce((a, b) => a + b, 0);
        return (currentSum + bet) !== cardsPerPlayer; // Wait, total hands = cardsPerPlayer * numPlayers? NO.
        // Total hands in a round = cardsPerPlayer.
        // Example: 5 players, 10 cards each. Total tricks = 10.
        // Sum of bets cannot be 10.
        // Correct: cardsPerPlayer is the total number of tricks available.
    }

    return true;
}
