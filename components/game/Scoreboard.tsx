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

const WIN_TARGET = 500;

const PLAYER_ACCENTS = [
  { from: '#f472b6', to: '#db2777' },
  { from: '#60a5fa', to: '#2563eb' },
  { from: '#4ade80', to: '#16a34a' },
  { from: '#fbbf24', to: '#d97706' },
  { from: '#a78bfa', to: '#7c3aed' },
  { from: '#f87171', to: '#dc2626' },
  { from: '#22d3ee', to: '#0891b2' },
];

export default function Scoreboard({ players, currentTurnUid, roundNumber, myUid }: ScoreboardProps) {
  const sorted = [...players].sort((a, b) => (b.matchScore ?? 0) - (a.matchScore ?? 0));
  const accentMap = new Map<string, number>();
  players.forEach((p, i) => accentMap.set(p.uid, i % PLAYER_ACCENTS.length));

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', height: '100%',
      padding: 10, gap: 8, overflowY: 'auto',
      background: 'var(--panel-bg)',
    }}>
      {/* Round header */}
      <div style={{
        textAlign: 'center', padding: '8px 12px', borderRadius: 14, flexShrink: 0,
        background: 'var(--panel-item-bg)',
        border: '1px solid var(--panel-border)',
      }}>
        <p style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--text-on-panel-dim)', margin: 0 }}>Round</p>
        <p style={{ fontSize: 28, fontWeight: 900, color: 'var(--text-on-panel)', lineHeight: 1, margin: '2px 0 1px' }}>{roundNumber}</p>
        <p style={{ fontSize: 9, color: 'var(--text-on-panel-muted)', margin: 0 }}>First to {WIN_TARGET}pts</p>
      </div>

      {/* Divider */}
      <div style={{ height: 1, background: 'var(--panel-border)', flexShrink: 0 }} />

      {/* Player list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1 }}>
        {sorted.map((player) => {
          const isActive = player.uid === currentTurnUid;
          const isMe = player.uid === myUid;
          const pct = Math.min(100, ((player.matchScore ?? 0) / WIN_TARGET) * 100);
          const cardCount = player.hand?.length ?? 0;
          const accentIdx = accentMap.get(player.uid) ?? 0;
          const accent = PLAYER_ACCENTS[accentIdx];

          return (
            <div key={player.uid} style={{
              borderRadius: 12, padding: '0 0 8px 0', overflow: 'hidden', position: 'relative',
              background: isActive ? 'var(--panel-item-active)' : 'var(--panel-item-bg)',
              border: isActive ? `1.5px solid ${accent.from}80` : '1px solid var(--panel-item-border)',
              boxShadow: isActive ? `0 0 16px ${accent.from}50` : 'none',
              transition: 'background 0.3s ease, border 0.3s ease',
            }}>
              {/* Accent top bar */}
              <div style={{ height: 3, width: '100%', background: `linear-gradient(to right, ${accent.from}, ${accent.to})`, marginBottom: 8 }} />

              {/* Name row */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '0 8px' }}>
                <div style={{
                  width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                  background: `linear-gradient(135deg, ${accent.from}, ${accent.to})`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 9, fontWeight: 900, color: 'white',
                  border: isActive ? '2px solid rgba(255,255,255,0.6)' : '1.5px solid rgba(255,255,255,0.4)',
                  boxShadow: isActive ? `0 0 10px ${accent.from}80` : 'none',
                }}>
                  {getInitials(player.username)}
                </div>

                <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-on-panel)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 80 }}>
                      {player.username.charAt(0).toUpperCase() + player.username.slice(1)}
                    </span>
                    {isMe && (
                      <span style={{ fontSize: 7, fontWeight: 800, color: accent.from, background: `${accent.from}20`, borderRadius: 99, padding: '1px 5px', border: `1px solid ${accent.from}40`, whiteSpace: 'nowrap' }}>
                        YOU
                      </span>
                    )}
                  </div>
                  {isActive && (
                    <span style={{ fontSize: 9, fontWeight: 700, color: accent.from }}>Playing now...</span>
                  )}
                </div>

                {/* Card count */}
                <div style={{
                  flexShrink: 0, minWidth: 24, height: 24, borderRadius: 8, padding: '0 5px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: cardCount <= 1 && cardCount > 0 ? 'rgba(255,80,100,0.3)' : 'var(--panel-item-bg)',
                  border: cardCount <= 1 && cardCount > 0 ? '1px solid rgba(255,80,100,0.5)' : '1px solid var(--panel-border)',
                  fontSize: 11, fontWeight: 900,
                  color: cardCount <= 1 && cardCount > 0 ? '#ff8da1' : 'var(--text-on-panel)',
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
                      background: 'rgba(255,50,80,0.15)', border: '1px solid rgba(255,80,100,0.4)',
                      fontSize: 9, fontWeight: 900, color: '#f87171', letterSpacing: '0.06em',
                    }}>
                      UNO!
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Scores */}
              <div style={{ display: 'flex', gap: 4, padding: '6px 8px 0' }}>
                {[{ label: 'Round', value: player.roundScore ?? 0 }, { label: 'Total', value: player.matchScore ?? 0 }].map(({ label, value }) => (
                  <div key={label} style={{ flex: 1, textAlign: 'center', background: 'var(--panel-item-bg)', borderRadius: 8, padding: '3px 4px' }}>
                    <p style={{ fontSize: 8, fontWeight: 700, color: 'var(--text-on-panel-dim)', textTransform: 'uppercase', letterSpacing: '0.06em', margin: 0 }}>{label}</p>
                    <p style={{ fontSize: 13, fontWeight: 900, color: 'var(--text-on-panel)', lineHeight: 1, margin: '1px 0 0' }}>{value}</p>
                  </div>
                ))}
              </div>

              {/* Progress bar */}
              <div style={{ padding: '4px 8px 0' }}>
                <div style={{ height: 4, background: 'var(--panel-item-bg)', borderRadius: 99, overflow: 'hidden' }}>
                  <motion.div
                    style={{ height: '100%', borderRadius: 99, background: `linear-gradient(to right, ${accent.from}, ${accent.to})` }}
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: 0.7, ease: 'easeOut' }}
                  />
                </div>
                <p style={{ textAlign: 'right', fontSize: 8, color: 'var(--text-on-panel-muted)', margin: '2px 0 0' }}>{Math.round(pct)}%</p>
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
