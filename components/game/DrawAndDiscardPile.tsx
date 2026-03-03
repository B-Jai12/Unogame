'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Card as CardType } from '@/lib/types';
import Card from './Card';

interface DrawAndDiscardPileProps {
  topDiscard: CardType | null;
  drawPileCount: number;
  currentColor: string;
  isMyTurn: boolean;
  pendingDrawCount: number;
  onDraw: () => void;
  drawLoading?: boolean;
}

// Color → rich glow + fill for discard pile border glow
const COLOR_GLOW: Record<string, { glow: string; pill: string; label: string }> = {
  red: { glow: '0 0 32px rgba(255,100,120,0.85), 0 0 60px rgba(255,100,120,0.4)', pill: 'rgba(255,100,120,0.35)', label: 'Red' },
  blue: { glow: '0 0 32px rgba(100,150,255,0.85), 0 0 60px rgba(100,150,255,0.4)', pill: 'rgba(100,150,255,0.35)', label: 'Blue' },
  green: { glow: '0 0 32px rgba(80,220,140,0.85), 0 0 60px rgba(80,220,140,0.4)', pill: 'rgba(80,220,140,0.35)', label: 'Green' },
  yellow: { glow: '0 0 32px rgba(255,210,80,0.85), 0 0 60px rgba(255,210,80,0.4)', pill: 'rgba(255,210,80,0.35)', label: 'Yellow' },
};

const COLOR_DOT: Record<string, string> = {
  red: '#ff6478', blue: '#649aff', green: '#50dc8c', yellow: '#ffd250',
};

function stableRotation(seed: string): number {
  let h = 0;
  for (let k = 0; k < seed.length; k++) h = (Math.imul(31, h) + seed.charCodeAt(k)) | 0;
  return ((h % 1200) / 100) - 6;
}

const DRAW_DUMMY: CardType = { id: 'draw-pile-face', type: 'number', color: 'red', value: 0 };

