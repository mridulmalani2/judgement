import { useState } from 'react';
import { Lock, Minus, Plus, Target, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import clsx from 'clsx';
import { useTranslation } from 'react-i18next';

interface BetInputProps {
    maxBet: number;
    forbiddenBet?: number;
    onPlaceBet: (bet: number) => void;
}

export default function BetInput({ maxBet, forbiddenBet, onPlaceBet }: BetInputProps) {
    const { t } = useTranslation('common');
    const [bet, setBet] = useState(0);

    const increment = () => setBet(prev => Math.min(prev + 1, maxBet));
    const decrement = () => setBet(prev => Math.max(prev - 1, 0));

    const isForbidden = bet === forbiddenBet;

    return (
        <div className="fixed inset-x-0 top-16 md:top-auto md:inset-0 pointer-events-none flex flex-col items-center justify-start md:justify-center z-40 p-3 md:p-4">
            {/* Subtle backdrop for desktop only */}
            <div className="hidden md:block fixed inset-0 bg-black/20 pointer-events-none" />

            <div className="pointer-events-auto relative z-10 w-full max-w-sm md:max-w-md">
                <motion.div
                    initial={{ scale: 0.9, opacity: 0, y: -20 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    className="relative overflow-hidden rounded-2xl md:rounded-3xl shadow-2xl"
                >
                    {/* Gradient border effect */}
                    <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-2xl md:rounded-3xl" />

                    <div className="relative m-[2px] rounded-[14px] md:rounded-[22px] bg-slate-900/98 backdrop-blur-xl p-4 md:p-6 text-center">
                        {/* Compact Header */}
                        <div className="flex items-center justify-center gap-2 mb-1">
                            <div className="bg-indigo-500/20 p-1.5 rounded-full">
                                <Target className="w-4 h-4 md:w-5 md:h-5 text-indigo-400" />
                            </div>
                            <h2 className="text-lg md:text-xl font-bold text-white">{t('betting.placeYourBet')}</h2>
                        </div>
                        <p className="text-slate-400 text-xs md:text-sm mb-4">{t('betting.howManyTricks')}</p>

                        {/* Compact Bet Counter */}
                        <div className="flex items-center justify-center gap-3 md:gap-5 mb-4">
                            <motion.button
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                                onClick={decrement}
                                disabled={bet === 0}
                                className={clsx(
                                    "w-12 h-12 md:w-14 md:h-14 rounded-xl md:rounded-2xl flex items-center justify-center transition-all shadow-lg border-2",
                                    bet === 0
                                        ? "bg-slate-800/50 border-slate-700 text-slate-600 cursor-not-allowed"
                                        : "bg-gradient-to-br from-slate-700 to-slate-800 border-slate-600 text-white hover:border-slate-500 active:scale-95"
                                )}
                            >
                                <Minus className="w-5 h-5 md:w-6 md:h-6" />
                            </motion.button>

                            <motion.div
                                key={bet}
                                initial={{ scale: 0.8, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                className={clsx(
                                    "w-20 h-20 md:w-24 md:h-24 rounded-xl md:rounded-2xl flex items-center justify-center text-4xl md:text-5xl font-bold shadow-xl border-2",
                                    isForbidden
                                        ? "bg-red-900/30 border-red-500/50 text-red-400"
                                        : "bg-gradient-to-br from-slate-800 to-slate-900 border-slate-600 text-white"
                                )}
                            >
                                {bet}
                            </motion.div>

                            <motion.button
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                                onClick={increment}
                                disabled={bet === maxBet}
                                className={clsx(
                                    "w-12 h-12 md:w-14 md:h-14 rounded-xl md:rounded-2xl flex items-center justify-center transition-all shadow-lg border-2",
                                    bet === maxBet
                                        ? "bg-slate-800/50 border-slate-700 text-slate-600 cursor-not-allowed"
                                        : "bg-gradient-to-br from-slate-700 to-slate-800 border-slate-600 text-white hover:border-slate-500 active:scale-95"
                                )}
                            >
                                <Plus className="w-5 h-5 md:w-6 md:h-6" />
                            </motion.button>
                        </div>

                        {/* Quick select buttons - scrollable on mobile */}
                        <div className="flex items-center justify-center gap-1.5 md:gap-2 mb-3 md:mb-4 overflow-x-auto no-scrollbar px-1">
                            {Array.from({ length: Math.min(maxBet + 1, 8) }, (_, i) => (
                                <motion.button
                                    key={i}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={() => setBet(i)}
                                    className={clsx(
                                        "w-9 h-9 md:w-10 md:h-10 rounded-lg md:rounded-xl text-sm font-bold transition-all border flex-shrink-0",
                                        bet === i
                                            ? "bg-indigo-500 text-white border-indigo-400 shadow-lg shadow-indigo-500/30"
                                            : i === forbiddenBet
                                                ? "bg-red-900/20 text-red-400 border-red-500/30"
                                                : "bg-slate-800 text-slate-300 border-slate-700 hover:border-slate-500 active:bg-slate-700"
                                    )}
                                    disabled={i === forbiddenBet}
                                >
                                    {i}
                                </motion.button>
                            ))}
                            {maxBet >= 8 && (
                                <span className="text-slate-500 text-xs px-1">+{maxBet - 7}</span>
                            )}
                        </div>

                        {/* Forbidden bet warning - compact */}
                        <AnimatePresence>
                            {isForbidden && (
                                <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    className="mb-3"
                                >
                                    <div className="flex items-center justify-center gap-2 text-red-400 font-medium bg-red-900/20 py-2 px-3 rounded-lg border border-red-500/30 text-sm">
                                        <AlertTriangle className="w-4 h-4" />
                                        <span>{t('betting.cantBet', { bet: forbiddenBet })}</span>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Submit Button */}
                        <motion.button
                            whileTap={{ scale: isForbidden ? 1 : 0.98 }}
                            onClick={() => onPlaceBet(bet)}
                            disabled={isForbidden}
                            className={clsx(
                                "w-full py-3 md:py-4 text-base md:text-lg font-bold rounded-xl md:rounded-2xl transition-all flex items-center justify-center gap-2 shadow-xl",
                                isForbidden
                                    ? "bg-slate-700 text-slate-500 cursor-not-allowed"
                                    : "bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white active:opacity-90"
                            )}
                        >
                            <Lock className="w-4 h-4 md:w-5 md:h-5" />
                            <span>{t('betting.lockInBet')}</span>
                        </motion.button>
                    </div>
                </motion.div>
            </div>
        </div>
    );
}
