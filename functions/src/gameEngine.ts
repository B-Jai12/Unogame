import { Room, Player, Card, CardColor } from './types';
import { generateDeck, shuffleDeck, getCardScore } from './deckUtils';
import { isCardPlayable, calculateRoundScore } from './validators';

// ─── Turn formula ─────────────────────────────────────────────────────────────
export function nextTurnIndex(current: number, direction: number, playerCount: number): number {
  return ((current + direction) % playerCount + playerCount) % playerCount;
}

// ─── Draw pile refill ─────────────────────────────────────────────────────────
export function refillDrawPile(room: Room): void {
  if (room.drawPile.length > 0) return;
  const top = room.discardPile.pop()!;
  room.drawPile = shuffleDeck(room.discardPile);
  room.discardPile = [top];
}

// ─── Draw N cards from pile to player ─────────────────────────────────────────
export function drawCards(room: Room, playerIndex: number, count: number): void {
  for (let i = 0; i < count; i++) {
    refillDrawPile(room);
    if (room.drawPile.length === 0) break;
    const card = room.drawPile.pop()!;
    room.players[playerIndex].hand.push(card);
  }
}

// ─── Game initialization ──────────────────────────────────────────────────────
export function initializeRound(room: Room): void {
  const deck = generateDeck();
  room.drawPile = deck;
  room.discardPile = [];
  room.pendingDrawCount = 0;
  room.direction = 1;
  room.currentTurnIndex = 0;

  // Reset player hands
  room.players.forEach((p) => {
    p.hand = [];
    p.hasCalledUNO = false;
    p.unoEligible = false;
    p.lastActionTimestamp = Date.now();
  });

  // Deal 7 cards per player
  for (let i = 0; i < 7; i++) {
    for (let j = 0; j < room.players.length; j++) {
      const card = room.drawPile.pop()!;
      room.players[j].hand.push(card);
    }
  }

  // Flip first card — handle special cases
  let firstCard = room.drawPile.pop()!;

  // If Wild4, reshuffle and redraw
  while (firstCard.type === 'wild4') {
    room.drawPile.unshift(firstCard);
    room.drawPile = shuffleDeck(room.drawPile);
    firstCard = room.drawPile.pop()!;
  }

  room.discardPile.push(firstCard);
  room.currentColor = firstCard.color ?? 'red';

  // Apply first card effects
  if (firstCard.type === 'draw2') {
    // First player draws 2 and is skipped
    drawCards(room, 0, 2);
    room.currentTurnIndex = nextTurnIndex(0, room.direction, room.players.length);
  } else if (firstCard.type === 'reverse') {
    if (room.players.length === 2) {
      // Acts as skip
      room.currentTurnIndex = nextTurnIndex(0, room.direction, room.players.length);
    } else {
      room.direction = -1;
      room.currentTurnIndex = nextTurnIndex(0, room.direction, room.players.length);
    }
  } else if (firstCard.type === 'skip') {
    room.currentTurnIndex = nextTurnIndex(0, room.direction, room.players.length);
  }
}

// ─── Apply card effects and advance turn ──────────────────────────────────────
export interface PlayResult {
  roundWinner: string | null;
  matchWinner: string | null;
}

export function applyCardPlay(
  room: Room,
  playerIndex: number,
  card: Card,
  chosenColor: CardColor | null
): PlayResult {
  const playerCount = room.players.length;
  const player = room.players[playerIndex];

  // Remove card from hand
  player.hand = player.hand.filter((c) => c.id !== card.id);
  room.discardPile.push(card);
  player.lastActionTimestamp = Date.now();

  // Update UNO state
  if (player.hand.length === 1) {
    player.unoEligible = true;
    player.hasCalledUNO = false;
  } else if (player.hand.length === 0) {
    player.unoEligible = false;
    player.hasCalledUNO = false;
  } else {
    player.unoEligible = false;
  }

  // Apply color choice for wilds
  if (chosenColor && (card.type === 'wild' || card.type === 'wild4')) {
    room.currentColor = chosenColor;
  } else if (card.color) {
    room.currentColor = card.color;
  }

  // Special effects
  let skipExtra = false;
  if (card.type === 'skip') {
    skipExtra = true;
  } else if (card.type === 'reverse') {
    room.direction *= -1;
    if (playerCount === 2) skipExtra = true;
  } else if (card.type === 'draw2') {
    room.pendingDrawCount += 2;
    skipExtra = true;
  } else if (card.type === 'wild4') {
    room.pendingDrawCount += 4;
    skipExtra = true;
  }

  // Advance turn
  room.currentTurnIndex = nextTurnIndex(playerIndex, room.direction, playerCount);
  if (skipExtra) {
    room.currentTurnIndex = nextTurnIndex(room.currentTurnIndex, room.direction, playerCount);
  }

  // Check round end
  if (player.hand.length === 0) {
    const opponentHands = room.players
      .filter((p) => p.uid !== player.uid)
      .map((p) => p.hand);
    const roundScore = calculateRoundScore(opponentHands);
    player.score += roundScore;
    room.status = 'roundEnded';

    // Check match end
    if (player.score >= 500) {
      room.status = 'matchEnded';
      return { roundWinner: player.uid, matchWinner: player.uid };
    }
    return { roundWinner: player.uid, matchWinner: null };
  }

  return { roundWinner: null, matchWinner: null };
}

// ─── Handle pending draw (player must draw) ───────────────────────────────────
export function applyPendingDraw(room: Room, playerIndex: number): void {
  drawCards(room, playerIndex, room.pendingDrawCount);
  room.pendingDrawCount = 0;
  room.players[playerIndex].lastActionTimestamp = Date.now();
  room.currentTurnIndex = nextTurnIndex(playerIndex, room.direction, room.players.length);
}

// ─── Auto-draw (AFK) ─────────────────────────────────────────────────────────
export function applyAfkDraw(room: Room, playerIndex: number): void {
  if (room.pendingDrawCount > 0) {
    applyPendingDraw(room, playerIndex);
    return;
  }
  refillDrawPile(room);
  if (room.drawPile.length === 0) {
    room.currentTurnIndex = nextTurnIndex(playerIndex, room.direction, room.players.length);
    return;
  }
  const card = room.drawPile.pop()!;
  room.players[playerIndex].hand.push(card);
  room.players[playerIndex].lastActionTimestamp = Date.now();

  // Try auto-play
  const top = room.discardPile.at(-1);
  if (isCardPlayable(card, top, room.currentColor, room.players[playerIndex].hand, 0)) {
    applyCardPlay(room, playerIndex, card, card.color);
  } else {
    room.currentTurnIndex = nextTurnIndex(playerIndex, room.direction, room.players.length);
  }
}
