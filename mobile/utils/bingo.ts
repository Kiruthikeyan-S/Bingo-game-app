import { BoardArray, LineHighlight } from '../../shared/types';

export const BINGO_LETTERS = ['B', 'I', 'N', 'G', 'O'] as const;

export const ALL_LINES = [
  // 5 rows
  { type: 'row' as const, index: 0, indices: [0, 1, 2, 3, 4] },
  { type: 'row' as const, index: 1, indices: [5, 6, 7, 8, 9] },
  { type: 'row' as const, index: 2, indices: [10, 11, 12, 13, 14] },
  { type: 'row' as const, index: 3, indices: [15, 16, 17, 18, 19] },
  { type: 'row' as const, index: 4, indices: [20, 21, 22, 23, 24] },
  // 5 columns
  { type: 'col' as const, index: 0, indices: [0, 5, 10, 15, 20] },
  { type: 'col' as const, index: 1, indices: [1, 6, 11, 16, 21] },
  { type: 'col' as const, index: 2, indices: [2, 7, 12, 17, 22] },
  { type: 'col' as const, index: 3, indices: [3, 8, 13, 18, 23] },
  { type: 'col' as const, index: 4, indices: [4, 9, 14, 19, 24] },
  // 2 diagonals
  { type: 'diag_main' as const, index: 0, indices: [0, 6, 12, 18, 24] },
  { type: 'diag_anti' as const, index: 0, indices: [4, 8, 12, 16, 20] },
];

/**
 * Shuffles numbers 1 to 25.
 */
export function generateRandomBoard(): BoardArray {
  const nums = Array.from({ length: 25 }, (_, i) => i + 1);
  for (let i = nums.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [nums[i], nums[j]] = [nums[j], nums[i]];
  }
  return nums;
}

/**
 * Detects completed lines and returns set of highlighted cell indices.
 */
export function calculateCompletedLines(
  board: BoardArray,
  calledNumbers: number[]
): {
  lines: LineHighlight[];
  lineCount: number;
  highlightedIndices: Set<number>;
  activeLetters: string[];
} {
  const calledSet = new Set(calledNumbers);
  const lines: LineHighlight[] = [];
  const highlightedIndices = new Set<number>();

  for (const line of ALL_LINES) {
    const isComplete = line.indices.every((idx) => calledSet.has(board[idx]));
    if (isComplete) {
      lines.push(line);
      line.indices.forEach((idx) => highlightedIndices.add(idx));
    }
  }

  const lineCount = lines.length;
  const activeCount = Math.min(lineCount, 5);
  const activeLetters = BINGO_LETTERS.slice(0, activeCount) as unknown as string[];

  return {
    lines,
    lineCount,
    highlightedIndices,
    activeLetters,
  };
}
