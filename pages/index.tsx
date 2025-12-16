import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { motion } from 'framer-motion';
import { BookOpen, Gamepad2, Languages } from 'lucide-react';
import Credits from '../components/Credits';
import HowToPlay from '../components/HowToPlay';
import '../lib/i18n';
import { useTranslation } from 'react-i18next';

export default function Home() {
  const router = useRouter();
  const { t, i18n } = useTranslation('common');
  const [name, setName] = useState('');
  const [showHowToPlay, setShowHowToPlay] = useState(false);

  useEffect(() => {
    const storedName = localStorage.getItem('judgment_name');
    if (storedName) setName(storedName);
  }, []);

  const playNow = () => {
    if (name) {
      localStorage.setItem('judgment_name', name);
    }
    router.push('/play');
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
            faislo
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

          {/* Main Play Button */}
          <button
            onClick={playNow}
            className="w-full py-4 bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-600/90 text-white font-bold rounded-xl shadow-lg shadow-primary/30 transition-all flex items-center justify-center gap-3 group text-xl"
          >
            <Gamepad2 className="w-6 h-6 group-hover:scale-110 transition-transform" />
            {t('playNow')}
          </button>

          {/* Language Toggle */}
          <div className="flex items-center justify-center gap-2">
            <Languages className="w-4 h-4 text-slate-400" />
            <div className="flex bg-black/30 rounded-full p-1 border border-white/10">
              <button
                onClick={() => i18n.changeLanguage('en')}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                  i18n.language === 'en'
                    ? 'bg-primary text-white shadow-lg'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                English
              </button>
              <button
                onClick={() => i18n.changeLanguage('hi')}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                  i18n.language === 'hi'
                    ? 'bg-primary text-white shadow-lg'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                हिंदी
              </button>
            </div>
          </div>

          <p className="text-xs text-slate-500">
            {t('shareLink')}
          </p>

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
