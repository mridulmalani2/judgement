import React from 'react';
import { Player } from '../lib/types';
import { Trophy, Target, Hand } from 'lucide-react';

interface GameHUDProps {
    players: Player[];
    currentRound: number;
}

export default function GameHUD({ players, currentRound }: GameHUDProps) {
    return (
        <div className="fixed top-20 left-0 right-0 flex justify-center pointer-events-none z-10">
            <div className="bg-black/40 backdrop-blur-md rounded-full px-6 py-2 border border-white/10 flex space-x-6 pointer-events-auto overflow-x-auto max-w-[90vw] no-scrollbar">
                {players.map(p => (
                    <div key={p.id} className="flex flex-col items-center min-w-[80px]">
                        <span className="text-xs font-bold text-slate-300 mb-1 truncate max-w-[80px]">{p.name}</span>
                        <div className="flex space-x-3 text-xs">
                            <div className="flex items-center space-x-1 text-blue-400" title="Bet">
                                <Target className="w-3 h-3" />
                                <span>{p.currentBet !== null ? p.currentBet : '-'}</span>
                            </div>
                            <div className="flex items-center space-x-1 text-green-400" title="Tricks Won">
                                <Hand className="w-3 h-3" />
                                <span>{p.tricksWon}</span>
                            </div>
                            <div className="flex items-center space-x-1 text-yellow-400" title="Total Score">
                                <Trophy className="w-3 h-3" />
                                <span>{p.totalPoints}</span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
