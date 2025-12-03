import React, { useState } from 'react';
import { Settings, X } from 'lucide-react';
import { motion } from 'framer-motion';

interface HostSettingsProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (settings: GameSettings) => void;
    currentSettings: GameSettings;
}

export interface GameSettings {
    discardStrategy: 'random' | 'priority';
    autoPlayEnabled: boolean;
    allowSpectators: boolean;
}

export default function HostSettings({ isOpen, onClose, onSave, currentSettings }: HostSettingsProps) {
    const [settings, setSettings] = useState<GameSettings>(currentSettings);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="bg-slate-900 border border-white/10 rounded-2xl p-6 w-full max-w-md shadow-2xl"
            >
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <Settings className="w-5 h-5" /> Host Settings
                    </h2>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                        <X className="w-5 h-5 text-slate-400" />
                    </button>
                </div>

                <div className="space-y-6">
                    {/* Discard Strategy */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-300">Discard Strategy</label>
                        <div className="grid grid-cols-2 gap-2">
                            <button
                                onClick={() => setSettings({ ...settings, discardStrategy: 'random' })}
                                className={`p-3 rounded-lg border text-sm font-bold transition-all ${settings.discardStrategy === 'random'
                                        ? 'bg-primary/20 border-primary text-primary'
                                        : 'bg-white/5 border-transparent text-slate-400 hover:bg-white/10'
                                    }`}
                            >
                                Random
                            </button>
                            <button
                                onClick={() => setSettings({ ...settings, discardStrategy: 'priority' })}
                                className={`p-3 rounded-lg border text-sm font-bold transition-all ${settings.discardStrategy === 'priority'
                                        ? 'bg-primary/20 border-primary text-primary'
                                        : 'bg-white/5 border-transparent text-slate-400 hover:bg-white/10'
                                    }`}
                            >
                                Priority (Low Cards)
                            </button>
                        </div>
                        <p className="text-xs text-slate-500">
                            Priority removes lowest cards first (2♣ → 2♦...). Random removes any cards.
                        </p>
                    </div>

                    {/* Autoplay */}
                    <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                        <span className="text-sm font-medium text-slate-300">Autoplay for Away Players</span>
                        <button
                            onClick={() => setSettings({ ...settings, autoPlayEnabled: !settings.autoPlayEnabled })}
                            className={`w-12 h-6 rounded-full transition-colors relative ${settings.autoPlayEnabled ? 'bg-primary' : 'bg-slate-700'
                                }`}
                        >
                            <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${settings.autoPlayEnabled ? 'translate-x-6' : 'translate-x-0'
                                }`} />
                        </button>
                    </div>

                    {/* Spectators */}
                    <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                        <span className="text-sm font-medium text-slate-300">Allow Spectators</span>
                        <button
                            onClick={() => setSettings({ ...settings, allowSpectators: !settings.allowSpectators })}
                            className={`w-12 h-6 rounded-full transition-colors relative ${settings.allowSpectators ? 'bg-primary' : 'bg-slate-700'
                                }`}
                        >
                            <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${settings.allowSpectators ? 'translate-x-6' : 'translate-x-0'
                                }`} />
                        </button>
                    </div>
                </div>

                <div className="mt-8 pt-4 border-t border-white/10 flex justify-end">
                    <button
                        onClick={() => onSave(settings)}
                        className="px-6 py-2 bg-primary text-white font-bold rounded-lg hover:bg-primary/90 transition-colors"
                    >
                        Save Changes
                    </button>
                </div>
            </motion.div>
        </div>
    );
}
