'use client';
import { useEffect, useRef, useCallback } from 'react';
import {
  collection,
  query,
  orderBy,
  limit,
  onSnapshot,
  addDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useGameStore } from '@/store/useGameStore';
import { ChatMessage } from '@/lib/types';

export function useChat(roomId: string | null) {
  const { currentUser, userProfile, messages, setMessages } = useGameStore();
  const lastSentRef = useRef<number>(0);

  useEffect(() => {
    if (!roomId) return;
    const q = query(
      collection(db, 'rooms', roomId, 'messages'),
      orderBy('createdAt', 'asc'),
      limit(100)
    );
    const unsub = onSnapshot(q, (snap) => {
      const msgs: ChatMessage[] = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<ChatMessage, 'id'>),
        createdAt: d.data().createdAt?.toMillis?.() ?? Date.now(),
      }));
      setMessages(msgs);
    });
    return () => unsub();
  }, [roomId, setMessages]);

  const sendMessage = useCallback(
    async (text: string) => {
      if (!roomId || !currentUser || !userProfile) return;
      const now = Date.now();
      if (now - lastSentRef.current < 1000) return; // rate limit 1/s
      if (!text.trim()) return;
      lastSentRef.current = now;
      await addDoc(collection(db, 'rooms', roomId, 'messages'), {
        senderId: currentUser.uid,
        senderName: userProfile.username,
        text: text.trim(),
        createdAt: serverTimestamp(),
      });
    },
    [roomId, currentUser, userProfile]
  );

  return { messages, sendMessage };
}
