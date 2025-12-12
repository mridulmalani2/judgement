/**
 * Unified Room Storage Layer
 * 
 * Uses Postgres for persistence.
 */

import pool from './db';
import { GameState, GameAction } from './types';

// Ensure tables exist (Basic migration)
const INIT_DB = `
CREATE TABLE IF NOT EXISTS rooms (
    code TEXT PRIMARY KEY,
    state JSONB,
    updated_at BIGINT
);

CREATE TABLE IF NOT EXISTS actions (
    id SERIAL PRIMARY KEY,
    room_code TEXT,
    action JSONB,
    player_id TEXT,
    timestamp BIGINT,
    created_at TIMESTAMP DEFAULT NOW()
);
`;

let dbInitialized = false;
async function ensureDb() {
    if (dbInitialized) return;
    try {
        await pool.query(INIT_DB);
        dbInitialized = true;
    } catch (e) {
        console.error("DB Init Error:", e);
    }
}

// In-memory fallback (only if DB fails completely, which shouldn't happen if configured)
const ROOMS: Record<string, GameState> = {};
const ACTIONS: Record<string, Array<{ action: GameAction; playerId: string; timestamp: number }>> = {};

export async function getGameState(roomCode: string): Promise<GameState | null> {
    await ensureDb();
    try {
        const res = await pool.query('SELECT state FROM rooms WHERE code = $1', [roomCode]);
        if (res.rows.length > 0) return res.rows[0].state;
        return null;
    } catch (e) {
        console.error("DB Get Error:", e);
        return ROOMS[roomCode] || null;
    }
}

export async function setGameState(roomCode: string, state: GameState, ttlSeconds: number = 86400): Promise<void> {
    await ensureDb();
    const stateWithTimestamp: GameState = {
        ...state,
        lastUpdate: Date.now(),
    };
    try {
        await pool.query(
            `INSERT INTO rooms (code, state, updated_at) VALUES ($1, $2, $3)
             ON CONFLICT (code) DO UPDATE SET state = $2, updated_at = $3`,
            [roomCode, stateWithTimestamp, Date.now()]
        );
    } catch (e) {
        console.error("DB Set Error:", e);
        ROOMS[roomCode] = stateWithTimestamp;
    }
}

export async function deleteGameState(roomCode: string): Promise<void> {
    await ensureDb();
    try {
        await pool.query('DELETE FROM rooms WHERE code = $1', [roomCode]);
        await pool.query('DELETE FROM actions WHERE room_code = $1', [roomCode]);
    } catch (e) {
        console.error("DB Delete Error:", e);
        delete ROOMS[roomCode];
    }
}

export async function pushAction(
    roomCode: string,
    action: GameAction,
    playerId: string
): Promise<void> {
    await ensureDb();
    const timestamp = Date.now();
    try {
        await pool.query(
            'INSERT INTO actions (room_code, action, player_id, timestamp) VALUES ($1, $2, $3, $4)',
            [roomCode, action, playerId, timestamp]
        );
    } catch (e) {
        console.error("DB Push Action Error:", e);
        if (!ACTIONS[roomCode]) ACTIONS[roomCode] = [];
        ACTIONS[roomCode].push({ action, playerId, timestamp });
    }
}

export async function drainActions(
    roomCode: string
): Promise<Array<{ action: GameAction; playerId: string; timestamp: number }>> {
    await ensureDb();
    try {
        // Get all actions ordered by ID (insertion order)
        const res = await pool.query(
            'SELECT action, player_id, timestamp FROM actions WHERE room_code = $1 ORDER BY id ASC',
            [roomCode]
        );

        // Delete them
        if (res.rows.length > 0) {
            await pool.query('DELETE FROM actions WHERE room_code = $1', [roomCode]);
        }

        return res.rows.map(row => ({
            action: row.action,
            playerId: row.player_id,
            timestamp: parseInt(row.timestamp)
        }));
    } catch (e) {
        console.error("DB Drain Actions Error:", e);
        const actions = ACTIONS[roomCode] || [];
        ACTIONS[roomCode] = [];
        return actions;
    }
}

export function isRedisEnabled(): boolean {
    return true; // Use DB as persistence layer
}
