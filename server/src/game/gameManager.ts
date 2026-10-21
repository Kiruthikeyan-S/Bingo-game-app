import { RoomSession } from './roomManager';
import { BingoEngine } from './bingoEngine';
import { ChessEngine } from '../../../shared/engines/chessEngine';
import { LudoEngine } from '../../../shared/engines/ludoEngine';
import {
  BoardArray,
  ChessMoveInput,
  GameResultType,
  PlayerScoreSummary,
} from '../../../shared/types';

export interface CallNumberResult {
  success: boolean;
  error?: string;
  number?: number;
  calledByPlayerId?: string;
  nextTurnPlayerId?: string;
  playerLines?: Record<string, number>;
  isGameOver?: boolean;
  winnerId?: string | null;
  resultType?: GameResultType | null;
  summary?: PlayerScoreSummary[];
  p1Evaluation?: ReturnType<typeof BingoEngine.evaluateBoard>;
  p2Evaluation?: ReturnType<typeof BingoEngine.evaluateBoard>;
  evaluations?: Record<string, ReturnType<typeof BingoEngine.evaluateBoard>>;
}

export class GameManager {
  /**
   * Processes an authoritative Bingo number call from a player (supports 2 to 4 players).
   */
  public static processCallNumber(
    room: RoomSession,
    callerPlayerId: string,
    number: number
  ): CallNumberResult {
    if (room.status !== 'playing') {
      return { success: false, error: 'Match is not currently in playing status' };
    }

    if (room.currentTurnPlayerId !== callerPlayerId) {
      return { success: false, error: 'Not your turn to select a number' };
    }

    const val = BingoEngine.validateCall(number, room.calledNumbers);
    if (!val.valid) {
      return { success: false, error: val.error };
    }

    room.calledNumbers.push(number);

    const playerBoardsRecord: Record<string, BoardArray> = {};
    for (const pId of room.playerOrder) {
      const b = room.boards.get(pId);
      if (!b) {
        return { success: false, error: 'Missing board state for players' };
      }
      playerBoardsRecord[pId] = b;
    }

    const multiOutcome = BingoEngine.evaluateMultiPlayerOutcome(
      playerBoardsRecord,
      room.calledNumbers
    );

    const linesRecord: Record<string, number> = {};
    for (const pId of room.playerOrder) {
      const count = multiOutcome.evaluations[pId]?.lineCount || 0;
      room.playerLines.set(pId, count);
      linesRecord[pId] = count;
    }

    const [p1Id, p2Id] = room.playerOrder;

    if (multiOutcome.isGameOver) {
      room.status = 'finished';
      room.winnerId = multiOutcome.winnerId;
      room.resultType = multiOutcome.resultType;
      room.currentTurnPlayerId = null;

      const summary: PlayerScoreSummary[] = room.playerOrder.map((pId) => {
        const p = room.players.get(pId);
        return {
          playerId: pId,
          username: p ? p.username : 'Player',
          linesCompleted: linesRecord[pId] || 0,
          isWinner: multiOutcome.winnerId === pId,
          isDraw: multiOutcome.resultType === 'draw',
          gameType: 'bingo',
        };
      });

      return {
        success: true,
        number,
        calledByPlayerId: callerPlayerId,
        playerLines: linesRecord,
        isGameOver: true,
        winnerId: multiOutcome.winnerId,
        resultType: multiOutcome.resultType,
        summary,
        p1Evaluation: multiOutcome.evaluations[p1Id],
        p2Evaluation: p2Id ? multiOutcome.evaluations[p2Id] : undefined,
        evaluations: multiOutcome.evaluations,
      };
    }

    const callerIdx = room.playerOrder.indexOf(callerPlayerId);
    const nextTurnPlayerId =
      room.playerOrder[(callerIdx + 1) % room.playerOrder.length];
    room.currentTurnPlayerId = nextTurnPlayerId;

    return {
      success: true,
      number,
      calledByPlayerId: callerPlayerId,
      nextTurnPlayerId,
      playerLines: linesRecord,
      isGameOver: false,
      p1Evaluation: multiOutcome.evaluations[p1Id],
      p2Evaluation: p2Id ? multiOutcome.evaluations[p2Id] : undefined,
      evaluations: multiOutcome.evaluations,
    };
  }

  /**
   * Processes an authoritative Chess move in a multiplayer room.
   */
  public static processChessMove(
    room: RoomSession,
    playerId: string,
    moveInput: ChessMoveInput
  ): {
    success: boolean;
    error?: string;
    isGameOver?: boolean;
    winnerId?: string | null;
    resultType?: GameResultType | null;
    summary?: PlayerScoreSummary[];
  } {
    if (room.status !== 'playing' || !room.chessState) {
      return { success: false, error: 'Chess match is not active' };
    }

    const expectedPlayerId =
      room.chessState.turn === 'w'
        ? room.chessState.whitePlayerId
        : room.chessState.blackPlayerId;

    if (playerId !== expectedPlayerId) {
      return { success: false, error: 'Not your turn to move' };
    }

    const res = ChessEngine.applyMove(room.chessState, moveInput);
    if (!res.success || !res.state) {
      return { success: false, error: res.error || 'Illegal chess move' };
    }

    room.chessState = res.state;
    room.currentTurnPlayerId =
      res.state.turn === 'w' ? res.state.whitePlayerId : res.state.blackPlayerId;

    if (res.isGameOver) {
      room.status = 'finished';
      room.winnerId = res.winnerId || null;
      room.resultType = res.resultType || 'draw';
      room.currentTurnPlayerId = null;

      const summary: PlayerScoreSummary[] = room.playerOrder.map((pId) => {
        const p = room.players.get(pId);
        return {
          playerId: pId,
          username: p ? p.username : 'Player',
          linesCompleted: res.state!.moveHistory.length,
          isWinner: room.winnerId === pId,
          isDraw: room.winnerId === null,
          gameType: 'chess',
          detailText: `${res.state!.moveHistory.length} moves (${room.resultType})`,
        };
      });

      return {
        success: true,
        isGameOver: true,
        winnerId: room.winnerId,
        resultType: room.resultType,
        summary,
      };
    }

    return {
      success: true,
      isGameOver: false,
    };
  }

