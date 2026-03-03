import { Card, CardColor, CardType } from './types';

export function getCardDisplayColor(color: CardColor): string {
  const map: Record<string, string> = {
    red: '#ef4444',
    blue: '#3b82f6',
    green: '#22c55e',
    yellow: '#eab308',
  };
  return color ? map[color] : '#7c3aed';
}

export function getCardPoints(card: Card): number {
  if (card.type === 'number') return card.value ?? 0;
  if (['skip','reverse','draw2'].includes(card.type)) return 20;
  if (['wild','wild4'].includes(card.type)) return 50;
  return 0;
}

export function canPlayCard(card: Card, currentColor: string, topCard: Card, pendingDrawCount: number): boolean {
  if (pendingDrawCount > 0) return false;
  if (card.type === 'wild' || card.type === 'wild4') return true;
  if (card.color === currentColor) return true;
  if (card.type === topCard.type && card.type !== 'number') return true;
  if (card.type === 'number' && topCard.type === 'number' && card.value === topCard.value) return true;
  return false;
}

export function formatRoomCode(code: string): string {
  return code.toUpperCase().slice(0, 6);
}

export const COLOR_OPTIONS: CardColor[] = ['red', 'blue', 'green', 'yellow'];
