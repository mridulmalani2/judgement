/**
 * Simplified Multiplayer Game Page
 *
 * Single game mode - host authenticates with password, others join as players.
 * Works reliably across all networks (corporate, educational, etc.)
 */

import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { v4 as uuidv4 } from 'uuid';
import { GameState, Player, Card, GameAction, Suit, GameSettings } from '../lib/types';
import { processGameAction } from '../lib/gameLogic';
import { getTrickWinner, isValidPlay, calculateScores, canBet, getAutoPlayCard } from '../lib/gameEngine';
import PlayerSeat from '../components/PlayerSeat';
import Hand from '../components/Hand';
import CardComponent from '../components/Card';
import BetInput from '../components/BetInput';
import Leaderboard from '../components/Leaderboard';
import GameHUD from '../components/GameHUD';
import HostSettings from '../components/HostSettings';
import GameSetupModal from '../components/GameSetupModal';
import ScoreHistory from '../components/ScoreHistory';
import BettingPanel from '../components/BettingPanel';
import { Copy, Menu, Users, Crown, Settings as SettingsIcon, RefreshCw, Wifi, WifiOff, Key, UserPlus } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import clsx from 'clsx';
import '../lib/i18n';
import { useTranslation } from 'react-i18next';

const POLL_INTERVAL = 500; // 500ms for responsive updates

