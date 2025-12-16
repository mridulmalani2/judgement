import { Player } from '../lib/types';
import clsx from 'clsx';
import { User, Crown, UserX, Target, Trophy, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';
import DealerButton from './DealerButton';

interface PlayerSeatProps {
    player: Player;
    isDealer: boolean;
    isCurrentTurn: boolean;
    isMe: boolean;
    position?: 'top' | 'bottom' | 'left' | 'right' | string;
    className?: string;
}

export default function PlayerSeat({ player, isDealer, isCurrentTurn, isMe, position, className }: PlayerSeatProps) {
    const positionClass = position === 'bottom' ? 'scale-110' : 'scale-100';

    // Calculate if player is on track to meet their bet
    const isOnTrack = player.currentBet !== null && player.tricksWon === player.currentBet;
    const isOver = player.currentBet !== null && player.tricksWon > player.currentBet;
    const isUnder = player.currentBet !== null && player.tricksWon < player.currentBet;

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: player.connected ? 1 : 0.5, scale: 1 }}
            className={clsx(
                "relative flex flex-col items-center p-3 rounded-2xl transition-all duration-300",
                isCurrentTurn ? "bg-gradient-to-b from-yellow-500/20 to-amber-600/10 border-2 border-yellow-400/50 shadow-[0_0_30px_rgba(250,204,21,0.3)]" : "glass-panel bg-black/30",
                !player.connected && "grayscale opacity-60",
                positionClass,
                className
            )}
        >
            {/* Current Turn Glow */}
            {isCurrentTurn && (
                <motion.div
                    animate={{ opacity: [0.5, 1, 0.5] }}
                    transition={{ repeat: Infinity, duration: 2 }}
                    className="absolute -inset-1 rounded-2xl bg-yellow-400/20 blur-xl -z-10"
                />
            )}

            {/* Avatar */}
            <div className="relative">
                <motion.div
                    animate={isCurrentTurn ? { scale: [1, 1.05, 1] } : {}}
                    transition={{ repeat: Infinity, duration: 1.5 }}
                    className={clsx(
                        "w-14 h-14 md:w-16 md:h-16 rounded-full flex items-center justify-center overflow-hidden border-3 shadow-lg",
                        isMe
                            ? "bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 border-white/50"
                            : "bg-gradient-to-br from-slate-600 to-slate-700 border-slate-400/50"
                    )}
                >
                    <User className="w-8 h-8 text-white/90" />
                </motion.div>

                {/* Host Crown */}
                {player.isHost && (
                    <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="absolute -top-2 -right-2 bg-gradient-to-r from-yellow-400 to-amber-500 rounded-full p-1.5 shadow-lg shadow-yellow-500/30"
                    >
                        <Crown className="w-3 h-3 text-black" />
                    </motion.div>
                )}

                {/* Dealer Button */}
                {isDealer && (
                    <div className="absolute -bottom-2 -right-2">
                        <DealerButton />
                    </div>
                )}

                {/* Away Status */}
                {player.isAway && (
                    <div className="absolute -top-2 -left-2 bg-slate-600 rounded-full p-1 shadow-md" title="Away">
                        <UserX className="w-3 h-3 text-white" />
                    </div>
                )}
            </div>

            {/* Bet Badge - Floating */}
            {player.currentBet !== null && (
                <motion.div
                    initial={{ scale: 0, y: 10 }}
                    animate={{ scale: 1, y: 0 }}
                    className="absolute -top-3 -right-4 z-20"
                >
                    <div className="relative">
                        <div className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-bold text-base px-3 py-1.5 rounded-xl shadow-lg shadow-indigo-500/30 border border-white/20 flex items-center gap-1">
                            <Target className="w-3 h-3" />
                            {player.currentBet}
                        </div>
                    </div>
                </motion.div>
            )}

            {/* Player Info */}
            <div className="mt-3 text-center w-full">
                <div className="font-bold text-white text-sm md:text-base truncate max-w-[100px] md:max-w-[120px] flex items-center justify-center gap-1">
                    {player.name}
                    {isMe && (
                        <span className="text-xs text-indigo-300 font-normal">(You)</span>
                    )}
                </div>

                {/* Stats Row */}
                <div className="flex items-center justify-center gap-2 mt-2">
                    {/* Total Points */}
                    <div className="flex items-center gap-1 bg-yellow-500/20 text-yellow-300 px-2 py-0.5 rounded-full text-xs font-medium">
                        <Trophy className="w-3 h-3" />
                        {player.totalPoints}
                    </div>

                    {/* Tricks Progress */}
                    {player.currentBet !== null && (
                        <div className={clsx(
                            "flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold border",
                            isOnTrack && "bg-green-500/20 border-green-500/50 text-green-300",
                            isOver && "bg-red-500/20 border-red-500/50 text-red-300",
                            isUnder && "bg-amber-500/20 border-amber-500/50 text-amber-300"
                        )}>
                            {isOnTrack && <Sparkles className="w-3 h-3" />}
                            <span>{player.tricksWon}</span>
                            <span className="opacity-60">/</span>
                            <span>{player.currentBet}</span>
                        </div>
                    )}
                </div>
            </div>
        </motion.div>
    );
}