  /**
   * Processes an authoritative Ludo dice roll in a multiplayer room.
   */
  public static processLudoRoll(
    room: RoomSession,
    playerId: string,
    forcedDice?: number
  ): {
    success: boolean;
    error?: string;
    diceValue?: number;
    legalTokenIds?: number[];
    autoTurnPassed?: boolean;
  } {
    if (room.status !== 'playing' || !room.ludoState) {
      return { success: false, error: 'Ludo match is not active' };
    }

    const activeColor = room.ludoState.currentTurnColor;
    const expectedPlayerId = room.ludoState.colorPlayerMap[activeColor];

    if (playerId !== expectedPlayerId) {
      return { success: false, error: 'Not your turn to roll the dice' };
    }

    if (!room.ludoState.canRollDice) {
      return { success: false, error: 'You already rolled! Select a token to move.' };
    }

    const rollOutcome = LudoEngine.applyDiceRoll(room.ludoState, forcedDice);
    room.ludoState = rollOutcome.state;

    const nextColor = room.ludoState.currentTurnColor;
    room.currentTurnPlayerId = room.ludoState.colorPlayerMap[nextColor];

    return {
      success: true,
      diceValue: rollOutcome.diceValue,
      legalTokenIds: rollOutcome.legalMoves.map((m) => m.tokenId),
      autoTurnPassed: rollOutcome.autoTurnPassed,
    };
  }

  /**
   * Processes an authoritative Ludo token movement in a multiplayer room.
   */
  public static processLudoMove(
    room: RoomSession,
    playerId: string,
    tokenId: number
  ): {
    success: boolean;
    error?: string;
    isGameOver?: boolean;
    winnerId?: string | null;
    resultType?: GameResultType | null;
    summary?: PlayerScoreSummary[];
  } {
    if (room.status !== 'playing' || !room.ludoState) {
      return { success: false, error: 'Ludo match is not active' };
    }

    const activeColor = room.ludoState.currentTurnColor;
    const expectedPlayerId = room.ludoState.colorPlayerMap[activeColor];

    if (playerId !== expectedPlayerId) {
      return { success: false, error: 'Not your turn to move a token' };
    }

    const moveRes = LudoEngine.applyTokenMove(room.ludoState, tokenId);
    if (!moveRes.success || !moveRes.state) {
      return { success: false, error: moveRes.error || 'Illegal token move' };
    }

    room.ludoState = moveRes.state;
    const nextColor = room.ludoState.currentTurnColor;
    room.currentTurnPlayerId = room.ludoState.colorPlayerMap[nextColor];

    if (moveRes.isGameOver && moveRes.winnerColor) {
      const winnerId = room.ludoState.colorPlayerMap[moveRes.winnerColor];
      room.status = 'finished';
      room.winnerId = winnerId;
      room.resultType = 'win';
      room.currentTurnPlayerId = null;

      const summary: PlayerScoreSummary[] = room.playerOrder.map((pId) => {
        const p = room.players.get(pId);
        const pColor = room.ludoState!.activeColors.find(
          (c) => room.ludoState!.colorPlayerMap[c] === pId
        );
        const homeCount = pColor
          ? room.ludoState!.tokens[pColor].filter((t) => t.step === 56).length
          : 0;
        return {
          playerId: pId,
          username: p ? p.username : 'Player',
          linesCompleted: homeCount,
          isWinner: pId === winnerId,
          isDraw: false,
          gameType: 'ludo',
          detailText: `${homeCount}/4 Tokens Home`,
        };
      });

      return {
        success: true,
        isGameOver: true,
        winnerId,
        resultType: 'win',
        summary,
      };
    }

    return {
      success: true,
      isGameOver: false,
    };
  }

  /**
   * Processes rematch request from a player for any game type.
   */
  public static processRematch(
    room: RoomSession,
    requestingPlayerId: string
  ): { readyForRematch: boolean; starterPlayerId?: string } {
    room.rematchRequests.add(requestingPlayerId);

    if (room.rematchRequests.size >= room.players.size && room.players.size >= 2) {
      room.status = 'playing';
      room.calledNumbers = [];
      room.winnerId = null;
      room.resultType = null;
      room.rematchRequests.clear();

      for (const pId of room.playerOrder) {
        room.playerLines.set(pId, 0);
      }

      // Alternate starter for rematch by rotating playerOrder
      room.playerOrder.reverse();
      const newStarter = room.playerOrder[0];
      room.currentTurnPlayerId = newStarter;

      if (room.gameType === 'chess') {
        const [whiteId, blackId] = room.playerOrder;
        room.chessState = ChessEngine.createInitialState(whiteId, blackId);
      } else if (room.gameType === 'ludo') {
        room.ludoState = LudoEngine.createInitialState(room.playerOrder);
        const firstColor = room.ludoState.currentTurnColor;
        room.currentTurnPlayerId = room.ludoState.colorPlayerMap[firstColor];
      }

      return { readyForRematch: true, starterPlayerId: room.currentTurnPlayerId! };
    }

    return { readyForRematch: false };
  }
}
