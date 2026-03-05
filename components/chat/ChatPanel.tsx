'use client';
import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import {
  collection,
  addDoc,
  query,
  orderBy,
  limit,
  onSnapshot,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { ChatMessage } from '@/lib/types';
import { useGameStore } from '@/store/useGameStore';
import { formatTimestamp, getInitials } from '@/lib/utils';

interface ChatPanelProps {
  roomId: string;
}

export default function ChatPanel({ roomId }: ChatPanelProps) {
  const { currentUser, userProfile, messages, setMessages } = useGameStore();
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const q = query(
      collection(db, 'rooms', roomId, 'messages'),
      orderBy('createdAt', 'asc'),
      limit(80),
    );
    const unsub = onSnapshot(q, (snap) => {
      setMessages(snap.docs.map((d) => ({ id: d.id, ...d.data() } as ChatMessage)));
    });
    return () => unsub();
  }, [roomId, setMessages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function sendMessage() {
    const t = text.trim();
    if (!t || !currentUser || sending) return;
    setSending(true);
    setText('');
    try {
      await addDoc(collection(db, 'rooms', roomId, 'messages'), {
        senderId: currentUser.uid,
        senderName: userProfile?.username ?? 'Player',
        text: t,
        createdAt: Date.now(),
      });
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="glass flex flex-col h-full max-h-[460px]">
      {/* Header */}
      <div className="px-3 py-2 border-b border-white/10 shrink-0">
        <p className="text-white/70 text-xs font-semibold tracking-wide uppercase">Chat</p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2 scrollbar-thin min-h-0">
        {messages.length === 0 && (
          <p className="text-white/30 text-xs text-center mt-4">No messages yet</p>
        )}
        {messages.map((msg) => {
          const isMe = msg.senderId === currentUser?.uid;
          return (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, x: isMe ? 8 : -8 }}
              animate={{ opacity: 1, x: 0 }}
              className={`flex gap-1.5 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}
            >
              <div className="w-5 h-5 rounded-full bg-gradient-to-br from-pink-400 to-purple-500 flex items-center justify-center text-white text-[8px] font-bold shrink-0 mt-0.5">
                {getInitials(msg.senderName)}
              </div>
              <div className={`max-w-[80%] ${isMe ? 'items-end' : 'items-start'} flex flex-col gap-0.5`}>
                <span className="text-white/40 text-[9px] font-medium">{msg.senderName}</span>
                <div className={`px-2.5 py-1.5 rounded-xl text-xs text-white leading-relaxed ${isMe
                  ? 'bg-gradient-to-br from-pink-500/50 to-purple-500/50 border border-white/15'
                  : 'bg-white/12 border border-white/10'
                  }`}>
                  {/* Emojis allowed in message text */}
                  {msg.text}
                </div>
                <span className="text-white/25 text-[9px]">{formatTimestamp(msg.createdAt)}</span>
              </div>
            </motion.div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-3 py-2 border-t border-white/10 shrink-0 flex gap-2">
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
          placeholder="Message..."
          maxLength={200}
          className="flex-1 text-xs px-3 py-2"
        />
        <button
          onClick={sendMessage}
          disabled={!text.trim() || sending}
          className="btn-primary text-xs px-3 py-1.5"
        >
          Send
        </button>
      </div>
    </div>
  );
}
