import React from 'react';
import { Heart } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export default function Credits() {
    const { t } = useTranslation('common');

    return (
        <div className="mt-12 text-center space-y-4 animate-fade-in">
            <div className="flex flex-col items-center justify-center space-y-2">
                <p className="text-slate-400 text-sm flex items-center gap-1">
                    {t('credits.developedBy')} <Heart className="w-3 h-3 text-red-500 fill-red-500 animate-pulse" />
                </p>

                <a
                    href="https://www.linkedin.com/in/mridulmalani/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex items-center gap-3 bg-white/5 hover:bg-white/10 px-4 py-2 rounded-full transition-all border border-white/10 hover:border-primary/50"
                >
                    <img
                        src="https://media.licdn.com/dms/image/v2/D4D03AQECgtZ4soaPsg/profile-displayphoto-scale_400_400/B4DZp5KBlwG8Ag-/0/1762969263663?e=1766620800&v=beta&t=6BnMMzqIqZiahQ1yU7lMAIhsliQWonCGVSUND8o2o-A"
                        alt="Mridul Malani"
                        className="w-10 h-10 rounded-full border-2 border-primary/50 group-hover:border-primary transition-colors"
                    />
                    <div className="text-left">
                        <p className="text-white font-bold text-sm group-hover:text-primary transition-colors">Mridul Malani</p>
                        <p className="text-xs text-slate-400">Connect on LinkedIn</p>
                    </div>
                </a>
            </div>

            <p className="text-xs text-slate-500 max-w-md mx-auto italic">
                "{t('credits.dedication')}"
            </p>
        </div>
    );
}
