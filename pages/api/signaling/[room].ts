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
const ROOM_HOSTS: Record<string, any> = (global as any).ROOM_HOSTS || {}

if (!redis) {
  (global as any).SIGNALS = SIGNALS;
  (global as any).ROOM_HOSTS = ROOM_HOSTS;
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
          try {
            await redis.set(`room:${room}:host`, peerId, { ex: 3600 })
            return res.json({ ok: true })
          } catch (e) {
            console.error("Redis Register Host Error (fallback):", e)
          }
        }

        // Fallback
        ROOM_HOSTS[room] = { id: peerId, expiresAt: Date.now() + 3600000 };
        return res.json({ ok: true })
      }

      // Default signaling message
      const signal = { msg, ts: Date.now() }
      if (redis) {
        try {
          const key = `signals:${room}`
          await redis.lpush(key, JSON.stringify(signal))
          await redis.expire(key, 3600)
          return res.json({ ok: true })
        } catch (e) {
          console.error("Redis Signal Error (fallback):", e)
        }
      }

      // Fallback
      SIGNALS[room] = SIGNALS[room] || []
      SIGNALS[room].push(signal)
      // Cleanup old signals
      if (SIGNALS[room].length > 100) SIGNALS[room] = SIGNALS[room].slice(-50);

      return res.json({ ok: true })
    } else if (req.method === 'GET') {
      const { action } = req.query

      if (action === 'get_host') {
        let hostId = null
        if (redis) {
          try {
            hostId = await redis.get(`room:${room}:host`)
          } catch (e) {
            console.error("Redis Get Host Error (fallback):", e)
          }
        }

        if (!hostId) {
          // Check memory
          const hostEntry = ROOM_HOSTS[room];
          if (hostEntry && hostEntry.expiresAt > Date.now()) {
            hostId = hostEntry.id;
          }
        }

        if (!hostId) return res.status(404).json({ error: 'Host not found' })
        return res.json({ hostId })
      }

      // Default get signals
      let messages: any[] = []
      if (redis) {
        try {
          const key = `signals:${room}`
          const signals = await redis.lrange(key, 0, -1) as string[]
          messages = signals.map(s => JSON.parse(s).msg).reverse()
          await redis.del(key)
          return res.json({ messages })
        } catch (e) {
          console.error("Redis Get Signals Error (fallback):", e)
        }
      }

      // Fallback
      messages = (SIGNALS[room] || []).map(s => s.msg)
      SIGNALS[room] = []

      return res.json({ messages })
    }

    res.status(405).json({ error: 'Method not allowed' })
  } catch (error) {
    console.error('Signaling error:', error)
    // Don't crash for internal errors
    res.status(500).json({ error: 'Internal server error' })
  }
}
