'use client';
import { useState, useEffect } from 'react';

interface Particle {
  x: number;
  y: number;
  size: number;
  speed: number;
  opacity: number;
  delay: number;
}

const PARTICLE_CONFIG: Particle[] = Array.from({ length: 18 }, (_, i) => ({
  x: Math.random() * 100,
  y: Math.random() * 100,
  size: 4 + Math.random() * 16,
  speed: 6 + Math.random() * 10,
  opacity: 0.06 + Math.random() * 0.14,
  delay: Math.random() * -14,
}));

export default function FloatingParticles() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-0" aria-hidden="true">
      {PARTICLE_CONFIG.map((p, i) => (
        <div
          key={i}
          className="floating-particle absolute rounded-full"
          style={{
            left: `${p.x}%`,
            width: p.size,
            height: p.size,
            background: i % 3 === 0
              ? 'rgba(255,255,255,0.18)'
              : i % 3 === 1
                ? 'rgba(200,162,255,0.20)'
                : 'rgba(255,158,203,0.18)',
            animationDuration: `${p.speed}s`,
            animationDelay: `${p.delay}s`,
            opacity: p.opacity,
          }}
        />
      ))}
    </div>
  );
}
