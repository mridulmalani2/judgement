import { useState } from 'react';
import { Users } from 'lucide-react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';

interface GameSetupModalProps {
    isOpen: boolean;
    onClose: () => void;
    onStartGame: (initialCards: number) => void;
    playerCount: number;
}

export default function GameSetupModal({ isOpen, onClose, onStartGame, playerCount }: GameSetupModalProps) {
    const { t } = useTranslation('common');
    // Default to max possible cards (floor(52/N)) or some reasonable default like 5-7
    // Rule: initialCardsPerPlayer * numberOfPlayers <= 52.
    // So max = floor(52 / playerCount).
    const maxCards = Math.floor(52 / Math.max(1, playerCount));
    const [cards, setCards] = useState(Math.min(7, maxCards));

    if (!isOpen) return null;

    return (
        <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center z-50 p-4"
        >
            <div className="glass-panel p-8 w-full max-w-md text-center border border-white/10 rounded-2xl bg-[#1a1a1a]">
                <Users className="w-16 h-16 text-primary mx-auto mb-4" />
                <h2 className="text-3xl font-bold mb-2 text-white">{t('setup.startGame')}</h2>
                <p className="text-slate-400 mb-8">{t('setup.configureRound')}</p>

                <div className="mb-8 text-left">
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                        {t('setup.cardsPerPlayer')}
                    </label>
                    <input
                        type="range"
                        min="1"
                        max={maxCards}
                        value={cards}
                        onChange={(e) => setCards(parseInt(e.target.value))}
                        className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-primary"
                    />
                    <div className="flex justify-between text-xs text-slate-400 mt-2">
                        <span>1</span>
                        <span className="font-bold text-white text-lg">{cards}</span>
                        <span>{maxCards}</span>
                    </div>
                </div>

                <div className="flex gap-4">
                    <button
                        onClick={onClose}
                        className="flex-1 py-3 bg-white/5 hover:bg-white/10 text-slate-300 font-bold rounded-xl transition-colors"
                    >
                        {t('setup.cancel')}
                    </button>
                    <button
                        onClick={() => onStartGame(cards)}
                        className="flex-1 py-3 bg-primary text-white font-bold rounded-xl shadow-lg shadow-primary/30 hover:shadow-primary/50 transition-all"
                    >
                        {t('setup.startGame')}
                    </button>
                </div>
            </div>
        </motion.div>
    );
}
