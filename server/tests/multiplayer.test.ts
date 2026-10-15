import http from 'http';
import { AddressInfo } from 'net';
import express from 'express';
import { Server } from 'socket.io';
import { io as ClientSocket, Socket as ClientSocketType } from 'socket.io-client';
import { RoomManager } from '../src/game/roomManager';
import { setupSocketHandlers } from '../src/socket/handlers';
import { ClientToServerEvents, ServerToClientEvents } from '../../shared/types';
import { BingoEngine } from '../src/game/bingoEngine';

describe('Multiplayer Realtime Integration (2 Simulated Clients)', () => {
  let server: http.Server;
  let ioServer: Server;
  let roomManager: RoomManager;
  let port: number;
  let client1: ClientSocketType<ServerToClientEvents, ClientToServerEvents>;
  let client2: ClientSocketType<ServerToClientEvents, ClientToServerEvents>;

  beforeAll((done) => {
    const app = express();
    server = http.createServer(app);
    ioServer = new Server(server);
    roomManager = new RoomManager();
    setupSocketHandlers(ioServer, roomManager);

    server.listen(0, () => {
      port = (server.address() as AddressInfo).port;
      done();
    });
  });

  afterAll((done) => {
    roomManager.clearAllTimers();
    if (client1?.connected) client1.disconnect();
    if (client2?.connected) client2.disconnect();
    ioServer.close();
    server.close(done);
  });

  test('full multiplayer lifecycle: create room, join, setup boards, ready, turns, and moves', (done) => {
    const serverUrl = `http://localhost:${port}`;
    client1 = ClientSocket(serverUrl, { transports: ['websocket'] });
    client2 = ClientSocket(serverUrl, { transports: ['websocket'] });

    let roomCode = '';
    let p1Id = '';
    let p2Id = '';

    const board1 = BingoEngine.generateShuffledBoard();
    const board2 = BingoEngine.generateShuffledBoard();

    client1.on('connect', () => {
      // 1. Client 1 creates room
      client1.emit(
        'room:create',
        { username: 'PlayerOne', avatarUrl: 'avatar1.png' },
        (res) => {
          expect(res.success).toBe(true);
          expect(res.roomCode).toBeDefined();
          expect(res.roomCode).toHaveLength(6);
          roomCode = res.roomCode!;
          p1Id = res.playerId!;

          // 2. Client 2 joins room using roomCode
          client2.emit(
            'room:join',
            { roomCode, username: 'PlayerTwo', avatarUrl: 'avatar2.png' },
            (joinRes) => {
              expect(joinRes.success).toBe(true);
              p2Id = joinRes.playerId!;

              // 3. Both submit boards
              client1.emit('game:boardSubmit', { board: board1 }, (b1Res) => {
                expect(b1Res.success).toBe(true);

                client2.emit('game:boardSubmit', { board: board2 }, (b2Res) => {
                  expect(b2Res.success).toBe(true);

                  // 4. Both mark ready
                  client1.emit('room:ready', { isReady: true });
                  client2.emit('room:ready', { isReady: true });
                });
              });
            }
          );
        }
      );
    });

    // 5. Expect game:start event on both clients
    client1.on('game:start', (data) => {
      expect(data.starterPlayerId).toBe(p1Id);

      // 6. Test out-of-turn rejection: Player 2 tries to call first
      client2.emit('game:callNumber', { number: 7 }, (errRes) => {
        expect(errRes.success).toBe(false);
        expect(errRes.error).toMatch(/Not your turn/);

        // 7. Player 1 makes valid move
        client1.emit('game:callNumber', { number: 7 }, (callRes) => {
          expect(callRes.success).toBe(true);
        });
      });
    });

    // 8. Both clients receive game:numberCalled
    let receivedNumberCount = 0;
    client2.on('game:numberCalled', (data) => {
      receivedNumberCount++;
      if (receivedNumberCount === 1) {
        expect(data.number).toBe(7);
        expect(data.calledByPlayerId).toBe(p1Id);
        expect(data.calledNumbers).toContain(7);

        // 9. Turn changes to Player 2
        // Player 2 tries to call the SAME number 7 -> should fail
        client2.emit('game:callNumber', { number: 7 }, (dupRes) => {
          expect(dupRes.success).toBe(false);
          expect(dupRes.error).toMatch(/already been called/);

          // Player 2 calls a valid next number: 15
          client2.emit('game:callNumber', { number: 15 }, (validRes) => {
            expect(validRes.success).toBe(true);
          });
        });
      } else if (receivedNumberCount === 2) {
        expect(data.number).toBe(15);
        expect(data.calledByPlayerId).toBe(p2Id);
        expect(data.calledNumbers).toEqual([7, 15]);

        // Success!
        done();
      }
    });
  }, 10000);
});
