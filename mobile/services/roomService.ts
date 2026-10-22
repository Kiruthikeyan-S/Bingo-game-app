import {
  db,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  deleteDoc,
  runTransaction,
  onSnapshot,
  Transaction,
} from './firebase';
import { GameType } from '../../shared/types';
import {
  FirebaseRoom,
  FirebaseRoomPlayer,
  RoomCodeMapping,
  RoomStatus,
  FirebaseGameState,
  FirebaseChessState,
  FirebaseLudoState,
  FirebaseBingoState,
} from '../types/room';

// Characters excluding ambiguous 0, O, 1, I
const CODE_CHARS = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';

function generateRandomCode(): string {
  let result = '';
  for (let i = 0; i < 6; i++) {
    const idx = Math.floor(Math.random() * CODE_CHARS.length);
    result += CODE_CHARS[idx];
  }
  return result;
}

export class RoomService {
  /**
   * Concurrency-safe, atomic room creation with unique room code registration.
   */
  public async createPrivateRoom(
    gameType: GameType,
    host: { uid: string; username: string; avatarUrl: string },
    customMaxPlayers?: number
  ): Promise<{ success: boolean; roomId?: string; roomCode?: string; error?: string }> {
    try {
      const maxPlayers =
        customMaxPlayers || (gameType === 'chess' ? 2 : 4);

      let attempts = 0;
      let roomCode = generateRandomCode();
      const now = Date.now();
      const expiresAt = now + 2 * 60 * 60 * 1000; // 2 hours

      while (attempts < 5) {
        attempts++;
        try {
          const result = await runTransaction(db, async (tx: Transaction) => {
            const codeRef = doc(db, 'roomCodes', roomCode);
            const codeSnap = await tx.get(codeRef);

            if (codeSnap.exists()) {
              const data = codeSnap.data() as RoomCodeMapping;
              // If expired, we can reclaim it; otherwise retry with new code
              if (data.expiresAt > now) {
                return null;
              }
            }

            const roomRef = doc(db, 'rooms', `r_${now}_${roomCode}`);
            const roomId = roomRef.id;

            const hostPlayer: FirebaseRoomPlayer = {
              uid: host.uid,
              username: host.username,
              avatarUrl: host.avatarUrl,
              isHost: true,
              isReady: false,
              joinedAt: now,
              seatIndex: 0,
              chessColor: gameType === 'chess' ? 'w' : undefined,
              ludoColor: gameType === 'ludo' ? 'red' : undefined,
            };

            const newRoom: FirebaseRoom = {
              id: roomId,
              roomCode,
              gameType,
              visibility: 'private',
              hostUid: host.uid,
              playerUids: [host.uid],
              playerCount: 1,
              maxPlayers,
              status: 'waiting',
              createdAt: now,
              updatedAt: now,
              expiresAt,
              currentTurnUid: host.uid,
              players: {
                [host.uid]: hostPlayer,
              },
            };

            const mapping: RoomCodeMapping = {
              roomId,
              gameType,
              expiresAt,
              createdAt: now,
            };

            tx.set(codeRef, mapping);
            tx.set(roomRef, newRoom);

            return { roomId, roomCode };
          });

          if (result) {
            return { success: true, roomId: result.roomId, roomCode: result.roomCode };
          }
          // If null, code was occupied, generate new code and loop
          roomCode = generateRandomCode();
        } catch {
          roomCode = generateRandomCode();
        }
      }

      return { success: false, error: 'Could not generate a unique room code. Please try again.' };
    } catch (err: any) {
      console.warn('[RoomService] createPrivateRoom error:', err);
      return { success: false, error: err.message || 'Room creation failed' };
    }
  }

