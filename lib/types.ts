// ─── Card ─────────────────────────────────────────────────────────────────────
export type CardColor = 'red' | 'blue' | 'green' | 'yellow' | null;
export type CardType = 'number' | 'skip' | 'reverse' | 'draw2' | 'wild' | 'wild4';

export interface Card {
  id: string;
  type: CardType;
  color: CardColor;
  /** Face value for number cards; null for action/wild cards */
  value: number | null;
}

// ─── Player ───────────────────────────────────────────────────────────────────
export interface Player {
  uid: string;
  username: string;
  hand: Card[];
  /** Round score (accumulated from opponent hands) */
  roundScore: number;
  /** Total match score across all rounds */
  matchScore: number;
  hasCalledUNO: boolean;
  /** Timestamp when UNO was called (ms) — used for catch-penalty window */
  unoCallTimestamp: number | null;
  /** True when player has exactly 1 card and has NOT called UNO yet */
  unoEligible: boolean;
  /** Timestamp (ms) when player first became UNO-eligible (reached 1 card) */
  unoEligibleTimestamp: number | null;
  /** Timestamp of last action — used for AFK (30s) and disconnect (60s) detection */
  lastActionTimestamp: number;
  isConnected: boolean;
  /** Milliseconds since last seen online (set by host engine) */
  disconnectTimestamp: number | null;
  /** Flags if the player has drawn a card during the current turn (one-draw-per-turn rule) */
  hasDrawnThisTurn?: boolean;
}

// ─── Room ─────────────────────────────────────────────────────────────────────
export type RoomStatus =
  | 'waiting'
  | 'dealing'
  | 'playing'
  | 'resolving'
  | 'roundEnded'
  | 'matchEnded';

export interface Room {
  id?: string;
  hostId: string;
  status: RoomStatus;
  /** Prevents re-entrant transactions while host is processing */
  phaseLock: boolean;
  /** 1 = clockwise, -1 = counter-clockwise */
  direction: 1 | -1;
  currentTurnIndex: number;
  /** Active color (changes when Wild is played) */
  currentColor: string;
  /** Cards pending to be drawn due to a Draw2 or Wild4 chain */
  pendingDrawCount: number;
  players: Player[];
  /** List of all player UIDs for Firestore security rule checks */
  playerIds: string[];
  drawPile: Card[];
  discardPile: Card[];
  roundNumber: number;
  createdAt: number;
  /** Match ends when any player hits this score (500) */
  matchWinScore: number;
  /** UID of the overall match winner, set when status = matchEnded */
  matchWinnerId: string | null;
  /** UID of the current round winner */
  roundWinnerId: string | null;
  /** Timestamp (ms) when the current turn started — used for visual timer */
  turnStartTime?: number;
  /** Last emote sent in the room for floating UI effects */
  lastEmote?: {
    uid: string;
    emote: string;
    timestamp: number;
  } | null;
}

// ─── Action Requests (Host-Authoritative Engine) ───────────────────────────────
export type ActionType =
  | 'START_GAME'
  | 'PLAY_CARD'
  | 'DRAW_CARD'
  | 'CALL_UNO'
  | 'CATCH_UNO'
  | 'NEXT_ROUND'
  | 'PASS_TURN'
  | 'EMOTE'
  | 'LEAVE_ROOM';

export interface ActionRequest {
  id?: string;
  type: ActionType;
  senderId: string;
  timestamp: number;
  payload: Record<string, unknown>;
  processed?: boolean;
}

// ─── Chat ─────────────────────────────────────────────────────────────────────
export interface ChatMessage {
  id?: string;
  senderId: string;
  senderName: string;
  text: string;
  createdAt: number;
}

// ─── User Profile ─────────────────────────────────────────────────────────────
export interface UserProfile {
  uid: string;
  username: string;
  email: string;
  photoURL: string;
  totalWins: number;
  totalLosses: number;
  totalGames: number;
  totalPoints: number;
  createdAt: number;
}

/** Legacy alias */
export type User = UserProfile;
