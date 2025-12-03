import { NextApiRequest, NextApiResponse } from "next"
const ROOMS: any = (global as any).ROOMS || {}
;(global as any).ROOMS = ROOMS

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const { code } = req.query as { code: string }
  if (!code) return res.status(400).end()
  const room = ROOMS[code]
  if (!room) return res.status(404).end()
  if (req.method !== 'POST') return res.status(405).end()
  room.started = true
  room.phase = 'betting'
  const numPlayers = room.players.length
  const cardsPerPlayer = Math.floor(52 / numPlayers)
  room.cardsPerPlayer = cardsPerPlayer
  room.roundIndex = 0
  room.trump = ['spades','hearts','diamonds','clubs'][0]
  room.handsDealt = false
  room.dealerSeatIndex = 0
  res.json({ ok: true })
}
