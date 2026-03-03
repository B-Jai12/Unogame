'use client';
import { useEffect } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useGameStore } from '@/store/useGameStore';
import { Room } from '@/lib/types';

export function useRoom(roomId: string | null) {
  const { currentRoom, subscribeToRoom } = useGameStore();

  useEffect(() => {
    if (roomId) {
      subscribeToRoom(roomId);
    }
  }, [roomId, subscribeToRoom]);

  return { room: currentRoom };
}
