/**
 * Unified Room Storage Layer
 * 
 * This module provides a single, coherent interface for persisting game state and actions.
 * - In production (with UPSTASH_REDIS_* env vars): Uses Redis
 * - In development (without Redis): Uses in-memory global maps
 * 
 * This prevents the scattered `(global as any).ROOMS` pattern and ensures
 * all state access goes through one consistent API.
 */

import { Redis } from '@upstash/redis';
import { GameState, GameAction } from './types';

// Initialize Redis if credentials are available
const redis = process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
    ? new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
    })
    : null;

// In-memory fallback for local development (no Redis)
// Only used when Redis is not configured
const ROOMS: Record<string, GameState> = {};
const ACTIONS: Record<string, Array<{ action: GameAction; playerId: string; timestamp: number }>> = {};

/**
 * Get the current game state for a room
 * @param roomCode - The room code
 * @returns GameState if found, null otherwise
 */
export async function getGameState(roomCode: string): Promise<GameState | null> {
    if (redis) {
        return await redis.get<GameState>(`room:${roomCode}:state`);
    } else {
        return ROOMS[roomCode] || null;
    }
}

/**
 * Set/update the game state for a room
 * Automatically adds a timestamp for change detection
 * @param roomCode - The room code
 * @param state - The new game state
 * @param ttlSeconds - Time to live in seconds (default: 24 hours)
 */
export async function setGameState(roomCode: string, state: GameState, ttlSeconds: number = 86400): Promise<void> {
    const stateWithTimestamp: GameState = {
        ...state,
        lastUpdate: Date.now(),
    };

    if (redis) {
        await redis.set(`room:${roomCode}:state`, stateWithTimestamp, { ex: ttlSeconds });
    } else {
        ROOMS[roomCode] = stateWithTimestamp;
    }
}

/**
 * Delete a room's state
 * @param roomCode - The room code
 */
export async function deleteGameState(roomCode: string): Promise<void> {
    if (redis) {
        await redis.del(`room:${roomCode}:state`);
    } else {
        delete ROOMS[roomCode];
    }
}

/**
 * Push an action to the pending actions queue for a room
 * Used by non-hosts to send actions to the host
 * @param roomCode - The room code
 * @param action - The game action
 * @param playerId - The player who sent the action
 */
export async function pushAction(
    roomCode: string,
    action: GameAction,
    playerId: string
): Promise<void> {
    const actionWithMeta = {
        action,
        playerId,
        timestamp: Date.now(),
    };

    if (redis) {
        const key = `room:${roomCode}:actions`;
        await redis.lpush(key, JSON.stringify(actionWithMeta));
        await redis.expire(key, 3600); // 1 hour TTL for actions
    } else {
        if (!ACTIONS[roomCode]) {
            ACTIONS[roomCode] = [];
        }
        ACTIONS[roomCode].push(actionWithMeta);
    }
}

/**
 * Drain all pending actions for a room (host only)
 * Returns actions in the order they were received
 * @param roomCode - The room code
 * @returns Array of actions with metadata
 */
export async function drainActions(
    roomCode: string
): Promise<Array<{ action: GameAction; playerId: string; timestamp: number }>> {
    if (redis) {
        const key = `room:${roomCode}:actions`;
        const actionStrings = await redis.lrange<string>(key, 0, -1);
        const actions = actionStrings.map(s => JSON.parse(s)).reverse(); // Reverse to get correct order
        await redis.del(key);
        return actions;
    } else {
        const actions = ACTIONS[roomCode] || [];
        ACTIONS[roomCode] = []; // Clear the queue
        return actions;
    }
}

/**
 * Check if Redis is configured
 * @returns true if Redis is available, false if using in-memory fallback
 */
export function isRedisEnabled(): boolean {
    return redis !== null;
}
