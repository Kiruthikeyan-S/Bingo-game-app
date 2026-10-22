import {
  db,
  doc,
  getDoc,
  updateDoc,
  runTransaction,
  Transaction,
} from './firebase';
import { ChessEngine } from '../../shared/engines/chessEngine';
import { LudoEngine } from '../../shared/engines/ludoEngine';
import { BingoEngine } from '../../shared/engines/bingoEngine';
import { BoardArray, ChessMoveInput, LudoColor, LudoState } from '../../shared/types';
import {
  FirebaseRoom,
  FirebaseBingoState,
  FirebaseChessState,
  FirebaseLudoState,
} from '../types/room';

export class MultiplayerService {
  // ==========================================
  // BINGO MULTIPLAYER ACTIONS
  // ==========================================

  public async submitBingoBoard(
    roomId: string,
    uid: string,
    board: BoardArray
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const roomRef = doc(db, 'rooms', roomId);
      await runTransaction(db, async (tx: Transaction) => {
        const snap = await tx.get(roomRef);
        if (!snap.exists()) throw new Error('Room not found');

        const room = snap.data() as FirebaseRoom;
        const bingoState = room.gameState?.bingo || {
          calledNumbers: [],
          lastCalledNumber: null,
          currentTurnUid: room.hostUid,
          playerLines: {},
          submittedBoards: {},
        };

        const updatedBoards = {
          ...bingoState.submittedBoards,
          [uid]: board,
        };

        // Check if all players have submitted their boards
        const allSubmitted = room.playerUids.every((pUid) =>
          pUid === uid ? true : Boolean(updatedBoards[pUid])
        );

        const updatedRoomStatus = allSubmitted ? 'playing' : room.status;

        tx.update(roomRef, {
          status: updatedRoomStatus,
          [`players.${uid}.boardSubmitted`]: true,
          'gameState.bingo.submittedBoards': updatedBoards,
          'gameState.bingo.currentTurnUid': bingoState.currentTurnUid || room.hostUid,
          updatedAt: Date.now(),
        });
      });

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  public async callBingoNumber(
    roomId: string,
    uid: string,
    number: number
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const roomRef = doc(db, 'rooms', roomId);
      await runTransaction(db, async (tx: Transaction) => {
        const snap = await tx.get(roomRef);
        if (!snap.exists()) throw new Error('Room not found');

        const room = snap.data() as FirebaseRoom;
        if (room.status !== 'playing') throw new Error('Game is not currently active');

        const bingoState = room.gameState?.bingo;
        if (!bingoState) throw new Error('Bingo game state missing');

        if (bingoState.currentTurnUid !== uid) {
          throw new Error('Not your turn to call a number');
        }

        if (bingoState.calledNumbers.includes(number)) {
          throw new Error('Number already called');
        }

        const nextCalled = [...bingoState.calledNumbers, number];
        const nextLines: Record<string, number> = {};

        const winners: string[] = [];

        // Evaluate each player's lines
        for (const pUid of room.playerUids) {
          const pBoard = bingoState.submittedBoards[pUid];
          if (pBoard) {
            const res = BingoEngine.evaluateBoard(pBoard, nextCalled);
            nextLines[pUid] = res.lineCount;
            if (res.isBingo) {
              winners.push(pUid);
            }
          }
        }

        // Determine if game finishes
        const isGameOver = winners.length > 0;
        let winnerUid: string | null = null;
        let resultType: 'win' | 'draw' | null = null;

        if (isGameOver) {
          if (winners.length === 1) {
            winnerUid = winners[0];
            resultType = 'win';
          } else {
            winnerUid = null;
            resultType = 'draw';
          }
        }

        // Advance turn to next player
        const currentIdx = room.playerUids.indexOf(uid);
        const nextIdx = (currentIdx + 1) % room.playerUids.length;
        const nextTurnUid = room.playerUids[nextIdx];

        tx.update(roomRef, {
          status: isGameOver ? 'completed' : 'playing',
          winnerUid,
          resultType,
          currentTurnUid: nextTurnUid,
          'gameState.bingo.calledNumbers': nextCalled,
          'gameState.bingo.lastCalledNumber': number,
          'gameState.bingo.currentTurnUid': nextTurnUid,
          'gameState.bingo.playerLines': nextLines,
          updatedAt: Date.now(),
        });
      });

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  // ==========================================
  // CHESS MULTIPLAYER ACTIONS
  // ==========================================

  public async makeChessMove(
    roomId: string,
    uid: string,
    moveInput: ChessMoveInput
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const roomRef = doc(db, 'rooms', roomId);
      await runTransaction(db, async (tx: Transaction) => {
        const snap = await tx.get(roomRef);
        if (!snap.exists()) throw new Error('Room not found');

        const room = snap.data() as FirebaseRoom;
        if (room.status !== 'playing') throw new Error('Game is not currently active');

        const chessState = room.gameState?.chess;
        if (!chessState) throw new Error('Chess game state missing');

        // Verify turn
        const isWhite = chessState.whiteUid === uid;
        const isBlack = chessState.blackUid === uid;

        if (chessState.turn === 'w' && !isWhite) {
          throw new Error('Not White player turn');
        }
        if (chessState.turn === 'b' && !isBlack) {
          throw new Error('Not Black player turn');
        }

        // Execute move on authoritative engine
        const currentEngineState: any = {
          fen: chessState.fen,
          pgn: chessState.pgn,
          turn: chessState.turn,
          inCheck: chessState.inCheck,
          isCheckmate: chessState.isCheckmate,
          isStalemate: chessState.isStalemate,
          isDraw: chessState.isDraw,
          moveHistory: chessState.moveHistory || [],
          whitePlayerId: chessState.whiteUid,
          blackPlayerId: chessState.blackUid,
          lastMove: chessState.lastMove,
          capturedByWhite: [],
          capturedByBlack: [],
          drawOfferFromPlayerId: null,
        };

        const moveRes = ChessEngine.applyMove(currentEngineState, moveInput);
        if (!moveRes.success || !moveRes.state) {
          throw new Error(moveRes.error || 'Illegal chess move');
        }

        const nextEngineState = moveRes.state;
        const nextTurnUid = nextEngineState.turn === 'w' ? chessState.whiteUid : chessState.blackUid;

        let status: any = 'playing';
        let winnerUid: string | null = null;
        let resultType: string | null = null;

        if (nextEngineState.isCheckmate) {
          status = 'completed';
          winnerUid = uid;
          resultType = 'checkmate';
        } else if (nextEngineState.isDraw || nextEngineState.isStalemate) {
          status = 'completed';
          winnerUid = null;
          resultType = nextEngineState.isStalemate ? 'stalemate' : 'draw';
        }

        const updatedChessState: FirebaseChessState = {
          fen: nextEngineState.fen,
          pgn: nextEngineState.pgn,
          turn: nextEngineState.turn,
          inCheck: nextEngineState.inCheck,
          isCheckmate: nextEngineState.isCheckmate,
          isStalemate: nextEngineState.isStalemate,
          isDraw: nextEngineState.isDraw,
          whiteUid: chessState.whiteUid,
          blackUid: chessState.blackUid,
          lastMove: nextEngineState.lastMove,
          moveHistory: nextEngineState.moveHistory,
        };

        tx.update(roomRef, {
          status,
          winnerUid,
          resultType,
          currentTurnUid: nextTurnUid,
          'gameState.chess': updatedChessState,
          updatedAt: Date.now(),
        });
      });

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  public async resignChess(roomId: string, uid: string): Promise<{ success: boolean; error?: string }> {
    try {
      const roomRef = doc(db, 'rooms', roomId);
      await runTransaction(db, async (tx: Transaction) => {
        const snap = await tx.get(roomRef);
        if (!snap.exists()) throw new Error('Room not found');

        const room = snap.data() as FirebaseRoom;
        const chessState = room.gameState?.chess;
        if (!chessState) throw new Error('Chess game state missing');

        const winnerUid = chessState.whiteUid === uid ? chessState.blackUid : chessState.whiteUid;

        tx.update(roomRef, {
          status: 'completed',
          winnerUid,
          resultType: 'resign',
          updatedAt: Date.now(),
        });
      });

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  // ==========================================
  // LUDO MULTIPLAYER ACTIONS
  // ==========================================

  public async rollLudoDice(roomId: string, uid: string): Promise<{ success: boolean; error?: string }> {
    try {
      const roomRef = doc(db, 'rooms', roomId);
      await runTransaction(db, async (tx: Transaction) => {
        const snap = await tx.get(roomRef);
        if (!snap.exists()) throw new Error('Room not found');

        const room = snap.data() as FirebaseRoom;
        if (room.status !== 'playing') throw new Error('Match is not active');

        const ludoState = room.gameState?.ludo;
        if (!ludoState) throw new Error('Ludo game state missing');

        if (ludoState.currentTurnUid !== uid) {
          throw new Error('Not your turn to roll');
        }

        if (ludoState.hasRolled) {
          throw new Error('Already rolled this turn');
        }

        const diceValue = LudoEngine.rollDice();
        const currentColor = ludoState.currentColor;

        const engineState: LudoState = {
          activeColors: ludoState.activeColors,
          colorPlayerMap: ludoState.colorPlayerMap,
          tokens: ludoState.tokens,
          currentTurnColor: currentColor,
          diceValue,
          canRollDice: false,
          consecutiveSixes: ludoState.consecutiveSixes || 0,
          lastActionText: `Rolled ${diceValue}`,
          winnerOrder: [],
        };

        const rollRes = LudoEngine.applyDiceRoll(engineState, diceValue);
        const updatedState = rollRes.state;

        if (rollRes.autoTurnPassed) {
          const nextColor = updatedState.currentTurnColor;
          const nextTurnUid = ludoState.colorPlayerMap[nextColor] || room.hostUid;

          tx.update(roomRef, {
            currentTurnUid: nextTurnUid,
            'gameState.ludo.diceValue': diceValue,
            'gameState.ludo.hasRolled': false,
            'gameState.ludo.currentColor': nextColor,
            'gameState.ludo.currentTurnUid': nextTurnUid,
            updatedAt: Date.now(),
          });
        } else {
          tx.update(roomRef, {
            'gameState.ludo.diceValue': diceValue,
            'gameState.ludo.hasRolled': true,
            updatedAt: Date.now(),
          });
        }
      });

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  public async moveLudoToken(
    roomId: string,
    uid: string,
    tokenId: number
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const roomRef = doc(db, 'rooms', roomId);
      await runTransaction(db, async (tx: Transaction) => {
        const snap = await tx.get(roomRef);
        if (!snap.exists()) throw new Error('Room not found');

        const room = snap.data() as FirebaseRoom;
        if (room.status !== 'playing') throw new Error('Match is not active');

        const ludoState = room.gameState?.ludo;
        if (!ludoState) throw new Error('Ludo game state missing');

        if (ludoState.currentTurnUid !== uid) {
          throw new Error('Not your turn to move');
        }

        if (!ludoState.hasRolled || !ludoState.diceValue) {
          throw new Error('You must roll the dice first');
        }

        const engineState: LudoState = {
          activeColors: ludoState.activeColors,
          colorPlayerMap: ludoState.colorPlayerMap,
          tokens: ludoState.tokens,
          currentTurnColor: ludoState.currentColor,
          diceValue: ludoState.diceValue,
          canRollDice: false,
          consecutiveSixes: ludoState.consecutiveSixes || 0,
          lastActionText: 'Moving token',
          winnerOrder: [],
        };

        const moveRes = LudoEngine.applyTokenMove(engineState, tokenId);

        if (!moveRes.success || !moveRes.state) {
          throw new Error(moveRes.error || 'Illegal token move');
        }

        const nextLudoState = moveRes.state;
        const isGameOver = Boolean(moveRes.isGameOver);
        const nextColor = nextLudoState.currentTurnColor;
        const nextTurnUid = ludoState.colorPlayerMap[nextColor] || room.hostUid;

        tx.update(roomRef, {
          status: isGameOver ? 'completed' : 'playing',
          winnerUid: isGameOver ? uid : null,
          resultType: isGameOver ? 'win' : null,
          currentTurnUid: nextTurnUid,
          'gameState.ludo.tokens': nextLudoState.tokens,
          'gameState.ludo.hasRolled': false,
          'gameState.ludo.diceValue': nextLudoState.diceValue,
          'gameState.ludo.currentColor': nextColor,
          'gameState.ludo.currentTurnUid': nextTurnUid,
          'gameState.ludo.winnerColor': moveRes.winnerColor || null,
          'gameState.ludo.consecutiveSixes': nextLudoState.consecutiveSixes,
          updatedAt: Date.now(),
        });
      });

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  public async rematch(roomId: string, uid: string): Promise<{ success: boolean; error?: string }> {
    try {
      const roomRef = doc(db, 'rooms', roomId);
      await updateDoc(roomRef, {
        status: 'waiting',
        winnerUid: null,
        resultType: null,
        [`players.${uid}.isReady`]: false,
        updatedAt: Date.now(),
      });
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }
}

export const multiplayerService = new MultiplayerService();
