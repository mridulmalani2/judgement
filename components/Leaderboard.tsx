import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Trophy, Medal, Crown, Home } from 'lucide-react';
import { Player } from '../lib/types';
import { useRouter } from 'next/router';
import confetti from 'canvas-confetti';

interface LeaderboardProps {
    players: Player[];
    scores: { [playerId: string]: number };
    onPlayAgain?: () => void;
    isHost?: boolean;
}

export default function Leaderboard({ players, scores, onPlayAgain, isHost }: LeaderboardProps) {
    const router = useRouter();
    const [sortedPlayers, setSortedPlayers] = useState<Player[]>([]);

    useEffect(() => {
        // Sort players by score descending
        const sorted = [...players].sort((a, b) => (scores[b.id] || 0) - (scores[a.id] || 0));
        setSortedPlayers(sorted);

        // Trigger confetti
        const duration = 3000;
        const end = Date.now() + duration;

        const frame = () => {
            confetti({
                particleCount: 2,
                angle: 60,
                spread: 55,
                origin: { x: 0 },
                colors: ['#7F9CF5', '#F472B6', '#FBBF24']
            });
            confetti({
                particleCount: 2,
                angle: 120,
                spread: 55,
                origin: { x: 1 },
                colors: ['#7F9CF5', '#F472B6', '#FBBF24']
            });

            if (Date.now() < end) {
                requestAnimationFrame(frame);
            }
        };
        frame();
    }, [players, scores]);

    const getRankIcon = (index: number) => {
        switch (index) {
            case 0: return <Crown className="w-8 h-8 text-yellow-400 fill-yellow-400 animate-bounce" />;
            case 1: return <Medal className="w-6 h-6 text-slate-300 fill-slate-300" />;
            case 2: return <Medal className="w-6 h-6 text-amber-600 fill-amber-600" />;
            default: return <span className="text-slate-500 font-bold">#{index + 1}</span>;
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
            <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="bg-slate-900 border border-white/10 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl relative"
            >
                {/* Header */}
                <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-8 text-center relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-full bg-[url('/bg-texture.png')] opacity-20"></div>
                    <Trophy className="w-16 h-16 text-yellow-300 mx-auto mb-4 drop-shadow-lg" />
                    <h2 className="text-3xl font-black text-white uppercase tracking-wider">Game Over</h2>
                    <p className="text-indigo-200">Final Standings</p>
                </div>

                {/* List */}
                <div className="p-6 space-y-4 max-h-[50vh] overflow-y-auto">
                    {sortedPlayers.map((player, index) => (
                        <motion.div
                            key={player.id}
                            initial={{ x: -20, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            transition={{ delay: index * 0.1 }}
                            className={`flex items-center justify-between p-4 rounded-xl border ${index === 0
                                ? 'bg-yellow-500/10 border-yellow-500/50 shadow-[0_0_15px_rgba(234,179,8,0.2)]'
                                : 'bg-white/5 border-white/5'
                                }`}
                        >
                            <div className="flex items-center gap-4">
                                <div className="w-10 flex justify-center">
                                    {getRankIcon(index)}
                                </div>
                                <div>
                                    <p className={`font-bold text-lg ${index === 0 ? 'text-yellow-400' : 'text-white'}`}>
                                        {player.name}
                                    </p>
                                    {index === 0 && <span className="text-xs text-yellow-500/80 uppercase font-bold tracking-wider">Winner</span>}
                                </div>
                            </div>
                            <div className="text-right">
                                <span className="text-2xl font-black text-white">{scores[player.id] || 0}</span>
                                <span className="text-xs text-slate-500 block">PTS</span>
                            </div>
                        </motion.div>
                    ))}
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-white/10 bg-white/5 flex justify-center gap-4">
                    <button
                        onClick={() => router.push('/')}
                        className="flex items-center gap-2 px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white font-bold rounded-xl transition-all"
                    >
                        <Home className="w-5 h-5" /> Back to Home
                    </button>
                    {isHost && onPlayAgain && (
                        <button
                            onClick={onPlayAgain}
                            className="flex items-center gap-2 px-6 py-3 bg-primary hover:bg-primary/90 text-white font-bold rounded-xl transition-all shadow-lg shadow-primary/20"
                        >
                            <Trophy className="w-5 h-5" /> Play Again
                        </button>
                    )}
                </div>
            </motion.div>
        </div>
    );
}
