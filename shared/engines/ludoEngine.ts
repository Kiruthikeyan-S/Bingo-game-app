import {
  BotDifficulty,
  LudoColor,
  LudoMoveOption,
  LudoState,
  LudoToken,
} from '../types';
import { SmartBotBase } from './botFramework';

export const LUDO_COLORS: LudoColor[] = ['red', 'green', 'yellow', 'blue'];

/**
 * Starting square offset on the 52-square perimeter track (0..51) for each color.
 */
export const COLOR_START_OFFSET: Record<LudoColor, number> = {
  red: 0,
  green: 13,
  yellow: 26,
  blue: 39,
};

/**
 * The 8 safe squares on the 52-square global perimeter track:
 * - Each color's start square: 0 (Red), 13 (Green), 26 (Yellow), 39 (Blue)
 * - Each color's star square (8 steps after start): 8, 21, 34, 47
 */
export const SAFE_GLOBAL_SQUARES = new Set<number>([0, 8, 13, 21, 26, 34, 39, 47]);

export const HOME_STEP = 56;
export const LAST_MAIN_TRACK_STEP = 50;

export class LudoEngine {
  /**
   * Unbiased 6-sided dice generator (1..6).
   */
  public static rollDice(): number {
    return Math.floor(Math.random() * 6) + 1;
  }

  /**
   * Creates an initial Ludo game state for 2 to 4 players.
   */
  public static createInitialState(
    playerIds: string[],
    customColors?: LudoColor[]
  ): LudoState {
    const count = Math.min(4, Math.max(2, playerIds.length));
    // For 2 players, standard opposite corners are Red & Yellow (or custom)
    const defaultColors: LudoColor[] =
      count === 2
        ? ['red', 'yellow']
        : count === 3
        ? ['red', 'green', 'yellow']
        : ['red', 'green', 'yellow', 'blue'];

    const activeColors = customColors && customColors.length === count ? customColors : defaultColors;

    const colorPlayerMap: Record<LudoColor, string> = {
      red: '',
      green: '',
      yellow: '',
      blue: '',
    };

    activeColors.forEach((col, idx) => {
      colorPlayerMap[col] = playerIds[idx];
    });

    const tokens: Record<LudoColor, LudoToken[]> = {
      red: [0, 1, 2, 3].map((id) => ({ id, color: 'red', step: -1 })),
      green: [0, 1, 2, 3].map((id) => ({ id, color: 'green', step: -1 })),
      yellow: [0, 1, 2, 3].map((id) => ({ id, color: 'yellow', step: -1 })),
      blue: [0, 1, 2, 3].map((id) => ({ id, color: 'blue', step: -1 })),
    };

    return {
      activeColors,
      colorPlayerMap,
      tokens,
      currentTurnColor: activeColors[0],
      diceValue: null,
      canRollDice: true,
      consecutiveSixes: 0,
      lastActionText: 'Match started! Roll the dice.',
      winnerOrder: [],
    };
  }

  /**
   * Converts a color's relative step (0..50) into the global 52-square track index (0..51).
   * Returns null if token is in base (-1) or in the private home stretch (51..56).
   */
  public static getGlobalSquare(color: LudoColor, step: number): number | null {
    if (step < 0 || step > LAST_MAIN_TRACK_STEP) {
      return null;
    }
    return (COLOR_START_OFFSET[color] + step) % 52;
  }

  /**
   * Returns true if the global square is a protected star/start safe square.
   */
  public static isSafeGlobalSquare(globalSquare: number | null): boolean {
    if (globalSquare === null) return true;
    return SAFE_GLOBAL_SQUARES.has(globalSquare);
  }

