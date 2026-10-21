import { Chess, Move } from 'chess.js';
import {
  BotDifficulty,
  ChessColor,
  ChessMoveInput,
  ChessMoveRecord,
  ChessPieceSymbol,
  ChessState,
} from '../types';
import { SmartBotBase } from './botFramework';

const PIECE_VALUES: Record<ChessPieceSymbol, number> = {
  p: 100,
  n: 320,
  b: 330,
  r: 500,
  q: 900,
  k: 20000,
};

// Piece-Square Tables (from White's perspective, rank 8 at top index 0..7 to rank 1 at 56..63)
const PAWN_PST = [
  0,  0,  0,  0,  0,  0,  0,  0,
  50, 50, 50, 50, 50, 50, 50, 50,
  10, 10, 20, 30, 30, 20, 10, 10,
   5,  5, 10, 25, 25, 10,  5,  5,
   0,  0,  0, 20, 20,  0,  0,  0,
   5, -5,-10,  0,  0,-10, -5,  5,
   5, 10, 10,-20,-20, 10, 10,  5,
   0,  0,  0,  0,  0,  0,  0,  0,
];

const KNIGHT_PST = [
  -50,-40,-30,-30,-30,-30,-40,-50,
  -40,-20,  0,  0,  0,  0,-20,-40,
  -30,  0, 10, 15, 15, 10,  0,-30,
  -30,  5, 15, 20, 20, 15,  5,-30,
  -30,  0, 15, 20, 20, 15,  0,-30,
  -30,  5, 10, 15, 15, 10,  5,-30,
  -40,-20,  0,  5,  5,  0,-20,-40,
  -50,-40,-30,-30,-30,-30,-40,-50,
];

const BISHOP_PST = [
  -20,-10,-10,-10,-10,-10,-10,-20,
  -10,  0,  0,  0,  0,  0,  0,-10,
  -10,  0,  5, 10, 10,  5,  0,-10,
  -10,  5,  5, 10, 10,  5,  5,-10,
  -10,  0, 10, 10, 10, 10,  0,-10,
  -10, 10, 10, 10, 10, 10, 10,-10,
  -10,  5,  0,  0,  0,  0,  5,-10,
  -20,-10,-10,-10,-10,-10,-10,-20,
];

const ROOK_PST = [
    0,  0,  0,  0,  0,  0,  0,  0,
    5, 10, 10, 10, 10, 10, 10,  5,
   -5,  0,  0,  0,  0,  0,  0, -5,
   -5,  0,  0,  0,  0,  0,  0, -5,
   -5,  0,  0,  0,  0,  0,  0, -5,
   -5,  0,  0,  0,  0,  0,  0, -5,
   -5,  0,  0,  0,  0,  0,  0, -5,
    0,  0,  0,  5,  5,  0,  0,  0,
];

const QUEEN_PST = [
  -20,-10,-10, -5, -5,-10,-10,-20,
  -10,  0,  0,  0,  0,  0,  0,-10,
  -10,  0,  5,  5,  5,  5,  0,-10,
   -5,  0,  5,  5,  5,  5,  0, -5,
    0,  0,  5,  5,  5,  5,  0, -5,
  -10,  5,  5,  5,  5,  5,  0,-10,
  -10,  0,  5,  0,  0,  0,  0,-10,
  -20,-10,-10, -5, -5,-10,-10,-20,
];

const KING_PST = [
  -30,-40,-40,-50,-50,-40,-40,-30,
  -30,-40,-40,-50,-50,-40,-40,-30,
  -30,-40,-40,-50,-50,-40,-40,-30,
  -30,-40,-40,-50,-50,-40,-40,-30,
  -20,-30,-30,-40,-40,-30,-30,-20,
  -10,-20,-20,-20,-20,-20,-20,-10,
   20, 20,  0,  0,  0,  0, 20, 20,
   20, 30, 10,  0,  0, 10, 30, 20,
];

const PST_MAP: Record<ChessPieceSymbol, number[]> = {
  p: PAWN_PST,
  n: KNIGHT_PST,
  b: BISHOP_PST,
  r: ROOK_PST,
  q: QUEEN_PST,
  k: KING_PST,
};

