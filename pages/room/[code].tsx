import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { v4 as uuidv4 } from 'uuid';
import { PeerManager } from '../../lib/webrtc';
import { GameState, Player, Card, GameAction, Suit, GameSettings } from '../../lib/types';
import { createDeck, shuffleDeck, dealCards } from '../../lib/deck';
import { getTrickWinner, isValidPlay, calculateScores, canBet, getAutoPlayCard } from '../../lib/gameEngine';
import PlayerSeat from '../../components/PlayerSeat';
import Hand from '../../components/Hand';
import CardComponent from '../../components/Card';
import BetInput from '../../components/BetInput';
import Leaderboard from '../../components/Leaderboard';
import DealerButton from '../../components/DealerButton';
import GameHUD from '../../components/GameHUD';
import HostSettings from '../../components/HostSettings';
import { Copy, Share2, MessageCircle, Menu, Users, Crown, Settings as SettingsIcon, UserX, UserCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import clsx from 'clsx';

export default function Room() {
    const router = useRouter();
    const { code } = router.query;
    const roomCode = Array.isArray(code) ? code[0] : code;

    const [myId, setMyId] = useState<string>('');
    const [myName, setMyName] = useState<string>('');
    const [gameState, setGameState] = useState<GameState | null>(null);
    const [peerManager, setPeerManager] = useState<PeerManager | null>(null);
    const [isHost, setIsHost] = useState(false);
    const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');
    const [showMobileMenu, setShowMobileMenu] = useState(false);
    const [showSettings, setShowSettings] = useState(false);

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

        const myPeerId = isCreator ? `judgment-${roomCode}-host` : `judgment-${roomCode}-${storedId}`;
        const hostPeerId = `judgment-${roomCode}-host`;

        const manager = new PeerManager(
            myPeerId,
            handleMessage,
            handlePeerConnect,
            handlePeerDisconnect
        );

        manager.start().then(() => {
            setConnectionStatus('connected');
            if (!isCreator) {
                // Connect to Host
                manager.connectTo(hostPeerId);
                // Send JOIN request
                setTimeout(() => {
                    manager.sendTo(hostPeerId, {
                        type: 'ACTION',
                        action: {
                            type: 'JOIN',
                            playerId: storedId,
                            payload: { name: storedName }
                        }
                    });
                }, 1000); // Wait for connection
            } else {
                // I am Host, initialize state
                initializeGame(storedId, storedName);
            }
        });

        setPeerManager(manager);

        return () => {
            manager.destroy();
        };
    }, [roomCode, router.query.host]);

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
            }
        };
        setGameState(newState);
    };

    const handleMessage = useCallback((senderId: string, payload: any) => {
        if (payload.type === 'STATE_UPDATE') {
            setGameState(payload.state);
        } else if (payload.type === 'ACTION') {
            // Only Host processes actions
            if (isHost) {
                processAction(payload.action);
            }
        }
    }, [isHost, gameState]); // Dependencies need to be careful here. 
    // If processAction depends on gameState, we need it.
    // But handleMessage is passed to PeerManager once. 
    // We might need a ref for current gameState to avoid stale closures if PeerManager doesn't update callback.
    // PeerManager stores the callback. If we re-instantiate PeerManager, it's fine.
    // But we don't. So we need a Ref for gameState.

    const gameStateRef = useRef<GameState | null>(null);
    useEffect(() => { gameStateRef.current = gameState; }, [gameState]);

    const handlePeerConnect = (peerId: string) => {
        console.log('Peer connected:', peerId);
        if (isHost && gameStateRef.current) {
            // Send state to new peer
            peerManager?.sendTo(peerId, { type: 'STATE_UPDATE', state: gameStateRef.current });
        }
    };

    const handlePeerDisconnect = (peerId: string) => {
        console.log('Peer disconnected:', peerId);
        // If Host, mark player disconnected?
        // We can parse playerId from peerId `judgment-ROOM-PLAYERID`
        // But better to just let them reconnect.
    };

    const sendAction = (action: GameAction) => {
        if (isHost) {
            processAction(action);
        } else {
            const hostPeerId = `judgment-${roomCode}-host`;
            peerManager?.sendTo(hostPeerId, { type: 'ACTION', action });
        }
    };

    // Autoplay Effect (Host Only)
    useEffect(() => {
        if (!isHost || !gameState || !gameState.settings.autoPlayEnabled) return;

        const currentPlayer = gameState.players[gameState.currentLeaderSeatIndex];
        if (!currentPlayer || !currentPlayer.isAway) return;

        const timer = setTimeout(() => {
            if (gameState.phase === 'betting') {
                // Auto Bet
                // Simple strategy: Bet 0 unless forbidden, then 1.
                let bet = 0;
                const currentBets = gameState.players
                    .filter(p => p.currentBet !== null)
                    .map(p => p.currentBet as number);

                if (!canBet(bet, currentBets, gameState.players.length, gameState.cardsPerPlayer)) {
                    bet = 1;
                }
                processAction({ type: 'BET', playerId: currentPlayer.id, bet });
            } else if (gameState.phase === 'playing') {
                // Auto Play Card
                try {
                    const card = getAutoPlayCard(currentPlayer.hand, gameState.currentTrick, gameState.trump);
                    processAction({ type: 'PLAY_CARD', playerId: currentPlayer.id, card });
                } catch (e) {
                    console.error("Autoplay error", e);
                }
            }
        }, 2000); // 2 second delay for realism

        return () => clearTimeout(timer);
    }, [gameState, isHost]);

    const startRound = (state: GameState) => {
        const numPlayers = state.players.length;
        // Cap at 13 cards max, even if fewer players
        const maxCards = Math.min(Math.floor(52 / numPlayers), 13);
        state.cardsPerPlayer = maxCards - state.roundIndex;

        if (state.cardsPerPlayer <= 0) {
            state.phase = 'finished';
            return;
        }

        const { hands } = dealCards(numPlayers, {
            seed: state.deckSeed + state.roundIndex, // Change seed per round
            discardStrategy: state.settings.discardStrategy,
            cardsPerPlayer: state.cardsPerPlayer
        });

        state.players.forEach((p, i) => {
            p.hand = hands[i];
            p.currentBet = null;
            p.tricksWon = 0;
        });

        state.trump = ['spades', 'hearts', 'diamonds', 'clubs'][state.roundIndex % 4] as Suit;
        state.dealerSeatIndex = state.roundIndex % numPlayers;
        state.currentLeaderSeatIndex = (state.dealerSeatIndex + 1) % numPlayers; // First to bet is left of dealer
        state.phase = 'betting';
        state.currentTrick = [];
    };

    const processAction = (action: GameAction) => {
        const currentState = gameStateRef.current;
        if (!currentState) return;

        let newState: GameState = JSON.parse(JSON.stringify(currentState)); // Deep copy

        switch (action.type) {
            case 'JOIN':
                // Cast to any to handle custom JOIN action
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
                setGameState(newState);
                peerManager?.broadcast({ type: 'STATE_UPDATE', state: newState });
                break;

            case 'START_GAME':
                if (newState.phase !== 'lobby' && newState.phase !== 'finished') return;
                newState.roundIndex = 0;
                newState.scoresHistory = [];
                newState.players.forEach((p: Player) => { p.totalPoints = 0; p.tricksWon = 0; p.currentBet = null; });
                startRound(newState);
                setGameState(newState);
                peerManager?.broadcast({ type: 'STATE_UPDATE', state: newState });
                break;

            case 'BET':
                const betterIndex = newState.players.findIndex((p: Player) => p.id === action.playerId);
                if (betterIndex === -1) return;
                const playerIndex = newState.players.findIndex(p => p.id === action.playerId);
                if (playerIndex === -1) return;

                // Validate bet
                if (!canBet(action.bet, newState.players.map(p => p.currentBet || 0).slice(0, playerIndex), newState.players.length, newState.cardsPerPlayer)) {
                    return; // Invalid bet
                }

                newState.players[playerIndex].currentBet = action.bet;

                // Move turn
                newState.currentLeaderSeatIndex = (newState.currentLeaderSeatIndex + 1) % newState.players.length;

                // Check if all bets placed
                const allBetsPlaced = newState.players.every(p => p.currentBet !== null);
                if (allBetsPlaced) {
                    newState.phase = 'playing';
                    // Leader is left of dealer
                    newState.currentLeaderSeatIndex = (newState.dealerSeatIndex + 1) % newState.players.length;
                }

                setGameState(newState);
                peerManager?.broadcast({ type: 'STATE_UPDATE', state: newState });
                break;

            case 'PLAY_CARD':
                const pIndex = newState.players.findIndex(p => p.id === action.playerId);
                if (pIndex === -1) return;

                const player = newState.players[pIndex];
                const card = action.card;

                // Validate play
                if (!isValidPlay(card, player.hand, newState.currentTrick, newState.trump)) {
                    return; // Invalid play
                }

                // Remove card from hand
                player.hand = player.hand.filter(c => !(c.suit === card.suit && c.rank === card.rank));

                // Add to trick
                newState.currentTrick.push({ seatIndex: pIndex, card: card });

                // Move turn
                newState.currentLeaderSeatIndex = (newState.currentLeaderSeatIndex + 1) % newState.players.length;

                // Check if trick complete
                if (newState.currentTrick.length === newState.players.length) {
                    // Determine winner
                    const winnerSeatIndex = getTrickWinner(newState.currentTrick, newState.trump);

                    // Update tricks won
                    newState.players[winnerSeatIndex].tricksWon = (newState.players[winnerSeatIndex].tricksWon || 0) + 1;

                    newState.currentTrick = [];
                    newState.currentLeaderSeatIndex = winnerSeatIndex;

                    // Check if round complete (hands empty)
                    if (newState.players[0].hand.length === 0) {
                        // Calculate scores
                        const roundScores = calculateScores(newState.players);
                        newState.players.forEach(p => {
                            p.totalPoints = (p.totalPoints || 0) + (roundScores[p.id] || 0);
                        });

                        // Next round logic
                        newState.roundIndex++;
                        startRound(newState);
                    }
                }
                setGameState(newState);
                peerManager?.broadcast({ type: 'STATE_UPDATE', state: newState });
                break;

            case 'UPDATE_SETTINGS':
                const updateSettingsAction = action as { type: 'UPDATE_SETTINGS', settings: Partial<GameSettings> };
                newState.settings = { ...newState.settings, ...updateSettingsAction.settings };
                setGameState(newState);
                peerManager?.broadcast({ type: 'STATE_UPDATE', state: newState });
                break;

            case 'TOGGLE_AWAY':
                const awayPlayer = newState.players.find((p: Player) => p.id === action.playerId);
                if (awayPlayer) {
                    awayPlayer.isAway = !awayPlayer.isAway;
                    setGameState(newState);
                    peerManager?.broadcast({ type: 'STATE_UPDATE', state: newState });
                }
                break;

            case 'RENAME_PLAYER':
                const renamePlayer = newState.players.find((p: Player) => p.id === action.playerId);
                if (renamePlayer) {
                    renamePlayer.name = action.newName;
                    setGameState(newState);
                    peerManager?.broadcast({ type: 'STATE_UPDATE', state: newState });
                }
                break;

            case 'END_GAME':
                newState.phase = 'finished';
                setGameState(newState);
                peerManager?.broadcast({ type: 'STATE_UPDATE', state: newState });
                break;
        }
    };


    // UI Rendering
    if (!gameState) return (
        <div className="min-h-screen flex items-center justify-center text-white bg-gradient-to-br from-slate-900 to-black">
            <div className="text-center">
                <div className="animate-spin w-12 h-12 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
                <h2 className="text-xl font-bold">Connecting to Room...</h2>
                <p className="text-slate-400 mt-2">Code: {roomCode}</p>
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
                            // Toast?
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
                                onClick={() => sendAction({ type: 'START_GAME' })}
                                className="w-full py-4 bg-primary text-white font-bold rounded-2xl text-xl shadow-lg shadow-primary/30 hover:shadow-primary/50 transition-all"
                            >
                                Start Game
                            </button>
                        </div>
                    </motion.div>
                )}

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
