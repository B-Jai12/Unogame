'use client';
import { motion, AnimatePresence } from 'framer-motion';
import { Player } from '@/lib/types';
import { getInitials } from '@/lib/utils';

interface ScoreboardProps {
  players: Player[];
  currentTurnUid: string;
  roundNumber: number;
  myUid?: string;
}

const WIN_TARGET = 100;

const PLAYER_ACCENTS = [
  { from: '#ff9ecb', to: '#ff6b9d' },
  { from: '#8da9ff', to: '#6088ff' },
  { from: '#8dffb3', to: '#4dd98a' },
  { from: '#ffe38d', to: '#ffc340' },
  { from: '#c8a2ff', to: '#9f6bff' },
  { from: '#ff8da1', to: '#ff5278' },
  { from: '#8df0ff', to: '#40cbff' },
];

export default function Scoreboard({ players, currentTurnUid, roundNumber, myUid }: ScoreboardProps) {
  const sorted = [...players].sort((a, b) => (b.matchScore ?? 0) - (a.matchScore ?? 0));
  const accentMap = new Map<string, number>();
  players.forEach((p, i) => accentMap.set(p.uid, i % PLAYER_ACCENTS.length));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: 10, gap: 8, overflowY: 'auto' }}>

      {/* Round header */}
      <div style={{ textAlign: 'center', padding: '8px 12px', borderRadius: 14, flexShrink: 0, background: 'rgba(255,255,255,0.14)', border: '1px solid rgba(255,255,255,0.22)' }}>
        <p style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.6)', margin: 0 }}>Round</p>
        <p style={{ fontSize: 28, fontWeight: 900, color: 'white', lineHeight: 1, margin: '2px 0 1px' }}>{roundNumber}</p>
        <p style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)', margin: 0 }}>First to {WIN_TARGET}pts</p>
      </div>

      {/* Divider */}
      <div style={{ height: 1, background: 'rgba(255,255,255,0.1)', flexShrink: 0 }} />

      {/* Player list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1 }}>
        {sorted.map((player) => {
          const isActive = player.uid === currentTurnUid;
          const isMe = player.uid === myUid;
          const pct = Math.min(100, ((player.matchScore ?? 0) / WIN_TARGET) * 100);
          const cardCount = player.hand?.length ?? 0;
          const accentIdx = accentMap.get(player.uid) ?? 0;
          const accent = PLAYER_ACCENTS[accentIdx];
          const accentFrom = accent.from;
          const accentTo = accent.to;

          return (
            <div
              key={player.uid}
              style={{
                borderRadius: 12,
                padding: '0 0 8px 0',
                overflow: 'hidden',
                position: 'relative',
                background: isActive ? 'rgba(255,255,255,0.14)' : 'rgba(255,255,255,0.07)',
                border: isActive ? `1.5px solid ${accentFrom}90` : '1px solid rgba(255,255,255,0.1)',
                boxShadow: isActive ? `0 0 16px ${accentFrom}70` : 'none',
              }}
            >
              {/* Accent top bar */}
              <div style={{ height: 3, width: '100%', background: `linear-gradient(to right, ${accentFrom}, ${accentTo})`, marginBottom: 8 }} />

              {/* Name row */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '0 8px' }}>
                {/* Avatar */}
                <div style={{
                  width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                  background: `linear-gradient(135deg, ${accentFrom}, ${accentTo})`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 9, fontWeight: 900, color: 'white',
                  border: isActive ? '2px solid rgba(255,255,255,0.6)' : '1.5px solid rgba(255,255,255,0.25)',
                  boxShadow: isActive ? `0 0 10px ${accentFrom}80` : 'none',
                }}>
                  {getInitials(player.username)}
                </div>

                {/* Name + badges */}
                <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: 'white', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 80 }}>
                      {player.username.charAt(0).toUpperCase() + player.username.slice(1)}
                    </span>
                    {isMe && (
                      <span style={{ fontSize: 7, fontWeight: 800, color: 'rgba(255,255,255,0.8)', background: 'rgba(255,255,255,0.16)', borderRadius: 99, padding: '1px 5px', border: '1px solid rgba(255,255,255,0.2)', whiteSpace: 'nowrap' }}>
                        YOU
                      </span>
                    )}
                  </div>
                  {isActive && (
                    <span style={{ fontSize: 9, fontWeight: 700, color: accentFrom }}>Playing now...</span>
                  )}
                </div>

                {/* Card count */}
                <div style={{
                  flexShrink: 0, minWidth: 24, height: 24, borderRadius: 8, padding: '0 5px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: cardCount <= 1 && cardCount > 0 ? 'rgba(255,80,100,0.3)' : 'rgba(255,255,255,0.13)',
                  border: cardCount <= 1 && cardCount > 0 ? '1px solid rgba(255,80,100,0.5)' : '1px solid rgba(255,255,255,0.15)',
                  fontSize: 11, fontWeight: 900, color: cardCount <= 1 && cardCount > 0 ? '#ff8da1' : 'rgba(255,255,255,0.9)',
                }}>
                  {cardCount}
                </div>
              </div>

              {/* UNO alert */}
              <AnimatePresence>
                {player.hasCalledUNO && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    style={{ overflow: 'hidden', padding: '0 8px' }}
                  >
                    <div style={{
                      marginTop: 4, padding: '2px 8px', borderRadius: 99, textAlign: 'center',
                      background: 'rgba(255,50,80,0.2)', border: '1px solid rgba(255,80,100,0.4)',
                      fontSize: 9, fontWeight: 900, color: '#fda4af', letterSpacing: '0.06em',
                    }}>
                      UNO!
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Scores */}
              <div style={{ display: 'flex', gap: 4, padding: '6px 8px 0' }}>
                {[{ label: 'Round', value: player.roundScore ?? 0 }, { label: 'Total', value: player.matchScore ?? 0 }].map(({ label, value }) => (
                  <div key={label} style={{ flex: 1, textAlign: 'center', background: 'rgba(255,255,255,0.08)', borderRadius: 8, padding: '3px 4px' }}>
                    <p style={{ fontSize: 8, fontWeight: 700, color: 'rgba(255,255,255,0.55)', textTransform: 'uppercase', letterSpacing: '0.06em', margin: 0 }}>{label}</p>
                    <p style={{ fontSize: 13, fontWeight: 900, color: 'white', lineHeight: 1, margin: '1px 0 0' }}>{value}</p>
                  </div>
                ))}
              </div>

              {/* Progress bar */}
              <div style={{ padding: '4px 8px 0' }}>
                <div style={{ height: 4, background: 'rgba(255,255,255,0.1)', borderRadius: 99, overflow: 'hidden' }}>
                  <motion.div
                    style={{ height: '100%', borderRadius: 99, background: `linear-gradient(to right, ${accentFrom}, ${accentTo})` }}
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: 0.7, ease: 'easeOut' }}
                  />
                </div>
                <p style={{ textAlign: 'right', fontSize: 8, color: 'rgba(255,255,255,0.38)', margin: '2px 0 0' }}>{Math.round(pct)}%</p>
              </div>

              {!player.isConnected && (
                <p style={{ textAlign: 'center', fontSize: 8, color: '#f87171', margin: '4px 8px 0', padding: '2px 0', background: 'rgba(248,113,113,0.1)', borderRadius: 6 }}>
                  Disconnected
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
