export type CardType = 'number' | 'skip' | 'reverse' | 'draw2' | 'wild' | 'wild4';
export type CardColor = 'red' | 'blue' | 'green' | 'yellow' | null;

export interface Card {
  id: string;
  type: CardType;
  color: CardColor;
  value: number | null;
}

export interface Player {
  uid: string;
  username: string;
  hand: Card[];
  score: number;
  hasCalledUNO: boolean;
  unoEligible: boolean;
  lastActionTimestamp: number;
  isConnected: boolean;
}

export type RoomStatus = 'waiting' | 'dealing' | 'playing' | 'resolving' | 'roundEnded' | 'matchEnded';

export interface Room {
  hostId: string;
  status: RoomStatus;
  phaseLock: boolean;
  direction: 1 | -1;
  currentTurnIndex: number;
  currentColor: string;
  pendingDrawCount: number;
  players: Player[];
  drawPile: Card[];
  discardPile: Card[];
  roundNumber: number;
  createdAt: number;
}
