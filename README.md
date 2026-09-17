<div align="center">



<br/>

[[Next.js](https://img.shields.io/badge/Next.js-14-black?style=for-the-badge&logo=next.js&logoColor=white)](https://nextjs.org)
[[React](https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev)
[[TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://typescriptlang.org)
[[Firebase](https://img.shields.io/badge/Firebase-Firestore_%26_Auth-FFCA28?style=for-the-badge&logo=firebase&logoColor=black)](https://firebase.google.com)
[[Zustand](https://img.shields.io/badge/State-Zustand-764ABC?style=for-the-badge)](https://github.com/pmndrs/zustand)
[[Framer Motion](https://img.shields.io/badge/Animations-Framer_Motion-0055FF?style=for-the-badge&logo=framer&logoColor=white)](https://framer.com/motion)

<br/>

> **Instant, browser-based multiplayer UNO card battles with zero signup friction.**  
> Create a private lobby or enter a 6-character room code to challenge friends in real time. Powered by Firebase Firestore snapshot listeners, client-side optimistic reconciliation, and audio-visual feedback.

<br/>

**[Gameplay & Features](#-game-features) &nbsp;•&nbsp; [Game Engine Architecture](#%EF%B8%8F-game-engine-architecture) &nbsp;•&nbsp; [Tech Stack](#-technology-stack) &nbsp;•&nbsp; [Quickstart](#-getting-started)**

<br/>

</div>

---

##  Why Play UNO Multiplayer?

Traditional digital card games often force users through mandatory account creation, email verifications, and intrusive ads before letting them play a single round.

**UNO Multiplayer eliminates all that friction:**
- **Instant Guest Play:** Jump straight into action anonymously without creating an account.
- **6-Character Room Codes:** Effortlessly invite friends across desktop and mobile.
- **Real-Time Reactive State:** Smooth card draws, discards, and turns synchronized via Firebase Firestore.

---

##  Game Features

- **Full Official Rule Enforcement:**
  - Standard number and color matching.
  - Action cards: **Skip**, **Reverse**, and **Draw Two**.
  - Wild cards: **Wild** and **Wild Draw Four** with real-time color choice modal.
  - Turn direction reversals and accumulation logic.
- **In-Game Chat:** Integrated real-time room chat alongside the playing table.
- **Interactive Audio Feedback:** Web Audio sound effects for card placement, turn chimes, and win fanfare (`public/sounds/`).
- **Tactile Card Animations:** Smooth hand layouts, hover states, and discard animations powered by Framer Motion.
- **Host Engine Protocol:** Host-validated state management prevents desynchronization and illegal moves.

---

##  Game Engine Architecture

```
                      [ Player A Client ]        [ Player B Client ]
                               │                         │
                               ▼                         ▼
                     ┌─────────────────────────────────────────┐
                     │          Firebase Firestore             │
                     │    Real-Time Room Snapshot Stream       │
                     └────────────────────┬────────────────────┘
                                          │
                                          ▼
                     ┌─────────────────────────────────────────┐
                     │          Host Engine Authority          │
                     │   • Deck Management & Card Dealing      │
                     │   • Turn Order & Direction Evaluation   │
                     │   • Win State & Uno Penalties           │
                     └─────────────────────────────────────────┘
```

The game is structured around two key decoupled modules:
1. **`lib/engine.ts` & `lib/hostEngine.ts`:** Validates legal card plays, handles deck re-shuffling when the draw pile empties, and manages player elimination.
2. **`store/useGameStore.ts` (Zustand):** Manages local client state, optimistic UI rendering, audio preferences, and room metadata.

---

##  Technology Stack

| Layer | Technology | Details |
|---|---|---|
| **Framework** | Next.js 14 (App Router) | High-performance React framework |
| **Language** | TypeScript | Strong type definitions for cards, decks, and turns |
| **Realtime Backend** | Firebase Firestore | Low-latency document subscriptions for game tables |
| **Authentication** | Firebase Auth | Anonymous authentication & Google/Email sign-in |
| **State Management** | Zustand | Lightweight, unopinionated client store |
| **Animations** | Framer Motion | Spring physics on card dealing and hand layout |
| **Styling** | Tailwind CSS | Responsive mobile and desktop gaming interface |

---

##  Repository Structure

```
Unogame/
├── app/
│   ├── page.tsx             # Landing screen (Create room, Join with code, Auth)
│   ├── lobby/[roomId]/      # Pre-game staging area & player roster
│   └── room/[roomId]/       # Main interactive game table
├── components/
│   ├── auth/                # Anonymous, Google, and Email sign-in forms
│   ├── chat/                # In-room chat panel and message stream
│   ├── game/                # Card, Hand, Table, ColorPicker, and Deck components
│   └── ui/                  # Reusable UI primitives
├── lib/
│   ├── engine.ts            # Core UNO rules and move legality logic
│   ├── hostEngine.ts        # Host-authoritative deck dealing & turn clock
│   ├── firebase.ts          # Firebase SDK initialization
│   └── sound.ts             # Audio synthesis and sound triggers
├── store/
│   └── useGameStore.ts      # Global client state store
└── public/sounds/           # Sound effect audio assets
```

---

##  Getting Started

### Prerequisites
- Node.js 18+ and npm
- A Firebase project with **Firestore** and **Authentication** enabled

### 1. Installation

```bash
git clone https://github.com/B-Jai12/Unogame.git
cd Unogame
npm install
```

### 2. Configure Firebase

Copy `.env.local.example` to `.env.local`:
```bash
cp .env.local.example .env.local
```

Add your Firebase configuration credentials:
```env
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
```

### 3. Run Locally

```bash
npm run dev
```

Open `http://localhost:3000` in your browser, create a room, share the code, and play!

---

##  Author

**Jaideep** ([B-Jai12](https://github.com/B-Jai12))  
B.Tech AIML Student & Product Builder • Focused on realtime web apps, interactive multiplayer experiences, and modern software architectures.
