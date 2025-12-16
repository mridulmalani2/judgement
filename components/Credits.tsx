import React from 'react';
import { Heart, Code } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export default function Credits() {
    const { t } = useTranslation('common');

    return (
        <div className="mt-10 text-center animate-fade-in">
            <div className="flex flex-col items-center justify-center space-y-4">
                {/* Profile Photo with elegant glow */}
                <div className="relative group">
                    <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-full blur-md opacity-50 group-hover:opacity-75 transition-opacity duration-500"></div>
                    <img
                        src="https://media.licdn.com/dms/image/v2/D4E03AQEAD7kxQrToiQ/profile-displayphoto-scale_400_400/B4EZsQwy85HcAg-/0/1765512786450?e=1767225600&v=beta&t=Vv2gS2J-llf2qy8i-M4NU-rd0iDkuTidih-j90WjwPY"
                        alt="Mridul Malani"
                        className="relative w-20 h-20 rounded-full border-2 border-white/30 shadow-xl object-cover"
                    />
                </div>

                {/* Simple attribution */}
                <div className="flex items-center gap-2 text-slate-400 text-sm">
                    <Code className="w-4 h-4" />
                    <span>Built with</span>
                    <Heart className="w-4 h-4 text-red-500 fill-red-500 animate-pulse" />
                    <span>by <span className="text-white font-medium">Mridul Malani</span></span>
                </div>

                {/* Dedication */}
                <p className="text-sm text-slate-500 max-w-xs mx-auto italic leading-relaxed">
                    "{t('credits.dedication')}"
                </p>
            </div>
        </div>
    );
}
