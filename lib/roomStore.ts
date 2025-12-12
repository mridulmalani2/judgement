/**
 * Unified Room Storage Layer
 * 
 * Uses Upstash Redis for persistence with a robust in-memory fallback.
 * This ensures the app works even if Redis is misconfigured or down.
 */

import { Redis } from '@upstash/redis';
import { GameState, GameAction } from './types';

// Initialize Redis client
// We check for env vars, but we also wrap calls in try/catch to handle runtime connection failures.
const redis = process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
    ? new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
    })
    : null;

// In-memory fallback
const ROOMS: Record<string, GameState> = {};
const ACTIONS: Record<string, Array<{ action: GameAction; playerId: string; timestamp: number }>> = {};

export async function getGameState(roomCode: string): Promise<GameState | null> {
    if (redis) {
        try {
            const state = await redis.get<GameState>(`room:${roomCode}`);
            return state || null;
        } catch (e) {
            console.error("Redis Get Error (falling back to memory):", e);
        }
    }
    return ROOMS[roomCode] || null;
}

export async function setGameState(roomCode: string, state: GameState, ttlSeconds: number = 86400): Promise<void> {
    const stateWithTimestamp: GameState = {
        ...state,
        lastUpdate: Date.now(),
    };

    if (redis) {
        try {
            await redis.set(`room:${roomCode}`, stateWithTimestamp, { ex: ttlSeconds });
            return; // Success, don't write to memory (or write to both? usually one is enough)
        } catch (e) {
            console.error("Redis Set Error (falling back to memory):", e);
        }
    }

    // Fallback or if Redis missing
    ROOMS[roomCode] = stateWithTimestamp;

    // Clean up memory slowly to prevent leaks (simple mechanism)
    if (Object.keys(ROOMS).length > 1000) {
        // Naive cleanup: delete approx 10% of keys
        const keys = Object.keys(ROOMS);
        for (let i = 0; i < 100; i++) {
            delete ROOMS[keys[i]];
        }
    }
}

export async function deleteGameState(roomCode: string): Promise<void> {
    if (redis) {
        try {
            await redis.del(`room:${roomCode}`);
            await redis.del(`actions:${roomCode}`);
            return;
        } catch (e) {
            console.error("Redis Delete Error (falling back to memory):", e);
        }
    }

    delete ROOMS[roomCode];
    delete ACTIONS[roomCode];
}

export async function pushAction(
    roomCode: string,
    action: GameAction,
    playerId: string
): Promise<void> {
    const timestamp = Date.now();
    const actionEntry = { action, playerId, timestamp };

    if (redis) {
        try {
            const key = `actions:${roomCode}`;
            await redis.lpush(key, actionEntry);
            await redis.expire(key, 86400);
            return;
        } catch (e) {
            console.error("Redis Push Action Error (falling back to memory):", e);
        }
    }

    if (!ACTIONS[roomCode]) ACTIONS[roomCode] = [];
    ACTIONS[roomCode].push(actionEntry);
}

export async function drainActions(
    roomCode: string
): Promise<Array<{ action: GameAction; playerId: string; timestamp: number }>> {
    if (redis) {
        try {
            const key = `actions:${roomCode}`;
            // Get all items
            const items = await redis.lrange(key, 0, -1);
            // Delete them
            await redis.del(key);

            // Redis lpush adds to the head, so we read them in reverse order of insertion?
            // Actually lrange 0 -1 returns them. If we used lpush, the last inserted is at 0.
            // Queue behavior typically wants First-In-First-Out. 
            // If we use lpush (prepend), then index 0 is newest. 
            // We want to process oldest first. 
            // So we should reverse 'items'.
            // However, usually detailed ordering is managed by the host. 
            // Let's reverse it to be safe (Oldest first).
            return items.reverse() as any[];
        } catch (e) {
            console.error("Redis Drain Actions Error (falling back to memory):", e);
        }
    }

    const actions = ACTIONS[roomCode] || [];
    ACTIONS[roomCode] = [];
    return actions;
}

export function isRedisEnabled(): boolean {
    return !!redis;
}

