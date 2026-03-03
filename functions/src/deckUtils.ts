import { Card, CardColor, CardType } from './types';

// Fisher-Yates shuffle
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function makeId(): string {
  return Math.random().toString(36).slice(2, 9) + Date.now().toString(36);
}

// Generate full 108-card UNO deck
export function generateDeck(): Card[] {
  const colors: CardColor[] = ['red', 'blue', 'green', 'yellow'];
  const cards: Card[] = [];

  for (const color of colors) {
    // 0 (one per color)
    cards.push({ id: makeId(), type: 'number', color, value: 0 });

    // 1-9 (two per color)
    for (let v = 1; v <= 9; v++) {
      cards.push({ id: makeId(), type: 'number', color, value: v });
      cards.push({ id: makeId(), type: 'number', color, value: v });
    }

    // Action cards (two per color each)
    for (const type of ['skip', 'reverse', 'draw2'] as CardType[]) {
      cards.push({ id: makeId(), type, color, value: null });
      cards.push({ id: makeId(), type, color, value: null });
    }
  }

  // 4 Wilds + 4 Wild Draw 4
  for (let i = 0; i < 4; i++) {
    cards.push({ id: makeId(), type: 'wild', color: null, value: null });
    cards.push({ id: makeId(), type: 'wild4', color: null, value: null });
  }

  return shuffle(cards); // 108 cards total
}

export function shuffleDeck(cards: Card[]): Card[] {
  return shuffle(cards);
}

export function getCardScore(card: Card): number {
  if (card.type === 'number') return card.value ?? 0;
  if (card.type === 'skip' || card.type === 'reverse' || card.type === 'draw2') return 20;
  if (card.type === 'wild' || card.type === 'wild4') return 50;
  return 0;
}