  /**
   * Concurrency-safe, transactional room join by code with capacity enforcement.
   */
  public async joinRoomByCode(
    rawCode: string,
    player: { uid: string; username: string; avatarUrl: string }
  ): Promise<{ success: boolean; roomId?: string; gameType?: GameType; error?: string }> {
    try {
      const roomCode = rawCode.trim().toUpperCase();
      if (roomCode.length !== 6) {
        return { success: false, error: 'Room code must be exactly 6 characters.' };
      }

      const now = Date.now();

      const result = await runTransaction(db, async (tx: Transaction) => {
        const codeRef = doc(db, 'roomCodes', roomCode);
        const codeSnap = await tx.get(codeRef);

        if (!codeSnap.exists()) {
          throw new Error('Room not found. Check the code and try again.');
        }

        const mapping = codeSnap.data() as RoomCodeMapping;
        if (mapping.expiresAt && mapping.expiresAt < now) {
          throw new Error('This room invitation has expired.');
        }

        const roomRef = doc(db, 'rooms', mapping.roomId);
        const roomSnap = await tx.get(roomRef);

        if (!roomSnap.exists()) {
          throw new Error('Room session is no longer active.');
        }

        const room = roomSnap.data() as FirebaseRoom;

        if (room.status !== 'waiting') {
          throw new Error('Game match is already in progress or completed.');
        }

        // If player already in room, allow reconnect
        if (room.playerUids.includes(player.uid)) {
          return { roomId: room.id, gameType: room.gameType };
        }

        if (room.playerCount >= room.maxPlayers) {
          throw new Error('Room is full. Maximum players reached.');
        }

        const seatIndex = room.playerCount;
        const newPlayer: FirebaseRoomPlayer = {
          uid: player.uid,
          username: player.username,
          avatarUrl: player.avatarUrl,
          isHost: false,
          isReady: false,
          joinedAt: now,
          seatIndex,
          chessColor:
            room.gameType === 'chess'
              ? seatIndex === 1
                ? 'b'
                : 'w'
              : undefined,
          ludoColor:
            room.gameType === 'ludo'
              ? (['red', 'green', 'yellow', 'blue'][seatIndex] as any)
              : undefined,
        };

        const updatedPlayerUids = [...room.playerUids, player.uid];
        const updatedPlayers = {
          ...room.players,
          [player.uid]: newPlayer,
        };

        tx.update(roomRef, {
          playerUids: updatedPlayerUids,
          playerCount: updatedPlayerUids.length,
          players: updatedPlayers,
          updatedAt: now,
        });

        return { roomId: room.id, gameType: room.gameType };
      });

      return { success: true, roomId: result.roomId, gameType: result.gameType };
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to join room.' };
    }
  }

