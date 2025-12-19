import React, { useState } from 'react';
import { Player } from '../lib/types';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, TrendingUp, History, X } from 'lucide-react';
import clsx from 'clsx';

interface ScoreHistoryProps {
    players: Player[];
    scoresHistory: { [playerId: string]: number }[];
    currentRound: number;
}

export default function ScoreHistory({ players, scoresHistory, currentRound }: ScoreHistoryProps) {
    const [isOpen, setIsOpen] = useState(false);

    if (scoresHistory.length === 0 && currentRound <= 1) {
        return null;
    }

    // Sort players by total points for ranking display
    const rankedPlayers = [...players].sort((a, b) => b.totalPoints - a.totalPoints);

    return (
        <>
            {/* Floating Toggle Button - Bottom Right */}
            <AnimatePresence>
                {!isOpen && (
                    <motion.button
                        initial={{ y: 50, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: 50, opacity: 0 }}
                        onClick={() => setIsOpen(true)}
                        className="fixed right-4 bottom-36 md:bottom-8 z-[60] bg-amber-600/90 hover:bg-amber-500 text-white px-4 py-2.5 rounded-xl shadow-lg shadow-amber-500/30 backdrop-blur-md border border-white/20 transition-all flex items-center gap-2"
                    >
                        <History className="w-5 h-5" />
                        <span className="font-semibold text-sm">Scores</span>
                        {rankedPlayers.length > 0 && (
                            <span className="bg-white/20 text-xs px-1.5 py-0.5 rounded-md flex items-center gap-1">
                                <Trophy className="w-3 h-3" />
                                {rankedPlayers[0].totalPoints}
                            </span>
                        )}
                    </motion.button>
                )}
            </AnimatePresence>

            {/* Bottom Sheet Panel */}
            <AnimatePresence>
                {isOpen && (
                    <>
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
                                    <History className="w-5 h-5 text-amber-400" />
                                    Scoreboard
                                </h2>
                                <button
                                    onClick={() => setIsOpen(false)}
                                    className="p-2 hover:bg-white/10 rounded-full text-slate-400 transition-colors"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            {/* Scrollable Content */}
                            <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-4">
                                {/* Current Standings */}
                                <div className="space-y-2">
                                    <div className="flex items-center gap-2 text-slate-400">
                                        <Trophy className="w-4 h-4 text-yellow-500" />
                                        <h3 className="text-sm font-semibold">Current Standings</h3>
                                    </div>
                                    <div className="space-y-1.5">
                                        {rankedPlayers.map((player, idx) => (
                                            <div
                                                key={player.id}
                                                className={clsx(
                                                    "flex items-center justify-between px-3 py-2.5 rounded-xl",
                                                    idx === 0 && "bg-yellow-500/15 border border-yellow-500/30",
                                                    idx === 1 && "bg-slate-400/10 border border-slate-400/20",
                                                    idx === 2 && "bg-amber-600/10 border border-amber-600/20",
                                                    idx > 2 && "bg-white/5 border border-white/5"
                                                )}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <span className={clsx(
                                                        "w-7 h-7 flex items-center justify-center rounded-full text-sm font-bold",
                                                        idx === 0 && "bg-yellow-500 text-black",
                                                        idx === 1 && "bg-slate-400 text-black",
                                                        idx === 2 && "bg-amber-600 text-white",
                                                        idx > 2 && "bg-slate-800 text-slate-400"
                                                    )}>
                                                        {idx + 1}
                                                    </span>
                                                    <span className={clsx(
                                                        "font-medium",
                                                        idx === 0 ? "text-yellow-200" : "text-white"
                                                    )}>
                                                        {player.name}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-1.5">
                                                    <Trophy className={clsx(
                                                        "w-4 h-4",
                                                        idx === 0 ? "text-yellow-400" : "text-slate-500"
                                                    )} />
                                                    <span className={clsx(
                                                        "font-bold text-lg",
                                                        idx === 0 ? "text-yellow-400" : "text-white"
                                                    )}>
                                                        {player.totalPoints}
                                                    </span>
                                                    <span className="text-slate-500 text-sm">pts</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Round History */}
                                {scoresHistory.length > 0 && (
                                    <div className="space-y-2">
                                        <div className="flex items-center gap-2 text-slate-400">
                                            <TrendingUp className="w-4 h-4 text-green-400" />
                                            <h3 className="text-sm font-semibold">Round History</h3>
                                        </div>
                                        <div className="bg-white/5 rounded-xl border border-white/5 overflow-hidden">
                                            <div className="overflow-x-auto no-scrollbar">
                                                <table className="w-full text-sm">
                                                    <thead>
                                                        <tr className="bg-white/5 border-b border-white/5">
                                                            <th className="text-left py-2.5 px-3 font-medium text-slate-400">Player</th>
                                                            {scoresHistory.map((_, idx) => (
                                                                <th key={idx} className="text-center py-2.5 px-2 font-medium text-slate-400 min-w-[50px]">
                                                                    R{idx + 1}
                                                                </th>
                                                            ))}
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {players.map((player, playerIdx) => (
                                                            <tr key={player.id} className={clsx(
                                                                "border-b border-white/5 last:border-0",
                                                                playerIdx % 2 === 0 && "bg-white/[0.02]"
                                                            )}>
                                                                <td className="py-2 px-3 text-white font-medium truncate max-w-[100px]">
                                                                    {player.name}
                                                                </td>
                                                                {scoresHistory.map((roundScores, idx) => {
                                                                    const score = roundScores[player.id] || 0;
                                                                    return (
                                                                        <td key={idx} className="text-center py-2 px-2">
                                                                            <span className={clsx(
                                                                                "inline-block min-w-[32px] px-1.5 py-0.5 rounded-md text-xs font-bold",
                                                                                score > 0 && "bg-green-500/20 text-green-400",
                                                                                score === 0 && "bg-red-500/20 text-red-400"
                                                                            )}>
                                                                                {score > 0 ? `+${score}` : score}
                                                                            </span>
                                                                        </td>
                                                                    );
                                                                })}
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    </div>
                                )}
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
