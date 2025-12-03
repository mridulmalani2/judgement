import { NextApiRequest, NextApiResponse } from "next"
const SIGNALS: Record<string, any[]> = (global as any).SIGNALS || {}
;(global as any).SIGNALS = SIGNALS

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const { room } = req.query as { room: string }
  if (!room) return res.status(400).end()
  if (req.method === 'POST') {
    const msg = req.body
    SIGNALS[room] = SIGNALS[room] || []
    SIGNALS[room].push({ msg, ts: Date.now() })
    return res.json({ ok: true })
  } else if (req.method === 'GET') {
    const list = (SIGNALS[room] || []).map(s=>s.msg)
    SIGNALS[room] = []
    return res.json({ messages: list })
  }
  res.status(405).end()
}
