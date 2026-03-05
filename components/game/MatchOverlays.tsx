'use client';

/**
 * components/game/MatchOverlays.tsx
 *
 * Full-screen glassmorphic overlays for round end and match end.
 * Geometric confetti uses only pure shapes (no emoji).
 */

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Room, Player } from '@/lib/types';
import { getCardPoints } from '@/lib/engine';

interface MatchOverlaysProps {
    room: Room;
    currentUid: string;
    isHost: boolean;
    onNextRound: () => void;
    onReturnHome: () => void;
}

// ---------------------------------------------------------------------------
// Seeded geometric confetti — no emoji, no random at render time
// ---------------------------------------------------------------------------

const PALETTE = ['#ff8da1', '#c8a2ff', '#ffd1e8', '#e2d1ff', '#ffb3d9'];
const PARTICLES = Array.from({ length: 34 }, (_, i) => ({
    id: i,
    x: (i * 37 + 11) % 97,
    size: 8 + ((i * 13) % 14),
    delay: (i * 0.19) % 3.2,
    color: PALETTE[i % PALETTE.length],
    circle: i % 3 !== 0,
    drift: (i * 7 + 3) % 20 - 10,
}));

function Confetti() {
    return (
        <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 0 }}>
            {PARTICLES.map((p) => (
                <motion.div
                    key={p.id}
                    style={{
                        position: 'absolute',
                        left: `${p.x}%`,
                        top: -p.size,
                        width: p.size,
                        height: p.circle ? p.size : p.size * 0.5,
                        borderRadius: p.circle ? '50%' : 5,
                        backgroundColor: p.color,
                    }}
                    animate={{ y: ['0vh', '110vh'], x: [0, p.drift * 8], rotate: [0, p.circle ? 0 : 270], opacity: [0, 1, 1, 0] }}
                    transition={{ duration: 3.8 + p.delay, delay: p.delay, ease: 'easeIn', repeat: Infinity, repeatDelay: p.delay * 0.6 }}
                />
            ))}
        </div>
    );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function Avatar({ name, size = 38 }: { name: string; size?: number }) {
    return (
        <div style={{
            width: size, height: size, borderRadius: '50%',
            background: 'linear-gradient(135deg, #ff9ecb, #a87bff)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: '2px solid rgba(255,255,255,0.5)',
            fontFamily: 'Georgia, serif', fontWeight: 700,
            fontSize: size * 0.38, color: 'white', flexShrink: 0,
        }}>
            {name.charAt(0).toUpperCase()}
        </div>
    );
}

