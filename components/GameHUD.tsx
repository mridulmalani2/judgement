import React from 'react';
import { Player, Suit } from '../lib/types';
import { Crown, Zap } from 'lucide-react';
import { motion } from 'framer-motion';
import clsx from 'clsx';

interface GameHUDProps {
    players: Player[];
    currentRound: number;
    trump: Suit;
    dealerName?: string;
}

const suitInfo: Record<Suit, { symbol: string; color: string; bgColor: string }> = {
    spades: { symbol: '♠', color: 'text-slate-100', bgColor: 'bg-slate-700' },
    hearts: { symbol: '♥', color: 'text-red-500', bgColor: 'bg-red-500/20' },
    diamonds: { symbol: '♦', color: 'text-red-500', bgColor: 'bg-red-500/20' },
    clubs: { symbol: '♣', color: 'text-slate-100', bgColor: 'bg-slate-700' }
};

export default function GameHUD({ players, currentRound, trump, dealerName }: GameHUDProps) {
    const trumpData = suitInfo[trump];

    return (
        <div className="fixed top-20 left-0 right-0 flex flex-col items-center pointer-events-none z-10 space-y-2 px-4">
            {/* Main Round Info Bar */}
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-black/70 backdrop-blur-md rounded-2xl px-6 py-2 text-white border border-white/10 shadow-xl flex items-center gap-4"
            >
                {/* Round Badge */}
                <div className="flex items-center gap-2">
                    <div className="bg-gradient-to-r from-indigo-500 to-purple-500 text-white text-xs font-bold px-2.5 py-1 rounded-full">
                        ROUND
                    </div>
                    <span className="text-2xl font-bold text-white">{currentRound}</span>
                </div>

                <div className="w-px h-8 bg-white/20"></div>

                {/* Trump Display */}
                <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-yellow-400" />
                    <span className="text-xs text-slate-400 font-medium uppercase tracking-wider">Trump</span>
                    <div className={clsx(
                        "px-3 py-1 rounded-lg font-bold text-xl",
                        trumpData.bgColor,
                        trumpData.color
                    )}>
                        {trumpData.symbol}
                    </div>
                </div>

                {/* Dealer */}
                {dealerName && (
                    <>
                        <div className="w-px h-8 bg-white/20"></div>
                        <div className="flex items-center gap-2">
                            <Crown className="w-4 h-4 text-yellow-400" />
                            <span className="text-sm font-medium text-yellow-300">{dealerName}</span>
                        </div>
                    </>
                )}
            </motion.div>
        </div>
    );
}
