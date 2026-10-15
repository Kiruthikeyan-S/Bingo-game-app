import { BingoEngine } from '../src/game/bingoEngine';

describe('BingoEngine', () => {
  // Standard test board (1 to 25 sequentially)
  // Rows:
  // Row 0: 1, 2, 3, 4, 5
  // Row 1: 6, 7, 8, 9, 10
  // Row 2: 11, 12, 13, 14, 15
  // Row 3: 16, 17, 18, 19, 20
  // Row 4: 21, 22, 23, 24, 25
  const standardBoard = Array.from({ length: 25 }, (_, i) => i + 1);

  describe('Board Generation & Validation', () => {
    test('generateShuffledBoard generates valid 25 unique numbers 1-25', () => {
      const board = BingoEngine.generateShuffledBoard();
      expect(board).toHaveLength(25);
      const set = new Set(board);
      expect(set.size).toBe(25);
      for (let i = 1; i <= 25; i++) {
        expect(set.has(i)).toBe(true);
      }
      const validation = BingoEngine.validateBoard(board);
      expect(validation.valid).toBe(true);
    });

    test('validateBoard rejects boards with wrong length or duplicates or out of range', () => {
      expect(BingoEngine.validateBoard([1, 2, 3]).valid).toBe(false);
      // Duplicate 1
      const duplicateBoard = [...standardBoard];
      duplicateBoard[1] = 1;
      expect(BingoEngine.validateBoard(duplicateBoard).valid).toBe(false);

      // Out of range (26 instead of 25)
      const outOfRange = [...standardBoard];
      outOfRange[24] = 26;
      expect(BingoEngine.validateBoard(outOfRange).valid).toBe(false);
    });
  });

  describe('Call Validation', () => {
    test('validateCall allows uncalled numbers in 1-25 range', () => {
      expect(BingoEngine.validateCall(10, [1, 2, 3]).valid).toBe(true);
    });

    test('validateCall rejects duplicate called number', () => {
      const res = BingoEngine.validateCall(5, [1, 5, 9]);
      expect(res.valid).toBe(false);
      expect(res.error).toMatch(/already been called/);
    });

    test('validateCall rejects out of range numbers', () => {
      expect(BingoEngine.validateCall(0, []).valid).toBe(false);
      expect(BingoEngine.validateCall(26, []).valid).toBe(false);
      expect(BingoEngine.validateCall(3.5, []).valid).toBe(false);
    });
  });

  describe('Line Detection and B-I-N-G-O progress', () => {
    test('detects horizontal rows correctly', () => {
      // Row 0 complete
      const called = [1, 2, 3, 4, 5];
      const result = BingoEngine.evaluateBoard(standardBoard, called);
      expect(result.lineCount).toBe(1);
      expect(result.activeLetters).toEqual(['B']);
      expect(result.completedLines[0].type).toBe('row');
      expect(result.completedLines[0].index).toBe(0);
      expect(result.isBingo).toBe(false);
    });

    test('detects vertical columns correctly', () => {
      // Col 1 complete (numbers 2, 7, 12, 17, 22)
      const called = [2, 7, 12, 17, 22];
      const result = BingoEngine.evaluateBoard(standardBoard, called);
      expect(result.lineCount).toBe(1);
      expect(result.completedLines[0].type).toBe('col');
      expect(result.completedLines[0].index).toBe(1);
    });

    test('detects main diagonal correctly (top-left to bottom-right)', () => {
      // Indices 0, 6, 12, 18, 24 -> numbers 1, 7, 13, 19, 25
      const called = [1, 7, 13, 19, 25];
      const result = BingoEngine.evaluateBoard(standardBoard, called);
      expect(result.lineCount).toBe(1);
      expect(result.completedLines[0].type).toBe('diag_main');
    });

    test('detects anti-diagonal correctly (top-right to bottom-left)', () => {
      // Indices 4, 8, 12, 16, 20 -> numbers 5, 9, 13, 17, 21
      const called = [5, 9, 13, 17, 21];
      const result = BingoEngine.evaluateBoard(standardBoard, called);
      expect(result.lineCount).toBe(1);
      expect(result.completedLines[0].type).toBe('diag_anti');
    });

    test('activates all 5 BINGO letters when 5 lines are formed', () => {
      // Row 0: 1, 2, 3, 4, 5
      // Row 1: 6, 7, 8, 9, 10
      // Row 2: 11, 12, 13, 14, 15
      // Row 3: 16, 17, 18, 19, 20
      // Row 4: 21, 22, 23, 24, 25
      // Call first 4 rows: 20 numbers -> 4 rows completed
      const called4Rows = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20];
      const res4 = BingoEngine.evaluateBoard(standardBoard, called4Rows);
      expect(res4.lineCount).toBe(4);
      expect(res4.activeLetters).toEqual(['B', 'I', 'N', 'G']);
      expect(res4.isBingo).toBe(false);

      // Add Row 4: completes all 5 rows AND 5 cols AND both diagonals = 12 lines
      const calledAll = [...called4Rows, 21, 22, 23, 24, 25];
      const res5 = BingoEngine.evaluateBoard(standardBoard, calledAll);
      expect(res5.lineCount).toBe(12);
      expect(res5.activeLetters).toEqual(['B', 'I', 'N', 'G', 'O']);
      expect(res5.isBingo).toBe(true);
    });
  });

  describe('Multiplayer Outcomes and Edge Cases', () => {
    test('awards win to Player 1 if only Player 1 reaches 5 lines', () => {
      // Board 1: standard 1 to 25
      const board1 = [...standardBoard];

      // Board 2: place uncalled numbers [14, 15, 19, 20, 24] on the main diagonal (indices 0, 6, 12, 18, 24)
      // This breaks all 5 rows, all 5 columns, and both diagonals, guaranteeing 0 completed lines!
      const board2 = [
        14,  1,  2,  3,  4,
         5, 15,  6,  7,  8,
         9, 10, 19, 11, 12,
        13, 16, 17, 20, 18,
        21, 22, 23, 25, 24,
      ];

      // Numbers that complete 5 lines on Board 1:
      // Row 0 (1,2,3,4,5), Row 1 (6,7,8,9,10), Col 0 (1,6,11,16,21), Col 1 (2,7,12,17,22), Col 2 (3,8,13,18,23)
      const called = [
        1, 2, 3, 4, 5,
        6, 7, 8, 9, 10,
        11, 16, 21,
        12, 17, 22,
        13, 18, 23,
      ];

      const outcome = BingoEngine.evaluateMatchOutcome('p1', board1, 'p2', board2, called);
      expect(outcome.p1Result.lineCount).toBeGreaterThanOrEqual(5);
      expect(outcome.p2Result.lineCount).toBeLessThan(5);
      expect(outcome.isGameOver).toBe(true);
      expect(outcome.winnerId).toBe('p1');
      expect(outcome.resultType).toBe('win');
    });

    test('awards win to Player 2 even if Player 1 initiated the call, when Player 2 reaches 5 lines', () => {
      // Board 1 is standard
      const board1 = [...standardBoard];

      // Board 2 has numbers arranged to complete lines with these called numbers
      const board2Numbers = [
        1, 2, 3, 4, 5,
        6, 7, 8, 9, 10,
        11, 12, 13, 14, 15,
        16, 17, 22, 23, 24,
        18, 19, 25, 20, 21,
      ];
      const called = [
        1, 2, 3, 4, 5,
        6, 7, 8, 9, 10,
        11, 12, 13, 14, 15,
        16, 18,
        17, 19,
      ];

      const outcome = BingoEngine.evaluateMatchOutcome('p1', board1, 'p2', board2Numbers, called);
      expect(outcome.p2Result.lineCount).toBeGreaterThanOrEqual(5);
      expect(outcome.p1Result.lineCount).toBeLessThan(5);
      expect(outcome.isGameOver).toBe(true);
      expect(outcome.winnerId).toBe('p2');
      expect(outcome.resultType).toBe('win');
    });

    test('declares a DRAW if both players reach 5 lines simultaneously on the same call', () => {
      // Both players have identical boards (or different boards that both reach 5 lines)
      const board1 = [...standardBoard];
      const board2 = [...standardBoard];

      // Call numbers completing 5 lines on both
      const called = [
        1, 2, 3, 4, 5, // row 0
        6, 7, 8, 9, 10, // row 1
        11, 12, 13, 14, 15, // row 2
        16, 21, // col 0
        17, 22, // col 1
      ];

      const outcome = BingoEngine.evaluateMatchOutcome('p1', board1, 'p2', board2, called);
      expect(outcome.p1Result.lineCount).toBeGreaterThanOrEqual(5);
      expect(outcome.p2Result.lineCount).toBeGreaterThanOrEqual(5);
      expect(outcome.isGameOver).toBe(true);
      expect(outcome.winnerId).toBeNull();
      expect(outcome.resultType).toBe('draw');
    });
  });
});
