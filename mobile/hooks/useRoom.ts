import { useEffect } from 'react';
import { socketService } from '../services/socket';
import { useGameStore } from '../store/gameStore';
import { usePlayerStore } from '../store/playerStore';
import { RoomState } from '../../shared/types';

export function useRoom() {
  const playerId = usePlayerStore((s) => s.playerId);
  const username = usePlayerStore((s) => s.username);
  const avatarUrl = usePlayerStore((s) => s.avatarUrl);

  const roomCode = useGameStore((s) => s.roomCode);
  const players = useGameStore((s) => s.players);
  const status = useGameStore((s) => s.status);
  const isReady = useGameStore((s) => s.isReady);
  const hostPlayerId = useGameStore((s) => s.hostPlayerId);

  const updateFromRoomState = useGameStore((s) => s.updateFromRoomState);
  const setIsReady = useGameStore((s) => s.setIsReady);
  const resetGame = useGameStore((s) => s.resetGame);

  useEffect(() => {
    const socket = socketService.connect();

    const handleRoomState = (state: RoomState) => {
      updateFromRoomState(state, playerId);
      // Synchronize my ready state
      if (state.players[playerId]) {
        setIsReady(state.players[playerId].isReady);
      }
    };

    socket.on('room:state', handleRoomState);

    return () => {
      socket.off('room:state', handleRoomState);
    };
  }, [playerId, updateFromRoomState, setIsReady]);

  const createRoom = async () => {
    return await socketService.createRoom({ username, avatarUrl });
  };

  const joinRoom = async (code: string) => {
    return await socketService.joinRoom({
      roomCode: code,
      username,
      avatarUrl,
      playerId,
    });
  };

  const toggleReady = async () => {
    const nextReady = !isReady;
    setIsReady(nextReady);
    const res = await socketService.setReady(nextReady);
    if (!res.success) {
      setIsReady(!nextReady); // revert
    }
    return res;
  };

  const leaveRoom = async () => {
    await socketService.leaveRoom();
    resetGame();
  };

  return {
    roomCode,
    players,
    status,
    isReady,
    isHost: hostPlayerId === playerId,
    createRoom,
    joinRoom,
    toggleReady,
    leaveRoom,
  };
}
