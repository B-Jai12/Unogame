'use client';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import GlassPanel from '@/components/ui/GlassPanel';

interface RoomCodeProps { roomId: string; }

export default function RoomCode({ roomId }: RoomCodeProps) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    await navigator.clipboard.writeText(roomId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <GlassPanel className="p-6 text-center">
      <p className="text-white/60 text-xs uppercase tracking-widest mb-2 font-medium">Room Code</p>
      <p className="text-5xl font-bold text-white tracking-[0.2em] font-display mb-4">{roomId}</p>
      <button
        onClick={copy}
        className="relative px-6 py-2 rounded-xl glass border border-white/20 text-white/80 hover:text-white text-sm transition-all duration-200 hover:bg-white/20 overflow-hidden"
      >
        <AnimatePresence mode="wait">
          {copied ? (
            <motion.span
              key="copied"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              className="text-green-300"
            >
              Copied!
            </motion.span>
          ) : (
            <motion.span
              key="copy"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
            >
              Copy Code
            </motion.span>
          )}
        </AnimatePresence>
      </button>
      <p className="text-white/40 text-xs mt-3">Share this code with friends to join</p>
    </GlassPanel>
  );
}
