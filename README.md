# UNO Multiplayer

> Real-time multiplayer UNO card game — Create or join a room and play instantly.

---

## Play Now

**No account required.** Open the app, create a room or join with a code, and start playing.

---

## Features

- **Guest play** — No signup needed. Create or join rooms anonymously.
- **Real-time sync** — Firebase Firestore powers live card draws, turns, and game state.
- **Room codes** — Share a 6-character code with friends to join.
- **Full UNO rules** — Draw 2, Wild, Reverse, Skip, Wild Draw 4.
- **Chat** — In-game chat per room.
- **Host engine** — Host processes all game logic for consistent state.
- **Dark/Light theme** — Toggleable UI theme.
- **Mobile responsive** — Playable on phones and tablets.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14, TypeScript, Tailwind CSS |
| Realtime | Firebase Firestore |
| Auth | Firebase Auth (anonymous + Google + Email) |
| State | Zustand |
| Animations | Framer Motion |

---

## Architecture

`
Player (browser)
  ↓ writes ActionRequest to Firestore
Host Engine (browser, host tab)
  ↓ processes action, updates room document
All Players (Firestore real-time listeners)
  ↓ receive updated game state instantly
`

All game logic runs in the host player's browser — no backend server required.

---

## Local Setup

`ash
git clone https://github.com/B-Jai12/Unogame.git
cd Unogame
npm install
cp .env.local.example .env.local
# Fill in Firebase config in .env.local
npm run dev
`

---

## Environment Variables

Copy .env.local.example to .env.local and fill in your Firebase project values:

`
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
`

**Never commit .env.local — it is already in .gitignore.**

---

## Firebase Setup

1. Create a Firebase project at [console.firebase.google.com](https://console.firebase.google.com)
2. Enable Firestore Database
3. Enable Authentication → Anonymous + Google + Email/Password
4. Copy Firestore security rules from irestore.rules
5. Add web app config to .env.local

---

## Future Improvements

- Spectator mode
- Game history / stats
- Custom house rules (7-0, stacking)
- Tournament bracket mode

---

## Author

Built by [B-Jai12](https://github.com/B-Jai12)