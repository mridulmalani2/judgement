// Last updated: 2025-12-05
import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { v4 as uuidv4 } from 'uuid';
import { P2PManager, P2PEvent } from '../../lib/p2p';
import { GameState, Player, Card, GameAction, Suit, GameSettings } from '../../lib/types';
import { createDeck, shuffleDeck, prepareRoundDeck } from '../../lib/deck';
import { getTrickWinner, isValidPlay, calculateScores, canBet, getAutoPlayCard } from '../../lib/gameEngine';
import PlayerSeat from '../../components/PlayerSeat';
import Hand from '../../components/Hand';
import CardComponent from '../../components/Card';
import BetInput from '../../components/BetInput';
import Leaderboard from '../../components/Leaderboard';
import DealerButton from '../../components/DealerButton';
import GameHUD from '../../components/GameHUD';
import HostSettings from '../../components/HostSettings';
import { Copy, Share2, MessageCircle, Menu, Users, Crown, Settings as SettingsIcon, UserX, UserCheck, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import clsx from 'clsx';
import GameSetupModal from '../../components/GameSetupModal'; // Will create this component

export default function Room() {
    const router = useRouter();
    const { code } = router.query;
    const roomCode = Array.isArray(code) ? code[0] : code;

    const [myId, setMyId] = useState<string>('');
    const [myName, setMyName] = useState<string>('');
    const [gameState, setGameState] = useState<GameState | null>(null);
    const [p2p, setP2P] = useState<P2PManager | null>(null);
    const [isHost, setIsHost] = useState(false);
    const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('connecting');
    const [errorMessage, setErrorMessage] = useState<string>('');
    const [showSettings, setShowSettings] = useState(false);
    const [showSetup, setShowSetup] = useState(false);

    // Refs for state access in callbacks
    const gameStateRef = useRef<GameState | null>(null);
    useEffect(() => { gameStateRef.current = gameState; }, [gameState]);

    const p2pRef = useRef<P2PManager | null>(null);
    const pollingRef = useRef<NodeJS.Timeout | null>(null);
    const usePollingRef = useRef(false);

    // Initialize
    useEffect(() => {
        if (!roomCode) return;

        const storedName = localStorage.getItem('judgment_name');
        const storedId = localStorage.getItem('judgment_id') || uuidv4();
        if (!localStorage.getItem('judgment_id')) localStorage.setItem('judgment_id', storedId);

        if (!storedName) {
            router.push('/');
            return;
        }

        setMyName(storedName);
        setMyId(storedId);

        const isCreator = router.query.host === 'true';
        setIsHost(isCreator);

        // Try to fetch existing state first (to handle refreshes)
        fetch(`/api/rooms/${roomCode}/sync`)
            .then(async (res) => {
                if (res.ok) {
                    const existingState = await res.json();
                    console.log("Found existing state, restoring...");
                    setGameState(existingState);
                    setConnectionStatus('connected');

                    // If we found state, we skip P2P init *as a creator* who makes a new game,
                    // but we still need to set up P2P to listen or host.
                    setupP2P(roomCode, isCreator, storedId, storedName, true); // true = already initialized
                } else {
                    // No state found.
                    if (isCreator) {
                        // Create new game
                        setupP2P(roomCode, isCreator, storedId, storedName, false);
                    } else {
                        // Joiner - wait for host
                        setupP2P(roomCode, isCreator, storedId, storedName, false);
                    }
                }
            })
            .catch(e => {
                console.error("Error checking state:", e);
                // Fallback to regular init flow
                setupP2P(roomCode, isCreator, storedId, storedName, false);
            });

        return () => {
            // Cleanup handled in setupP2P return or separate effect? 
            // Ideally we should extract cleanup. For now, rely on ref modification or simple unmount.
            if (p2pRef.current) p2pRef.current.destroy();
            stopPolling();
        };
    }, [roomCode, router.query.host]);

    const setupP2P = (code: string, amHost: boolean, myId: string, myName: string, stateExists: boolean) => {
        // Try P2P first
        if (p2pRef.current) {
            p2pRef.current.destroy();
        }

        const manager = new P2PManager(code, amHost, (event) => handleP2PEvent(event, amHost, myId, myName));
        p2pRef.current = manager;
        setP2P(manager);

        // Force fallback if P2P takes too long overall
        const globalTimeout = setTimeout(() => {
            if (!usePollingRef.current && connectionStatus !== 'connected') {
                console.warn("⚠️ P2P initialization took too long, forcing polling mode...");
                manager.destroy();
                usePollingRef.current = true;
                startPolling(amHost, myId, myName, stateExists);
            }
        }, 8000); // 8 seconds max wait

        manager.init()
            .then(() => {
                clearTimeout(globalTimeout);
                console.log('✅ P2P connected successfully!');
                setConnectionStatus('connected');
                if (amHost && !stateExists) {
                    initializeGame(myId, myName);
                } else if (!amHost) {
                    // Join logic is handled in "CONNECT" event 
                }
            })
            .catch((err) => {
                clearTimeout(globalTimeout);
                console.error("❌ P2P failed, switching to polling mode:", err);
                usePollingRef.current = true;
                startPolling(amHost, myId, myName, stateExists);
            });
    };

    const startPolling = (isCreator: boolean, playerId: string, playerName: string, stateExists: boolean = false) => {
        // If I am the Creator, I don't need to "poll" for state, I AM the state. 
        // My 'Host Bridge' effect handles action fetching.
        if (isCreator) {
            if (!stateExists) initializeGame(playerId, playerName);
            return;
        }

        console.log('🔄 Client: Starting polling mode...');
        setConnectionStatus('connecting');

        // Join if needed
        setTimeout(() => {
            sendAction({
                type: 'JOIN',
                playerId: playerId,
                payload: { name: playerName }
            } as any);
        }, 1000);

        // Poll for state updates
        const poll = async () => {
            try {
                const res = await fetch(`/api/rooms/${roomCode}/sync`);
                if (res.ok) {
                    const state = await res.json();
                    setGameState(state);
                    setConnectionStatus('connected');
                } else if (res.status === 404) {
                    setConnectionStatus('error');
                    setErrorMessage('Room not found. Host may have disconnected or is setting up.');
                }
            } catch (error) {
                console.error('Polling error:', error);
            }
        };

        poll();
        pollingRef.current = setInterval(poll, 1000); // 1s interval for clients
    };

    const stopPolling = () => {
        if (pollingRef.current) {
            clearInterval(pollingRef.current);
            pollingRef.current = null;
        }
    };

    const handleP2PEvent = (event: P2PEvent, amHost: boolean, myId: string, myName: string) => {
        switch (event.type) {
            case 'CONNECT':
                if (amHost) {
                    // Send current state to new peer
                    if (gameStateRef.current) {
                        p2pRef.current?.sendTo(event.peerId, { type: 'STATE_UPDATE', state: gameStateRef.current });
                    }
                } else {
                    // I connected to host, send JOIN
                    // Wait a brief moment to ensure connection stable?
                    setTimeout(() => {
                        p2pRef.current?.send({
                            type: 'ACTION',
                            action: {
                                type: 'JOIN',
                                playerId: myId,
                                payload: { name: myName }
                            }
                        });
                    }, 500);
                }
                break;
            case 'DATA':
                const payload = event.data;
                if (payload.type === 'STATE_UPDATE') {
                    setGameState(payload.state);
                } else if (payload.type === 'ACTION' && amHost) {
                    processAction(payload.action);
                }
                break;
            case 'DISCONNECT':
                // Handle disconnect
                break;
            case 'ERROR':
                setErrorMessage(event.error);
                setConnectionStatus('error');
                break;
        }
    };

    const initializeGame = (hostId: string, hostName: string) => {
        const newPlayer: Player = {
            id: hostId,
            name: hostName,
            seatIndex: 0,
            isHost: true,
            connected: true,
            isAway: false,
            currentBet: null,
            tricksWon: 0,
            totalPoints: 0,
            hand: []
        };
        const newState: GameState = {
            roomCode: roomCode as string,
            players: [newPlayer],
            roundIndex: 0,
            cardsPerPlayer: 0,
            trump: 'spades',
            dealerSeatIndex: 0,
            currentLeaderSeatIndex: 0,
            currentTrick: [],
            phase: 'lobby',
            deckSeed: uuidv4(),
            scoresHistory: [],
            settings: {
                discardStrategy: 'random',
                autoPlayEnabled: true,
                allowSpectators: true
            },
            currentDeck: [],
            playedPile: []
        };
        setGameState(newState);

        // Always save initial state to server
        fetch(`/api/rooms/${roomCode}/sync`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newState)
        }).catch(e => console.error("Init save error", e));
    };

    const sendAction = async (action: GameAction) => {
        if (isHost) {
            processAction(action);
        } else {
            if (usePollingRef.current) {
                // Use polling API
                await fetch(`/api/rooms/${roomCode}/sync`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action, playerId: myId })
                });
            } else {
                // Use P2P
                p2pRef.current?.send({ type: 'ACTION', action });
            }
        }
    };

    // --- Game Logic (Host Only) ---

    // Helper to start a round (or continue game)
    const playRound = (state: GameState, seed: string) => {
        const numPlayers = state.players.length;

        // Round 1 calculates cardsPerPlayer from user input (already set in START_GAME)
        // Subsequent rounds: cardsPerPlayer - 1
        if (state.roundIndex > 0) {
            state.cardsPerPlayer = state.cardsPerPlayer - 1;
        }

        if (state.cardsPerPlayer < 1) {
            state.phase = 'finished';
            return;
        }

        try {
            // prepareRoundDeck handles the discard strategy (priority for round 0, random for others)
            // and dealing.
            const { hands, remainingDeck, discarded } = prepareRoundDeck(
                state.currentDeck,
                state.roundIndex,
                numPlayers,
                state.cardsPerPlayer,
                seed
            );

            // Update state with new hands and new currentDeck (the remaining cards)
            state.players.forEach((p, i) => {
                p.hand = hands[i];
                p.currentBet = null;
                p.tricksWon = 0;
            });

            // The 'currentDeck' in state becomes the remaining cards (not dealt, not discarded)
            // Actually, in our logic "currentDeck" holds the stack.
            // Wait, if we discard and deal, the remaining cards are... 0?
            // "Round 1... remove exactly cardsToDiscard... deal C cards"
            // If cardsToDiscard = 52 - needed.
            // Then remaining is 0.
            // This is handled correctly by prepareRoundDeck. 
            // state.currentDeck should update to whatever is left (likely empty array).
            state.currentDeck = remainingDeck;

            // Trump rotation: Spades -> Hearts -> Diamonds -> Clubs
            const trumpOrder: Suit[] = ['spades', 'hearts', 'diamonds', 'clubs'];
            state.trump = trumpOrder[state.roundIndex % 4];

            state.dealerSeatIndex = state.roundIndex % numPlayers;
            state.currentLeaderSeatIndex = (state.dealerSeatIndex + 1) % numPlayers;
            state.phase = 'betting';
            state.currentTrick = [];
            state.playedPile = []; // Clear played pile for new round

        } catch (e) {
            console.error("Failed to start round:", e);
            state.phase = 'finished'; // Should not happen if math is right
        }
    };

    const processAction = (action: GameAction) => {
        const currentState = gameStateRef.current;
        if (!currentState) return;

        let newState: GameState = JSON.parse(JSON.stringify(currentState));

        switch (action.type) {
            case 'JOIN':
                const joinAction = action as any;
                if (newState.players.some((p: Player) => p.id === joinAction.playerId)) {
                    const p = newState.players.find((p: Player) => p.id === joinAction.playerId);
                    if (p) p.connected = true;
                } else {
                    const newPlayer: Player = {
                        id: joinAction.playerId,
                        name: joinAction.payload.name,
                        seatIndex: newState.players.length,
                        isHost: false,
                        connected: true,
                        isAway: false,
                        currentBet: null,
                        tricksWon: 0,
                        totalPoints: 0,
                        hand: []
                    };
                    newState.players.push(newPlayer);
                }
                break;

            case 'START_GAME':
                if (newState.phase !== 'lobby' && newState.phase !== 'finished') return;

                // Initialize match
                newState.roundIndex = 0;
                newState.scoresHistory = [];
                newState.players.forEach((p: Player) => { p.totalPoints = 0; p.tricksWon = 0; p.currentBet = null; p.hand = []; });

                // Set initial deck (52 cards)
                newState.currentDeck = createDeck();
                newState.playedPile = [];

                // Set initial cards per player
                const payload = (action as any).payload;
                if (payload && payload.initialCardsPerPlayer) {
                    newState.cardsPerPlayer = payload.initialCardsPerPlayer;
                } else {
                    // Default fallback
                    newState.cardsPerPlayer = Math.floor(52 / newState.players.length);
                }

                playRound(newState, newState.deckSeed);
                break;

            case 'BET':
                const playerIndex = newState.players.findIndex(p => p.id === action.playerId);
                if (playerIndex === -1) return;

                if (!canBet(action.bet, newState.players.map(p => p.currentBet || 0).slice(0, playerIndex), newState.players.length, newState.cardsPerPlayer)) {
                    return;
                }

                newState.players[playerIndex].currentBet = action.bet;
                newState.currentLeaderSeatIndex = (newState.currentLeaderSeatIndex + 1) % newState.players.length;

                if (newState.players.every(p => p.currentBet !== null)) {
                    newState.phase = 'playing';
                    newState.currentLeaderSeatIndex = (newState.dealerSeatIndex + 1) % newState.players.length;
                }
                break;

            case 'PLAY_CARD':
                const pIndex = newState.players.findIndex(p => p.id === action.playerId);
                if (pIndex === -1) return;

                const player = newState.players[pIndex];
                const card = action.card;

                if (!isValidPlay(card, player.hand, newState.currentTrick, newState.trump)) {
                    return;
                }

                player.hand = player.hand.filter(c => !(c.suit === card.suit && c.rank === card.rank));
                newState.currentTrick.push({ seatIndex: pIndex, card: card });
                newState.currentLeaderSeatIndex = (newState.currentLeaderSeatIndex + 1) % newState.players.length;

                if (newState.currentTrick.length === newState.players.length) {
                    const winnerSeatIndex = getTrickWinner(newState.currentTrick, newState.trump);
                    newState.players[winnerSeatIndex].tricksWon = (newState.players[winnerSeatIndex].tricksWon || 0) + 1;

                    // Move trick cards to playedPile
                    const trickCards = newState.currentTrick.map(pc => pc.card);
                    if (!newState.playedPile) newState.playedPile = []; // Safety check
                    newState.playedPile.push(...trickCards);

                    newState.currentTrick = [];
                    newState.currentLeaderSeatIndex = winnerSeatIndex;

                    if (newState.players[0].hand.length === 0) {
                        // Round finished
                        const roundScores = calculateScores(newState.players);
                        newState.players.forEach(p => {
                            p.totalPoints = (p.totalPoints || 0) + (roundScores[p.id] || 0);
                        });
                        newState.roundIndex++;

                        // Prepare deck for next round: Recycled played cards become the new deck
                        // "The deck continually shrinks" -> We only use what was played?
                        // "Every round discards some number of cards permanently from this same deck"
                        // If we recycle playedPile, that matches the logic (we dealt N, we gather N, next round uses N).
                        newState.currentDeck = [...newState.playedPile];
                        newState.playedPile = [];

                        playRound(newState, newState.deckSeed + newState.roundIndex);
                    }
                }
                break;

            case 'UPDATE_SETTINGS':
                const updateSettingsAction = action as { type: 'UPDATE_SETTINGS', settings: Partial<GameSettings> };
                newState.settings = { ...newState.settings, ...updateSettingsAction.settings };
                break;

            case 'TOGGLE_AWAY':
                const awayPlayer = newState.players.find((p: Player) => p.id === action.playerId);
                if (awayPlayer) awayPlayer.isAway = !awayPlayer.isAway;
                break;

            case 'RENAME_PLAYER':
                const renamePlayer = newState.players.find((p: Player) => p.id === action.playerId);
                if (renamePlayer) renamePlayer.name = action.newName;
                break;

            case 'END_GAME':
                newState.phase = 'finished';
                break;
        }

        setGameState(newState);

        // --- SYNCHRONIZATION ---

        // 1. P2P Broadcast (Always try)
        if (p2pRef.current) {
            p2pRef.current.send({ type: 'STATE_UPDATE', state: newState });
        }

        // 2. Server Persistence (Host Only)
        // Always save state to server to support polling clients and recovery
        if (isHost) {
            fetch(`/api/rooms/${roomCode}/sync`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newState)
            }).catch(e => console.error("State sync error:", e));
        }
    };

    // --- Host Bridge: Poll for actions from non-P2P clients ---
    useEffect(() => {
        if (!isHost || !roomCode) return;

        const bridgeInterval = setInterval(async () => {
            try {
                // Check for pending actions from polling clients
                const res = await fetch(`/api/rooms/${roomCode}/sync`, { method: 'DELETE' });
                if (res.ok) {
                    const data = await res.json();
                    if (data.actions && Array.isArray(data.actions) && data.actions.length > 0) {
                        console.log(`🌉 Bridge: Processing ${data.actions.length} actions from pollers`);
                        // Process actions sequentially
                        data.actions.forEach((item: any) => {
                            // Wrap in ensure-action sort of logic if needed, 
                            // but processAction handles it directly.
                            // We must be careful not to infinite loop if processAction triggers updates.
                            // processAction updates state ref and pushes new state. Correct.
                            processAction(item.action);
                        });
                    }
                }
            } catch (e) {
                console.error("Bridge poll error:", e);
            }
        }, 1000); // Check every second

        return () => clearInterval(bridgeInterval);
    }, [isHost, roomCode]);

    // Autoplay Effect (Host Only)
    useEffect(() => {
        if (!isHost || !gameState || !gameState.settings.autoPlayEnabled) return;

        const currentPlayer = gameState.players[gameState.currentLeaderSeatIndex];
        if (!currentPlayer || !currentPlayer.isAway) return;

        const timer = setTimeout(() => {
            if (gameState.phase === 'betting') {
                let bet = 0;
                const currentBets = gameState.players
                    .filter(p => p.currentBet !== null)
                    .map(p => p.currentBet as number);

                if (!canBet(bet, currentBets, gameState.players.length, gameState.cardsPerPlayer)) {
                    bet = 1;
                }
                processAction({ type: 'BET', playerId: currentPlayer.id, bet });
            } else if (gameState.phase === 'playing') {
                try {
                    const card = getAutoPlayCard(currentPlayer.hand, gameState.currentTrick, gameState.trump);
                    processAction({ type: 'PLAY_CARD', playerId: currentPlayer.id, card });
                } catch (e) {
                    console.error("Autoplay error", e);
                }
            }
        }, 2000);

        return () => clearTimeout(timer);
    }, [gameState, isHost]);


    // UI Rendering
    if (connectionStatus === 'error') return (
        <div className="min-h-screen flex items-center justify-center text-white bg-gradient-to-br from-slate-900 to-black p-4">
            <div className="text-center max-w-md">
                <div className="text-red-500 text-5xl mb-4">⚠️</div>
                <h2 className="text-2xl font-bold mb-2">Connection Error</h2>
                <p className="text-slate-400 mb-6">{errorMessage}</p>
                <button
                    onClick={() => window.location.reload()}
                    className="px-6 py-3 bg-white/10 hover:bg-white/20 rounded-full font-bold transition-colors flex items-center gap-2 mx-auto"
                >
                    <RefreshCw className="w-5 h-5" /> Try Again
                </button>
            </div>
        </div>
    );

    if (!gameState) return (
        <div className="min-h-screen flex items-center justify-center text-white bg-gradient-to-br from-slate-900 to-black">
            <div className="text-center">
                <div className="animate-spin w-12 h-12 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
                <h2 className="text-xl font-bold">Connecting to Room...</h2>
                <p className="text-slate-400 mt-2">Code: {roomCode}</p>
                <p className="text-xs text-slate-600 mt-4">
                    {usePollingRef.current ? 'Using reliable polling mode...' : 'Establishing P2P connection...'}
                </p>
            </div>
        </div>
    );

    const me = gameState.players.find(p => p.id === myId);
    const isMyTurn = (gameState.phase === 'playing' || gameState.phase === 'betting') &&
        gameState.players[gameState.currentLeaderSeatIndex]?.id === myId;

    // Calculate forbidden bet
    let forbiddenBet = -1;
    if (gameState.phase === 'betting' && isMyTurn) {
        const betsPlaced = gameState.players.filter(p => p.currentBet !== null).length;
        if (betsPlaced === gameState.players.length - 1) {
            const currentSum = gameState.players.reduce((sum, p) => sum + (p.currentBet || 0), 0);
            forbiddenBet = gameState.cardsPerPlayer - currentSum;
        }
    }

    return (
        <div className="min-h-screen text-foreground overflow-hidden flex flex-col bg-[url('/bg-texture.png')] bg-cover">
            <Head><title>Room {roomCode}</title></Head>

            {/* HUD */}
            {gameState && gameState.phase !== 'lobby' && gameState.phase !== 'finished' && (
                <GameHUD
                    players={gameState.players}
                    currentRound={gameState.roundIndex + 1}
                    trump={gameState.trump}
                    dealerName={gameState.players[gameState.dealerSeatIndex]?.name}
                />
            )}

            {/* Top Bar */}
            <header className="p-4 flex justify-between items-center bg-black/20 backdrop-blur-sm z-20">
                <div className="flex items-center gap-4">
                    <button onClick={() => router.push('/')} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                        <Menu className="w-6 h-6 text-white" />
                    </button>
                    <div>
                        <h1 className="text-xl font-bold text-white leading-none">Room {roomCode}</h1>
                        <div className="text-xs text-slate-400 flex items-center gap-1">
                            <span className={clsx("w-2 h-2 rounded-full", connectionStatus === 'connected' ? "bg-green-500" : "bg-red-500")}></span>
                            {connectionStatus === 'connected' ? 'Connected' : 'Connecting...'}
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {me?.isHost && (
                        <>
                            <button
                                onClick={() => setShowSettings(true)}
                                className="p-2 hover:bg-white/10 rounded-full transition-colors"
                                title="Settings"
                            >
                                <SettingsIcon className="w-5 h-5 text-slate-300" />
                            </button>
                            <button
                                onClick={() => sendAction({ type: 'END_GAME' })}
                                className="px-3 py-1 bg-red-500/20 hover:bg-red-500/30 text-red-300 text-xs font-bold rounded-full border border-red-500/30 transition-colors"
                            >
                                End Game
                            </button>
                        </>
                    )}
                    <button
                        onClick={() => {
                            navigator.clipboard.writeText(window.location.href);
                        }}
                        className="p-2 hover:bg-white/10 rounded-full transition-colors"
                        title="Copy Link"
                    >
                        <Copy className="w-5 h-5 text-slate-300" />
                    </button>
                </div>
            </header>

            {/* Game Area */}
            <main className="flex-grow relative flex flex-col md:flex-row items-center justify-center p-4 overflow-hidden">

                {/* Opponents (Mobile: Top Row, Desktop: Around Table) */}
                <div className="md:hidden w-full flex space-x-4 overflow-x-auto pb-4 mb-4 no-scrollbar z-10">
                    {gameState.players.filter(p => p.id !== myId).map(player => (
                        <div key={player.id} className="flex-shrink-0">
                            <PlayerSeat
                                player={player}
                                isDealer={player.seatIndex === gameState.dealerSeatIndex}
                                isCurrentTurn={player.seatIndex === gameState.currentLeaderSeatIndex}
                                isMe={false}
                                position="top"
                            />
                        </div>
                    ))}
                </div>

                {/* Table Surface */}
                <div className="relative w-full max-w-[90vw] md:max-w-3xl aspect-square md:aspect-video rounded-[3rem] glass border-2 border-white/5 shadow-2xl flex items-center justify-center overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-b from-slate-900/50 to-black/50"></div>

                    {/* Center Trick */}
                    <div className="relative z-10 w-48 h-48 md:w-64 md:h-64 flex items-center justify-center">
                        <AnimatePresence>
                            {gameState.currentTrick.map((played, i) => (
                                <motion.div
                                    key={`${played.seatIndex}-${played.card.id}`}
                                    initial={{ scale: 0.5, opacity: 0, y: 50 }}
                                    animate={{
                                        scale: 1,
                                        opacity: 1,
                                        y: 0,
                                        rotate: (i - (gameState.currentTrick.length - 1) / 2) * 10
                                    }}
                                    exit={{ scale: 0.5, opacity: 0 }}
                                    className="absolute shadow-xl"
                                    style={{ zIndex: i }}
                                >
                                    <CardComponent card={played.card} size="md" />
                                    <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-xs font-bold bg-black/50 px-2 rounded-full whitespace-nowrap">
                                        {gameState.players.find(p => p.seatIndex === played.seatIndex)?.name}
                                    </div>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </div>

                    {/* Desktop Seats */}
                    <div className="hidden md:block absolute inset-0 pointer-events-none">
                        {gameState.players.map((player, i) => {
                            // Simple circular layout for desktop
                            // We need to rotate based on My Seat so I am always at bottom
                            const mySeat = gameState.players.findIndex(p => p.id === myId);
                            const relativeIndex = (i - mySeat + gameState.players.length) % gameState.players.length;

                            if (relativeIndex === 0) return null; // My seat is handled separately

                            const angle = ((relativeIndex / gameState.players.length) * 2 * Math.PI) + (Math.PI / 2); // Start from bottom
                            const radiusX = 40; // %
                            const radiusY = 35; // %
                            const x = 50 + radiusX * Math.cos(angle);
                            const y = 50 + radiusY * Math.sin(angle);

                            return (
                                <div key={player.id} className="absolute transform -translate-x-1/2 -translate-y-1/2" style={{ left: `${x}%`, top: `${y}%` }}>
                                    <PlayerSeat
                                        player={player}
                                        isDealer={player.seatIndex === gameState.dealerSeatIndex}
                                        isCurrentTurn={player.seatIndex === gameState.currentLeaderSeatIndex}
                                        isMe={false}
                                        position="top"
                                    />
                                </div>
                            );
                        })}
                    </div>
                </div>
            </main>

            {/* My Hand & Status */}
            <footer className="relative z-20 pb-safe">
                {me && (
                    <div className="flex flex-col items-center">
                        <div className="mb-2">
                            <PlayerSeat
                                player={me}
                                isDealer={me.seatIndex === gameState.dealerSeatIndex}
                                isCurrentTurn={me.seatIndex === gameState.currentLeaderSeatIndex}
                                isMe={true}
                                position="bottom"
                            />
                        </div>

                        <div className="w-full max-w-4xl px-4 overflow-x-auto no-scrollbar pb-4">
                            <Hand
                                cards={me.hand}
                                onPlayCard={(card) => sendAction({ type: 'PLAY_CARD', playerId: myId, card })}
                                playableCards={me.hand} // Todo: Filter
                                myTurn={isMyTurn}
                            />
                        </div>
                    </div>
                )}
            </footer>

            {/* Modals */}
            <AnimatePresence>
                {gameState.phase === 'lobby' && me?.isHost && (
                    <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center z-50 p-4"
                    >
                        <div className="glass-panel p-8 w-full max-w-md text-center">
                            <Users className="w-16 h-16 text-primary mx-auto mb-4" />
                            <h2 className="text-3xl font-bold mb-2 text-white">Lobby</h2>
                            <p className="text-slate-400 mb-8">Share code <span className="text-white font-mono font-bold">{roomCode}</span></p>

                            <div className="space-y-2 mb-8">
                                {gameState.players.map(p => (
                                    <div key={p.id} className="flex items-center justify-between bg-white/5 p-3 rounded-xl">
                                        <span className="font-bold">{p.name}</span>
                                        {p.isHost && <Crown className="w-4 h-4 text-yellow-500" />}
                                    </div>
                                ))}
                            </div>

                            <button
                                onClick={() => setShowSetup(true)}
                                className="w-full py-4 bg-primary text-white font-bold rounded-2xl text-xl shadow-lg shadow-primary/30 hover:shadow-primary/50 transition-all"
                            >
                                Start Game
                            </button>
                        </div>
                    </motion.div>
                )}

                {/* Setup Modal */}
                <GameSetupModal
                    isOpen={showSetup}
                    onClose={() => setShowSetup(false)}
                    onStartGame={(numCards) => {
                        sendAction({
                            type: 'START_GAME',
                            payload: { initialCardsPerPlayer: numCards }
                        });
                        setShowSetup(false);
                    }}
                    playerCount={gameState.players.length}
                />

                {gameState.phase === 'lobby' && !me?.isHost && (
                    <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center z-50"
                    >
                        <div className="text-center">
                            <div className="animate-pulse text-primary text-6xl mb-4">...</div>
                            <div className="text-white text-2xl font-bold">Waiting for host...</div>
                            <div className="text-slate-400 mt-2">{gameState.players.length} players ready</div>
                        </div>
                    </motion.div>
                )}

                {gameState.phase === 'betting' && isMyTurn && (
                    <BetInput
                        maxBet={gameState.cardsPerPlayer}
                        forbiddenBet={forbiddenBet}
                        onPlaceBet={(bet) => sendAction({ type: 'BET', playerId: myId, bet })}
                    />
                )}

                {gameState.phase === 'finished' && (
                    <Leaderboard
                        players={gameState.players}
                        scores={gameState.players.reduce((acc, p) => ({ ...acc, [p.id]: p.totalPoints }), {})}
                        onPlayAgain={() => sendAction({ type: 'START_GAME' })}
                        isHost={!!me?.isHost}
                    />
                )}

                {/* Host Settings Modal */}
                {showSettings && gameState.settings && (
                    <HostSettings
                        isOpen={showSettings}
                        onClose={() => setShowSettings(false)}
                        currentSettings={gameState.settings}
                        onSave={(newSettings) => {
                            sendAction({ type: 'UPDATE_SETTINGS', settings: newSettings });
                            setShowSettings(false);
                        }}
                    />
                )}
            </AnimatePresence>
        </div>
    );
}
