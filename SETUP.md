# UNO Multiplayer Platform — Complete Setup Guide

## Prerequisites
- Node.js 18+
- Firebase CLI: `npm install -g firebase-tools`
- A Firebase project (free Spark plan works for development, Blaze plan required for Cloud Functions)

---

## 1. Firebase Project Setup

1. Go to [https://console.firebase.google.com](https://console.firebase.google.com)
2. Create a new project (e.g. `uno-multiplayer`)
3. Enable **Authentication** → Sign-in method → Enable:
   - Google
   - Email/Password
4. Enable **Firestore Database** → Start in production mode
5. Enable **Functions** (requires Blaze plan — pay-as-you-go, free tier is generous)
6. Get your config from: Project Settings → General → Your apps → Web app

---

## 2. Environment Variables

Copy `.env.local.example` to `.env.local`:

```bash
cp .env.local.example .env.local
```

Fill in your Firebase project values:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=AIza...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123:web:abc
NEXT_PUBLIC_FIREBASE_FUNCTIONS_REGION=us-central1
```

---

## 3. Install Dependencies

```bash
# Frontend
npm install

# Cloud Functions
cd functions
npm install
cd ..
```

---

## 4. Deploy Firestore Rules

```bash
firebase login
firebase use your-project-id
firebase deploy --only firestore:rules
```

---

## 5. Deploy Cloud Functions

```bash
cd functions
npm run build
cd ..
firebase deploy --only functions
```

This deploys: `joinRoom`, `startGame`, `playCard`, `drawCard`, `callUno`, `catchUno`

---

## 6. Run Locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## 7. Deploy Frontend to Vercel

### Option A: Vercel CLI
```bash
npm install -g vercel
vercel
```

Follow prompts. Add your environment variables in Vercel dashboard:
- Project Settings → Environment Variables
- Add all `NEXT_PUBLIC_*` variables from your `.env.local`

### Option B: Vercel Dashboard
1. Push this repo to GitHub
2. Go to [https://vercel.com/new](https://vercel.com/new)
3. Import your repo
4. Add environment variables
5. Deploy

---

## 8. Local Development with Firebase Emulators

```bash
firebase emulators:start
```

This starts local emulators for Auth, Firestore, and Functions on ports:
- Auth: 9099
- Firestore: 8080
- Functions: 5001
- Emulator UI: http://localhost:4000

---

## Folder Structure

```
uno-platform/
├── app/
│   ├── page.tsx              # Landing / auth page
│   ├── lobby/[roomId]/       # Lobby page
│   ├── game/[roomId]/        # Game board page
│   ├── layout.tsx
│   └── globals.css
├── components/
│   ├── ui/
│   │   └── FloatingParticles.tsx
│   ├── game/
│   │   ├── UnoCard.tsx
│   │   ├── ColorPicker.tsx
│   │   ├── ScoreBoard.tsx
│   │   ├── RoundEndScreen.tsx
│   │   └── MatchEndScreen.tsx
│   └── chat/
│       └── ChatPanel.tsx
├── lib/
│   ├── firebase.ts           # Firebase initialization
│   ├── types.ts              # TypeScript interfaces
│   ├── store.ts              # Zustand state store
│   └── gameUtils.ts          # Client-side helpers
├── functions/
│   ├── src/
│   │   ├── index.ts          # All Cloud Functions
│   │   └── deck.ts           # Deck generation + shuffle
│   ├── package.json
│   └── tsconfig.json
├── firestore.rules
├── firebase.json
├── firestore.indexes.json
├── tailwind.config.js
├── next.config.js
├── .env.local.example
└── SETUP.md
```

---

## Game Rules Implemented

- Full 108-card UNO deck (Fisher-Yates shuffle)
- 7 cards dealt per player server-side
- First card special rules (Wild4 redrawn, Draw2/Skip/Reverse effects)
- Server-authoritative card validation
- Wild + Wild4 with color selection
- Wild4 hand-check enforcement
- Draw stacking disabled (standard rules)
- UNO button with eligibility tracking
- Catch UNO penalty (+2 cards)
- Round scoring (Number=face, Skip/Reverse/Draw2=20, Wild/Wild4=50)
- Match mode: first to 500 points wins
- Player stats updated to Firestore on match end
- Direction indicator (CW/CCW)
- Phase locking to prevent race conditions
- Firestore transactions for all state changes

---

## AFK Timer (Advanced)

To enable AFK auto-draw after 30 seconds, deploy a scheduled function or use Firestore TTL triggers. A starter implementation:

```ts
// In functions/src/index.ts — add this scheduled function:
export const afkCheck = functions.pubsub.schedule('every 1 minutes').onRun(async () => {
  const rooms = await db.collection('rooms').where('status', '==', 'playing').get();
  const now = Date.now();
  for (const doc of rooms.docs) {
    const room = doc.data();
    const player = room.players[room.currentTurnIndex];
    if (player && now - player.lastActionTimestamp > 30000) {
      // Auto-draw for this player
      // Call drawCard logic inline
    }
  }
});
```

---

## Disconnect Handling (Advanced)

Use Firebase Realtime Database presence for disconnect detection:
```ts
// Client-side presence tracking
import { getDatabase, ref, onDisconnect, set } from 'firebase/database';
const rtdb = getDatabase();
const presenceRef = ref(rtdb, `presence/${roomId}/${uid}`);
onDisconnect(presenceRef).set(false);
set(presenceRef, true);
```
