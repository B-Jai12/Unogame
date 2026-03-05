'use client';

/**
 * app/room/[roomId]/page.tsx
 *
 * Primary game room page — assembled from all game components.
 *
 * Layout (5-zone CSS grid for landscape, flex-column for portrait):
 *
 *   ┌────────────────────────────────────────────┐
 *   │  TOP BAR: turn indicator · direction badge │
 *   ├──────────┬──────────────────────┬──────────┤
 *   │          │  OPPONENT ARC        │          │
 *   │ SCORE-   │  CENTER PILES        │  CHAT    │
 *   │ BOARD    │  PLAYER HAND         │  BOX     │
 *   │          │  UNO BUTTON          │          │
 *   └──────────┴──────────────────────┴──────────┘
 *
 * Background: animated diagonal gradient (Pink → Lavender → Purple).
 */

import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { Room, CardColor } from '@/lib/types';
import {
    actionPlayCard,
    actionDrawCard,
    actionCallUNO,
    actionCatchUNO,
    actionNextRound,
    actionPassTurn,
    actionEmote,
} from '@/lib/guestActions';
import { useGameStore } from '@/store/useGameStore';
import { useHostEngine } from '@/lib/hostEngine';
import PlayerHand from '@/components/game/PlayerHand';
import DrawAndDiscardPile from '@/components/game/DrawAndDiscardPile';
import OpponentArea from '@/components/game/OpponentArea';
import UnoButton from '@/components/game/UnoButton';
import ColorPicker from '@/components/game/ColorPicker';
import MatchOverlays from '@/components/game/MatchOverlays';
import ChatBox from '@/components/game/ChatBox';
import Scoreboard from '@/components/game/Scoreboard';
import ThemeToggle from '@/components/ui/ThemeToggle';
import Toast from '@/components/ui/Toast';
import EmotePicker from '@/components/game/EmotePicker';
import FloatingEmote from '@/components/game/FloatingEmote';
import ActivityFeed, { ActivityEntry } from '@/components/game/ActivityFeed';
import TurnTimer from '@/components/game/TurnTimer';
import UnoAlert from '@/components/game/UnoAlert';
import { playCardPlay, playCardDraw, playUNO, playWin, playTurnStart } from '@/lib/sound';

// ---------------------------------------------------------------------------
// Host engine wrapper — rule: hooks must not be called conditionally
// ---------------------------------------------------------------------------

function HostEngineMount({ roomId, room, currentUid }: {
    roomId: string;
    room: Room;
    currentUid: string;
}) {
    useHostEngine({ roomId, room, currentUid });
    return null;
}

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------

