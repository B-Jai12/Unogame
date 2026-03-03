'use client';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '@/store/useGameStore';
import { cn } from '@/lib/utils';

const ICON_MAP = {
    info: '•',
    success: '✓',
    warning: '!',
    error: '✕',
};

const COLOR_MAP = {
    info: 'from-blue-500/80 to-indigo-500/80',
    success: 'from-green-500/80 to-emerald-500/80',
    warning: 'from-orange-500/80 to-amber-500/80',
    error: 'from-rose-500/80 to-pink-600/80',
};

export default function Toast() {
    const { toastMessage, toastType, clearToast } = useGameStore();

    return (
        <AnimatePresence>
            {toastMessage && (
                <motion.div
                    initial={{ opacity: 0, y: -32, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -24, scale: 0.92 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 28 }}
                    className="fixed top-4 left-1/2 z-[100] -translate-x-1/2 pointer-events-none"
                >
                    <div
                        className={cn(
                            'flex items-center gap-2.5 px-5 py-3 rounded-2xl shadow-xl',
                            'bg-gradient-to-r text-white text-sm font-semibold',
                            'border border-white/25 backdrop-blur-md',
                            COLOR_MAP[toastType],
                        )}
                    >
                        <span className="text-base font-bold">{ICON_MAP[toastType]}</span>
                        <span>{toastMessage}</span>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
