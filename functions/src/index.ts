import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { generateDeck, shuffle, cardPoints, Card, CardColor } from './deck';

admin.initializeApp();
const db = admin.firestore();

// ─── HELPERS ────────────────────────────────────────────────────────────────

function nextIndex(current: number, dir: number, count: number) {
  return ((current + dir) + count) % count;
}

function hasColorCard(hand: Card[], color: string): boolean {
  return hand.some(c => c.color === color);
}

function canPlay(card: Card, currentColor: string, topCard: Card, pending: number): boolean {
  if (pending > 0) return false;
  if (card.type === 'wild' || card.type === 'wild4') return true;
  if (card.color === currentColor) return true;
  if (card.type !== 'number' && card.type === topCard.type) return true;
  if (card.type === 'number' && topCard.type === 'number' && card.value === topCard.value) return true;
  return false;
}

async function withPhaseLock(roomRef: FirebaseFirestore.DocumentReference, fn: (t: FirebaseFirestore.Transaction, room: any) => Promise<void>) {
  await db.runTransaction(async (t) => {
    const snap = await t.get(roomRef);
    const room = snap.data();
    if (!room) throw new Error('Room not found');
    if (room.phaseLock) throw new Error('Room is busy, try again');
    t.update(roomRef, { phaseLock: true });
    await fn(t, room);
  });
}

// ─── JOIN ROOM ───────────────────────────────────────────────────────────────

export const joinRoom = functions.https.onCall(async (data, context) => {
  const uid = context.auth?.uid;
  if (!uid) throw new functions.https.HttpsError('unauthenticated', 'Not signed in');
  const { roomId } = data;
  const roomRef = db.collection('rooms').doc(roomId);
  const userSnap = await db.collection('users').doc(uid).get();
  const username = userSnap.data()?.username || 'Player';

  await db.runTransaction(async (t) => {
    const snap = await t.get(roomRef);
    const room = snap.data();
    if (!room) throw new functions.https.HttpsError('not-found', 'Room not found');
    if (room.status !== 'waiting') throw new functions.https.HttpsError('failed-precondition', 'Game already started');
    if (room.players.length >= 8) throw new functions.https.HttpsError('resource-exhausted', 'Room is full');
    if (room.players.find((p: any) => p.uid === uid)) return; // already in
    const newPlayer = { uid, username, hand: [], score: 0, hasCalledUNO: false, unoEligible: false, lastActionTimestamp: Date.now(), isConnected: true };
    t.update(roomRef, { players: admin.firestore.FieldValue.arrayUnion(newPlayer) });
  });
  return { success: true };
});

// ─── START GAME ──────────────────────────────────────────────────────────────

export const startGame = functions.https.onCall(async (data, context) => {
  const uid = context.auth?.uid;
  if (!uid) throw new functions.https.HttpsError('unauthenticated', 'Not signed in');
  const { roomId } = data;
  const roomRef = db.collection('rooms').doc(roomId);

  await db.runTransaction(async (t) => {
    const snap = await t.get(roomRef);
    const room = snap.data();
    if (!room) throw new functions.https.HttpsError('not-found', 'Room not found');
    if (room.hostId !== uid) throw new functions.https.HttpsError('permission-denied', 'Only host can start');
    if (room.players.length < 2) throw new functions.https.HttpsError('failed-precondition', 'Need at least 2 players');

    let deck = shuffle(generateDeck());
    const players = room.players.map((p: any) => ({ ...p, hand: [], hasCalledUNO: false, unoEligible: false }));

    // Deal 7 cards each
    for (let i = 0; i < 7; i++) {
      for (const p of players) {
        p.hand.push(deck.shift()!);
      }
    }

    // Flip first card; avoid Wild4
    let firstCard: Card;
    do {
      firstCard = deck.shift()!;
      if (firstCard.type === 'wild4') deck.push(firstCard);
    } while (firstCard.type === 'wild4');

    const discardPile: Card[] = [firstCard];
    let direction: number = 1;
    let currentTurnIndex = 0;
    let pendingDrawCount = 0;
    let currentColor = firstCard.color || 'red';

    // Handle first card effects
    if (firstCard.type === 'reverse') {
      if (players.length === 2) {
        currentTurnIndex = nextIndex(0, direction, players.length);
      } else {
        direction = -1;
        currentTurnIndex = nextIndex(0, direction, players.length);
      }
    } else if (firstCard.type === 'skip') {
      currentTurnIndex = nextIndex(0, direction, players.length);
    } else if (firstCard.type === 'draw2') {
      players[0].hand.push(deck.shift()!, deck.shift()!);
      currentTurnIndex = nextIndex(0, direction, players.length);
    } else if (firstCard.type === 'wild') {
      // Random color
      currentColor = ['red', 'blue', 'green', 'yellow'][Math.floor(Math.random() * 4)];
    }

    t.update(roomRef, {
      status: 'playing',
      phaseLock: false,
      direction,
      currentTurnIndex,
      currentColor,
      pendingDrawCount,
      drawPile: deck,
      discardPile,
      players,
      roundNumber: (room.roundNumber || 0) + 1,
    });
  });
  return { success: true };
});

