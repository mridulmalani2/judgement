import React from 'react';
import { motion } from 'framer-motion';

export default function DealerButton() {
    return (
        <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="w-8 h-8 rounded-full bg-white border-2 border-slate-800 flex items-center justify-center shadow-lg z-20"
            title="Dealer"
        >
            <span className="text-slate-900 font-bold text-xs">D</span>
        </motion.div>
    );
}
