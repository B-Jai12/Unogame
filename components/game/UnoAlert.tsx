'use client';

/**
 * components/game/UnoAlert.tsx
 *
 * Animated full-width banner that appears when any player reaches 1 card.
 *
 * Shows: "[Name] has one card! Call UNO or get caught!"
 * Auto-dismisses when the player is no longer UNO-eligible.
 *
 * Design: glassmorphic pill, pulses pink/violet, slides in from top.
 */

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Player } from '@/lib/types';

interface UnoAlertProps {
    /** List of currently eligible players (hand.length === 1 && !hasCalledUNO) */
    eligiblePlayers: Player[];
    /** UID of the local player — shown differently ("You have one card!") */
    currentUid: string;
}

interface AlertEntry {
    uid: string;
    name: string;
    isSelf: boolean;
    key: string; // unique per eligibility event
}

export default function UnoAlert({ eligiblePlayers, currentUid }: UnoAlertProps) {
    const [alerts, setAlerts] = useState<AlertEntry[]>([]);
    // Track which uids we've already shown an alert for (keyed by uid+timestamp)
    const shownRef = useRef<Set<string>>(new Set());

    useEffect(() => {
        const now = Date.now();
        const newAlerts: AlertEntry[] = [];

        for (const p of eligiblePlayers) {
            // Use uid as the dedup key — reset when unoEligible becomes false
            const key = `${p.uid}-${p.unoEligibleTimestamp ?? now}`;
            if (!shownRef.current.has(key)) {
                shownRef.current.add(key);
                newAlerts.push({
                    uid: p.uid,
                    name: p.username,
                    isSelf: p.uid === currentUid,
                    key,
                });
            }
        }

        if (newAlerts.length === 0) return;

        setAlerts((prev) => [...prev, ...newAlerts]);

        // Auto-dismiss each alert after 4s
        for (const alert of newAlerts) {
            setTimeout(() => {
                setAlerts((prev) => prev.filter((a) => a.key !== alert.key));
            }, 4000);
        }
    }, [eligiblePlayers, currentUid]);

    // Also clear alerts for players who are no longer eligible
    useEffect(() => {
        const eligibleUids = new Set(eligiblePlayers.map((p) => p.uid));
        setAlerts((prev) => prev.filter((a) => eligibleUids.has(a.uid)));
    }, [eligiblePlayers]);

    return (
        <div
            style={{
                position: 'fixed',
                top: 72,
                left: '50%',
                transform: 'translateX(-50%)',
                zIndex: 60,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 8,
                pointerEvents: 'none',
            }}
        >
            <AnimatePresence mode="sync">
                {alerts.map((alert) => (
                    <motion.div
                        key={alert.key}
                        initial={{ y: -48, opacity: 0, scale: 0.88 }}
                        animate={{ y: 0, opacity: 1, scale: 1 }}
                        exit={{ y: -36, opacity: 0, scale: 0.92 }}
                        transition={{ type: 'spring', stiffness: 420, damping: 28 }}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 10,
                            padding: '10px 22px',
                            borderRadius: 999,
                            background: alert.isSelf
                                ? 'linear-gradient(135deg, rgba(255,107,135,0.85), rgba(168,123,255,0.85))'
                                : 'linear-gradient(135deg, rgba(30,15,50,0.88), rgba(20,10,40,0.88))',
                            backdropFilter: 'blur(18px)',
                            border: alert.isSelf
                                ? '2px solid rgba(255,158,203,0.8)'
                                : '2px solid rgba(168,123,255,0.5)',
                            boxShadow: alert.isSelf
                                ? '0 0 32px rgba(255,107,135,0.6), 0 8px 24px rgba(0,0,0,0.3)'
                                : '0 0 20px rgba(168,123,255,0.4), 0 8px 24px rgba(0,0,0,0.3)',
                        }}
                    >
                        {/* Pulsing dot */}
                        <motion.div
                            animate={{ scale: [1, 1.4, 1], opacity: [0.8, 1, 0.8] }}
                            transition={{ duration: 0.9, repeat: Infinity }}
                            style={{
                                width: 9,
                                height: 9,
                                borderRadius: '50%',
                                background: alert.isSelf ? 'white' : '#ff9ecb',
                                flexShrink: 0,
                            }}
                        />

                        {/* Message */}
                        <span
                            style={{
                                fontSize: 13,
                                fontWeight: 700,
                                color: 'white',
                                letterSpacing: '0.02em',
                                whiteSpace: 'nowrap',
                                textShadow: '0 1px 6px rgba(0,0,0,0.4)',
                            }}
                        >
                            {alert.isSelf
                                ? 'You have one card! Press UNO!'
                                : `${alert.name} has one card!`}
                        </span>

                        {/* Catch hint for others */}
                        {!alert.isSelf && (
                            <span
                                style={{
                                    fontSize: 11,
                                    fontWeight: 600,
                                    color: 'rgba(255,200,220,0.8)',
                                    letterSpacing: '0.04em',
                                    whiteSpace: 'nowrap',
                                }}
                            >
                                Call UNO or get caught!
                            </span>
                        )}
                    </motion.div>
                ))}
            </AnimatePresence>
        </div>
    );
}
