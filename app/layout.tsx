import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import FloatingParticles from '@/components/ui/FloatingParticles';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata: Metadata = {
  title: 'UNO — Premium Multiplayer Card Game',
  description: 'A premium, real-time multiplayer UNO web application.',
  keywords: ['UNO', 'card game', 'multiplayer', 'real-time'],
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
    viewportFit: 'cover',
  },
  themeColor: '#c8a2ff',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable}>
      <body>
        <FloatingParticles />
        <main className="relative z-10 min-h-screen">
          {children}
        </main>
      </body>
    </html>
  );
}
