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
    const isBottom = position === 'bottom';

    // Calculate if player is on track to meet their bet
    const isOnTrack = player.currentBet !== null && player.tricksWon === player.currentBet;
    const isOver = player.currentBet !== null && player.tricksWon > player.currentBet;
    const isUnder = player.currentBet !== null && player.tricksWon < player.currentBet;

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: player.connected ? 1 : 0.5, scale: 1 }}
            className={clsx(
                "relative flex items-center gap-2 md:gap-3 p-2 md:p-3 rounded-xl md:rounded-2xl transition-all duration-200",
                isCurrentTurn
                    ? "bg-gradient-to-r from-yellow-500/20 to-amber-500/10 border border-yellow-400/50 shadow-lg shadow-yellow-500/20"
                    : "bg-black/40 backdrop-blur-sm border border-white/10",
                !player.connected && "grayscale opacity-50",
                isBottom && "flex-row-reverse",
                className
            )}
        >
            {/* Current Turn Indicator */}
            {isCurrentTurn && (
                <motion.div
                    animate={{ opacity: [0.3, 0.6, 0.3] }}
                    transition={{ repeat: Infinity, duration: 1.5 }}
                    className="absolute -inset-0.5 rounded-xl md:rounded-2xl bg-yellow-400/30 blur-md -z-10"
                />
            )}

            {/* Avatar Section */}
            <div className="relative flex-shrink-0">
                <motion.div
                    animate={isCurrentTurn ? { scale: [1, 1.03, 1] } : {}}
                    transition={{ repeat: Infinity, duration: 1.5 }}
                    className={clsx(
                        "w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center overflow-hidden border-2 shadow-md",
                        isMe
                            ? "bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 border-white/40"
                            : "bg-gradient-to-br from-slate-600 to-slate-700 border-slate-500/40"
                    )}
                >
                    <User className="w-5 h-5 md:w-6 md:h-6 text-white/90" />
                </motion.div>

                {/* Host Crown */}
                {player.isHost && (
                    <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="absolute -top-1 -right-1 bg-gradient-to-r from-yellow-400 to-amber-500 rounded-full p-1 shadow-md"
                    >
                        <Crown className="w-2.5 h-2.5 text-black" />
                    </motion.div>
                )}

                {/* Dealer Button */}
                {isDealer && (
                    <div className="absolute -bottom-1 -right-1">
                        <DealerButton />
                    </div>
                )}

                {/* Away Status */}
                {player.isAway && (
                    <div className="absolute -top-1 -left-1 bg-slate-600 rounded-full p-0.5 shadow-md" title="Away">
                        <UserX className="w-2.5 h-2.5 text-white" />
                    </div>
                )}
            </div>

            {/* Player Info Section */}
            <div className={clsx("flex flex-col min-w-0", isBottom ? "items-end" : "items-start")}>
                {/* Name Row */}
                <div className="flex items-center gap-1.5">
                    <span className={clsx(
                        "font-semibold text-white text-xs md:text-sm truncate max-w-[70px] md:max-w-[100px]",
                        isCurrentTurn && "text-yellow-100"
                    )}>
                        {player.name}
                    </span>
                    {isMe && (
                        <span className="text-[10px] text-indigo-300 bg-indigo-500/20 px-1 py-0.5 rounded">You</span>
                    )}
                </div>

                {/* Stats Row */}
                <div className={clsx("flex items-center gap-1.5 mt-1", isBottom && "flex-row-reverse")}>
                    {/* Total Points */}
                    <div className="flex items-center gap-0.5 bg-yellow-500/20 text-yellow-300 px-1.5 py-0.5 rounded text-[10px] md:text-xs font-medium">
                        <Trophy className="w-2.5 h-2.5 md:w-3 md:h-3" />
                        <span>{player.totalPoints}</span>
                    </div>

                    {/* Bet & Tricks Progress */}
                    {player.currentBet !== null && (
                        <div className={clsx(
                            "flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] md:text-xs font-bold",
                            isOnTrack && "bg-green-500/20 text-green-300",
                            isOver && "bg-red-500/20 text-red-300",
                            isUnder && "bg-amber-500/20 text-amber-300"
                        )}>
                            {isOnTrack && <Sparkles className="w-2.5 h-2.5" />}
                            <Target className="w-2.5 h-2.5 opacity-60" />
                            <span>{player.tricksWon}/{player.currentBet}</span>
                        </div>
                    )}
                </div>
            </div>
        </motion.div>
    );
}
