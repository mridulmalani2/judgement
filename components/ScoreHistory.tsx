import React, { useState } from 'react';
import { Player } from '../lib/types';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronUp, Trophy, TrendingUp, History } from 'lucide-react';
import clsx from 'clsx';

interface ScoreHistoryProps {
    players: Player[];
    scoresHistory: { [playerId: string]: number }[];
    currentRound: number;
}

export default function ScoreHistory({ players, scoresHistory, currentRound }: ScoreHistoryProps) {
    const [isExpanded, setIsExpanded] = useState(false);

    if (scoresHistory.length === 0 && currentRound <= 1) {
        return null;
    }

    // Sort players by total points for ranking display
    const rankedPlayers = [...players].sort((a, b) => b.totalPoints - a.totalPoints);

    // Get cumulative scores for each round
    const getCumulativeScore = (playerId: string, upToRound: number): number => {
        let total = 0;
        for (let i = 0; i <= upToRound && i < scoresHistory.length; i++) {
            total += scoresHistory[i][playerId] || 0;
        }
        return total;
    };

    return (
        <div className="fixed right-4 top-44 z-30 pointer-events-auto">
            <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="bg-black/70 backdrop-blur-md rounded-2xl border border-white/10 shadow-xl overflow-hidden"
            >
                {/* Header - Always visible */}
                <button
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="w-full px-4 py-3 flex items-center justify-between gap-3 hover:bg-white/5 transition-colors"
                >
                    <div className="flex items-center gap-2">
                        <History className="w-4 h-4 text-primary" />
                        <span className="font-bold text-white text-sm">Scoreboard</span>
                    </div>
                    {isExpanded ? (
                        <ChevronUp className="w-4 h-4 text-slate-400" />
                    ) : (
                        <ChevronDown className="w-4 h-4 text-slate-400" />
                    )}
                </button>

                {/* Expanded Content */}
                <AnimatePresence>
                    {isExpanded && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden"
                        >
                            <div className="px-4 pb-4">
                                {/* Current Standings */}
                                <div className="mb-4">
                                    <div className="text-xs text-slate-500 uppercase tracking-wider mb-2">Current Standings</div>
                                    <div className="space-y-1.5">
                                        {rankedPlayers.map((player, idx) => (
                                            <div
                                                key={player.id}
                                                className={clsx(
                                                    "flex items-center justify-between px-3 py-2 rounded-lg",
                                                    idx === 0 && "bg-yellow-500/20 border border-yellow-500/30",
                                                    idx === 1 && "bg-slate-400/10 border border-slate-400/20",
                                                    idx === 2 && "bg-amber-600/10 border border-amber-600/20",
                                                    idx > 2 && "bg-white/5"
                                                )}
                                            >
                                                <div className="flex items-center gap-2">
                                                    <span className={clsx(
                                                        "w-5 h-5 flex items-center justify-center rounded-full text-xs font-bold",
                                                        idx === 0 && "bg-yellow-500 text-black",
                                                        idx === 1 && "bg-slate-400 text-black",
                                                        idx === 2 && "bg-amber-600 text-white",
                                                        idx > 2 && "bg-white/10 text-slate-400"
                                                    )}>
                                                        {idx + 1}
                                                    </span>
                                                    <span className="text-white text-sm font-medium truncate max-w-[100px]">
                                                        {player.name}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <Trophy className={clsx(
                                                        "w-3 h-3",
                                                        idx === 0 ? "text-yellow-400" : "text-slate-500"
                                                    )} />
                                                    <span className={clsx(
                                                        "font-bold text-sm",
                                                        idx === 0 ? "text-yellow-400" : "text-white"
                                                    )}>
                                                        {player.totalPoints}
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Round History */}
                                {scoresHistory.length > 0 && (
                                    <div>
                                        <div className="text-xs text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1">
                                            <TrendingUp className="w-3 h-3" />
                                            Round History
                                        </div>
                                        <div className="overflow-x-auto no-scrollbar">
                                            <table className="w-full text-xs">
                                                <thead>
                                                    <tr className="text-slate-500">
                                                        <th className="text-left py-1 pr-2 font-medium">Player</th>
                                                        {scoresHistory.map((_, idx) => (
                                                            <th key={idx} className="text-center py-1 px-1 font-medium">
                                                                R{idx + 1}
                                                            </th>
                                                        ))}
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {players.map(player => (
                                                        <tr key={player.id} className="border-t border-white/5">
                                                            <td className="py-1.5 pr-2 text-white font-medium truncate max-w-[80px]">
                                                                {player.name}
                                                            </td>
                                                            {scoresHistory.map((roundScores, idx) => {
                                                                const score = roundScores[player.id] || 0;
                                                                return (
                                                                    <td key={idx} className="text-center py-1.5 px-1">
                                                                        <span className={clsx(
                                                                            "inline-block min-w-[24px] px-1 py-0.5 rounded",
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
                                )}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Mini standings when collapsed */}
                {!isExpanded && (
                    <div className="px-4 pb-3 flex items-center gap-2 text-xs">
                        {rankedPlayers.slice(0, 3).map((player, idx) => (
                            <div key={player.id} className="flex items-center gap-1">
                                <span className={clsx(
                                    "w-4 h-4 flex items-center justify-center rounded-full text-[10px] font-bold",
                                    idx === 0 && "bg-yellow-500 text-black",
                                    idx === 1 && "bg-slate-400 text-black",
                                    idx === 2 && "bg-amber-600 text-white"
                                )}>
                                    {idx + 1}
                                </span>
                                <span className="text-slate-300 truncate max-w-[50px]">{player.name}</span>
                                <span className="text-yellow-400 font-bold">{player.totalPoints}</span>
                            </div>
                        ))}
                    </div>
                )}
            </motion.div>
        </div>
    );
}
