import Head from 'next/head';
import { useState } from 'react';
import { useRouter } from 'next/router';
import { v4 as uuidv4 } from 'uuid';
import { motion } from 'framer-motion';
import { Play, Users, Settings, Globe } from 'lucide-react';

export default function Home() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const createGame = async () => {
    if (!name) return alert('Please enter your name');
    setIsCreating(true);

    // Generate code locally (PeerJS handles the rest)
    const roomCode = Math.floor(100 + Math.random() * 900).toString();

    localStorage.setItem('judgment_name', name);
    if (!localStorage.getItem('judgment_id')) localStorage.setItem('judgment_id', uuidv4());

    router.push(`/room/${roomCode}?host=true`);
  };

  const joinGame = () => {
    if (!name) return alert('Please enter your name');
    if (!joinCode || joinCode.length !== 3) return alert('Please enter a valid 3-digit code');

    localStorage.setItem('judgment_name', name);
    if (!localStorage.getItem('judgment_id')) localStorage.setItem('judgment_id', uuidv4());

    router.push(`/room/${joinCode}`);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 text-foreground bg-[url('/bg-texture.png')] bg-cover">
      <Head>
        <title>Judgment - Premium Card Game</title>
      </Head>

      <main className="w-full max-w-md space-y-8 text-center relative z-10">
        <motion.div
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.8 }}
        >
          <h1 className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 mb-2 drop-shadow-lg">
            Judgment
          </h1>
          <p className="text-xl text-slate-300 font-light tracking-wide">The Classic Family Card Game</p>
        </motion.div>

        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="glass-panel p-8 space-y-6 border-t border-white/10"
        >
          <div className="space-y-2 text-left">
            <label className="block text-sm font-bold text-slate-400 uppercase tracking-wider ml-1">Your Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full p-4 rounded-2xl bg-black/30 border border-white/10 focus:border-primary focus:ring-2 focus:ring-primary/50 outline-none text-xl text-white placeholder-slate-600 transition-all"
              placeholder="Enter your name..."
            />
          </div>

          <div className="grid grid-cols-1 gap-4 pt-4">
            <button
              onClick={createGame}
              disabled={isCreating}
              className="group w-full py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-xl font-bold rounded-2xl hover:shadow-lg hover:shadow-indigo-500/30 active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center space-x-3"
            >
              <Play className="w-6 h-6 fill-current" />
              <span>Create New Game</span>
            </button>

            <div className="relative flex py-2 items-center">
              <div className="flex-grow border-t border-white/10"></div>
              <span className="flex-shrink mx-4 text-slate-500 text-sm font-bold">OR JOIN</span>
              <div className="flex-grow border-t border-white/10"></div>
            </div>

            <div className="flex space-x-3">
              <input
                type="text"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value)}
                className="flex-1 p-4 rounded-2xl bg-black/30 border border-white/10 focus:border-primary focus:ring-2 focus:ring-primary/50 outline-none text-xl text-center tracking-[0.5em] font-mono text-white placeholder-slate-700"
                placeholder="000"
                maxLength={3}
              />
              <button
                onClick={joinGame}
                className="flex-1 py-4 bg-white/5 border border-white/10 text-white text-xl font-bold rounded-2xl hover:bg-white/10 hover:border-white/30 active:scale-95 transition-all flex items-center justify-center space-x-2"
              >
                <Users className="w-5 h-5" />
                <span>Join</span>
              </button>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="flex justify-center space-x-6 text-slate-500"
        >
          <button className="hover:text-white transition-colors flex items-center space-x-1">
            <Settings className="w-4 h-4" />
            <span>Settings</span>
          </button>
          <button className="hover:text-white transition-colors flex items-center space-x-1">
            <Globe className="w-4 h-4" />
            <span>English</span>
          </button>
        </motion.div>
      </main>

      <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent pointer-events-none"></div>
    </div>
  );
}
