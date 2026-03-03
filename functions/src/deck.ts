export type CardColor = 'red' | 'blue' | 'green' | 'yellow' | null;
export type CardType = 'number' | 'skip' | 'reverse' | 'draw2' | 'wild' | 'wild4';

export interface Card {
  id: string;
  type: CardType;
  color: CardColor;
  value: number | null;
}

let idCounter = 0;
function makeId() { return `c${++idCounter}_${Math.random().toString(36).slice(2, 7)}`; }

export function generateDeck(): Card[] {
  idCounter = 0;
  const colors: CardColor[] = ['red', 'blue', 'green', 'yellow'];
  const cards: Card[] = [];

  for (const color of colors) {
    // One 0
    cards.push({ id: makeId(), type: 'number', color, value: 0 });
    // Two of each 1-9
    for (let v = 1; v <= 9; v++) {
      cards.push({ id: makeId(), type: 'number', color, value: v });
      cards.push({ id: makeId(), type: 'number', color, value: v });
    }
    // Two each of Skip, Reverse, Draw2
    for (const type of ['skip', 'reverse', 'draw2'] as CardType[]) {
      cards.push({ id: makeId(), type, color, value: null });
      cards.push({ id: makeId(), type, color, value: null });
    }
  }
  // 4 Wild + 4 Wild4
  for (let i = 0; i < 4; i++) {
    cards.push({ id: makeId(), type: 'wild', color: null, value: null });
    cards.push({ id: makeId(), type: 'wild4', color: null, value: null });
  }
  return cards;
}

export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function cardPoints(card: Card): number {
  if (card.type === 'number') return card.value ?? 0;
  if (['skip', 'reverse', 'draw2'].includes(card.type)) return 20;
  return 50;
}