export class ChessEngine {
  /**
   * Creates an initial ChessState for two players.
   */
  public static createInitialState(whitePlayerId: string, blackPlayerId: string): ChessState {
    const chess = new Chess();
    return {
      fen: chess.fen(),
      pgn: '',
      turn: 'w',
      inCheck: false,
      isCheckmate: false,
      isStalemate: false,
      isDraw: false,
      drawReason: null,
      moveHistory: [],
      whitePlayerId,
      blackPlayerId,
      lastMove: null,
      capturedByWhite: [],
      capturedByBlack: [],
      drawOfferFromPlayerId: null,
    };
  }

  /**
   * Returns all legal destination squares and move details from a given square.
   */
  public static getLegalMovesFromSquare(
    fen: string,
    square: string
  ): Array<{
    from: string;
    to: string;
    san: string;
    isCapture: boolean;
    isPromotion: boolean;
    flags: string;
  }> {
    try {
      const chess = new Chess(fen);
      const moves = chess.moves({ square: square as any, verbose: true }) as Move[];
      return moves.map((m) => ({
        from: m.from,
        to: m.to,
        san: m.san,
        isCapture: Boolean(m.captured),
        isPromotion: Boolean(m.promotion),
        flags: m.flags,
      }));
    } catch {
      return [];
    }
  }

  /**
   * Validates and applies a move to a ChessState, returning the updated state.
   */
  public static applyMove(
    state: ChessState,
    moveInput: ChessMoveInput
  ): {
    success: boolean;
    error?: string;
    state?: ChessState;
    moveRecord?: ChessMoveRecord;
    isGameOver?: boolean;
    winnerId?: string | null;
    resultType?: 'checkmate' | 'stalemate' | 'repetition' | 'fifty_move' | 'insufficient' | 'draw' | null;
  } {
    try {
      const chess = new Chess(state.fen);

      // Replay move history into a fresh Chess instance if possible so 3-fold repetition works accurately
      const fullGame = new Chess();
      let replayedOk = true;
      for (const rec of state.moveHistory) {
        try {
          fullGame.move({ from: rec.from, to: rec.to, promotion: rec.promotion });
        } catch {
          replayedOk = false;
          break;
        }
      }
      const activeChess = replayedOk && fullGame.fen() === state.fen ? fullGame : chess;

      // Auto-default pawn promotion to queen if not specified
      let promotion = moveInput.promotion;
      if (!promotion) {
        const verboseMoves = activeChess.moves({
          square: moveInput.from as any,
          verbose: true,
        }) as Move[];
        const matchingPromo = verboseMoves.find(
          (m) => m.to === moveInput.to && Boolean(m.promotion)
        );
        if (matchingPromo) {
          promotion = 'q';
        }
      }

      const moveResult = activeChess.move({
        from: moveInput.from,
        to: moveInput.to,
        promotion,
      });

      if (!moveResult) {
        return { success: false, error: 'Illegal chess move' };
      }

      const newFen = activeChess.fen();
      const record: ChessMoveRecord = {
        san: moveResult.san,
        from: moveResult.from,
        to: moveResult.to,
        piece: moveResult.piece as ChessPieceSymbol,
        color: moveResult.color as ChessColor,
        captured: moveResult.captured as ChessPieceSymbol | undefined,
        promotion: moveResult.promotion as ChessPieceSymbol | undefined,
        fenAfter: newFen,
        timestamp: Date.now(),
      };

      const capturedByWhite = [...state.capturedByWhite];
      const capturedByBlack = [...state.capturedByBlack];
      if (moveResult.captured) {
        if (moveResult.color === 'w') {
          capturedByWhite.push(moveResult.captured as ChessPieceSymbol);
        } else {
          capturedByBlack.push(moveResult.captured as ChessPieceSymbol);
        }
      }

      const isCheckmate = activeChess.isCheckmate();
      const isStalemate = activeChess.isStalemate();
      const isThreefold = activeChess.isThreefoldRepetition();
      const isInsufficient = activeChess.isInsufficientMaterial();
      const isDraw = activeChess.isDraw();

      let drawReason: ChessState['drawReason'] = null;
      if (isStalemate) drawReason = 'stalemate';
      else if (isThreefold) drawReason = 'repetition';
      else if (isInsufficient) drawReason = 'insufficient';
      else if (isDraw) drawReason = 'fifty_move';

      const nextState: ChessState = {
        ...state,
        fen: newFen,
        pgn: activeChess.pgn(),
        turn: activeChess.turn() as ChessColor,
        inCheck: activeChess.inCheck(),
        isCheckmate,
        isStalemate,
        isDraw,
        drawReason,
        moveHistory: [...state.moveHistory, record],
        lastMove: { from: moveResult.from, to: moveResult.to },
        capturedByWhite,
        capturedByBlack,
        drawOfferFromPlayerId: null,
      };

      const isGameOver = isCheckmate || isDraw;
      let winnerId: string | null = null;
      let resultType:
        | 'checkmate'
        | 'stalemate'
        | 'repetition'
        | 'fifty_move'
        | 'insufficient'
        | 'draw'
        | null = null;

      if (isCheckmate) {
        winnerId = moveResult.color === 'w' ? state.whitePlayerId : state.blackPlayerId;
        resultType = 'checkmate';
      } else if (isDraw) {
        winnerId = null;
        resultType = drawReason || 'draw';
      }

      return {
        success: true,
        state: nextState,
        moveRecord: record,
        isGameOver,
        winnerId,
        resultType,
      };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Illegal chess move' };
    }
  }

