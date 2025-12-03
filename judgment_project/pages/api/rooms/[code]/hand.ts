import { NextApiRequest, NextApiResponse } from "next"
const ROOMS: any = (global as any).ROOMS || {}
;(global as any).ROOMS = ROOMS

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const { code } = req.query as { code: string }
  const { id } = req.query as any
  if (!code || !id) return res.status(400).end()
  const room = ROOMS[code]
  if (!room) return res.status(404).end()
  const player = room.players.find((p:any)=>p.id === id)
  if (!player) return res.status(404).end()
  return res.json({ hand: player.hand || [] })
}