export default function RoomPage() {
    const { roomId } = useParams<{ roomId: string }>();
    const router = useRouter();

    const {
        showColorPicker,
        setShowColorPicker,
        pendingWildCardId,
        setPendingWildCardId,
        showToast,
    } = useGameStore();

    const [room, setRoom] = useState<Room | null>(null);
    const [currentUid, setCurrentUid] = useState<string | null>(null);
    const [authChecked, setAuthChecked] = useState(false);
    const [drawLoading, setDrawLoading] = useState(false);
    const [mounted, setMounted] = useState(false);

    // ── Spam prevention — lock card plays for 600ms after each action ──────────
    const playingCard = useRef(false);

    // ── Activity feed state ────────────────────────────────────────────────────
    const [activityEntries, setActivityEntries] = useState<ActivityEntry[]>([]);
    const prevRoomRef = useRef<Room | null>(null);

    function addActivity(text: string, icon?: string) {
        setActivityEntries(prev => [
            ...prev.slice(-19), // keep last 20
            { id: `${Date.now()}-${Math.random()}`, text, icon, ts: Date.now() },
        ]);
    }

    useEffect(() => {
        setMounted(true);
    }, []);

    // ── Auth listener ──────────────────────────────────────────────────────────
    useEffect(() => {
        const unsub = onAuthStateChanged(auth, (u) => {
            setCurrentUid(u?.uid ?? null);
            setAuthChecked(true);
            if (!u) router.push('/');
        });
        return unsub;
    }, [router]);

    // ── Room listener ──────────────────────────────────────────────────────────
    useEffect(() => {
        if (!roomId) return;
        const unsub = onSnapshot(doc(db, 'rooms', roomId), (snap) => {
            if (!snap.exists()) { router.push('/'); return; }
            setRoom({ id: snap.id, ...snap.data() } as Room);
        });
        return unsub;
    }, [roomId, router]);

    // ── Derived state ──────────────────────────────────────────────────────────
    const isHost = room?.hostId === currentUid;
    const myPlayer = useMemo(() => room?.players.find((p) => p.uid === currentUid) ?? null, [room, currentUid]);
    const opponents = useMemo(() => room?.players.filter((p) => p.uid !== currentUid) ?? [], [room, currentUid]);
    const currentTurnUid = room ? room.players[room.currentTurnIndex]?.uid : null;
    const isMyTurn = currentTurnUid === currentUid;
    const topDiscard = room?.discardPile.at(-1) ?? null;

    // ── UNO! state detection — toast when any player drops to 1 card ────────────
    const prevHandSizes = useRef<Record<string, number>>({});
    const [unoToast, setUnoToast] = useState<string | null>(null);
    useEffect(() => {
        if (!room) return;
        room.players.forEach((p) => {
            const prev = prevHandSizes.current[p.uid] ?? 999;
            if (prev > 1 && p.hand.length === 1) {
                setUnoToast(p.username);
                setTimeout(() => setUnoToast(null), 2800);
            }
            prevHandSizes.current[p.uid] = p.hand.length;
        });
    }, [room?.players]);

    // ── Activity feed + sound effects ─────────────────────────────────────────
    useEffect(() => {
        const prev = prevRoomRef.current;
        if (!prev || !room) { prevRoomRef.current = room; return; }

        // Detect card played (discard pile grew)
        if (room.discardPile.length > prev.discardPile.length) {
            const card = room.discardPile.at(-1);
            const actor = room.players[prev.currentTurnIndex]?.username ?? 'Someone';
            if (card) {
                const label = card.type === 'number' ? `${card.color} ${card.value}`
                    : card.type === 'wild' ? 'Wild' : card.type === 'wild4' ? 'Wild Draw 4'
                        : `${card.color} ${card.type}`;
                addActivity(`${actor} played ${label}`, '🃏');
                playCardPlay();
            }
        }

        // Detect card drawn (someone's hand grew without playing)
        if (room.discardPile.length === prev.discardPile.length) {
            room.players.forEach(p => {
                const prevP = prev.players.find(x => x.uid === p.uid);
                if (prevP && p.hand.length > prevP.hand.length) {
                    const delta = p.hand.length - prevP.hand.length;
                    addActivity(`${p.username} drew ${delta} card${delta > 1 ? 's' : ''}`, '🎴');
                    playCardDraw();
                }
            });
        }

        // Direction reversed
        if (room.direction !== prev.direction) {
            addActivity('Direction reversed!', '🔄');
        }

        // Turn changed → play turn sound if it's now my turn
        if (room.currentTurnIndex !== prev.currentTurnIndex && room.players[room.currentTurnIndex]?.uid === currentUid) {
            playTurnStart();
        }

        // UNO toast → play UNO sound
        room.players.forEach(p => {
            const prevP = prev.players.find(x => x.uid === p.uid);
            if (prevP && !prevP.hasCalledUNO && p.hasCalledUNO) {
                addActivity(`${p.username} called UNO!`, '🔥');
                playUNO();
            }
        });

        // Match/round win
        if (room.status !== prev.status && (room.status === 'matchEnded' || room.status === 'roundEnded')) {
            const winner = room.players.find(p => p.uid === room.roundWinnerId);
            if (winner) {
                addActivity(`${winner.username} wins the round!`, '🏆');
                playWin();
            }
        }

        prevRoomRef.current = room;
    }, [room, currentUid]);

    // ── Emote display — centralized, keyed by timestamp for reliable React updates ──
    const [displayedEmote, setDisplayedEmote] = useState<{ uid: string; emote: string; username: string; ts: number } | null>(null);
    const lastEmoteTs = useRef<number>(0);

    useEffect(() => {
        const e = room?.lastEmote;
        if (!e || !e.timestamp || e.timestamp <= lastEmoteTs.current) return;
        lastEmoteTs.current = e.timestamp;
        const sender = room?.players.find(p => p.uid === e.uid);
        setDisplayedEmote({ uid: e.uid, emote: e.emote, username: sender?.username ?? '', ts: e.timestamp });
    }, [room?.lastEmote?.timestamp, room?.lastEmote?.uid, room?.lastEmote?.emote]);

    const handleEmote = useCallback(async (emote: string) => {
        if (!currentUid || !roomId) return;
        // Optimistic local update — show immediately without waiting for Firestore
        const ts = Date.now();
        lastEmoteTs.current = ts;
        const myUsername = myPlayer?.username ?? '';
        setDisplayedEmote({ uid: currentUid, emote, username: myUsername, ts });
        // Then write to Firestore
        try { await actionEmote(roomId, currentUid, emote); } catch { /* silent */ }
    }, [roomId, currentUid, myPlayer]);

    const handlePlayCard = useCallback(async (cardId: string, chosenColor?: CardColor) => {
        if (!isMyTurn || !currentUid || !roomId) return;
        // Spam prevention — ignore rapid double-clicks
        if (playingCard.current) return;
        const card = myPlayer?.hand.find((c) => c.id === cardId);
        if (!card) return;
        if (card.type === 'wild' || card.type === 'wild4') {
            setPendingWildCardId(cardId);
            setShowColorPicker(true);
            return;
        }
        playingCard.current = true;
        try { await actionPlayCard(roomId, currentUid, cardId); }
        catch { showToast('Could not play that card.', 'error'); }
        finally { setTimeout(() => { playingCard.current = false; }, 600); }
    }, [isMyTurn, currentUid, roomId, myPlayer, setPendingWildCardId, setShowColorPicker, showToast]);

    const handleDraw = useCallback(async () => {
        if (!isMyTurn || drawLoading || !currentUid || !roomId) return;
        setDrawLoading(true);
        try {
            await actionDrawCard(roomId, currentUid);
            // Show helpful hint if it's a voluntary draw (no pending forced draw)
            if (room && room.pendingDrawCount === 0) {
                showToast('Card drawn — play it or End Turn', 'info');
            }
        }
        catch { showToast('Could not draw a card.', 'error'); }
        finally { setDrawLoading(false); }
    }, [isMyTurn, drawLoading, currentUid, roomId, room, showToast]);

    const handleCallUNO = useCallback(async () => {
        if (!currentUid || !roomId) return;
        try { await actionCallUNO(roomId, currentUid); }
        catch { showToast('Could not call UNO.', 'error'); }
    }, [currentUid, roomId, showToast]);

    const handleCatch = useCallback(async (targetId: string) => {
        if (!currentUid || !roomId) return;
        try { await actionCatchUNO(roomId, currentUid, targetId); }
        catch { showToast('Could not catch that player.', 'error'); }
    }, [currentUid, roomId, showToast]);

    const handleNextRound = useCallback(async () => {
        // Any active player can start next round (host may have disconnected).
        if (!currentUid || !roomId) return;
        try { await actionNextRound(roomId, currentUid); }
        catch { showToast('Could not start next round.', 'error'); }
    }, [currentUid, roomId, showToast]);

    const handlePass = useCallback(async () => {
        if (!isMyTurn || !currentUid || !roomId) return;
        try { await actionPassTurn(roomId, currentUid); }
        catch { showToast('Could not end turn.', 'error'); }
    }, [isMyTurn, currentUid, roomId, showToast]);

    const handleReturnHome = useCallback(() => router.push('/'), [router]);

    // ── Loading guard ──────────────────────────────────────────────────────────
    if (!mounted || !authChecked || !room || !currentUid) {
        return (
            <div
                className="min-h-screen flex items-center justify-center"
                style={{
                    background:
                        'linear-gradient(135deg, #ff9ecb 0%, #c8a2ff 50%, #a87bff 100%)',
                }}
            >
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 rounded-full border-4 border-white/30 border-t-white animate-spin" />
                    <p className="text-white/70 text-sm font-medium tracking-wide">
                        {!mounted ? 'Initializing...' : !authChecked ? 'Authenticating...' : 'Joining room...'}
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div
            className="h-[100dvh] overflow-hidden flex flex-col relative transition-colors duration-500"
            style={{
                background: 'var(--bg-color)',
            }}
        >
            {/* Theme-specific background overlay */}
            <div className="absolute inset-0 dark:opacity-100 opacity-0 transition-opacity duration-700 pointer-events-none"
                style={{
                    background: 'radial-gradient(circle at 50% 50%, #1a1a2e 0%, #0a0a0c 100%)',
                }}
            />
            {!useGameStore.getState().theme || useGameStore.getState().theme === 'light' ? (
                <div className="absolute inset-0 opacity-100 transition-opacity duration-700 pointer-events-none"
                    style={{
                        background: 'linear-gradient(135deg, #ff9ecb 0%, #d4aaff 40%, #a87bff 100%)',
                        backgroundSize: '200% 200%',
                        animation: 'gradientFlow 12s ease infinite',
                    }}
                />
            ) : null}
            {/* Animated gradient keyframes */}
            <style>{`
        @keyframes gradientFlow {
          0%   { background-position: 0% 50%; }
          50%  { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
      `}</style>

            {/* Host engine (mounted only for the host client) */}
            {isHost && (
                <HostEngineMount roomId={roomId} room={room} currentUid={currentUid} />
            )}

            {/* Toast notifications */}
            <Toast />

            {/* UNO Alert banner — appears when a player reaches 1 card */}
            {room.status === 'playing' && (
                <UnoAlert
                    eligiblePlayers={room.players.filter(
                        (p) => p.unoEligible && !p.hasCalledUNO && p.hand.length === 1
                    )}
                    currentUid={currentUid}
                />
            )}

            {/* Emote Overlay — renders from center, keyed by timestamp so it always re-mounts */}
            <AnimatePresence mode="popLayout">
                {displayedEmote && (
                    <motion.div
                        key={displayedEmote.ts}
                        initial={{ opacity: 0, y: 0, scale: 0.4 }}
                        animate={{ opacity: [0, 1, 1, 0], y: -180, scale: [0.4, 1.6, 1.4, 0.8] }}
                        transition={{ duration: 2.2, ease: 'easeOut', times: [0, 0.15, 0.7, 1] }}
                        onAnimationComplete={() => setDisplayedEmote(null)}
                        style={{
                            position: 'fixed',
                            bottom: '38%',
                            left: '50%',
                            transform: 'translateX(-50%)',
                            zIndex: 9999,
                            pointerEvents: 'none',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: 4,
                        }}
                    >
                        <span style={{ fontSize: 64, lineHeight: 1, filter: 'drop-shadow(0 4px 20px rgba(0,0,0,0.35))' }}>
                            {displayedEmote.emote}
                        </span>
                        {displayedEmote.username && (
                            <span style={{
                                fontSize: 12, fontWeight: 700, color: 'white',
                                background: 'rgba(0,0,0,0.5)',
                                backdropFilter: 'blur(8px)',
                                padding: '3px 12px', borderRadius: 99,
                                border: '1px solid rgba(255,255,255,0.2)',
                            }}>
                                {displayedEmote.username}
                            </span>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* UNO! center toast */}
            <AnimatePresence>
                {unoToast && (
                    <motion.div
                        initial={{ y: -80, opacity: 0, scale: 0.85 }}
                        animate={{ y: 0, opacity: 1, scale: 1 }}
                        exit={{ y: -80, opacity: 0, scale: 0.85 }}
                        transition={{ type: 'spring', stiffness: 420, damping: 28 }}
                        style={{
                            position: 'fixed', top: 64, left: '50%', transform: 'translateX(-50%)',
                            zIndex: 9999, pointerEvents: 'none',
                            background: 'linear-gradient(135deg, rgba(255,50,80,0.9), rgba(168,123,255,0.85))',
                            backdropFilter: 'blur(16px)', borderRadius: 99,
                            padding: '10px 28px', border: '1.5px solid rgba(255,255,255,0.4)',
                            boxShadow: '0 8px 40px rgba(255,50,80,0.5)',
                            display: 'flex', alignItems: 'center', gap: 10,
                        }}
                    >
                        <span style={{ fontSize: 13, fontWeight: 900, color: 'white', letterSpacing: '0.04em' }}>
                            {unoToast.charAt(0).toUpperCase() + unoToast.slice(1)} has UNO!
                        </span>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ── Top bar ─────────────────────────────────────────────────────── */}
            <div className="flex items-center justify-between px-4 py-2.5 shrink-0 gap-3 relative z-50">
                {/* Direction badge — hidden on small screens to save space */}
                <div
                    className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl shrink-0"
                    style={{
                        background: 'rgba(255,255,255,0.18)',
                        backdropFilter: 'blur(12px)',
                        border: '1px solid rgba(255,255,255,0.3)',
                    }}
                >
                    <div
                        className="w-2 h-2 rounded-full"
                        style={{
                            backgroundColor: room.direction === 1 ? '#4ade80' : '#60a5fa',
                            boxShadow: room.direction === 1 ? '0 0 8px #4ade80' : '0 0 8px #60a5fa',
                        }}
                    />
                    <span className="text-white text-xs font-semibold whitespace-nowrap">
                        {room.direction === 1 ? 'Clockwise' : 'Counter-CW'}
                    </span>
                </div>

                {/* Turn indicator — main center element */}
                <motion.div
                    className="flex-1 text-center px-4 py-2 rounded-xl"
                    style={{
                        background: isMyTurn
                            ? 'linear-gradient(135deg, rgba(255,158,203,0.7) 0%, rgba(168,123,255,0.7) 100%)'
                            : 'var(--glass-bg)',
                        backdropFilter: 'blur(12px)',
                        border: isMyTurn ? '1.5px solid rgba(255,158,203,0.8)' : '1px solid var(--glass-border)',
                    }}
                    animate={isMyTurn
                        ? { boxShadow: ['0 0 0px rgba(255,158,203,0)', '0 0 30px rgba(255,158,203,0.8)', '0 0 0px rgba(255,158,203,0)'] }
                        : { boxShadow: 'none' }}
                    transition={{ duration: 1.8, repeat: Infinity }}
                >
                    <p className="text-sm font-black tracking-wide" style={{ color: 'var(--text-on-panel, white)' }}>
                        {isMyTurn ? '✦  Your Turn!' : `${room.players[room.currentTurnIndex]?.username ?? '…'}'s Turn`}
                    </p>
                    {room.pendingDrawCount > 0 && (
                        <p className="text-[11px] font-bold text-red-300 mt-0.5">
                            ⚠ +{room.pendingDrawCount} draw incoming
                        </p>
                    )}
                </motion.div>

                {/* Round badge */}
                <div
                    className="px-3 py-1.5 rounded-xl shrink-0 text-center"
                    style={{
                        background: 'rgba(255,255,255,0.18)',
                        backdropFilter: 'blur(12px)',
                        border: '1px solid rgba(255,255,255,0.3)',
                    }}
                >
                    <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: 9 }} className="uppercase tracking-wide block">Round</span>
                    <span style={{ color: 'white', fontWeight: 900, fontSize: 18, lineHeight: 1 }}>{room.roundNumber}</span>
                </div>
                <ThemeToggle />
            </div>

            {/* ── Main content (Immersive Full-Screen) ─── */}
            <div className="flex-1 relative flex flex-col items-center min-h-0 overflow-hidden">

                {/* Activity Feed — floating event log */}
                <ActivityFeed entries={activityEntries} />

                {/* Floating Left: Scoreboard */}
                <div
                    className="absolute left-6 top-24 w-52 rounded-2xl hidden md:flex flex-col overflow-hidden z-20 shadow-2xl transition-all duration-300 hover:scale-[1.02]"
                    style={{
                        background: 'var(--glass-bg)',
                        backdropFilter: 'blur(20px)',
                        border: '1px solid var(--glass-border)',
                        maxHeight: 'calc(100vh - 200px)',
                    }}
                >
                    <Scoreboard
                        players={room.players}
                        currentTurnUid={currentTurnUid ?? ''}
                        roundNumber={room.roundNumber}
                        myUid={currentUid ?? ''}
                    />
                </div>

                {/* Floating Right: Chat */}
                <div
                    className="absolute right-6 top-24 w-56 rounded-2xl hidden md:flex flex-col overflow-hidden z-20 shadow-2xl transition-all duration-300 hover:scale-[1.02]"
                    style={{
                        background: 'var(--glass-bg)',
                        backdropFilter: 'blur(24px)',
                        border: '1px solid var(--glass-border)',
                        height: '400px',
                    }}
                >
                    <ChatBox roomId={roomId} currentUid={currentUid ?? ''} />
                </div>
                {/* Opponent area — centered, adaptive */}
                {(() => {
                    const compact = opponents.length >= 3;
                    return (
                        <div className="flex items-start justify-center gap-3 sm:gap-5 flex-wrap w-full max-w-4xl px-4 pt-3 z-10 shrink-0">
                            {opponents.map((opp) => (
                                <OpponentArea
                                    key={opp.uid}
                                    player={opp}
                                    isCurrentTurn={opp.uid === currentTurnUid}
                                    compact={compact}
                                    onCatch={
                                        opp.unoEligible && !opp.hasCalledUNO
                                            ? () => handleCatch(opp.uid)
                                            : undefined
                                    }
                                />
                            ))}
                            {opponents.length === 0 && (
                                <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12 }} className="text-center">
                                    Waiting for other players...
                                </p>
                            )}
                        </div>
                    );
                })()}

                {/* Center piles — always visible, shrink-0 */}
                <div className="flex-1 flex items-center justify-center shrink-0 py-2">
                    <DrawAndDiscardPile
                        topDiscard={topDiscard}
                        drawPileCount={room.drawPile.length}
                        currentColor={room.currentColor}
                        isMyTurn={isMyTurn}
                        pendingDrawCount={room.pendingDrawCount}
                        onDraw={handleDraw}
                        drawLoading={drawLoading}
                        cardBackGlow={useGameStore.getState().theme === 'dark'}
                    />
                </div>

                {/* Bottom section: controls + hand — always pinned to bottom */}
                <div className="w-full shrink-0">
                    <div className="flex flex-col items-center gap-1 w-full px-2 pb-1">
                        {isMyTurn && room.turnStartTime && (
                            <TurnTimer
                                startTime={room.turnStartTime}
                                durationMs={30000}
                                isActive={true}
                            />
                        )}

                        {/* Controls row: UNO + Emote + End Turn */}
                        <div className="flex items-center gap-3 flex-wrap justify-center">
                            <UnoButton
                                cardCount={myPlayer?.hand.length ?? 0}
                                hasCalledUNO={myPlayer?.hasCalledUNO ?? false}
                                onCallUNO={handleCallUNO}
                                catchTargets={opponents.filter(
                                    (o) => o.unoEligible && !o.hasCalledUNO,
                                )}
                                onCatch={handleCatch}
                            />

                            <EmotePicker onSelect={handleEmote} />

                            {/* End Turn — show when it's my turn and no forced draw pending */}
                            {isMyTurn && room.pendingDrawCount === 0 && (
                                <motion.button
                                    whileHover={{ scale: 1.04 }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={handlePass}
                                    className="px-6 py-2 text-sm sm:text-base"
                                    style={{
                                        borderRadius: 99,
                                        background: myPlayer?.hasDrawnThisTurn
                                            ? 'linear-gradient(135deg, rgba(255,158,203,0.35), rgba(168,123,255,0.35))'
                                            : 'var(--glass-bg)',
                                        backdropFilter: 'blur(10px)',
                                        border: myPlayer?.hasDrawnThisTurn
                                            ? '2px solid rgba(255,158,203,0.6)'
                                            : '2px solid var(--glass-border)',
                                        color: 'var(--text-color)',
                                        fontWeight: 800,
                                        letterSpacing: '0.06em',
                                        cursor: 'pointer',
                                        boxShadow: myPlayer?.hasDrawnThisTurn
                                            ? '0 4px 20px rgba(255,158,203,0.35)'
                                            : '0 4px 16px rgba(0,0,0,0.12)',
                                        whiteSpace: 'nowrap',
                                    }}
                                >
                                    {myPlayer?.hasDrawnThisTurn ? 'End Turn →' : 'Pass →'}
                                </motion.button>
                            )}
                        </div>

                        {/* ── Player hand — FULL WIDTH, NO SCROLL ── */}
                        <div className="w-full relative">
                            {myPlayer ? (
                                <PlayerHand
                                    cards={myPlayer.hand}
                                    currentColor={room.currentColor}
                                    topCard={topDiscard}
                                    isMyTurn={isMyTurn}
                                    pendingDrawCount={room.pendingDrawCount}
                                    drawStackingEnabled={room.rules?.drawStacking ?? false}
                                    onPlayCard={handlePlayCard}
                                />
                            ) : (
                                <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 14 }} className="py-6 text-center">Spectating</p>
                            )}
                        </div>
                    </div>
                </div>

                {/* ── Wild color picker overlay ────────────────────────────────── */}
                <AnimatePresence>
                    {showColorPicker && (
                        <ColorPicker
                            roomId={roomId}
                            myUid={currentUid}
                        />
                    )}
                </AnimatePresence>

                {/* ── Round / Match overlays ───────────────────────────────────── */}
                <AnimatePresence>
                    {(room.status === 'roundEnded' || room.status === 'matchEnded') && (
                        <MatchOverlays
                            room={room}
                            currentUid={currentUid}
                            isHost={isHost}
                            onNextRound={handleNextRound}
                            onReturnHome={handleReturnHome}
                        />
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}
