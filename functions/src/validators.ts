import { Card, CardColor } from './types';

// Check if a card can be played given the current state
export function isCardPlayable(
  card: Card,
  topCard: Card | undefined,
  currentColor: string,
  playerHand: Card[],
  pendingDrawCount: number
): boolean {
  // If there is a pending draw, player cannot play
  if (pendingDrawCount > 0) return false;
  if (!topCard) return true;

  if (card.type === 'wild') return true;

  if (card.type === 'wild4') {
    // Wild4 only legal if player has no card matching current color
    const hasMatchingColor = playerHand.some(
      (c) => c.color === currentColor && c.id !== card.id
    );
    return !hasMatchingColor;
  }

  // Same color
  if (card.color !== null && card.color === currentColor) return true;

  // Same type (action) or same number
  if (card.type !== 'number' && card.type === topCard.type) return true;
  if (card.type === 'number' && topCard.type === 'number' && card.value === topCard.value) return true;

  return false;
}

// Calculate score for a set of cards remaining in opponents' hands
export function calculateRoundScore(hands: Card[][]): number {
  return hands.flat().reduce((sum, card) => {
    if (card.type === 'number') return sum + (card.value ?? 0);
    if (['skip', 'reverse', 'draw2'].includes(card.type)) return sum + 20;
    if (['wild', 'wild4'].includes(card.type)) return sum + 50;
    return sum;
  }, 0);
}