export default function DrawAndDiscardPile({
  topDiscard, drawPileCount, currentColor, isMyTurn, pendingDrawCount, onDraw, drawLoading = false,
}: DrawAndDiscardPileProps) {
  const colorMeta = COLOR_GLOW[currentColor] ?? {
    glow: '0 0 24px rgba(200,162,255,0.6)', pill: 'rgba(200,162,255,0.3)', label: currentColor,
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 32 }}>

      {/* ── Draw Pile ─────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
        <motion.button
          whileHover={isMyTurn ? { scale: 1.07, y: -5 } : {}}
          whileTap={isMyTurn ? { scale: 0.95 } : {}}
          onClick={isMyTurn && !drawLoading ? onDraw : undefined}
          disabled={!isMyTurn || drawLoading}
          style={{ cursor: isMyTurn && !drawLoading ? 'pointer' : 'default', position: 'relative', outline: 'none', background: 'none', border: 'none', padding: 0 }}
          aria-label={pendingDrawCount > 0 ? `Draw ${pendingDrawCount} cards` : 'Draw a card'}
        >
          {/* Depth stack — 3 offset ghost cards */}
          {([3, 2, 1] as const).map((d) => (
            <div key={d} style={{
              position: 'absolute', width: 96, height: 134, borderRadius: 14,
              bottom: d * 3, left: d * 2,
              background: 'linear-gradient(135deg, #6d28d9 0%, #9333ea 45%, #be185d 100%)',
              border: '2.5px solid rgba(255,255,255,0.2)',
              boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
              zIndex: d,
            }} />
          ))}

          {/* Top face-down card */}
          <div style={{ position: 'relative', zIndex: 10 }}>
            {isMyTurn && (
              <motion.div
                style={{
                  position: 'absolute', inset: -3, borderRadius: 17, zIndex: -1,
                  background: 'linear-gradient(135deg, #ff9ecb, #a87bff)',
                  opacity: 0.7,
                }}
                animate={{ opacity: [0.4, 0.9, 0.4] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              />
            )}
            <Card card={DRAW_DUMMY} isHidden isPlayable={false} noLayoutId />
          </div>

          {/* Pending draw badge */}
          <AnimatePresence>
            {pendingDrawCount > 0 && (
              <motion.div
                key="draw-badge"
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 500, damping: 28 }}
                style={{
                  position: 'absolute', top: -14, right: -14, zIndex: 20,
                  background: 'linear-gradient(135deg, #ff4060, #a87bff)',
                  borderRadius: '50%', width: 34, height: 34,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: '0 4px 16px rgba(255,64,96,0.6)', border: '2px solid rgba(255,255,255,0.8)',
                }}
              >
                <span style={{ color: 'white', fontSize: 12, fontWeight: 900, fontFamily: 'system-ui' }}>
                  +{pendingDrawCount}
                </span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Card count */}
          <div style={{
            position: 'absolute', bottom: -22, left: '50%', transform: 'translateX(-50%)',
            background: 'rgba(255,255,255,0.18)', backdropFilter: 'blur(8px)',
            borderRadius: 10, padding: '2px 10px', fontSize: 12, fontWeight: 700,
            color: 'rgba(255,255,255,0.9)', zIndex: 20, whiteSpace: 'nowrap',
            border: '1px solid rgba(255,255,255,0.25)',
          }}>
            {drawPileCount}
          </div>
        </motion.button>

        <p style={{ marginTop: 26, fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.6)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
          Draw Pile
        </p>
      </div>

      {/* ── Active Color Indicator ─────────────────────────────────────────── */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentColor}
          initial={{ scale: 0.6, opacity: 0, y: 6 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.6, opacity: 0, y: -6 }}
          transition={{ type: 'spring', stiffness: 400, damping: 28 }}
          style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}
        >
          <motion.div
            animate={{
              boxShadow: [
                `0 0 12px ${COLOR_DOT[currentColor] ?? '#c8a2ff'}80`,
                `0 0 28px ${COLOR_DOT[currentColor] ?? '#c8a2ff'}cc`,
                `0 0 12px ${COLOR_DOT[currentColor] ?? '#c8a2ff'}80`,
              ]
            }}
            transition={{ duration: 1.8, repeat: Infinity }}
            style={{
              width: 22, height: 22, borderRadius: '50%',
              backgroundColor: COLOR_DOT[currentColor] ?? '#c8a2ff',
              border: '3px solid rgba(255,255,255,0.7)',
            }}
          />
          <span style={{
            fontSize: 9, fontWeight: 800, letterSpacing: '0.12em',
            textTransform: 'uppercase', color: 'rgba(255,255,255,0.75)',
            background: colorMeta.pill, borderRadius: 99, padding: '2px 8px',
            border: '1px solid rgba(255,255,255,0.2)',
          }}>
            {colorMeta.label}
          </span>
        </motion.div>
      </AnimatePresence>

      {/* ── Discard Pile ──────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
        <div style={{ position: 'relative', width: 96, height: 134 }}>
          {/* Dynamic colored glow ring around discard pile */}
          <AnimatePresence mode="wait">
            <motion.div
              key={currentColor + '-glow'}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              style={{
                position: 'absolute', inset: -6, borderRadius: 20, zIndex: 0,
                boxShadow: colorMeta.glow,
                border: `2px solid ${COLOR_DOT[currentColor] ?? '#c8a2ff'}66`,
              }}
            />
          </AnimatePresence>

          {/* Ghost depth card */}
          <div style={{
            position: 'absolute', width: 96, height: 134, top: 4, left: -5,
            borderRadius: 14, opacity: 0.3,
            background: 'rgba(255,255,255,0.10)',
            border: '1.5px solid rgba(255,255,255,0.12)',
            zIndex: 1,
          }} />

          {/* Empty slot */}
          <div style={{
            position: 'absolute', inset: 0, borderRadius: 14,
            border: '2.5px dashed rgba(255,255,255,0.25)',
            backgroundColor: 'rgba(255,255,255,0.05)', zIndex: 2,
          }} />

          {/* Animated top card */}
          <AnimatePresence mode="popLayout">
            {topDiscard && (
              <motion.div
                key={topDiscard.id}
                initial={{ y: -50, opacity: 0, scale: 0.85, rotate: 0 }}
                animate={{ y: 0, opacity: 1, scale: 1, rotate: stableRotation(topDiscard.id), transition: { type: 'spring', stiffness: 380, damping: 26 } }}
                exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.15 } }}
                style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 3 }}
              >
                <Card card={topDiscard} isPlayable={false} isHidden={false} noLayoutId />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <p style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.6)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
          Discard
        </p>
      </div>
    </div>
  );
}