export default function Play() {
    const router = useRouter();
    const { t } = useTranslation('common');

    // Player identity
    const [myId, setMyId] = useState<string>('');
    const [myName, setMyName] = useState<string>('');
    const [nameInput, setNameInput] = useState<string>('');
    const [needsName, setNeedsName] = useState(false);

    // Host authentication
    const [showHostAuth, setShowHostAuth] = useState(true);
    const [hostKeyInput, setHostKeyInput] = useState('');
    const [authError, setAuthError] = useState('');
    const [isVerifying, setIsVerifying] = useState(false);
    const [roleDecided, setRoleDecided] = useState(false);

    // Game state
    const [gameState, setGameState] = useState<GameState | null>(null);
    const [isHost, setIsHost] = useState(false);
    const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'error'>('connecting');
    const [errorMessage, setErrorMessage] = useState<string>('');

    // UI state
    const [showSettings, setShowSettings] = useState(false);
    const [showSetup, setShowSetup] = useState(false);

    // Refs for callbacks
    const gameStateRef = useRef<GameState | null>(null);
    const pollingRef = useRef<NodeJS.Timeout | null>(null);
    const isHostRef = useRef(false);
    const myIdRef = useRef<string>('');

    // Sync refs with state
    useEffect(() => { gameStateRef.current = gameState; }, [gameState]);
    useEffect(() => { isHostRef.current = isHost; }, [isHost]);
    useEffect(() => { myIdRef.current = myId; }, [myId]);

    // Initialize player ID on mount
    useEffect(() => {
        const storedId = localStorage.getItem('judgment_id') || uuidv4();
        if (!localStorage.getItem('judgment_id')) {
            localStorage.setItem('judgment_id', storedId);
        }
        setMyId(storedId);
        myIdRef.current = storedId;

        // Load stored name for pre-filling
        const storedName = localStorage.getItem('judgment_name');
        if (storedName) {
            setNameInput(storedName);
        }

        return () => {
            if (pollingRef.current) {
                clearInterval(pollingRef.current);
            }
        };
    }, []);

    // Verify host password
    const verifyHostKey = async () => {
        if (!hostKeyInput.trim()) {
            setAuthError('Please enter the host key');
            return;
        }

        setIsVerifying(true);
        setAuthError('');

        try {
            const res = await fetch('/api/verify-host', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password: hostKeyInput })
            });

            const data = await res.json();

            if (data.valid) {
                setIsHost(true);
                isHostRef.current = true;
                setShowHostAuth(false);
                setRoleDecided(true);
                proceedAfterAuth(true);
            } else {
                setAuthError('Invalid host key. Try again or continue as player.');
            }
        } catch (error) {
            console.error('Host verification error:', error);
            setAuthError('Failed to verify. Please try again.');
        } finally {
            setIsVerifying(false);
        }
    };

    // Continue as player (not host)
    const continueAsPlayer = () => {
        setIsHost(false);
        isHostRef.current = false;
        setShowHostAuth(false);
        setRoleDecided(true);
        proceedAfterAuth(false);
    };

    // After role is decided, check if name is needed
    const proceedAfterAuth = (asHost: boolean) => {
        const storedName = localStorage.getItem('judgment_name');
        if (storedName) {
            setMyName(storedName);
            initializeConnection(myIdRef.current, storedName, asHost);
        } else {
            setNeedsName(true);
        }
    };

    const initializeConnection = async (playerId: string, playerName: string, asHost: boolean) => {
        setConnectionStatus('connecting');

        try {
            // Check if game exists
            const res = await fetch('/api/game/state');

            if (res.ok) {
                // Game exists
                const existingState = await res.json();

                // Check if I'm already in the game
                const meInState = existingState.players.find((p: Player) => p.id === playerId);

                if (asHost) {
                    // User authenticated as host
                    if (meInState) {
                        // I'm already in the game - make sure I'm marked as host
                        if (!meInState.isHost) {
                            // Transfer host status to me
                            const updatedPlayers = existingState.players.map((p: Player) => ({
                                ...p,
                                isHost: p.id === playerId
                            }));
                            const updatedState = { ...existingState, players: updatedPlayers, lastUpdate: Date.now() };
                            await fetch('/api/game/state', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify(updatedState)
                            });
                            setGameState(updatedState);
                            gameStateRef.current = updatedState;
                        } else {
                            setGameState(existingState);
                            gameStateRef.current = existingState;
                        }
                    } else {
                        // Not in game - join as host
                        // First, update existing players to not be host
                        const updatedPlayers = existingState.players.map((p: Player) => ({
                            ...p,
                            isHost: false
                        }));
                        const newPlayer: Player = {
                            id: playerId,
                            name: playerName,
                            seatIndex: existingState.players.length,
                            isHost: true,
                            connected: true,
                            isAway: false,
                            currentBet: null,
                            tricksWon: 0,
                            totalPoints: 0,
                            hand: []
                        };
                        const updatedState = {
                            ...existingState,
                            players: [...updatedPlayers, newPlayer],
                            lastUpdate: Date.now()
                        };
                        await fetch('/api/game/state', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(updatedState)
                        });
                        setGameState(updatedState);
                        gameStateRef.current = updatedState;
                    }
                    setIsHost(true);
                    isHostRef.current = true;
                } else {
                    // User is joining as player (not host)
                    setGameState(existingState);
                    gameStateRef.current = existingState;

                    // If I'm already in the game with host status from before, remove it
                    if (meInState?.isHost) {
                        const updatedPlayers = existingState.players.map((p: Player) => ({
                            ...p,
                            isHost: p.id === playerId ? false : p.isHost
                        }));
                        const updatedState = { ...existingState, players: updatedPlayers, lastUpdate: Date.now() };
                        await fetch('/api/game/state', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(updatedState)
                        });
                        setGameState(updatedState);
                        gameStateRef.current = updatedState;
                    } else if (!meInState) {
                        // Not in game yet - send join action
                        await sendJoinAction(playerId, playerName);
                    }
                }

                setConnectionStatus('connected');
                startPolling(playerId);
            } else if (res.status === 404) {
                // No game exists
                if (asHost) {
                    // Create new game as host
                    await createNewGame(playerId, playerName);
                    setConnectionStatus('connected');
                    startPolling(playerId);
                } else {
                    // No game and user is not host - show error
                    setErrorMessage('No active game. Please wait for the host to start a game.');
                    setConnectionStatus('error');
                }
            } else {
                throw new Error('Failed to connect to game server');
            }
        } catch (error) {
            console.error('Connection error:', error);
            setErrorMessage('Failed to connect. Please check your internet connection.');
            setConnectionStatus('error');
        }
    };

    const createNewGame = async (hostId: string, hostName: string) => {
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
            roomCode: 'default',
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

        gameStateRef.current = newState;
        setGameState(newState);

        // Save to server
        await fetch('/api/game/state', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newState)
        });
    };

    const sendJoinAction = async (playerId: string, playerName: string) => {
        await fetch('/api/game/state', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: { type: 'JOIN', playerId, payload: { name: playerName } },
                playerId
            })
        });
    };

    const startPolling = (playerId: string) => {
        if (pollingRef.current) {
            clearInterval(pollingRef.current);
        }

        const poll = async () => {
            try {
                // Get current state
                const stateRes = await fetch('/api/game/state');
                if (stateRes.ok) {
                    const state = await stateRes.json();

                    // Only update if state changed
                    if (!gameStateRef.current || state.lastUpdate !== gameStateRef.current.lastUpdate) {
                        gameStateRef.current = state;
                        setGameState(state);

                        // Update host status if it changed
                        const me = state.players.find((p: Player) => p.id === playerId);
                        if (me?.isHost && !isHostRef.current) {
                            setIsHost(true);
                            isHostRef.current = true;
                        }
                    }

                    setConnectionStatus('connected');
                } else if (stateRes.status === 404) {
                    // Game was cleared
                    if (gameStateRef.current) {
                        setGameState(null);
                        gameStateRef.current = null;
                        // Only recreate if I'm the host
                        if (isHostRef.current) {
                            await createNewGame(playerId, myName || 'Player');
                        } else {
                            // Show error for non-host players
                            setErrorMessage('Game ended. Please wait for the host to start a new game.');
                            setConnectionStatus('error');
                        }
                    }
                }

                // If I'm the host, process pending actions
                if (isHostRef.current) {
                    const actionsRes = await fetch('/api/game/state', { method: 'DELETE' });
                    if (actionsRes.ok) {
                        const { actions } = await actionsRes.json();
                        if (actions && actions.length > 0) {
                            actions.forEach((item: any) => {
                                processAction(item.action);
                            });
                        }
                    }
                }
            } catch (error) {
                console.error('Poll error:', error);
            }
        };

        // Poll immediately, then at interval
        poll();
        pollingRef.current = setInterval(poll, POLL_INTERVAL);
    };

    const sendAction = async (action: GameAction) => {
        if (isHostRef.current) {
            // Host processes directly
            processAction(action);
        } else {
            // Non-host sends to server queue
            await fetch('/api/game/state', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action, playerId: myIdRef.current })
            });
        }
    };

    const processAction = (action: GameAction) => {
        const currentState = gameStateRef.current;
        if (!currentState) return;

        try {
            const newState = processGameAction(currentState, action);
            gameStateRef.current = newState;
            setGameState(newState);

            // Save to server
            fetch('/api/game/state', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newState)
            }).catch(e => console.error('State sync error:', e));
        } catch (e) {
            console.warn('Action failed:', e);
        }
    };

    const handleNameSubmit = () => {
        if (!nameInput.trim()) return;
        const name = nameInput.trim();
        localStorage.setItem('judgment_name', name);
        setMyName(name);
        setNeedsName(false);
        initializeConnection(myId, name, isHost);
    };

    const resetGame = async () => {
        await fetch('/api/game/state?action=clear', { method: 'POST' });
        window.location.reload();
    };

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
                    console.error('Autoplay error', e);
                }
            }
        }, 2000);

        return () => clearTimeout(timer);
    }, [gameState, isHost]);

    // Host authentication screen
    if (showHostAuth && !roleDecided) {
        return (
            <div className="min-h-screen flex items-center justify-center text-white bg-gradient-to-br from-slate-900 to-black p-4">
                <Head><title>Join Game - Judgment</title></Head>
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="glass-panel p-8 w-full max-w-md text-center"
                >
                    <div className="mb-6">
                        <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Key className="w-8 h-8 text-white" />
                        </div>
                        <h1 className="text-3xl font-bold mb-2 text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-pink-400">
                            {t('game.welcomeToJudgment')}
                        </h1>
                        <p className="text-slate-400">{t('game.areYouHost')}</p>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <input
                                type="password"
                                placeholder={t('game.enterHostKey')}
                                value={hostKeyInput}
                                onChange={(e) => {
                                    setHostKeyInput(e.target.value);
                                    setAuthError('');
                                }}
                                onKeyPress={(e) => e.key === 'Enter' && verifyHostKey()}
                                className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all text-center text-lg"
                                autoFocus
                            />
                            {authError && (
                                <p className="text-red-400 text-sm mt-2">{authError}</p>
                            )}
                        </div>

                        <button
                            onClick={verifyHostKey}
                            disabled={isVerifying}
                            className="w-full py-3 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 disabled:opacity-50 text-white font-bold rounded-xl shadow-lg transition-all flex items-center justify-center gap-2"
                        >
                            {isVerifying ? (
                                <>
                                    <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full"></div>
                                    {t('game.verifying')}
                                </>
                            ) : (
                                <>
                                    <Crown className="w-5 h-5" />
                                    {t('game.enterAsHost')}
                                </>
                            )}
                        </button>

                        <div className="relative">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-white/10"></div>
                            </div>
                            <div className="relative flex justify-center text-sm">
                                <span className="px-4 bg-slate-900/50 text-slate-500">or</span>
                            </div>
                        </div>

                        <button
                            onClick={continueAsPlayer}
                            className="w-full py-3 bg-slate-700/50 hover:bg-slate-600/50 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2 border border-white/10"
                        >
                            <UserPlus className="w-5 h-5" />
                            {t('game.continueAsPlayer')}
                        </button>
                    </div>
                </motion.div>
            </div>
        );
    }

    // Name entry screen
    if (needsName) {
        return (
            <div className="min-h-screen flex items-center justify-center text-white bg-gradient-to-br from-slate-900 to-black p-4">
                <Head><title>Join Game - Judgment</title></Head>
                <div className="glass-panel p-8 w-full max-w-md text-center">
                    <h1 className="text-3xl font-bold mb-2 text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-pink-400">
                        {t('game.welcome')}
                    </h1>
                    <p className="text-slate-400 mb-6">{t('game.enterNameToJoin')}</p>

                    <input
                        type="text"
                        placeholder={t('game.yourName')}
                        value={nameInput}
                        onChange={(e) => setNameInput(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleNameSubmit()}
                        className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all text-center text-lg mb-4"
                        autoFocus
                    />

                    <button
                        onClick={handleNameSubmit}
                        disabled={!nameInput.trim()}
                        className="w-full py-3 bg-primary hover:bg-primary/90 disabled:bg-slate-700 disabled:cursor-not-allowed text-white font-bold rounded-xl shadow-lg transition-all"
                    >
                        {t('game.joinGame')}
                    </button>
                </div>
            </div>
        );
    }

    // Error screen
    if (connectionStatus === 'error') {
        return (
            <div className="min-h-screen flex items-center justify-center text-white bg-gradient-to-br from-slate-900 to-black p-4">
                <Head><title>Connection Error - Judgment</title></Head>
                <div className="text-center max-w-md">
                    <WifiOff className="w-16 h-16 text-red-500 mx-auto mb-4" />
                    <h2 className="text-2xl font-bold mb-2">{t('game.connectionError')}</h2>
                    <p className="text-slate-400 mb-6">{errorMessage}</p>
                    <button
                        onClick={() => window.location.reload()}
                        className="px-6 py-3 bg-white/10 hover:bg-white/20 rounded-full font-bold transition-colors flex items-center gap-2 mx-auto"
                    >
                        <RefreshCw className="w-5 h-5" /> {t('game.tryAgain')}
                    </button>
                </div>
            </div>
        );
    }

    // Loading screen
    if (!gameState) {
        return (
            <div className="min-h-screen flex items-center justify-center text-white bg-gradient-to-br from-slate-900 to-black">
                <Head><title>Connecting... - Judgment</title></Head>
                <div className="text-center">
                    <div className="animate-spin w-12 h-12 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
                    <h2 className="text-xl font-bold">{t('game.connecting')}</h2>
                    <p className="text-slate-400 mt-2">{t('game.settingUpGame')}</p>
                </div>
            </div>
        );
    }

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

    const shareLink = typeof window !== 'undefined' ? window.location.href : '';

    return (
        <div className="min-h-screen text-foreground overflow-hidden flex flex-col bg-[url('/bg-texture.png')] bg-cover">
            <Head><title>Judgment - Play</title></Head>

            {/* HUD */}
            {gameState.phase !== 'lobby' && gameState.phase !== 'finished' && (
                <>
                    <GameHUD
                        players={gameState.players}
                        currentRound={gameState.roundIndex + 1}
                        trump={gameState.trump}
                        dealerName={gameState.players[gameState.dealerSeatIndex]?.name}
                    />

                    {/* Score History Panel */}
                    <ScoreHistory
                        players={gameState.players}
                        scoresHistory={gameState.scoresHistory}
                        currentRound={gameState.roundIndex + 1}
                    />

                    {/* Betting Panel - Shows during betting and playing */}
                    {(gameState.phase === 'betting' || gameState.phase === 'playing') && (
                        <BettingPanel
                            players={gameState.players}
                            currentBettorSeatIndex={gameState.currentLeaderSeatIndex}
                            cardsPerPlayer={gameState.cardsPerPlayer}
                            phase={gameState.phase}
                            trump={gameState.trump}
                        />
                    )}
                </>
            )}

            {/* Top Bar */}
            <header className="p-4 flex justify-between items-center bg-black/20 backdrop-blur-sm z-20">
                <div className="flex items-center gap-4">
                    <button onClick={() => router.push('/')} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                        <Menu className="w-6 h-6 text-white" />
                    </button>
                    <div>
                        <h1 className="text-xl font-bold text-white leading-none">Judgment</h1>
                        <div className="text-xs text-slate-400 flex items-center gap-1">
                            <span className={clsx("w-2 h-2 rounded-full", connectionStatus === 'connected' ? "bg-green-500" : "bg-yellow-500")}></span>
                            {connectionStatus === 'connected' ? t('game.connected') : t('game.connecting')}
                            {isHost && <span className="ml-1 text-yellow-400">({t('game.host')})</span>}
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
                                onClick={resetGame}
                                className="px-3 py-1 bg-red-500/20 hover:bg-red-500/30 text-red-300 text-xs font-bold rounded-full border border-red-500/30 transition-colors"
                            >
                                {t('game.resetGame')}
                            </button>
                        </>
                    )}
                    <button
                        onClick={() => navigator.clipboard.writeText(shareLink)}
                        className="p-2 hover:bg-white/10 rounded-full transition-colors"
                        title="Copy Link"
                    >
                        <Copy className="w-5 h-5 text-slate-300" />
                    </button>
                </div>
            </header>

            {/* Game Area */}
            <main className="flex-grow relative flex flex-col md:flex-row items-center justify-center p-2 md:p-4 overflow-hidden mt-12 md:mt-0">
                {/* Opponents (Mobile) - Horizontal scrollable row */}
                <div className="md:hidden w-full px-2 mb-2">
                    <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar snap-x snap-mandatory">
                        {gameState.players.filter(p => p.id !== myId).map(player => (
                            <div key={player.id} className="flex-shrink-0 snap-center">
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
                </div>

                {/* Table Surface */}
                <div className="relative w-full max-w-[95vw] md:max-w-3xl flex-1 md:flex-none md:aspect-video rounded-2xl md:rounded-[3rem] glass border border-white/10 shadow-2xl flex items-center justify-center overflow-hidden">
                    {/* Table felt texture */}
                    <div className="absolute inset-0 bg-gradient-to-br from-emerald-900/30 via-slate-900/60 to-slate-900/80"></div>
                    <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_transparent_0%,_rgba(0,0,0,0.3)_100%)]"></div>

                    {/* Center Trick Area */}
                    <div className="relative z-10 w-40 h-32 md:w-64 md:h-64 flex items-center justify-center">
                        <AnimatePresence>
                            {gameState.currentTrick.map((played, i) => (
                                <motion.div
                                    key={`${played.seatIndex}-${played.card.id}`}
                                    initial={{ scale: 0.5, opacity: 0, y: 30 }}
                                    animate={{
                                        scale: 1,
                                        opacity: 1,
                                        y: 0,
                                        rotate: (i - (gameState.currentTrick.length - 1) / 2) * 8,
                                        x: (i - (gameState.currentTrick.length - 1) / 2) * 15
                                    }}
                                    exit={{ scale: 0.5, opacity: 0, y: -20 }}
                                    transition={{ type: 'spring', damping: 15, stiffness: 200 }}
                                    className="absolute shadow-2xl"
                                    style={{ zIndex: i }}
                                >
                                    <CardComponent card={played.card} size="md" />
                                    <motion.div
                                        initial={{ opacity: 0, y: 5 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-[10px] md:text-xs font-semibold bg-black/70 backdrop-blur-sm px-2 py-0.5 rounded-full whitespace-nowrap border border-white/10"
                                    >
                                        {gameState.players.find(p => p.seatIndex === played.seatIndex)?.name}
                                    </motion.div>
                                </motion.div>
                            ))}
                        </AnimatePresence>

                        {/* Empty state indicator */}
                        {gameState.currentTrick.length === 0 && gameState.phase === 'playing' && (
                            <div className="text-slate-500 text-sm font-medium">
                                {isMyTurn ? 'Your turn to lead' : 'Waiting...'}
                            </div>
                        )}
                    </div>

                    {/* Desktop Seats */}
                    <div className="hidden md:block absolute inset-0 pointer-events-none">
                        {gameState.players.map((player, i) => {
                            const mySeat = gameState.players.findIndex(p => p.id === myId);
                            const relativeIndex = (i - mySeat + gameState.players.length) % gameState.players.length;

                            if (relativeIndex === 0) return null;

                            const angle = ((relativeIndex / gameState.players.length) * 2 * Math.PI) + (Math.PI / 2);
                            const radiusX = 40;
                            const radiusY = 35;
                            const x = 50 + radiusX * Math.cos(angle);
                            const y = 50 + radiusY * Math.sin(angle);

                            return (
                                <div key={player.id} className="absolute transform -translate-x-1/2 -translate-y-1/2 pointer-events-auto" style={{ left: `${x}%`, top: `${y}%` }}>
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

            {/* My Hand */}
            <footer className="relative z-20 pb-safe bg-gradient-to-t from-black/40 to-transparent">
                {me && (
                    <div className="flex flex-col items-center pt-2">
                        {/* Player info - compact on mobile */}
                        <div className="mb-1 md:mb-2 transform scale-90 md:scale-100">
                            <PlayerSeat
                                player={me}
                                isDealer={me.seatIndex === gameState.dealerSeatIndex}
                                isCurrentTurn={me.seatIndex === gameState.currentLeaderSeatIndex}
                                isMe={true}
                                position="bottom"
                            />
                        </div>

                        {/* Hand of cards */}
                        <div className="w-full max-w-4xl px-2 md:px-4 overflow-x-auto no-scrollbar pb-2 md:pb-4">
                            <Hand
                                cards={me.hand}
                                onPlayCard={(card) => sendAction({ type: 'PLAY_CARD', playerId: myId, card })}
                                playableCards={me.hand}
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
                            <h2 className="text-3xl font-bold mb-2 text-white">{t('game.waitingForPlayers')}</h2>
                            <p className="text-slate-400 mb-4">{t('game.shareLinkWithFriends')}</p>

                            <div className="bg-black/30 rounded-xl p-3 mb-6 flex items-center gap-2">
                                <input
                                    type="text"
                                    value={shareLink}
                                    readOnly
                                    className="flex-1 bg-transparent text-white text-sm font-mono outline-none"
                                />
                                <button
                                    onClick={() => navigator.clipboard.writeText(shareLink)}
                                    className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                                >
                                    <Copy className="w-4 h-4 text-slate-300" />
                                </button>
                            </div>

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
                                disabled={gameState.players.length < 2}
                                className="w-full py-4 bg-primary text-white font-bold rounded-2xl text-xl shadow-lg shadow-primary/30 hover:shadow-primary/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {gameState.players.length < 2 ? t('game.waitingForPlayersShort') : t('game.startGame')}
                            </button>
                        </div>
                    </motion.div>
                )}

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
                            <div className="text-white text-2xl font-bold">{t('game.waitingForHostToStart')}</div>
                            <div className="text-slate-400 mt-2">{t('game.playersJoined', { count: gameState.players.length })}</div>
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
