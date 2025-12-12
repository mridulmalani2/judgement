import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { v4 as uuidv4 } from 'uuid';
import { motion } from 'framer-motion';
import { Play, Users, BookOpen } from 'lucide-react';
import Credits from '../components/Credits';
import HowToPlay from '../components/HowToPlay';
import '../lib/i18n'; // Import i18n config
import { useTranslation } from 'react-i18next';

export default function Home() {
  const router = useRouter();
  const { t } = useTranslation('common');
  const [name, setName] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [showHowToPlay, setShowHowToPlay] = useState(false);

  useEffect(() => {
    const storedName = localStorage.getItem('judgment_name');
    if (storedName) setName(storedName);
  }, []);

  const createRoom = async () => {
    if (!name) return alert(t('enterName'));
    localStorage.setItem('judgment_name', name);

    try {
      const res = await fetch('/api/rooms', { method: 'POST' });
      if (!res.ok) throw new Error('Failed to create room');
      const data = await res.json();
      router.push(`/room/${data.roomCode}?host=true`);
    } catch (e) {
      console.error(e);
      alert('Error creating room. Please try again.');
    }
  };

  const joinRoom = () => {
    if (!name) return alert(t('enterName'));
    if (!roomCode) return alert(t('roomCode'));
    localStorage.setItem('judgment_name', name);
    router.push(`/room/${roomCode}`);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 relative overflow-hidden">
      <Head>
        <title>Judgment - {t('subtitle')}</title>
      </Head>

      {/* Background Effects */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-slate-900 via-[#0f172a] to-black -z-10"></div>
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10 opacity-20">
        <div className="absolute top-10 left-10 w-72 h-72 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl animate-blob"></div>
        <div className="absolute top-10 right-10 w-72 h-72 bg-yellow-500 rounded-full mix-blend-multiply filter blur-xl animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-8 left-20 w-72 h-72 bg-pink-500 rounded-full mix-blend-multiply filter blur-xl animate-blob animation-delay-4000"></div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-panel p-8 w-full max-w-md text-center relative z-10"
      >
        <div className="mb-8">
          <h1 className="text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 mb-2">
            {t('title')}
          </h1>
          <h2 className="text-3xl text-yellow-500 font-bold tracking-wider">
            फैसलो
          </h2>
          <p className="text-slate-400 mt-2">{t('subtitle')}</p>
        </div>

        <div className="space-y-4">
          <input
            type="text"
            placeholder={t('enterName')}
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all text-center text-lg"
          />

          <div className="grid grid-cols-1 gap-3">
            <button
              onClick={createRoom}
              className="w-full py-3 bg-primary hover:bg-primary/90 text-white font-bold rounded-xl shadow-lg shadow-primary/20 transition-all flex items-center justify-center gap-2 group"
            >
              <Play className="w-5 h-5 fill-current group-hover:scale-110 transition-transform" /> {t('createRoom')}
            </button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-white/10"></div>
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-[#1e293b] px-2 text-slate-500">{t('orJoin')}</span>
              </div>
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                placeholder={t('roomCode')}
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                className="flex-1 bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all text-center uppercase tracking-widest font-mono"
              />
              <button
                onClick={joinRoom}
                className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white font-bold rounded-xl transition-all flex items-center justify-center"
              >
                <Users className="w-5 h-5" />
              </button>
            </div>
          </div>

          <button
            onClick={() => setShowHowToPlay(true)}
            className="mt-4 text-sm text-slate-400 hover:text-white flex items-center justify-center gap-1 mx-auto transition-colors"
          >
            <BookOpen className="w-4 h-4" /> {t('howToPlay')}
          </button>
        </div>

        <Credits />
      </motion.div>

      <HowToPlay isOpen={showHowToPlay} onClose={() => setShowHowToPlay(false)} />
    </div>
  );
}
