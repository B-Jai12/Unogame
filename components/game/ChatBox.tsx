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

// Stable player color based on name initial
const NAME_COLORS = ['#ff9ecb', '#8da9ff', '#8dffb3', '#ffe38d', '#c8a2ff', '#ff8da1'];
function nameColor(name: string) {
    const idx = (name.charCodeAt(0) ?? 0) % NAME_COLORS.length;
    return NAME_COLORS[idx];
}

function toTitleCase(s: string) {
    return s.charAt(0).toUpperCase() + s.slice(1);
}

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
        setSending(true);
        setInput('');
        try {
            await addDoc(collection(db, 'rooms', roomId, 'messages'), {
                senderId: currentUid,
                senderName: user.displayName ?? 'Player',
                text, createdAt: serverTimestamp(), isSystem: false,
            });
        } catch { setInput(text); }
        finally { setSending(false); inputRef.current?.focus(); }
    }, [input, sending, currentUid, roomId]);

    const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>

            {/* Header */}
            <div style={{
                padding: '12px 14px 10px',
                borderBottom: '1px solid rgba(255,255,255,0.15)',
                flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
                <p style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.8)' }}>
                    Chat
                </p>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#4ade80', boxShadow: '0 0 6px #4ade80' }} />
            </div>

            {/* Message list */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '10px 10px 4px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                <AnimatePresence initial={false}>
                    {messages.length === 0 && (
                        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', textAlign: 'center', fontStyle: 'italic' }}>
                                No messages yet
                            </p>
                        </div>
                    )}
                    {messages.map((msg) => {
                        const isMine = msg.senderId === currentUid;

                        // System messages (game events)
                        if (msg.isSystem || msg.senderId === 'system') {
                            return (
                                <motion.div
                                    key={msg.id}
                                    initial={{ opacity: 0, y: 4 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    style={{ textAlign: 'center', padding: '2px 8px' }}
                                >
                                    <span style={{
                                        fontSize: 10, fontStyle: 'italic', color: 'rgba(255,255,255,0.42)',
                                        background: 'rgba(255,255,255,0.06)', borderRadius: 99,
                                        padding: '2px 10px', border: '1px solid rgba(255,255,255,0.1)',
                                    }}>
                                        {msg.text}
                                    </span>
                                </motion.div>
                            );
                        }

                        // Player messages
                        const accent = nameColor(msg.senderName);
                        return (
                            <motion.div
                                key={msg.id}
                                initial={{ opacity: 0, y: 8, scale: 0.95 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                transition={{ type: 'spring', stiffness: 340, damping: 28 }}
                                style={{ display: 'flex', flexDirection: isMine ? 'row-reverse' : 'row', alignItems: 'flex-end', gap: 6 }}
                            >
                                {/* Avatar (others only) */}
                                {!isMine && (
                                    <div style={{
                                        width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
                                        background: `linear-gradient(135deg, ${accent}, #a87bff)`,
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        fontSize: 8, fontWeight: 800, color: 'white',
                                        border: '1.5px solid rgba(255,255,255,0.4)',
                                    }}>
                                        {msg.senderName.charAt(0).toUpperCase()}
                                    </div>
                                )}

                                <div style={{ maxWidth: '75%', display: 'flex', flexDirection: 'column', alignItems: isMine ? 'flex-end' : 'flex-start', gap: 2 }}>
                                    {/* Sender name */}
                                    {!isMine && (
                                        <span style={{ fontSize: 9, fontWeight: 700, color: accent, paddingLeft: 4, opacity: 0.9 }}>
                                            {toTitleCase(msg.senderName)}
                                        </span>
                                    )}
                                    {/* Bubble */}
                                    <div style={{
                                        padding: '7px 11px',
                                        borderRadius: isMine ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                                        background: isMine
                                            ? 'linear-gradient(135deg, rgba(255,158,203,0.65), rgba(168,123,255,0.55))'
                                            : 'rgba(255,255,255,0.14)',
                                        border: isMine ? '1px solid rgba(255,158,203,0.4)' : '1px solid rgba(255,255,255,0.2)',
                                        backdropFilter: 'blur(8px)',
                                        wordBreak: 'break-word',
                                        fontSize: 12, color: 'rgba(255,255,255,0.97)', lineHeight: 1.45,
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
                padding: '8px 10px', borderTop: '1px solid rgba(255,255,255,0.15)',
                display: 'flex', gap: 6, flexShrink: 0,
                background: 'rgba(255,255,255,0.04)',
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
                        border: '1.5px solid rgba(255,255,255,0.28)',
                        background: 'rgba(255,255,255,0.12)',
                        backdropFilter: 'blur(8px)', color: 'white', fontSize: 12, outline: 'none',
                    }}
                />
                <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={handleSend}
                    disabled={!input.trim() || sending}
                    style={{
                        width: 34, height: 34, borderRadius: '50%',
                        background: input.trim() ? 'linear-gradient(135deg, #ff9ecb, #a87bff)' : 'rgba(255,255,255,0.1)',
                        border: '1.5px solid rgba(255,255,255,0.3)',
                        cursor: input.trim() ? 'pointer' : 'default',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                        boxShadow: input.trim() ? '0 4px 12px rgba(168,123,255,0.4)' : 'none',
                        transition: 'all 0.2s ease',
                    }}
                    aria-label="Send message"
                >
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                        <path d="M1 7h12M7 1l6 6-6 6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                </motion.button>
            </div>
        </div>
    );
}
