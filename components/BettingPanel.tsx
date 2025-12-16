import React from 'react';
import { Player, Suit } from '../lib/types';
import { motion } from 'framer-motion';
import { Target, Check, Clock, AlertCircle, TrendingUp } from 'lucide-react';
import clsx from 'clsx';

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
    const totalBets = players.reduce((sum, p) => sum + (p.currentBet ?? 0), 0);
    const allBetsPlaced = players.every(p => p.currentBet !== null);
    const trumpInfo = suitSymbols[trump];

    return (
        <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="fixed left-4 top-44 z-30 pointer-events-auto"
        >
            <div className="bg-black/70 backdrop-blur-md rounded-2xl border border-white/10 shadow-xl p-4 min-w-[200px]">
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <Target className="w-4 h-4 text-indigo-400" />
                        <span className="font-bold text-white text-sm">
                            {phase === 'betting' ? 'Betting' : 'Bets'}
                        </span>
                    </div>
                    <div className={clsx(
                        "flex items-center gap-1 text-lg font-bold",
                        trumpInfo.color
                    )}>
                        <span className="text-2xl">{trumpInfo.symbol}</span>
                    </div>
                </div>

                {/* Summary Stats */}
                <div className="grid grid-cols-2 gap-2 mb-4">
                    <div className="bg-white/5 rounded-lg p-2 text-center">
                        <div className="text-xs text-slate-500 mb-0.5">Cards</div>
                        <div className="text-lg font-bold text-white">{cardsPerPlayer}</div>
                    </div>
                    <div className={clsx(
                        "rounded-lg p-2 text-center",
                        totalBets === cardsPerPlayer && allBetsPlaced ? "bg-green-500/20" :
                            totalBets > cardsPerPlayer && allBetsPlaced ? "bg-red-500/20" :
                                "bg-white/5"
                    )}>
                        <div className="text-xs text-slate-500 mb-0.5">Total Bets</div>
                        <div className={clsx(
                            "text-lg font-bold",
                            totalBets === cardsPerPlayer && allBetsPlaced ? "text-green-400" :
                                totalBets > cardsPerPlayer && allBetsPlaced ? "text-red-400" :
                                    "text-white"
                        )}>
                            {totalBets}
                        </div>
                    </div>
                </div>

                {/* Betting indicator */}
                {!allBetsPlaced && totalBets !== cardsPerPlayer && (
                    <div className="flex items-center gap-2 mb-3 text-xs bg-amber-500/10 text-amber-400 rounded-lg px-2 py-1.5 border border-amber-500/20">
                        <AlertCircle className="w-3 h-3" />
                        <span>Last player can't bet {cardsPerPlayer - totalBets}</span>
                    </div>
                )}

                {/* Players' Bets */}
                <div className="space-y-2">
                    {players.map((player, idx) => {
                        const hasBet = player.currentBet !== null;
                        const currentBet = player.currentBet ?? 0;
                        const isCurrentBettor = player.seatIndex === currentBettorSeatIndex && phase === 'betting';
                        const progressPct = hasBet && currentBet > 0
                            ? Math.min((player.tricksWon / currentBet) * 100, 100)
                            : 0;
                        const isOnTrack = player.tricksWon === currentBet;
                        const isOver = player.tricksWon > currentBet;

                        return (
                            <motion.div
                                key={player.id}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: idx * 0.05 }}
                                className={clsx(
                                    "relative rounded-xl p-2.5 transition-all overflow-hidden",
                                    isCurrentBettor && "bg-indigo-500/20 border border-indigo-400/50 ring-1 ring-indigo-400/30",
                                    !isCurrentBettor && hasBet && "bg-white/5 border border-white/10",
                                    !isCurrentBettor && !hasBet && "bg-white/5 border border-dashed border-white/20"
                                )}
                            >
                                {/* Progress bar for playing phase */}
                                {phase === 'playing' && hasBet && currentBet > 0 && (
                                    <div
                                        className={clsx(
                                            "absolute bottom-0 left-0 h-1 transition-all",
                                            isOnTrack ? "bg-green-500" : isOver ? "bg-red-500" : "bg-yellow-500"
                                        )}
                                        style={{ width: `${progressPct}%` }}
                                    ></div>
                                )}

                                <div className="flex items-center justify-between relative z-10">
                                    <div className="flex items-center gap-2">
                                        {isCurrentBettor ? (
                                            <motion.div
                                                animate={{ scale: [1, 1.2, 1] }}
                                                transition={{ repeat: Infinity, duration: 1.5 }}
                                            >
                                                <Clock className="w-4 h-4 text-indigo-400" />
                                            </motion.div>
                                        ) : hasBet ? (
                                            <Check className="w-4 h-4 text-green-400" />
                                        ) : (
                                            <div className="w-4 h-4 rounded-full border border-slate-600"></div>
                                        )}
                                        <span className={clsx(
                                            "text-sm font-medium truncate max-w-[100px]",
                                            isCurrentBettor ? "text-indigo-300" : "text-white"
                                        )}>
                                            {player.name}
                                        </span>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        {phase === 'playing' && hasBet && (
                                            <div className={clsx(
                                                "text-xs px-1.5 py-0.5 rounded",
                                                isOnTrack ? "bg-green-500/20 text-green-400" :
                                                    isOver ? "bg-red-500/20 text-red-400" :
                                                        "bg-yellow-500/20 text-yellow-400"
                                            )}>
                                                {player.tricksWon}/{currentBet}
                                            </div>
                                        )}
                                        {hasBet ? (
                                            <div className="bg-white text-black font-bold text-sm px-2 py-0.5 rounded-lg min-w-[28px] text-center">
                                                {player.currentBet}
                                            </div>
                                        ) : (
                                            <div className="text-slate-500 text-sm">-</div>
                                        )}
                                    </div>
                                </div>
                            </motion.div>
                        );
                    })}
                </div>

                {/* Overbooking indicator */}
                {allBetsPlaced && (
                    <div className={clsx(
                        "mt-3 flex items-center justify-center gap-2 text-xs py-2 rounded-lg font-medium",
                        totalBets > cardsPerPlayer && "bg-red-500/10 text-red-400 border border-red-500/20",
                        totalBets < cardsPerPlayer && "bg-green-500/10 text-green-400 border border-green-500/20",
                        totalBets === cardsPerPlayer && "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20"
                    )}>
                        <TrendingUp className="w-3 h-3" />
                        {totalBets > cardsPerPlayer && `Overbid by ${totalBets - cardsPerPlayer}`}
                        {totalBets < cardsPerPlayer && `Underbid by ${cardsPerPlayer - totalBets}`}
                        {totalBets === cardsPerPlayer && "Exactly booked!"}
                    </div>
                )}
            </div>
        </motion.div>
    );
}
