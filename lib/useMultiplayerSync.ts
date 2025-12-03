// Simple polling-based multiplayer hook
// Replaces P2P with Redis-backed polling

import { useEffect, useRef, useState } from 'react';
import { GameState, GameAction } from './types';

export function useMultiplayerSync(
    roomCode: string | undefined,
    isHost: boolean,
    onStateUpdate: (state: GameState) => void,
    onProcessAction?: (action: GameAction) => void
) {
    const [status, setStatus] = useState<'connecting' | 'connected' | 'error'>('connecting');
    const pollingRef = useRef<NodeJS.Timeout | null>(null);
    const lastUpdateRef = useRef<number>(0);

    // Start polling
    useEffect(() => {
        if (!roomCode) return;

        const poll = async () => {
            try {
                // Get current state
                const res = await fetch(`/api/rooms/${roomCode}/sync`);
                if (res.ok) {
                    const state: GameState = await res.json();

                    // Only update if state changed
                    if (state.lastUpdate && state.lastUpdate > lastUpdateRef.current) {
                        lastUpdateRef.current = state.lastUpdate || 0;
                        onStateUpdate(state);
                        setStatus('connected');
                    }
                } else if (res.status === 404) {
                    // Room doesn't exist yet
                    if (!isHost) {
                        setStatus('connecting');
                    }
                }

                // If host, process pending actions
                if (isHost && onProcessAction) {
                    const actionsRes = await fetch(`/api/rooms/${roomCode}/sync`, { method: 'DELETE' });
                    if (actionsRes.ok) {
                        const { actions } = await actionsRes.json();
                        actions.forEach((item: any) => {
                            onProcessAction(item.action);
                        });
                    }
                }
            } catch (error) {
                console.error('Sync error:', error);
                setStatus('error');
            }
        };

        // Poll immediately, then every 500ms
        poll();
        pollingRef.current = setInterval(poll, 500);

        return () => {
            if (pollingRef.current) {
                clearInterval(pollingRef.current);
            }
        };
    }, [roomCode, isHost]);

    // Push state to server
    const pushState = async (state: GameState) => {
        if (!roomCode) return;

        try {
            await fetch(`/api/rooms/${roomCode}/sync`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(state)
            });
        } catch (error) {
            console.error('Push state error:', error);
        }
    };

    // Send action (for non-hosts)
    const sendAction = async (action: GameAction, playerId: string) => {
        if (!roomCode) return;

        try {
            await fetch(`/api/rooms/${roomCode}/sync`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action, playerId })
            });
        } catch (error) {
            console.error('Send action error:', error);
        }
    };

    return { status, pushState, sendAction };
}
