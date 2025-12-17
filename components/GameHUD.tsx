import React, { useState } from 'react';
import { Player, Suit } from '../lib/types';
import { Crown, Zap, Info, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import clsx from 'clsx';
import { useTranslation } from 'react-i18next';

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
                    className="bg-black/70 backdrop-blur-md rounded-2xl px-6 py-2 text-white border border-white/10 shadow-xl flex items-center gap-4"
                >
                    {/* Round Badge */}
                    <div className="flex items-center gap-2">
                        <div className="bg-gradient-to-r from-indigo-500 to-purple-500 text-white text-xs font-bold px-2.5 py-1 rounded-full">
                            {t('hud.round')}
                        </div>
                        <span className="text-2xl font-bold text-white">{currentRound}</span>
                    </div>

                    <div className="w-px h-8 bg-white/20"></div>

                    {/* Trump Display */}
                    <div className="flex items-center gap-2">
                        <Zap className="w-4 h-4 text-yellow-400" />
                        <span className="text-xs text-slate-400 font-medium uppercase tracking-wider">{t('hud.trump')}</span>
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

            {/* Mobile Toggle Button */}
            <div className="md:hidden fixed top-[4.5rem] right-4 z-30">
                <button
                    onClick={() => setIsOpen(true)}
                    className="bg-black/40 backdrop-blur-md p-2 rounded-full border border-white/10 text-white shadow-lg hover:bg-white/10 transition-colors"
                >
                    <Info className="w-6 h-6" />
                </button>
            </div>

            {/* Mobile Drawer */}
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
                            initial={{ x: '100%' }}
                            animate={{ x: 0 }}
                            exit={{ x: '100%' }}
                            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                            className="fixed top-0 right-0 bottom-0 w-3/4 max-w-sm bg-slate-900 border-l border-white/10 z-50 md:hidden shadow-2xl flex flex-col"
                        >
                            <div className="p-4 border-b border-white/10 flex justify-between items-center bg-black/20">
                                <h2 className="font-bold text-white text-lg">{t('hud.gameInfo')}</h2>
                                <button onClick={() => setIsOpen(false)} className="p-1 hover:bg-white/10 rounded-full text-white">
                                    <X className="w-6 h-6" />
                                </button>
                            </div>

                            <div className="p-4 space-y-6">
                                <div className="bg-white/5 rounded-xl p-4 space-y-4">
                                    <div className="flex justify-between items-center border-b border-white/10 pb-2">
                                        <span className="text-slate-400">{t('hud.round')}</span>
                                        <span className="font-bold text-white text-xl">{currentRound}</span>
                                    </div>
                                    <div className="flex justify-between items-center border-b border-white/10 pb-2">
                                        <span className="text-slate-400">{t('hud.trump')}</span>
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm text-slate-500 capitalize">{trump}</span>
                                            <div className={clsx(
                                                "px-3 py-1 rounded-lg font-bold text-xl",
                                                trumpData.bgColor,
                                                trumpData.color
                                            )}>
                                                {trumpData.symbol}
                                            </div>
                                        </div>
                                    </div>
                                    {dealerName && (
                                        <div className="flex justify-between items-center pt-1 text-yellow-400">
                                            <span className="flex items-center gap-2"><Crown className="w-4 h-4" /> Dealer</span>
                                            <span className="font-bold">{dealerName}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </>
    );
}
