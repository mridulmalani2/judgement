import { NextApiRequest, NextApiResponse } from "next"
import { Redis } from '@upstash/redis'

// Initialize Redis client
// Falls back to in-memory storage if Redis is not configured (for local dev)
const redis = process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
  ? new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  })
  : null

// Fallback in-memory storage for local development
const SIGNALS: Record<string, any[]> = (global as any).SIGNALS || {}
if (!redis) {
  (global as any).SIGNALS = SIGNALS
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { room } = req.query as { room: string }
  if (!room) return res.status(400).json({ error: 'Room code required' })

  try {
    if (req.method === 'POST') {
      const { action, peerId, msg } = req.body

      if (action === 'register_host') {
        if (!peerId) return res.status(400).json({ error: 'Peer ID required' })

        if (redis) {
          await redis.set(`room:${room}:host`, peerId, { ex: 3600 })
        } else {
          (global as any).ROOM_HOSTS = (global as any).ROOM_HOSTS || {}
            ; (global as any).ROOM_HOSTS[room] = peerId
        }
        return res.json({ ok: true })
      }

      // Default signaling message
      const signal = { msg, ts: Date.now() }
      if (redis) {
        const key = `signals:${room}`
        await redis.lpush(key, JSON.stringify(signal))
        await redis.expire(key, 3600)
      } else {
        SIGNALS[room] = SIGNALS[room] || []
        SIGNALS[room].push(signal)
      }

      return res.json({ ok: true })
    } else if (req.method === 'GET') {
      const { action } = req.query

      if (action === 'get_host') {
        let hostId = null
        if (redis) {
          hostId = await redis.get(`room:${room}:host`)
        } else {
          hostId = ((global as any).ROOM_HOSTS || {})[room] || null
        }

        if (!hostId) return res.status(404).json({ error: 'Host not found' })
        return res.json({ hostId })
      }

      // Default get signals
      let messages: any[] = []
      if (redis) {
        const key = `signals:${room}`
        const signals = await redis.lrange(key, 0, -1) as string[]
        messages = signals.map(s => JSON.parse(s).msg).reverse()
        await redis.del(key)
      } else {
        messages = (SIGNALS[room] || []).map(s => s.msg)
        SIGNALS[room] = []
      }

      return res.json({ messages })
    }

    res.status(405).json({ error: 'Method not allowed' })
  } catch (error) {
    console.error('Signaling error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}