  /**
   * Undoes the last full pair of moves (or single move) for offline bot games.
   */
  public static undoMoves(state: ChessState, count: number = 2): ChessState {
    const targetHistory = state.moveHistory.slice(0, Math.max(0, state.moveHistory.length - count));
    const chess = new Chess();
    const capturedByWhite: ChessPieceSymbol[] = [];
    const capturedByBlack: ChessPieceSymbol[] = [];

    for (const rec of targetHistory) {
      const m = chess.move({ from: rec.from, to: rec.to, promotion: rec.promotion });
      if (m?.captured) {
        if (m.color === 'w') capturedByWhite.push(m.captured as ChessPieceSymbol);
        else capturedByBlack.push(m.captured as ChessPieceSymbol);
      }
    }

    const last = targetHistory[targetHistory.length - 1] || null;
    return {
      ...state,
      fen: chess.fen(),
      pgn: chess.pgn(),
      turn: chess.turn() as ChessColor,
      inCheck: chess.inCheck(),
      isCheckmate: chess.isCheckmate(),
      isStalemate: chess.isStalemate(),
      isDraw: chess.isDraw(),
      drawReason: null,
      moveHistory: targetHistory,
      lastMove: last ? { from: last.from, to: last.to } : null,
      capturedByWhite,
      capturedByBlack,
      drawOfferFromPlayerId: null,
    };
  }

  /**
   * Static board evaluation from the perspective of `perspectiveColor`.
   */
  public static evaluatePosition(chess: Chess, perspectiveColor: ChessColor): number {
    if (chess.isCheckmate()) {
      return chess.turn() === perspectiveColor ? -99999 : 99999;
    }
    if (chess.isDraw()) {
      return 0;
    }

    const board = chess.board();
    let score = 0;

    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const cell = board[r][c];
        if (!cell) continue;

        const pieceVal = PIECE_VALUES[cell.type as ChessPieceSymbol] || 0;
        const sqIdx = cell.color === 'w' ? r * 8 + c : (7 - r) * 8 + c;
        const pstVal = PST_MAP[cell.type as ChessPieceSymbol]?.[sqIdx] || 0;
        const total = pieceVal + pstVal;

        if (cell.color === perspectiveColor) {
          score += total;
        } else {
          score -= total;
        }
      }
    }

    if (chess.inCheck()) {
      score += chess.turn() === perspectiveColor ? -35 : 35;
    }

    return score;
  }
}

/**
 * Smart Chess Bot with Easy, Medium (Minimax + PST), and Hard (Alpha-Beta + Move Ordering + Opening Book)
 */
export class ChessBot extends SmartBotBase<ChessState, ChessMoveInput> {
  // Compact Grandmaster Opening Book for Hard Bot
  private static readonly OPENING_BOOK: Record<string, ChessMoveInput[]> = {
    'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq -': [
      { from: 'e2', to: 'e4' },
      { from: 'd2', to: 'd4' },
      { from: 'c2', to: 'c4' },
    ],
    'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq -': [
      { from: 'e7', to: 'e5' },
      { from: 'c7', to: 'c5' },
      { from: 'e7', to: 'e6' },
    ],
    'rnbqkbnr/pppppppp/8/8/3P4/8/PPP1PPPP/RNBQKBNR b KQkq -': [
      { from: 'd7', to: 'd5' },
      { from: 'g8', to: 'f6' },
    ],
    'rnbqkbnr/pppp1ppp/8/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R b KQkq -': [
      { from: 'b8', to: 'c6' },
      { from: 'g8', to: 'f6' },
    ],
  };

