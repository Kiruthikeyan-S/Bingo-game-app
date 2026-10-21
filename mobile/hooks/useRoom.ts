import { useEffect } from 'react';
import { socketService } from '../services/socket';
import { useGameStore } from '../store/gameStore';
import { usePlayerStore } from '../store/playerStore';
import { GameType, RoomState } from '../../shared/types';

export function useRoom() {
  const playerId = usePlayerStore((s) => s.playerId);
  const username = usePlayerStore((s) => s.username);
  const avatarUrl = usePlayerStore((s) => s.avatarUrl);

  const selectedGame = useGameStore((s) => s.selectedGame);
  const roomCode = useGameStore((s) => s.roomCode);
  const players = useGameStore((s) => s.players);
  const status = useGameStore((s) => s.status);
  const isReady = useGameStore((s) => s.isReady);
  const hostPlayerId = useGameStore((s) => s.hostPlayerId);

  const updateFromRoomState = useGameStore((s) => s.updateFromRoomState);
  const setIsReady = useGameStore((s) => s.setIsReady);
  const setSelectedGame = useGameStore((s) => s.setSelectedGame);
  const resetGame = useGameStore((s) => s.resetGame);

  useEffect(() => {
    const socket = socketService.connect();

    const handleRoomState = (state: RoomState) => {
      updateFromRoomState(state, playerId);
      if (state.players[playerId]) {
        setIsReady(state.players[playerId].isReady);
      }
    };

    socket.on('room:state', handleRoomState);

    return () => {
      socket.off('room:state', handleRoomState);
    };
  }, [playerId, updateFromRoomState, setIsReady]);

  const createRoom = async (gameType?: GameType, maxPlayers?: number) => {
    const targetGame = gameType || selectedGame;
    const res = await socketService.createRoom({
      username,
      avatarUrl,
      playerId,
      gameType: targetGame,
      maxPlayers: maxPlayers || (targetGame === 'chess' ? 2 : 2),
    });
    if (res.success && res.playerId && res.playerId !== playerId) {
      usePlayerStore.setState({ playerId: res.playerId });
    }
    if (res.success && res.gameType) {
      setSelectedGame(res.gameType);
    }
    return res;
  };

  const joinRoom = async (code: string) => {
    const res = await socketService.joinRoom({
      roomCode: code,
      username,
      avatarUrl,
      playerId,
    });
    if (res.success && res.playerId && res.playerId !== playerId) {
      usePlayerStore.setState({ playerId: res.playerId });
    }
    if (res.success && res.gameType) {
      setSelectedGame(res.gameType);
    }
    return res;
  };

  const toggleReady = async () => {
    const nextReady = !isReady;
    setIsReady(nextReady);
    const res = await socketService.setReady(nextReady);
    if (!res.success) {
      setIsReady(!nextReady);
    }
    return res;
  };

  const leaveRoom = async () => {
    await socketService.leaveRoom();
    resetGame();
  };

  return {
    selectedGame,
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
