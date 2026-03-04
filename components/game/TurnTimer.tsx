'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

interface TurnTimerProps {
    startTime: number;
    durationMs: number;
    isActive: boolean;
}

export default function TurnTimer({ startTime, durationMs, isActive }: TurnTimerProps) {
    const [timeLeftPercent, setTimeLeftPercent] = useState(100);

    useEffect(() => {
        if (!isActive) {
            setTimeLeftPercent(100);
            return;
        }

        const interval = setInterval(() => {
            const elapsed = Date.now() - startTime;
            const remaining = Math.max(0, durationMs - elapsed);
            setTimeLeftPercent((remaining / durationMs) * 100);
        }, 100);

        return () => clearInterval(interval);
    }, [startTime, durationMs, isActive]);

    if (!isActive) return null;

    const color = timeLeftPercent > 50 ? '#c8a2ff' : timeLeftPercent > 20 ? '#fb923c' : '#f472b6';

    return (
        <div className="w-full h-1 bg-black/20 rounded-full overflow-hidden mt-2">
            <motion.div
                initial={false}
                animate={{ width: `${timeLeftPercent}%`, backgroundColor: color }}
                transition={{ duration: 0.1, ease: "linear" }}
                className="h-full shadow-[0_0_8px_rgba(200,162,255,0.5)]"
            />
        </div>
    );
}
