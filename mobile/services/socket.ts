import { io, Socket } from 'socket.io-client';
import Constants from 'expo-constants';
import {
  ClientToServerEvents,
  ServerToClientEvents,
  BoardArray,
  GameType,
  ChessMoveInput,
} from '../../shared/types';
import { useGameStore } from '../store/gameStore';

function getDefaultServerUrl(): string {
  if (process.env.EXPO_PUBLIC_SERVER_URL) {
    return process.env.EXPO_PUBLIC_SERVER_URL;
  }
  const hostUri = Constants.expoConfig?.hostUri;
  if (hostUri) {
    const host = hostUri.split(':')[0];
    if (host) {
      return `http://${host}:3001`;
    }
  }
  return 'http://localhost:3001';
}

const DEFAULT_SERVER_URL = getDefaultServerUrl();

class SocketService {
  private socket: Socket<ServerToClientEvents, ClientToServerEvents> | null = null;
  private currentServerUrl: string = DEFAULT_SERVER_URL;

  public setServerUrl(url: string) {
    if (this.currentServerUrl !== url) {
      this.currentServerUrl = url;
      if (this.socket) {
        this.disconnect();
        this.connect();
      }
    }
  }

  public getServerUrl(): string {
    return this.currentServerUrl;
  }

  public connect(): Socket<ServerToClientEvents, ClientToServerEvents> {
    if (this.socket && this.socket.connected) {
      return this.socket;
    }

    if (this.socket) {
      this.socket.disconnect();
    }

    this.socket = io(this.currentServerUrl, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      timeout: 10000,
    });

    this.socket.on('connect', () => {
      console.log('[Socket] Connected to server:', this.socket?.id);
      useGameStore.getState().setConnected(true);
      useGameStore.getState().setConnectionError(null);
    });

    this.socket.on('disconnect', (reason) => {
      console.log('[Socket] Disconnected:', reason);
      useGameStore.getState().setConnected(false);
    });

    this.socket.on('connect_error', (err) => {
      console.warn('[Socket] Connection error:', err.message);
      useGameStore.getState().setConnected(false);
      useGameStore
        .getState()
        .setConnectionError('Cannot reach multiplayer server. Check network connection.');
    });

    return this.socket;
  }

  public getSocket(): Socket<ServerToClientEvents, ClientToServerEvents> | null {
    if (!this.socket) {
      return this.connect();
    }
    return this.socket;
  }

  public disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    useGameStore.getState().setConnected(false);
  }

  public createRoom(payload: {
    username: string;
    avatarUrl: string;
    playerId?: string;
    gameType?: GameType;
    maxPlayers?: number;
  }): Promise<{
    success: boolean;
    roomCode?: string;
    playerId?: string;
    gameType?: GameType;
    error?: string;
  }> {
    const s = this.getSocket();
    return new Promise((resolve) => {
      if (!s) return resolve({ success: false, error: 'Socket not connected' });
      s.emit('room:create', payload, (res) => resolve(res));
    });
  }

  public joinRoom(payload: {
    roomCode: string;
    username: string;
    avatarUrl: string;
    playerId?: string;
  }): Promise<{
    success: boolean;
    roomCode?: string;
    playerId?: string;
    gameType?: GameType;
    error?: string;
  }> {
    const s = this.getSocket();
    return new Promise((resolve) => {
      if (!s) return resolve({ success: false, error: 'Socket not connected' });
      s.emit('room:join', payload, (res) => resolve(res));
    });
  }

  public setReady(isReady: boolean): Promise<{ success: boolean; error?: string }> {
    const s = this.getSocket();
    return new Promise((resolve) => {
      if (!s) return resolve({ success: false, error: 'Socket not connected' });
      s.emit('room:ready', { isReady }, (res) => resolve(res || { success: true }));
    });
  }

  public submitBoard(board: BoardArray): Promise<{ success: boolean; error?: string }> {
    const s = this.getSocket();
    return new Promise((resolve) => {
      if (!s) return resolve({ success: false, error: 'Socket not connected' });
      s.emit('game:boardSubmit', { board }, (res) => resolve(res));
    });
  }

  public callNumber(number: number): Promise<{ success: boolean; error?: string }> {
    const s = this.getSocket();
    return new Promise((resolve) => {
      if (!s) return resolve({ success: false, error: 'Socket not connected' });
      s.emit('game:callNumber', { number }, (res) => resolve(res));
    });
  }

  public chessMove(move: ChessMoveInput): Promise<{ success: boolean; error?: string }> {
    const s = this.getSocket();
    return new Promise((resolve) => {
      if (!s) return resolve({ success: false, error: 'Socket not connected' });
      s.emit('chess:move', move, (res) => resolve(res));
    });
  }

  public chessResign(): Promise<{ success: boolean; error?: string }> {
    const s = this.getSocket();
    return new Promise((resolve) => {
      if (!s) return resolve({ success: false, error: 'Socket not connected' });
      s.emit('chess:resign', (res) => resolve(res || { success: true }));
    });
  }

  public ludoRollDice(): Promise<{
    success: boolean;
    diceValue?: number;
    legalTokenIds?: number[];
    autoSkipped?: boolean;
    error?: string;
  }> {
    const s = this.getSocket();
    return new Promise((resolve) => {
      if (!s) return resolve({ success: false, error: 'Socket not connected' });
      s.emit('ludo:rollDice', (res) => resolve(res));
    });
  }

  public ludoMoveToken(tokenId: number): Promise<{ success: boolean; error?: string }> {
    const s = this.getSocket();
    return new Promise((resolve) => {
      if (!s) return resolve({ success: false, error: 'Socket not connected' });
      s.emit('ludo:moveToken', { tokenId }, (res) => resolve(res));
    });
  }

  public requestRematch(): Promise<{ success: boolean; error?: string }> {
    const s = this.getSocket();
    return new Promise((resolve) => {
      if (!s) return resolve({ success: false, error: 'Socket not connected' });
      s.emit('game:rematchRequest', (res) => resolve(res || { success: true }));
    });
  }

  public leaveRoom(): Promise<{ success: boolean; error?: string }> {
    const s = this.getSocket();
    return new Promise((resolve) => {
      if (!s) return resolve({ success: false, error: 'Socket not connected' });
      s.emit('room:leave', (res) => resolve(res || { success: true }));
    });
  }
}

export const socketService = new SocketService();
