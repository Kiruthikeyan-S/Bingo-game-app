# GAME HUB ARENA — Bingo, Chess & Ludo Multiplayer Mobile Platform

A complete **Expo React Native (SDK 57)** + **TypeScript** + **Node.js / Socket.IO** mobile gaming platform featuring **three full games** in both **Single-Player** and **Real-Time Online Multiplayer** modes:

1. **Bingo Battle (5x5)** — Single Player or 2–4 Player Online Rooms
2. **Royal Chess (8x8)** — Full FIDE Chess (`chess.js`) in Single Player (Easy / Medium / Hard) or 1v1 Online
3. **Ludo Royale (2–4 Players)** — Classic 4-color Ludo in Single Player (1–3 Opponents) or 2–4 Player Online Rooms

---

## Core Highlights

- **3 Full Games in One Unified Hub**:
  - **Bingo**: 5x5 tactical grid (1–25), custom board setup, live B-I-N-G-O progress, simultaneous draw resolution, and Single Player mode (`Easy`, `Medium`, `Hard`).
  - **Chess**: Standard 8x8 rules via `chess.js` (check, checkmate, stalemate, castling, en passant, pawn promotion, threefold repetition, 50-move draw, undo in offline mode), custom SVG vector chess pieces, and 3-tier Single Player engine (`Easy`, `Medium` 2-ply Minimax + Piece-Square Tables, `Hard` Alpha-Beta Pruning + MVV-LVA + Opening Book).
  - **Ludo**: Classic 15x15 cross board (`Red`, `Green`, `Yellow`, `Blue`), 4 tokens per player, roll-6-to-exit-base, 8 safe star/start squares, opponent captures with bonus turns, exact roll to finish home (`56`), 3-consecutive-sixes rule, and strategic Single Player opponents (`Easy`, `Medium`, `Hard`).
- **Fast Single-Player Engine (`shared/engines/botFramework.ts`)**:
  - Standardized `getLegalMoves()`, `calculateMoveScore()`, `selectBotMove()`, `executeBotMove()`, and `changeDifficulty()`.
  - Sub-200ms turn response time with zero UI lag.
  - Offline-first single-player mode works with zero internet or multiplayer server dependency.
- **Authoritative Real-Time Multiplayer (`server/`)**:
  - Private 6-character room codes (`room:create`, `room:join`, `room:ready`).
  - Server-side move validation for Bingo calls, Chess moves, and Ludo dice rolls & token movements.
  - Reconnection handling, turn synchronization, and instant rematches.
- **Play-Store-Ready Gaming Dashboard & Persistent Bottom Navigation**:
  - **Home**, **Friends**, **History**, **Leaderboard**, and **Profile** screens with clean vector iconography, non-monetary coin rewards, per-game win/loss/draw tracking, and Dark/Light theme support.

---

## Quick Start

### 1. Start the Multiplayer Backend Server
```bash
cd server
npm install
npm run dev
```

### 2. Run Automated Tests (24 Unit & Integration Tests)
```bash
cd server
npm test
```

### 3. Start the Mobile App (Expo SDK 57)
```bash
cd mobile
npm install
npx expo start
```
