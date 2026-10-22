import { useEffect, useRef, useCallback } from 'react';
import { Share, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useGameStore } from '../store/gameStore';
import { usePlayerStore } from '../store/playerStore';
import { GameType, Player } from '../../shared/types';
import { roomService } from '../services/roomService';
import { FirebaseRoom } from '../types/room';

let activeRoomUnsub: (() => void) | null = null;
let currentActiveRoomId: string | null = null;

export function useRoom() {
  const router = useRouter();
  const playerId = usePlayerStore((s) => s.playerId);
  const username = usePlayerStore((s) => s.username);
  const avatarUrl = usePlayerStore((s) => s.avatarUrl);

  const selectedGame = useGameStore((s) => s.selectedGame);
  const roomCode = useGameStore((s) => s.roomCode);
  const players = useGameStore((s) => s.players);
  const status = useGameStore((s) => s.status);
  const isReady = useGameStore((s) => s.isReady);
  const hostPlayerId = useGameStore((s) => s.hostPlayerId);

  const setIsReady = useGameStore((s) => s.setIsReady);
  const setSelectedGame = useGameStore((s) => s.setSelectedGame);
  const resetGame = useGameStore((s) => s.resetGame);

  const handleRoomUpdate = useCallback(
    (room: FirebaseRoom | null) => {
      if (!room || room.status === 'cancelled') {
        if (currentActiveRoomId) {
          Alert.alert('Room Closed', 'The room was cancelled or closed by the host.');
          leaveRoom();
          router.replace('/home');
        }
        return;
      }

      // Convert Firebase room players to GameStore Player map
      const mappedPlayers: Record<string, Player> = {};
      Object.values(room.players).forEach((p) => {
        mappedPlayers[p.uid] = {
          id: p.uid,
          socketId: p.uid,
          username: p.username,
          avatarUrl: p.avatarUrl,
          isReady: p.isReady || p.isHost,
          isConnected: true,
          color: p.ludoColor || p.chessColor,
        };
      });

      const myPlayer = room.players[playerId];
      if (myPlayer) {
        setIsReady(Boolean(myPlayer.isReady));
      }

      useGameStore.setState({
        roomCode: room.roomCode,
        hostPlayerId: room.hostUid,
        status: room.status === 'playing' ? 'playing' : room.status === 'waiting' ? 'waiting' : 'ready',
        players: mappedPlayers,
        selectedGame: room.gameType,
      });

      // Synchronize game-specific states if in progress
      if (room.status === 'playing' && room.gameState) {
        if (room.gameState.bingo) {
          const bg = room.gameState.bingo;
          useGameStore.setState({
            calledNumbers: bg.calledNumbers,
            lastCalledNumber: bg.lastCalledNumber,
            currentTurnPlayerId: bg.currentTurnUid,
            playerLines: bg.playerLines || {},
          });
        }
        if (room.gameState.chess) {
          useGameStore.setState({
            chessState: room.gameState.chess as any,
            currentTurnPlayerId: room.gameState.chess.turn === 'w' ? room.gameState.chess.whiteUid : room.gameState.chess.blackUid,
          });
        }
        if (room.gameState.ludo) {
          useGameStore.setState({
            ludoState: room.gameState.ludo as any,
            currentTurnPlayerId: room.gameState.ludo.currentTurnUid,
          });
        }
      }
    },
    [playerId, router]
  );

  const bindRoomListener = (roomId: string) => {
    if (activeRoomUnsub) {
      activeRoomUnsub();
      activeRoomUnsub = null;
    }
    currentActiveRoomId = roomId;
    activeRoomUnsub = roomService.subscribeToRoom(roomId, handleRoomUpdate);
  };

  const createRoom = async (gameType?: GameType, maxPlayers?: number) => {
    const targetGame = gameType || selectedGame || 'bingo';
    const res = await roomService.createPrivateRoom(
      targetGame,
      { uid: playerId, username, avatarUrl },
      maxPlayers
    );

    if (res.success && res.roomId && res.roomCode) {
      useGameStore.setState({
        roomCode: res.roomCode,
        selectedGame: targetGame,
        hostPlayerId: playerId,
        status: 'waiting',
      });
      bindRoomListener(res.roomId);
    }
    return res;
  };

  const joinRoom = async (code: string) => {
    const res = await roomService.joinRoomByCode(code, {
      uid: playerId,
      username,
      avatarUrl,
    });

    if (res.success && res.roomId) {
      useGameStore.setState({
        roomCode: code.toUpperCase(),
        selectedGame: res.gameType || selectedGame,
        status: 'waiting',
      });
      bindRoomListener(res.roomId);
    }
    return res;
  };

  const toggleReady = async () => {
    const nextReady = !isReady;
    setIsReady(nextReady);
    if (currentActiveRoomId) {
      await roomService.setReady(currentActiveRoomId, playerId, nextReady);
    }
    return { success: true };
  };

  const startMatch = async () => {
    if (!currentActiveRoomId) return { success: false, error: 'No active room' };
    return await roomService.startMatch(currentActiveRoomId, playerId);
  };

  const shareRoomInvitation = async () => {
    try {
      await Share.share({
        message: `Join my ${selectedGame.toUpperCase()} match on GameHub-3D! Enter room code: ${roomCode}`,
      });
    } catch {}
  };

  const leaveRoom = async () => {
    if (activeRoomUnsub) {
      activeRoomUnsub();
      activeRoomUnsub = null;
    }
    if (currentActiveRoomId) {
      await roomService.leaveRoom(currentActiveRoomId, playerId);
      currentActiveRoomId = null;
    }
    resetGame();
  };

  return {
    selectedGame,
    roomCode,
    roomId: currentActiveRoomId,
    players,
    status,
    isReady,
    isHost: hostPlayerId === playerId,
    createRoom,
    joinRoom,
    toggleReady,
    startMatch,
    shareRoomInvitation,
    leaveRoom,
  };
}
