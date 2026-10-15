import { RoomSession } from './roomManager';
import { BingoEngine } from './bingoEngine';
import { PlayerScoreSummary } from '../../../shared/types';

export interface CallNumberResult {
  success: boolean;
  error?: string;
  number?: number;
  calledByPlayerId?: string;
  nextTurnPlayerId?: string;
  playerLines?: Record<string, number>;
  isGameOver?: boolean;
  winnerId?: string | null;
  resultType?: 'win' | 'draw' | null;
  summary?: PlayerScoreSummary[];
  p1Evaluation?: ReturnType<typeof BingoEngine.evaluateBoard>;
  p2Evaluation?: ReturnType<typeof BingoEngine.evaluateBoard>;
}

export class GameManager {
  /**
   * Processes an authoritative number call from a player.
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

    // Add to authoritative called numbers
    room.calledNumbers.push(number);

    const [p1Id, p2Id] = room.playerOrder;
    const p1Board = room.boards.get(p1Id);
    const p2Board = room.boards.get(p2Id);

    if (!p1Board || !p2Board) {
      return { success: false, error: 'Missing board state for players' };
    }

    // Authoritative outcome calculation for both boards
    const outcome = BingoEngine.evaluateMatchOutcome(
      p1Id,
      p1Board,
      p2Id,
      p2Board,
      room.calledNumbers
    );

    // Update line counts
    room.playerLines.set(p1Id, outcome.p1Result.lineCount);
    room.playerLines.set(p2Id, outcome.p2Result.lineCount);

    const linesRecord: Record<string, number> = {
      [p1Id]: outcome.p1Result.lineCount,
      [p2Id]: outcome.p2Result.lineCount,
    };

    if (outcome.isGameOver) {
      room.status = 'finished';
      room.winnerId = outcome.winnerId;
      room.resultType = outcome.resultType;
      room.currentTurnPlayerId = null;

      const p1 = room.players.get(p1Id);
      const p2 = room.players.get(p2Id);

      const summary: PlayerScoreSummary[] = [
        {
          playerId: p1Id,
          username: p1 ? p1.username : 'Player 1',
          linesCompleted: outcome.p1Result.lineCount,
          isWinner: outcome.winnerId === p1Id,
          isDraw: outcome.resultType === 'draw',
        },
        {
          playerId: p2Id,
          username: p2 ? p2.username : 'Player 2',
          linesCompleted: outcome.p2Result.lineCount,
          isWinner: outcome.winnerId === p2Id,
          isDraw: outcome.resultType === 'draw',
        },
      ];

      return {
        success: true,
        number,
        calledByPlayerId: callerPlayerId,
        playerLines: linesRecord,
        isGameOver: true,
        winnerId: outcome.winnerId,
        resultType: outcome.resultType,
        summary,
        p1Evaluation: outcome.p1Result,
        p2Evaluation: outcome.p2Result,
      };
    }

    // Advance turn to next player
    const nextTurnPlayerId = callerPlayerId === p1Id ? p2Id : p1Id;
    room.currentTurnPlayerId = nextTurnPlayerId;

    return {
      success: true,
      number,
      calledByPlayerId: callerPlayerId,
      nextTurnPlayerId,
      playerLines: linesRecord,
      isGameOver: false,
      p1Evaluation: outcome.p1Result,
      p2Evaluation: outcome.p2Result,
    };
  }

  /**
   * Processes rematch request from a player.
   */
  public static processRematch(
    room: RoomSession,
    requestingPlayerId: string
  ): { readyForRematch: boolean; starterPlayerId?: string } {
    room.rematchRequests.add(requestingPlayerId);

    if (room.rematchRequests.size >= room.players.size && room.players.size === 2) {
      // Both agreed to rematch!
      room.status = 'playing';
      room.calledNumbers = [];
      room.winnerId = null;
      room.resultType = null;
      room.rematchRequests.clear();

      for (const pId of room.playerOrder) {
        room.playerLines.set(pId, 0);
      }

      // Alternate starter for rematch
      const oldStarter = room.playerOrder[0];
      const newStarter = oldStarter === room.playerOrder[0] ? room.playerOrder[1] : room.playerOrder[0];
      room.currentTurnPlayerId = newStarter;

      return { readyForRematch: true, starterPlayerId: newStarter };
    }

    return { readyForRematch: false };
  }
}
