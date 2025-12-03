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
      const msg = req.body
      const signal = { msg, ts: Date.now() }

      if (redis) {
        // Use Redis for persistent storage
        const key = `signals:${room}`
        await redis.lpush(key, JSON.stringify(signal))
        // Set expiry to 1 hour (signals are ephemeral)
        await redis.expire(key, 3600)
      } else {
        // Fallback to in-memory storage
        SIGNALS[room] = SIGNALS[room] || []
        SIGNALS[room].push(signal)
      }

      return res.json({ ok: true })
    } else if (req.method === 'GET') {
      let messages: any[] = []

      if (redis) {
        // Retrieve all signals from Redis
        const key = `signals:${room}`
        const signals = await redis.lrange(key, 0, -1) as string[]
        messages = signals.map(s => JSON.parse(s).msg).reverse()
        // Clear signals after retrieval
        await redis.del(key)
      } else {
        // Fallback to in-memory storage
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
