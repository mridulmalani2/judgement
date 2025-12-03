import { NextApiRequest, NextApiResponse } from "next"
const ROOMS: any = (global as any).ROOMS || {}
;(global as any).ROOMS = ROOMS

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const { code } = req.query as { code: string }
  if (!code) return res.status(400).end()
  const room = ROOMS[code]
  if (!room) return res.status(404).end()
  if (req.method !== 'POST') return res.status(405).end()
  const { id, name } = req.body
  if (room.players.find((p:any)=>p.id === id)) return res.json({ ok: true })
  const seatIndex = room.players.length
  room.players.push({
    id, name, seatIndex, isAway:false, currentBet:null, tricksWonThisRound:0, totalPoints:0, handCount:0
  })
  res.json({ ok: true })
}
