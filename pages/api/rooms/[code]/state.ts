import { NextApiRequest, NextApiResponse } from 'next';
import { Redis } from '@upstash/redis';

const redis = process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
    ? new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
    })
    : null;

// In-memory fallback
const ROOMS: Record<string, any> = (global as any).ROOMS || {};
if (!redis) {
    (global as any).ROOMS = ROOMS;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const { code } = req.query as { code: string };

    if (!code) {
        return res.status(400).json({ error: 'Room code required' });
    }

    try {
        if (req.method === 'GET') {
            // Get current game state
            let state = null;

            if (redis) {
                const data = await redis.get(`room:${code}:state`);
                state = data;
            } else {
                state = ROOMS[code] || null;
            }

            if (!state) {
                return res.status(404).json({ error: 'Room not found' });
            }

            return res.json(state);
        }

        else if (req.method === 'POST') {
            // Update game state
            const { state, action } = req.body;

            if (!state) {
                return res.status(400).json({ error: 'State required' });
            }

            // Store in Redis with 24 hour expiry
            if (redis) {
                await redis.set(`room:${code}:state`, state, { ex: 86400 });
            } else {
                ROOMS[code] = state;
            }

            // Broadcast to all connected clients by updating timestamp
            const updatedState = { ...state, lastUpdate: Date.now() };

            if (redis) {
                await redis.set(`room:${code}:state`, updatedState, { ex: 86400 });
            } else {
                ROOMS[code] = updatedState;
            }

            return res.json({ ok: true, state: updatedState });
        }

        else if (req.method === 'DELETE') {
            // Delete room
            if (redis) {
                await redis.del(`room:${code}:state`);
            } else {
                delete ROOMS[code];
            }

            return res.json({ ok: true });
        }

        return res.status(405).json({ error: 'Method not allowed' });
    } catch (error) {
        console.error('Room state error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}
