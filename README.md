# 🎮 GAME HUB ARENA — Bingo, Chess & Ludo Multiplayer Mobile Platform

A complete **Expo React Native (SDK 57)** + **TypeScript** + **Node.js / Socket.IO** mobile gaming platform featuring **three full games** in both **Single-Player vs Smart Bot** and **Real-Time Online Multiplayer** modes:

1. **🎯 Bingo Battle (5×5)** — 1v1 Bot or 2–4 Player Online Rooms
2. **♟️ Royal Chess (8×8)** — Full FIDE Chess (`chess.js`) vs Easy/Medium/Hard AI or 1v1 Online
3. **🎲 Ludo Royale (2–4 Players)** — Classic 4-color Ludo vs 1–3 Smart Bots or 2–4 Player Online Rooms

---

## 🌟 Core Highlights

- **3 Full Games in One Unified Hub**:
  - **Bingo**: 5×5 tactical grid (1–25), custom board setup, live B-I-N-G-O progress, simultaneous draw resolution, and Smart Bingo Bot (`Easy`, `Medium`, `Hard`).
  - **Chess**: Standard 8×8 rules via `chess.js` (check, checkmate, stalemate, castling, en passant, pawn promotion, threefold repetition, 50-move draw, undo in offline bot mode) with 3-tier AI (`Easy` random/capture, `Medium` 2-ply Minimax + Piece-Square Tables, `Hard` Depth-3 Alpha-Beta Pruning + MVV-LVA + Opening Book).
  - **Ludo**: Classic 15×15 cross board (`Red`, `Green`, `Yellow`, `Blue`), 4 tokens per player, roll-6-to-exit-base, 8 safe star/start squares, opponent captures with bonus turns, exact roll to finish home (`56`), 3-consecutive-sixes rule, and Threat-Aware Ludo Bot (`Easy`, `Medium`, `Hard`).
- **Reusable Smart Bot Framework (`shared/engines/botFramework.ts`)**:
  - Standardized `getLegalMoves()`, `calculateMoveScore()`, `selectBotMove()`, `executeBotMove()`, and `changeDifficulty()`.
  - Offline-first single-player mode works with zero internet or multiplayer server dependency.
- **Authoritative Real-Time Multiplayer (`server/`)**:
  - Private 6-character room codes (`room:create`, `room:join`, `room:ready`).
  - Server-side move validation for Bingo calls, Chess moves, and Ludo dice rolls & token movements.
  - Reconnection handling, turn synchronization, and instant rematches.
- **Modern Gaming Dashboard & Persistent Bottom Navigation**:
  - **Home**, **Friends**, **History**, **Leaderboard**, and **Profile** screens with non-monetary coin rewards, per-game win/loss/draw tracking, and Dark/Light theme support.

---

## 🚀 Quick Start

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
