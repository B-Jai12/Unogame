/**
 * store/useGameStore.ts
 *
 * Zustand store for the UNO Host-Authoritative Client Engine.
 *
 * Responsibilities:
 *   - Holds the authenticated Firebase user and derived user profile.
 *   - Holds the live-synced Room document (via onSnapshot).
 *   - Derives `isHost` by comparing currentUser.uid === currentRoom.hostId.
 *   - Holds `localHand` for optimistic UI updates before server confirmation.
 *   - Provides declarative actions for create/join/leave room.
 *   - Provides UI state: color picker, card animations, toast, chat.
 *
 * Architecture note:
 *   The Firestore onSnapshot subscription is managed here so that a single
 *   listener is active regardless of how many components consume the store.
 *   The unsubscribe function is stored in `_roomUnsub` and called on
 *   leaveRoom() and on subsequent subscribeToRoom() calls to avoid duplicates.
 */

import { create } from 'zustand';
import {
    arrayUnion,
    doc,
    getDoc,
    onSnapshot,
    setDoc,
    updateDoc,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Card, CardColor, ChatMessage, Player, Room, UserProfile } from '@/lib/types';
import { generateRoomId } from '@/lib/utils';

// ---------------------------------------------------------------------------
// Auxiliary types
// ---------------------------------------------------------------------------

type ToastType = 'info' | 'success' | 'warning' | 'error';

interface CardAnimationTarget {
    /** Unique card ID being animated. */
    cardId: string;
    /** Source position in viewport coordinates. */
    fromX: number;
    fromY: number;
    /** Destination position in viewport coordinates. */
    toX: number;
    toY: number;
}

// ---------------------------------------------------------------------------
// Store interface
// ---------------------------------------------------------------------------

interface GameStore {
    // ─── Auth ─────────────────────────────────────────────────────────────────
    /** Firebase Auth user — null when signed out or auth is still loading. */
    currentUser: any | null;
    /** Extended profile document from /users/{uid}. */
    userProfile: UserProfile | null;
    /** True while onAuthStateChanged has not yet fired for the first time. */
    authLoading: boolean;

    setCurrentUser: (user: any | null) => void;
    setUserProfile: (profile: UserProfile | null) => void;
    setAuthLoading: (loading: boolean) => void;

    // ─── Room ─────────────────────────────────────────────────────────────────
    /**
     * The live-synced Room document. Populated by subscribeToRoom().
     * Null when no room is joined or the listener has not yet fired.
     */
    currentRoom: Room | null;
    /** Firestore document ID for the active room. */
    roomId: string | null;
    /** True while the first snapshot from subscribeToRoom() is pending. */
    roomLoading: boolean;
    /**
     * Derived from currentUser.uid === currentRoom.hostId.
     * Recomputed whenever either changes.
     */
    isHost: boolean;

    // ─── Local Hand ──────────────────────────────────────────────────────────
    /**
     * Mirrors the player's hand but is updated optimistically on card play,
     * before the host engine confirms the transaction. This eliminates the
     * perceived lag between clicking a card and seeing it disappear.
     */
    localHand: Card[];
    setLocalHand: (hand: Card[]) => void;

    // ─── Chat ─────────────────────────────────────────────────────────────────
    messages: ChatMessage[];
    chatOpen: boolean;
    setMessages: (messages: ChatMessage[]) => void;
    addMessage: (message: ChatMessage) => void;
    setChatOpen: (open: boolean) => void;

    // ─── UI State ─────────────────────────────────────────────────────────────
    showColorPicker: boolean;
    pendingWildCardId: string | null;
    pendingWild4CardId: string | null;

    setShowColorPicker: (show: boolean) => void;
    setPendingWildCardId: (id: string | null) => void;
    setPendingWild4CardId: (id: string | null) => void;

    // ─── Card Animations ──────────────────────────────────────────────────────
    cardAnimations: CardAnimationTarget[];
    dealingInProgress: boolean;

    addCardAnimation: (anim: CardAnimationTarget) => void;
    removeCardAnimation: (cardId: string) => void;
    setDealingInProgress: (v: boolean) => void;

    // ─── Toast Notifications ──────────────────────────────────────────────────
    toastMessage: string | null;
    toastType: ToastType;

    showToast: (message: string, type?: ToastType) => void;
    clearToast: () => void;

    // ─── Error ────────────────────────────────────────────────────────────────
    error: string | null;
    setError: (err: string | null) => void;

    // ─── Room Actions ─────────────────────────────────────────────────────────

    /**
     * Attaches a real-time Firestore listener to rooms/{roomId}.
     * Any previous listener is detached first.
     * Sets roomLoading=true until the first snapshot arrives.
     */
    subscribeToRoom: (roomId: string) => void;

