'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const EMOTES = ['😍', '😏', '😡', '😈', '😎'];

interface EmotePickerProps {
    onSelect: (emote: string) => void;
}

export default function EmotePicker({ onSelect }: EmotePickerProps) {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div className="relative">
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.8, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.8, y: 10 }}
                        style={{
                            position: 'absolute',
                            bottom: 'calc(100% + 12px)',
                            left: '50%',
                            transform: 'translateX(-50%)',
                            display: 'flex',
                            gap: 8,
                            padding: '10px 14px',
                            background: 'var(--panel-bg)',
                            backdropFilter: 'blur(20px)',
                            WebkitBackdropFilter: 'blur(20px)',
                            borderRadius: 20,
                            border: '1px solid var(--panel-border)',
                            boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
                            zIndex: 50,
                            whiteSpace: 'nowrap',
                        }}
                    >
                        {EMOTES.map((emote) => (
                            <motion.button
                                key={emote}
                                whileHover={{ scale: 1.3, y: -4 }}
                                whileTap={{ scale: 0.9 }}
                                onClick={() => {
                                    onSelect(emote);
                                    setIsOpen(false);
                                }}
                                style={{
                                    fontSize: 24,
                                    lineHeight: 1,
                                    background: 'none',
                                    border: 'none',
                                    cursor: 'pointer',
                                    padding: '2px 4px',
                                    borderRadius: 8,
                                    transition: 'background 0.15s',
                                    minHeight: 36,
                                    minWidth: 36,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                }}
                                onMouseEnter={e => (e.currentTarget.style.background = 'var(--panel-item-bg)')}
                                onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                            >
                                {emote}
                            </motion.button>
                        ))}

                        {/* Arrow */}
                        <div style={{
                            position: 'absolute',
                            top: '100%',
                            left: '50%',
                            transform: 'translateX(-50%)',
                            width: 0,
                            height: 0,
                            borderLeft: '8px solid transparent',
                            borderRight: '8px solid transparent',
                            borderTop: '8px solid var(--panel-bg)',
                            marginTop: -1,
                        }} />
                    </motion.div>
                )}
            </AnimatePresence>

            <motion.button
                whileHover={{ scale: 1.06 }}
                whileTap={{ scale: 0.93 }}
                onClick={() => setIsOpen(!isOpen)}
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '8px 18px',
                    borderRadius: 99,
                    background: isOpen
                        ? 'linear-gradient(135deg, #f472b6, #a78bfa)'
                        : 'linear-gradient(135deg, rgba(244,114,182,0.25), rgba(167,139,250,0.25))',
                    backdropFilter: 'blur(12px)',
                    WebkitBackdropFilter: 'blur(12px)',
                    border: '1.5px solid rgba(244,114,182,0.45)',
                    color: isOpen ? 'white' : 'var(--text-primary)',
                    fontWeight: 700,
                    fontSize: 13,
                    cursor: 'pointer',
                    boxShadow: isOpen
                        ? '0 0 18px rgba(244,114,182,0.5)'
                        : '0 2px 8px rgba(0,0,0,0.10)',
                    transition: 'all 0.2s ease',
                    minHeight: 38,
                    letterSpacing: '0.01em',
                }}
            >
                <motion.span
                    animate={{ rotate: isOpen ? [0, -10, 10, 0] : 0 }}
                    transition={{ duration: 0.4 }}
                    style={{ fontSize: 18, lineHeight: 1 }}
                >
                    {isOpen ? '✕' : '😊'}
                </motion.span>
                <span>React</span>
            </motion.button>
        </div>
    );
}
