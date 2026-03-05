'use client';

import { useEffect, useRef, useState, useCallback, KeyboardEvent } from 'react';
import { collection, query, orderBy, limit, onSnapshot, addDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import { motion, AnimatePresence } from 'framer-motion';

interface ChatMessage {
    id: string;
    senderId: string;
    senderName: string;
    text: string;
    createdAt: number;
    isSystem?: boolean;
}

interface ChatBoxProps {
    roomId: string;
    currentUid: string;
}

const NAME_COLORS = ['#f472b6', '#60a5fa', '#4ade80', '#fbbf24', '#a78bfa', '#f87171'];

function nameColor(name: string) {
    const idx = (name.charCodeAt(0) ?? 0) % NAME_COLORS.length;
    return NAME_COLORS[idx];
}

function toTitleCase(s: string) {
    return s.charAt(0).toUpperCase() + s.slice(1);
}

import { useGameStore } from '@/store/useGameStore';

export default function ChatBox({ roomId, currentUid }: ChatBoxProps) {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState('');
    const [sending, setSending] = useState(false);
    const bottomRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (!roomId) return;
        const q = query(collection(db, 'rooms', roomId, 'messages'), orderBy('createdAt', 'asc'), limit(120));
        const unsub = onSnapshot(q, (snap) => {
            const msgs: ChatMessage[] = snap.docs.map((d) => ({
                id: d.id,
                senderId: d.data().senderId ?? '',
                senderName: d.data().senderName ?? 'Player',
                text: d.data().text ?? '',
                createdAt: d.data().createdAt ?? 0,
                isSystem: d.data().isSystem ?? false,
            }));
            setMessages(msgs);
        });
        return unsub;
    }, [roomId]);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSend = useCallback(async () => {
        const text = input.trim();
        if (!text || sending || !currentUid) return;
        const user = auth.currentUser;
        if (!user) return;
        const profile = useGameStore.getState().userProfile;
        setSending(true);
        setInput('');
        try {
            await addDoc(collection(db, 'rooms', roomId, 'messages'), {
                senderId: user.uid,
                senderName: profile?.username ?? 'Player',
                text, createdAt: serverTimestamp(), isSystem: false,
            });
        } catch { setInput(text); }
        finally { setSending(false); inputRef.current?.focus(); }
    }, [input, sending, currentUid, roomId]);

    const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', background: 'var(--panel-bg)' }}>

            {/* Header */}
            <div style={{
                padding: '12px 14px 10px',
                borderBottom: '1px solid var(--panel-border)',
                flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                background: 'var(--panel-header)',
            }}>
                <p style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-on-panel-dim)', margin: 0 }}>
                    Chat
                </p>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#4ade80', boxShadow: '0 0 6px #4ade80' }} />
            </div>

            {/* Message list */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '10px 10px 4px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                <AnimatePresence initial={false}>
                    {messages.length === 0 && (
                        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <p style={{ fontSize: 11, color: 'var(--text-on-panel-muted)', textAlign: 'center', fontStyle: 'italic' }}>
                                No messages yet
                            </p>
                        </div>
                    )}
                    {messages.map((msg) => {
                        const isMine = msg.senderId === currentUid;

                        if (msg.isSystem || msg.senderId === 'system') {
                            return (
                                <motion.div
                                    key={msg.id}
                                    initial={{ opacity: 0, y: 4 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    style={{ textAlign: 'center', padding: '2px 8px' }}
                                >
                                    <span style={{
                                        fontSize: 10, fontStyle: 'italic',
                                        color: 'var(--text-on-panel-muted)',
                                        background: 'var(--panel-item-bg)',
                                        borderRadius: 99, padding: '2px 10px',
                                        border: '1px solid var(--panel-border)',
                                    }}>
                                        {msg.text}
                                    </span>
                                </motion.div>
                            );
                        }

                        const accent = nameColor(msg.senderName);
                        return (
                            <motion.div
                                key={msg.id}
                                initial={{ opacity: 0, y: 8, scale: 0.95 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                transition={{ type: 'spring', stiffness: 340, damping: 28 }}
                                style={{ display: 'flex', flexDirection: isMine ? 'row-reverse' : 'row', alignItems: 'flex-end', gap: 6 }}
                            >
                                {!isMine && (
                                    <div style={{
                                        width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
                                        background: `linear-gradient(135deg, ${accent}, #8b5cf6)`,
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        fontSize: 8, fontWeight: 800, color: 'white',
                                        border: '1.5px solid rgba(255,255,255,0.3)',
                                    }}>
                                        {msg.senderName.charAt(0).toUpperCase()}
                                    </div>
                                )}

                                <div style={{ maxWidth: '82%', display: 'flex', flexDirection: 'column', alignItems: isMine ? 'flex-end' : 'flex-start', gap: 1 }}>
                                    {!isMine && (
                                        <span style={{ fontSize: 9, fontWeight: 700, color: accent, paddingLeft: 4, opacity: 0.9 }}>
                                            {toTitleCase(msg.senderName)}
                                        </span>
                                    )}
                                    <div style={{
                                        padding: '7px 11px',
                                        borderRadius: isMine ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                                        background: isMine
                                            ? 'linear-gradient(135deg, rgba(139,92,246,0.45), rgba(88,28,135,0.35))'
                                            : 'var(--panel-item-bg)',
                                        border: isMine ? '1px solid rgba(139,92,246,0.3)' : '1px solid var(--panel-item-border)',
                                        backdropFilter: 'blur(8px)',
                                        wordBreak: 'break-word',
                                        fontSize: 12, color: 'var(--text-on-panel)', lineHeight: 1.45,
                                    }}>
                                        {msg.text}
                                    </div>
                                </div>
                            </motion.div>
                        );
                    })}
                </AnimatePresence>
                <div ref={bottomRef} />
            </div>

            {/* Input area */}
            <div style={{
                padding: '8px 10px', borderTop: '1px solid var(--panel-border)',
                display: 'flex', gap: 6, flexShrink: 0,
                background: 'var(--panel-header)',
            }}>
                <input
                    ref={inputRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Say something..."
                    maxLength={300}
                    style={{
                        flex: 1, padding: '8px 12px', borderRadius: 12,
                        border: '1px solid var(--input-border)',
                        background: 'var(--input-bg)',
                        color: 'var(--input-text)',
                        fontSize: 12, outline: 'none',
                    }}
                />
                <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={handleSend}
                    disabled={!input.trim() || sending}
                    style={{
                        width: 32, height: 32, borderRadius: '50%',
                        background: input.trim() ? 'linear-gradient(135deg, #8b5cf6, #581c87)' : 'var(--panel-item-bg)',
                        border: '1px solid var(--panel-border)',
                        cursor: input.trim() ? 'pointer' : 'default',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                        transition: 'all 0.2s ease',
                    }}
                    aria-label="Send message"
                >
                    <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
                        <path d="M1 7h12M7 1l6 6-6 6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                </motion.button>
            </div>
        </div>
    );
}
