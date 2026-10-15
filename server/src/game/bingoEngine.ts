import { BoardArray, LineHighlight } from '../../../shared/types';
import { BoardSchema, CalledNumberSchema } from '../../../shared/schemas';

export const BINGO_LETTERS = ['B', 'I', 'N', 'G', 'O'] as const;

export interface LineDefinition {
  type: 'row' | 'col' | 'diag_main' | 'diag_anti';
  index: number;
  indices: number[];
}

// Precompute the 12 possible Bingo lines on a 5x5 board (indices 0..24)
export const ALL_LINES: LineDefinition[] = [
  // 5 rows
  { type: 'row', index: 0, indices: [0, 1, 2, 3, 4] },
  { type: 'row', index: 1, indices: [5, 6, 7, 8, 9] },
  { type: 'row', index: 2, indices: [10, 11, 12, 13, 14] },
  { type: 'row', index: 3, indices: [15, 16, 17, 18, 19] },
  { type: 'row', index: 4, indices: [20, 21, 22, 23, 24] },
  // 5 columns
  { type: 'col', index: 0, indices: [0, 5, 10, 15, 20] },
  { type: 'col', index: 1, indices: [1, 6, 11, 16, 21] },
  { type: 'col', index: 2, indices: [2, 7, 12, 17, 22] },
  { type: 'col', index: 3, indices: [3, 8, 13, 18, 23] },
  { type: 'col', index: 4, indices: [4, 9, 14, 19, 24] },
  // 2 diagonals
  { type: 'diag_main', index: 0, indices: [0, 6, 12, 18, 24] },
  { type: 'diag_anti', index: 0, indices: [4, 8, 12, 16, 20] },
];

export class BingoEngine {
  /**
   * Generates a randomly shuffled valid 5x5 board containing numbers 1 to 25.
   */
  public static generateShuffledBoard(): BoardArray {
    const nums = Array.from({ length: 25 }, (_, i) => i + 1);
    for (let i = nums.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [nums[i], nums[j]] = [nums[j], nums[i]];
    }
    return nums;
  }

  /**
   * Validates a board against the rules: length 25, numbers 1-25 unique.
   */
  public static validateBoard(board: unknown): { valid: boolean; error?: string } {
    const result = BoardSchema.safeParse(board);
    if (!result.success) {
      return { valid: false, error: result.error.errors[0]?.message || 'Invalid board layout' };
    }
    return { valid: true };
  }

  /**
   * Validates a called number.
   */
  public static validateCall(
    number: number,
    calledNumbers: number[]
  ): { valid: boolean; error?: string } {
    const numResult = CalledNumberSchema.safeParse(number);
    if (!numResult.success) {
      return { valid: false, error: numResult.error.errors[0]?.message || 'Invalid number' };
    }

    if (calledNumbers.includes(number)) {
      return { valid: false, error: `Number ${number} has already been called` };
    }

    return { valid: true };
  }

  /**
   * Calculates completed lines for a given board layout based on called numbers.
   */
  public static evaluateBoard(
    board: BoardArray,
    calledNumbers: number[]
  ): {
    completedLines: LineHighlight[];
    lineCount: number;
    activeLetters: string[];
    isBingo: boolean;
  } {
    const calledSet = new Set(calledNumbers);
    const completedLines: LineHighlight[] = [];

    for (const line of ALL_LINES) {
      const isComplete = line.indices.every((idx) => calledSet.has(board[idx]));
      if (isComplete) {
        completedLines.push({
          type: line.type,
          index: line.index,
          indices: [...line.indices],
        });
      }
    }

    const lineCount = completedLines.length;
    const activeLetterCount = Math.min(lineCount, 5);
    const activeLetters = BINGO_LETTERS.slice(0, activeLetterCount);
    const isBingo = lineCount >= 5;

    return {
      completedLines,
      lineCount,
      activeLetters,
      isBingo,
    };
  }

  /**
   * Evaluates the outcome of a move for two players.
   * Handles the crucial simultaneous victory edge case correctly!
   */
  public static evaluateMatchOutcome(
    player1Id: string,
    player1Board: BoardArray,
    player2Id: string,
    player2Board: BoardArray,
    calledNumbers: number[]
  ): {
    p1Result: ReturnType<typeof BingoEngine.evaluateBoard>;
    p2Result: ReturnType<typeof BingoEngine.evaluateBoard>;
    isGameOver: boolean;
    winnerId: string | null;
    resultType: 'win' | 'draw' | null;
  } {
    const p1Result = this.evaluateBoard(player1Board, calledNumbers);
    const p2Result = this.evaluateBoard(player2Board, calledNumbers);

    const p1Bingo = p1Result.isBingo;
    const p2Bingo = p2Result.isBingo;

    if (p1Bingo && p2Bingo) {
      // Both reached 5 lines simultaneously on this call -> Draw
      return {
        p1Result,
        p2Result,
        isGameOver: true,
        winnerId: null,
        resultType: 'draw',
      };
    }

    if (p1Bingo) {
      return {
        p1Result,
        p2Result,
        isGameOver: true,
        winnerId: player1Id,
        resultType: 'win',
      };
    }

    if (p2Bingo) {
      return {
        p1Result,
        p2Result,
        isGameOver: true,
        winnerId: player2Id,
        resultType: 'win',
      };
    }

    return {
      p1Result,
      p2Result,
      isGameOver: false,
      winnerId: null,
      resultType: null,
    };
  }
}
