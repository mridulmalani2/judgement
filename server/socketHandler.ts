import { Server, Socket } from 'socket.io';
import { v4 as uuidv4 } from 'uuid';
import { GameState, Player, GameAction, Card, Suit } from '../lib/types';
import { createDeck, shuffleDeck, dealCards } from '../lib/deck';
import {
    getTrickWinner,
    isValidPlay,
    calculateScores,
    canBet,
    getAutoPlayCard
} from '../lib/gameEngine';

interface RoomState {
    gameState: GameState;
    lastActivity: number;
}

const rooms: { [roomId: string]: RoomState } = {};

export function setupSocketIO(io: Server) {
    io.on('connection', (socket: Socket) => {
        console.log('Client connected:', socket.id);

        socket.on('join_room', ({ roomId, player }: { roomId: string, player: Player }) => {
            socket.join(roomId);

            if (!rooms[roomId]) {
                // Initialize new room
                // Initialize new room
                rooms[roomId] = {
                    gameState: {
                        roomCode: roomId,
                        players: [],
                        roundIndex: 0,
                        cardsPerPlayer: 0,
                        trump: 'spades',
                        dealerSeatIndex: 0,
                        currentLeaderSeatIndex: 0,
                        phase: 'lobby',
                        currentTrick: [],
                        scoresHistory: [],
                        deckSeed: uuidv4(),
                        settings: {
                            discardStrategy: 'random',
                            autoPlayEnabled: true,
                            allowSpectators: true
                        }
                    },
                    lastActivity: Date.now()
                };
            }

            const room = rooms[roomId];
            const existingPlayerIndex = room.gameState.players.findIndex(p => p.id === player.id);

            if (existingPlayerIndex !== -1) {
                // Reconnect existing player
                room.gameState.players[existingPlayerIndex].connected = true;
                // Update socket ID mapping if needed (omitted for simplicity, usually handled by auth)
            } else {
                // Add new player
                if (room.gameState.phase === 'lobby') {
                    room.gameState.players.push({
                        ...player,
                        connected: true,
                        tricksWon: 0,
                        hand: [],
                        isHost: room.gameState.players.length === 0, // First player is host
                        seatIndex: room.gameState.players.length,
                        isAway: false,
                        currentBet: null,
                        totalPoints: 0
                    });
                } else {
                    // Spectator or reconnect logic could go here
                    socket.emit('error', 'Game already started');
                    return;
                }
            }

            io.to(roomId).emit('state_update', room.gameState);
        });

        socket.on('game_action', ({ roomId, action }: { roomId: string, action: GameAction }) => {
            const room = rooms[roomId];
            if (!room) return;

            try {
                const newState = processGameAction(room.gameState, action);
                room.gameState = newState;
                room.lastActivity = Date.now();
                io.to(roomId).emit('state_update', room.gameState);
            } catch (error: any) {
                socket.emit('error', error.message);
            }
        });

        socket.on('disconnect', () => {
            console.log('Client disconnected:', socket.id);
            // Handle player disconnect (mark as away)
            // This requires mapping socket.id to roomId/playerId, which we haven't implemented yet.
            // For a robust implementation, we'd need a socket-to-player map.
        });
    });
}

function processGameAction(state: GameState, action: GameAction): GameState {
    // This function will contain the core game loop logic, moved from the client.
    // For now, we'll just return the state as is to satisfy the interface, 
    // but in the full migration, we'd move the reducer logic here.

    // Placeholder implementation to show structure
    switch (action.type) {
        case 'START_GAME':
            if (state.phase !== 'lobby') throw new Error("Game already started");
            // Logic to start game...
            return { ...state, phase: 'betting' }; // Simplified
        default:
            return state;
    }
}
