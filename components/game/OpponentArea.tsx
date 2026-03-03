'use client';
import { motion, AnimatePresence } from 'framer-motion';
import { Player } from '@/lib/types';
import { getInitials } from '@/lib/utils';
import { cn } from '@/lib/utils';

interface OpponentAreaProps {
  player: Player;
  isCurrentTurn: boolean;
  onCatch?: () => void;
  compact?: boolean;
}

function MiniCardFan({ count, compact }: { count: number; compact?: boolean }) {
  const show = Math.min(count, compact ? 5 : 7);
  const spread = compact ? 10 : 13;
  const maxRot = compact ? 20 : 24;
  const totalWidth = show <= 1 ? 32 : show * spread + 14;

  return (
    <div style={{ position: 'relative', height: compact ? 38 : 48, width: totalWidth, minWidth: 32 }}>
      {Array.from({ length: show }).map((_, i) => {
        const mid = (show - 1) / 2;
        const t = show <= 1 ? 0 : (i - mid) / (mid || 1);
        const rot = t * maxRot;
        const xOff = (i - mid) * spread;
        return (
          <div
            key={i}
            style={{
              width: compact ? 22 : 28,
              height: compact ? 31 : 40,
              borderRadius: 4,
              background: 'linear-gradient(135deg, #a87bff 0%, #ff9ecb 100%)',
              border: '1.5px solid rgba(255,255,255,0.6)',
              boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
              position: 'absolute',
              bottom: 0,
              left: '50%',
              marginLeft: compact ? -11 : -14,
              zIndex: i,
              transform: `rotate(${rot}deg) translateX(${xOff}px)`,
              transformOrigin: 'bottom center',
            }}
          />
        );
      })}
      {count > (compact ? 5 : 7) && (
        <div style={{
          position: 'absolute', right: -6, bottom: -2,
          background: 'rgba(255,255,255,0.25)', color: 'white',
          fontSize: 9, fontWeight: 800, borderRadius: '50%',
          width: 16, height: 16, display: 'flex', alignItems: 'center',
          justifyContent: 'center', zIndex: 20, border: '1px solid rgba(255,255,255,0.3)',
        }}>
          +{count - (compact ? 5 : 7)}
        </div>
      )}
    </div>
  );
}

export default function OpponentArea({ player, isCurrentTurn, onCatch, compact }: OpponentAreaProps) {
  const cardCount = player.hand.length;

  return (
    <div
      className={cn(
        'flex flex-col items-center gap-1.5 relative',
        compact ? 'px-2 py-2 rounded-xl' : 'px-3 py-2.5 rounded-2xl',
        !player.isConnected && 'opacity-40',
      )}
      style={{
        background: isCurrentTurn ? 'rgba(255,158,203,0.22)' : 'rgba(255,255,255,0.08)',
        border: isCurrentTurn ? '1.5px solid rgba(255,158,203,0.65)' : '1px solid rgba(255,255,255,0.12)',
        minWidth: compact ? 70 : 90,
        maxWidth: compact ? 100 : 130,
        flexShrink: 1,
        boxShadow: isCurrentTurn ? '0 0 20px rgba(255,158,203,0.45)' : 'none',
      }}
    >
      {/* THEIR TURN badge */}
      <AnimatePresence>
        {isCurrentTurn && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap text-white font-black px-2 py-0.5 rounded-full"
            style={{ background: 'linear-gradient(135deg,#ff9ecb,#a87bff)', fontSize: compact ? 7 : 8 }}
          >
            THEIR TURN
          </motion.div>
        )}
      </AnimatePresence>

      {/* Avatar */}
      <div
        className="rounded-full flex items-center justify-center text-white font-black shrink-0"
        style={{
          width: compact ? 28 : 34,
          height: compact ? 28 : 34,
          fontSize: compact ? 9 : 11,
          background: isCurrentTurn
            ? 'linear-gradient(135deg,#ff9ecb,#a87bff)'
            : 'linear-gradient(135deg,rgba(255,255,255,0.28),rgba(255,255,255,0.12))',
          border: isCurrentTurn ? '2px solid rgba(255,255,255,0.5)' : '1.5px solid rgba(255,255,255,0.22)',
          position: 'relative',
        }}
      >
        {getInitials(player.username)}
        <div
          className="absolute -bottom-0.5 -right-0.5 rounded-full"
          style={{
            width: compact ? 7 : 9,
            height: compact ? 7 : 9,
            background: player.isConnected ? '#4ade80' : '#f87171',
            border: '1.5px solid rgba(255,255,255,0.4)',
          }}
        />
      </div>

      {/* Name */}
      <span
        className="text-white font-bold text-center leading-none truncate w-full"
        style={{ fontSize: compact ? 9 : 10, maxWidth: compact ? 80 : 110, textAlign: 'center' }}
      >
        {player.username.charAt(0).toUpperCase() + player.username.slice(1)}
      </span>

      {/* Card count + UNO badge */}
      <div className="flex items-center gap-1 flex-wrap justify-center">
        <span
          style={{
            fontSize: 8, fontWeight: 800, padding: '1px 5px', borderRadius: 99,
            background: cardCount === 1 ? 'rgba(248,113,163,0.4)' : 'rgba(255,255,255,0.15)',
            color: cardCount === 1 ? '#fda4af' : 'rgba(255,255,255,0.75)',
            border: cardCount === 1 ? '1px solid rgba(248,113,163,0.5)' : '1px solid rgba(255,255,255,0.15)',
            whiteSpace: 'nowrap',
          }}
        >
          {cardCount} {cardCount === 1 ? 'card' : 'cards'}
        </span>
        {player.hasCalledUNO && (
          <motion.span
            animate={{ scale: [1, 1.18, 1] }}
            transition={{ duration: 0.7, repeat: Infinity }}
            style={{
              fontSize: 8, fontWeight: 900, padding: '1px 5px', borderRadius: 99,
              color: '#fda4af', background: 'rgba(248,113,163,0.2)',
              border: '1px solid rgba(248,113,163,0.4)', whiteSpace: 'nowrap',
            }}
          >
            UNO!
          </motion.span>
        )}
      </div>

      {/* Mini card fan */}
      <MiniCardFan count={cardCount} compact={compact} />

      {/* Catch UNO button */}
      <AnimatePresence>
        {onCatch && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            whileTap={{ scale: 0.9 }}
            onClick={onCatch}
            className="w-full text-center font-black rounded-lg"
            style={{
              fontSize: compact ? 8 : 9,
              padding: compact ? '2px 4px' : '3px 6px',
              color: '#fda4af',
              background: 'rgba(248,113,163,0.15)',
              border: '1px solid rgba(248,113,163,0.4)',
              cursor: 'pointer',
            }}
          >
            Catch UNO!
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}
