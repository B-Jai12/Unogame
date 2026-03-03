/**
 * lib/engine.ts
 *
 * Pure game logic for the UNO Host-Authoritative Client Engine.
 *
 * All functions are:
 *   - Deterministic: given the same inputs they return the same outputs.
 *   - Side-effect free: no Firestore writes, no React state, no timers.
 *   - Immutable: input objects are never mutated; new objects are returned.
 *
 * The host engine (lib/hostEngine.ts) calls these functions inside Firestore
 * Transactions to ensure atomicity across concurrent client requests.
 */

import { Card, CardColor, CardType, Player, Room } from './types';

// ---------------------------------------------------------------------------
// 1. Generate Deck
// ---------------------------------------------------------------------------

const COLORS: CardColor[] = ['red', 'blue', 'green', 'yellow'];

/**
 * Number card distribution per color:
 *   - One 0
 *   - Two each of 1 through 9  (18 cards)
 * Total per color: 19 number cards
 */
const NUMBER_VALUES: number[] = [
    0,
    1, 1,
    2, 2,
    3, 3,
    4, 4,
    5, 5,
    6, 6,
    7, 7,
    8, 8,
    9, 9,
];

/** Action card types that appear twice per color. */
const ACTION_TYPES: Extract<CardType, 'skip' | 'reverse' | 'draw2'>[] = [
    'skip',
    'reverse',
    'draw2',
];

/**
 * Counter isolated to this module. Scoped to a single generateDeck() call
 * via the reset at the top of that function, so IDs are deterministically
 * ordered within each generated deck.
 */
let _idSeq = 0;

function makeCardId(label: string): string {
    return `${label}_${++_idSeq}_${Math.random().toString(36).slice(2, 7)}`;
}

/**
 * generateDeck()
 *
 * Returns a full, unshuffled 108-card UNO deck.
 *
 * Composition:
 *   - 4 colors × 19 number cards  = 76
 *   - 4 colors × 3 action types × 2 = 24
 *   - 4 Wild cards
 *   - 4 Wild Draw Four cards
 *   Total: 76 + 24 + 4 + 4 = 108 cards
 */
export function generateDeck(): Card[] {
    _idSeq = 0;
    const deck: Card[] = [];

    for (const color of COLORS) {
        // Number cards
        for (const value of NUMBER_VALUES) {
            deck.push({
                id: makeCardId(`${color}_${value}`),
                type: 'number',
                color,
                value,
            });
        }
        // Action cards — 2 of each type per color
        for (const type of ACTION_TYPES) {
            deck.push({ id: makeCardId(`${color}_${type}_a`), type, color, value: null });
            deck.push({ id: makeCardId(`${color}_${type}_b`), type, color, value: null });
        }
    }

    // Wild cards
    for (let i = 0; i < 4; i++) {
        deck.push({ id: makeCardId(`wild_${i}`), type: 'wild', color: null, value: null });
        deck.push({ id: makeCardId(`wild4_${i}`), type: 'wild4', color: null, value: null });
    }

    return deck;
}

// ---------------------------------------------------------------------------
// 2. Shuffle Deck
// ---------------------------------------------------------------------------

/**
 * shuffleDeck<T>(deck: T[]): T[]
 *
 * Implements the Fisher-Yates (Knuth) shuffle algorithm.
 * Returns a new array — the original is not mutated.
 *
 * Time complexity: O(n)
 * Space complexity: O(n) — the spread creates a copy
 */
