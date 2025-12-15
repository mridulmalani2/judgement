/**
 * Simple Game State API
 *
 * Single-game model - no room codes needed.
 * All players share one game state stored in Redis.
 *
 * GET:    Get current game state
 * POST:   Update game state (any client can update)
 * PUT:    Send a player action
 * DELETE: Drain pending actions (host)
 */

import { NextApiRequest, NextApiResponse } from 'next';
import { Redis } from '@upstash/redis';
import { GameState, GameAction } from '../../../lib/types';

// Game key - single global game
const GAME_KEY = 'judgement:game:state';
const ACTIONS_KEY = 'judgement:game:actions';
const TTL_SECONDS = 86400; // 24 hours

// Initialize Redis
const redis = process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
    ? new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
    })
    : null;

// In-memory fallback for local dev
let memoryState: GameState | null = null;
let memoryActions: Array<{ action: GameAction; playerId: string; timestamp: number }> = [];

async function getState(): Promise<GameState | null> {
    if (redis) {
        try {
            return await redis.get<GameState>(GAME_KEY);
        } catch (e) {
            console.error('Redis get error:', e);
        }
    }
    return memoryState;
}

async function setState(state: GameState): Promise<void> {
    const stateWithTimestamp = { ...state, lastUpdate: Date.now() };
    if (redis) {
        try {
            await redis.set(GAME_KEY, stateWithTimestamp, { ex: TTL_SECONDS });
            return;
        } catch (e) {
            console.error('Redis set error:', e);
        }
    }
    memoryState = stateWithTimestamp;
}

async function pushAction(action: GameAction, playerId: string): Promise<void> {
    const entry = { action, playerId, timestamp: Date.now() };
    if (redis) {
        try {
            await redis.lpush(ACTIONS_KEY, entry);
            await redis.expire(ACTIONS_KEY, TTL_SECONDS);
            return;
        } catch (e) {
            console.error('Redis push error:', e);
        }
    }
    memoryActions.push(entry);
}

async function drainActions(): Promise<Array<{ action: GameAction; playerId: string; timestamp: number }>> {
    if (redis) {
        try {
            const items = await redis.lrange(ACTIONS_KEY, 0, -1);
            await redis.del(ACTIONS_KEY);
            return (items as any[]).reverse();
        } catch (e) {
            console.error('Redis drain error:', e);
        }
    }
    const actions = [...memoryActions];
    memoryActions = [];
    return actions;
}

async function clearGame(): Promise<void> {
    if (redis) {
        try {
            await redis.del(GAME_KEY);
            await redis.del(ACTIONS_KEY);
            return;
        } catch (e) {
            console.error('Redis clear error:', e);
        }
    }
    memoryState = null;
    memoryActions = [];
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    // Add CORS headers for broader compatibility
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    try {
        switch (req.method) {
            case 'GET': {
                const state = await getState();
                if (!state) {
                    return res.status(404).json({ error: 'No active game' });
                }
                return res.json(state);
            }

            case 'POST': {
                const { action: reqAction } = req.query;

                // Special action: clear game
                if (reqAction === 'clear') {
                    await clearGame();
                    return res.json({ ok: true, message: 'Game cleared' });
                }

                const newState = req.body as GameState;
                if (!newState || !newState.players) {
                    return res.status(400).json({ error: 'Invalid game state' });
                }
                await setState(newState);
                return res.json({ ok: true });
            }

            case 'PUT': {
                const { action, playerId } = req.body;
                if (!action || !action.type) {
                    return res.status(400).json({ error: 'Valid action required' });
                }
                if (!playerId) {
                    return res.status(400).json({ error: 'playerId required' });
                }
                await pushAction(action as GameAction, playerId);
                return res.json({ ok: true });
            }

            case 'DELETE': {
                const actions = await drainActions();
                return res.json({ actions });
            }

            default:
                return res.status(405).json({ error: 'Method not allowed' });
        }
    } catch (error) {
        console.error('Game API error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}
