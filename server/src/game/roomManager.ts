import {
  Player,
  RoomState,
  BoardArray,
  GameType,
  ChessState,
  LudoState,
} from '../../../shared/types';
import { BingoEngine } from './bingoEngine';
import { ChessEngine } from '../../../shared/engines/chessEngine';
import { LudoEngine } from '../../../shared/engines/ludoEngine';

export interface RoomSession {
  roomCode: string;
  gameType: GameType;
  maxPlayers: number;
  hostPlayerId: string;
  players: Map<string, Player>;
  playerOrder: string[]; // [p1, p2, ...]
  boards: Map<string, BoardArray>;
  status: RoomState['status'];
  currentTurnPlayerId: string | null;
  calledNumbers: number[];
  playerLines: Map<string, number>;
  chessState: ChessState | null;
  ludoState: LudoState | null;
  winnerId: string | null;
  resultType: RoomState['resultType'];
  rematchRequests: Set<string>;
  disconnectTimers: Map<string, NodeJS.Timeout>;
  createdAt: number;
}

export class RoomManager {
  private rooms: Map<string, RoomSession> = new Map();
  // Map socketId -> { roomCode, playerId }
  private socketMap: Map<string, { roomCode: string; playerId: string }> = new Map();
  // Map playerId -> roomCode
  private playerRoomMap: Map<string, string> = new Map();

  private static readonly GRACE_PERIOD_MS = 45000;

  /**
   * Generates a unique 6-character uppercase alphanumeric room code.
   */
  public generateRoomCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code: string;
    let attempts = 0;
    do {
      code = '';
      for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      attempts++;
      if (attempts > 1000) {
        throw new Error('Could not generate unique room code');
      }
    } while (this.rooms.has(code));

