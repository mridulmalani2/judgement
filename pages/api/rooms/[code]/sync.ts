import { NextApiRequest, NextApiResponse } from 'next';
import { Redis } from '@upstash/redis';
import { GameState } from '../../../../lib/types';

const redis = process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
    ? new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
    })
    : null;

// In-memory fallback for local development
const ROOMS: Record<string, GameState> = (global as any).ROOMS || {};
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
            let state: GameState | null = null;

            if (redis) {
                state = await redis.get(`room:${code}:state`) as GameState | null;
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
            const newState = req.body as GameState;

            if (!newState) {
                return res.status(400).json({ error: 'State required' });
            }

            // Add timestamp for change detection
            const stateWithTimestamp = {
                ...newState,
                lastUpdate: Date.now()
            };

            // Store in Redis with 24 hour expiry
            if (redis) {
                await redis.set(`room:${code}:state`, stateWithTimestamp, { ex: 86400 });
            } else {
                ROOMS[code] = stateWithTimestamp;
            }

            return res.json({ ok: true });
        }

        else if (req.method === 'PUT') {
            // Send an action to be processed by host
            const { action, playerId } = req.body;

            if (!action) {
                return res.status(400).json({ error: 'Action required' });
            }

            // Get current state
            let state: GameState | null = null;
            if (redis) {
                state = await redis.get(`room:${code}:state`) as GameState | null;
            } else {
                state = ROOMS[code] || null;
            }

            if (!state) {
                return res.status(404).json({ error: 'Room not found' });
            }

            // Store action in pending actions list
            const actionsKey = `room:${code}:actions`;
            const actionWithMeta = { action, playerId, timestamp: Date.now() };

            if (redis) {
                await redis.lpush(actionsKey, JSON.stringify(actionWithMeta));
                await redis.expire(actionsKey, 3600);
            } else {
                if (!(global as any).ACTIONS) (global as any).ACTIONS = {};
                if (!(global as any).ACTIONS[code]) (global as any).ACTIONS[code] = [];
                (global as any).ACTIONS[code].push(actionWithMeta);
            }

            return res.json({ ok: true });
        }

        else if (req.method === 'DELETE') {
            // Get pending actions (for host to process)
            let actions: any[] = [];
            const actionsKey = `room:${code}:actions`;

            if (redis) {
                const actionStrings = await redis.lrange(actionsKey, 0, -1) as string[];
                actions = actionStrings.map(s => JSON.parse(s)).reverse();
                await redis.del(actionsKey);
            } else {
                if ((global as any).ACTIONS && (global as any).ACTIONS[code]) {
                    actions = (global as any).ACTIONS[code];
                    (global as any).ACTIONS[code] = [];
                }
            }

            return res.json({ actions });
        }

        return res.status(405).json({ error: 'Method not allowed' });
    } catch (error) {
        console.error('Room state error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}
