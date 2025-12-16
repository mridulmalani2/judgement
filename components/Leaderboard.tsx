import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Trophy, Medal, Crown, Home, Sparkles, Star, RefreshCw } from 'lucide-react';
import { Player } from '../lib/types';
import { useRouter } from 'next/router';
import confetti from 'canvas-confetti';
import clsx from 'clsx';

interface LeaderboardProps {
    players: Player[];
    scores: { [playerId: string]: number };
    onPlayAgain?: () => void;
    isHost?: boolean;
}

export default function Leaderboard({ players, scores, onPlayAgain, isHost }: LeaderboardProps) {
    const router = useRouter();
    const [sortedPlayers, setSortedPlayers] = useState<Player[]>([]);
    const [showContent, setShowContent] = useState(false);

    useEffect(() => {
        // Sort players by score descending
        const sorted = [...players].sort((a, b) => (scores[b.id] || 0) - (scores[a.id] || 0));
        setSortedPlayers(sorted);

        // Delay content for dramatic effect
        setTimeout(() => setShowContent(true), 500);

        // Trigger confetti
        const duration = 4000;
        const end = Date.now() + duration;

        const frame = () => {
            confetti({
                particleCount: 3,
                angle: 60,
                spread: 55,
                origin: { x: 0 },
                colors: ['#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4']
            });
            confetti({
                particleCount: 3,
                angle: 120,
                spread: 55,
                origin: { x: 1 },
                colors: ['#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4']
            });

            if (Date.now() < end) {
                requestAnimationFrame(frame);
            }
        };
        frame();

        // Big burst after delay
        setTimeout(() => {
            confetti({
                particleCount: 100,
                spread: 100,
                origin: { y: 0.6 }
            });
        }, 300);
    }, [players, scores]);

    const getRankDisplay = (index: number) => {
        switch (index) {
            case 0:
                return (
                    <motion.div
                        animate={{ rotate: [0, 10, -10, 0], scale: [1, 1.1, 1] }}
                        transition={{ repeat: Infinity, duration: 2 }}
                        className="relative"
                    >
                        <Crown className="w-10 h-10 text-yellow-400 drop-shadow-lg" />
                        <Sparkles className="absolute -top-1 -right-1 w-4 h-4 text-yellow-300 animate-pulse" />
                    </motion.div>
                );
            case 1:
                return (
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-slate-300 to-slate-400 flex items-center justify-center shadow-lg">
                        <span className="font-bold text-slate-700">2</span>
                    </div>
                );
            case 2:
                return (
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-600 to-amber-700 flex items-center justify-center shadow-lg">
                        <span className="font-bold text-amber-100">3</span>
                    </div>
                );
            default:
                return (
                    <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center">
                        <span className="text-slate-400 font-medium">{index + 1}</span>
                    </div>
                );
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="absolute inset-0 bg-black/90 backdrop-blur-md"
            />

            <motion.div
                initial={{ scale: 0.8, opacity: 0, y: 50 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                transition={{ type: "spring", damping: 15 }}
                className="relative w-full max-w-lg overflow-hidden rounded-3xl shadow-2xl"
            >
                {/* Gradient border */}
                <div className="absolute inset-0 bg-gradient-to-br from-yellow-400 via-pink-500 to-purple-600 rounded-3xl" />

                <div className="relative m-[3px] rounded-[21px] bg-slate-900 overflow-hidden">
                    {/* Header */}
                    <div className="relative bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 p-8 text-center overflow-hidden">
                        {/* Animated stars background */}
                        <div className="absolute inset-0 overflow-hidden">
                            {[...Array(20)].map((_, i) => (
                                <motion.div
                                    key={i}
                                    initial={{ opacity: 0, scale: 0 }}
                                    animate={{ opacity: [0, 1, 0], scale: [0, 1, 0] }}
                                    transition={{
                                        repeat: Infinity,
                                        duration: 2,
                                        delay: Math.random() * 2
                                    }}
                                    className="absolute"
                                    style={{
                                        left: `${Math.random() * 100}%`,
                                        top: `${Math.random() * 100}%`
                                    }}
                                >
                                    <Star className="w-3 h-3 text-white/40" fill="currentColor" />
                                </motion.div>
                            ))}
                        </div>

                        <motion.div
                            initial={{ y: -20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.2 }}
                        >
                            <div className="relative inline-block mb-4">
                                <Trophy className="w-20 h-20 text-yellow-300 drop-shadow-2xl" />
                                <motion.div
                                    animate={{ rotate: 360 }}
                                    transition={{ repeat: Infinity, duration: 10, ease: "linear" }}
                                    className="absolute inset-0 rounded-full border-2 border-dashed border-yellow-300/30"
                                />
                            </div>
                            <h2 className="text-4xl font-black text-white uppercase tracking-wider mb-1">
                                Game Over!
                            </h2>
                            <p className="text-white/70 text-lg">Final Standings</p>
                        </motion.div>
                    </div>

                    {/* Winners List */}
                    <div className="p-6 space-y-3 max-h-[40vh] overflow-y-auto">
                        {showContent && sortedPlayers.map((player, index) => (
                            <motion.div
                                key={player.id}
                                initial={{ x: -50, opacity: 0 }}
                                animate={{ x: 0, opacity: 1 }}
                                transition={{ delay: index * 0.15 }}
                                className={clsx(
                                    "relative flex items-center justify-between p-4 rounded-2xl border transition-all",
                                    index === 0 && "bg-gradient-to-r from-yellow-500/20 to-amber-500/10 border-yellow-500/50 shadow-lg shadow-yellow-500/10",
                                    index === 1 && "bg-slate-300/10 border-slate-400/30",
                                    index === 2 && "bg-amber-600/10 border-amber-600/30",
                                    index > 2 && "bg-white/5 border-white/10"
                                )}
                            >
                                {/* Rank */}
                                <div className="flex items-center gap-4">
                                    <div className="w-12 flex justify-center">
                                        {getRankDisplay(index)}
                                    </div>
                                    <div>
                                        <p className={clsx(
                                            "font-bold text-lg",
                                            index === 0 ? "text-yellow-300" : "text-white"
                                        )}>
                                            {player.name}
                                        </p>
                                        {index === 0 && (
                                            <motion.span
                                                animate={{ opacity: [0.5, 1, 0.5] }}
                                                transition={{ repeat: Infinity, duration: 1.5 }}
                                                className="text-xs text-yellow-400 uppercase font-bold tracking-widest flex items-center gap-1"
                                            >
                                                <Sparkles className="w-3 h-3" /> Champion
                                            </motion.span>
                                        )}
                                    </div>
                                </div>

                                {/* Score */}
                                <div className="text-right">
                                    <motion.span
                                        initial={{ scale: 0 }}
                                        animate={{ scale: 1 }}
                                        transition={{ delay: index * 0.15 + 0.3, type: "spring" }}
                                        className={clsx(
                                            "text-3xl font-black",
                                            index === 0 ? "text-yellow-300" : "text-white"
                                        )}
                                    >
                                        {scores[player.id] || 0}
                                    </motion.span>
                                    <span className="text-xs text-slate-500 block uppercase tracking-wider">points</span>
                                </div>
                            </motion.div>
                        ))}
                    </div>

                    {/* Footer Actions */}
                    <div className="p-6 border-t border-white/10 bg-black/20 flex justify-center gap-4">
                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => router.push('/')}
                            className="flex items-center gap-2 px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white font-bold rounded-xl transition-all border border-slate-600"
                        >
                            <Home className="w-5 h-5" /> Home
                        </motion.button>
                        {isHost && onPlayAgain && (
                            <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={onPlayAgain}
                                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-bold rounded-xl transition-all shadow-lg shadow-indigo-500/30"
                            >
                                <RefreshCw className="w-5 h-5" /> Play Again
                            </motion.button>
                        )}
                    </div>
                </div>
            </motion.div>
        </div>
    );
}