    /**
     * Generates a 6-character alphanumeric room code, writes the initial Room
     * document to Firestore, and calls subscribeToRoom.
     * Throws if the user is not authenticated.
     */
    createRoom: (user: any) => Promise<string>;

    /**
     * Adds the authenticated user to an existing room's players array using
     * arrayUnion (idempotent — safe to call if already joined).
     * Throws if the room does not exist or is full (≥ 8 players).
     */
    joinRoom: (roomId: string, user: any) => Promise<void>;

    /**
     * Removes the player from the room's players array in Firestore,
     * detaches the onSnapshot listener, and resets local room state.
     * If the leaving player is the host, the room document is deleted.
     */
    leaveRoom: () => Promise<void>;
}

// ---------------------------------------------------------------------------
// Internal module-level unsubscribe handle
// ---------------------------------------------------------------------------

let _roomUnsub: (() => void) | null = null;

// ---------------------------------------------------------------------------
// Store implementation
// ---------------------------------------------------------------------------

export const useGameStore = create<GameStore>((set, get) => ({

    // ── Auth ──────────────────────────────────────────────────────────────────
    currentUser: null,
    userProfile: null,
    authLoading: true,

    setCurrentUser: (currentUser) => {
        set((state) => ({
            currentUser,
            // Recompute isHost when user changes
            isHost: currentUser
                ? state.currentRoom?.hostId === currentUser.uid
                : false,
        }));
    },

    setUserProfile: (userProfile) => set({ userProfile }),
    setAuthLoading: (authLoading) => set({ authLoading }),

    // ── Room ──────────────────────────────────────────────────────────────────
    currentRoom: null,
    roomId: null,
    roomLoading: false,
    isHost: false,

    // ── Local Hand ────────────────────────────────────────────────────────────
    localHand: [],
    setLocalHand: (localHand) => set({ localHand }),

    // ── Chat ──────────────────────────────────────────────────────────────────
    messages: [],
    chatOpen: false,
    setMessages: (messages) => set({ messages }),
    addMessage: (message) =>
        set((state) => ({
            messages: [...state.messages, message].slice(-100),
        })),
    setChatOpen: (chatOpen) => set({ chatOpen }),

    // ── UI State ──────────────────────────────────────────────────────────────
    showColorPicker: false,
    pendingWildCardId: null,
    pendingWild4CardId: null,

    setShowColorPicker: (showColorPicker) => set({ showColorPicker }),
    setPendingWildCardId: (pendingWildCardId) => set({ pendingWildCardId }),
    setPendingWild4CardId: (pendingWild4CardId) => set({ pendingWild4CardId }),

    // ── Card Animations ───────────────────────────────────────────────────────
    cardAnimations: [],
    dealingInProgress: false,

    addCardAnimation: (anim) =>
        set((state) => ({ cardAnimations: [...state.cardAnimations, anim] })),

    removeCardAnimation: (cardId) =>
        set((state) => ({
            cardAnimations: state.cardAnimations.filter((a) => a.cardId !== cardId),
        })),

    setDealingInProgress: (dealingInProgress) => set({ dealingInProgress }),

    // ── Toast ─────────────────────────────────────────────────────────────────
    toastMessage: null,
    toastType: 'info',

    showToast: (message, type = 'info') => {
        set({ toastMessage: message, toastType: type });
        // Auto-dismiss after 3.5 s. The timer ID is not stored because we
        // intentionally overwrite any in-flight with the next call.
        setTimeout(() => set({ toastMessage: null }), 3500);
    },
    clearToast: () => set({ toastMessage: null }),

    // ── Error ─────────────────────────────────────────────────────────────────
    error: null,
    setError: (error) => set({ error }),

    // ── Room Actions ──────────────────────────────────────────────────────────

    subscribeToRoom: (roomId: string) => {
        // Detach any existing listener before creating a new one.
        if (_roomUnsub) {
            _roomUnsub();
            _roomUnsub = null;
        }

        set({ roomId, roomLoading: true, currentRoom: null });

        const ref = doc(db, 'rooms', roomId);

        _roomUnsub = onSnapshot(ref, (snapshot) => {
            if (!snapshot.exists()) {
                // Room was deleted (e.g., host left).
                set({ currentRoom: null, roomId: null, roomLoading: false, isHost: false });
                if (_roomUnsub) { _roomUnsub(); _roomUnsub = null; }
                return;
            }

            const room = { id: snapshot.id, ...snapshot.data() } as Room;
            const { currentUser } = get();

            set({
                currentRoom: room,
                roomLoading: false,
                isHost: currentUser ? room.hostId === currentUser.uid : false,
                // Sync localHand with server hand to resolve any optimistic drift.
                localHand: currentUser
                    ? (room.players.find((p) => p.uid === currentUser.uid)?.hand ?? [])
                    : [],
            });
        }, (err) => {
            console.error('[Store] Subscription error:', err);
            set({ error: err.message, roomLoading: false });
        });
    },

    createRoom: async (user: any): Promise<string> => {
        if (!user?.uid) throw new Error('User must be authenticated to create a room.');

        // Fetch profile for display username.
        const profileSnap = await getDoc(doc(db, 'users', user.uid));
        const profile = profileSnap.exists() ? (profileSnap.data() as UserProfile) : null;
        const username = profile?.username ?? user.displayName ?? user.email?.split('@')[0] ?? 'Host';

        const roomId = generateRoomId();

        const hostPlayer: Player = {
            uid: user.uid,
            username,
            hand: [],
            roundScore: 0,
            matchScore: 0,
            hasCalledUNO: false,
            unoCallTimestamp: null,
            unoEligible: false,
            lastActionTimestamp: Date.now(),
            isConnected: true,
            disconnectTimestamp: null,
        };

        const newRoom: Omit<Room, 'id'> = {
            hostId: user.uid,
            status: 'waiting',
            phaseLock: false,
            direction: 1,
            currentTurnIndex: 0,
            currentColor: 'red',
            pendingDrawCount: 0,
            players: [hostPlayer],
            playerIds: [user.uid],
            drawPile: [],
            discardPile: [],
            roundNumber: 0,
            matchWinScore: 100,
            matchWinnerId: null,
            roundWinnerId: null,
            createdAt: Date.now(),
        };

        await setDoc(doc(db, 'rooms', roomId), newRoom);

        // Subscribe immediately so the host gets the first snapshot.
        get().subscribeToRoom(roomId);

        return roomId;
    },

    joinRoom: async (roomId: string, user: any): Promise<void> => {
        if (!user?.uid) throw new Error('User must be authenticated to join a room.');

        const ref = doc(db, 'rooms', roomId);
        const snapshot = await getDoc(ref);

        if (!snapshot.exists()) {
            throw new Error(`Room "${roomId}" does not exist. Check the code and try again.`);
        }

        const room = snapshot.data() as Omit<Room, 'id'>;

        // Idempotency: silently succeed if already in room.
        const alreadyJoined = room.players.some((p) => p.uid === user.uid);
        if (alreadyJoined) {
            get().subscribeToRoom(roomId);
            return;
        }

        if (room.players.length >= 8) {
            throw new Error('This room is full (maximum 8 players).');
        }
        if (room.status !== 'waiting') {
            throw new Error('This game has already started.');
        }

        const profileSnap = await getDoc(doc(db, 'users', user.uid));
        const profile = profileSnap.exists() ? (profileSnap.data() as UserProfile) : null;
        const username = profile?.username ?? user.displayName ?? user.email?.split('@')[0] ?? 'Player';

        const newPlayer: Player = {
            uid: user.uid,
            username,
            hand: [],
            roundScore: 0,
            matchScore: 0,
            hasCalledUNO: false,
            unoCallTimestamp: null,
            unoEligible: false,
            lastActionTimestamp: Date.now(),
            isConnected: true,
            disconnectTimestamp: null,
        };

        await updateDoc(ref, {
            players: arrayUnion(newPlayer),
            playerIds: arrayUnion(user.uid),
        });

        get().subscribeToRoom(roomId);
    },

    leaveRoom: async (): Promise<void> => {
        const { currentRoom, roomId, currentUser } = get();

        // Detach listener first to avoid processing stale snapshots during cleanup.
        if (_roomUnsub) { _roomUnsub(); _roomUnsub = null; }

        if (currentRoom && roomId && currentUser) {
            const ref = doc(db, 'rooms', roomId);

            if (currentRoom.hostId === currentUser.uid) {
                // Host leaving: delete the room to clean up. Guests will be redirected
                // when their onSnapshot receives a "document deleted" event.
                const { deleteDoc } = await import('firebase/firestore');
                await deleteDoc(ref).catch(() => {
                    // Silently ignore — the room may already not exist.
                });
            } else {
                // Guest leaving: remove from players array.
                const { arrayRemove } = await import('firebase/firestore');
                const leavingPlayer = currentRoom.players.find((p) => p.uid === currentUser.uid);
                if (leavingPlayer) {
                    await updateDoc(ref, {
                        players: arrayRemove(leavingPlayer),
                        playerIds: arrayRemove(currentUser.uid),
                    }).catch(() => { });
                }
            }
        }

        // Reset all room-scoped state.
        set({
            currentRoom: null,
            roomId: null,
            isHost: false,
            localHand: [],
            roomLoading: false,
            cardAnimations: [],
            dealingInProgress: false,
            showColorPicker: false,
            pendingWildCardId: null,
            pendingWild4CardId: null,
        });
    },
}));
