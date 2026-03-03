'use client';
import { useState } from 'react';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
} from 'firebase/auth';
import { auth } from '@/lib/firebase';
import Button from '@/components/ui/Button';
import { useGameStore } from '@/store/useGameStore';
import { motion, AnimatePresence } from 'framer-motion';

export default function EmailLoginForm() {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [localError, setLocalError] = useState('');
  const { setError } = useGameStore();

  const handleSubmit = async () => {
    setLocalError('');
    if (!email || !password) { setLocalError('Email and password are required'); return; }
    if (mode === 'register' && !username) { setLocalError('Username is required'); return; }
    setLoading(true);
    try {
      if (mode === 'login') {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        const { user } = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(user, { displayName: username });
      }
    } catch (e: any) {
      const msg = e.code === 'auth/wrong-password' ? 'Incorrect password'
        : e.code === 'auth/user-not-found' ? 'No account with that email'
          : e.code === 'auth/email-already-in-use' ? 'Email already registered'
            : e.message || 'Something went wrong';
      setLocalError(msg);
    } finally {
      setLoading(false);
    }
  };

  const inputClass =
    'w-full px-4 py-3 rounded-xl glass border border-white/20 text-white placeholder-white/50 outline-none focus:ring-2 focus:ring-white/40 focus:border-white/40 transition-all duration-200 text-sm';

  return (
    <div className="space-y-3">
      <AnimatePresence>
        {mode === 'register' && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <input
              type="text"
              placeholder="Display name"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className={inputClass}
            />
          </motion.div>
        )}
      </AnimatePresence>

      <input
        type="email"
        placeholder="Email address"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className={inputClass}
        onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
      />
      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className={inputClass}
        onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
      />

      {localError && (
        <motion.p
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-red-300 text-sm text-center"
        >
          {localError}
        </motion.p>
      )}

      <Button
        variant="primary"
        size="md"
        className="w-full"
        loading={loading}
        shimmer
        onClick={handleSubmit}
      >
        {mode === 'login' ? 'Sign In' : 'Create Account'}
      </Button>

      <button
        onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setLocalError(''); }}
        className="w-full text-sm text-white/70 hover:text-white transition-colors duration-200 py-1"
      >
        {mode === 'login' ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
      </button>
    </div>
  );
}
