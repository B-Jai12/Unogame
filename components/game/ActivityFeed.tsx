'use client';

/**
 * components/game/ActivityFeed.tsx
 *
 * Renders a scrolling feed of game events near the top of the game board.
 * Events are derived from the Room state diff inside RoomPage and pushed
 * as an array of message strings with timestamps.
 *
 * Design: compact floating pill that expands to show the last N messages.
 */

import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export interface ActivityEntry {
    id: string;
    text: string;
    icon?: string;
    ts: number;
}

interface ActivityFeedProps {
    entries: ActivityEntry[];
}

const MAX_VISIBLE = 4;

export default function ActivityFeed({ entries }: ActivityFeedProps) {
    const scrollRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to bottom on new entry
    useEffect(() => {
        const el = scrollRef.current;
        if (el) el.scrollTop = el.scrollHeight;
    }, [entries.length]);

    if (entries.length === 0) return null;

    const visible = entries.slice(-MAX_VISIBLE);

    return (
        <div
            style={{
                position: 'absolute',
                top: 8,
                left: '50%',
                transform: 'translateX(-50%)',
                zIndex: 30,
                pointerEvents: 'none',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 4,
                minWidth: 200,
                maxWidth: 340,
                width: 'max-content',
            }}
        >
            <AnimatePresence mode="popLayout" initial={false}>
                {visible.map((entry, i) => {
                    const isLatest = i === visible.length - 1;
                    return (
                        <motion.div
                            key={entry.id}
                            layout
                            initial={{ opacity: 0, y: -10, scale: 0.9 }}
                            animate={{
                                opacity: isLatest ? 1 : 0.55 - (visible.length - 1 - i) * 0.12,
                                y: 0,
                                scale: isLatest ? 1 : 0.93,
                            }}
                            exit={{ opacity: 0, y: -14, scale: 0.85 }}
                            transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                            style={{
                                background: isLatest
                                    ? 'rgba(15, 10, 35, 0.82)'
                                    : 'rgba(15, 10, 35, 0.55)',
                                backdropFilter: 'blur(14px)',
                                WebkitBackdropFilter: 'blur(14px)',
                                border: isLatest
                                    ? '1px solid rgba(255,158,203,0.35)'
                                    : '1px solid rgba(255,255,255,0.08)',
                                borderRadius: 99,
                                padding: '5px 14px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 6,
                                whiteSpace: 'nowrap',
                                boxShadow: isLatest ? '0 4px 20px rgba(0,0,0,0.3)' : 'none',
                            }}
                        >
                            {entry.icon && (
                                <span style={{ fontSize: 12, lineHeight: 1 }}>{entry.icon}</span>
                            )}
                            <span
                                style={{
                                    fontSize: 11,
                                    fontWeight: isLatest ? 700 : 500,
                                    color: isLatest ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.55)',
                                    letterSpacing: '0.01em',
                                }}
                            >
                                {entry.text}
                            </span>
                        </motion.div>
                    );
                })}
            </AnimatePresence>
        </div>
    );
}
