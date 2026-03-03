/**
 * guestActions.ts — Guest (Non-Host) Action Submission
 *
 * All game actions from non-host clients are written as ActionRequest
 * documents to the `rooms/{roomId}/actionRequests` subcollection.
 * The host engine processes them inside Firestore Transactions.
 */

import { collection, addDoc } from 'firebase/firestore';
import { db } from './firebase';
import { ActionType, CardColor } from './types';

async function submitAction(
    roomId: string,
    type: ActionType,
    senderId: string,
    payload: Record<string, unknown> = {},
): Promise<void> {
    await addDoc(collection(db, 'rooms', roomId, 'actionRequests'), {
        type,
        senderId,
        timestamp: Date.now(),
        payload,
        processed: false,
    });
}

// ─── Typed Action Helpers ────────────────────────────────────────────────────

export async function actionStartGame(roomId: string, senderId: string) {
    return submitAction(roomId, 'START_GAME', senderId);
}

export async function actionPlayCard(
    roomId: string,
    senderId: string,
    cardId: string,
    chosenColor?: CardColor,
) {
    return submitAction(roomId, 'PLAY_CARD', senderId, {
        cardId,
        chosenColor: chosenColor ?? null,
    });
}

export async function actionDrawCard(roomId: string, senderId: string) {
    return submitAction(roomId, 'DRAW_CARD', senderId);
}

export async function actionCallUNO(roomId: string, senderId: string) {
    return submitAction(roomId, 'CALL_UNO', senderId);
}

export async function actionCatchUNO(
    roomId: string,
    senderId: string,
    targetId: string,
) {
    return submitAction(roomId, 'CATCH_UNO', senderId, { targetId });
}

export async function actionNextRound(roomId: string, senderId: string) {
    return submitAction(roomId, 'NEXT_ROUND', senderId);
}

export async function actionLeaveRoom(roomId: string, senderId: string) {
    return submitAction(roomId, 'LEAVE_ROOM', senderId);
}
