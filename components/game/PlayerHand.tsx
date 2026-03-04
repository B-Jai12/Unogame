'use client';

/**
 * components/game/PlayerHand.tsx
 *
 * Professional fan/arc layout — NO horizontal scrolling. Ever.
 *
 * Algorithm:
 *   1. Available width is read from a ResizeObserver.
 *   2. Card size is picked from a tiered scale based on hand count.
 *   3. Overlap is computed so all n cards fit exactly within the available width.
 *   4. Each card is rotated/translated using normalised arc geometry.
 *   5. On hover (desktop) the hovered card lifts up with a scale + z boost.
 *   6. Mobile: tap-to-select then tap-again-to-play. No scroll.
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card as CardType, CardColor } from '@/lib/types';
import Card from './Card';

// ---------------------------------------------------------------------------
// Card size tiers (px) — chosen to look great at each hand size
// ---------------------------------------------------------------------------
function getCardSize(n: number, isMobile: boolean): { w: number; h: number } {
  if (isMobile) {
    if (n <= 5) return { w: 72, h: 102 };
    if (n <= 9) return { w: 58, h: 82 };
    if (n <= 13) return { w: 48, h: 68 };
    return { w: 40, h: 57 };
  }
  // Desktop
  if (n <= 5) return { w: 96, h: 134 };
  if (n <= 9) return { w: 82, h: 115 };
  if (n <= 13) return { w: 68, h: 96 };
  return { w: 56, h: 79 };
}

// Fan rotation constants
const MAX_ROTATE = 15; // degrees for outermost card
const MAX_Y_ARC = 22; // px  — cards dip down at edges

interface PlayerHandProps {
  cards: CardType[];
  currentColor: string;
  topCard: CardType | null;
  pendingDrawCount: number;
  onPlayCard: (cardId: string, chosenColor?: CardColor) => void;
  isMyTurn: boolean;
}

export default function PlayerHand({
  cards,
  currentColor,
  topCard,
  pendingDrawCount,
  onPlayCard,
  isMyTurn,
}: PlayerHandProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerW, setContainerW] = useState(360);
  const [isMobile, setIsMobile] = useState(false);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null); // mobile tap-select

  // ── Measure container width + detect mobile ─────────────────────────────
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 640);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver(([entry]) => {
      setContainerW(entry.contentRect.width || 360);
    });
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  const n = cards.length;

  // ── Dynamic card sizing ─────────────────────────────────────────────────
  const { w: CARD_W, h: CARD_H } = getCardSize(n, isMobile);
  const CARD_HALF = CARD_W / 2;

  // ── Compute overlap so all cards fit in containerW ──────────────────────
  // Total width if cards were side-by-side = n * CARD_W
  // We want to fit in 0.92 * containerW so there's a little breathing room
  const usable = containerW * 0.92;
  // Required gap per card: (usable - CARD_W) / (n - 1)
  // Gap can't exceed CARD_W (would leave whitespace between cards)
  const gap = n <= 1 ? 0 : Math.min(CARD_W * 0.55, Math.max(CARD_W * 0.18, (usable - CARD_W) / (n - 1)));

  // ── Handle click (desktop = direct play, mobile = two-tap) ──────────────
  const handleCardClick = useCallback((card: CardType) => {
    const playable = isMyTurn && isCardPlayable(card, topCard, currentColor, pendingDrawCount);

    if (isMobile) {
      if (selectedId === card.id) {
        // Second tap → play
        if (playable) {
          onPlayCard(card.id);
          setSelectedId(null);
        }
      } else {
        setSelectedId(card.id);
      }
    } else {
      // Desktop: play immediately
      if (playable) onPlayCard(card.id);
    }
  }, [isMobile, selectedId, isMyTurn, topCard, currentColor, pendingDrawCount, onPlayCard]);

  if (n === 0) {
    return (
      <div className="flex items-center justify-center py-8">
        <p className="text-white/40 text-sm font-medium tracking-wide">No cards — you're out!</p>
      </div>
    );
  }

  const center = (n - 1) / 2;

  const containerH = CARD_H + MAX_Y_ARC + 48; // card + arc dip + lift room

  return (
    <div
      ref={containerRef}
      className="w-full relative select-none"
      style={{ height: containerH, touchAction: 'none' }}
      // Deselect on background tap
      onClick={(e) => { if (e.target === containerRef.current) setSelectedId(null); }}
    >
      <AnimatePresence>
        {cards.map((card, i) => {
          const norm = n > 1 ? (i - center) / Math.max(1, center) : 0;

          // Arc geometry
          const rotateDeg = norm * MAX_ROTATE;
          const yArc = Math.abs(norm) * MAX_Y_ARC;  // 0 = top (center), MAX = bottom (edges)

          // Horizontal position — spread from center
          const xPos = (i - center) * gap;

          const isHov = hoveredId === card.id;
          const isSel = selectedId === card.id;
          const playable = isMyTurn && isCardPlayable(card, topCard, currentColor, pendingDrawCount);

          // Lift amount: center card baseline, edges dip, hovered/selected soar up
          const yBase = yArc; // rest: edges dip down relative to center
          const yHov = isMobile ? -30 : -44;

          return (
            <motion.div
              key={card.id}
              layout
              initial={{ y: 90, opacity: 0, scale: 0.75 }}
              animate={{
                x: xPos,
                y: (isHov || isSel) ? yHov : yBase,
                rotate: (isHov || isSel) ? 0 : rotateDeg,
                scale: (isHov || isSel) ? 1.12 : 1,
                zIndex: (isHov || isSel) ? 200 : i + 1,
                opacity: 1,
                filter: (playable && isMyTurn)
                  ? (isHov || isSel) ? 'brightness(1.15) drop-shadow(0 0 10px rgba(255,255,200,0.6))' : 'brightness(1.05)'
                  : (!isMyTurn ? 'brightness(0.85)' : 'brightness(0.7) saturate(0.5)'),
                transition: {
                  type: 'spring',
                  stiffness: 380,
                  damping: 32,
                  delay: i * 0.012,
                },
              }}
              exit={{
                y: -180,
                opacity: 0,
                scale: 0.4,
                transition: { duration: 0.22 },
              }}
              style={{
                position: 'absolute',
                bottom: 8,
                left: '50%',
                marginLeft: -CARD_HALF,
                width: CARD_W,
                cursor: playable ? 'pointer' : (isMyTurn ? 'not-allowed' : 'default'),
                transformOrigin: '50% 100%', // rotate from bottom center
              }}
              onHoverStart={() => !isMobile && setHoveredId(card.id)}
              onHoverEnd={() => !isMobile && setHoveredId(null)}
              onClick={() => handleCardClick(card)}
            >
              {/* Mobile: selected indicator ring */}
              {isSel && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="absolute inset-[-4px] rounded-xl pointer-events-none"
                  style={{
                    border: '3px solid rgba(255,255,255,0.9)',
                    boxShadow: '0 0 16px rgba(255,220,100,0.8)',
                    borderRadius: 14,
                  }}
                />
              )}

              {/* Playable glow ring on desktop hover */}
              {isHov && playable && !isMobile && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="absolute inset-[-5px] pointer-events-none"
                  style={{
                    borderRadius: 16,
                    boxShadow: '0 0 24px 6px rgba(255, 220, 80, 0.75)',
                  }}
                />
              )}

              <Card
                card={card}
                isPlayable={playable}
                isHidden={false}
                rotation={0}
                onClick={() => handleCardClick(card)}
                style={{ width: CARD_W, height: CARD_H }}
              />

              {/* Mobile second-tap hint */}
              {isSel && isMobile && (
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap text-[10px] font-bold tracking-wide"
                  style={{
                    color: playable ? '#ffe351' : '#ff8080',
                    textShadow: '0 1px 6px rgba(0,0,0,0.8)',
                  }}
                >
                  {playable ? 'Tap again to play' : "Can't play this"}
                </motion.div>
              )}
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Pure helper — mirrors engine canPlayCard
// ---------------------------------------------------------------------------
function isCardPlayable(
  card: CardType,
  topCard: CardType | null,
  currentColor: string,
  pendingDrawCount: number,
): boolean {
  if (!topCard) return false;
  if (pendingDrawCount > 0) return false;
  if (card.type === 'wild' || card.type === 'wild4') return true;
  if (card.color === currentColor) return true;
  if (card.type !== 'number' && card.type === topCard.type) return true;
  if (card.type === 'number' && topCard.type === 'number' && card.value === topCard.value) return true;
  return false;
}
