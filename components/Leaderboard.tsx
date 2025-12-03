import { Player } from '../lib/types';
import { Trophy, RotateCcw, Home } from 'lucide-react';
import { useRouter } from 'next/router';

interface LeaderboardProps {
    players: Player[];
    onPlayAgain: () => void;
    isHost: boolean;
}

export default function Leaderboard({ players, onPlayAgain, isHost }: LeaderboardProps) {
    const router = useRouter();
    const sortedPlayers = [...players].sort((a, b) => b.totalPoints - a.totalPoints);

    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
            <div className="bg-surface p-8 rounded-3xl shadow-2xl border-2 border-yellow-500 w-full max-w-2xl text-center">
                <Trophy className="w-20 h-20 text-yellow-400 mx-auto mb-4" />
                <h2 className="text-4xl font-bold text-white mb-8">Game Over!</h2>

                <div className="space-y-4 mb-8 max-h-[60vh] overflow-y-auto">
                    {sortedPlayers.map((player, index) => (
                        <div
                            key={player.id}
                            className={`flex items-center justify-between p-4 rounded-xl ${index === 0 ? 'bg-yellow-500/20 border border-yellow-500' : 'bg-white/5'}`}
                        >
                            <div className="flex items-center space-x-4">
                                <span className={`text-2xl font-bold w-8 ${index === 0 ? 'text-yellow-400' : 'text-gray-400'}`}>
                                    #{index + 1}
                                </span>
                                <span className="text-xl font-bold text-white">{player.name}</span>
                            </div>
                            <span className="text-2xl font-bold text-primary">{player.totalPoints} pts</span>
                        </div>
                    ))}
                </div>

                <div className="flex space-x-4 justify-center">
                    <button
                        onClick={() => router.push('/')}
                        className="px-8 py-3 bg-secondary text-white rounded-xl font-bold hover:bg-secondary/80 flex items-center space-x-2"
                    >
                        <Home className="w-5 h-5" />
                        <span>Home</span>
                    </button>

                    {isHost && (
                        <button
                            onClick={onPlayAgain}
                            className="px-8 py-3 bg-primary text-white rounded-xl font-bold hover:bg-primary/80 flex items-center space-x-2"
                        >
                            <RotateCcw className="w-5 h-5" />
                            <span>Play Again</span>
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
