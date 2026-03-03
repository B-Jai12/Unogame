'use client';
import { motion } from 'framer-motion';
import { Card } from '@/lib/types';
import { getCardDisplayColor } from '@/lib/gameUtils';

interface Props {
  card: Card;
  playable: boolean;
  onClick: () => void;
}

function cardLabel(card: Card): string {
  if (card.type === 'number') return String(card.value);
  if (card.type === 'skip') return 'Skip';
  if (card.type === 'reverse') return 'Rev';
  if (card.type === 'draw2') return '+2';
  if (card.type === 'wild4') return '+4';
  return 'W';
}

export default function UnoCard({ card, playable, onClick }: Props) {
  const bg = card.color ? getCardDisplayColor(card.color) : 'linear-gradient(135deg, #7c3aed, #db2777)';
  return (
    <motion.button
      onClick={onClick}
      whileHover={playable ? { y: -10, scale: 1.06 } : {}}
      whileTap={playable ? { scale: 0.94 } : {}}
      className={`uno-card relative select-none ${!playable ? 'unplayable' : ''}`}
      style={{
        width: 56,
        height: 80,
        background: typeof bg === 'string' && bg.startsWith('#') ? bg : bg,
        cursor: playable ? 'pointer' : 'not-allowed',
      }}
    >
      {/* Gloss overlay */}
      <div className="absolute inset-0 rounded-xl" style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.3) 0%, transparent 55%)' }} />
      {/* Center oval */}
      <div
        className="absolute inset-2 rounded-full flex items-center justify-center"
        style={{ background: 'rgba(255,255,255,0.15)', transform: 'rotate(-20deg) scaleX(1.3)' }}
      />
      {/* Label */}
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-white font-bold text-sm drop-shadow-md z-10 font-display">
          {cardLabel(card)}
        </span>
      </div>
      {/* Corner labels */}
      <span className="absolute top-1 left-1 text-white/80 text-[9px] font-bold leading-none">{cardLabel(card)}</span>
      <span className="absolute bottom-1 right-1 text-white/80 text-[9px] font-bold leading-none rotate-180">{cardLabel(card)}</span>
      {/* Playable glow */}
      {playable && (
        <div className="absolute -inset-1 rounded-2xl opacity-50 blur-sm" style={{ background: bg, zIndex: -1 }} />
      )}
    </motion.button>
  );
}