// ─── PLAY CARD ───────────────────────────────────────────────────────────────

export const playCard = functions.https.onCall(async (data, context) => {
  const uid = context.auth?.uid;
  if (!uid) throw new functions.https.HttpsError('unauthenticated', 'Not signed in');
  const { roomId, cardId, chosenColor } = data;
  const roomRef = db.collection('rooms').doc(roomId);

  await db.runTransaction(async (t) => {
    const snap = await t.get(roomRef);
    const room = snap.data();
    if (!room) throw new functions.https.HttpsError('not-found', 'Room not found');
    if (room.phaseLock) throw new functions.https.HttpsError('failed-precondition', 'Room busy');
    if (room.status !== 'playing') throw new functions.https.HttpsError('failed-precondition', 'Game not in play');

    const playerIdx = room.players.findIndex((p: any) => p.uid === uid);
    if (playerIdx === -1) throw new functions.https.HttpsError('not-found', 'Player not in room');
    if (playerIdx !== room.currentTurnIndex) throw new functions.https.HttpsError('failed-precondition', 'Not your turn');

    const players: any[] = JSON.parse(JSON.stringify(room.players));
    const player = players[playerIdx];
    const cardIdx = player.hand.findIndex((c: Card) => c.id === cardId);
    if (cardIdx === -1) throw new functions.https.HttpsError('not-found', 'Card not in hand');

    const card: Card = player.hand[cardIdx];
    const topCard: Card = room.discardPile[room.discardPile.length - 1];

    if (!canPlay(card, room.currentColor, topCard, room.pendingDrawCount)) {
      throw new functions.https.HttpsError('failed-precondition', 'Card cannot be played');
    }

    // Wild4 legality check
    if (card.type === 'wild4' && hasColorCard(player.hand.filter((_: any, i: number) => i !== cardIdx), room.currentColor)) {
      throw new functions.https.HttpsError('failed-precondition', 'You have a matching color card — Wild Draw 4 cannot be played');
    }

    // Remove card from hand
    player.hand.splice(cardIdx, 1);
    player.lastActionTimestamp = Date.now();

    let { direction, currentColor, pendingDrawCount } = room;
    let discardPile: Card[] = [...room.discardPile, card];
    let drawPile: Card[] = [...room.drawPile];
    let count = players.length;
    let nextIdx = nextIndex(playerIdx, direction, count);

    // Set color for wilds
    if (card.type === 'wild' || card.type === 'wild4') {
      currentColor = chosenColor || 'red';
    } else {
      currentColor = card.color || currentColor;
    }

    // UNO eligibility
    player.unoEligible = player.hand.length === 1;
    if (player.hand.length !== 1) { player.hasCalledUNO = false; player.unoEligible = false; }

    let roundEnded = false;
    if (player.hand.length === 0) {
      // Calculate scores
      let roundScore = 0;
      for (const p of players) {
        roundScore += p.hand.reduce((s: number, c: Card) => s + cardPoints(c), 0);
      }
      players[playerIdx].score += roundScore;
      roundEnded = true;
    }

    // Apply card effects
    if (!roundEnded) {
      if (card.type === 'skip') {
        nextIdx = nextIndex(nextIdx, direction, count);
      } else if (card.type === 'reverse') {
        direction = (direction * -1) as 1 | -1;
        if (count === 2) nextIdx = nextIndex(playerIdx, direction, count);
        else nextIdx = nextIndex(playerIdx, direction, count);
      } else if (card.type === 'draw2') {
        pendingDrawCount += 2;
      } else if (card.type === 'wild4') {
        pendingDrawCount += 4;
      }
    }

    // Reshuffle if needed
    if (drawPile.length === 0 && discardPile.length > 1) {
      const top = discardPile.pop()!;
      drawPile = shuffle(discardPile);
      discardPile = [top];
    }

    const newStatus = roundEnded
      ? (players.some((p: any) => p.score >= 500) ? 'matchEnded' : 'roundEnded')
      : 'playing';

    t.update(roomRef, {
      players,
      discardPile,
      drawPile,
      direction,
      currentColor,
      pendingDrawCount,
      currentTurnIndex: roundEnded ? room.currentTurnIndex : nextIdx,
      status: newStatus,
      phaseLock: false,
    });

    // Update user stats on match end
    if (newStatus === 'matchEnded') {
      const sorted = [...players].sort((a, b) => b.score - a.score);
      const winnerId = sorted[0].uid;
      for (const p of players) {
        const ref = db.collection('users').doc(p.uid);
        t.update(ref, {
          totalGames: admin.firestore.FieldValue.increment(1),
          totalPoints: admin.firestore.FieldValue.increment(p.score),
          totalWins: admin.firestore.FieldValue.increment(p.uid === winnerId ? 1 : 0),
          totalLosses: admin.firestore.FieldValue.increment(p.uid !== winnerId ? 1 : 0),
        });
      }
    }
  });
  return { success: true };
});

