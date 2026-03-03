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
import Toast from '@/components/ui/Toast';

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

    // ── Actions ────────────────────────────────────────────────────────────────
    const handlePlayCard = useCallback(async (cardId: string) => {
        if (!isMyTurn || !currentUid || !roomId) return;
        const card = myPlayer?.hand.find((c) => c.id === cardId);
        if (!card) return;
        if (card.type === 'wild' || card.type === 'wild4') {
            setPendingWildCardId(cardId);
            setShowColorPicker(true);
            return;
        }
        try { await actionPlayCard(roomId, currentUid, cardId); }
        catch { showToast('Could not play that card.', 'error'); }
    }, [isMyTurn, currentUid, roomId, myPlayer, setPendingWildCardId, setShowColorPicker, showToast]);

    const handleDraw = useCallback(async () => {
        if (!isMyTurn || drawLoading || !currentUid || !roomId) return;
        setDrawLoading(true);
        try { await actionDrawCard(roomId, currentUid); }
        catch { showToast('Could not draw a card.', 'error'); }
        finally { setDrawLoading(false); }
    }, [isMyTurn, drawLoading, currentUid, roomId, showToast]);

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
        if (!isHost || !currentUid || !roomId) return;
        try { await actionNextRound(roomId, currentUid); }
        catch { showToast('Could not start next round.', 'error'); }
    }, [isHost, currentUid, roomId, showToast]);

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
            className="h-[100dvh] overflow-hidden flex flex-col relative"
            style={{
                background:
                    'linear-gradient(135deg, #ff9ecb 0%, #d4aaff 40%, #a87bff 100%)',
                backgroundSize: '200% 200%',
                animation: 'gradientFlow 12s ease infinite',
            }}
        >
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
            <div className="flex items-center justify-between px-4 py-2.5 shrink-0 gap-3">
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
                            ? 'linear-gradient(135deg, rgba(255,158,203,0.6) 0%, rgba(168,123,255,0.6) 100%)'
                            : 'rgba(255,255,255,0.15)',
                        backdropFilter: 'blur(12px)',
                        border: isMyTurn ? '1.5px solid rgba(255,158,203,0.7)' : '1px solid rgba(255,255,255,0.2)',
                    }}
                    animate={isMyTurn
                        ? { boxShadow: ['0 0 0px rgba(255,158,203,0)', '0 0 30px rgba(255,158,203,0.8)', '0 0 0px rgba(255,158,203,0)'] }
                        : { boxShadow: 'none' }}
                    transition={{ duration: 1.8, repeat: Infinity }}
                >
                    <p className="text-sm font-black text-white tracking-wide">
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
                    <span className="text-white/60 text-[9px] uppercase tracking-wide block">Round</span>
                    <span className="text-white font-black text-lg leading-none">{room.roundNumber}</span>
                </div>
            </div>

            {/* ── Main content ────────────────────────────────────────────────── */}
            <div className="flex-1 flex min-h-0 gap-2 px-2 pb-2">
                {/* Left: Scoreboard */}
                <div
                    className="w-52 shrink-0 rounded-2xl hidden md:flex flex-col overflow-hidden"
                    style={{
                        background: 'rgba(255,255,255,0.10)',
                        backdropFilter: 'blur(20px)',
                        border: '1px solid rgba(255,255,255,0.2)',
                    }}
                >
                    <Scoreboard
                        players={room.players}
                        currentTurnUid={currentTurnUid ?? ''}
                        roundNumber={room.roundNumber}
                        myUid={currentUid ?? ''}
                    />
                </div>

                {/* Center: game action */}
                <div className="flex-1 flex flex-col items-center justify-between min-h-0 gap-2 py-1">
                    {/* Opponent area — adaptive for 1-7 players */}
                    {(() => {
                        const compact = opponents.length >= 3; // compact on mobile or 3+ players
                        const maxHeight = opponents.length >= 5 ? 'max-h-44 sm:max-h-52' : 'max-h-32 sm:max-h-40';
                        return (
                            <div className={`flex items-start justify-center gap-1.5 sm:gap-2 flex-wrap w-full px-1 sm:px-2 pt-2 sm:pt-3 overflow-hidden ${maxHeight}`}>
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
                                    <p className="text-white/30 text-xs text-center">
                                        Waiting for other players to join...
                                    </p>
                                )}
                            </div>
                        );
                    })()}

                    {/* Center piles */}
                    <div className="flex-1 flex items-center justify-center">
                        <DrawAndDiscardPile
                            topDiscard={topDiscard}
                            drawPileCount={room.drawPile.length}
                            currentColor={room.currentColor}
                            isMyTurn={isMyTurn}
                            pendingDrawCount={room.pendingDrawCount}
                            onDraw={handleDraw}
                            drawLoading={drawLoading}
                        />
                    </div>

                    {/* Player hand + UNO button */}
                    <div className="flex flex-col items-center gap-3 w-full">
                        <UnoButton
                            cardCount={myPlayer?.hand.length ?? 0}
                            hasCalledUNO={myPlayer?.hasCalledUNO ?? false}
                            onCallUNO={handleCallUNO}
                            catchTargets={opponents.filter(
                                (o) => o.unoEligible && !o.hasCalledUNO,
                            )}
                            onCatch={handleCatch}
                        />

                        {/* ── End Turn button ── */}
                        {isMyTurn && room.pendingDrawCount === 0 && (
                            <motion.button
                                whileHover={{ scale: 1.04 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={handlePass}
                                className="px-6 sm:px-8 py-2 sm:py-2.5 text-sm sm:text-base"
                                style={{
                                    borderRadius: 99,
                                    background: 'rgba(255,255,255,0.18)',
                                    backdropFilter: 'blur(10px)',
                                    border: '2px solid rgba(255,255,255,0.45)',
                                    color: 'white',
                                    fontWeight: 800,
                                    letterSpacing: '0.06em',
                                    cursor: 'pointer',
                                    boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
                                }}
                            >
                                End Turn →
                            </motion.button>
                        )}
                        <div className="w-full flex justify-center overflow-x-auto pb-2 sm:pb-1" style={{ WebkitOverflowScrolling: 'touch' }}>
                            {myPlayer ? (
                                <div className="transform-gpu scale-[0.72] sm:scale-100 origin-bottom flex-shrink-0">
                                    <PlayerHand
                                        cards={myPlayer.hand}
                                        currentColor={room.currentColor}
                                        topCard={topDiscard}
                                        isMyTurn={isMyTurn}
                                        pendingDrawCount={room.pendingDrawCount}
                                        onPlayCard={handlePlayCard}
                                    />
                                </div>
                            ) : (
                                <p className="text-white/30 text-sm py-6">Spectating</p>
                            )}
                        </div>
                    </div>
                </div>

                {/* Right: Chat */}
                <div
                    className="w-56 shrink-0 rounded-2xl hidden md:flex flex-col overflow-hidden"
                    style={{
                        background: 'rgba(255,255,255,0.10)',
                        backdropFilter: 'blur(16px)',
                        border: '1px solid rgba(255,255,255,0.20)',
                    }}
                >
                    <ChatBox roomId={roomId} currentUid={currentUid ?? ''} />
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
    );
}
