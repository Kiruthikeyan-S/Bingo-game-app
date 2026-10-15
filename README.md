# 🎱 BINGO BATTLE — Realtime Multiplayer Mobile Game

A production-oriented, realtime 1v1 online multiplayer Bingo mobile game built with **Expo React Native**, **TypeScript**, **Node.js**, and **Socket.IO**.

---

## 🌟 Features

- **Authoritative Server Game Engine**:
  - Validates 5×5 boards (numbers 1 to 25 unique).
  - Enforces turns, prevents duplicate or out-of-range calls.
  - Detects all 12 line patterns: 5 horizontal, 5 vertical, and 2 diagonals.
  - Activates **B - I - N - G - O** letters sequentially for each completed line.
  - **Simultaneous Victory Resolution**: If both players reach 5 lines on the exact same number call, the match is authoritatively resolved as a **DRAW**.
- **Realtime Multiplayer Communication (Socket.IO)**:
  - 6-character room codes (`room:create`, `room:join`).
  - Board submission and locking (`game:boardSubmit`, `room:ready`).
  - Synchronized number calls (`game:callNumber`, `game:numberCalled`, `game:turnChanged`).
  - Reconnection support with a 45-second grace period before forfeit.
  - In-game rematch requests (`game:rematchRequest`, `game:rematchAccepted`).
- **Modern Neon Gaming UI/UX**:
  - Dark navy and electric blue theme with purple gradients and neon green accents.
  - 11 interactive screens built with Expo Router.
  - Custom 5×5 interactive board setup: shuffle and tap-to-swap number cells.
  - Responsive layout tailored for Android phones and iPhones.
- **Supabase Cloud Database & In-Memory Fallback**:
  - Player profiles, match results, move logs, and leaderboards.
  - Works 100% out-of-the-box in local development with automatic in-memory persistence if Supabase credentials are not configured.
- **Android APK Ready**:
  - Pre-configured `eas.json` for building standalone `.apk` packages via Expo Application Services (EAS Build).

---

## 📁 Project Architecture

```text
BINGO game/
├── shared/                       # Shared type definitions & Zod validation schemas
│   ├── types/index.ts            # Socket events, player, room, and board contracts
│   └── schemas/index.ts          # Zod validation for boards, calls, and room codes
│
├── server/                       # Node.js + Express + Socket.IO backend
│   ├── src/
│   │   ├── game/
│   │   │   ├── bingoEngine.ts    # Authoritative engine (lines, bingo letters, win/draw)
│   │   │   ├── gameManager.ts    # Turn handling, match progression, rematches
│   │   │   └── roomManager.ts    # Room lifecycle, 6-char codes, disconnect timers
│   │   ├── socket/handlers.ts    # Typed Socket.IO event listeners & emitters
│   │   ├── database/
│   │   │   ├── schema.sql        # PostgreSQL / Supabase migration script
│   │   │   └── supabase.ts       # Database service with in-memory fallback
│   │   └── index.ts              # Express server & Socket.IO server initialization
│   └── tests/
│       ├── bingoEngine.test.ts   # 13 automated unit tests for game rules & edge cases
│       └── multiplayer.test.ts   # Integration test with 2 simulated Socket.IO clients
│
├── mobile/                       # Expo React Native mobile application
│   ├── app/                      # Expo Router screens
│   │   ├── _layout.tsx           # Global Safe Area & Stack layout
│   │   ├── index.tsx             # Screen 1: Animated Splash Screen
│   │   ├── login.tsx             # Screen 2: Guest Player Onboarding & Avatar Picker
│   │   ├── home.tsx              # Screen 3: Home Dashboard & How to Play
│   │   ├── create-room.tsx       # Screen 4: Room Code Generation & Opponent Waiting
│   │   ├── join-room.tsx         # Screen 5: 6-Character Code Entry
│   │   ├── board-setup.tsx       # Screen 6: Interactive 5x5 Number Arranger
│   │   ├── lobby.tsx             # Screen 7: Multiplayer Waiting Lobby
│   │   ├── game.tsx              # Screen 8: Live 1v1 Battle Screen
│   │   ├── results.tsx           # Screen 9: Victory / Defeat / Draw & Rematch
│   │   ├── leaderboard.tsx       # Screen 10: Global Rankings & Win Rates
│   │   ├── profile.tsx           # Screen 11: Player Stats & Preferences
│   │   └── settings.tsx          # Screen 12: Network / Server IP Switcher
│   ├── components/
│   │   ├── BingoBoard.tsx        # 5x5 Grid with completed line highlighting
│   │   ├── BingoCell.tsx         # Individual cell with cross overlay & neon badges
│   │   ├── BingoProgress.tsx     # B-I-N-G-O letters glowing progress
│   │   ├── PlayerCard.tsx        # Avatar, ready status, and turn indicators
│   │   ├── RoomCode.tsx          # 6-char code display with copy/share
│   │   ├── GameHeader.tsx        # Header with connection dot and sound toggle
│   │   └── GameButton.tsx        # Gradient game button with haptic styling
│   ├── hooks/
│   │   ├── useSocket.ts          # Connection lifecycle management
│   │   ├── useRoom.ts            # Room creation, joining, and ready state
│   │   └── useGame.ts            # Board submission, turns, and moves
│   ├── services/
│   │   ├── socket.ts             # Socket.IO client instance & reconnection
│   │   ├── supabase.ts           # Supabase client
│   │   └── api.ts                # Leaderboard API client
│   ├── store/
│   │   ├── gameStore.ts          # Zustand store for live match state
│   │   └── playerStore.ts        # Zustand store for player identity & settings
│   ├── utils/bingo.ts            # Client-side line detection and board shuffler
│   ├── app.json                  # Expo config (Android package: com.bingobattle.app)
│   └── eas.json                  # EAS Build configuration for APK generation
│
├── .env.example
└── README.md
```

