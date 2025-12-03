import React from 'react';
import { X, BookOpen } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';

interface HowToPlayProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function HowToPlay({ isOpen, onClose }: HowToPlayProps) {
    const { t, i18n } = useTranslation('common');

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="bg-slate-900 border border-white/10 rounded-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col shadow-2xl"
                    >
                        <div className="p-6 border-b border-white/10 flex justify-between items-center bg-white/5">
                            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                                <BookOpen className="w-6 h-6 text-primary" /> {t('howToPlayContent.title')}
                            </h2>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => i18n.changeLanguage(i18n.language === 'en' ? 'hi' : 'en')}
                                    className="px-3 py-1 bg-white/10 hover:bg-white/20 rounded-full text-sm font-bold text-white transition-colors"
                                >
                                    {i18n.language === 'en' ? 'हिंदी' : 'English'}
                                </button>
                                <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                                    <X className="w-6 h-6 text-slate-400" />
                                </button>
                            </div>
                        </div>

                        <div className="p-6 overflow-y-auto space-y-6 text-slate-300 leading-relaxed">
                            <section>
                                <h3 className="text-lg font-bold text-white mb-2">{t('howToPlayContent.objective.title')}</h3>
                                <p>
                                    {t('howToPlayContent.objective.text')}
                                </p>
                            </section>

                            <section>
                                <h3 className="text-lg font-bold text-white mb-2">{t('howToPlayContent.flow.title')}</h3>
                                <ul className="list-disc list-inside space-y-2 marker:text-primary">
                                    {(t('howToPlayContent.flow.points', { returnObjects: true }) as string[]).map((point, i) => (
                                        <li key={i}>{point}</li>
                                    ))}
                                </ul>
                            </section>

                            <section>
                                <h3 className="text-lg font-bold text-white mb-2">{t('howToPlayContent.playing.title')}</h3>
                                <ul className="list-disc list-inside space-y-2 marker:text-primary">
                                    {(t('howToPlayContent.playing.points', { returnObjects: true }) as string[]).map((point, i) => (
                                        <li key={i}>{point}</li>
                                    ))}
                                </ul>
                            </section>

                            <section>
                                <h3 className="text-lg font-bold text-white mb-2">{t('howToPlayContent.scoring.title')}</h3>
                                <div className="bg-white/5 p-4 rounded-lg border border-white/10">
                                    <p className="mb-2"><span className="text-green-400 font-bold">{t('howToPlayContent.scoring.correct')}</span></p>
                                    <p className="mb-2"><span className="text-red-400 font-bold">{t('howToPlayContent.scoring.incorrect')}</span></p>
                                    <p className="text-sm text-slate-400 italic">{t('howToPlayContent.scoring.examples')}</p>
                                </div>
                            </section>
                        </div>

                        <div className="p-4 border-t border-white/10 bg-white/5 text-center">
                            <button
                                onClick={onClose}
                                className="px-8 py-2 bg-primary text-white font-bold rounded-full hover:bg-primary/90 transition-colors"
                            >
                                {t('howToPlayContent.gotIt')}
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
