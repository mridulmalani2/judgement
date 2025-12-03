import React from 'react';
import { Heart } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export default function Credits() {
    const { t } = useTranslation('common');

    return (
        <div className="mt-12 text-center space-y-6 animate-fade-in">
            <div className="flex flex-col items-center justify-center space-y-3">
                <p className="text-slate-400 text-lg flex items-center gap-2">
                    {t('credits.developedBy')} <Heart className="w-5 h-5 text-red-500 fill-red-500 animate-pulse" />
                </p>

                <a
                    href="https://www.linkedin.com/in/mridulmalani/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex items-center gap-4 bg-white/5 hover:bg-white/10 px-6 py-3 rounded-full transition-all border border-white/10 hover:border-primary/50"
                >
                    <img
                        src="https://media.licdn.com/dms/image/v2/D4D03AQECgtZ4soaPsg/profile-displayphoto-scale_400_400/B4DZp5KBlwG8Ag-/0/1762969263663?e=1766620800&v=beta&t=6BnMMzqIqZiahQ1yU7lMAIhsliQWonCGVSUND8o2o-A"
                        alt="Mridul Malani"
                        className="w-16 h-16 rounded-full border-2 border-primary/50 group-hover:border-primary transition-colors"
                    />
                    <div className="text-left">
                        <p className="text-white font-bold text-xl group-hover:text-primary transition-colors">Mridul Malani</p>
                        <p className="text-sm text-slate-400">Connect on LinkedIn</p>
                    </div>
                </a>
            </div>

            <p className="text-lg text-slate-400 max-w-lg mx-auto italic leading-relaxed">
                "{t('credits.dedication')}"
            </p>
        </div>
    );
}
