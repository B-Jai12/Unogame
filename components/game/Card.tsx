'use client';

/**
 * components/game/Card.tsx
 *
 * A single UNO card. Supports face-up (all types) and face-down (back) rendering.
 * Uses Framer Motion layoutId so the card animates smoothly when moved between
 * the hand, draw pile, and discard pile.
 *
 * Color palette (all soft/pastel):
 *   Red    #ff8da1   Blue   #8da9ff
 *   Green  #8dffb3   Yellow #ffe38d
 *   Wild   #c8a2ff
 *
 * No emojis. SVG paths only for action iconography.
 */

import { motion } from 'framer-motion';
import { Card as CardType } from '@/lib/types';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Pastel fill for each card color. */
const COLOR_FILLS: Record<string, string> = {
  red: '#ff8da1',
  blue: '#8da9ff',
  green: '#8dffb3',
  yellow: '#ffe38d',
  // Wild cards get a four-quadrant gradient (handled separately).
};

/** Slightly darker shade used for the card's outer border ring. */
const COLOR_RINGS: Record<string, string> = {
  red: '#ff6b87',
  blue: '#6a8fff',
  green: '#6bff9a',
  yellow: '#ffd96a',
};

// ---------------------------------------------------------------------------
// SVG Icons — pure paths, no emoji, no text
// ---------------------------------------------------------------------------

