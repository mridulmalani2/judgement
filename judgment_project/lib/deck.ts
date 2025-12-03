import { Card } from './types'

export function createDeck(): Card[] {
  const suits = ['clubs','diamonds','hearts','spades'] as const
  const deck: Card[] = []
  for (const s of suits) {
    for (let r = 2; r <= 14; r++) {
      deck.push({ rank: r, suit: s as any, id: `${r}-${s}` })
    }
  }
  return deck
}

export function shuffleDeck(deck: Card[]) {
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    const tmp = deck[i]
    deck[i] = deck[j]
    deck[j] = tmp
  }
  return deck
}

export function cardId(card: Card) {
  return card.id
}
