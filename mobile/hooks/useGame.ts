import { useEffect, useCallback } from 'react';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { socketService } from '../services/socket';
import { useGameStore } from '../store/gameStore';
import { usePlayerStore } from '../store/playerStore';
import { BoardArray, LineHighlight } from '../../shared/types';

export function useGame() {
  const router = useRouter();
  const playerId = usePlayerStore((s) => s.playerId);
  const hapticsEnabled = usePlayerStore((s) => s.hapticsEnabled);

  const roomCode = useGameStore((s) => s.roomCode);
  const myBoard = useGameStore((s) => s.myBoard);
  const calledNumbers = useGameStore((s) => s.calledNumbers);
  const lastCalledNumber = useGameStore((s) => s.lastCalledNumber);
  const currentTurnPlayerId = useGameStore((s) => s.currentTurnPlayerId);
  const players = useGameStore((s) => s.players);
  const playerLines = useGameStore((s) => s.playerLines);
  const status = useGameStore((s) => s.status);
  const winnerId = useGameStore((s) => s.winnerId);
  const resultType = useGameStore((s) => s.resultType);
  const summary = useGameStore((s) => s.summary);
  const rematchRequests = useGameStore((s) => s.rematchRequests);

  const isMyTurn = currentTurnPlayerId === playerId;
  const myLines = playerLines[playerId] || 0;

  // Find opponent
  const opponent = Object.values(players).find((p) => p.id !== playerId);
  const opponentLines = opponent ? playerLines[opponent.id] || 0 : 0;

  useEffect(() => {
    const socket = socketService.connect();

    const handleGameStart = () => {
      if (hapticsEnabled) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      }
      router.replace('/game');
    };

    const handleNumberCalled = (data: {
      number: number;
      calledByPlayerId: string;
      playerLines: Record<string, number>;
    }) => {
      useGameStore.getState().numberCalled(data.number, data.calledByPlayerId, data.playerLines);
      if (hapticsEnabled) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
      }
    };

    const handleTurnChanged = (data: { currentTurnPlayerId: string }) => {
      useGameStore.getState().setCurrentTurn(data.currentTurnPlayerId);
      if (data.currentTurnPlayerId === playerId && hapticsEnabled) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      }
    };

    const handleGameFinished = (data: {
      winnerId: string | null;
      resultType: any;
      playerLines: Record<string, number>;
      summary: any[];
    }) => {
      useGameStore.getState().setGameFinished(data.winnerId, data.resultType, data.playerLines, data.summary);
      if (hapticsEnabled) {
        if (data.winnerId === playerId) {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
        } else {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
        }
      }
      router.push('/results');
    };

    const handleRematchRequest = (data: { playerId: string }) => {
      useGameStore.getState().addRematchRequest(data.playerId);
    };

    const handleRematchAccepted = () => {
      router.replace('/game');
    };

    socket.on('game:start', handleGameStart);
    socket.on('game:numberCalled', handleNumberCalled);
    socket.on('game:turnChanged', handleTurnChanged);
    socket.on('game:finished', handleGameFinished);
    socket.on('game:rematchRequest', handleRematchRequest);
    socket.on('game:rematchAccepted', handleRematchAccepted);

    return () => {
      socket.off('game:start', handleGameStart);
      socket.off('game:numberCalled', handleNumberCalled);
      socket.off('game:turnChanged', handleTurnChanged);
      socket.off('game:finished', handleGameFinished);
      socket.off('game:rematchRequest', handleRematchRequest);
      socket.off('game:rematchAccepted', handleRematchAccepted);
    };
  }, [playerId, hapticsEnabled, router]);

  const submitBoard = useCallback(
    async (board: BoardArray) => {
      return await socketService.submitBoard(board);
    },
    []
  );

  const callNumber = useCallback(
    async (num: number) => {
      if (!isMyTurn) return { success: false, error: 'Not your turn!' };
      if (calledNumbers.includes(num)) return { success: false, error: 'Already called!' };
      return await socketService.callNumber(num);
    },
    [isMyTurn, calledNumbers]
  );

  const requestRematch = useCallback(async () => {
    return await socketService.requestRematch();
  }, []);

  return {
    roomCode,
    myBoard,
    calledNumbers,
    lastCalledNumber,
    isMyTurn,
    currentTurnPlayerId,
    myLines,
    opponentLines,
    opponent,
    status,
    winnerId,
    resultType,
    summary,
    rematchRequests,
    submitBoard,
    callNumber,
    requestRematch,
  };
}