/** Circular arrow indicating "skip this turn." */
function SkipIcon() {
  return (
    <svg viewBox="0 0 40 40" fill="none" className="w-full h-full">
      {/* Circular arrow body */}
      <path
        d="M 20 6 A 14 14 0 1 0 34 20"
        stroke="white"
        strokeWidth="4"
        strokeLinecap="round"
        fill="none"
      />
      {/* Arrow head pointing right */}
      <polyline
        points="28,14 34,20 28,26"
        stroke="white"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      {/* Vertical bar = "stop" */}
      <line
        x1="34" y1="8" x2="34" y2="32"
        stroke="white"
        strokeWidth="4"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** Two opposing curved arrows representing direction change. */
function ReverseIcon() {
  return (
    <svg viewBox="0 0 40 40" fill="none" className="w-full h-full">
      {/* Top arrow: left-curving arc */}
      <path
        d="M 30 8 A 12 12 0 0 0 10 20"
        stroke="white"
        strokeWidth="3.5"
        strokeLinecap="round"
        fill="none"
      />
      <polyline
        points="5,14 10,20 16,15"
        stroke="white"
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      {/* Bottom arrow: right-curving arc */}
      <path
        d="M 10 32 A 12 12 0 0 0 30 20"
        stroke="white"
        strokeWidth="3.5"
        strokeLinecap="round"
        fill="none"
      />
      <polyline
        points="35,26 30,20 24,25"
        stroke="white"
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}

/** A stack of cards with a bold plus badge — represents Draw Two / Draw Four. */
function DrawIcon({ count }: { count: 2 | 4 }) {
  const isWild4 = count === 4;
  return (
    <svg viewBox="0 0 44 52" fill="none" className="w-full h-full">
      {/* Back card — offset */}
      <rect x="4" y="2" width="28" height="38" rx="4" fill="white" fillOpacity="0.25" />
      <rect x="4" y="2" width="28" height="38" rx="4" stroke="white" strokeOpacity="0.5" strokeWidth="1.5" />
      {/* Front card */}
      <rect x="12" y="10" width="28" height="38" rx="4" fill="white" fillOpacity="0.55" />
      <rect x="12" y="10" width="28" height="38" rx="4" stroke="white" strokeOpacity="0.7" strokeWidth="1.5" />
      {/* Plus sign on front card */}
      <line x1="26" y1="18" x2="26" y2="40" stroke="white" strokeWidth="3.5" strokeLinecap="round" />
      <line x1="15" y1="29" x2="37" y2="29" stroke="white" strokeWidth="3.5" strokeLinecap="round" />
      {/* Bold count badge — bottom left */}
      <circle cx="10" cy="46" r="8" fill={isWild4 ? '#1e1b4b' : '#7f1d1d'} fillOpacity="0.85" />
      <text
        x="10" y="49.5"
        fill="white"
        fontSize="8.5"
        fontWeight="900"
        fontFamily="system-ui, sans-serif"
        textAnchor="middle"
        opacity="1"
      >
        +{count}
      </text>
    </svg>
  );
}

/** Four colored diamonds arranged in a pinwheel, used for Wild cards. */
function WildIcon() {
  return (
    <svg viewBox="0 0 40 40" fill="none" className="w-full h-full">
      <ellipse cx="20" cy="10" rx="8" ry="10" fill="#ff8da1" transform="rotate(0,20,20)" />
      <ellipse cx="20" cy="10" rx="8" ry="10" fill="#8da9ff" transform="rotate(90,20,20)" />
      <ellipse cx="20" cy="10" rx="8" ry="10" fill="#8dffb3" transform="rotate(180,20,20)" />
      <ellipse cx="20" cy="10" rx="8" ry="10" fill="#ffe38d" transform="rotate(270,20,20)" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Wild card fill — four-color quadrant gradient
// ---------------------------------------------------------------------------

function WildBackground() {
  return (
    <div className="absolute inset-0 rounded-lg overflow-hidden">
      <div className="absolute inset-0 grid grid-cols-2 grid-rows-2">
        <div style={{ backgroundColor: '#ff8da1' }} />
        <div style={{ backgroundColor: '#8da9ff' }} />
        <div style={{ backgroundColor: '#ffe38d' }} />
        <div style={{ backgroundColor: '#8dffb3' }} />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Card back
// ---------------------------------------------------------------------------

function CardBack() {
  return (
    <div className="absolute inset-0 rounded-2xl overflow-hidden flex items-center justify-center"
      style={{
        background: 'linear-gradient(135deg, #a87bff 0%, #ff9ecb 50%, #a87bff 100%)',
      }}
    >
      {/* Diagonal stripe texture */}
      <div
        className="absolute inset-0 opacity-10"
        style={{
          backgroundImage:
            'repeating-linear-gradient(45deg, white 0px, white 2px, transparent 2px, transparent 12px)',
        }}
      />
      {/* Center oval with UNO text */}
      <div
        className="relative z-10 flex items-center justify-center"
        style={{
          width: '60%',
          height: '58%',
          background: 'rgba(255,255,255,0.18)',
          borderRadius: '50%',
          border: '3px solid rgba(255,255,255,0.5)',
          transform: 'rotate(-30deg)',
          boxShadow: '0 0 20px rgba(255,255,255,0.2)',
        }}
      >
        <span
          style={{
            fontFamily: 'Georgia, serif',
            fontSize: 'clamp(10px, 2vw, 16px)',
            fontWeight: 900,
            color: 'white',
            transform: 'rotate(30deg)',
            letterSpacing: '0.05em',
            textShadow: '0 2px 8px rgba(0,0,0,0.3)',
          }}
        >
          UNO
        </span>
      </div>
      {/* Glossy overlay */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(135deg, rgba(255,255,255,0.25) 0%, transparent 55%)',
          borderRadius: 'inherit',
        }}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface CardProps {
  card: CardType;
  onClick?: () => void;
  isPlayable?: boolean;
  isHidden?: boolean;
  /** Override rotation (degrees) — used by PlayerHand for arc layout. */
  rotation?: number;
  /** Additional Framer Motion style passthrough (e.g., zIndex). */
  style?: React.CSSProperties;
  /** Disable layoutId animation — useful for static preview renders. */
  noLayoutId?: boolean;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function Card({
  card,
  onClick,
  isPlayable = false,
  isHidden = false,
  rotation = 0,
  style,
  noLayoutId = false,
}: CardProps) {
  // ── Color resolution ─────────────────────────────────────────────────────
  const isWild = card.type === 'wild' || card.type === 'wild4';
  const fillColor = isWild ? null : COLOR_FILLS[card.color ?? ''] ?? '#e2e8f0';
  const ringColor = isWild ? null : COLOR_RINGS[card.color ?? ''] ?? '#cbd5e1';

  // ── Card label (number value as string, or rendered via SVG icon) ─────────
  const showNumber = card.type === 'number' && card.value !== null;

  return (
    <motion.div
      layoutId={noLayoutId ? undefined : card.id}
      onClick={isPlayable && onClick ? onClick : undefined}
      initial={false}
      whileHover={
        isPlayable
          ? { y: -15, scale: 1.05, transition: { type: 'spring', stiffness: 400, damping: 25 } }
          : undefined
      }
      whileTap={
        isPlayable && onClick
          ? { scale: 0.97, transition: { type: 'spring', stiffness: 600, damping: 30 } }
          : undefined
      }
      style={{
        rotate: rotation,
        cursor: isPlayable && onClick ? 'pointer' : 'default',
        ...style,
      }}
      className="relative select-none"
    // Standard poker card ratio: 2.5 : 3.5 = 1 : 1.4
    // At w-24 (96px) → h-[134px]
    // Using inline style for precise control.
    >
      {/* ── Card shell ──────────────────────────────────────────────────── */}
      <div
        style={{
          width: 96,
          height: 134,
          borderRadius: 14,
          position: 'relative',
          // Outer white border
          border: '3px solid rgba(255,255,255,0.9)',
          boxShadow: isPlayable
            ? '0 8px 24px rgba(255,158,203,0.45), 0 2px 8px rgba(0,0,0,0.15)'
            : '0 4px 12px rgba(0,0,0,0.18)',
          overflow: 'hidden',
          transition: 'box-shadow 0.2s ease',
        }}
      >
        {/* ── Hidden / card back ──────────────────────────────────────── */}
        {isHidden ? (
          <CardBack />
        ) : (
          <>
            {/* ── Colored background ──────────────────────────────────── */}
            {isWild ? (
              <WildBackground />
            ) : (
              <div
                className="absolute inset-0"
                style={{ backgroundColor: fillColor ?? undefined }}
              />
            )}

            {/* ── Inner ring / frame ──────────────────────────────────── */}
            <div
              className="absolute"
              style={{
                inset: 6,
                borderRadius: 9,
                border: `2.5px solid ${isWild ? 'rgba(255,255,255,0.55)' : ringColor ?? 'rgba(255,255,255,0.55)'}`,
              }}
            />

            {/* ── Center oval ─────────────────────────────────────────── */}
            <div
              className="absolute"
              style={{
                top: '50%',
                left: '50%',
                width: '70%',
                height: '85%',
                transform: 'translate(-50%, -50%) rotate(-30deg)',
                backgroundColor: 'rgba(255,255,255,0.28)',
                borderRadius: '50%',
              }}
            />

            {/* ── Card content ─────────────────────────────────────────── */}
            <div
              className="absolute inset-0 flex flex-col items-center justify-center"
              style={{ gap: 2 }}
            >
              {/* Top-left corner value */}
              <div
                style={{
                  position: 'absolute',
                  top: 6,
                  left: 8,
                  fontSize: 13,
                  fontWeight: 800,
                  color: 'white',
                  fontFamily: 'Georgia, serif',
                  lineHeight: 1,
                  textShadow: '0 1px 3px rgba(0,0,0,0.3)',
                }}
              >
                {showNumber ? card.value : null}
              </div>

              {/* Center icon */}
              <div style={{ width: 44, height: 44 }}>
                {showNumber && (
                  <div
                    style={{
                      width: '100%',
                      height: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 32,
                      fontWeight: 900,
                      color: 'white',
                      fontFamily: 'Georgia, serif',
                      textShadow: '0 2px 6px rgba(0,0,0,0.25)',
                    }}
                  >
                    {card.value}
                  </div>
                )}
                {card.type === 'skip' && <SkipIcon />}
                {card.type === 'reverse' && <ReverseIcon />}
                {card.type === 'draw2' && <DrawIcon count={2} />}
                {card.type === 'wild' && <WildIcon />}
                {card.type === 'wild4' && <DrawIcon count={4} />}
              </div>

              {/* Bottom-right corner value (rotated 180°) */}
              <div
                style={{
                  position: 'absolute',
                  bottom: 6,
                  right: 8,
                  fontSize: 13,
                  fontWeight: 800,
                  color: 'white',
                  fontFamily: 'Georgia, serif',
                  lineHeight: 1,
                  textShadow: '0 1px 3px rgba(0,0,0,0.3)',
                  transform: 'rotate(180deg)',
                }}
              >
                {showNumber ? card.value : null}
              </div>
            </div>

            {/* ── Playable glow highlight ──────────────────────────────── */}
            {isPlayable && (
              <motion.div
                className="absolute inset-0"
                initial={{ opacity: 0 }}
                animate={{ opacity: [0.4, 0.7, 0.4] }}
                transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
                style={{
                  borderRadius: 'inherit',
                  boxShadow: 'inset 0 0 0 2.5px rgba(255,255,255,0.75)',
                  pointerEvents: 'none',
                }}
              />
            )}

            {/* ── Glossy diagonal reflection overlay ──────────────────── */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                borderRadius: 'inherit',
                background:
                  'linear-gradient(135deg, rgba(255,255,255,0.40) 0%, rgba(255,255,255,0.08) 45%, transparent 100%)',
              }}
            />
          </>
        )}
      </div>
    </motion.div>
  );
}
