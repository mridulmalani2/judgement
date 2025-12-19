import React, { useState } from 'react';
import { Player, Suit } from '../lib/types';
import { motion, AnimatePresence } from 'framer-motion';
import { Target, Check, Clock, TrendingUp, ChevronUp, Trophy, X, BarChart3, Users } from 'lucide-react';
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
    hearts: { symbol: '♥', color: 'text-red-400' },
    diamonds: { symbol: '♦', color: 'text-red-400' },
    clubs: { symbol: '♣', color: 'text-slate-200' }
};

export default function BettingPanel({ players, currentBettorSeatIndex, cardsPerPlayer, phase, trump }: BettingPanelProps) {
    const { t } = useTranslation('common');
    const [isOpen, setIsOpen] = useState(false);

    const totalBets = players.reduce((sum, p) => sum + (p.currentBet ?? 0), 0);
    const allBetsPlaced = players.every(p => p.currentBet !== null);
    const betsPlacedCount = players.filter(p => p.currentBet !== null).length;
    const trumpInfo = suitSymbols[trump];

    // Sort players for leaderboard (High score top)
    const sortedPlayers = [...players].sort((a, b) => b.totalPoints - a.totalPoints);

    return (
        <>
            {/* Floating Toggle Button - Bottom Left */}
            <AnimatePresence>
                {!isOpen && (
                    <motion.button
                        initial={{ y: 50, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: 50, opacity: 0 }}
                        onClick={() => setIsOpen(true)}
                        className="fixed left-4 bottom-36 md:bottom-8 z-[60] bg-indigo-600/90 hover:bg-indigo-500 text-white px-4 py-2.5 rounded-xl shadow-lg shadow-indigo-500/30 backdrop-blur-md border border-white/20 transition-all flex items-center gap-2"
                    >
                        <BarChart3 className="w-5 h-5" />
                        <span className="font-semibold text-sm">Stats</span>
                        {phase === 'betting' && (
                            <span className="bg-white/20 text-xs px-1.5 py-0.5 rounded-md">
                                {betsPlacedCount}/{players.length}
                            </span>
                        )}
                    </motion.button>
                )}
            </AnimatePresence>

            {/* Bottom Sheet Panel */}
            <AnimatePresence>
                {isOpen && (
                    <>
                        {/* Transparent overlay - no backdrop blur to keep cards visible */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsOpen(false)}
                            className="fixed inset-0 bg-black/30 z-40"
                        />
                        <motion.div
                            initial={{ y: '100%' }}
                            animate={{ y: 0 }}
                            exit={{ y: '100%' }}
                            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                            className="fixed bottom-0 left-0 right-0 bg-slate-900/95 backdrop-blur-xl border-t border-white/10 shadow-2xl z-50 rounded-t-3xl max-h-[70vh] flex flex-col pointer-events-auto"
                        >
                            {/* Drag Handle */}
                            <div className="flex justify-center pt-3 pb-1">
                                <div className="w-10 h-1 bg-white/20 rounded-full" />
                            </div>

                            {/* Header */}
                            <div className="px-4 pb-3 flex justify-between items-center">
                                <h2 className="font-bold text-white text-lg flex items-center gap-2">
                                    <BarChart3 className="w-5 h-5 text-indigo-400" />
                                    Game Stats
                                </h2>
                                <button
                                    onClick={() => setIsOpen(false)}
                                    className="p-2 hover:bg-white/10 rounded-full text-slate-400 transition-colors"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            {/* Quick Stats Bar */}
                            <div className="px-4 pb-3">
                                <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
                                    <div className="flex-shrink-0 bg-white/5 rounded-lg px-3 py-2 border border-white/5">
                                        <div className="text-[10px] text-slate-500 uppercase">Cards</div>
                                        <div className="text-lg font-bold text-white">{cardsPerPlayer}</div>
                                    </div>
                                    <div className={clsx(
                                        "flex-shrink-0 rounded-lg px-3 py-2 border",
                                        totalBets === cardsPerPlayer && allBetsPlaced ? "bg-green-500/10 border-green-500/20" :
                                            totalBets > cardsPerPlayer && allBetsPlaced ? "bg-red-500/10 border-red-500/20" :
                                                "bg-white/5 border-white/5"
                                    )}>
                                        <div className="text-[10px] text-slate-500 uppercase">Total Bets</div>
                                        <div className={clsx(
                                            "text-lg font-bold",
                                            totalBets === cardsPerPlayer && allBetsPlaced ? "text-green-400" :
                                                totalBets > cardsPerPlayer && allBetsPlaced ? "text-red-400" : "text-white"
                                        )}>
                                            {totalBets}
                                        </div>
                                    </div>
                                    {allBetsPlaced && (
                                        <div className={clsx(
                                            "flex-shrink-0 flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg font-medium border",
                                            totalBets > cardsPerPlayer ? "bg-red-500/10 text-red-400 border-red-500/20" :
                                                totalBets < cardsPerPlayer ? "bg-green-500/10 text-green-400 border-green-500/20" :
                                                    "bg-yellow-500/10 text-yellow-400 border-yellow-500/20"
                                        )}>
                                            <TrendingUp className="w-4 h-4" />
                                            {totalBets > cardsPerPlayer && `+${totalBets - cardsPerPlayer} over`}
                                            {totalBets < cardsPerPlayer && `${cardsPerPlayer - totalBets} under`}
                                            {totalBets === cardsPerPlayer && "Exact"}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Scrollable Content */}
                            <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-4">
                                {/* Leaderboard Section */}
                                <div className="space-y-2">
                                    <div className="flex items-center gap-2 text-slate-400">
                                        <Trophy className="w-4 h-4 text-yellow-500" />
                                        <h3 className="text-sm font-semibold">Leaderboard</h3>
                                    </div>
                                    <div className="bg-white/5 rounded-xl overflow-hidden border border-white/5">
                                        {sortedPlayers.map((p, i) => (
                                            <div key={p.id} className={clsx(
                                                "flex items-center justify-between p-2.5 border-b border-white/5 last:border-0",
                                                i === 0 && "bg-yellow-500/10"
                                            )}>
                                                <div className="flex items-center gap-2.5">
                                                    <div className={clsx(
                                                        "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold",
                                                        i === 0 ? "bg-yellow-500 text-black" :
                                                            i === 1 ? "bg-slate-300 text-black" :
                                                                i === 2 ? "bg-amber-600 text-white" :
                                                                    "bg-slate-800 text-slate-400"
                                                    )}>
                                                        {i + 1}
                                                    </div>
                                                    <span className={clsx(
                                                        "font-medium text-sm",
                                                        i === 0 ? "text-yellow-200" : "text-slate-200"
                                                    )}>
                                                        {p.name}
                                                    </span>
                                                </div>
                                                <span className="font-bold text-white text-sm">{p.totalPoints} <span className="text-slate-500 font-normal">pts</span></span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Player Bets Section */}
                                <div className="space-y-2">
                                    <div className="flex items-center gap-2 text-slate-400">
                                        <Users className="w-4 h-4 text-indigo-400" />
                                        <h3 className="text-sm font-semibold">
                                            {phase === 'betting' ? 'Betting Progress' : 'Tricks Progress'}
                                        </h3>
                                    </div>
                                    <div className="space-y-1.5">
                                        {players.map((player) => {
                                            const hasBet = player.currentBet !== null;
                                            const currentBet = player.currentBet ?? 0;
                                            const isCurrentBettor = player.seatIndex === currentBettorSeatIndex && phase === 'betting';
                                            const progressPct = hasBet && currentBet > 0
                                                ? Math.min((player.tricksWon / currentBet) * 100, 100)
                                                : (hasBet && currentBet === 0 && player.tricksWon === 0 ? 100 : 0);
                                            const isOnTrack = hasBet && player.tricksWon === currentBet;
                                            const isOver = hasBet && player.tricksWon > currentBet;

                                            return (
                                                <div
                                                    key={player.id}
                                                    className={clsx(
                                                        "relative rounded-lg p-2.5 transition-all overflow-hidden",
                                                        isCurrentBettor ? "bg-indigo-500/20 border border-indigo-400/50" :
                                                            "bg-white/5 border border-white/5"
                                                    )}
                                                >
                                                    {/* Progress bar background */}
                                                    {phase === 'playing' && hasBet && (
                                                        <div
                                                            className={clsx(
                                                                "absolute inset-0 opacity-20 transition-all",
                                                                isOnTrack ? "bg-green-500" : isOver ? "bg-red-500" : "bg-amber-500"
                                                            )}
                                                            style={{ width: `${progressPct}%` }}
                                                        />
                                                    )}

                                                    <div className="flex items-center justify-between relative z-10">
                                                        <div className="flex items-center gap-2">
                                                            {isCurrentBettor ? (
                                                                <div className="w-5 h-5 rounded-full bg-indigo-500/30 flex items-center justify-center">
                                                                    <Clock className="w-3 h-3 text-indigo-300 animate-pulse" />
                                                                </div>
                                                            ) : hasBet ? (
                                                                <div className="w-5 h-5 rounded-full bg-green-500/30 flex items-center justify-center">
                                                                    <Check className="w-3 h-3 text-green-400" />
                                                                </div>
                                                            ) : (
                                                                <div className="w-5 h-5 rounded-full border border-slate-600 bg-slate-800/50" />
                                                            )}
                                                            <span className={clsx(
                                                                "text-sm font-medium truncate max-w-[120px]",
                                                                isCurrentBettor ? "text-indigo-200" : "text-white"
                                                            )}>
                                                                {player.name}
                                                            </span>
                                                        </div>

                                                        <div className="flex items-center gap-2">
                                                            {phase === 'playing' && hasBet && (
                                                                <span className={clsx(
                                                                    "text-xs font-bold px-1.5 py-0.5 rounded",
                                                                    isOnTrack ? "bg-green-500/20 text-green-400" :
                                                                    isOver ? "bg-red-500/20 text-red-400" : "bg-amber-500/20 text-amber-400"
                                                                )}>
                                                                    {player.tricksWon}/{currentBet}
                                                                </span>
                                                            )}
                                                            {hasBet ? (
                                                                <div className="bg-indigo-500/30 text-indigo-200 font-bold text-sm px-2.5 py-1 rounded-lg min-w-[32px] text-center">
                                                                    {player.currentBet}
                                                                </div>
                                                            ) : (
                                                                <div className="text-slate-600 text-sm px-2.5 py-1">—</div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>

                            {/* Safe area padding */}
                            <div className="pb-safe" />
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </>
    );
}
