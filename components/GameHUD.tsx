import React, { useState } from 'react';
import { Player, Suit } from '../lib/types';
import { Crown, Zap, Info, X, Hash } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import clsx from 'clsx';
import { useTranslation } from 'react-i18next';

interface GameHUDProps {
    players: Player[];
    currentRound: number;
    trump: Suit;
    dealerName?: string;
}

const suitInfo: Record<Suit, { symbol: string; color: string; bgColor: string; name: string }> = {
    spades: { symbol: '♠', color: 'text-slate-100', bgColor: 'bg-slate-700', name: 'Spades' },
    hearts: { symbol: '♥', color: 'text-red-400', bgColor: 'bg-red-500/30', name: 'Hearts' },
    diamonds: { symbol: '♦', color: 'text-red-400', bgColor: 'bg-red-500/30', name: 'Diamonds' },
    clubs: { symbol: '♣', color: 'text-slate-100', bgColor: 'bg-slate-700', name: 'Clubs' }
};

export default function GameHUD({ players, currentRound, trump, dealerName }: GameHUDProps) {
    const [isOpen, setIsOpen] = useState(false);
    const { t } = useTranslation('common');
    const trumpData = suitInfo[trump];

    return (
        <>
            {/* Desktop View (Floating Pill) */}
            <div className="hidden md:flex fixed top-20 left-0 right-0 flex-col items-center pointer-events-none z-10 space-y-2 px-4">
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-black/80 backdrop-blur-md rounded-2xl px-6 py-3 text-white border border-white/10 shadow-xl flex items-center gap-4"
                >
                    {/* Round Badge */}
                    <div className="flex items-center gap-2">
                        <div className="bg-gradient-to-r from-indigo-500 to-purple-500 text-white text-xs font-bold px-2.5 py-1 rounded-full">
                            {t('hud.round')}
                        </div>
                        <span className="text-2xl font-bold text-white">{currentRound}</span>
                    </div>

                    <div className="w-px h-8 bg-white/20"></div>

                    {/* Trump Display - More prominent */}
                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1.5">
                            <Zap className="w-4 h-4 text-yellow-400" />
                            <span className="text-xs text-slate-400 font-medium uppercase tracking-wider">{t('hud.trump')}</span>
                        </div>
                        <div className={clsx(
                            "px-4 py-1.5 rounded-xl font-bold text-2xl flex items-center gap-2 border",
                            trumpData.bgColor,
                            trumpData.color,
                            trump === 'hearts' || trump === 'diamonds' ? 'border-red-500/30' : 'border-slate-500/30'
                        )}>
                            <span>{trumpData.symbol}</span>
                            <span className="text-sm font-medium opacity-80">{trumpData.name}</span>
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

            {/* Mobile: Always Visible Compact HUD Bar */}
            <div className="md:hidden fixed top-[4rem] left-0 right-0 z-20 px-3">
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-black/80 backdrop-blur-md rounded-xl px-3 py-2 flex items-center justify-between border border-white/10 shadow-lg"
                >
                    {/* Round Number */}
                    <div className="flex items-center gap-1.5">
                        <div className="bg-indigo-500/30 text-indigo-300 text-xs font-bold px-2 py-0.5 rounded-md flex items-center gap-1">
                            <Hash className="w-3 h-3" />
                            <span>{currentRound}</span>
                        </div>
                    </div>

                    {/* Trump - Prominent Center Display */}
                    <div className="flex items-center gap-2">
                        <Zap className="w-3.5 h-3.5 text-yellow-400" />
                        <div className={clsx(
                            "px-3 py-1 rounded-lg font-bold text-xl flex items-center gap-1.5 border",
                            trumpData.bgColor,
                            trumpData.color,
                            trump === 'hearts' || trump === 'diamonds' ? 'border-red-500/40' : 'border-slate-500/40'
                        )}>
                            <span>{trumpData.symbol}</span>
                            <span className="text-xs font-semibold opacity-80">{trumpData.name}</span>
                        </div>
                    </div>

                    {/* Info Button for More Details */}
                    <button
                        onClick={() => setIsOpen(true)}
                        className="p-1.5 hover:bg-white/10 rounded-lg transition-colors text-slate-400"
                    >
                        <Info className="w-5 h-5" />
                    </button>
                </motion.div>
            </div>

            {/* Mobile Drawer for Additional Info */}
            <AnimatePresence>
                {isOpen && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsOpen(false)}
                            className="fixed inset-0 bg-black/60 z-40 md:hidden backdrop-blur-sm"
                        />
                        <motion.div
                            initial={{ y: '100%' }}
                            animate={{ y: 0 }}
                            exit={{ y: '100%' }}
                            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                            className="fixed bottom-0 left-0 right-0 bg-slate-900/95 backdrop-blur-xl border-t border-white/10 z-50 md:hidden shadow-2xl rounded-t-3xl max-h-[60vh]"
                        >
                            {/* Drag Handle */}
                            <div className="flex justify-center pt-3 pb-2">
                                <div className="w-10 h-1 bg-white/20 rounded-full" />
                            </div>

                            <div className="px-4 pb-2 flex justify-between items-center">
                                <h2 className="font-bold text-white text-lg">{t('hud.gameInfo')}</h2>
                                <button
                                    onClick={() => setIsOpen(false)}
                                    className="p-2 hover:bg-white/10 rounded-full text-slate-400 transition-colors"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <div className="p-4 pt-2 space-y-3 overflow-y-auto">
                                {/* Trump Card - Featured */}
                                <div className={clsx(
                                    "rounded-2xl p-4 flex items-center justify-between border",
                                    trumpData.bgColor,
                                    trump === 'hearts' || trump === 'diamonds' ? 'border-red-500/30' : 'border-slate-500/30'
                                )}>
                                    <div className="flex items-center gap-3">
                                        <Zap className="w-5 h-5 text-yellow-400" />
                                        <div>
                                            <div className="text-xs text-slate-400 uppercase tracking-wider">{t('hud.trump')}</div>
                                            <div className={clsx("font-bold text-lg", trumpData.color)}>{trumpData.name}</div>
                                        </div>
                                    </div>
                                    <div className={clsx("text-5xl font-bold", trumpData.color)}>
                                        {trumpData.symbol}
                                    </div>
                                </div>

                                {/* Stats Grid */}
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="bg-white/5 rounded-xl p-3 border border-white/5">
                                        <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">{t('hud.round')}</div>
                                        <div className="font-bold text-white text-2xl">{currentRound}</div>
                                    </div>
                                    {dealerName && (
                                        <div className="bg-yellow-500/10 rounded-xl p-3 border border-yellow-500/20">
                                            <div className="text-xs text-yellow-400/70 uppercase tracking-wider mb-1 flex items-center gap-1">
                                                <Crown className="w-3 h-3" />
                                                Dealer
                                            </div>
                                            <div className="font-bold text-yellow-300 text-lg truncate">{dealerName}</div>
                                        </div>
                                    )}
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