// ─── DRAW CARD ───────────────────────────────────────────────────────────────

export const drawCard = functions.https.onCall(async (data, context) => {
  const uid = context.auth?.uid;
  if (!uid) throw new functions.https.HttpsError('unauthenticated', 'Not signed in');
  const { roomId } = data;
  const roomRef = db.collection('rooms').doc(roomId);

  await db.runTransaction(async (t) => {
    const snap = await t.get(roomRef);
    const room = snap.data();
    if (!room) throw new functions.https.HttpsError('not-found', 'Room');
    if (room.phaseLock) throw new functions.https.HttpsError('failed-precondition', 'Busy');
    if (room.status !== 'playing') return;

    const playerIdx = room.players.findIndex((p: any) => p.uid === uid);
    if (playerIdx === -1 || playerIdx !== room.currentTurnIndex) throw new functions.https.HttpsError('failed-precondition', 'Not your turn');

    const players: any[] = JSON.parse(JSON.stringify(room.players));
    let drawPile: Card[] = [...room.drawPile];
    let discardPile: Card[] = [...room.discardPile];
    const { direction, currentColor } = room;
    let count = players.length;

    const drawCount = room.pendingDrawCount > 0 ? room.pendingDrawCount : 1;

    // Reshuffle if needed
    if (drawPile.length < drawCount && discardPile.length > 1) {
      const top = discardPile.pop()!;
      drawPile = [...drawPile, ...shuffle(discardPile)];
      discardPile = [top];
    }

    const drawn: Card[] = [];
    for (let i = 0; i < drawCount && drawPile.length > 0; i++) {
      drawn.push(drawPile.shift()!);
    }
    players[playerIdx].hand.push(...drawn);
    players[playerIdx].lastActionTimestamp = Date.now();
    players[playerIdx].unoEligible = false;
    players[playerIdx].hasCalledUNO = false;

    let nextIdx = nextIndex(playerIdx, direction, count);
    let autoPlayed = false;

    // If no pending draw, try to auto-play if only 1 drawn card matches
    if (room.pendingDrawCount === 0 && drawn.length === 1) {
      const drawnCard = drawn[0];
      const topCard: Card = discardPile[discardPile.length - 1];
      if (canPlay(drawnCard, currentColor, topCard, 0)) {
        // Player can play — don't auto-advance, let them decide
        // (AFK auto-play is handled separately; here we just keep it in hand)
      } else {
        // Skip turn
      }
    }

    t.update(roomRef, {
      players,
      drawPile,
      discardPile,
      pendingDrawCount: 0,
      currentTurnIndex: nextIdx,
      phaseLock: false,
    });
  });
  return { success: true };
});

// ─── CALL UNO ────────────────────────────────────────────────────────────────

export const callUno = functions.https.onCall(async (data, context) => {
  const uid = context.auth?.uid;
  if (!uid) throw new functions.https.HttpsError('unauthenticated', 'Not signed in');
  const { roomId } = data;
  const roomRef = db.collection('rooms').doc(roomId);

  await db.runTransaction(async (t) => {
    const snap = await t.get(roomRef);
    const room = snap.data();
    if (!room) return;
    const players: any[] = JSON.parse(JSON.stringify(room.players));
    const p = players.find((x: any) => x.uid === uid);
    if (!p || !p.unoEligible) return;
    p.hasCalledUNO = true;
    p.unoEligible = false;
    t.update(roomRef, { players });
  });
  return { success: true };
});

// ─── CATCH UNO ───────────────────────────────────────────────────────────────

export const catchUno = functions.https.onCall(async (data, context) => {
  const uid = context.auth?.uid;
  if (!uid) throw new functions.https.HttpsError('unauthenticated', 'Not signed in');
  const { roomId, targetUid } = data;
  const roomRef = db.collection('rooms').doc(roomId);

  await db.runTransaction(async (t) => {
    const snap = await t.get(roomRef);
    const room = snap.data();
    if (!room) return;
    const players: any[] = JSON.parse(JSON.stringify(room.players));
    const target = players.find((x: any) => x.uid === targetUid);
    if (!target || target.hasCalledUNO || !target.unoEligible) return;

    let drawPile: Card[] = [...room.drawPile];
    let discardPile: Card[] = [...room.discardPile];
    if (drawPile.length < 2 && discardPile.length > 1) {
      const top = discardPile.pop()!;
      drawPile = [...drawPile, ...shuffle(discardPile)];
      discardPile = [top];
    }
    for (let i = 0; i < 2 && drawPile.length > 0; i++) {
      target.hand.push(drawPile.shift()!);
    }
    target.unoEligible = false;

    t.update(roomRef, { players, drawPile, discardPile });
  });
  return { success: true };
});