    return code;
  }

  public createRoom(
    socketId: string,
    playerData: {
      username: string;
      avatarUrl: string;
      playerId?: string;
      gameType?: GameType;
      maxPlayers?: number;
    }
  ): { room: RoomSession; player: Player } {
    const roomCode = this.generateRoomCode();
    const playerId =
      playerData.playerId ||
      `p_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    const gameType: GameType = playerData.gameType || 'bingo';
    const maxPlayers =
      gameType === 'chess'
        ? 2
        : Math.min(4, Math.max(2, playerData.maxPlayers || 2));

    const player: Player = {
      id: playerId,
      socketId,
      username: playerData.username,
      avatarUrl:
        playerData.avatarUrl ||
        'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120',
      isReady: false,
      isConnected: true,
    };

    const room: RoomSession = {
      roomCode,
      gameType,
      maxPlayers,
      hostPlayerId: playerId,
      players: new Map([[playerId, player]]),
      playerOrder: [playerId],
      boards: new Map(),
      status: 'waiting',
      currentTurnPlayerId: null,
      calledNumbers: [],
      playerLines: new Map([[playerId, 0]]),
      chessState: null,
      ludoState: null,
      winnerId: null,
      resultType: null,
      rematchRequests: new Set(),
      disconnectTimers: new Map(),
      createdAt: Date.now(),
    };

    this.rooms.set(roomCode, room);
    this.socketMap.set(socketId, { roomCode, playerId });
    this.playerRoomMap.set(playerId, roomCode);

    return { room, player };
  }

  public joinRoom(
    socketId: string,
    payload: { roomCode: string; username: string; avatarUrl: string; playerId?: string }
  ): { success: boolean; room?: RoomSession; player?: Player; error?: string } {
    const roomCode = payload.roomCode.toUpperCase();
    const room = this.rooms.get(roomCode);

    if (!room) {
      return { success: false, error: 'Room not found. Check the code and try again.' };
    }

    // Check if player is reconnecting
    if (payload.playerId && room.players.has(payload.playerId)) {
      const existingPlayer = room.players.get(payload.playerId)!;
      existingPlayer.socketId = socketId;
      existingPlayer.isConnected = true;

      const timer = room.disconnectTimers.get(payload.playerId);
      if (timer) {
        clearTimeout(timer);
        room.disconnectTimers.delete(payload.playerId);
      }

      this.socketMap.set(socketId, { roomCode, playerId: payload.playerId });
      return { success: true, room, player: existingPlayer };
    }

    if (room.players.size >= room.maxPlayers) {
      return {
        success: false,
        error: `Room is already full (maximum ${room.maxPlayers} players).`,
      };
    }

    if (room.status !== 'waiting' && room.status !== 'ready') {
      return { success: false, error: 'Game has already started in this room.' };
    }

    const playerId =
      payload.playerId ||
      `p_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const player: Player = {
      id: playerId,
      socketId,
      username: payload.username,
      avatarUrl:
        payload.avatarUrl ||
        'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=120',
      isReady: false,
      isConnected: true,
    };

    room.players.set(playerId, player);
    room.playerOrder.push(playerId);
    room.playerLines.set(playerId, 0);

    this.socketMap.set(socketId, { roomCode, playerId });
    this.playerRoomMap.set(playerId, roomCode);

    return { success: true, room, player };
  }

  public setReady(
    socketId: string,
    isReady: boolean
  ): { success: boolean; room?: RoomSession; error?: string } {
    const meta = this.socketMap.get(socketId);
    if (!meta) return { success: false, error: 'Not in a room' };

    const room = this.rooms.get(meta.roomCode);
    if (!room) return { success: false, error: 'Room not found' };

    const player = room.players.get(meta.playerId);
    if (!player) return { success: false, error: 'Player not in room' };

    player.isReady = isReady;

    if (room.players.size >= 2) {
      const allReady = Array.from(room.players.values()).every((p) => p.isReady);
      if (allReady && room.status === 'waiting') {
        room.status = 'ready';
      } else if (!allReady && room.status === 'ready') {
        room.status = 'waiting';
      }
    }

    return { success: true, room };
  }

  public submitBoard(
    socketId: string,
    board: BoardArray
  ): { success: boolean; room?: RoomSession; error?: string } {
    const meta = this.socketMap.get(socketId);
    if (!meta) return { success: false, error: 'Not in a room' };

    const room = this.rooms.get(meta.roomCode);
    if (!room) return { success: false, error: 'Room not found' };

    if (room.status === 'playing') {
      return { success: false, error: 'Cannot modify board after match has started' };
    }

    const validation = BingoEngine.validateBoard(board);
    if (!validation.valid) {
      return { success: false, error: validation.error };
    }

    room.boards.set(meta.playerId, [...board]);
    return { success: true, room };
  }

  public canStartGame(room: RoomSession): { canStart: boolean; reason?: string } {
    if (room.players.size < 2) {
      return { canStart: false, reason: 'Waiting for opponent to join' };
    }
    const allReady = Array.from(room.players.values()).every((p) => p.isReady);
    if (!allReady) {
      return { canStart: false, reason: 'All players must confirm ready status' };
    }
    if (room.gameType === 'bingo') {
      for (const pId of room.playerOrder) {
        if (!room.boards.has(pId)) {
          return {
            canStart: false,
            reason: `Player ${room.players.get(pId)?.username} has not submitted their board layout`,
          };
        }
      }
    }
    return { canStart: true };
  }

  public startGame(roomCode: string): { success: boolean; room?: RoomSession; error?: string } {
    const room = this.rooms.get(roomCode);
    if (!room) return { success: false, error: 'Room not found' };

    const check = this.canStartGame(room);
    if (!check.canStart) {
      return { success: false, error: check.reason };
    }

    room.status = 'playing';
    room.calledNumbers = [];
    room.winnerId = null;
    room.resultType = null;
    room.rematchRequests.clear();
    room.currentTurnPlayerId = room.playerOrder[0];

    for (const pId of room.playerOrder) {
      room.playerLines.set(pId, 0);
    }

    if (room.gameType === 'chess') {
      const [whiteId, blackId] = room.playerOrder;
      room.chessState = ChessEngine.createInitialState(whiteId, blackId);
    } else if (room.gameType === 'ludo') {
      room.ludoState = LudoEngine.createInitialState(room.playerOrder);
      const firstColor = room.ludoState.currentTurnColor;
      room.currentTurnPlayerId = room.ludoState.colorPlayerMap[firstColor];
    }

    return { success: true, room };
  }

  public handleDisconnect(
    socketId: string,
    onGraceExpired: (room: RoomSession, disconnectedPlayerId: string) => void
  ): { room?: RoomSession; player?: Player } {
    const meta = this.socketMap.get(socketId);
    if (!meta) return {};

    const room = this.rooms.get(meta.roomCode);
    if (!room) return {};

    const player = room.players.get(meta.playerId);
    if (!player) return {};

    player.isConnected = false;

    if (room.status === 'playing') {
      const timer = setTimeout(() => {
        onGraceExpired(room, meta.playerId);
      }, RoomManager.GRACE_PERIOD_MS);
      if (typeof timer.unref === 'function') {
        timer.unref();
      }

      room.disconnectTimers.set(meta.playerId, timer);
    }

    return { room, player };
  }

  public clearAllTimers(): void {
    for (const room of this.rooms.values()) {
      for (const timer of room.disconnectTimers.values()) {
        clearTimeout(timer);
      }
      room.disconnectTimers.clear();
    }
  }

  public removePlayer(socketId: string): { room?: RoomSession; player?: Player } {
    const meta = this.socketMap.get(socketId);
    if (!meta) return {};

    const room = this.rooms.get(meta.roomCode);
    if (!room) return {};

    const player = room.players.get(meta.playerId);

    room.players.delete(meta.playerId);
    room.boards.delete(meta.playerId);
    room.playerOrder = room.playerOrder.filter((id) => id !== meta.playerId);
    this.socketMap.delete(socketId);
    this.playerRoomMap.delete(meta.playerId);

    if (room.players.size === 0) {
      this.rooms.delete(room.roomCode);
    } else {
      if (room.hostPlayerId === meta.playerId && room.playerOrder.length > 0) {
        room.hostPlayerId = room.playerOrder[0];
      }
      if (room.status === 'playing') {
        const remainingPlayerId = room.playerOrder[0];
        room.status = 'finished';
        room.winnerId = remainingPlayerId;
        room.resultType = 'forfeit';
      }
    }

    return { room, player };
  }

  public getRoomByCode(roomCode: string): RoomSession | undefined {
    return this.rooms.get(roomCode.toUpperCase());
  }

  public getPlayerMetaBySocket(socketId: string) {
    return this.socketMap.get(socketId);
  }

  public toClientState(room: RoomSession): RoomState {
    const playersObj: Record<string, Player> = {};
    const boardsObj: Record<string, BoardArray> = {};
    const linesObj: Record<string, number> = {};

    room.players.forEach((p, id) => {
      playersObj[id] = { ...p };
    });

    room.boards.forEach((b, id) => {
      boardsObj[id] = [...b];
    });

    room.playerLines.forEach((l, id) => {
      linesObj[id] = l;
    });

    return {
      roomId: room.roomCode,
      roomCode: room.roomCode,
      gameType: room.gameType,
      maxPlayers: room.maxPlayers,
      hostPlayerId: room.hostPlayerId,
      players: playersObj,
      playerOrder: [...room.playerOrder],
      status: room.status,
      currentTurnPlayerId: room.currentTurnPlayerId,
      calledNumbers: [...room.calledNumbers],
      playerBoards: boardsObj,
      playerLines: linesObj,
      chessState: room.chessState,
      ludoState: room.ludoState,
      winnerId: room.winnerId,
      resultType: room.resultType,
      rematchRequests: Array.from(room.rematchRequests),
    };
  }
}