---

## 🚀 Quick Start Guide

### 1. Prerequisites
- [Node.js](https://nodejs.org/) v18, v20, or v24 installed.
- Physical Android/iOS device with the [Expo Go](https://expo.dev/go) app installed, or an Android emulator.

---

### 2. Start the Multiplayer Server

Open a terminal and run:

```bash
cd server
npm install
npm run dev
```

The server will start listening on port `3001`:
```text
[Bingo Battle Server] Listening on port 3001
[Supabase] Credentials not provided; running in local in-memory persistence mode
```

#### Run Server Tests
To verify all game rules, line detection, turn management, and simulated 2-player multiplayer:
```bash
npm test
```
All 14 tests across `bingoEngine.test.ts` and `multiplayer.test.ts` will execute and pass!

---

### 3. Start the Mobile App

Open a second terminal and run:

```bash
cd mobile
npm install
npx expo start
```

Press `a` to run on an Android emulator, or scan the displayed QR code using the **Expo Go** app on your physical phone.

---

## 📱 Testing with Two Real Android Devices

To test a live 1v1 match between two physical devices on the same Wi-Fi network:

1. **Find your computer's local IP address**:
   - On Windows, run: `ipconfig` (look for `IPv4 Address`, e.g., `192.168.1.50`).
   - On macOS/Linux, run: `ifconfig` or `ip a`.
2. **Configure the mobile app's server URL**:
   - In `mobile/app/settings.tsx`, or by opening the in-app **Settings** screen on each device, enter:
     ```text
     http://192.168.1.50:3001
     ```
   - Tap **Ping** to verify the connection, then tap **Save & Connect**.
3. **Play the match**:
   - **Player A**: Tap **Create Battle Room** on Home screen. Copy or note down the generated 6-character room code (e.g. `A8K2XZ`).
   - **Player B**: Tap **Join Room** on Home screen. Enter `A8K2XZ` and tap **Enter Battle**.
   - Both players will enter the **Board Setup** screen:
     - Tap **Shuffle** or tap two cells to swap their positions.
     - Tap **Lock & Confirm Board**.
   - Once both players confirm, the match starts automatically!
   - Player 1 calls a number -> the number is crossed off on both players' devices with an X overlay.
   - Player 2 calls a number -> both boards update in real-time.
   - As lines are completed, the corresponding **B - I - N - G - O** letters illuminate.
   - The first player to complete 5 lines triggers the **BINGO VICTORY** screen on both phones.
   - Either player can tap **Request Rematch** to play again with alternating turns.

---

## 🗄️ Supabase Database Setup (Optional)

1. Create a project at [supabase.com](https://supabase.com).
2. Open the **SQL Editor** in the Supabase Dashboard.
3. Copy the contents of `server/src/database/schema.sql` and run it.
4. Add your Supabase credentials to `server/.env`:
   ```env
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   ```
5. Restart the server. Matches, moves, and leaderboard statistics will now be saved permanently in PostgreSQL!

---

## 📦 Building an Installable Android APK

To generate an installable `.apk` file that can be distributed directly to Android phones:

1. Install EAS CLI globally:
   ```bash
   npm install -g eas-cli
   ```
2. Log in to your Expo account:
   ```bash
   eas login
   ```
3. Set your production server URL in `mobile/.env` or `app.json`:
   ```env
   EXPO_PUBLIC_SERVER_URL=https://your-server.railway.app
   ```
4. Build the standalone Android APK:
   ```bash
   cd mobile
   eas build -p android --profile preview
   ```
5. Once EAS finishes building in the cloud, download the `.apk` link, transfer it to any Android device, and tap to install!

---

## ⚖️ License
MIT License. Built with ❤️ for Bingo lovers and multiplayer game enthusiasts.