  public getLegalMoves(state: ChessState): ChessMoveInput[] {
    try {
      const chess = new Chess(state.fen);
      const verbose = chess.moves({ verbose: true }) as Move[];
      return verbose.map((m) => ({
        from: m.from,
        to: m.to,
        promotion: (m.promotion as 'q' | 'r' | 'b' | 'n' | undefined) || undefined,
      }));
    } catch {
      return [];
    }
  }

  public calculateMoveScore(
    state: ChessState,
    move: ChessMoveInput,
    difficulty: BotDifficulty = this.difficulty
  ): number {
    const chess = new Chess(state.fen);
    const botColor = chess.turn() as ChessColor;

    const applied = chess.move({
      from: move.from,
      to: move.to,
      promotion: move.promotion || 'q',
    });
    if (!applied) return -Infinity;

    if (chess.isCheckmate()) return 100000;

    if (difficulty === 'easy') {
      // Easy: mostly random with minor preference for captures
      const captureBonus = applied.captured ? 15 : 0;
      return Math.random() * 50 + captureBonus;
    }

    if (difficulty === 'medium') {
      // Medium: 2-ply Minimax with Material & Positional PST evaluation
      const opponentResponses = chess.moves({ verbose: true }) as Move[];
      if (opponentResponses.length === 0) {
        return ChessEngine.evaluatePosition(chess, botColor);
      }

      let worstReplyScore = Infinity;
      for (const reply of opponentResponses) {
        chess.move(reply);
        const evalScore = ChessEngine.evaluatePosition(chess, botColor);
        if (evalScore < worstReplyScore) {
          worstReplyScore = evalScore;
        }
        chess.undo();
      }
      return worstReplyScore + (Math.random() * 6 - 3);
    }

    // Hard: Depth-3 Alpha-Beta Search with Move Ordering (MVV-LVA) + Time Bound
    return this.alphaBeta(chess, 2, -Infinity, Infinity, false, botColor);
  }

  public override selectBotMove(state: ChessState, difficulty?: BotDifficulty): ChessMoveInput | null {
    const activeDifficulty = difficulty || this.difficulty;

    // In Hard mode, consult Grandmaster Opening Book first
    if (activeDifficulty === 'hard') {
      const fenKey = state.fen.split(' ').slice(0, 4).join(' ');
      const bookMoves = ChessBot.OPENING_BOOK[fenKey];
      if (bookMoves && bookMoves.length > 0) {
        const legal = this.getLegalMoves(state);
        const validBook = bookMoves.filter((bm) =>
          legal.some((lm) => lm.from === bm.from && lm.to === bm.to)
        );
        if (validBook.length > 0) {
          return validBook[Math.floor(Math.random() * validBook.length)];
        }
      }
    }

    return super.selectBotMove(state, activeDifficulty);
  }

  private alphaBeta(
    chess: Chess,
    depth: number,
    alpha: number,
    beta: number,
    maximizingPlayer: boolean,
    botColor: ChessColor
  ): number {
    if (depth === 0 || chess.isGameOver()) {
      return ChessEngine.evaluatePosition(chess, botColor);
    }

    const moves = (chess.moves({ verbose: true }) as Move[]).sort((a, b) => {
      const scoreA = (a.captured ? PIECE_VALUES[a.captured as ChessPieceSymbol] : 0) + (a.promotion ? 800 : 0);
      const scoreB = (b.captured ? PIECE_VALUES[b.captured as ChessPieceSymbol] : 0) + (b.promotion ? 800 : 0);
      return scoreB - scoreA;
    });

    if (maximizingPlayer) {
      let maxEval = -Infinity;
      for (const move of moves) {
        chess.move(move);
        const evaluation = this.alphaBeta(chess, depth - 1, alpha, beta, false, botColor);
        chess.undo();
        if (evaluation > maxEval) maxEval = evaluation;
        if (evaluation > alpha) alpha = evaluation;
        if (beta <= alpha) break;
      }
      return maxEval;
    } else {
      let minEval = Infinity;
      for (const move of moves) {
        chess.move(move);
        const evaluation = this.alphaBeta(chess, depth - 1, alpha, beta, true, botColor);
        chess.undo();
        if (evaluation < minEval) minEval = evaluation;
        if (evaluation < beta) beta = evaluation;
        if (beta <= alpha) break;
      }
      return minEval;
    }
  }
}
