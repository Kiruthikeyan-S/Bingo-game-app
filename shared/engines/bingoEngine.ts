import { BoardArray, BotDifficulty, LineHighlight } from '../types';
import { BoardSchema, CalledNumberSchema } from '../schemas';
import { SmartBotBase } from './botFramework';

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

  /**
   * Supports 2 to 4 players simultaneously for multiplayer Bingo rooms.
   */
  public static evaluateMultiPlayerOutcome(
    playerBoards: Record<string, BoardArray>,
    calledNumbers: number[]
  ): {
    evaluations: Record<string, ReturnType<typeof BingoEngine.evaluateBoard>>;
    isGameOver: boolean;
    winnerId: string | null;
    resultType: 'win' | 'draw' | null;
  } {
    const evaluations: Record<string, ReturnType<typeof BingoEngine.evaluateBoard>> = {};
    const bingoPlayers: string[] = [];

    for (const [playerId, board] of Object.entries(playerBoards)) {
      const res = this.evaluateBoard(board, calledNumbers);
      evaluations[playerId] = res;
      if (res.isBingo) {
        bingoPlayers.push(playerId);
      }
    }

    if (bingoPlayers.length > 1) {
      return {
        evaluations,
        isGameOver: true,
        winnerId: null,
        resultType: 'draw',
      };
    }

    if (bingoPlayers.length === 1) {
      return {
        evaluations,
        isGameOver: true,
        winnerId: bingoPlayers[0],
        resultType: 'win',
      };
    }

    return {
      evaluations,
      isGameOver: false,
      winnerId: null,
      resultType: null,
    };
  }
}

export interface BingoBotState {
  botBoard: BoardArray;
  calledNumbers: number[];
  opponentCalledHistory?: number[]; // Publicly observable numbers called by opponent
}

/**
 * Smart Bingo Bot with 3 distinct difficulty levels.
 * Strictly uses only its own board and publicly called numbers (never accesses opponent's secret board).
 */
export class BingoBot extends SmartBotBase<BingoBotState, number> {
  public getLegalMoves(state: BingoBotState): number[] {
    const calledSet = new Set(state.calledNumbers);
    const legal: number[] = [];
    for (let n = 1; n <= 25; n++) {
      if (!calledSet.has(n)) {
        legal.push(n);
      }
    }
    return legal;
  }

  public calculateMoveScore(
    state: BingoBotState,
    move: number,
    difficulty: BotDifficulty = this.difficulty
  ): number {
    if (difficulty === 'easy') {
      return Math.random();
    }

    const { botBoard, calledNumbers } = state;
    const cellIndex = botBoard.indexOf(move);
    if (cellIndex === -1) return 0;

    const calledSet = new Set(calledNumbers);
    const nextCalled = [...calledNumbers, move];
    const currentEval = BingoEngine.evaluateBoard(botBoard, calledNumbers);
    const nextEval = BingoEngine.evaluateBoard(botBoard, nextCalled);

    const immediateLinesGained = nextEval.lineCount - currentEval.lineCount;

    // Count how many lines pass through cellIndex and how close each is to completion
    let lineProgressScore = 0;
    let linesContainingCell = 0;

    for (const line of ALL_LINES) {
      if (line.indices.includes(cellIndex)) {
        linesContainingCell++;
        let markedCount = 0;
        for (const idx of line.indices) {
          if (calledSet.has(botBoard[idx])) {
            markedCount++;
          }
        }
        // Exponential weight for near-complete lines (4/5 -> 100, 3/5 -> 30, 2/5 -> 10, 1/5 -> 3)
        if (markedCount === 4) lineProgressScore += 120;
        else if (markedCount === 3) lineProgressScore += 35;
        else if (markedCount === 2) lineProgressScore += 12;
        else if (markedCount === 1) lineProgressScore += 4;
        else lineProgressScore += 1;
      }
    }

    if (difficulty === 'medium') {
      return immediateLinesGained * 150 + lineProgressScore;
    }

    // HARD difficulty:
    // 1. Immediate win check (completes 5th line)
    if (nextEval.isBingo) {
      return 100000 + nextEval.lineCount * 1000;
    }

    // 2. Multi-line fork creation (count how many lines become 4/5 after calling `move`)
    const nextCalledSet = new Set(nextCalled);
    let fourOfFiveCount = 0;
    let threeOfFiveCount = 0;
    for (const line of ALL_LINES) {
      let marked = 0;
      for (const idx of line.indices) {
        if (nextCalledSet.has(botBoard[idx])) marked++;
      }
      if (marked === 4) fourOfFiveCount++;
      else if (marked === 3) threeOfFiveCount++;
    }

    // 3. Positional synergy (center cell 12 is in 4 lines, diagonal cells are in 3 lines)
    const intersectionBonus = linesContainingCell * 15;

    // 4. Defensive heuristic using only public info:
    // Human players often place sequential numbers (1,2,3.. or 5,10,15..) near edges/corners;
    // slightly deprioritize numbers adjacent to opponent's recent calls unless it strongly helps bot.
    let defensiveAdjustment = 0;
    if (state.opponentCalledHistory && state.opponentCalledHistory.length > 0) {
      const lastOppCall = state.opponentCalledHistory[state.opponentCalledHistory.length - 1];
      if (Math.abs(move - lastOppCall) === 1) {
        defensiveAdjustment -= 4;
      }
    }

    return (
      immediateLinesGained * 250 +
      fourOfFiveCount * 90 +
      threeOfFiveCount * 25 +
      lineProgressScore +
      intersectionBonus +
      defensiveAdjustment
    );
  }
}
