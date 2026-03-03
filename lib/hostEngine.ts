/**
 * hostEngine.ts — Host-Authoritative Client Engine
 *
 * Only runs on the host client (room creator, isHost === true).
 * Subscribes to the `actionRequests` subcollection on Firestore,
 * processes each request inside a Firestore Transaction, and writes
 * the updated room state back atomically.
 *
 * AFK Detection: 30s auto-draw + turn skip.
 * Disconnect Grace: 60s before forfeiting a player's hand.
 */

'use client';

import { useEffect, useRef, useCallback } from 'react';
import {
    collection,
    doc,
    onSnapshot,
    runTransaction,
    deleteDoc,
    query,
    orderBy,
    Timestamp,
    writeBatch,
} from 'firebase/firestore';
import { db } from './firebase';
import {
    applyPlay,
    applyDraw,
    applyCallUNO,
    applyCatch,
    applyNextRound,
    dealCards,
} from './engine';
import { Room, ActionRequest } from './types';

const AFK_TIMEOUT_MS = 15_000;   // 15 seconds
const DISCONNECT_GRACE_MS = 60_000; // 60 seconds

interface UseHostEngineOptions {
    roomId: string;
    room: Room | null;
    currentUid: string;
}

export function useHostEngine({ roomId, room, currentUid }: UseHostEngineOptions) {
    const roomRef = useRef<Room | null>(room);
    const processingRef = useRef<Set<string>>(new Set());
    const afkTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Keep roomRef in sync with latest room value
    useEffect(() => {
        roomRef.current = room;
    }, [room]);

    // ─── Process a single action request ───────────────────────────────────────
    const processAction = useCallback(
        async (action: ActionRequest) => {
            if (processingRef.current.has(action.id!)) return;
            processingRef.current.add(action.id!);

            const roomDocRef = doc(db, 'rooms', roomId);
            const actionDocRef = doc(db, 'rooms', roomId, 'actionRequests', action.id!);

            try {
                await runTransaction(db, async (tx) => {
                    const snap = await tx.get(roomDocRef);
                    if (!snap.exists()) return;

                    let currentRoom = snap.data() as Room;

                    // Phase lock guard
                    if (currentRoom.phaseLock) return;

                    let updatedRoom: Room = currentRoom;

                    switch (action.type) {
                        case 'START_GAME': {
                            if (currentRoom.hostId !== action.senderId) return;
                            if (currentRoom.status !== 'waiting') return;
                            if (currentRoom.players.length < 2) return;
                            updatedRoom = dealCards({ ...currentRoom, status: 'dealing' });
                            updatedRoom.roundNumber = 1;
                            break;
                        }

                        case 'PLAY_CARD': {
                            const { cardId, chosenColor } = action.payload as {
                                cardId: string;
                                chosenColor?: string;
                            };
                            const result = applyPlay(
                                currentRoom,
                                action.senderId,
                                cardId,
                                (chosenColor as any) ?? null,
                            );
                            if (result.error) return;
                            updatedRoom = result.room;
                            break;
                        }

                        case 'DRAW_CARD': {
                            const result = applyDraw(currentRoom, action.senderId);
                            if (result.error) return;
                            updatedRoom = result.room;
                            break;
                        }

                        case 'CALL_UNO': {
                            updatedRoom = applyCallUNO(currentRoom, action.senderId);
                            break;
                        }

                        case 'CATCH_UNO': {
                            const { targetId } = action.payload as { targetId: string };
                            const result = applyCatch(currentRoom, action.senderId, targetId);
                            if (result.error) return;
                            updatedRoom = result.room;
                            break;
                        }

                        case 'NEXT_ROUND': {
                            if (currentRoom.hostId !== action.senderId) return;
                            if (currentRoom.status !== 'roundEnded') return;
                            updatedRoom = applyNextRound(currentRoom);
                            break;
                        }

                        case 'LEAVE_ROOM': {
                            // Remove the player from the room
                            const leavingIdx = currentRoom.players.findIndex(
                                (p) => p.uid === action.senderId,
                            );
                            if (leavingIdx === -1) return;
                            const leavingPlayer = currentRoom.players[leavingIdx];
                            // Forfeit their hand into the discard pile
                            const newDiscardPile = [
                                ...currentRoom.discardPile,
                                ...leavingPlayer.hand,
                            ];
                            const newPlayers = currentRoom.players.filter(
                                (_, i) => i !== leavingIdx,
                            );
                            if (newPlayers.length < 2) {
                                updatedRoom = {
                                    ...currentRoom,
                                    players: newPlayers,
                                    discardPile: newDiscardPile,
                                    status: 'matchEnded',
                                    matchWinnerId: newPlayers[0]?.uid ?? null,
                                };
                            } else {
                                const newTurnIndex =
                                    currentRoom.currentTurnIndex >= newPlayers.length
                                        ? 0
                                        : currentRoom.currentTurnIndex;
                                updatedRoom = {
                                    ...currentRoom,
                                    players: newPlayers,
                                    discardPile: newDiscardPile,
                                    currentTurnIndex: newTurnIndex,
                                };
                            }
                            break;
                        }

                        default:
                            return;
                    }

                    tx.set(roomDocRef, updatedRoom);
                    tx.delete(actionDocRef);
                });
            } catch (err) {
                console.error('[HostEngine] Transaction failed:', err);
            } finally {
                processingRef.current.delete(action.id!);
            }
        },
        [roomId],
    );

    // ─── Listen to action requests subcollection ────────────────────────────────
    useEffect(() => {
        const q = query(
            collection(db, 'rooms', roomId, 'actionRequests'),
            orderBy('timestamp', 'asc'),
        );

        const unsub = onSnapshot(q, (snap) => {
            snap.docChanges().forEach((change) => {
                if (change.type === 'added') {
                    const data = change.doc.data() as Omit<ActionRequest, 'id'>;
                    processAction({ ...data, id: change.doc.id });
                }
            });
        });

        return () => unsub();
    }, [roomId, processAction]);

    // ─── AFK Detection ──────────────────────────────────────────────────────────
    useEffect(() => {
        if (!room || room.status !== 'playing') return;

        if (afkTimerRef.current) clearTimeout(afkTimerRef.current);

        const currentPlayer = room.players[room.currentTurnIndex];
        if (!currentPlayer) return;

        const elapsed = Date.now() - (currentPlayer.lastActionTimestamp ?? 0);
        const remaining = AFK_TIMEOUT_MS - elapsed;

        afkTimerRef.current = setTimeout(async () => {
            const r = roomRef.current;
            if (!r || r.status !== 'playing') return;
            const cp = r.players[r.currentTurnIndex];
            if (!cp) return;
            // Auto-draw for AFK player
            await processAction({
                id: `afk_${cp.uid}_${Date.now()}`,
                type: 'DRAW_CARD',
                senderId: cp.uid,
                timestamp: Date.now(),
                payload: {},
            });
        }, Math.max(0, remaining));

        return () => {
            if (afkTimerRef.current) clearTimeout(afkTimerRef.current);
        };
    }, [room, processAction]);

    // ─── Disconnect Detection ───────────────────────────────────────────────────
    useEffect(() => {
        if (!room || room.status !== 'playing') return;

        const checkDisconnects = async () => {
            const r = roomRef.current;
            if (!r) return;
            const now = Date.now();
            for (const player of r.players) {
                if (
                    !player.isConnected &&
                    player.disconnectTimestamp &&
                    now - player.disconnectTimestamp > DISCONNECT_GRACE_MS
                ) {
                    await processAction({
                        id: `disconnect_${player.uid}_${Date.now()}`,
                        type: 'LEAVE_ROOM',
                        senderId: player.uid,
                        timestamp: Date.now(),
                        payload: {},
                    });
                }
            }
        };

        const interval = setInterval(checkDisconnects, 10_000);
        return () => clearInterval(interval);
    }, [room, processAction]);
}
