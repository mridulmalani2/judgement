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
        <div className="fixed inset-0 pointer-events-none flex flex-col items-center justify-start md:justify-center z-50 p-4 pt-24 md:pt-0">
            {/* No Backdrop to keep cards visible */}

            <div className="pointer-events-auto relative z-10">
                <motion.div
                    initial={{ scale: 0.9, opacity: 0, y: 20 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    className="relative overflow-hidden rounded-3xl shadow-2xl"
                >
                    {/* Gradient border effect */}
                    <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-3xl" />

                    <div className="relative m-[2px] rounded-[22px] bg-slate-900 p-8 text-center">
                        {/* Header */}
                        <div className="flex items-center justify-center gap-2 mb-2">
                            <div className="bg-indigo-500/20 p-2 rounded-full">
                                <Target className="w-6 h-6 text-indigo-400" />
                            </div>
                        </div>
                        <h2 className="text-2xl font-bold text-white mb-1">{t('betting.placeYourBet')}</h2>
                        <p className="text-slate-400 text-sm mb-8">{t('betting.howManyTricks')}</p>

                        {/* Bet Counter */}
                        <div className="flex items-center justify-center gap-6 mb-8">
                            <motion.button
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                                onClick={decrement}
                                disabled={bet === 0}
                                className={clsx(
                                    "w-16 h-16 rounded-2xl flex items-center justify-center transition-all shadow-lg border-2",
                                    bet === 0
                                        ? "bg-slate-800/50 border-slate-700 text-slate-600 cursor-not-allowed"
                                        : "bg-gradient-to-br from-slate-700 to-slate-800 border-slate-600 text-white hover:border-slate-500"
                                )}
                            >
                                <Minus className="w-7 h-7" />
                            </motion.button>

                            <motion.div
                                key={bet}
                                initial={{ scale: 0.8, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                className={clsx(
                                    "w-28 h-28 rounded-2xl flex items-center justify-center text-6xl font-bold shadow-xl border-2",
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
                                    "w-16 h-16 rounded-2xl flex items-center justify-center transition-all shadow-lg border-2",
                                    bet === maxBet
                                        ? "bg-slate-800/50 border-slate-700 text-slate-600 cursor-not-allowed"
                                        : "bg-gradient-to-br from-slate-700 to-slate-800 border-slate-600 text-white hover:border-slate-500"
                                )}
                            >
                                <Plus className="w-7 h-7" />
                            </motion.button>
                        </div>

                        {/* Quick select buttons */}
                        <div className="flex items-center justify-center gap-2 mb-6">
                            {Array.from({ length: Math.min(maxBet + 1, 6) }, (_, i) => (
                                <motion.button
                                    key={i}
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={() => setBet(i)}
                                    className={clsx(
                                        "w-10 h-10 rounded-xl text-sm font-bold transition-all border",
                                        bet === i
                                            ? "bg-indigo-500 text-white border-indigo-400 shadow-lg shadow-indigo-500/30"
                                            : i === forbiddenBet
                                                ? "bg-red-900/20 text-red-400 border-red-500/30 cursor-not-allowed"
                                                : "bg-slate-800 text-slate-300 border-slate-700 hover:border-slate-500"
                                    )}
                                    disabled={i === forbiddenBet}
                                >
                                    {i}
                                </motion.button>
                            ))}
                            {maxBet >= 6 && (
                                <span className="text-slate-500 text-sm px-2">...</span>
                            )}
                        </div>

                        {/* Forbidden bet warning */}
                        <AnimatePresence>
                            {isForbidden && (
                                <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    className="mb-6"
                                >
                                    <div className="flex items-center justify-center gap-2 text-red-400 font-medium bg-red-900/20 py-3 px-4 rounded-xl border border-red-500/30">
                                        <AlertTriangle className="w-4 h-4" />
                                        <span>{t('betting.cantBet', { bet: forbiddenBet })}</span>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Submit Button */}
                        <motion.button
                            whileHover={{ scale: isForbidden ? 1 : 1.02 }}
                            whileTap={{ scale: isForbidden ? 1 : 0.98 }}
                            onClick={() => onPlaceBet(bet)}
                            disabled={isForbidden}
                            className={clsx(
                                "w-full py-4 text-lg font-bold rounded-2xl transition-all flex items-center justify-center gap-2 shadow-xl",
                                isForbidden
                                    ? "bg-slate-700 text-slate-500 cursor-not-allowed"
                                    : "bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white hover:shadow-indigo-500/30"
                            )}
                        >
                            <Lock className="w-5 h-5" />
                            <span>{t('betting.lockInBet')}</span>
                        </motion.button>
                    </div>
                </motion.div>
            </div>
        </div>
    );
}
