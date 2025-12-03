import { Card as CardType } from '../lib/types';
import Card from './Card';

interface HandProps {
    cards: CardType[];
    onPlayCard: (card: CardType) => void;
    playableCards: CardType[]; // Subset of cards that are valid to play
    myTurn: boolean;
}

export default function Hand({ cards, onPlayCard, playableCards, myTurn }: HandProps) {
    return (
        <div className="flex justify-center -space-x-8 hover:space-x-1 transition-all duration-300 py-4">
            {cards.map((card) => {
                const isPlayable = playableCards.some(c => c.id === card.id);
                return (
                    <div key={card.id} className="transform transition-transform hover:z-10">
                        <Card
                            card={card}
                            size="lg"
                            playable={myTurn && isPlayable}
                            disabled={!myTurn || !isPlayable}
                            onClick={() => myTurn && isPlayable && onPlayCard(card)}
                        />
                    </div>
                );
            })}
        </div>
    );
}
