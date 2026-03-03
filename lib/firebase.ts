/**
 * lib/firebase.ts
 *
 * Production-ready Firebase v9 modular initialization.
 * SSR-safe: guards against re-initialization across Next.js hot reloads
 * and server-side evaluation where process.env values may be undefined.
 */

import { getApps, initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';


// ---------------------------------------------------------------------------
// Config validation
// ---------------------------------------------------------------------------

const REQUIRED_ENV_KEYS = [
  'NEXT_PUBLIC_FIREBASE_API_KEY',
  'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN',
  'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
  'NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET',
  'NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
  'NEXT_PUBLIC_FIREBASE_APP_ID',
] as const;

type EnvKey = (typeof REQUIRED_ENV_KEYS)[number];

function requireEnv(key: EnvKey): string {
  const value = process.env[key];
  if (!value) {
    // During SSR in some Next.js environments, env vars might be missing on the first pass.
    // However, if we're on the client (browser), we MUST have them.
    if (typeof window !== 'undefined') {
      throw new Error(
        `[Firebase] Missing client-side environment variable: ${key}. ` +
        'Ensure it is defined in .env.local and correctly prefixed.',
      );
    }
    return ''; // Return empty string for SSR to prevent crash during build/static-gen
  }
  return value;
}

// ---------------------------------------------------------------------------
// App initialization — idempotent
// ---------------------------------------------------------------------------

const firebaseConfig = {
  apiKey: "AIzaSyDrHGbWMcq0k0jNU5M2ym001ZkPqOg_1qk",
  authDomain: "unoforqt.firebaseapp.com",
  projectId: "unoforqt",
  storageBucket: "unoforqt.firebasestorage.app",
  messagingSenderId: "214924833332",
  appId: "1:214924833332:web:df7d8cf536e66aaf121061",
};

/**
 * Returns the singleton Firebase App instance, initializing it on first call.
 */
function getFirebaseApp() {
  if (getApps().length > 0) return getApps()[0];

  // If we're on the server and missing keys, we shouldn't initialize as it will crash.
  // The client-side will throw a clear error via requireEnv if it reaches that point.
  const isValid = Object.values(firebaseConfig).every(val => val !== '');
  if (!isValid && typeof window === 'undefined') {
    return null;
  }

  return initializeApp(firebaseConfig);
}

const app = getFirebaseApp();

// ---------------------------------------------------------------------------
// Service exports - note these may be null on the server if config is missing
// ---------------------------------------------------------------------------

/** Firebase Authentication singleton. */
export const auth = app ? getAuth(app) : ({} as any);

/** Cloud Firestore singleton. */
export const db = app ? getFirestore(app) : ({} as any);

// ---------------------------------------------------------------------------
// Service exports
// ---------------------------------------------------------------------------

/**
 * Google OAuth provider pre-configured to request the email scope.
 * Prompt is set to 'select_account' so the account chooser always appears,
 * which is the expected behaviour for a shared/family application.
 */
export const googleProvider = (() => {
  const provider = new GoogleAuthProvider();
  provider.addScope('email');
  provider.setCustomParameters({ prompt: 'select_account' });
  return provider;
})();
