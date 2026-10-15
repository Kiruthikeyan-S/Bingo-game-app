import { useEffect } from 'react';
import { socketService } from '../services/socket';
import { useGameStore } from '../store/gameStore';

export function useSocket() {
  const isConnected = useGameStore((state) => state.isConnected);
  const connectionError = useGameStore((state) => state.connectionError);

  useEffect(() => {
    socketService.connect();
  }, []);

  return {
    isConnected,
    connectionError,
    socket: socketService.getSocket(),
  };
}
