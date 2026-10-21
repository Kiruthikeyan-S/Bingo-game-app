import { Server, Socket } from 'socket.io';
import { ClientToServerEvents, ServerToClientEvents } from '../../../shared/types';
import {
  CreateRoomInputSchema,
  JoinRoomInputSchema,
  CallNumberInputSchema,
  ChessMoveInputSchema,
  LudoMoveTokenInputSchema,
} from '../../../shared/schemas';
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
          return callback({
            success: false,
            error: val.error.errors[0]?.message || 'Invalid input',
          });
        }

        const { room, player } = roomManager.createRoom(socket.id, val.data);
        socket.join(room.roomCode);

        DatabaseService.saveProfile(player.id, player.username, player.avatarUrl).catch(
          console.error
        );

        callback({
          success: true,
          roomCode: room.roomCode,
          playerId: player.id,
          gameType: room.gameType,
        });
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
          return callback({
            success: false,
            error: val.error.errors[0]?.message || 'Invalid input',
          });
        }

        const result = roomManager.joinRoom(socket.id, val.data);
        if (!result.success || !result.room || !result.player) {
          return callback({ success: false, error: result.error });
        }

        socket.join(result.room.roomCode);

        DatabaseService.saveProfile(
          result.player.id,
          result.player.username,
          result.player.avatarUrl
        ).catch(console.error);

        callback({
          success: true,
          roomCode: result.room.roomCode,
          playerId: result.player.id,
          gameType: result.room.gameType,
        });
        io.to(result.room.roomCode).emit(
          'room:state',
          roomManager.toClientState(result.room)
        );

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

      const canStart = roomManager.canStartGame(res.room);
      if (canStart.canStart && res.room.status === 'ready') {
        const startRes = roomManager.startGame(res.room.roomCode);
        if (startRes.success && startRes.room) {
          io.to(startRes.room.roomCode).emit(
            'room:state',
            roomManager.toClientState(startRes.room)
          );
          io.to(startRes.room.roomCode).emit('game:start', {
            starterPlayerId: startRes.room.currentTurnPlayerId!,
            gameType: startRes.room.gameType,
            players: roomManager.toClientState(startRes.room).players,
          });
          io.to(startRes.room.roomCode).emit('game:turnChanged', {
            currentTurnPlayerId: startRes.room.currentTurnPlayerId!,
          });
        }
      }
    });

    // 4. game:boardSubmit (Bingo)
    socket.on('game:boardSubmit', (payload, callback) => {
      const res = roomManager.submitBoard(socket.id, payload.board);
      if (!res.success || !res.room) {
        return callback({ success: false, error: res.error });
      }

      callback({ success: true });
      io.to(res.room.roomCode).emit('room:state', roomManager.toClientState(res.room));

      const canStart = roomManager.canStartGame(res.room);
      if (canStart.canStart) {
        const startRes = roomManager.startGame(res.room.roomCode);
        if (startRes.success && startRes.room) {
          io.to(startRes.room.roomCode).emit(
            'room:state',
            roomManager.toClientState(startRes.room)
          );
          io.to(startRes.room.roomCode).emit('game:start', {
            starterPlayerId: startRes.room.currentTurnPlayerId!,
            gameType: startRes.room.gameType,
            players: roomManager.toClientState(startRes.room).players,
          });
          io.to(startRes.room.roomCode).emit('game:turnChanged', {
            currentTurnPlayerId: startRes.room.currentTurnPlayerId!,
          });
        }
      }
    });

    // 5. game:callNumber (Bingo)
    socket.on('game:callNumber', (payload, callback) => {
      const val = CallNumberInputSchema.safeParse(payload);
      if (!val.success) {
        return callback({
          success: false,
          error: val.error.errors[0]?.message || 'Invalid number',
        });
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

      io.to(room.roomCode).emit('game:numberCalled', {
        number: outcome.number!,
        calledByPlayerId: outcome.calledByPlayerId!,
        calledNumbers: [...room.calledNumbers],
        playerLines: outcome.playerLines!,
      });

      if (outcome.evaluations) {
        for (const [pId, ev] of Object.entries(outcome.evaluations)) {
          io.to(room.roomCode).emit('game:progressUpdated', {
            playerId: pId,
            linesCompleted: ev.lineCount,
            activeLetters: ev.activeLetters,
            completedLines: ev.completedLines,
          });
        }
      }

      if (outcome.isGameOver) {
        io.to(room.roomCode).emit('game:finished', {
          winnerId: outcome.winnerId!,
          resultType: outcome.resultType!,
          playerLines: outcome.playerLines!,
          summary: outcome.summary || [],
          gameType: 'bingo',
        });

        DatabaseService.recordMatch(room).catch(console.error);
      } else if (outcome.nextTurnPlayerId) {
        io.to(room.roomCode).emit('game:turnChanged', {
          currentTurnPlayerId: outcome.nextTurnPlayerId,
        });
      }

      io.to(room.roomCode).emit('room:state', roomManager.toClientState(room));
    });

    // 6. chess:move
    socket.on('chess:move', (payload, callback) => {
      const val = ChessMoveInputSchema.safeParse(payload);
      if (!val.success) {
        return callback({
          success: false,
          error: val.error.errors[0]?.message || 'Invalid chess move payload',
        });
      }

      const meta = roomManager.getPlayerMetaBySocket(socket.id);
      if (!meta) return callback({ success: false, error: 'Player session not found' });

      const room = roomManager.getRoomByCode(meta.roomCode);
      if (!room) return callback({ success: false, error: 'Room not found' });

      const outcome = GameManager.processChessMove(room, meta.playerId, val.data);
      if (!outcome.success) {
        return callback({ success: false, error: outcome.error });
      }

      callback({ success: true });
      if (room.chessState) {
        io.to(room.roomCode).emit('chess:stateUpdated', room.chessState);
      }

      if (outcome.isGameOver) {
        io.to(room.roomCode).emit('game:finished', {
          winnerId: outcome.winnerId || null,
          resultType: outcome.resultType || 'draw',
          playerLines: {},
          summary: outcome.summary || [],
          gameType: 'chess',
        });
        DatabaseService.recordMatch(room).catch(console.error);
      } else if (room.currentTurnPlayerId) {
        io.to(room.roomCode).emit('game:turnChanged', {
          currentTurnPlayerId: room.currentTurnPlayerId,
        });
      }

      io.to(room.roomCode).emit('room:state', roomManager.toClientState(room));
    });

    // 7. chess:resign
    socket.on('chess:resign', (callback) => {
      const meta = roomManager.getPlayerMetaBySocket(socket.id);
      if (!meta) return callback?.({ success: false, error: 'Not in a room' });

      const room = roomManager.getRoomByCode(meta.roomCode);
      if (!room || room.status !== 'playing') {
        return callback?.({ success: false, error: 'Match not active' });
      }

      const winnerId = room.playerOrder.find((id) => id !== meta.playerId) || null;
      room.status = 'finished';
      room.winnerId = winnerId;
      room.resultType = 'resign';
      room.currentTurnPlayerId = null;

      const summary = room.playerOrder.map((pId) => ({
        playerId: pId,
        username: room.players.get(pId)?.username || 'Player',
        linesCompleted: room.chessState?.moveHistory.length || 0,
        isWinner: pId === winnerId,
        isDraw: false,
        gameType: 'chess' as const,
        detailText: pId === winnerId ? 'Won by Resignation' : 'Resigned',
      }));

      callback?.({ success: true });
      io.to(room.roomCode).emit('game:finished', {
        winnerId,
        resultType: 'resign',
        playerLines: {},
        summary,
        gameType: 'chess',
      });
      io.to(room.roomCode).emit('room:state', roomManager.toClientState(room));
      DatabaseService.recordMatch(room).catch(console.error);
    });

    // 8. ludo:rollDice
    socket.on('ludo:rollDice', (callback) => {
      const meta = roomManager.getPlayerMetaBySocket(socket.id);
      if (!meta) return callback({ success: false, error: 'Player session not found' });

      const room = roomManager.getRoomByCode(meta.roomCode);
      if (!room) return callback({ success: false, error: 'Room not found' });

      const res = GameManager.processLudoRoll(room, meta.playerId);
      if (!res.success) {
        return callback({ success: false, error: res.error });
      }

      callback({
        success: true,
        diceValue: res.diceValue,
        legalTokenIds: res.legalTokenIds,
        autoSkipped: res.autoTurnPassed,
      });

      if (room.ludoState) {
        io.to(room.roomCode).emit('ludo:stateUpdated', room.ludoState);
      }
      if (room.currentTurnPlayerId) {
        io.to(room.roomCode).emit('game:turnChanged', {
          currentTurnPlayerId: room.currentTurnPlayerId,
        });
      }
      io.to(room.roomCode).emit('room:state', roomManager.toClientState(room));
    });

    // 9. ludo:moveToken
    socket.on('ludo:moveToken', (payload, callback) => {
      const val = LudoMoveTokenInputSchema.safeParse(payload);
      if (!val.success) {
        return callback({ success: false, error: 'Invalid token ID' });
      }

      const meta = roomManager.getPlayerMetaBySocket(socket.id);
      if (!meta) return callback({ success: false, error: 'Player session not found' });

      const room = roomManager.getRoomByCode(meta.roomCode);
      if (!room) return callback({ success: false, error: 'Room not found' });

      const outcome = GameManager.processLudoMove(room, meta.playerId, val.data.tokenId);
      if (!outcome.success) {
        return callback({ success: false, error: outcome.error });
      }

      callback({ success: true });
      if (room.ludoState) {
        io.to(room.roomCode).emit('ludo:stateUpdated', room.ludoState);
      }

      if (outcome.isGameOver) {
        io.to(room.roomCode).emit('game:finished', {
          winnerId: outcome.winnerId || null,
          resultType: outcome.resultType || 'win',
          playerLines: {},
          summary: outcome.summary || [],
          gameType: 'ludo',
        });
        DatabaseService.recordMatch(room).catch(console.error);
      } else if (room.currentTurnPlayerId) {
        io.to(room.roomCode).emit('game:turnChanged', {
          currentTurnPlayerId: room.currentTurnPlayerId,
        });
      }

      io.to(room.roomCode).emit('room:state', roomManager.toClientState(room));
    });

    // 10. game:rematchRequest
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
          gameType: room.gameType,
        });
        io.to(room.roomCode).emit('room:state', roomManager.toClientState(room));
      }
    });

    // 11. room:leave
    socket.on('room:leave', (callback) => {
      const { room } = roomManager.removePlayer(socket.id);
      if (room) {
        socket.leave(room.roomCode);
        io.to(room.roomCode).emit('room:state', roomManager.toClientState(room));
        if (room.status === 'finished') {
          io.to(room.roomCode).emit('game:finished', {
            winnerId: room.winnerId,
            resultType: 'forfeit',
            playerLines: {},
            summary: [],
            gameType: room.gameType,
          });
        }
      }
      callback?.({ success: true });
    });

    // 12. disconnect
    socket.on('disconnect', () => {
      console.log(`[Socket] Client disconnected: ${socket.id}`);
      const { room, player } = roomManager.handleDisconnect(
        socket.id,
        (expiredRoom, disconnectedPlayerId) => {
          const remainingPlayer = Array.from(expiredRoom.players.values()).find(
            (p) => p.id !== disconnectedPlayerId
          );
          if (expiredRoom.status === 'playing' && remainingPlayer) {
            expiredRoom.status = 'finished';
            expiredRoom.winnerId = remainingPlayer.id;
            expiredRoom.resultType = 'forfeit';

            io.to(expiredRoom.roomCode).emit('game:finished', {
              winnerId: remainingPlayer.id,
              resultType: 'forfeit',
              playerLines: {},
              summary: [],
              gameType: expiredRoom.gameType,
            });
            io.to(expiredRoom.roomCode).emit(
              'room:state',
              roomManager.toClientState(expiredRoom)
            );
            DatabaseService.recordMatch(expiredRoom).catch(console.error);
          }
        }
      );

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
