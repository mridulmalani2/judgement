import React from 'react';
import { X, BookOpen } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface HowToPlayProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function HowToPlay({ isOpen, onClose }: HowToPlayProps) {
    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="bg-slate-900 border border-white/10 rounded-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col shadow-2xl"
                    >
                        <div className="p-6 border-b border-white/10 flex justify-between items-center bg-white/5">
                            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                                <BookOpen className="w-6 h-6 text-primary" /> How to Play
                            </h2>
                            <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                                <X className="w-6 h-6 text-slate-400" />
                            </button>
                        </div>

                        <div className="p-6 overflow-y-auto space-y-6 text-slate-300 leading-relaxed">
                            <section>
                                <h3 className="text-lg font-bold text-white mb-2">Objective</h3>
                                <p>
                                    Judgment (or Kaach-Paani) is a trick-taking game where you must predict exactly how many tricks you will win in each round.
                                </p>
                            </section>

                            <section>
                                <h3 className="text-lg font-bold text-white mb-2">Game Flow</h3>
                                <ul className="list-disc list-inside space-y-2 marker:text-primary">
                                    <li>The game consists of multiple rounds with varying numbers of cards (e.g., 7, 6, 5...).</li>
                                    <li>In each round, a <strong>Trump suit</strong> is determined (Spades, Hearts, Diamonds, Clubs).</li>
                                    <li>After cards are dealt, each player makes a <strong>Bet</strong> (Judgment) on how many tricks they will win.</li>
                                    <li><strong>Important:</strong> The total bets cannot equal the total number of tricks available! The last player (Dealer) has restricted options.</li>
                                </ul>
                            </section>

                            <section>
                                <h3 className="text-lg font-bold text-white mb-2">Playing Tricks</h3>
                                <ul className="list-disc list-inside space-y-2 marker:text-primary">
                                    <li>The player to the dealer's left leads the first trick.</li>
                                    <li>You must <strong>follow suit</strong> if you have a card of the leading suit.</li>
                                    <li>If you don't have the suit, you can play a <strong>Trump</strong> to win, or discard any other card.</li>
                                    <li>The highest card of the lead suit wins, unless a Trump is played. The highest Trump wins.</li>
                                </ul>
                            </section>

                            <section>
                                <h3 className="text-lg font-bold text-white mb-2">Scoring</h3>
                                <div className="bg-white/5 p-4 rounded-lg border border-white/10">
                                    <p className="mb-2"><span className="text-green-400 font-bold">Correct Bet:</span> 10 points + (Bet × 1)</p>
                                    <p><span className="text-red-400 font-bold">Incorrect Bet:</span> 0 points</p>
                                </div>
                            </section>
                        </div>

                        <div className="p-4 border-t border-white/10 bg-white/5 text-center">
                            <button
                                onClick={onClose}
                                className="px-8 py-2 bg-primary text-white font-bold rounded-full hover:bg-primary/90 transition-colors"
                            >
                                Got it!
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
