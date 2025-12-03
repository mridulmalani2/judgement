import { Player } from '../lib/types';
import clsx from 'clsx';
import { User, Crown, Gavel } from 'lucide-react';
import { motion } from 'framer-motion';

interface PlayerSeatProps {
    player: Player;
    isDealer: boolean;
    isCurrentTurn: boolean;
    isMe: boolean;
    position: 'bottom' | 'left' | 'top' | 'right' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
}

export default function PlayerSeat({ player, isDealer, isCurrentTurn, isMe, position }: PlayerSeatProps) {
    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: player.connected ? 1 : 0.5, scale: 1 }}
            className={clsx(
                "flex flex-col items-center p-3 rounded-2xl transition-all duration-300 relative glass-panel",
                isCurrentTurn ? "ring-2 ring-yellow-400 bg-white/10 shadow-[0_0_20px_rgba(250,204,21,0.3)]" : "bg-black/20",
                !player.connected && "grayscale"
            )}
        >
            <div className="relative">
                <div className={clsx(
                    "w-14 h-14 md:w-16 md:h-16 rounded-full flex items-center justify-center overflow-hidden border-2 shadow-lg",
                    isMe ? "bg-gradient-to-br from-indigo-500 to-purple-600 border-white" : "bg-slate-700 border-slate-500"
                )}>
                    <User className="w-8 h-8 text-white/90" />
                </div>

                {player.isHost && (
                    <div className="absolute -top-2 -right-2 bg-yellow-500 rounded-full p-1 shadow-md" title="Host">
                        <Crown className="w-3 h-3 text-black" />
                    </div>
                )}

                {isDealer && (
                    <div className="absolute -bottom-2 -right-2 bg-white rounded-full w-6 h-6 flex items-center justify-center border border-slate-300 shadow-sm" title="Dealer">
                        <span className="text-xs font-bold text-black">D</span>
                    </div>
                )}
            </div>

            <div className="mt-2 text-center w-full">
                <div className="font-bold text-white text-sm md:text-base truncate max-w-[100px] md:max-w-[120px]">
                    {player.name} {isMe && "(You)"}
                </div>

                <div className="flex flex-col items-center mt-1 space-y-1">
                    <div className="text-xs text-slate-300 font-medium bg-black/30 px-2 py-0.5 rounded-full">
                        {player.totalPoints} pts
                    </div>

                    {player.currentBet !== null && (
                        <div className={clsx(
                            "text-xs font-bold px-2 py-0.5 rounded-full border",
                            player.tricksWon === player.currentBet ? "bg-green-500/20 border-green-500 text-green-300" :
                                player.tricksWon > player.currentBet ? "bg-red-500/20 border-red-500 text-red-300" :
                                    "bg-yellow-500/20 border-yellow-500 text-yellow-300"
                        )}>
                            {player.tricksWon} / {player.currentBet}
                        </div>
                    )}
                </div>
            </div>
        </motion.div>
    );
}
