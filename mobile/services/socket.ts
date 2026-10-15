import { io, Socket } from 'socket.io-client';
import { ClientToServerEvents, ServerToClientEvents, BoardArray } from '../../shared/types';
import { useGameStore } from '../store/gameStore';

// Default backend server URL
// For physical devices on local network, use the computer's LAN IP e.g. http://192.168.1.X:3001
const DEFAULT_SERVER_URL = process.env.EXPO_PUBLIC_SERVER_URL || 'http://localhost:3001';

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
      useGameStore.getState().setConnectionError('Cannot reach multiplayer server. Check network connection.');
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

  // Socket Actions with Promise wrappers
  public createRoom(payload: { username: string; avatarUrl: string }): Promise<{ success: boolean; roomCode?: string; playerId?: string; error?: string }> {
    const s = this.getSocket();
    return new Promise((resolve) => {
      if (!s) return resolve({ success: false, error: 'Socket not connected' });
      s.emit('room:create', payload, (res) => resolve(res));
    });
  }

  public joinRoom(payload: { roomCode: string; username: string; avatarUrl: string; playerId?: string }): Promise<{ success: boolean; roomCode?: string; playerId?: string; error?: string }> {
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
