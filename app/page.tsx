'use client';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { auth, db, googleProvider } from '@/lib/firebase';
import {
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signOut,
  signInAnonymously,
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { getInitials } from '@/lib/utils';
import Toast from '@/components/ui/Toast';
import { useGameStore } from '@/store/useGameStore';

type Mode = 'home' | 'login' | 'register' | 'join';

const CARD_COLORS = ['#ff8da1', '#8da9ff', '#8dffb3', '#ffe38d', '#c8a2ff'];
const CARD_LABELS = ['7', 'Skip', 'Rev', '+2', 'Wild'];

export default function HomePage() {
  const router = useRouter();
  const { showToast, setCurrentUser, setUserProfile } = useGameStore();
  const [mode, setMode] = useState<string>('home');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [authUser, setAuthUser] = useState<any>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setAuthUser(u);
      setCurrentUser(u);
      setCheckingAuth(false);
    });
    return unsub;
  }, [setCurrentUser]);

  async function ensureUserDoc(u: any, extra?: { username?: string }) {
    const ref = doc(db, 'users', u.uid);
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      const profile = {
        uid: u.uid,
        username: extra?.username ?? u.displayName ?? u.email?.split('@')[0] ?? 'Player',
        email: u.email ?? '',
        photoURL: u.photoURL ?? '',
        totalWins: 0, totalLosses: 0, totalGames: 0, totalPoints: 0,
        createdAt: Date.now(),
      };
      await setDoc(ref, profile).catch(() => { });
      setUserProfile(profile);
    } else {
      setUserProfile(snap.data() as any);
    }
  }

  async function handleGoogleLogin() {
    setLoading(true); setError('');
    try {
      const result = await signInWithPopup(auth, googleProvider);
      await ensureUserDoc(result.user);
    } catch (e: any) { setError(e.message); }
    setLoading(false);
  }

  async function handleEmailLogin() {
    setLoading(true); setError('');
    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      await ensureUserDoc(result.user);
    } catch (e: any) { setError(e.message); }
    setLoading(false);
  }

  async function handleRegister() {
    if (!username.trim()) { setError('Username required'); return; }
    setLoading(true); setError('');
    try {
      const result = await createUserWithEmailAndPassword(auth, email, password);
      await ensureUserDoc(result.user, { username });
    } catch (e: any) { setError(e.message); }
    setLoading(false);
  }

  async function handleCreateRoom() {
    if (!authUser) return;
    setLoading(true); setError('');
    try {
      const roomId = await useGameStore.getState().createRoom(authUser);
      router.push(`/lobby/${roomId}`);
    } catch (e: any) {
      console.error('[CreateRoom Error]', e);
      setError(e.message);
    }
    setLoading(false);
  }

  async function handleJoinRoom() {
    if (!roomCode.trim()) { setError('Enter a room code'); return; }
    const code = roomCode.trim().toUpperCase();
    setLoading(true); setError('');
    try {
      let user = authUser;
      if (!user) {
        const result = await signInAnonymously(auth);
        user = result.user;
      }
      await useGameStore.getState().joinRoom(code, user);
      router.push(`/lobby/${code}`);
    } catch (e: any) {
      console.error('[JoinRoom Error]', e);
      setError(e.message);
    }
    setLoading(false);
  }

  if (!mounted || checkingAuth) {
    return (
      <div className="loading-container">
        <div className="w-10 h-10 rounded-full border-4 border-white/25 border-t-white animate-spin" />
        <p className="text-white/50 text-sm font-medium animate-pulse">
          {!mounted ? 'Initializing UI...' : 'Preparing your experience...'}
        </p>
      </div>
    );
  }

  // ─── AUTHENTICATED DASHBOARD ───────────────────────────────────────────────
  if (authUser) {
    const displayName = authUser.displayName ?? authUser.email?.split('@')[0] ?? 'Player';
    return (
      <div className="min-h-screen relative overflow-hidden flex flex-col">
        <Toast />

        {/* Animated background */}
        <div
          className="absolute inset-0"
          style={{
            background: 'linear-gradient(135deg, #ff9ecb 0%, #d4aaff 45%, #a87bff 100%)',
            backgroundSize: '200% 200%',
            animation: 'gradientFlow 10s ease infinite',
          }}
        />
        <style>{`
          @keyframes gradientFlow {
            0%   { background-position: 0% 50%; }
            50%  { background-position: 100% 50%; }
            100% { background-position: 0% 50%; }
          }
          @keyframes floatCard {
            0%, 100% { transform: translateY(0px) rotate(var(--r)); }
            50%       { transform: translateY(-14px) rotate(var(--r)); }
          }
        `}</style>

        {/* Floating decorative cards background */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {CARD_COLORS.map((color, i) => (
            <motion.div
              key={i}
              className="absolute rounded-2xl opacity-20 border-2 border-white/30"
              style={{
                width: 72,
                height: 108,
                backgroundColor: color,
                left: `${8 + i * 18}%`,
                top: `${10 + (i % 3) * 22}%`,
                '--r': `${-15 + i * 8}deg`,
                transform: `rotate(${-15 + i * 8}deg)`,
                animation: `floatCard ${3 + i * 0.4}s ease-in-out infinite`,
                animationDelay: `${i * 0.5}s`,
              } as any}
            />
          ))}
          {/* Bottom row */}
          {CARD_COLORS.map((color, i) => (
            <motion.div
              key={`b${i}`}
              className="absolute rounded-2xl opacity-15 border-2 border-white/20"
              style={{
                width: 60,
                height: 90,
                backgroundColor: color,
                right: `${5 + i * 16}%`,
                bottom: `${8 + (i % 2) * 18}%`,
                '--r': `${10 - i * 7}deg`,
                transform: `rotate(${10 - i * 7}deg)`,
                animation: `floatCard ${4 + i * 0.3}s ease-in-out infinite`,
                animationDelay: `${i * 0.7}s`,
              } as any}
            />
          ))}
        </div>

        {/* Main content */}
        <div className="relative z-10 flex flex-col min-h-screen">
          {/* Header */}
          <motion.header
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="flex items-center justify-between px-8 py-5"
          >
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-300 to-purple-500 flex items-center justify-center text-white font-bold text-sm shadow-lg"
                style={{ boxShadow: '0 0 20px rgba(200,162,255,0.5)' }}
              >
                {getInitials(displayName)}
              </div>
              <div>
                <p className="text-white font-semibold text-sm leading-none">{displayName}</p>
                <p className="text-white/50 text-xs mt-0.5">Ready to play</p>
              </div>
            </div>
            <button
              onClick={() => signOut(auth)}
              className="text-white/50 hover:text-white/80 text-xs transition-colors tracking-wide uppercase"
            >
              Sign Out
            </button>
          </motion.header>

          {/* Hero section */}
          <div className="flex-1 flex flex-col items-center justify-center px-6 pb-8 gap-12">
            {/* Logo / Hero Text */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, type: 'spring', stiffness: 300, damping: 24 }}
              className="text-center"
            >
              <h1
                className="font-display text-[clamp(5rem,15vw,9rem)] font-black text-white leading-none"
                style={{
                  textShadow: '0 0 60px rgba(255,158,203,0.6), 0 4px 30px rgba(0,0,0,0.15)',
                  letterSpacing: '-0.02em',
                }}
              >
                UNO
              </h1>
              <motion.p
                className="text-white/60 text-sm tracking-[0.4em] uppercase font-medium mt-2"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
              >
                Premium Multiplayer
              </motion.p>
            </motion.div>

            {/* Action cards */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35 }}
              className="flex flex-col sm:flex-row gap-4 w-full max-w-xl"
            >
              {/* Create Room */}
              <motion.button
                id="create-room-btn"
                className="flex-1 flex flex-col items-center gap-3 py-8 px-6 rounded-3xl text-white font-bold text-lg relative overflow-hidden group"
                style={{
                  background: 'linear-gradient(135deg, rgba(255,158,203,0.35) 0%, rgba(168,123,255,0.35) 100%)',
                  backdropFilter: 'blur(20px)',
                  border: '1.5px solid rgba(255,255,255,0.3)',
                  boxShadow: '0 8px 40px rgba(168,123,255,0.25)',
                }}
                whileHover={{ scale: 1.03, boxShadow: '0 12px 50px rgba(168,123,255,0.45)' }}
                whileTap={{ scale: 0.97 }}
                onClick={handleCreateRoom}
                disabled={loading}
              >
                {/* Shimmer */}
                <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/10 to-white/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <div className="relative flex flex-col items-center gap-2">
                  {/* Mini card stack */}
                  <div className="relative w-12 h-12">
                    {[0, 1, 2].map(i => (
                      <div
                        key={i}
                        className="absolute w-8 h-12 rounded-lg border border-white/30"
                        style={{
                          background: CARD_COLORS[i],
                          left: `${i * 5}px`,
                          top: `${-i * 2}px`,
                          zIndex: i,
                          opacity: 0.85 + i * 0.05,
                        }}
                      />
                    ))}
                  </div>
                  <span className="text-white font-bold text-xl">Create Room</span>
                  <span className="text-white/60 text-xs font-normal">Start a new game</span>
                </div>
              </motion.button>

              {/* Join Room */}
              <motion.button
                id="join-room-btn"
                className="flex-1 flex flex-col items-center gap-3 py-8 px-6 rounded-3xl text-white font-bold text-lg relative overflow-hidden group"
                style={{
                  background: 'rgba(255,255,255,0.12)',
                  backdropFilter: 'blur(20px)',
                  border: '1.5px solid rgba(255,255,255,0.2)',
                  boxShadow: '0 8px 40px rgba(0,0,0,0.1)',
                }}
                whileHover={{ scale: 1.03, boxShadow: '0 12px 50px rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.18)' }}
                whileTap={{ scale: 0.97 }}
                onClick={() => setMode('join')}
              >
                <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/5 to-white/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <div className="relative flex flex-col items-center gap-2">
                  {/* Key icon */}
                  <div className="w-12 h-12 rounded-2xl bg-white/15 flex items-center justify-center">
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round">
                      <circle cx="7.5" cy="15.5" r="5.5" />
                      <path d="M21 2L13 10" /><path d="M15 4l2 2" /><path d="M18 7l2 2" /><path d="M11 13l2 2" />
                    </svg>
                  </div>
                  <span className="text-white font-bold text-xl">Join Room</span>
                  <span className="text-white/60 text-xs font-normal">Enter a room code</span>
                </div>
              </motion.button>
            </motion.div>

            {/* Error */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="text-red-200 text-sm text-center px-6 py-3 rounded-2xl"
                  style={{ background: 'rgba(255,100,100,0.15)', border: '1px solid rgba(255,100,100,0.2)' }}
                >
                  {error}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Stats row */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="flex gap-6 text-center"
            >
              {[
                { label: 'Cards in Deck', value: '108' },
                { label: 'Players', value: '2–8' },
                { label: 'Win Target', value: '500pts' },
              ].map(({ label, value }) => (
                <div key={label} className="flex flex-col items-center">
                  <span className="text-white font-bold text-2xl" style={{ textShadow: '0 0 20px rgba(255,255,255,0.4)' }}>{value}</span>
                  <span className="text-white/45 text-xs mt-1">{label}</span>
                </div>
              ))}
            </motion.div>
          </div>
        </div>

        {/* Join room modal */}
        <AnimatePresence>
          {mode === 'join' && (
            <motion.div
              className="fixed inset-0 z-50 flex items-center justify-center px-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => { setMode('home'); setError(''); }} />
              <motion.div
                className="relative rounded-3xl p-8 w-full max-w-sm"
                style={{
                  background: 'rgba(255,255,255,0.15)',
                  backdropFilter: 'blur(30px)',
                  border: '1px solid rgba(255,255,255,0.3)',
                  boxShadow: '0 20px 60px rgba(168,123,255,0.3)',
                }}
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, y: 20 }}
              >
                <h2 className="text-white font-bold text-2xl text-center mb-6">Enter Room Code</h2>
                <input
                  id="room-code-input"
                  className="w-full px-4 py-5 text-center uppercase tracking-[0.5em] font-black text-2xl rounded-2xl text-white placeholder-white/30 outline-none"
                  style={{ background: 'rgba(255,255,255,0.12)', border: '1.5px solid rgba(255,255,255,0.2)' }}
                  type="text"
                  placeholder="XXXXXX"
                  maxLength={6}
                  autoFocus
                  value={roomCode}
                  onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                  onKeyDown={(e) => e.key === 'Enter' && handleJoinRoom()}
                />
                <div className="flex gap-3 mt-5">
                  <button
                    className="flex-1 py-3 rounded-2xl text-white/70 font-medium text-sm"
                    style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)' }}
                    onClick={() => { setMode('home'); setError(''); }}
                  >
                    Cancel
                  </button>
                  <button
                    id="join-btn"
                    className="flex-1 py-3 rounded-2xl text-white font-bold text-sm"
                    style={{ background: 'linear-gradient(135deg, #ff9ecb, #a87bff)', boxShadow: '0 4px 20px rgba(168,123,255,0.4)' }}
                    onClick={handleJoinRoom}
                    disabled={loading}
                  >
                    {loading ? 'Joining...' : 'Join →'}
                  </button>
                </div>
                <AnimatePresence>
                  {error && (
                    <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-red-300 text-xs text-center mt-3">
                      {error}
                    </motion.p>
                  )}
                </AnimatePresence>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  // ─── AUTH PANEL (signed out) ────────────────────────────────────────────────
  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden px-4 py-8">
      <Toast />
      <motion.div
        initial={{ opacity: 0, y: 32, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: 'spring', stiffness: 340, damping: 28 }}
        className="glass-heavy p-10 w-full max-w-md relative z-10"
      >
        {/* Logo */}
        <motion.div
          className="text-center mb-8"
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <h1 className="font-display text-6xl font-bold text-white mb-2 text-shadow tracking-wide">
            UNO
          </h1>
          <p className="text-white/60 text-xs tracking-[0.3em] uppercase font-medium">
            Multiplayer
          </p>
        </motion.div>

        <AnimatePresence mode="wait">
          {/* Home */}
          {mode === 'home' && (
            <motion.div
              key="home"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-3"
            >
              <button id="google-login-btn" className="btn-primary w-full" onClick={handleGoogleLogin} disabled={loading}>
                Continue with Google
              </button>
              <button className="btn-secondary w-full" onClick={() => setMode('login')}>
                Sign In with Email
              </button>
              <button className="btn-secondary w-full" onClick={() => setMode('register')}>
                Create Account
              </button>
              <div className="relative my-2">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full h-px bg-white/10" />
                </div>
                <div className="relative flex justify-center">
                  <span className="bg-transparent px-3 text-white/35 text-xs">or</span>
                </div>
              </div>
              <button className="btn-secondary w-full" onClick={() => setMode('join')}>
                Join Room as Guest
              </button>
            </motion.div>
          )}

          {/* Login */}
          {mode === 'login' && (
            <motion.div key="login" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-3">
              <h2 className="text-white font-bold text-xl text-center mb-4">Sign In</h2>
              <input id="email-input" className="w-full px-4 py-3 text-sm" type="email" placeholder="Email address" value={email} onChange={e => setEmail(e.target.value)} />
              <input id="password-input" className="w-full px-4 py-3 text-sm" type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleEmailLogin()} />
              <button id="email-login-btn" className="btn-primary w-full" onClick={handleEmailLogin} disabled={loading}>{loading ? 'Signing in...' : 'Sign In'}</button>
              <button className="btn-secondary w-full" onClick={() => setMode('home')}>Back</button>
            </motion.div>
          )}

          {/* Register */}
          {mode === 'register' && (
            <motion.div key="register" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-3">
              <h2 className="text-white font-bold text-xl text-center mb-4">Create Account</h2>
              <input id="username-input" className="w-full px-4 py-3 text-sm" type="text" placeholder="Your name" value={username} onChange={e => setUsername(e.target.value)} />
              <input className="w-full px-4 py-3 text-sm" type="email" placeholder="Email address" value={email} onChange={e => setEmail(e.target.value)} />
              <input className="w-full px-4 py-3 text-sm" type="password" placeholder="Password (6+ characters)" value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleRegister()} />
              <button id="register-btn" className="btn-primary w-full" onClick={handleRegister} disabled={loading}>{loading ? 'Creating...' : 'Create Account'}</button>
              <button className="btn-secondary w-full" onClick={() => setMode('home')}>Back</button>
            </motion.div>
          )}

          {/* Join (guest) */}
          {mode === 'join' && (
            <motion.div key="join" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-3">
              <h2 className="text-white font-bold text-xl text-center mb-4">Join Room</h2>
              <input id="room-code-input" className="w-full px-4 py-4 text-center uppercase tracking-[0.4em] font-bold text-xl" type="text" placeholder="XXXXXX" maxLength={6} value={roomCode} onChange={e => setRoomCode(e.target.value.toUpperCase())} onKeyDown={e => e.key === 'Enter' && handleJoinRoom()} />
              <button id="join-btn" className="btn-primary w-full" onClick={handleJoinRoom} disabled={loading}>{loading ? 'Joining...' : 'Join'}</button>
              <button className="btn-secondary w-full" onClick={() => setMode('home')}>Back</button>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {error && (
            <motion.p initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="text-red-300 text-sm text-center mt-4">
              {error}
            </motion.p>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
