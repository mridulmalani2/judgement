import { NextApiRequest, NextApiResponse } from "next"
const ROOMS: any = (global as any).ROOMS || {}
;(global as any).ROOMS = ROOMS

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const { code } = req.query as { code: string }
  if (req.method !== 'POST') return res.status(405).end()
  const room = ROOMS[code]
  if (!room) return res.status(404).end()
  const { playerId, cardId } = req.body
  const player = room.players.find((p:any)=>p.id === playerId)
  if (!player) return res.status(404).end()
  player.hand = (player.hand || []).filter((c:any)=>c.id !== cardId)
  player.handCount = (player.hand || []).length
  room.currentTrick = room.currentTrick || []
  room.currentTrick.push({ seatIndex: player.seatIndex, cardId })
  if (room.currentTrick.length >= room.players.length) {
    let winner = room.currentTrick[0]
    for (const p of room.currentTrick) {
      if ((p.cardId) > (winner.cardId)) winner = p
    }
    const winnerPlayer = room.players.find((pl:any)=>pl.seatIndex === winner.seatIndex)
    winnerPlayer.tricksWonThisRound = (winnerPlayer.tricksWonThisRound || 0) + 1
    room.currentTrick = []
  }
  res.json({ ok: true })
}
