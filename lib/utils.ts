import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { Card } from './types';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getCardLabel(card: Card): string {
  if (card.type === 'number') return String(card.value);
  if (card.type === 'wild') return 'Wild';
  if (card.type === 'wild4') return '+4';
  if (card.type === 'draw2') return '+2';
  if (card.type === 'skip') return 'Skip';
  if (card.type === 'reverse') return 'Rev';
  return '';
}

export function getCardScore(card: Card): number {
  if (card.type === 'number') return card.value ?? 0;
  if (card.type === 'skip' || card.type === 'reverse' || card.type === 'draw2') return 20;
  if (card.type === 'wild' || card.type === 'wild4') return 50;
  return 0;
}

export function generateRoomId(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return result;
}

export function getColorClass(color: string | null): string {
  switch (color) {
    case 'red': return 'bg-red-500';
    case 'blue': return 'bg-blue-500';
    case 'green': return 'bg-green-500';
    case 'yellow': return 'bg-yellow-400';
    default: return 'bg-gradient-to-br from-pink-400 to-purple-500';
  }
}

export function getColorHex(color: string | null): string {
  switch (color) {
    case 'red': return '#ef4444';
    case 'blue': return '#3b82f6';
    case 'green': return '#22c55e';
    case 'yellow': return '#facc15';
    default: return '#a87bff';
  }
}

export function formatTimestamp(ts: number): string {
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}
