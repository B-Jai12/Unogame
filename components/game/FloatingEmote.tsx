'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface FloatingEmoteProps {
    emote: string;
    onComplete: () => void;
}

export default function FloatingEmote({ emote, onComplete }: FloatingEmoteProps) {
    useEffect(() => {
        const timer = setTimeout(onComplete, 2000);
        return () => clearTimeout(timer);
    }, [onComplete]);

    return (
        <motion.div
            initial={{ y: 0, opacity: 0, scale: 0.5 }}
            animate={{ y: -100, opacity: [0, 1, 1, 0], scale: 1.5 }}
            transition={{ duration: 2, ease: "easeOut" }}
            className="absolute z-50 pointer-events-none text-4xl"
            style={{ left: '50%', marginLeft: '-24px', top: '-40px' }}
        >
            {emote}
        </motion.div>
    );
}