  /**
   * Returns all legal token moves for the current turn color and dice value.
   */
  public static getLegalMoves(
    state: LudoState,
    color: LudoColor = state.currentTurnColor,
    diceValue: number | null = state.diceValue
  ): LudoMoveOption[] {
    if (!diceValue || diceValue < 1 || diceValue > 6) {
      return [];
    }

    const playerTokens = state.tokens[color] || [];
    const options: LudoMoveOption[] = [];

    for (const token of playerTokens) {
      // Token already finished
      if (token.step === HOME_STEP) continue;

      // Token in base (-1): requires a 6 to exit to step 0
      if (token.step === -1) {
        if (diceValue === 6) {
          const destGlobal = this.getGlobalSquare(color, 0)!;
          options.push({
            tokenId: token.id,
            fromStep: -1,
            toStep: 0,
            isExitBase: true,
            isHomeEntry: false,
            landsOnSafeSquare: this.isSafeGlobalSquare(destGlobal),
          });
        }
        continue;
      }

      // Token on board: exact roll required to reach HOME_STEP (56)
      const targetStep = token.step + diceValue;
      if (targetStep > HOME_STEP) {
        continue;
      }

      const isHomeEntry = targetStep === HOME_STEP;
      const destGlobal = this.getGlobalSquare(color, targetStep);
      const landsOnSafeSquare =
        targetStep > LAST_MAIN_TRACK_STEP || this.isSafeGlobalSquare(destGlobal);

      let capturesToken: LudoMoveOption['capturesToken'] = undefined;

      // Check for opponent capture on non-safe main track squares
      if (destGlobal !== null && !this.isSafeGlobalSquare(destGlobal)) {
        for (const oppColor of state.activeColors) {
          if (oppColor === color) continue;
          const oppTokens = state.tokens[oppColor] || [];
          const oppTokensOnSquare = oppTokens.filter(
            (ot) => this.getGlobalSquare(oppColor, ot.step) === destGlobal
          );
          // Standard Ludo: single opponent token on a non-safe square is captured
          if (oppTokensOnSquare.length === 1) {
            capturesToken = {
              color: oppColor,
              tokenId: oppTokensOnSquare[0].id,
              globalSquare: destGlobal,
            };
            break;
          }
        }
      }

      options.push({
        tokenId: token.id,
        fromStep: token.step,
        toStep: targetStep,
        isExitBase: false,
        isHomeEntry,
        capturesToken,
        landsOnSafeSquare,
      });
    }

    return options;
  }

  /**
   * Processes a dice roll for the current turn player.
   * Handles 3 consecutive sixes penalty and auto-turn-advance when no legal moves exist.
   */
  public static applyDiceRoll(
    state: LudoState,
    forcedDiceValue?: number
  ): {
    state: LudoState;
    diceValue: number;
    legalMoves: LudoMoveOption[];
    autoTurnPassed: boolean;
  } {
    const diceValue = forcedDiceValue ?? this.rollDice();
    const nextConsecutiveSixes = diceValue === 6 ? state.consecutiveSixes + 1 : 0;

    // Three consecutive 6s forfeits turn immediately
    if (nextConsecutiveSixes >= 3) {
      const nextColor = this.getNextTurnColor(state);
      const updatedState: LudoState = {
        ...state,
        diceValue,
        canRollDice: true,
        consecutiveSixes: 0,
        currentTurnColor: nextColor,
        lastActionText: `${state.currentTurnColor.toUpperCase()} rolled three 6s! Turn passes to ${nextColor.toUpperCase()}.`,
      };
      return {
        state: updatedState,
        diceValue,
        legalMoves: [],
        autoTurnPassed: true,
      };
    }

    const tempState: LudoState = {
      ...state,
      diceValue,
      canRollDice: false,
      consecutiveSixes: nextConsecutiveSixes,
    };

    const legalMoves = this.getLegalMoves(tempState, state.currentTurnColor, diceValue);

    if (legalMoves.length === 0) {
      const nextColor = this.getNextTurnColor(state);
      const passedState: LudoState = {
        ...tempState,
        canRollDice: true,
        consecutiveSixes: 0,
        currentTurnColor: nextColor,
        lastActionText: `${state.currentTurnColor.toUpperCase()} rolled ${diceValue} (no legal moves).`,
      };
      return {
        state: passedState,
        diceValue,
        legalMoves: [],
        autoTurnPassed: true,
      };
    }

    return {
      state: {
        ...tempState,
        lastActionText: `${state.currentTurnColor.toUpperCase()} rolled a ${diceValue}! Select a token.`,
      },
      diceValue,
      legalMoves,
      autoTurnPassed: false,
    };
  }

