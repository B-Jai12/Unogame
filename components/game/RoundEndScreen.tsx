'use client';
import { motion } from 'framer-motion';
import { Room } from '@/lib/types';

interface Props {
  room: Room;
  currentUid: string | null;
  isHost: boolean;
  onNextRound: () => void;
}

export default function RoundEndScreen({ room, currentUid, isHost, onNextRound }: Props) {
  const sorted = [...room.players].sort((a, b) => (b.matchScore ?? 0) - (a.matchScore ?? 0));
  const winner = sorted[0];
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 flex items-center justify-center z-40 backdrop-blur-md"
    >
      <motion.div
        initial={{ scale: 0.85 }}
        animate={{ scale: 1 }}
        className="glass p-10 rounded-3xl shadow-2xl text-center max-w-sm w-full mx-4"
      >
        <h2 className="font-display text-3xl text-white mb-2">Round Over!</h2>
        <p className="text-white/70 mb-6">{winner?.username} wins the round</p>
        <div className="space-y-2 mb-6">
          {sorted.map((p) => (
            <div key={p.uid} className="flex justify-between items-center glass-dark p-2 rounded-xl">
              <span className="text-white text-sm">{p.username}</span>
              <span className="text-white font-bold">{p.matchScore ?? 0} pts</span>
            </div>
          ))}
        </div>
        {isHost ? (
          <button className="btn-primary w-full" onClick={onNextRound}>Next Round</button>
        ) : (
          <p className="text-white/60 text-sm">Waiting for host to start next round...</p>
        )}
      </motion.div>
    </motion.div>
  );
}
