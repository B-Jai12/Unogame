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
  cardBackGlow?: boolean;
}

const COLOR_GLOW: Record<string, { glow: string; pill: string; label: string }> = {
  red: { glow: '0 0 24px var(--card-red), 0 0 48px rgba(255,100,120,0.2)', pill: 'rgba(255,100,120,0.2)', label: 'Red' },
  blue: { glow: '0 0 24px var(--card-blue), 0 0 48px rgba(100,150,255,0.2)', pill: 'rgba(100,150,255,0.2)', label: 'Blue' },
  green: { glow: '0 0 24px var(--card-green), 0 0 48px rgba(80,220,140,0.2)', pill: 'rgba(80,220,140,0.2)', label: 'Green' },
  yellow: { glow: '0 0 24px var(--card-yellow), 0 0 48px rgba(255,210,80,0.2)', pill: 'rgba(255,210,80,0.2)', label: 'Yellow' },
};
const COLOR_DOT: Record<string, string> = {
  red: 'var(--card-red)', blue: 'var(--card-blue)', green: 'var(--card-green)', yellow: 'var(--card-yellow)',
};

function stableRotation(seed: string): number {
  let h = 0;
  for (let k = 0; k < seed.length; k++) h = (Math.imul(31, h) + seed.charCodeAt(k)) | 0;
  return ((h % 1200) / 100) - 6;
}

const DRAW_DUMMY: CardType = { id: 'draw-pile-face', type: 'number', color: 'red', value: 0 };

export default function DrawAndDiscardPile({
  topDiscard, drawPileCount, currentColor, isMyTurn, pendingDrawCount, onDraw, drawLoading = false, cardBackGlow = false,
}: DrawAndDiscardPileProps) {
  const colorMeta = COLOR_GLOW[currentColor] ?? {
    glow: '0 0 20px rgba(200,162,255,0.3)', pill: 'var(--glass-bg)', label: currentColor,
  };

  // Responsive card size: smaller on mobile, bigger on desktop
  // Use CSS custom property approach via inline style
  const CARD_W = 'clamp(60px, 10vw, 96px)';
  const CARD_H = 'clamp(86px, 14vw, 134px)';
  const GAP = 'clamp(12px, 3vw, 32px)';

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: GAP }}>

      {/* ── Draw Pile ── */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
        <motion.button
          whileHover={isMyTurn ? { scale: 1.07, y: -4 } : {}}
          whileTap={isMyTurn ? { scale: 0.95 } : {}}
          onClick={isMyTurn && !drawLoading ? onDraw : undefined}
          disabled={!isMyTurn || drawLoading}
          style={{ cursor: isMyTurn && !drawLoading ? 'pointer' : 'default', position: 'relative', outline: 'none', background: 'none', border: 'none', padding: 0 }}
          aria-label={pendingDrawCount > 0 ? `Draw ${pendingDrawCount} cards` : 'Draw a card'}
        >
          {/* Depth layers */}
          {([3, 2, 1] as const).map((d) => (
            <div key={d} style={{
              position: 'absolute', width: CARD_W, height: CARD_H, borderRadius: 12,
              bottom: d * 3, left: d * 2,
              background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 45%, #4c1d95 100%)',
              border: '2px solid rgba(255,255,255,0.15)',
              boxShadow: '0 4px 10px rgba(0,0,0,0.15)', zIndex: d,
            }} />
          ))}

          {/* Top face-down card */}
          <div style={{ position: 'relative', zIndex: 10, width: CARD_W, height: CARD_H }}>
            {isMyTurn && cardBackGlow && (
              <motion.div
                style={{ position: 'absolute', inset: -3, borderRadius: 15, zIndex: -1, background: 'linear-gradient(135deg, #ff9ecb, #a87bff)', opacity: 0.65 }}
                animate={{ opacity: [0.3, 0.6, 0.3] }}
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
                  position: 'absolute', top: -12, right: -12, zIndex: 20,
                  background: 'var(--card-red)',
                  borderRadius: '50%', width: 28, height: 28,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: '0 4px 14px rgba(238,64,53,0.4)', border: '2px solid rgba(255,255,255,0.8)',
                }}
              >
                <span style={{ color: 'white', fontSize: 10, fontWeight: 900 }}>+{pendingDrawCount}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Card count pill */}
          <div style={{
            position: 'absolute', bottom: -20, left: '50%', transform: 'translateX(-50%)',
            background: 'var(--glass-bg)', backdropFilter: 'blur(8px)',
            borderRadius: 10, padding: '1px 8px', fontSize: 10, fontWeight: 700,
            color: 'var(--text-color)', zIndex: 20, whiteSpace: 'nowrap',
            border: '1px solid var(--glass-border)',
          }}>
            {drawPileCount}
          </div>
        </motion.button>

        <p style={{ marginTop: 22, fontSize: 9, fontWeight: 700, color: 'var(--text-color)', opacity: 0.5, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
          Draw
        </p>
      </div>

      {/* ── Color indicator ── */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentColor}
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.6, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 400, damping: 28 }}
          style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}
        >
          <div style={{
            width: 18, height: 18, borderRadius: '50%',
            backgroundColor: COLOR_DOT[currentColor] ?? '#c8a2ff',
            border: '2.5px solid rgba(255,255,255,0.9)',
            boxShadow: `0 0 12px ${COLOR_DOT[currentColor] ?? '#c8a2ff'}88`,
          }} />
          <span style={{
            fontSize: 8, fontWeight: 800, letterSpacing: '0.1em',
            textTransform: 'uppercase', color: 'var(--text-color)',
            background: colorMeta.pill, borderRadius: 99, padding: '2px 6px',
            border: '1px solid var(--glass-border)',
            opacity: 0.8
          }}>
            {colorMeta.label}
          </span>
        </motion.div>
      </AnimatePresence>

      {/* ── Discard Pile ── */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
        <div style={{ position: 'relative', width: CARD_W, height: CARD_H }}>
          {/* Glow ring */}
          <AnimatePresence mode="wait">
            <motion.div
              key={currentColor + '-glow'}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              style={{
                position: 'absolute', inset: -5, borderRadius: 17, zIndex: 0,
                boxShadow: colorMeta.glow,
                border: `1.5px solid ${COLOR_DOT[currentColor] ?? '#c8a2ff'}55`,
              }}
            />
          </AnimatePresence>

          {/* Ghost depth */}
          <div style={{
            position: 'absolute', width: CARD_W, height: CARD_H, top: 4, left: -4,
            borderRadius: 12, opacity: 0.25,
            background: 'rgba(255,255,255,0.10)', border: '1px solid rgba(255,255,255,0.1)', zIndex: 1,
          }} />

          {/* Empty slot */}
          <div style={{
            position: 'absolute', inset: 0, borderRadius: 12,
            border: '2px dashed rgba(255,255,255,0.22)',
            backgroundColor: 'rgba(255,255,255,0.04)', zIndex: 2,
          }} />

          {/* Top card */}
          <AnimatePresence mode="popLayout">
            {topDiscard && (
              <motion.div
                key={topDiscard.id}
                initial={{ y: -40, opacity: 0, scale: 0.85, rotate: 0 }}
                animate={{ y: 0, opacity: 1, scale: 1, rotate: stableRotation(topDiscard.id), transition: { type: 'spring', stiffness: 360, damping: 26 } }}
                exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.14 } }}
                style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 3 }}
              >
                <Card card={topDiscard} isPlayable={false} isHidden={false} noLayoutId />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <p style={{ fontSize: 9, fontWeight: 700, color: 'var(--text-color)', opacity: 0.5, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
          Discard
        </p>
      </div>
    </div>
  );
}
