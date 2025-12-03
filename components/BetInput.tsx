import { useState } from 'react';
import { X, Check, Lock, Minus, Plus } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface BetInputProps {
    maxBet: number;
    forbiddenBet?: number;
    onPlaceBet: (bet: number) => void;
}

export default function BetInput({ maxBet, forbiddenBet, onPlaceBet }: BetInputProps) {
    const [bet, setBet] = useState(0);

    const increment = () => setBet(prev => Math.min(prev + 1, maxBet));
    const decrement = () => setBet(prev => Math.max(prev - 1, 0));

    const isForbidden = bet === forbiddenBet;

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="glass-panel p-8 w-full max-w-sm text-center border-t border-white/10"
            >
                <h2 className="text-3xl font-bold text-white mb-2">Place Your Bet</h2>
                <p className="text-slate-400 mb-8">How many hands will you win?</p>

                <div className="flex items-center justify-center space-x-8 mb-8">
                    <button
                        onClick={decrement}
                        className="w-16 h-16 rounded-full bg-slate-800 text-white flex items-center justify-center hover:bg-slate-700 active:scale-95 transition-all shadow-lg border border-slate-600"
                    >
                        <Minus className="w-8 h-8" />
                    </button>

                    <div className="text-7xl font-bold text-transparent bg-clip-text bg-gradient-to-b from-white to-slate-400 w-32 font-mono">
                        {bet}
                    </div>

                    <button
                        onClick={increment}
                        className="w-16 h-16 rounded-full bg-slate-800 text-white flex items-center justify-center hover:bg-slate-700 active:scale-95 transition-all shadow-lg border border-slate-600"
                    >
                        <Plus className="w-8 h-8" />
                    </button>
                </div>

                <AnimatePresence>
                    {isForbidden && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="text-rose-400 mb-6 font-bold bg-rose-900/20 py-2 rounded-lg border border-rose-500/30"
                        >
                            Cannot bet {forbiddenBet} (Total ≠ Hands)
                        </motion.div>
                    )}
                </AnimatePresence>

                <button
                    onClick={() => onPlaceBet(bet)}
                    disabled={isForbidden}
                    className="w-full py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-xl font-bold rounded-2xl hover:shadow-lg hover:shadow-indigo-500/30 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 shadow-xl"
                >
                    <Lock className="w-5 h-5" />
                    <span>Lock Bet</span>
                </button>
            </motion.div>
        </div>
    );
}
