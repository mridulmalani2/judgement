import { NextApiRequest, NextApiResponse } from "next"

const ROOMS: any = (global as any).ROOMS || {}
;(global as any).ROOMS = ROOMS

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { code } = req.query as { code: string }
  if (!code) return res.status(400).json({ error: 'no code' })
  const room = ROOMS[code]
  if (!room) return res.status(404).end()

  if (req.method === 'GET') {
    return res.json({
      roomCode: room.roomCode,
      hostId: room.hostId,
      started: room.started,
      players: room.players.map((p:any)=>({
        id: p.id, name: p.name, seatIndex: p.seatIndex, isAway: p.isAway,
        currentBet: p.currentBet, tricksWonThisRound: p.tricksWonThisRound, totalPoints: p.totalPoints, handCount: p.handCount
      })),
      phase: room.phase,
      dealerSeatIndex: room.dealerSeatIndex,
      roundIndex: room.roundIndex,
      cardsPerPlayer: room.cardsPerPlayer,
      trump: room.trump
    })
  }

  if (req.method === 'POST') {
    const body = req.body
    const action = (req.headers['x-action'] as string) || body?.action
    if (action === 'join') {
      const { id, name } = body
      if (room.players.find((p:any)=>p.id===id)) return res.json({ ok: true })
      const seatIndex = room.players.length
      room.players.push({
        id, name, seatIndex,
        isAway: false,
        currentBet: null, tricksWonThisRound:0, totalPoints:0, handCount:0
      })
      return res.json({ ok: true })
    }
  }

  res.status(200).json(room)
}
