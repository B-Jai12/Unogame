'use client';

import { Inter } from 'next/font/google';
import './globals.css';
import FloatingParticles from '@/components/ui/FloatingParticles';
import { useGameStore } from '@/store/useGameStore';
import { useEffect } from 'react';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

function ThemeInitializer() {
  const { theme, setTheme } = useGameStore();

  useEffect(() => {
    // Detect mobile for default theme on first load
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent
    );
    if (isMobile) {
      setTheme('dark');
    }
  }, [setTheme]);

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  return null;
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable}>
      <head>
        <title>UNO Platform</title>
        <meta name="description" content="A premium, real-time UNO multiplayer experience." />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0, viewport-fit=cover" />
      </head>
      <body>
        <ThemeInitializer />
        <FloatingParticles />
        <main className="relative z-10 min-h-screen">
          {children}
        </main>
      </body>
    </html>
  );
}