  /**
   * Executes a validated token move and updates turn, captures, and win condition.
   */
  public static applyTokenMove(
    state: LudoState,
    tokenId: number
  ): {
    success: boolean;
    error?: string;
    state?: LudoState;
    moveApplied?: LudoMoveOption;
    grantedExtraTurn?: boolean;
    isGameOver?: boolean;
    winnerColor?: LudoColor | null;
  } {
    if (state.canRollDice || state.diceValue === null) {
      return { success: false, error: 'Must roll the dice before moving a token' };
    }

    const color = state.currentTurnColor;
    const legalMoves = this.getLegalMoves(state, color, state.diceValue);
    const chosenMove = legalMoves.find((m) => m.tokenId === tokenId);

    if (!chosenMove) {
      return { success: false, error: 'Illegal token move for current dice roll' };
    }

    // Deep clone tokens
    const nextTokens: Record<LudoColor, LudoToken[]> = {
      red: state.tokens.red.map((t) => ({ ...t })),
      green: state.tokens.green.map((t) => ({ ...t })),
      yellow: state.tokens.yellow.map((t) => ({ ...t })),
      blue: state.tokens.blue.map((t) => ({ ...t })),
    };

    const movingToken = nextTokens[color].find((t) => t.id === tokenId)!;
    movingToken.step = chosenMove.toStep;

    let actionDetail = `${color.toUpperCase()} moved token #${tokenId + 1}`;
    if (chosenMove.isExitBase) {
      actionDetail = `${color.toUpperCase()} deployed token #${tokenId + 1} onto the track!`;
    } else if (chosenMove.isHomeEntry) {
      actionDetail = `${color.toUpperCase()} brought token #${tokenId + 1} HOME!`;
    }

    // Handle capture
    if (chosenMove.capturesToken) {
      const { color: victimColor, tokenId: victimId } = chosenMove.capturesToken;
      const victimToken = nextTokens[victimColor].find((t) => t.id === victimId);
      if (victimToken) {
        victimToken.step = -1; // Send back to home base!
        actionDetail = `${color.toUpperCase()} captured ${victimColor.toUpperCase()}'s token! Bonus roll!`;
      }
    }

    // Check if all 4 tokens of current color have reached HOME_STEP (56)
    const allFourHome = nextTokens[color].every((t) => t.step === HOME_STEP);
    const nextWinnerOrder = [...state.winnerOrder];
    if (allFourHome && !nextWinnerOrder.includes(color)) {
      nextWinnerOrder.push(color);
    }

    // First player to get all 4 tokens home wins the match!
    if (allFourHome) {
      const finishedState: LudoState = {
        ...state,
        tokens: nextTokens,
        diceValue: null,
        canRollDice: false,
        winnerOrder: nextWinnerOrder,
        lastActionText: `${color.toUpperCase()} moved all 4 tokens HOME and won the match!`,
      };
      return {
        success: true,
        state: finishedState,
        moveApplied: chosenMove,
        grantedExtraTurn: false,
        isGameOver: true,
        winnerColor: color,
      };
    }

    // Extra turn granted on rolling 6, capturing an opponent token, or getting a token home
    const grantedExtraTurn =
      state.diceValue === 6 ||
      Boolean(chosenMove.capturesToken) ||
      chosenMove.isHomeEntry;

    const nextTurnColor = grantedExtraTurn ? color : this.getNextTurnColor(state);

    const nextState: LudoState = {
      ...state,
      tokens: nextTokens,
      currentTurnColor: nextTurnColor,
      diceValue: null,
      canRollDice: true,
      consecutiveSixes: grantedExtraTurn ? state.consecutiveSixes : 0,
      winnerOrder: nextWinnerOrder,
      lastActionText: grantedExtraTurn
        ? `${actionDetail} — Extra Turn!`
        : `${actionDetail}. Now ${nextTurnColor.toUpperCase()}'s turn.`,
    };

    return {
      success: true,
      state: nextState,
      moveApplied: chosenMove,
      grantedExtraTurn,
      isGameOver: false,
      winnerColor: null,
    };
  }

