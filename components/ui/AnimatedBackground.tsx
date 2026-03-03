'use client';
import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';

interface Particle {
  id: number;
  x: number;
  size: number;
  duration: number;
  delay: number;
  color: string;
}

const COLORS = [
  'rgba(255,158,203,0.25)',
  'rgba(200,162,255,0.2)',
  'rgba(168,123,255,0.2)',
  'rgba(255,179,217,0.2)',
];

export default function AnimatedBackground() {
  const particles: Particle[] = Array.from({ length: 20 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    size: Math.random() * 60 + 20,
    duration: Math.random() * 15 + 10,
    delay: Math.random() * 10,
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
  }));

  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
      {/* SVG wave layers */}
      <div className="absolute bottom-0 left-0 right-0">
        <svg
          viewBox="0 0 1440 200"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full"
          style={{ opacity: 0.15 }}
        >
          <motion.path
            d="M0,100 C360,160 720,40 1080,100 C1260,130 1380,80 1440,100 L1440,200 L0,200 Z"
            fill="white"
            animate={{
              d: [
                'M0,100 C360,160 720,40 1080,100 C1260,130 1380,80 1440,100 L1440,200 L0,200 Z',
                'M0,120 C360,60 720,160 1080,120 C1260,100 1380,140 1440,120 L1440,200 L0,200 Z',
                'M0,100 C360,160 720,40 1080,100 C1260,130 1380,80 1440,100 L1440,200 L0,200 Z',
              ],
            }}
            transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
          />
        </svg>
      </div>

      {/* Floating particles */}
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className="absolute rounded-full"
          style={{
            left: `${p.x}%`,
            bottom: '-60px',
            width: p.size,
            height: p.size,
            background: p.color,
          }}
          animate={{ y: [0, -window?.innerHeight - 100 || -900], opacity: [0, 0.3, 0.3, 0] }}
          transition={{
            duration: p.duration,
            delay: p.delay,
            repeat: Infinity,
            ease: 'linear',
          }}
        />
      ))}
    </div>
  );
}
