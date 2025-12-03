export function computeCardsPerPlayer(numPlayers: number) {
  return Math.floor(52 / numPlayers)
}

export function trumpForRound(roundIndex: number) {
  const order = ['spades','hearts','diamonds','clubs']
  return order[roundIndex % 4]
}
