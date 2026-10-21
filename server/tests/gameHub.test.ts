import { BingoEngine, BingoBot } from '../../shared/engines/bingoEngine';
import { ChessEngine, ChessBot } from '../../shared/engines/chessEngine';
import { LudoEngine, LudoBot } from '../../shared/engines/ludoEngine';
import { RoomManager } from '../src/game/roomManager';
import { GameManager } from '../src/game/gameManager';

describe('Game Hub Comprehensive Test Suite', () => {
  // =========================================================================
  // 1. BINGO BOT & MULTIPLAYER (2-4 PLAYERS)
  // =========================================================================
  describe('Bingo Bot & 2-4 Player Engine', () => {
    const standardBoard = Array.from({ length: 25 }, (_, i) => i + 1);

    test('BingoBot implements SmartBot interface and selects valid uncalled numbers across difficulties', () => {
      const bot = new BingoBot('easy');
      const botBoard = BingoEngine.generateShuffledBoard();
      const called = [1, 5, 13, 19, 25];

      const legalMoves = bot.getLegalMoves({ botBoard, calledNumbers: called });
      expect(legalMoves).toHaveLength(20);
      for (const c of called) {
        expect(legalMoves).not.toContain(c);
      }

      for (const diff of ['easy', 'medium', 'hard'] as const) {
        bot.changeDifficulty(diff);
        expect(bot.difficulty).toBe(diff);
        const move = bot.selectBotMove({ botBoard, calledNumbers: called });
        expect(move).not.toBeNull();
        expect(called).not.toContain(move!);
        expect(move!).toBeGreaterThanOrEqual(1);
        expect(move!).toBeLessThanOrEqual(25);
      }

      // Medium & Hard should prioritize completing a 4/5 line
      bot.changeDifficulty('hard');
      const almostRow0Called = [1, 2, 3, 4];
      const winningPick = bot.selectBotMove({
        botBoard: standardBoard,
        calledNumbers: almostRow0Called,
      });
      expect(winningPick).toBe(5);
    });

    test('BingoEngine.evaluateMultiPlayerOutcome supports 3 and 4 player matches', () => {
      const b1 = [...standardBoard];
      const b2 = BingoEngine.generateShuffledBoard();
      const b3 = BingoEngine.generateShuffledBoard();

      const allNumbers = Array.from({ length: 25 }, (_, i) => i + 1);
      const outcome = BingoEngine.evaluateMultiPlayerOutcome(
        { p1: b1, p2: b2, p3: b3 },
        allNumbers
      );

      expect(outcome.isGameOver).toBe(true);
      expect(outcome.resultType).toBe('draw'); // all 3 boards complete all 12 lines when all 25 called
    });
  });

  // =========================================================================
  // 2. CHESS ENGINE & CHESS BOT
  // =========================================================================
  describe('ChessEngine & ChessBot', () => {
    test('ChessEngine initializes standard board, validates moves, and detects Fool’s Mate checkmate', () => {
      const state = ChessEngine.createInitialState('white_p1', 'black_p2');
      expect(state.turn).toBe('w');
      expect(state.isCheckmate).toBe(false);

      // Illegal move (knight to e5 from g1)
      const badMove = ChessEngine.applyMove(state, { from: 'g1', to: 'e5' });
      expect(badMove.success).toBe(false);

      // Fool's Mate sequence: 1. f3 e5 2. g4 Qh4#
      const m1 = ChessEngine.applyMove(state, { from: 'f2', to: 'f3' });
      expect(m1.success).toBe(true);
      const m2 = ChessEngine.applyMove(m1.state!, { from: 'e7', to: 'e5' });
      expect(m2.success).toBe(true);
      const m3 = ChessEngine.applyMove(m2.state!, { from: 'g2', to: 'g4' });
      expect(m3.success).toBe(true);
      const m4 = ChessEngine.applyMove(m3.state!, { from: 'd8', to: 'h4' });
      expect(m4.success).toBe(true);

      expect(m4.state!.isCheckmate).toBe(true);
      expect(m4.isGameOver).toBe(true);
      expect(m4.winnerId).toBe('black_p2');
      expect(m4.resultType).toBe('checkmate');
    });

    test('ChessEngine supports pawn promotion and undoMoves for offline bot games', () => {
      // White pawn on a7 ready to promote
      const promoFen = '4k3/P7/8/8/8/8/8/4K3 w - - 0 1';
      const initial = ChessEngine.createInitialState('w1', 'b1');
      const customState = { ...initial, fen: promoFen };

      const promoRes = ChessEngine.applyMove(customState, {
        from: 'a7',
        to: 'a8',
        promotion: 'q',
      });
      expect(promoRes.success).toBe(true);
      expect(promoRes.state!.fen).toContain('Q3k3');

      // Test undoMoves in a normal game
      const s0 = ChessEngine.createInitialState('w1', 'b1');
      const s1 = ChessEngine.applyMove(s0, { from: 'e2', to: 'e4' }).state!;
      const s2 = ChessEngine.applyMove(s1, { from: 'e7', to: 'e5' }).state!;
      expect(s2.moveHistory).toHaveLength(2);

      const undone = ChessEngine.undoMoves(s2, 2);
      expect(undone.moveHistory).toHaveLength(0);
      expect(undone.turn).toBe('w');
    });

    test('ChessBot selects legal moves across Easy, Medium, and Hard difficulties without illegal moves', () => {
      const bot = new ChessBot('easy');
      const state = ChessEngine.createInitialState('w1', 'b1');

      for (const diff of ['easy', 'medium', 'hard'] as const) {
        bot.changeDifficulty(diff);
        const move = bot.selectBotMove(state);
        expect(move).not.toBeNull();
        const applied = ChessEngine.applyMove(state, move!);
        expect(applied.success).toBe(true);
      }
    });
  });

  // =========================================================================
  // 3. LUDO ENGINE & LUDO BOT
  // =========================================================================
  describe('LudoEngine & LudoBot', () => {
    test('LudoEngine requires a 6 to exit base, awards bonus roll on 6, and handles safe squares & captures', () => {
      const state = LudoEngine.createInitialState(['p1', 'p2']);
      expect(state.activeColors).toEqual(['red', 'yellow']);
      expect(state.currentTurnColor).toBe('red');

      // Rolling a 4 when all tokens are at base (-1) should have 0 legal moves and advance turn
      const roll4 = LudoEngine.applyDiceRoll(state, 4);
      expect(roll4.legalMoves).toHaveLength(0);
      expect(roll4.autoTurnPassed).toBe(true);
      expect(roll4.state.currentTurnColor).toBe('yellow');

      // Rolling a 6 for Yellow allows all 4 base tokens to exit
      const roll6 = LudoEngine.applyDiceRoll(roll4.state, 6);
      expect(roll6.legalMoves.map((m) => m.tokenId)).toEqual([0, 1, 2, 3]);
      expect(roll6.autoTurnPassed).toBe(false);

      // Move token 0 out of base onto step 0 (safe start square)
      const moved = LudoEngine.applyTokenMove(roll6.state, 0);
      expect(moved.success).toBe(true);
      expect(moved.state!.tokens.yellow[0].step).toBe(0);
      // Because Yellow rolled a 6, Yellow gets a bonus turn!
      expect(moved.grantedExtraTurn).toBe(true);
      expect(moved.state!.currentTurnColor).toBe('yellow');
    });

    test('LudoEngine captures opponent token on non-safe square and requires exact roll to reach home (step 56)', () => {
      let state = LudoEngine.createInitialState(['p1', 'p2']);
      // Red start is global 0 -> Red step 1 is global 1 (non-safe).
      // Yellow start is global 26 -> Yellow step 25 is global 51; rolling 2 lands on step 27 (global 1).
      state.tokens.red[0].step = 1; // global 1
      state.tokens.yellow[0].step = 25; // global 51
      state.currentTurnColor = 'yellow';

      // Yellow rolls 2 -> moves from step 25 to step 27 (global 1), capturing Red token 0!
      const rolled = LudoEngine.applyDiceRoll(state, 2);
      expect(rolled.legalMoves.map((m) => m.tokenId)).toContain(0);
      const afterCapture = LudoEngine.applyTokenMove(rolled.state, 0);
      expect(afterCapture.success).toBe(true);
      expect(afterCapture.moveApplied?.capturesToken).toBeDefined();
      expect(afterCapture.state!.tokens.red[0].step).toBe(-1); // sent back to base
      expect(afterCapture.grantedExtraTurn).toBe(true); // bonus turn for capture!

      // Exact roll to finish home (step 56): token at step 54 cannot move on dice 3
      state = LudoEngine.createInitialState(['p1', 'p2']);
      state.tokens.red[0].step = 54;
      const overRoll = LudoEngine.applyDiceRoll(state, 3);
      expect(overRoll.legalMoves.map((m) => m.tokenId)).not.toContain(0);

      // Exact roll of 2 moves token from 54 to 56 (Home)
      const exactRoll = LudoEngine.applyDiceRoll(state, 2);
      expect(exactRoll.legalMoves.map((m) => m.tokenId)).toContain(0);
      const homeRes = LudoEngine.applyTokenMove(exactRoll.state, 0);
      expect(homeRes.success).toBe(true);
      expect(homeRes.moveApplied?.isHomeEntry).toBe(true);
      expect(homeRes.state!.tokens.red[0].step).toBe(56);
    });

    test('LudoBot selects strategic moves across Easy, Medium, and Hard difficulties', () => {
      const bot = new LudoBot('easy');
      const state = LudoEngine.createInitialState(['p1', 'p2']);
      state.tokens.red[0].step = 4;
      state.tokens.red[1].step = -1;
      const rolled = LudoEngine.applyDiceRoll(state, 6).state;

      for (const diff of ['easy', 'medium', 'hard'] as const) {
        bot.changeDifficulty(diff);
        const option = bot.selectBotMove(rolled);
        expect(option).not.toBeNull();
        expect([0, 1, 2, 3]).toContain(option!.tokenId);
      }
    });
  });

  // =========================================================================
  // 4. MULTIPLAYER SERVER VALIDATION (BINGO, CHESS, LUDO)
  // =========================================================================
  describe('Multiplayer RoomManager & GameManager Server Validation', () => {
    test('Supports Chess multiplayer room creation, ready start, turn validation, and rematch', () => {
      const rm = new RoomManager();
      const { room } = rm.createRoom('sock_w', {
        username: 'Alice',
        avatarUrl: 'https://example.com/a.png',
        playerId: 'alice_1',
        gameType: 'chess',
        maxPlayers: 2,
      });
      expect(room.gameType).toBe('chess');

      const joinRes = rm.joinRoom('sock_b', {
        roomCode: room.roomCode,
        username: 'Bob',
        avatarUrl: 'https://example.com/b.png',
        playerId: 'bob_2',
      });
      expect(joinRes.success).toBe(true);

      rm.setReady('sock_w', true);
      rm.setReady('sock_b', true);

      const started = rm.startGame(room.roomCode);
      expect(started.success).toBe(true);
      expect(started.room?.status).toBe('playing');
      expect(started.room?.chessState).toBeDefined();

      // Prevent playing out of turn (Black tries to move on White's turn)
      const outOfTurn = GameManager.processChessMove(room, 'bob_2', {
        from: 'e7',
        to: 'e5',
      });
      expect(outOfTurn.success).toBe(false);
      expect(outOfTurn.error).toMatch(/Not your turn/);

      // Valid move by White
      const validMove = GameManager.processChessMove(room, 'alice_1', {
        from: 'e2',
        to: 'e4',
      });
      expect(validMove.success).toBe(true);
      expect(room.currentTurnPlayerId).toBe('bob_2');

      // Test Rematch flow
      room.status = 'finished';
      const r1 = GameManager.processRematch(room, 'alice_1');
      expect(r1.readyForRematch).toBe(false);
      const r2 = GameManager.processRematch(room, 'bob_2');
      expect(r2.readyForRematch).toBe(true);
      expect(room.status).toBe('playing');
    });

    test('Supports Ludo multiplayer room creation, server-authoritative dice roll, and turn enforcement', () => {
      const rm = new RoomManager();
      const { room } = rm.createRoom('sock_l1', {
        username: 'LudoHost',
        avatarUrl: 'https://example.com/1.png',
        playerId: 'ludo_p1',
        gameType: 'ludo',
        maxPlayers: 4,
      });
      rm.joinRoom('sock_l2', {
        roomCode: room.roomCode,
        username: 'LudoGuest',
        avatarUrl: 'https://example.com/2.png',
        playerId: 'ludo_p2',
      });

      rm.setReady('sock_l1', true);
      rm.setReady('sock_l2', true);
      const started = rm.startGame(room.roomCode);
      expect(started.success).toBe(true);
      expect(room.status).toBe('playing');
      expect(room.ludoState).toBeDefined();

      // Player 2 cannot roll dice on Player 1's turn
      const badRoll = GameManager.processLudoRoll(room, 'ludo_p2');
      expect(badRoll.success).toBe(false);

      // Player 1 rolls a 6 on server-authoritative dice and moves token 0 out of base
      const goodRoll = GameManager.processLudoRoll(room, 'ludo_p1', 6);
      expect(goodRoll.success).toBe(true);
      expect(goodRoll.diceValue).toBe(6);
      expect(goodRoll.legalTokenIds).toEqual([0, 1, 2, 3]);

      const moveRes = GameManager.processLudoMove(room, 'ludo_p1', 0);
      expect(moveRes.success).toBe(true);
      expect(room.ludoState?.tokens.red[0].step).toBe(0);
    });
  });
});
