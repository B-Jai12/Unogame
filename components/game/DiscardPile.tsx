'use client';

/**
 * components/game/DiscardPile.tsx
 *
 * Displays the top card of the discard pile with organic stacking physics.
 *
 * Each new top card enters with:
 *   - A spring-animated fly-in from above.
 *   - A random resting rotation between -7° and +7° so the pile looks
 *     naturally stacked rather than mechanically perfect.
 *
 * Also renders:
 *   - The active color orb (shown when a Wild has been played and a color chosen).
 *   - A pending draw count badge (+2 / +4) when stacking is in force.
 */

import { motion, AnimatePresence } from 'framer-motion';
import { Card as CardType } from '@/lib/types';
import Card from './Card';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface DiscardPileProps {
    topCard: CardType | null;
    currentColor: string;
    pendingDrawCount: number;
}

// ---------------------------------------------------------------------------
// Color orb fills matching the UNO pastel palette
// ---------------------------------------------------------------------------

const COLOR_ORBS: Record<string, string> = {
    red: '#ff8da1',
    blue: '#8da9ff',
    green: '#8dffb3',
    yellow: '#ffe38d',
};

// ---------------------------------------------------------------------------
// Stable seeded rotation — avoids hydration mismatches by deriving the
// rotation from the card's ID instead of Math.random() at render time.
// ---------------------------------------------------------------------------

function stableRotation(seed: string): number {
    let h = 0;
    for (let k = 0; k < seed.length; k++) {
        h = (Math.imul(31, h) + seed.charCodeAt(k)) | 0;
    }
    // Map to [-7, +7] degrees
    return ((h % 1400) / 100) - 7;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function DiscardPile({
    topCard,
    currentColor,
    pendingDrawCount,
}: DiscardPileProps) {
    const orbColor = COLOR_ORBS[currentColor] ?? '#c8a2ff';

    return (
        <div className="relative flex flex-col items-center gap-3">

            {/* ── Card slot (ghost outline when empty) ──────────────────────── */}
            <div
                style={{
                    width: 96,
                    height: 134,
                    position: 'relative',
                }}
            >
                {/* Empty slot background */}
                <div
                    className="absolute inset-0 rounded-2xl"
                    style={{
                        border: '2.5px dashed rgba(255,255,255,0.2)',
                        backgroundColor: 'rgba(255,255,255,0.05)',
                    }}
                />

                {/* Animated top card */}
                <AnimatePresence mode="popLayout">
                    {topCard && (
                        <motion.div
                            key={topCard.id}
                            initial={{ y: -60, opacity: 0, scale: 0.85 }}
                            animate={{
                                y: 0,
                                opacity: 1,
                                scale: 1,
                                rotate: stableRotation(topCard.id),
                                transition: {
                                    type: 'spring',
                                    stiffness: 380,
                                    damping: 26,
                                },
                            }}
                            exit={{
                                opacity: 0,
                                scale: 0.9,
                                transition: { duration: 0.15 },
                            }}
                            style={{
                                position: 'absolute',
                                inset: 0,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                            }}
                        >
                            <Card
                                card={topCard}
                                isPlayable={false}
                                isHidden={false}
                                noLayoutId
                            />
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* ── Pending draw badge (+2 / +4) ──────────────────────────── */}
                <AnimatePresence>
                    {pendingDrawCount > 0 && (
                        <motion.div
                            key="draw-badge"
                            initial={{ scale: 0, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0, opacity: 0 }}
                            transition={{ type: 'spring', stiffness: 500, damping: 28 }}
                            style={{
                                position: 'absolute',
                                top: -12,
                                right: -12,
                                zIndex: 20,
                                background: 'linear-gradient(135deg, #ff6b87, #a87bff)',
                                borderRadius: '50%',
                                width: 32,
                                height: 32,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                boxShadow: '0 4px 12px rgba(255,107,135,0.5)',
                                border: '2px solid rgba(255,255,255,0.7)',
                            }}
                        >
                            <span
                                style={{
                                    color: 'white',
                                    fontSize: 11,
                                    fontWeight: 800,
                                    fontFamily: 'system-ui',
                                }}
                            >
                                +{pendingDrawCount}
                            </span>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* ── Active color orb ──────────────────────────────────────────── */}
            <AnimatePresence mode="wait">
                <motion.div
                    key={currentColor}
                    initial={{ scale: 0.6, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.6, opacity: 0 }}
                    transition={{ type: 'spring', stiffness: 420, damping: 24 }}
                    style={{
                        width: 20,
                        height: 20,
                        borderRadius: '50%',
                        backgroundColor: orbColor,
                        border: '2.5px solid rgba(255,255,255,0.65)',
                        boxShadow: `0 0 14px ${orbColor}cc, 0 0 4px ${orbColor}`,
                    }}
                    title={`Active color: ${currentColor}`}
                />
            </AnimatePresence>

            {/* ── Label ─────────────────────────────────────────────────────── */}
            <span
                style={{
                    fontSize: 10,
                    fontWeight: 600,
                    color: 'rgba(255,255,255,0.45)',
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                }}
            >
                Discard
            </span>
        </div>
    );
}
