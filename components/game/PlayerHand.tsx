'use client';

/**
 * components/game/PlayerHand.tsx
 *
 * Renders the local player's hand of cards in a fanned arc layout.
 *
 * Arc math:
 *   Let n = total cards, i = 0-based index, c = center index = (n-1)/2
 *   normalised = (i - c) / max(1, c)          ← range [-1, +1]
 *   rotation   = normalised * MAX_ROTATION_DEG
 *   yOffset    = |normalised| * MAX_Y_OFFSET   ← edges dip downward
 *
 * The hand container has the CSS class "group" so that on hover every child
 * spreads horizontally by reducing the negative margin overlap.
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card as CardType, CardColor } from '@/lib/types';
import Card from './Card';

// ---------------------------------------------------------------------------
// Layout constants
// ---------------------------------------------------------------------------

/** Maximum rotation (degrees) applied to the outermost cards. */
const MAX_ROTATION_DEG = 10;

/** Maximum downward Y shift (px) applied to the outermost cards. */
const MAX_Y_OFFSET_PX = 18;

/** Horizontal overlap between cards when hand is at rest (negative = overlap). */
const CARD_OVERLAP_PX = -22;

/** Horizontal gap when the hand is hovered / spread. */
const CARD_SPREAD_PX = 6;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PlayerHandProps {
  /** The player's current hand (already filtered to their own cards). */
  cards: CardType[];
  /**
   * The current active color on the discard pile, used alongside topCard to
   * determine which cards in the hand are legal plays.
   */
  currentColor: string;
  /** Top card of the discard pile. */
  topCard: CardType | null;
  /** How many cards must be forcibly drawn (disables normal play). */
  pendingDrawCount: number;
  /** Callback when the player clicks a playable card. */
  onPlayCard: (cardId: string, chosenColor?: CardColor) => void;
  /** Whether it is currently the local player's turn. */
  isMyTurn: boolean;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function PlayerHand({
  cards,
  currentColor,
  topCard,
  pendingDrawCount,
  onPlayCard,
  isMyTurn,
}: PlayerHandProps) {
  const [hovered, setHovered] = useState(false);
  const n = cards.length;

  if (n === 0) {
    return (
      <div className="flex items-center justify-center h-36">
        <p className="text-white/40 text-sm font-medium tracking-wide">No cards in hand</p>
      </div>
    );
  }

  return (
    <div
      className="relative flex items-end justify-center"
      style={{
        height: 180,
        // Give enough horizontal room for the full spread.
        // Each card is 96 px wide; subtract the overlap.
        minWidth: Math.min(n * (96 + CARD_OVERLAP_PX), 640),
        paddingBottom: 16,
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <AnimatePresence>
        {cards.map((card, i) => {
          // ── Arc geometry ────────────────────────────────────────────────
          const center = (n - 1) / 2;
          const normalised = n > 1 ? (i - center) / Math.max(1, center) : 0;
          const rotateDeg = normalised * MAX_ROTATION_DEG;
          const yOffset = Math.abs(normalised) * MAX_Y_OFFSET_PX;

          // ── Playability ──────────────────────────────────────────────────
          const playable = isMyTurn && isCardPlayable(card, topCard, currentColor, pendingDrawCount);

          // ── Horizontal position ──────────────────────────────────────────
          const gap = hovered ? CARD_SPREAD_PX : CARD_OVERLAP_PX;
          const xOffset = (i - center) * (96 + gap);

          return (
            <motion.div
              key={card.id}
              layout
              initial={{ y: 60, opacity: 0, scale: 0.8 }}
              animate={{
                y: yOffset,
                x: xOffset,
                opacity: 1,
                scale: 1,
                transition: {
                  type: 'spring',
                  stiffness: 320,
                  damping: 28,
                  delay: i * 0.04,
                },
              }}
              exit={{
                y: -120,
                opacity: 0,
                scale: 0.7,
                transition: { duration: 0.3, ease: 'easeInOut' },
              }}
              style={{
                position: 'absolute',
                bottom: 0,
                // Base centerpoint — x is driven by the animate prop.
                left: '50%',
                marginLeft: -48, // half card width
                zIndex: hovered ? i + 10 : i,
                originX: '50%',
                originY: '100%',
              }}
            >
              <Card
                card={card}
                isPlayable={playable}
                isHidden={false}
                rotation={rotateDeg}
                onClick={() => onPlayCard(card.id)}
              />
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Pure helper — mirrors canPlayCard from engine but takes full card objects
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
