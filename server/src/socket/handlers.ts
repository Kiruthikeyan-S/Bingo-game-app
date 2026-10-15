import { Server, Socket } from 'socket.io';
import { ClientToServerEvents, ServerToClientEvents } from '../../../shared/types';
import { CreateRoomInputSchema, JoinRoomInputSchema, CallNumberInputSchema } from '../../../shared/schemas';
import { RoomManager } from '../game/roomManager';
import { GameManager } from '../game/gameManager';
import { DatabaseService } from '../database/supabase';

export function setupSocketHandlers(
  io: Server<ClientToServerEvents, ServerToClientEvents>,
  roomManager: RoomManager
) {
  io.on('connection', (socket: Socket<ClientToServerEvents, ServerToClientEvents>) => {
    console.log(`[Socket] Client connected: ${socket.id}`);

    // 1. room:create
    socket.on('room:create', (payload, callback) => {
      try {
        const val = CreateRoomInputSchema.safeParse(payload);
        if (!val.success) {
          return callback({ success: false, error: val.error.errors[0]?.message || 'Invalid input' });
        }

        const { room, player } = roomManager.createRoom(socket.id, val.data);
        socket.join(room.roomCode);

        // Async save profile
        DatabaseService.saveProfile(player.id, player.username, player.avatarUrl).catch(console.error);

        callback({ success: true, roomCode: room.roomCode, playerId: player.id });
        io.to(room.roomCode).emit('room:state', roomManager.toClientState(room));
      } catch (err: any) {
        callback({ success: false, error: err.message || 'Server error creating room' });
      }
    });

    // 2. room:join
    socket.on('room:join', (payload, callback) => {
      try {
        const val = JoinRoomInputSchema.safeParse(payload);
        if (!val.success) {
          return callback({ success: false, error: val.error.errors[0]?.message || 'Invalid input' });
        }

        const result = roomManager.joinRoom(socket.id, val.data);
        if (!result.success || !result.room || !result.player) {
          return callback({ success: false, error: result.error });
        }

        socket.join(result.room.roomCode);

        // Async save profile
        DatabaseService.saveProfile(result.player.id, result.player.username, result.player.avatarUrl).catch(console.error);

        callback({ success: true, roomCode: result.room.roomCode, playerId: result.player.id });
        io.to(result.room.roomCode).emit('room:state', roomManager.toClientState(result.room));

        // If player was reconnecting, notify room
        if (payload.playerId && payload.playerId === result.player.id) {
          io.to(result.room.roomCode).emit('player:reconnected', {
            playerId: result.player.id,
            username: result.player.username,
          });
        }
      } catch (err: any) {
        callback({ success: false, error: err.message || 'Server error joining room' });
      }
    });

    // 3. room:ready
    socket.on('room:ready', (payload, callback) => {
      const res = roomManager.setReady(socket.id, payload.isReady);
      if (!res.success || !res.room) {
        callback?.({ success: false, error: res.error });
        return;
      }

      callback?.({ success: true });
      io.to(res.room.roomCode).emit('room:state', roomManager.toClientState(res.room));

      // Check if both ready and can auto-start or ready to start
      const canStart = roomManager.canStartGame(res.room);
      if (canStart.canStart && res.room.status === 'ready') {
        const startRes = roomManager.startGame(res.room.roomCode);
        if (startRes.success && startRes.room) {
          io.to(startRes.room.roomCode).emit('room:state', roomManager.toClientState(startRes.room));
          io.to(startRes.room.roomCode).emit('game:start', {
            starterPlayerId: startRes.room.currentTurnPlayerId!,
            players: roomManager.toClientState(startRes.room).players,
          });
          io.to(startRes.room.roomCode).emit('game:turnChanged', {
            currentTurnPlayerId: startRes.room.currentTurnPlayerId!,
          });
        }
      }
    });

    // 4. game:boardSubmit
    socket.on('game:boardSubmit', (payload, callback) => {
      const res = roomManager.submitBoard(socket.id, payload.board);
      if (!res.success || !res.room) {
        return callback({ success: false, error: res.error });
      }

      callback({ success: true });
      io.to(res.room.roomCode).emit('room:state', roomManager.toClientState(res.room));

      // If both ready and both boards submitted, start game!
      const canStart = roomManager.canStartGame(res.room);
      if (canStart.canStart) {
        const startRes = roomManager.startGame(res.room.roomCode);
        if (startRes.success && startRes.room) {
          io.to(startRes.room.roomCode).emit('room:state', roomManager.toClientState(startRes.room));
          io.to(startRes.room.roomCode).emit('game:start', {
            starterPlayerId: startRes.room.currentTurnPlayerId!,
            players: roomManager.toClientState(startRes.room).players,
          });
          io.to(startRes.room.roomCode).emit('game:turnChanged', {
            currentTurnPlayerId: startRes.room.currentTurnPlayerId!,
          });
        }
      }
    });

    // 5. game:callNumber
    socket.on('game:callNumber', (payload, callback) => {
      const val = CallNumberInputSchema.safeParse(payload);
      if (!val.success) {
        return callback({ success: false, error: val.error.errors[0]?.message || 'Invalid number' });
      }

      const meta = roomManager.getPlayerMetaBySocket(socket.id);
      if (!meta) {
        return callback({ success: false, error: 'Player session not found' });
      }

      const room = roomManager.getRoomByCode(meta.roomCode);
      if (!room) {
        return callback({ success: false, error: 'Room not found' });
      }

      const outcome = GameManager.processCallNumber(room, meta.playerId, val.data.number);
      if (!outcome.success) {
        return callback({ success: false, error: outcome.error });
      }

      callback({ success: true });

      // Broadcast number called to both players
      io.to(room.roomCode).emit('game:numberCalled', {
        number: outcome.number!,
        calledByPlayerId: outcome.calledByPlayerId!,
        calledNumbers: [...room.calledNumbers],
        playerLines: outcome.playerLines!,
      });

      // Broadcast progress for each player
      const [p1Id, p2Id] = room.playerOrder;
      if (outcome.p1Evaluation) {
        io.to(room.roomCode).emit('game:progressUpdated', {
          playerId: p1Id,
          linesCompleted: outcome.p1Evaluation.lineCount,
          activeLetters: outcome.p1Evaluation.activeLetters,
          completedLines: outcome.p1Evaluation.completedLines,
        });
      }
      if (outcome.p2Evaluation) {
        io.to(room.roomCode).emit('game:progressUpdated', {
          playerId: p2Id,
          linesCompleted: outcome.p2Evaluation.lineCount,
          activeLetters: outcome.p2Evaluation.activeLetters,
          completedLines: outcome.p2Evaluation.completedLines,
        });
      }

      // Check if finished
      if (outcome.isGameOver) {
        io.to(room.roomCode).emit('game:finished', {
          winnerId: outcome.winnerId!,
          resultType: outcome.resultType!,
          playerLines: outcome.playerLines!,
          summary: outcome.summary || [],
        });

        // Record to DB
        DatabaseService.recordMatch(room).catch(console.error);
      } else if (outcome.nextTurnPlayerId) {
        io.to(room.roomCode).emit('game:turnChanged', {
          currentTurnPlayerId: outcome.nextTurnPlayerId,
        });
      }

      io.to(room.roomCode).emit('room:state', roomManager.toClientState(room));
    });

    // 6. game:rematchRequest
    socket.on('game:rematchRequest', (callback) => {
      const meta = roomManager.getPlayerMetaBySocket(socket.id);
      if (!meta) {
        callback?.({ success: false, error: 'Not in a room' });
        return;
      }
      const room = roomManager.getRoomByCode(meta.roomCode);
      if (!room) {
        callback?.({ success: false, error: 'Room not found' });
        return;
      }

      const player = room.players.get(meta.playerId);
      const res = GameManager.processRematch(room, meta.playerId);

      callback?.({ success: true });
      io.to(room.roomCode).emit('game:rematchRequest', {
        playerId: meta.playerId,
        username: player?.username || 'Opponent',
      });

      if (res.readyForRematch) {
        io.to(room.roomCode).emit('game:rematchAccepted', {
          starterPlayerId: res.starterPlayerId!,
        });
        io.to(room.roomCode).emit('room:state', roomManager.toClientState(room));
      }
    });

    // 7. room:leave
    socket.on('room:leave', (callback) => {
      const { room, player } = roomManager.removePlayer(socket.id);
      if (room) {
        socket.leave(room.roomCode);
        io.to(room.roomCode).emit('room:state', roomManager.toClientState(room));
        if (room.status === 'finished') {
          io.to(room.roomCode).emit('game:finished', {
            winnerId: room.winnerId,
            resultType: 'forfeit',
            playerLines: {},
            summary: [],
          });
        }
      }
      callback?.({ success: true });
    });

    // 8. disconnect
    socket.on('disconnect', () => {
      console.log(`[Socket] Client disconnected: ${socket.id}`);
      const { room, player } = roomManager.handleDisconnect(socket.id, (expiredRoom, disconnectedPlayerId) => {
        // Grace period expired -> forfeit
        const remainingPlayer = Array.from(expiredRoom.players.values()).find((p) => p.id !== disconnectedPlayerId);
        if (expiredRoom.status === 'playing' && remainingPlayer) {
          expiredRoom.status = 'finished';
          expiredRoom.winnerId = remainingPlayer.id;
          expiredRoom.resultType = 'forfeit';

          io.to(expiredRoom.roomCode).emit('game:finished', {
            winnerId: remainingPlayer.id,
            resultType: 'forfeit',
            playerLines: {},
            summary: [],
          });
          io.to(expiredRoom.roomCode).emit('room:state', roomManager.toClientState(expiredRoom));
          DatabaseService.recordMatch(expiredRoom).catch(console.error);
        }
      });

      if (room && player) {
        io.to(room.roomCode).emit('player:disconnected', {
          playerId: player.id,
          username: player.username,
          gracePeriodSeconds: 45,
        });
        io.to(room.roomCode).emit('room:state', roomManager.toClientState(room));
      }
    });
  });
}
