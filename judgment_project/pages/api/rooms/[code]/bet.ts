import { NextApiRequest, NextApiResponse } from "next"
const ROOMS: any = (global as any).ROOMS || {}
;(global as any).ROOMS = ROOMS

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const { code } = req.query as { code: string }
  if (req.method !== 'POST') return res.status(405).end()
  const room = ROOMS[code]
  if (!room) return res.status(404).end()
  const { playerId, bet } = req.body
  const player = room.players.find((p:any)=>p.id===playerId)
  if (!player) return res.status(404).end()
  player.currentBet = bet
  res.json({ ok: true })
}