export function shuffleDeck<T>(deck: T[]): T[] {
    const arr = [...deck];
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        // Swap elements at i and j via destructured assignment.
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

// ---------------------------------------------------------------------------
// 3. Deal Cards
// ---------------------------------------------------------------------------

/**
 * dealCards(room: Room): Room
 *
 * Generates a fresh shuffled deck, deals 7 cards to every player in the room,
 * and places a valid starting card on the discard pile (re-draws until a
 * non-Wild4 card is found).
 *
 * Returns a new Room with status 'playing', a fully populated draw pile,
 * discard pile, and player hands.
 */
export function dealCards(room: Room): Room {
    let deck = shuffleDeck(generateDeck());
    const HAND_SIZE = 5;

    // Reset all player hands.
    const players: Player[] = room.players.map((p) => ({ ...p, hand: [] as Card[] }));

    // Deal round-robin: card 1 to each player, card 2 to each player, etc.
    for (let round = 0; round < HAND_SIZE; round++) {
        for (const player of players) {
            const card = deck.shift();
            if (!card) throw new Error('Deck exhausted during deal — this should never happen.');
            player.hand.push(card);
        }
    }

    // Flip top card for the discard pile.
    // Wild Draw Four is not a valid starting card per official UNO rules.
    let topCard: Card;
    do {
        if (deck.length === 0) deck = shuffleDeck(generateDeck());
        topCard = deck.shift()!;
    } while (topCard.type === 'wild4');

    return {
        ...room,
        players,
        drawPile: deck,
        discardPile: [topCard],
        currentColor: topCard.color ?? 'red',
        pendingDrawCount: 0,
        direction: 1,
        currentTurnIndex: 0,
        status: 'playing',
    };
}

// ---------------------------------------------------------------------------
// 4. Validate Play
// ---------------------------------------------------------------------------

/**
 * validatePlay(playedCard: Card, topCard: Card, currentColor: string): boolean
 *
 * Returns true if `playedCard` is a legal play given the discard pile top card
 * and the current active color (which may differ from topCard.color when a
 * previous Wild was played).
 *
 * Rules:
 *   - Wild and Wild Draw Four are always playable (unless stacking is pending).
 *   - Any card matching the current active color is playable.
 *   - Any action card (skip, reverse, draw2) matching the top card's type is
 *     playable regardless of color.
 *   - A number card matching the top card's number value is playable.
 *
 * Note: Pending draw stacking is handled by the caller (applyPlay) because it
 * requires room-level context. This function evaluates only card compatibility.
 */
export function validatePlay(
    playedCard: Card,
    topCard: Card,
    currentColor: string,
): boolean {
    // Wilds are always valid plays.
    if (playedCard.type === 'wild' || playedCard.type === 'wild4') {
        return true;
    }

    // Color match against the active color.
    if (playedCard.color === currentColor) {
        return true;
    }

    // Same action type match (e.g., Skip on Skip regardless of color).
    if (
        playedCard.type !== 'number' &&
        topCard.type !== 'number' &&
        playedCard.type === topCard.type
    ) {
        return true;
    }

    // Same number value match.
    if (
        playedCard.type === 'number' &&
        topCard.type === 'number' &&
        playedCard.value === topCard.value
    ) {
        return true;
    }

    return false;
}

// ---------------------------------------------------------------------------
// 5. Calculate Next Turn
// ---------------------------------------------------------------------------

/**
 * calculateNextTurn(
 *   currentIndex: number,
 *   direction:    number,
 *   playerCount:  number,
 * ): number
 *
 * Returns the index of the next player, correctly wrapping in both clockwise
 * (direction = 1) and counter-clockwise (direction = -1) directions.
 *
 * Handles arbitrary skip amounts for chained effects:
 *   - Pass skipCount = 1 when a Skip or a 2-player Reverse is played.
 *
 * Implementation uses the standard modular arithmetic pattern that avoids
 * negative modulo results in JavaScript:
 *   ((n % m) + m) % m
 */
export function calculateNextTurn(
    currentIndex: number,
    direction: number,
    playerCount: number,
    skipCount: number = 0,
): number {
    const steps = direction * (1 + skipCount);
    return ((currentIndex + steps) % playerCount + playerCount) % playerCount;
}

// ---------------------------------------------------------------------------
// 6. Replenish Draw Pile
// ---------------------------------------------------------------------------

/**
 * replenishDrawPile(room: Room): Room
 *
 * When the draw pile is empty, takes all cards from the discard pile except
 * the top card, shuffles them, and uses them as the new draw pile.
 *
 * Returns the room unchanged if the draw pile already has cards.
 */
export function replenishDrawPile(room: Room): Room {
    if (room.drawPile.length > 0) return room;

    const discard = [...room.discardPile];
    const topCard = discard.pop()!;
    // Strip chosen wild colors when recycling to avoid color bias.
    const recycled = discard.map((c) =>
        c.type === 'wild' || c.type === 'wild4' ? { ...c, color: null as CardColor | null } : c,
    );
    const newDrawPile = shuffleDeck(recycled);

    return { ...room, drawPile: newDrawPile, discardPile: [topCard] };
}

// ---------------------------------------------------------------------------
// 7. Apply Play Card
// ---------------------------------------------------------------------------

/**
 * applyPlay(room, playerId, cardId, chosenColor?): { room; error? }
 *
 * Validates and applies a card play within the room state.
 * Returns a derived Room on success, or an error string on failure.
 *
 * Side effects modelled:
 *   - Remove card from player's hand.
 *   - Add card to discard pile (with chosen color applied for wilds).
 *   - Update direction (Reverse), skip next player (Skip / 2-player Reverse).
 *   - Set pendingDrawCount (Draw 2 / Wild Draw 4).
 *   - Detect round win and tally scores.
 *   - Detect match win (when a player's cumulative score reaches matchWinScore).
 */
export function applyPlay(
    room: Room,
    playerId: string,
    cardId: string,
    chosenColor?: CardColor,
): { room: Room; error?: string } {
    const playerIdx = room.players.findIndex((p) => p.uid === playerId);
    if (playerIdx === -1) return { room, error: 'Player not found.' };

    if (room.players[room.currentTurnIndex].uid !== playerId) {
        return { room, error: 'It is not your turn.' };
    }

    const player = room.players[playerIdx];
    const cardIdx = player.hand.findIndex((c) => c.id === cardId);
    if (cardIdx === -1) return { room, error: 'Card not found in your hand.' };

    const card = player.hand[cardIdx];
    const topCard = room.discardPile[room.discardPile.length - 1];

    // Pending draw stacking: player must draw, cannot play normally.
    if (room.pendingDrawCount > 0) {
        return { room, error: 'You must draw the pending cards first.' };
    }

    if (!validatePlay(card, topCard, room.currentColor)) {
        return { room, error: 'That card cannot be played on the current discard.' };
    }

    // Build the played card, applying chosen color for wilds.
    const playedCard: Card =
        card.type === 'wild' || card.type === 'wild4'
            ? { ...card, color: chosenColor ?? 'red' }
            : card;

    const newHand = player.hand.filter((_, i) => i !== cardIdx);

    // Determine turn effects.
    let newDirection = room.direction;
    let skipCount = 0;
    let newPendingDraw = 0;

    switch (card.type) {
        case 'reverse':
            newDirection = (room.direction * -1) as 1 | -1;
            // In a 2-player game, Reverse acts as a Skip.
            if (room.players.length === 2) skipCount = 1;
            break;
        case 'skip':
            skipCount = 1;
            break;
        case 'draw2':
            newPendingDraw = 2;
            break;
        case 'wild4':
            newPendingDraw = 4;
            break;
        default:
            break;
    }

    const nextTurnIndex = calculateNextTurn(
        room.currentTurnIndex,
        newDirection,
        room.players.length,
        skipCount,
    );

    // Determine UNO eligibility for the player after their play.
    const nowEligible = newHand.length === 1;

    let newPlayers: Player[] = room.players.map((p, i) =>
        i === playerIdx
            ? {
                ...p,
                hand: newHand,
                unoEligible: nowEligible,
                // Preserve hasCalledUNO if still at 1 card, else reset.
                hasCalledUNO: nowEligible ? p.hasCalledUNO : false,
                unoCallTimestamp: nowEligible ? p.unoCallTimestamp : null,
                lastActionTimestamp: Date.now(),
            }
            : p,
    );

    // ── Round win detection ────────────────────────────────────────────────────
    const roundWon = newHand.length === 0;
    let newStatus: Room['status'] = room.status;
    let roundWinnerId = room.roundWinnerId;
    let matchWinnerId = room.matchWinnerId;

    if (roundWon) {
        newStatus = 'roundEnded';
        roundWinnerId = playerId;

        // Score the round: winner earns points equal to the sum of all opponents' hands.
        const earnedPoints = newPlayers
            .filter((p) => p.uid !== playerId)
            .flatMap((p) => p.hand)
            .reduce((sum, c) => sum + getCardPoints(c), 0);

        newPlayers = newPlayers.map((p) =>
            p.uid === playerId
                ? {
                    ...p,
                    roundScore: (p.roundScore ?? 0) + earnedPoints,
                    matchScore: (p.matchScore ?? 0) + earnedPoints,
                }
                : p,
        );

        // Match win detection.
        const winner = newPlayers.find((p) => p.uid === playerId)!;
        if ((winner.matchScore ?? 0) >= room.matchWinScore) {
            newStatus = 'matchEnded';
            matchWinnerId = playerId;
        }
    }

    return {
        room: {
            ...room,
            players: newPlayers,
            discardPile: [...room.discardPile, playedCard],
            currentColor: playedCard.color ?? chosenColor ?? room.currentColor,
            direction: newDirection,
            pendingDrawCount: newPendingDraw,
            // Do not advance turn index on round/match end.
            currentTurnIndex: roundWon ? room.currentTurnIndex : nextTurnIndex,
            status: newStatus,
            roundWinnerId,
            matchWinnerId,
        },
    };
}

// ---------------------------------------------------------------------------
// 8. Apply Draw Card
// ---------------------------------------------------------------------------

/**
 * applyDraw(room, playerId): { room; error? }
 *
 * Handles a player drawing from the draw pile.
 *
 * If pendingDrawCount > 0, the player draws that many cards (forced draw from
 * a +2 or +4 stack) and their turn is skipped.
 *
 * If pendingDrawCount === 0, the player draws exactly 1 card and their turn
 * is NOT advanced (they may still play the drawn card — though that logic is
 * handled at the UI layer; the engine just adds it to their hand).
 */
export function applyDraw(
    room: Room,
    playerId: string,
): { room: Room; error?: string } {
    const playerIdx = room.players.findIndex((p) => p.uid === playerId);
    if (playerIdx === -1) return { room, error: 'Player not found.' };

    if (room.players[room.currentTurnIndex].uid !== playerId) {
        return { room, error: 'It is not your turn.' };
    }

    let r = replenishDrawPile(room);
    const drawCount = r.pendingDrawCount > 0 ? r.pendingDrawCount : 1;
    const isForced = r.pendingDrawCount > 0;
    const drawn: Card[] = [];

    for (let i = 0; i < drawCount; i++) {
        if (r.drawPile.length === 0) r = replenishDrawPile(r);
        drawn.push(r.drawPile[0]);
        r = { ...r, drawPile: r.drawPile.slice(1) };
    }

    const nextTurnIndex = isForced
        ? calculateNextTurn(r.currentTurnIndex, r.direction, r.players.length)
        : r.currentTurnIndex;

    const newPlayers = r.players.map((p, i) =>
        i === playerIdx
            ? {
                ...p,
                hand: [...p.hand, ...drawn],
                lastActionTimestamp: Date.now(),
                unoEligible: false,
                hasCalledUNO: false,
            }
            : p,
    );

    return {
        room: {
            ...r,
            players: newPlayers,
            pendingDrawCount: 0,
            currentTurnIndex: nextTurnIndex,
        },
    };
}

// ---------------------------------------------------------------------------
// 9. Apply UNO Call
// ---------------------------------------------------------------------------

/**
 * applyCallUNO(room, playerId): Room
 *
 * Marks the player as having called UNO and records the timestamp.
 * Called by the host engine when it receives a 'callUNO' action request.
 */
export function applyCallUNO(room: Room, playerId: string): Room {
    return {
        ...room,
        players: room.players.map((p) =>
            p.uid === playerId
                ? { ...p, hasCalledUNO: true, unoCallTimestamp: Date.now() }
                : p,
        ),
    };
}

// ---------------------------------------------------------------------------
// 10. Apply Catch (UNO penalty)
// ---------------------------------------------------------------------------

/** Catch window in milliseconds after a player should have called UNO. */
const CATCH_WINDOW_MS = 5_000;

/**
 * applyCatch(room, catcherId, targetId): { room; error? }
 *
 * Applies a 2-card penalty to `targetId` if:
 *   1. Target has exactly 1 card.
 *   2. Target has NOT called UNO.
 *   3. The catch window (5 seconds after the turn passed) has not expired.
 */
export function applyCatch(
    room: Room,
    catcherId: string,
    targetId: string,
): { room: Room; error?: string } {
    void catcherId; // Catcher identity is validated by the host engine.

    const target = room.players.find((p) => p.uid === targetId);
    if (!target) return { room, error: 'Target player not found.' };
    if (target.hand.length !== 1) return { room, error: 'Target does not have exactly 1 card.' };
    if (target.hasCalledUNO) return { room, error: 'Target already called UNO — catch denied.' };

    const now = Date.now();
    if (now - (target.lastActionTimestamp ?? 0) > CATCH_WINDOW_MS) {
        return { room, error: 'Catch window has expired.' };
    }

    let r = replenishDrawPile(room);
    const penalty: Card[] = [];
    for (let i = 0; i < 2; i++) {
        if (r.drawPile.length === 0) r = replenishDrawPile(r);
        penalty.push(r.drawPile[0]);
        r = { ...r, drawPile: r.drawPile.slice(1) };
    }

    return {
        room: {
            ...r,
            players: r.players.map((p) =>
                p.uid === targetId
                    ? { ...p, hand: [...p.hand, ...penalty], unoEligible: false }
                    : p,
            ),
        },
    };
}

// ---------------------------------------------------------------------------
// 11. Apply Next Round
// ---------------------------------------------------------------------------

/**
 * applyNextRound(room: Room): Room
 *
 * Resets all player hands, increments the round counter, and deals a fresh
 * game via dealCards(). Preserves cumulative matchScore for each player.
 */
export function applyNextRound(room: Room): Room {
    const resetPlayers: Player[] = room.players.map((p) => ({
        ...p,
        hand: [],
        hasCalledUNO: false,
        unoCallTimestamp: null,
        unoEligible: false,
        roundScore: 0,
        lastActionTimestamp: Date.now(),
    }));

    return dealCards({
        ...room,
        status: 'dealing',
        roundNumber: room.roundNumber + 1,
        roundWinnerId: null,
        players: resetPlayers,
    });
}

// ---------------------------------------------------------------------------
// 12. Scoring
// ---------------------------------------------------------------------------

/**
 * getCardPoints(card: Card): number
 *
 * Returns the point value of a card as defined by official UNO rules:
 *   - Number cards: face value (0–9)
 *   - Action cards (Skip, Reverse, Draw Two): 20 points
 *   - Wild cards (Wild, Wild Draw Four): 50 points
 */
export function getCardPoints(card: Card): number {
    switch (card.type) {
        case 'number': return card.value ?? 0;
        case 'skip':
        case 'reverse':
        case 'draw2': return 20;
        case 'wild':
        case 'wild4': return 50;
        default: return 0;
    }
}

// ---------------------------------------------------------------------------
// 13. Apply Pass Turn (voluntary skip — player draws and then passes)
// ---------------------------------------------------------------------------

/**
 * applyPass(room, playerId): { room; error? }
 *
 * Allows the current player to voluntarily end their turn without playing
 * a card. Valid only when:
 *   - It IS the player's turn.
 *   - There is NO pending forced draw (pendingDrawCount must be 0).
 *
 * Advances the turn index in the current direction.
 */
export function applyPass(
    room: Room,
    playerId: string,
): { room: Room; error?: string } {
    const playerIdx = room.players.findIndex((p) => p.uid === playerId);
    if (playerIdx === -1) return { room, error: 'Player not found.' };
    if (room.players[room.currentTurnIndex].uid !== playerId) {
        return { room, error: 'It is not your turn.' };
    }
    if (room.pendingDrawCount > 0) {
        return { room, error: 'You must draw the pending cards before passing.' };
    }

    const nextTurnIndex = calculateNextTurn(
        room.currentTurnIndex,
        room.direction,
        room.players.length,
    );

    return {
        room: {
            ...room,
            currentTurnIndex: nextTurnIndex,
            players: room.players.map((p, i) =>
                i === playerIdx
                    ? { ...p, lastActionTimestamp: Date.now() }
                    : p,
            ),
        },
    };
}

// ---------------------------------------------------------------------------
// Backward-compatible aliases
// ---------------------------------------------------------------------------

/**
 * Alias for validatePlay() — retained so existing component imports continue
 * to compile without modification.
 * Signature extended with pendingDrawCount to match previous callers; if
 * pendingDrawCount > 0 the player must draw and cannot play any card.
 */
export function canPlayCard(
    card: Card,
    currentColor: string,
    topCard: Card,
    pendingDrawCount: number,
): boolean {
    if (pendingDrawCount > 0) return false;
    return validatePlay(card, topCard, currentColor);
}

/** Alias for calculateNextTurn() — matches the previous export name. */
export const calcNextTurnIndex = calculateNextTurn;

/** Alias for shuffleDeck() — matches the previous Fisher-Yates export name. */
export const fisherYatesShuffle = shuffleDeck;
