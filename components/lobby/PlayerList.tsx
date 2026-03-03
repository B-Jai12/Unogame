'use client';
import { motion, AnimatePresence } from 'framer-motion';
import { Player } from '@/lib/types';
import Avatar from '@/components/ui/Avatar';
import GlassPanel from '@/components/ui/GlassPanel';

interface PlayerListProps {
  players: Player[];
  hostId: string;
  currentUid: string;
}

export default function PlayerList({ players, hostId, currentUid }: PlayerListProps) {
  return (
    <GlassPanel className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-white font-semibold">Players</h3>
        <span className="text-white/50 text-sm">{players.length}/8</span>
      </div>
      <div className="space-y-2">
        <AnimatePresence>
          {players.map((player, i) => (
            <motion.div
              key={player.uid}
              initial={{ opacity: 0, x: -20, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 20, scale: 0.95 }}
              transition={{ delay: i * 0.05, duration: 0.3, type: 'spring', stiffness: 200 }}
              className="flex items-center gap-3 p-3 rounded-xl bg-white/10 hover:bg-white/15 transition-colors"
            >
              <Avatar username={player.username} size="sm" />
              <div className="flex-1 min-w-0">
                <span className="text-white text-sm font-medium truncate block">
                  {player.username}
                  {player.uid === currentUid && (
                    <span className="ml-2 text-xs text-pink-200">(you)</span>
                  )}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {player.uid === hostId && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-gradient-to-r from-pink-soft/40 to-lavender-deep/40 text-white/90 border border-white/20">
                    Host
                  </span>
                )}
                <div className={`w-2 h-2 rounded-full ${player.isConnected ? 'bg-green-400' : 'bg-gray-400'}`} />
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
      {players.length < 2 && (
        <p className="text-center text-white/40 text-sm mt-4">Waiting for more players...</p>
      )}
    </GlassPanel>
  );
}
