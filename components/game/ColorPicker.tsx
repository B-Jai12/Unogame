'use client';
import { motion, AnimatePresence } from 'framer-motion';
import { CardColor } from '@/lib/types';
import { useGameStore } from '@/store/useGameStore';
import { actionPlayCard } from '@/lib/guestActions';
import { useState } from 'react';

const COLORS: { value: CardColor; label: string; hex: string; glow: string }[] = [
  { value: 'red', label: 'Red', hex: '#f87171', glow: 'rgba(248,113,113,0.6)' },
  { value: 'blue', label: 'Blue', hex: '#60a5fa', glow: 'rgba(96,165,250,0.6)' },
  { value: 'green', label: 'Green', hex: '#4ade80', glow: 'rgba(74,222,128,0.6)' },
  { value: 'yellow', label: 'Yellow', hex: '#fbbf24', glow: 'rgba(251,191,36,0.6)' },
];

interface ColorPickerProps {
  roomId: string;
  myUid: string;
}

export default function ColorPicker({ roomId, myUid }: ColorPickerProps) {
  const {
    showColorPicker,
    pendingWildCardId,
    pendingWild4CardId,
    setShowColorPicker,
    setPendingWildCardId,
    setPendingWild4CardId,
    showToast,
  } = useGameStore();

  const [loading, setLoading] = useState(false);

  if (!showColorPicker) return null;

  const cardId = pendingWildCardId ?? pendingWild4CardId;

  async function handleColorSelect(color: CardColor) {
    if (!cardId || loading) return;
    setLoading(true);
    try {
      await actionPlayCard(roomId, myUid, cardId, color);
      setShowColorPicker(false);
      setPendingWildCardId(null);
      setPendingWild4CardId(null);
    } catch {
      showToast('Failed to play wild card', 'error');
    } finally {
      setLoading(false);
    }
  }

  function handleCancel() {
    setShowColorPicker(false);
    setPendingWildCardId(null);
    setPendingWild4CardId(null);
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center"
        style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(8px)' }}
        onClick={handleCancel}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.85, y: 30 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.85, y: 30 }}
          transition={{ type: 'spring', stiffness: 380, damping: 28 }}
          className="glass-heavy p-8 flex flex-col items-center gap-6"
          onClick={(e) => e.stopPropagation()}
        >
          <h3 style={{ color: 'white', fontWeight: 700, fontSize: 20, letterSpacing: '0.03em', textShadow: '0 1px 8px rgba(0,0,0,0.4)' }}>
            Choose a Color
          </h3>
          <div className="flex gap-5">
            {COLORS.map((c, i) => (
              <motion.button
                key={c.value}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.07, type: 'spring', stiffness: 400, damping: 22 }}
                whileHover={{ scale: 1.18, y: -6 }}
                whileTap={{ scale: 0.94 }}
                onClick={() => handleColorSelect(c.value)}
                disabled={loading}
                className="flex flex-col items-center gap-2 focus:outline-none"
                aria-label={`Choose ${c.label}`}
              >
                <div
                  className="w-16 h-16 rounded-full border-2 border-white/40 transition-all"
                  style={{
                    background: c.hex,
                    boxShadow: `0 0 24px ${c.glow}, 0 8px 16px rgba(0,0,0,0.2)`,
                  }}
                />
                <span className="text-white/80 text-xs font-semibold">{c.label}</span>
              </motion.button>
            ))}
          </div>
          <button
            onClick={handleCancel}
            style={{ color: 'rgba(255,255,255,0.55)', fontSize: 13, marginTop: 4, cursor: 'pointer', background: 'none', border: 'none' }}
            onMouseEnter={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.85)')}
            onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.55)')}
          >
            Cancel
          </button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