function Glass({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
    return (
        <div style={{
            background: 'rgba(255,255,255,0.14)', backdropFilter: 'blur(28px)',
            borderRadius: 24, border: '1.5px solid rgba(255,255,255,0.3)',
            boxShadow: '0 20px 60px rgba(168,123,255,0.25)',
            ...style,
        }}>
            {children}
        </div>
    );
}

function calcEarned(players: Player[], winnerId: string) {
    return players.filter((p) => p.uid !== winnerId).flatMap((p) => p.hand)
        .reduce((s, c) => s + getCardPoints(c), 0);
}

const Backdrop = ({ children }: { children: React.ReactNode }) => (
    <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        style={{
            position: 'fixed', inset: 0, backgroundColor: 'rgba(15,0,35,0.68)',
            backdropFilter: 'blur(12px)', display: 'flex',
            alignItems: 'center', justifyContent: 'center', zIndex: 40,
        }}
    >
        {children}
    </motion.div>
);

const PanelMotion = ({ children }: { children: React.ReactNode }) => (
    <motion.div
        initial={{ scale: 0.82, y: 32, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        exit={{ scale: 0.88, y: 16, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 28 }}
        style={{ position: 'relative', zIndex: 1 }}
    >
        {children}
    </motion.div>
);

// ---------------------------------------------------------------------------
// Round End
// ---------------------------------------------------------------------------

function RoundEnd({ room, currentUid, onNextRound }: {
    room: Room; currentUid: string; onNextRound: () => void;
}) {
    const winner = room.players.find((p) => p.uid === room.roundWinnerId);
    const iWon = room.roundWinnerId === currentUid;
    const earned = room.roundWinnerId ? calcEarned(room.players, room.roundWinnerId) : 0;
    const sorted = [...room.players].sort((a, b) => (b.matchScore ?? 0) - (a.matchScore ?? 0));
    const lead = sorted[0]?.matchScore ?? 0;

    return (
        <Backdrop>
            <PanelMotion>
                <Glass style={{ padding: '40px 44px', minWidth: 340, maxWidth: 420, textAlign: 'center' }}>
                    <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)', marginBottom: 8 }}>
                        Round {room.roundNumber} Complete
                    </p>
                    <h2 style={{ fontFamily: 'Georgia, serif', fontSize: 28, fontWeight: 700, color: 'white', marginBottom: 6 }}>
                        {iWon ? 'Round Won!' : `${winner?.username ?? '...'} Wins`}
                    </h2>
                    <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)', marginBottom: 28 }}>
                        +{earned} points {iWon ? 'earned' : `for ${winner?.username ?? '...'}`}
                    </p>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
                        {sorted.map((p, i) => (
                            <motion.div key={p.uid} initial={{ opacity: 0, x: -14 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.07 * i }}
                                style={{
                                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                    padding: '9px 14px', borderRadius: 13,
                                    background: p.uid === currentUid ? 'rgba(255,158,203,0.18)' : 'rgba(255,255,255,0.07)',
                                    border: p.uid === currentUid ? '1px solid rgba(255,158,203,0.35)' : '1px solid rgba(255,255,255,0.09)',
                                }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                                    <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', width: 16 }}>{i + 1}.</span>
                                    <Avatar name={p.username} size={28} />
                                    <span style={{ fontSize: 13, fontWeight: 600, color: 'white' }}>{p.username}</span>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <div style={{ fontSize: 14, fontWeight: 700, color: 'white' }}>{p.matchScore ?? 0}</div>
                                    <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)' }}>/ {room.matchWinScore}</div>
                                </div>
                            </motion.div>
                        ))}
                    </div>

                    {/* Progress bar */}
                    <div style={{ height: 5, borderRadius: 3, background: 'rgba(255,255,255,0.12)', overflow: 'hidden', marginBottom: 28 }}>
                        <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${Math.min(100, (lead / room.matchWinScore) * 100)}%` }}
                            transition={{ duration: 1.1, ease: 'easeOut', delay: 0.35 }}
                            style={{ height: '100%', background: 'linear-gradient(90deg, #ff9ecb, #a87bff)', borderRadius: 3 }}
                        />
                    </div>

                    {/* Any active player can start next round */}
                    <motion.button
                        whileHover={{ scale: 1.04, boxShadow: '0 0 24px rgba(255,158,203,0.6)' }}
                        whileTap={{ scale: 0.97 }}
                        onClick={onNextRound}
                        style={{
                            width: '100%', padding: '13px 0', borderRadius: 13,
                            background: 'linear-gradient(135deg, #ff9ecb, #a87bff)',
                            border: 'none', color: 'white', fontSize: 15, fontWeight: 700,
                            cursor: 'pointer', boxShadow: '0 6px 20px rgba(168,123,255,0.4)',
                        }}
                    >
                        Start Next Round
                    </motion.button>
                </Glass>
            </PanelMotion>
        </Backdrop>
    );
}

// ---------------------------------------------------------------------------
// Match End
// ---------------------------------------------------------------------------

function MatchEnd({ room, currentUid, onReturnHome }: {
    room: Room; currentUid: string; onReturnHome: () => void;
}) {
    const champion = room.players.find((p) => p.uid === room.matchWinnerId);
    const iChamp = room.matchWinnerId === currentUid;
    const sorted = [...room.players].sort((a, b) => (b.matchScore ?? 0) - (a.matchScore ?? 0));

    return (
        <Backdrop>
            <Confetti />
            <PanelMotion>
                <Glass style={{ padding: '48px 52px', minWidth: 360, maxWidth: 440, textAlign: 'center' }}>
                    {/* Champion avatar */}
                    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
                        <motion.div
                            animate={{ scale: [1, 1.07, 1] }}
                            transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
                            style={{
                                width: 72, height: 72, borderRadius: '50%',
                                background: 'linear-gradient(135deg, #ffd700, #ff9ecb, #a87bff)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                border: '3px solid rgba(255,255,255,0.6)',
                                boxShadow: '0 0 32px rgba(255,215,0,0.5)',
                                fontFamily: 'Georgia, serif', fontWeight: 700, fontSize: 28, color: 'white',
                                textShadow: '0 2px 8px rgba(0,0,0,0.3)',
                            }}
                        >
                            {champion?.username.charAt(0).toUpperCase() ?? '?'}
                        </motion.div>
                    </div>

                    <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(255,215,0,0.8)', marginBottom: 8 }}>
                        Match Complete
                    </p>
                    <motion.h1
                        animate={{ scale: [1, 1.03, 1] }}
                        transition={{ duration: 2.5, repeat: Infinity }}
                        style={{ fontFamily: 'Georgia, serif', fontSize: 32, fontWeight: 900, color: 'white', marginBottom: 6, textShadow: '0 4px 20px rgba(255,158,203,0.6)' }}
                    >
                        {iChamp ? 'You Won the Match!' : `${champion?.username ?? '...'} Wins!`}
                    </motion.h1>
                    <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', marginBottom: 32 }}>
                        {champion?.matchScore ?? 0} points total
                    </p>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 32 }}>
                        {sorted.map((p, i) => (
                            <motion.div key={p.uid} initial={{ opacity: 0, x: -18 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 * i }}
                                style={{
                                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                    padding: '9px 14px', borderRadius: 13,
                                    background: i === 0 ? 'rgba(255,215,0,0.14)' : p.uid === currentUid ? 'rgba(255,158,203,0.14)' : 'rgba(255,255,255,0.07)',
                                    border: i === 0 ? '1px solid rgba(255,215,0,0.3)' : '1px solid rgba(255,255,255,0.09)',
                                }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                                    <span style={{ fontSize: 12, fontWeight: 700, color: i === 0 ? '#ffd700' : 'rgba(255,255,255,0.35)', width: 22 }}>#{i + 1}</span>
                                    <Avatar name={p.username} size={28} />
                                    <span style={{ fontSize: 13, fontWeight: 600, color: 'white' }}>{p.username}</span>
                                </div>
                                <span style={{ fontSize: 14, fontWeight: 700, color: i === 0 ? '#ffd700' : 'white' }}>
                                    {p.matchScore ?? 0} pts
                                </span>
                            </motion.div>
                        ))}
                    </div>

                    <motion.button
                        whileHover={{ scale: 1.04, boxShadow: '0 0 28px rgba(255,158,203,0.7)' }}
                        whileTap={{ scale: 0.97 }}
                        onClick={onReturnHome}
                        style={{
                            width: '100%', padding: '14px 0', borderRadius: 13,
                            background: 'linear-gradient(135deg, #ff9ecb, #c8a2ff, #a87bff)',
                            border: 'none', color: 'white', fontSize: 15, fontWeight: 700,
                            cursor: 'pointer', boxShadow: '0 6px 24px rgba(168,123,255,0.45)',
                        }}
                    >
                        Return to Home
                    </motion.button>
                </Glass>
            </PanelMotion>
        </Backdrop>
    );
}

// ---------------------------------------------------------------------------
// Exported entry point
// ---------------------------------------------------------------------------

export default function MatchOverlays({ room, currentUid, isHost, onNextRound, onReturnHome }: MatchOverlaysProps) {
    return (
        <AnimatePresence mode="wait">
            {room.status === 'roundEnded' && (
                <RoundEnd key="round" room={room} currentUid={currentUid} onNextRound={onNextRound} />
            )}
            {room.status === 'matchEnded' && (
                <MatchEnd key="match" room={room} currentUid={currentUid} onReturnHome={onReturnHome} />
            )}
        </AnimatePresence>
    );
}
