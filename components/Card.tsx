import { Card as CardType, Suit } from '../lib/types';
import { Heart, Diamond, Club, Spade } from 'lucide-react';
import clsx from 'clsx';
import { motion } from 'framer-motion';

interface CardProps {
    card?: CardType;
    onClick?: () => void;
    disabled?: boolean;
    selected?: boolean;
    playable?: boolean;
    size?: 'sm' | 'md' | 'lg';
}

const SuitIcon = ({ suit, className }: { suit: Suit, className?: string }) => {
    switch (suit) {
        case 'hearts': return <Heart className={className} fill="currentColor" />;
        case 'diamonds': return <Diamond className={className} fill="currentColor" />;
        case 'clubs': return <Club className={className} fill="currentColor" />;
        case 'spades': return <Spade className={className} fill="currentColor" />;
    }
};

export default function Card({ card, onClick, disabled, selected, playable, size = 'md' }: CardProps) {
    const isRed = card?.suit === 'hearts' || card?.suit === 'diamonds';

    const sizeClasses = {
        sm: 'w-10 h-14 text-[10px] rounded-md',
        md: 'w-16 h-24 text-sm rounded-lg',
        lg: 'w-24 h-36 text-xl rounded-xl',
    };

    if (!card) {
        // Premium Card Back
        return (
            <div
                className={clsx(
                    "bg-gradient-to-br from-blue-900 to-indigo-900 border border-white/20 shadow-lg flex items-center justify-center relative overflow-hidden",
                    sizeClasses[size]
                )}
            >
                <div className="absolute inset-0 opacity-30 bg-[url('/pattern.svg')] bg-repeat opacity-10"></div>
                <div className="w-8 h-8 rounded-full border-2 border-white/30 flex items-center justify-center">
                    <div className="w-4 h-4 bg-white/30 rounded-full"></div>
                </div>
            </div>
        );
    }

    const rankDisplay = (r: number) => {
        if (r <= 10) return r;
        if (r === 11) return 'J';
        if (r === 12) return 'Q';
        if (r === 13) return 'K';
        if (r === 14) return 'A';
        return r;
    };

    return (
        <motion.button
            whileHover={playable && !disabled ? { y: -10, scale: 1.05 } : {}}
            whileTap={playable && !disabled ? { scale: 0.95 } : {}}
            onClick={onClick}
            disabled={disabled}
            className={clsx(
                "relative bg-white shadow-xl select-none flex flex-col justify-between p-1.5 transition-all duration-200",
                sizeClasses[size],
                isRed ? "text-rose-600" : "text-slate-900",
                selected && "ring-4 ring-yellow-400 z-10",
                playable && !disabled && "cursor-pointer ring-2 ring-indigo-400 shadow-indigo-500/50",
                disabled && "opacity-60 grayscale cursor-not-allowed"
            )}
        >
            <div className="flex flex-col items-center leading-none">
                <span className="font-bold font-mono">{rankDisplay(card.rank)}</span>
                <SuitIcon suit={card.suit} className="w-[0.8em] h-[0.8em]" />
            </div>

            <div className="absolute inset-0 flex items-center justify-center">
                <SuitIcon suit={card.suit} className="w-1/2 h-1/2 opacity-[0.07]" />
            </div>

            <div className="flex flex-col items-center leading-none rotate-180">
                <span className="font-bold font-mono">{rankDisplay(card.rank)}</span>
                <SuitIcon suit={card.suit} className="w-[0.8em] h-[0.8em]" />
            </div>
        </motion.button>
    );
}
