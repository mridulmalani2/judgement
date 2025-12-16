import { Card as CardType, Suit } from '../lib/types';
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

// Premium suit symbols with better styling
const SuitSymbol = ({ suit, className }: { suit: Suit, className?: string }) => {
    const symbols: Record<Suit, string> = {
        hearts: '♥',
        diamonds: '♦',
        clubs: '♣',
        spades: '♠'
    };
    return <span className={className}>{symbols[suit]}</span>;
};

// Corner pip component for premium look
const CornerPip = ({ rank, suit, isRed, inverted = false }: { rank: string, suit: Suit, isRed: boolean, inverted?: boolean }) => (
    <div className={clsx("flex flex-col items-center leading-none", inverted && "rotate-180")}>
        <span className={clsx(
            "font-bold tracking-tight",
            isRed ? "text-red-600" : "text-slate-900"
        )}>{rank}</span>
        <SuitSymbol suit={suit} className={clsx(
            "text-[0.7em] -mt-0.5",
            isRed ? "text-red-600" : "text-slate-900"
        )} />
    </div>
);

export default function Card({ card, onClick, disabled, selected, playable, size = 'md' }: CardProps) {
    const isRed = card?.suit === 'hearts' || card?.suit === 'diamonds';

    const sizeClasses = {
        sm: 'w-12 h-[4.25rem] text-xs rounded-lg',
        md: 'w-16 h-24 text-sm rounded-xl',
        lg: 'w-24 h-36 text-xl rounded-2xl',
    };

    const pipSizes = {
        sm: 'text-lg',
        md: 'text-2xl',
        lg: 'text-4xl',
    };

    if (!card) {
        // Premium Card Back with elegant pattern
        return (
            <div
                className={clsx(
                    "relative overflow-hidden border-2 border-slate-600/50 shadow-xl",
                    sizeClasses[size]
                )}
                style={{
                    background: 'linear-gradient(145deg, #1e3a5f 0%, #0f1f35 50%, #1e3a5f 100%)',
                }}
            >
                {/* Ornate pattern overlay */}
                <div className="absolute inset-0 opacity-20">
                    <div className="absolute inset-2 border border-amber-400/50 rounded-lg"></div>
                    <div className="absolute inset-3 border border-amber-400/30 rounded-md"></div>
                </div>

                {/* Center diamond pattern */}
                <div className="absolute inset-0 flex items-center justify-center">
                    <div className="relative">
                        <div className="w-8 h-8 rotate-45 border-2 border-amber-400/40"></div>
                        <div className="absolute inset-0 flex items-center justify-center">
                            <div className="w-4 h-4 rotate-45 bg-amber-400/20 border border-amber-400/30"></div>
                        </div>
                    </div>
                </div>

                {/* Corner decorations */}
                <div className="absolute top-1 left-1 w-2 h-2 border-l border-t border-amber-400/40"></div>
                <div className="absolute top-1 right-1 w-2 h-2 border-r border-t border-amber-400/40"></div>
                <div className="absolute bottom-1 left-1 w-2 h-2 border-l border-b border-amber-400/40"></div>
                <div className="absolute bottom-1 right-1 w-2 h-2 border-r border-b border-amber-400/40"></div>

                {/* Subtle shimmer effect */}
                <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-white/5"></div>
            </div>
        );
    }

    const rankDisplay = (r: number) => {
        if (r <= 10) return r.toString();
        if (r === 11) return 'J';
        if (r === 12) return 'Q';
        if (r === 13) return 'K';
        if (r === 14) return 'A';
        return r.toString();
    };

    const rank = rankDisplay(card.rank);

    return (
        <motion.button
            whileHover={playable && !disabled ? { y: -12, scale: 1.05, rotateZ: 2 } : {}}
            whileTap={playable && !disabled ? { scale: 0.95 } : {}}
            onClick={onClick}
            disabled={disabled}
            className={clsx(
                "relative select-none flex flex-col justify-between p-1.5 transition-all duration-200 border-2 overflow-hidden",
                sizeClasses[size],
                selected && "ring-4 ring-yellow-400 ring-offset-2 ring-offset-slate-900 z-20",
                playable && !disabled && "cursor-pointer shadow-lg shadow-indigo-500/30 border-indigo-400 hover:shadow-indigo-500/50",
                disabled && "opacity-60 cursor-not-allowed",
                !selected && !playable && "border-slate-200 shadow-lg"
            )}
            style={{
                background: 'linear-gradient(145deg, #ffffff 0%, #f8f9fa 50%, #e9ecef 100%)',
            }}
        >
            {/* Subtle texture overlay */}
            <div className="absolute inset-0 opacity-[0.03]" style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg width='20' height='20' viewBox='0 0 20 20' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23000000' fill-opacity='1' fill-rule='evenodd'%3E%3Ccircle cx='3' cy='3' r='1'/%3E%3C/g%3E%3C/svg%3E")`,
            }}></div>

            {/* Top left pip */}
            <CornerPip rank={rank} suit={card.suit} isRed={isRed} />

            {/* Center large suit symbol */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <SuitSymbol
                    suit={card.suit}
                    className={clsx(
                        pipSizes[size],
                        isRed ? "text-red-600/15" : "text-slate-900/10",
                        "drop-shadow-sm"
                    )}
                />
            </div>

            {/* Face card indicator for J, Q, K */}
            {card.rank >= 11 && card.rank <= 13 && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className={clsx(
                        "font-serif font-bold opacity-20",
                        size === 'sm' ? 'text-xl' : size === 'md' ? 'text-3xl' : 'text-5xl',
                        isRed ? "text-red-600" : "text-slate-900"
                    )}>
                        {rank}
                    </div>
                </div>
            )}

            {/* Ace special styling */}
            {card.rank === 14 && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <SuitSymbol
                        suit={card.suit}
                        className={clsx(
                            size === 'sm' ? 'text-2xl' : size === 'md' ? 'text-4xl' : 'text-6xl',
                            isRed ? "text-red-600" : "text-slate-900",
                            "drop-shadow-md"
                        )}
                    />
                </div>
            )}

            {/* Bottom right pip */}
            <CornerPip rank={rank} suit={card.suit} isRed={isRed} inverted />

            {/* Playable glow effect */}
            {playable && !disabled && (
                <div className="absolute inset-0 rounded-xl bg-gradient-to-t from-indigo-400/10 to-transparent pointer-events-none"></div>
            )}

            {/* Premium edge highlight */}
            <div className="absolute inset-0 rounded-xl ring-1 ring-inset ring-black/5 pointer-events-none"></div>
        </motion.button>
    );
}
