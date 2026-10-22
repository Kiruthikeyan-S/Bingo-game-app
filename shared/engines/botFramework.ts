import { BotDifficulty } from '../types';

export interface ISmartBot<TState, TMove> {
  difficulty: BotDifficulty;
  getLegalMoves(state: TState): TMove[];
  calculateMoveScore(state: TState, move: TMove, difficulty?: BotDifficulty): number;
  selectBotMove(state: TState, difficulty?: BotDifficulty): TMove | null;
  executeBotMove(
    state: TState,
    onMoveSelected: (move: TMove) => void,
    options?: {
      minDelayMs?: number;
      maxDelayMs?: number;
      isGameActive?: () => boolean;
    }
  ): Promise<TMove | null>;
  changeDifficulty(difficulty: BotDifficulty): void;
  setDifficulty?(difficulty: BotDifficulty): void;
}

/**
 * Reusable Bot Base Class implementing the bot lifecycle:
 * - getLegalMoves()
 * - calculateMoveScore()
 * - selectBotMove()
 * - executeBotMove()
 * - changeDifficulty()
 */
export abstract class SmartBotBase<TState, TMove> implements ISmartBot<TState, TMove> {
  public difficulty: BotDifficulty;

  constructor(difficulty: BotDifficulty = 'medium') {
    this.difficulty = difficulty;
  }

  public changeDifficulty(difficulty: BotDifficulty): void {
    this.difficulty = difficulty;
  }

  public setDifficulty(difficulty: BotDifficulty): void {
    this.difficulty = difficulty;
  }

  public abstract getLegalMoves(state: TState): TMove[];

  public abstract calculateMoveScore(
    state: TState,
    move: TMove,
    difficulty?: BotDifficulty
  ): number;

  public selectBotMove(state: TState, difficulty?: BotDifficulty): TMove | null {
    const activeDifficulty = difficulty || this.difficulty;
    const legalMoves = this.getLegalMoves(state);
    if (legalMoves.length === 0) {
      return null;
    }

    if (legalMoves.length === 1) {
      return legalMoves[0];
    }

    if (activeDifficulty === 'easy') {
      const idx = Math.floor(Math.random() * legalMoves.length);
      return legalMoves[idx];
    }

    let bestScore = -Infinity;
    let bestMoves: TMove[] = [];

    for (const move of legalMoves) {
      const score = this.calculateMoveScore(state, move, activeDifficulty);
      if (score > bestScore) {
        bestScore = score;
        bestMoves = [move];
      } else if (Math.abs(score - bestScore) < 1e-6) {
        bestMoves.push(move);
      }
    }

    const chosenIdx = Math.floor(Math.random() * bestMoves.length);
    return bestMoves[chosenIdx] ?? legalMoves[0];
  }

  public async executeBotMove(
    state: TState,
    onMoveSelected: (move: TMove) => void,
    options?: {
      minDelayMs?: number;
      maxDelayMs?: number;
      isGameActive?: () => boolean;
    }
  ): Promise<TMove | null> {
    const minDelay = options?.minDelayMs ?? 120;
    const maxDelay = options?.maxDelayMs ?? 220;
    const delay = Math.floor(minDelay + Math.random() * Math.max(0, maxDelay - minDelay));

    await new Promise((resolve) => setTimeout(resolve, delay));

    if (options?.isGameActive && !options.isGameActive()) {
      return null;
    }

    const move = this.selectBotMove(state, this.difficulty);
    if (move === null) {
      return null;
    }

    if (options?.isGameActive && !options.isGameActive()) {
      return null;
    }

    onMoveSelected(move);
    return move;
  }
}