  /**
   * Set ready status for a player in a room.
   */
  public async setReady(roomId: string, uid: string, isReady: boolean): Promise<{ success: boolean; error?: string }> {
    try {
      const roomRef = doc(db, 'rooms', roomId);
      await updateDoc(roomRef, {
        [`players.${uid}.isReady`]: isReady,
        updatedAt: Date.now(),
      });
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  /**
   * Start the match (Host only).
   */
  public async startMatch(roomId: string, hostUid: string): Promise<{ success: boolean; error?: string }> {
    try {
      const roomRef = doc(db, 'rooms', roomId);
      const snap = await getDoc(roomRef);
      if (!snap.exists()) return { success: false, error: 'Room does not exist' };

      const room = snap.data() as FirebaseRoom;
      if (room.hostUid !== hostUid) {
        return { success: false, error: 'Only the host can start the game.' };
      }

      if (room.playerCount < 2) {
        return { success: false, error: 'At least 2 players are required to start.' };
      }

      const allReady = Object.values(room.players).every((p) => p.isHost || p.isReady);
      if (!allReady) {
        return { success: false, error: 'Waiting for all players to mark Ready.' };
      }

      // Initialize game state based on gameType
      let initialGameState: FirebaseGameState = {};
      const playerList = Object.values(room.players);

      if (room.gameType === 'chess') {
        const whiteUid = playerList[0].uid;
        const blackUid = playerList[1]?.uid || playerList[0].uid;
        const chessState: FirebaseChessState = {
          fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
          pgn: '',
          turn: 'w',
          inCheck: false,
          isCheckmate: false,
          isStalemate: false,
          isDraw: false,
          whiteUid,
          blackUid,
          lastMove: null,
          moveHistory: [],
        };
        initialGameState = { chess: chessState };
      } else if (room.gameType === 'ludo') {
        const activeColors = (['red', 'green', 'yellow', 'blue'] as const).slice(0, room.playerCount);
        const playerColorMap: Record<string, any> = {};
        const colorPlayerMap: Record<any, string> = {} as any;
        activeColors.forEach((color, idx) => {
          const p = playerList[idx];
          if (p) {
            playerColorMap[p.uid] = color;
            colorPlayerMap[color] = p.uid;
          }
        });

        const initialTokens: any = {
          red: [0, 1, 2, 3].map((id) => ({ id, color: 'red', step: -1 })),
          green: [0, 1, 2, 3].map((id) => ({ id, color: 'green', step: -1 })),
          yellow: [0, 1, 2, 3].map((id) => ({ id, color: 'yellow', step: -1 })),
          blue: [0, 1, 2, 3].map((id) => ({ id, color: 'blue', step: -1 })),
        };

        const ludoState: FirebaseLudoState = {
          currentTurnUid: hostUid,
          currentColor: 'red',
          diceValue: null,
          hasRolled: false,
          consecutiveSixes: 0,
          tokens: initialTokens,
          playerColorMap,
          colorPlayerMap,
          activeColors: activeColors as any,
          winnerColor: null,
        };
        initialGameState = { ludo: ludoState };
      } else if (room.gameType === 'bingo') {
        const bingoState: FirebaseBingoState = {
          calledNumbers: [],
          lastCalledNumber: null,
          currentTurnUid: hostUid,
          playerLines: {},
          submittedBoards: {},
        };
        initialGameState = { bingo: bingoState };
      }

      await updateDoc(roomRef, {
        status: 'playing',
        gameState: initialGameState,
        currentTurnUid: hostUid,
        updatedAt: Date.now(),
      });

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to start game.' };
    }
  }

  /**
   * Leave room and safely handle host migration or cancellation.
   */
  public async leaveRoom(roomId: string, uid: string): Promise<void> {
    try {
      await runTransaction(db, async (tx: Transaction) => {
        const roomRef = doc(db, 'rooms', roomId);
        const snap = await tx.get(roomRef);
        if (!snap.exists()) return;

        const room = snap.data() as FirebaseRoom;
        const remainingUids = room.playerUids.filter((p) => p !== uid);

        // If no players left, mark cancelled and remove code
        if (remainingUids.length === 0) {
          tx.update(roomRef, { status: 'cancelled', updatedAt: Date.now() });
          if (room.roomCode) {
            tx.delete(doc(db, 'roomCodes', room.roomCode));
          }
          return;
        }

        const remainingPlayers = { ...room.players };
        delete remainingPlayers[uid];

        let newHostUid = room.hostUid;
        if (room.hostUid === uid) {
          newHostUid = remainingUids[0];
          if (remainingPlayers[newHostUid]) {
            remainingPlayers[newHostUid].isHost = true;
          }
        }

        tx.update(roomRef, {
          hostUid: newHostUid,
          playerUids: remainingUids,
          playerCount: remainingUids.length,
          players: remainingPlayers,
          updatedAt: Date.now(),
        });
      });
    } catch (err) {
      console.warn('[RoomService] leaveRoom error:', err);
    }
  }

  /**
   * Real-time subscription to room updates.
   */
  public subscribeToRoom(
    roomId: string,
    onUpdate: (room: FirebaseRoom | null) => void,
    onError?: (error: Error) => void
  ): () => void {
    const roomRef = doc(db, 'rooms', roomId);
    return onSnapshot(
      roomRef,
      (snap) => {
        if (!snap.exists()) {
          onUpdate(null);
        } else {
          onUpdate(snap.data() as FirebaseRoom);
        }
      },
      (err) => {
        if (onError) onError(err);
      }
    );
  }
}

export const roomService = new RoomService();
