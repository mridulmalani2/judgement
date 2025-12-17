import React, { useState } from 'react';
import { Player, Suit } from '../lib/types';
import { motion, AnimatePresence } from 'framer-motion';
import { Target, Check, Clock, AlertCircle, TrendingUp, ChevronRight, ChevronLeft, Trophy, X, Menu } from 'lucide-react';
import clsx from 'clsx';
import { useTranslation } from 'react-i18next';

interface BettingPanelProps {
    players: Player[];
    currentBettorSeatIndex: number;
    cardsPerPlayer: number;
    phase: 'betting' | 'playing' | 'scoring';
    trump: Suit;
}

const suitSymbols: Record<Suit, { symbol: string; color: string }> = {
    spades: { symbol: '♠', color: 'text-slate-200' },
    hearts: { symbol: '♥', color: 'text-red-500' },
    diamonds: { symbol: '♦', color: 'text-red-500' },
    clubs: { symbol: '♣', color: 'text-slate-200' }
};

export default function BettingPanel({ players, currentBettorSeatIndex, cardsPerPlayer, phase, trump }: BettingPanelProps) {
    const { t } = useTranslation('common');
    const [isOpen, setIsOpen] = useState(false);

    const totalBets = players.reduce((sum, p) => sum + (p.currentBet ?? 0), 0);
    const allBetsPlaced = players.every(p => p.currentBet !== null);
    const trumpInfo = suitSymbols[trump];

    // Sort players for leaderboard (High score top)
    const sortedPlayers = [...players].sort((a, b) => b.totalPoints - a.totalPoints);

    return (
        <>
            {/* Floating Toggle Button (Visible when closed) */}
            <AnimatePresence>
                {!isOpen && (
                    <motion.button
                        initial={{ x: -50, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        exit={{ x: -50, opacity: 0 }}
                        onClick={() => setIsOpen(true)}
                        className="fixed left-0 top-1/2 -translate-y-1/2 z-30 bg-indigo-600/90 hover:bg-indigo-500 text-white p-3 rounded-r-2xl shadow-[0_0_20px_rgba(79,70,229,0.3)] backdrop-blur-md border border-white/10 border-l-0 transition-all"
                        title="Open Game Stats"
                    >
                        <ChevronRight className="w-6 h-6" />
                    </motion.button>
                )}
            </AnimatePresence>

            {/* Slide-out Drawer */}
            <AnimatePresence>
                {isOpen && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsOpen(false)}
                            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
                        />
                        <motion.div
                            initial={{ x: '-100%' }}
                            animate={{ x: 0 }}
                            exit={{ x: '-100%' }}
                            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                            className="fixed top-0 left-0 bottom-0 w-80 max-w-[85vw] bg-slate-900/95 backdrop-blur-xl border-r border-white/10 shadow-2xl z-50 flex flex-col pointer-events-auto"
                        >
                            {/* Header */}
                            <div className="p-4 border-b border-white/10 flex justify-between items-center bg-black/20">
                                <h2 className="font-bold text-white text-lg flex items-center gap-2">
                                    <Target className="w-5 h-5 text-indigo-400" />
                                    {t('bettingPanel.gameStats')}
                                </h2>
                                <button
                                    onClick={() => setIsOpen(false)}
                                    className="p-1 hover:bg-white/10 rounded-full text-white transition-colors"
                                >
                                    <ChevronLeft className="w-6 h-6" />
                                </button>
                            </div>

                            {/* Scrollable Content */}
                            <div className="flex-1 overflow-y-auto p-4 space-y-6">

                                {/* 1. Live Leaderboard */}
                                <div className="space-y-3">
                                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                                        <Trophy className="w-3 h-3 text-yellow-500" />
                                        {t('bettingPanel.leaderboard')}
                                    </h3>
                                    <div className="bg-white/5 rounded-xl overflow-hidden border border-white/5">
                                        {sortedPlayers.map((p, i) => (
                                            <div key={p.id} className={clsx(
                                                "flex items-center justify-between p-3 border-b border-white/5 last:border-0",
                                                i === 0 && "bg-yellow-500/10"
                                            )}>
                                                <div className="flex items-center gap-3">
                                                    <div className={clsx(
                                                        "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold",
                                                        i === 0 ? "bg-yellow-500 text-black" :
                                                            i === 1 ? "bg-slate-300 text-black" :
                                                                i === 2 ? "bg-amber-700 text-white" :
                                                                    "bg-slate-800 text-slate-400"
                                                    )}>
                                                        {i + 1}
                                                    </div>
                                                    <span className={clsx("font-medium", p.id === sortedPlayers[0].id ? "text-yellow-200" : "text-slate-200")}>
                                                        {p.name}
                                                    </span>
                                                </div>
                                                <span className="font-bold text-white">{p.totalPoints} pts</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* 2. Betting Info */}
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                                            <Target className="w-3 h-3 text-indigo-400" />
                                            {t('bettingPanel.bettingStatus')}
                                        </h3>
                                        <div className={clsx("flex items-center gap-1 text-sm font-bold bg-white/5 px-2 py-0.5 rounded-lg", trumpInfo.color)}>
                                            <span>Trump:</span>
                                            <span className="text-lg leading-none">{trumpInfo.symbol}</span>
                                        </div>
                                    </div>

                                    {/* Stats Grid */}
                                    <div className="grid grid-cols-2 gap-2">
                                        <div className="bg-white/5 rounded-lg p-3 text-center border border-white/5">
                                            <div className="text-xs text-slate-500 mb-0.5">{t('bettingPanel.cards')}</div>
                                            <div className="text-xl font-bold text-white">{cardsPerPlayer}</div>
                                        </div>
                                        <div className={clsx(
                                            "rounded-lg p-3 text-center border",
                                            totalBets === cardsPerPlayer && allBetsPlaced ? "bg-green-500/10 border-green-500/20" :
                                                totalBets > cardsPerPlayer && allBetsPlaced ? "bg-red-500/10 border-red-500/20" :
                                                    "bg-white/5 border-white/5"
                                        )}>
                                            <div className="text-xs text-slate-500 mb-0.5">{t('bettingPanel.totalBets')}</div>
                                            <div className={clsx(
                                                "text-xl font-bold",
                                                totalBets === cardsPerPlayer && allBetsPlaced ? "text-green-400" :
                                                    totalBets > cardsPerPlayer && allBetsPlaced ? "text-red-400" :
                                                        "text-white"
                                            )}>
                                                {totalBets}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Warnings */}
                                    {allBetsPlaced && (
                                        <div className={clsx(
                                            "flex items-center gap-2 text-xs p-2 rounded-lg font-medium border",
                                            totalBets > cardsPerPlayer ? "bg-red-500/10 text-red-400 border-red-500/20" :
                                                totalBets < cardsPerPlayer ? "bg-green-500/10 text-green-400 border-green-500/20" :
                                                    "bg-yellow-500/10 text-yellow-400 border-yellow-500/20"
                                        )}>
                                            <TrendingUp className="w-4 h-4 flex-shrink-0" />
                                            <span>
                                                {totalBets > cardsPerPlayer && t('bettingPanel.overbidBy', { count: totalBets - cardsPerPlayer })}
                                                {totalBets < cardsPerPlayer && t('bettingPanel.underbidBy', { count: cardsPerPlayer - totalBets })}
                                                {totalBets === cardsPerPlayer && t('bettingPanel.exactlyBooked')}
                                            </span>
                                        </div>
                                    )}

                                    {/* Individual Bets List */}
                                    <div className="space-y-2">
                                        {players.map((player) => {
                                            const hasBet = player.currentBet !== null;
                                            const currentBet = player.currentBet ?? 0;
                                            const isCurrentBettor = player.seatIndex === currentBettorSeatIndex && phase === 'betting';
                                            const progressPct = hasBet && currentBet > 0
                                                ? Math.min((player.tricksWon / currentBet) * 100, 100)
                                                : 0;
                                            const isOnTrack = player.tricksWon === currentBet;
                                            const isOver = player.tricksWon > currentBet;

                                            return (
                                                <div
                                                    key={player.id}
                                                    className={clsx(
                                                        "relative rounded-xl p-3 transition-all overflow-hidden",
                                                        isCurrentBettor ? "bg-indigo-500/20 border border-indigo-400/50" :
                                                            "bg-white/5 border border-white/5"
                                                    )}
                                                >
                                                    {/* Progress bar */}
                                                    {phase === 'playing' && hasBet && currentBet > 0 && (
                                                        <div
                                                            className={clsx(
                                                                "absolute bottom-0 left-0 h-1 transition-all",
                                                                isOnTrack ? "bg-green-500" : isOver ? "bg-red-500" : "bg-yellow-500"
                                                            )}
                                                            style={{ width: `${progressPct}%` }}
                                                        />
                                                    )}

                                                    <div className="flex items-center justify-between relative z-10">
                                                        <div className="flex items-center gap-2">
                                                            {isCurrentBettor ? (
                                                                <Clock className="w-4 h-4 text-indigo-400 animate-pulse" />
                                                            ) : hasBet ? (
                                                                <Check className="w-4 h-4 text-green-400" />
                                                            ) : (
                                                                <div className="w-4 h-4 rounded-full border border-slate-600"></div>
                                                            )}
                                                            <span className={clsx(
                                                                "text-sm font-medium truncate max-w-[120px]",
                                                                isCurrentBettor ? "text-indigo-300" : "text-white"
                                                            )}>
                                                                {player.name}
                                                            </span>
                                                        </div>

                                                        <div className="flex items-center gap-2">
                                                            {phase === 'playing' && hasBet && (
                                                                <span className={clsx(
                                                                    "text-xs font-mono",
                                                                    isOnTrack ? "text-green-400" : isOver ? "text-red-400" : "text-yellow-400"
                                                                )}>
                                                                    {player.tricksWon}/{currentBet}
                                                                </span>
                                                            )}
                                                            {hasBet ? (
                                                                <div className="bg-black/40 text-white font-bold text-xs px-2 py-1 rounded-md min-w-[24px] text-center border border-white/10">
                                                                    {player.currentBet}
                                                                </div>
                                                            ) : (
                                                                <span className="text-slate-600">-</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </>
    );
}
