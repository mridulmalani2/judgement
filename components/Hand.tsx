import { Card as CardType } from '../lib/types';
import Card from './Card';
import { motion } from 'framer-motion';

interface HandProps {
    cards: CardType[];
    onPlayCard: (card: CardType) => void;
    playableCards: CardType[]; // Subset of cards that are valid to play
    myTurn: boolean;
}

export default function Hand({ cards, onPlayCard, playableCards, myTurn }: HandProps) {
    // Calculate overlap based on number of cards
    const cardCount = cards.length;
    const overlapClass = cardCount > 10 ? '-space-x-10 md:-space-x-8' :
                         cardCount > 7 ? '-space-x-8 md:-space-x-6' :
                         cardCount > 5 ? '-space-x-6 md:-space-x-4' : '-space-x-4 md:-space-x-2';

    return (
        <div className={`flex justify-center ${overlapClass} transition-all duration-300 py-2 md:py-4`}>
            {cards.map((card, index) => {
                const isPlayable = playableCards.some(c => c.id === card.id);
                return (
                    <motion.div
                        key={card.id}
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: index * 0.03 }}
                        className="transform transition-all duration-200 hover:z-20 active:z-20"
                        style={{ zIndex: index }}
                    >
                        <Card
                            card={card}
                            size="lg"
                            playable={myTurn && isPlayable}
                            disabled={!myTurn || !isPlayable}
                            onClick={() => myTurn && isPlayable && onPlayCard(card)}
                        />
                    </motion.div>
                );
            })}
        </div>
    );
}
