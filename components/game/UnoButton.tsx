'use client';

/**
 * components/game/UnoButton.tsx
 *
 * The UNO call button and opponent catch interface.
 *
 * States:
 *   Inactive (hand > 2 cards) — opacity 0.25, pointer-events none.
 *   Armed     (hand === 2)    — low opacity 0.65, pulse begins slowly.
 *   Active    (hand === 1)    — full opacity, aggressive pink/white glow pulse.
 *   Called                   — stabilises to a solid green glow after click.
 *
 * Catch buttons appear inline for any opponent who is UNO-eligible and
 * has NOT yet called UNO — they must be caught within the 5-second window.
 */

import { motion, AnimatePresence } from 'framer-motion';
import { Player } from '@/lib/types';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface UnoButtonProps {
  cardCount: number;
  hasCalledUNO: boolean;
  onCallUNO: () => void;
  catchTargets: Player[];          // opponents who can be caught
  onCatch: (uid: string) => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function UnoButton({
  cardCount,
  hasCalledUNO,
  onCallUNO,
  catchTargets,
  onCatch,
}: UnoButtonProps) {
  // Derive visual state
  const isActive = cardCount === 1;
  const isArmed = cardCount === 2;
  const isInactive = cardCount > 2;
  const hasCatchTargets = catchTargets.length > 0;

  const opacity = isInactive ? 0.22 : isArmed ? 0.65 : 1;
  const canClick = (isActive || isArmed) && !hasCalledUNO;

  // Glow animation definition
  const glowAnimation = hasCalledUNO
    ? {
      // Settled — soft green glow
      boxShadow: [
        '0 0 12px rgba(134,239,172,0.6)',
        '0 0 24px rgba(134,239,172,0.8)',
        '0 0 12px rgba(134,239,172,0.6)',
      ],
    }
    : isActive
      ? {
        // Urgent — ping-pong pink/white glow
        boxShadow: [
          '0 0 8px rgba(255,158,203,0.4)',
          '0 0 36px rgba(255,158,203,1)',
          '0 0 16px rgba(255,255,255,0.8)',
          '0 0 36px rgba(255,158,203,1)',
          '0 0 8px rgba(255,158,203,0.4)',
        ],
      }
      : isArmed
        ? {
          boxShadow: [
            '0 0 4px rgba(255,158,203,0.2)',
            '0 0 16px rgba(255,158,203,0.5)',
            '0 0 4px rgba(255,158,203,0.2)',
          ],
        }
        : { boxShadow: '0 0 0px transparent' };

  const glowTransition = hasCalledUNO
    ? { duration: 2.4, repeat: Infinity, ease: 'easeInOut' }
    : isActive
      ? { duration: 1.1, repeat: Infinity, ease: 'easeInOut' }
      : { duration: 2.4, repeat: Infinity, ease: 'easeInOut' };

  return (
    <div className="flex flex-col items-center gap-2">
      {/* Main UNO button */}
      <motion.button
        animate={glowAnimation}
        transition={glowTransition}
        whileHover={canClick ? { scale: 1.08 } : {}}
        whileTap={canClick ? { scale: 0.94 } : {}}
        onClick={canClick ? onCallUNO : undefined}
        disabled={!canClick}
        style={{
          opacity,
          pointerEvents: isInactive ? 'none' : 'auto',
          cursor: canClick ? 'pointer' : 'default',
          width: 72,
          height: 72,
          borderRadius: '50%',
          border: hasCalledUNO
            ? '3px solid rgba(134,239,172,0.8)'
            : '3px solid rgba(255,255,255,0.75)',
          background: hasCalledUNO
            ? 'linear-gradient(135deg, rgba(134,239,172,0.25), rgba(52,211,153,0.15))'
            : 'linear-gradient(135deg, rgba(255,158,203,0.35), rgba(168,123,255,0.35))',
          backdropFilter: 'blur(12px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
        aria-label={hasCalledUNO ? 'UNO called' : 'Call UNO'}
      >
        <span
          style={{
            fontFamily: 'Georgia, serif',
            fontSize: 20,
            fontWeight: 900,
            color: hasCalledUNO ? '#86efac' : 'white',
            letterSpacing: '0.04em',
            textShadow: hasCalledUNO
              ? '0 0 12px rgba(134,239,172,0.8)'
              : '0 2px 8px rgba(0,0,0,0.3)',
            userSelect: 'none',
          }}
        >
          {hasCalledUNO ? 'UNO!' : 'UNO'}
        </span>
      </motion.button>

      {/* Called confirmation text */}
      <AnimatePresence>
        {hasCalledUNO && (
          <motion.p
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            style={{
              fontSize: 10,
              fontWeight: 600,
              color: '#86efac',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
            }}
          >
            You called UNO
          </motion.p>
        )}
      </AnimatePresence>

      {/* Catch buttons for uncalled opponents */}
      <AnimatePresence>
        {hasCatchTargets && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="flex flex-col gap-1.5 items-center"
          >
            {catchTargets.map((target) => (
              <motion.button
                key={target.uid}
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                whileHover={{ scale: 1.06 }}
                whileTap={{ scale: 0.94 }}
                onClick={() => onCatch(target.uid)}
                style={{
                  padding: '4px 14px',
                  borderRadius: 20,
                  background: 'linear-gradient(135deg, #ff6b87, #ff8da1)',
                  border: '1.5px solid rgba(255,255,255,0.5)',
                  color: 'white',
                  fontSize: 11,
                  fontWeight: 700,
                  cursor: 'pointer',
                  letterSpacing: '0.04em',
                  boxShadow: '0 4px 14px rgba(255,107,135,0.4)',
                }}
              >
                Catch {target.username}
              </motion.button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
