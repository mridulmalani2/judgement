import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { v4 as uuidv4 } from 'uuid';
import { PeerManager } from '../../lib/webrtc';
import { GameState, Player, Card, GameAction, Suit, GameSettings } from '../../lib/types';
import { dealCards } from '../../lib/deck';
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
                processAction({ type: 'BET', playerId: currentPlayer.id, payload: { bet } });
            } else if (gameState.phase === 'playing') {
                // Auto Play Card
                try {
                    const card = getAutoPlayCard(currentPlayer.hand, gameState.currentTrick, gameState.trump);
                    processAction({ type: 'PLAY_CARD', playerId: currentPlayer.id, payload: { card } });
                } catch (e) {
                    console.error("Autoplay error", e);
                }
            }
        }, 2000); // 2 second delay for realism

        return () => clearTimeout(timer);
    }, [gameState, isHost]);

    const processAction = (action: GameAction) => {
        const currentState = gameStateRef.current;
        if (!currentState) return;

        let newState = JSON.parse(JSON.stringify(currentState)); // Deep copy

        switch (action.type) {
            case 'JOIN':
                if (newState.players.some((p: Player) => p.id === action.playerId)) {
                    const p = newState.players.find((p: Player) => p.id === action.playerId);
                    if (p) p.connected = true;
                } else {
                    const newPlayer: Player = {
                        id: action.playerId,
                        name: action.payload.name,
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

            case 'UPDATE_SETTINGS':
                if (newState.phase === 'lobby') {
                    newState.settings = action.payload;
                }
                break;

            case 'TOGGLE_AWAY':
                const awayPlayer = newState.players.find((p: Player) => p.id === action.playerId);
                if (awayPlayer) {
                    awayPlayer.isAway = !awayPlayer.isAway;
                }
                break;

            case 'RENAME_PLAYER':
                const renamePlayer = newState.players.find((p: Player) => p.id === action.playerId);
                if (renamePlayer) {
                    renamePlayer.name = action.payload.name;
                }
                break;

            case 'START_GAME':
                if (newState.phase !== 'lobby' && newState.phase !== 'finished') return;
                newState.roundIndex = 0;
                newState.scoresHistory = [];
                newState.players.forEach((p: Player) => { p.totalPoints = 0; p.tricksWon = 0; p.currentBet = null; });
                startRound(newState);
                break;

            case 'BET':
                const betterIndex = newState.players.findIndex((p: Player) => p.id === action.playerId);
                if (betterIndex === -1) return;
                const better = newState.players[betterIndex];

                if (newState.currentLeaderSeatIndex !== better.seatIndex) return;

                // Server-side validation
                const currentBets = newState.players
                    .filter((p: Player) => p.currentBet !== null)
                    .map((p: Player) => p.currentBet as number);

                if (!canBet(action.payload.bet, currentBets, newState.players.length, newState.cardsPerPlayer)) return;

                better.currentBet = action.payload.bet;

                const allBet = newState.players.every((p: Player) => p.currentBet !== null);
                if (allBet) {
                    newState.phase = 'playing';
                    newState.currentLeaderSeatIndex = (newState.dealerSeatIndex + 1) % newState.players.length;
                } else {
                    newState.currentLeaderSeatIndex = (newState.currentLeaderSeatIndex + 1) % newState.players.length;
                }
                break;

            case 'PLAY_CARD':
                const pIndex = newState.players.findIndex((p: Player) => p.id === action.playerId);
                if (pIndex === -1) return;
                const p = newState.players[pIndex];

                if (newState.currentLeaderSeatIndex !== p.seatIndex) return;

                const card = action.payload.card;
                const handIndex = p.hand.findIndex((c: Card) => c.id === card.id);
                if (handIndex === -1) return;

                if (!isValidPlay(card, p.hand, newState.currentTrick, newState.trump)) return;

                p.hand.splice(handIndex, 1);
                newState.currentTrick.push({ seatIndex: p.seatIndex, card });

                if (newState.currentTrick.length === newState.players.length) {
                    const winnerSeat = getTrickWinner(newState.currentTrick, newState.trump);
                    const winner = newState.players.find((pl: Player) => pl.seatIndex === winnerSeat);
                    if (winner) {
                        winner.tricksWon++;
                        newState.currentLeaderSeatIndex = winnerSeat;
                    }

                    // Delay clearing trick? 
                    // We can add a timestamp to trick to let clients know when it finished.
                    // For now, immediate clear.
                    newState.currentTrick = [];

                    if (newState.players[0].hand.length === 0) {
                        const scores = calculateScores(newState.players);
                        newState.players.forEach((pl: Player) => {
                            pl.totalPoints += scores[pl.id];
                        });
                        newState.roundIndex++;
                        startRound(newState);
                    }
                } else {
                    newState.currentLeaderSeatIndex = (newState.currentLeaderSeatIndex + 1) % newState.players.length;
                }
                break;
        }

        setGameState(newState);
        peerManager?.broadcast({ type: 'STATE_UPDATE', state: newState });
    };

    const startRound = (state: GameState) => {
        const numPlayers = state.players.length;
        // Cap at 13 cards max, even if fewer players
        const maxCards = Math.min(Math.floor(52 / numPlayers), 13);
        state.cardsPerPlayer = maxCards - state.roundIndex;

        if (state.cardsPerPlayer <= 0) { // Should be 1 -> 0? Or 1 -> End?
            // User said: "When rounds decrease (10 cards -> 9 -> 8...), do we continue all the way down to 1 card per player and then stop?" -> "yes"
            // So if cardsPerPlayer is 0, we stop.
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
            <header className="glass p-4 flex justify-between items-center z-20 relative">
                <div className="flex items-center space-x-4">
                    <div className="flex flex-col">
                        <h1 className="text-lg font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">
                            Room {roomCode}
                        </h1>
                        <span className="text-xs text-slate-400">
                            {gameState.phase === 'lobby' ? 'Lobby' : `Round ${gameState.roundIndex + 1}`}
                        </span>
                    </div>
                    <button
                        onClick={() => navigator.clipboard.writeText(window.location.href)}
                        className="p-2 bg-white/5 rounded-full hover:bg-white/10 transition-colors"
                    >
                        <Share2 className="w-4 h-4 text-white" />
                    </button>
                    {isHost && (
                        <button
                            onClick={() => setShowSettings(true)}
                            className="p-2 bg-white/5 rounded-full hover:bg-white/10 transition-colors"
                            title="Host Settings"
                        >
                            <SettingsIcon className="w-4 h-4 text-white" />
                        </button>
                    )}
                </div>

                {gameState.phase !== 'lobby' && (
                    <div className="flex items-center space-x-2 bg-black/30 px-3 py-1 rounded-full border border-white/10">
                        <span className="text-xs text-slate-300 uppercase tracking-wider">Trump</span>
                        <span className="font-bold text-primary capitalize">{gameState.trump}</span>
                    </div>
                )}

                <div className="flex items-center space-x-2">
                    {me && (
                        <button
                            onClick={() => sendAction({ type: 'TOGGLE_AWAY', playerId: myId })}
                            className={clsx(
                                "p-2 rounded-full transition-colors",
                                me.isAway ? "bg-red-500/20 text-red-400" : "bg-white/5 text-slate-400 hover:bg-white/10"
                            )}
                            title={me.isAway ? "I'm Away" : "Mark as Away"}
                        >
                            {me.isAway ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                        </button>
                    )}
                    <button onClick={() => setShowMobileMenu(!showMobileMenu)} className="md:hidden p-2">
                        <Menu className="w-6 h-6" />
                    </button>
                </div>
            </header>

            {/* HUD */}
            {gameState.phase !== 'lobby' && gameState.phase !== 'finished' && (
                <GameHUD players={gameState.players} currentRound={gameState.roundIndex} />
            )}

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
                        {/* My Seat Info (Mobile Only - Desktop has it in circle? No, desktop usually puts "Me" at bottom) */}
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
                                onPlayCard={(card) => sendAction({ type: 'PLAY_CARD', playerId: myId, payload: { card } })}
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
                                onClick={() => sendAction({ type: 'START_GAME', playerId: myId })}
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
                        onPlaceBet={(bet) => sendAction({ type: 'BET', playerId: myId, payload: { bet } })}
                    />
                )}

                {gameState.phase === 'finished' && (
                    <Leaderboard
                        players={gameState.players}
                        onPlayAgain={() => sendAction({ type: 'START_GAME', playerId: myId })}
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
                            sendAction({ type: 'UPDATE_SETTINGS', playerId: myId, payload: newSettings });
                            setShowSettings(false);
                        }}
                    />
                )}
            </AnimatePresence>
        </div>
    );
}
