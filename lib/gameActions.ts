/**
 * gameActions.ts — Deprecated
 *
 * This file has been replaced by the Host-Authoritative Client Engine.
 * All game actions are now submitted via guestActions.ts to the
 * rooms/{roomId}/actionRequests subcollection and processed by
 * the host engine in hostEngine.ts.
 *
 * This file is kept as a re-export shim for backward compatibility
 * during the migration — any old imports pointing here will still work.
 */

export * from './guestActions';