  public static getNextTurnColor(state: LudoState): LudoColor {
    const idx = state.activeColors.indexOf(state.currentTurnColor);
    for (let offset = 1; offset <= state.activeColors.length; offset++) {
      const candidate = state.activeColors[(idx + offset) % state.activeColors.length];
      if (!state.winnerOrder.includes(candidate)) {
        return candidate;
      }
    }
    return state.currentTurnColor;
  }
}

/**
 * Smart Ludo Bot with Easy, Medium, and Hard strategic decision engines.
 */
export class LudoBot extends SmartBotBase<LudoState, LudoMoveOption> {
  public getLegalMoves(state: LudoState): LudoMoveOption[] {
    return LudoEngine.getLegalMoves(state, state.currentTurnColor, state.diceValue);
  }

  public calculateMoveScore(
    state: LudoState,
    move: LudoMoveOption,
    difficulty: BotDifficulty = this.difficulty
  ): number {
    if (difficulty === 'easy') {
      return Math.random();
    }

    let score = 0;

    // Medium: Prefer captures, entering home, exiting base, and safe squares
    if (move.capturesToken) score += 300;
    if (move.isHomeEntry) score += 260;
    if (move.isExitBase) score += 180;
    if (move.landsOnSafeSquare) score += 95;
    score += move.toStep * 1.5;

    if (difficulty === 'medium') {
      return score + Math.random() * 5;
    }

    // Hard: Full threat & risk evaluation
    const color = state.currentTurnColor;
    const fromGlobal = LudoEngine.getGlobalSquare(color, move.fromStep);
    const toGlobal = LudoEngine.getGlobalSquare(color, move.toStep);

    // 1. Check if token is currently in danger (an opponent is 1..6 steps behind on non-safe square)
    const currentlyUnderThreat =
      fromGlobal !== null &&
      !LudoEngine.isSafeGlobalSquare(fromGlobal) &&
      this.isSquareThreatenedByOpponent(state, color, fromGlobal);

    if (currentlyUnderThreat) {
      // High priority to escape danger!
      score += 140;
    }

    // 2. Penalize leaving a safe square to land on a threatened square
    const wasOnSafe =
      move.fromStep >= 0 &&
      move.fromStep <= LAST_MAIN_TRACK_STEP &&
      LudoEngine.isSafeGlobalSquare(fromGlobal);

    const destUnderThreat =
      toGlobal !== null &&
      !LudoEngine.isSafeGlobalSquare(toGlobal) &&
      this.isSquareThreatenedByOpponent(state, color, toGlobal);

    if (destUnderThreat && !move.capturesToken) {
      // More costly if token is far along the track!
      score -= 110 + move.toStep * 2;
    }

    if (wasOnSafe && destUnderThreat) {
      score -= 60;
    }

    // 3. Entering private home stretch (steps 51..55) makes token 100% immune to capture
    if (move.fromStep <= LAST_MAIN_TRACK_STEP && move.toStep > LAST_MAIN_TRACK_STEP) {
      score += 160;
    }

    return score;
  }

  private isSquareThreatenedByOpponent(
    state: LudoState,
    myColor: LudoColor,
    targetGlobalSquare: number
  ): boolean {
    for (const oppColor of state.activeColors) {
      if (oppColor === myColor) continue;
      for (const oppToken of state.tokens[oppColor] || []) {
        const oppGlobal = LudoEngine.getGlobalSquare(oppColor, oppToken.step);
        if (oppGlobal === null) continue;
        const dist = (targetGlobalSquare - oppGlobal + 52) % 52;
        if (dist >= 1 && dist <= 6 && oppToken.step + dist <= LAST_MAIN_TRACK_STEP) {
          return true;
        }
      }
    }
    return false;
  }
}
