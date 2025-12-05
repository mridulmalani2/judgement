/**
 * Unified Multiplayer Sync API
 * 
 * This is the CANONICAL endpoint for all polling-based multiplayer sync.
 * 
 * GET:    Retrieve current GameState
 * POST:   Update GameState (host only, but not enforced at API level)
 * PUT:    Send an action to the actions queue (non-hosts)
 * DELETE: Drain all pending actions (host only)
 */

import { NextApiRequest, NextApiResponse } from 'next';
import { GameState, GameAction } from '../../../../lib/types';
import { getGameState, setGameState, pushAction, drainActions } from '../../../../lib/roomStore';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const { code } = req.query as { code: string };

    if (!code) {
        return res.status(400).json({ error: 'Room code required' });
    }

    try {
        switch (req.method) {
            case 'GET': {
                // Get current game state
                const state = await getGameState(code);

                if (!state) {
                    return res.status(404).json({ error: 'Room not found' });
                }

                return res.json(state);
            }

            case 'POST': {
                // Update game state (typically called by host)
                const newState = req.body as GameState;

                if (!newState || typeof newState !== 'object') {
                    return res.status(400).json({ error: 'Valid GameState required' });
                }

                // Validate required fields
                if (!newState.roomCode || !newState.players || !Array.isArray(newState.players)) {
                    return res.status(400).json({ error: 'Invalid GameState structure' });
                }

                // Save state with automatic timestamping
                await setGameState(code, newState);

                return res.json({ ok: true });
            }

            case 'PUT': {
                // Send an action to be processed by host
                const { action, playerId } = req.body;

                if (!action || !action.type) {
                    return res.status(400).json({ error: 'Valid action required' });
                }

                if (!playerId) {
                    return res.status(400).json({ error: 'playerId required' });
                }

                // Verify room exists before accepting action
                const state = await getGameState(code);
                if (!state) {
                    return res.status(404).json({ error: 'Room not found' });
                }

                // Push action to queue
                await pushAction(code, action as GameAction, playerId);

                return res.json({ ok: true });
            }

            case 'DELETE': {
                // Drain pending actions (host only)
                // Note: We don't enforce host-only at API level; the frontend handles this
                const actions = await drainActions(code);

                return res.json({ actions });
            }

            default:
                return res.status(405).json({ error: 'Method not allowed' });
        }
    } catch (error) {
        console.error('Sync API error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}
