'use client';
import { motion } from 'framer-motion';
import { Room } from '@/lib/types';

interface Props {
  room: Room;
  currentUid: string | null;
  onHome: () => void;
}

// Abstract confetti particles (no emojis)
function Confetti() {
  const shapes = Array.from({ length: 30 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    size: Math.random() * 10 + 5,
    delay: Math.random() * 2,
    color: ['#f472b6', '#a78bfa', '#fb923c', '#34d399'][Math.floor(Math.random() * 4)],
    isCircle: Math.random() > 0.5,
  }));
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {shapes.map((s) => (
        <motion.div
          key={s.id}
          className={s.isCircle ? 'rounded-full' : 'rounded-sm'}
          style={{
            position: 'absolute',
            left: `${s.x}%`,
            top: '-20px',
            width: s.size,
            height: s.size,
            backgroundColor: s.color,
          }}
          animate={{ y: '110vh', rotate: 360 * (Math.random() > 0.5 ? 1 : -1), opacity: [1, 1, 0] }}
          transition={{ duration: 3 + Math.random() * 2, delay: s.delay, ease: 'easeIn', repeat: Infinity, repeatDelay: Math.random() * 3 }}
        />
      ))}
    </div>
  );
}

export default function MatchEndScreen({ room, currentUid, onHome }: Props) {
  const sorted = [...room.players].sort((a, b) => (b.matchScore ?? 0) - (a.matchScore ?? 0));
  const champion = sorted[0];
  const isWinner = champion?.uid === currentUid;
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 backdrop-blur-lg"
    >
      <Confetti />
      <motion.div
        initial={{ scale: 0.8, y: 40 }}
        animate={{ scale: 1, y: 0 }}
        className="glass p-12 rounded-3xl shadow-2xl text-center max-w-md w-full mx-4 relative border border-white/40"
        style={{ boxShadow: '0 0 60px rgba(167,139,250,0.3)' }}
      >
        <motion.h1
          className="font-display text-4xl text-white mb-2"
          animate={{ scale: [1, 1.04, 1] }}
          transition={{ repeat: Infinity, duration: 2 }}
        >
          {isWinner ? 'You Won!' : 'Game Over'}
        </motion.h1>
        <p className="text-white/70 mb-2">{champion?.username} wins the match</p>
        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-pink-400 to-violet-500 flex items-center justify-center text-3xl text-white font-bold mx-auto mb-6">
          {champion?.username[0]?.toUpperCase()}
        </div>
        <div className="space-y-2 mb-8">
          {sorted.map((p, i) => (
            <motion.div
              key={p.uid}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1 }}
              className="flex justify-between items-center glass-dark p-3 rounded-xl"
            >
              <div className="flex items-center gap-2">
                <span className="text-white/50 text-sm">{i + 1}.</span>
                <span className="text-white font-medium">{p.username}</span>
              </div>
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 + i * 0.1 }}
                className="text-white font-bold"
              >
                {p.matchScore ?? 0} pts
              </motion.span>
            </motion.div>
          ))}
        </div>
        <button className="btn-primary w-full" onClick={onHome}>Return to Home</button>
      </motion.div>
    </motion.div>
  );
}
