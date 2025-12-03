import { NextApiRequest, NextApiResponse } from "next"
import { createDeck, shuffleDeck } from "../../../../lib/deck"

const ROOMS: any = (global as any).ROOMS || {}
;(global as any).ROOMS = ROOMS

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const { code } = req.query as { code: string }
  if (!code) return res.status(400).end()
  const room = ROOMS[code]
  if (!room) return res.status(404).end()
  if (req.method !== 'POST') return res.status(200).json({ ok: false })
  const deck = createDeck()
  shuffleDeck(deck)
  const numPlayers = room.players.length
  const cardsPerPlayer = Math.floor(52 / numPlayers)
  const dealCount = cardsPerPlayer * numPlayers
  const dealt = deck.slice(0, dealCount)
  const rest = deck.slice(dealCount)
  for (let i=0;i<numPlayers;i++){
    const hand = dealt.filter((_,idx)=> idx % numPlayers === i)
    room.players[i].hand = hand
    room.players[i].handCount = hand.length
    room.players[i].currentBet = null
    room.players[i].tricksWonThisRound = 0
  }
  room.handsDealt = true
  room.phase = 'betting'
  res.json({ ok: true })
}
