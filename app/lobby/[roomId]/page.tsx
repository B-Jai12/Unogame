'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { db, auth } from '@/lib/firebase';
import {
  doc,
  onSnapshot,
  updateDoc,
  arrayUnion,
  getDoc,
  setDoc,
} from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { Room, Player } from '@/lib/types';
import { dealCards } from '@/lib/engine';
import { getInitials } from '@/lib/utils';
import Toast from '@/components/ui/Toast';
import { useGameStore } from '@/store/useGameStore';
import ThemeToggle from '@/components/ui/ThemeToggle';

export default function LobbyPage() {
  const { roomId } = useParams<{ roomId: string }>();
  const router = useRouter();
  const { showToast } = useGameStore();
  const [room, setRoom] = useState<Room | null>(null);
  const [currentUid, setCurrentUid] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [joining, setJoining] = useState(false);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState('');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => setCurrentUid(u?.uid ?? null));
    return unsub;
  }, []);

  useEffect(() => {
    if (!roomId) return;
    const unsub = onSnapshot(doc(db, 'rooms', roomId), (snap) => {
      if (!snap.exists()) { router.push('/'); return; }
      const data = { id: snap.id, ...snap.data() } as Room;
      setRoom(data);
      // Auto-redirect when game starts
      if (data.status === 'playing' || data.status === 'dealing') {
        router.push(`/room/${roomId}`);
      }
    });
    return unsub;
  }, [roomId, router]);

  async function joinRoom() {
    if (!currentUid || !room) return;
    const already = room.players.find((p) => p.uid === currentUid);
    if (already) return;
    if (room.players.length >= 8) { setError('Room is full (max 8 players)'); return; }
    setJoining(true);
    setError('');
    try {
      // Look up user profile
      const userSnap = await getDoc(doc(db, 'users', currentUid));
      const userData = userSnap.exists() ? userSnap.data() : null;
      const newPlayer: Player = {
        uid: currentUid,
        username: userData?.username ?? 'Player',
        hand: [],
        roundScore: 0,
        matchScore: 0,
        hasCalledUNO: false,
        unoCallTimestamp: null,
        unoEligible: false,
        lastActionTimestamp: Date.now(),
        isConnected: true,
        disconnectTimestamp: null,
      };
      await updateDoc(doc(db, 'rooms', roomId), {
        players: arrayUnion(newPlayer),
        playerIds: arrayUnion(currentUid),
      });
    } catch (e: any) {
      setError(e.message);
    }
    setJoining(false);
  }

  async function startGame() {
    if (!room || !currentUid || !isHost) return;
    setStarting(true);
    setError('');
    try {
      // Run the deal engine directly here (host is in lobby, not yet in room page)
      const dealtRoom = dealCards({ ...room, status: 'dealing', roundNumber: 1 });
      const { id: _id, ...roomData } = dealtRoom as any;
      await setDoc(doc(db, 'rooms', roomId), {
        ...roomData,
        status: 'playing',
      });
      // Router redirect happens automatically via onSnapshot listener
    } catch (e: any) {
      console.error('[StartGame Error]', e);
      setError(e.message);
    }
    setStarting(false);
  }

  function copyCode() {
    navigator.clipboard.writeText(roomId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2200);
  }

  if (!mounted || !room || !currentUid) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-12 h-12 rounded-full border-4 border-white/25 border-t-white animate-spin" />
      </div>
    );
  }

  const isHost = currentUid === room.hostId;
  const isPlayer = !!room.players.find((p) => p.uid === currentUid);
  const canStart = isHost && room.players.length >= 2 && room.status === 'waiting';

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden px-4 py-8 transition-colors duration-500"
      style={{ background: 'var(--bg-color)' }}
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

      {/* Top Bar with Toggle */}
      <div className="absolute top-0 left-0 right-0 p-6 flex justify-end z-50">
        <ThemeToggle />
      </div>
      <Toast />
      <motion.div
        initial={{ opacity: 0, y: 28, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: 'spring', stiffness: 340, damping: 28 }}
        className="glass-heavy p-10 w-full max-w-lg relative z-10"
      >
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="font-display text-4xl font-bold text-white text-shadow mb-1">Lobby</h1>
          <p className="text-white/55 text-sm">
            {room.status === 'waiting' ? 'Waiting for players to join...' : 'Game starting...'}
          </p>
        </div>

        {/* Room Code */}
        <div className="glass-dark p-5 rounded-2xl text-center mb-6">
          <p className="text-white/50 text-xs uppercase tracking-[0.25em] mb-2 font-medium">Room Code</p>
          <div className="flex items-center justify-center gap-3">
            <span className="font-display text-4xl font-bold text-white tracking-[0.3em]">
              {roomId}
            </span>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={copyCode}
              id="copy-code-btn"
              className="btn-secondary text-xs px-3 py-1.5 rounded-xl"
            >
              {copied ? 'Copied!' : 'Copy'}
            </motion.button>
          </div>
          <p className="text-white/35 text-xs mt-2">Share this code with your friends</p>
        </div>

        {/* Players List */}
        <div className="mb-6">
          <p className="text-white/50 text-xs uppercase tracking-[0.2em] font-medium mb-3">
            Players ({room.players.length} / 8)
          </p>
          <div className="space-y-2">
            <AnimatePresence>
              {room.players.map((p, i) => (
                <motion.div
                  key={p.uid}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ delay: i * 0.06, type: 'spring', stiffness: 360, damping: 28 }}
                  className="glass flex items-center gap-3 px-4 py-3 rounded-xl"
                >
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-pink-400 to-violet-500 flex items-center justify-center text-white font-bold text-sm shrink-0">
                    {getInitials(p.username)}
                  </div>
                  <span className="text-white font-semibold flex-1 text-sm">{p.username}</span>
                  <div className="flex items-center gap-2">
                    {p.uid === room.hostId && (
                      <span className="text-[10px] bg-pink-400/25 text-pink-200 border border-pink-400/30 px-2 py-0.5 rounded-full font-semibold">
                        Host
                      </span>
                    )}
                    <div className={`w-2 h-2 rounded-full ${p.isConnected ? 'bg-emerald-400' : 'bg-red-400'}`} />
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {/* Empty slots */}
            {room.players.length < 2 && (
              <div className="glass border-dashed border border-white/15 flex items-center justify-center py-4 rounded-xl">
                <p className="text-white/30 text-sm">Waiting for another player...</p>
              </div>
            )}
          </div>
        </div>

        {error && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-red-300 text-sm text-center mb-3"
          >
            {error}
          </motion.p>
        )}

        {/* Action Buttons */}
        <div className="space-y-3">
          {!isPlayer && currentUid && (
            <button
              id="join-game-btn"
              className="btn-primary w-full"
              onClick={joinRoom}
              disabled={joining}
            >
              {joining ? 'Joining...' : 'Join Game'}
            </button>
          )}

          {isHost && (
            <motion.button
              id="start-game-btn"
              className="btn-primary w-full"
              onClick={startGame}
              disabled={!canStart || starting}
              animate={canStart ? {
                boxShadow: [
                  '0 0 10px rgba(248,113,163,0.3)',
                  '0 0 28px rgba(248,113,163,0.75)',
                  '0 0 10px rgba(248,113,163,0.3)',
                ]
              } : {}}
              transition={{ duration: 2, repeat: Infinity }}
            >
              {starting
                ? 'Starting...'
                : canStart
                  ? 'Start Game'
                  : `Need ${Math.max(0, 2 - room.players.length)} more player${2 - room.players.length !== 1 ? 's' : ''}`}
            </motion.button>
          )}

          {!isHost && isPlayer && (
            <p className="text-white/40 text-center text-sm py-2">
              Waiting for host to start the game...
            </p>
          )}

          <button
            className="btn-secondary w-full"
            onClick={() => router.push('/')}
          >
            Leave Lobby
          </button>
        </div>
      </motion.div>
    </div>
  );
}
