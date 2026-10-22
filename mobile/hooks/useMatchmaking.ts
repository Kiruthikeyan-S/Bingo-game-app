import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'expo-router';
import { usePlayerStore } from '../store/playerStore';
import { useGameStore } from '../store/gameStore';
import { matchmakingService } from '../services/matchmakingService';
import { GameType } from '../../shared/types';

export function useMatchmaking(targetGame?: GameType) {
  const router = useRouter();
  const playerId = usePlayerStore((s) => s.playerId);
  const username = usePlayerStore((s) => s.username);
  const avatarUrl = usePlayerStore((s) => s.avatarUrl);
  const selectedGame = useGameStore((s) => s.selectedGame);
  const setSelectedGame = useGameStore((s) => s.setSelectedGame);

  const activeGame = targetGame || selectedGame || 'bingo';

  const [isSearching, setIsSearching] = useState(false);
  const [searchTime, setSearchTime] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const timerRef = useRef<any>(null);
  const unsubRef = useRef<(() => void) | null>(null);

  const startSearch = async (gType?: GameType) => {
    const game = gType || activeGame;
    setSelectedGame(game);
    setError(null);
    setIsSearching(true);
    setSearchTime(0);

    timerRef.current = setInterval(() => {
      setSearchTime((t) => t + 1);
    }, 1000);

    const res = await matchmakingService.enterQueue(game, {
      uid: playerId,
      username,
      avatarUrl,
    });

    if (!res.success) {
      stopSearch();
      setError(res.error || 'Failed to start matchmaking');
      return;
    }

    if (res.matchedRoomId) {
      handleMatchFound(res.matchedRoomId, game);
      return;
    }

    // Subscribe to queue doc updates
    unsubRef.current = matchmakingService.subscribeToQueue(
      playerId,
      (matchedRoomId) => {
        handleMatchFound(matchedRoomId, game);
      },
      () => {
        stopSearch();
      }
    );
  };

  const handleMatchFound = (roomId: string, game: GameType) => {
    stopSearch();
    useGameStore.setState({ roomCode: roomId, status: 'playing' });
    if (game === 'bingo') {
      router.replace('/board-setup');
    } else if (game === 'chess') {
      router.replace('/games/chess');
    } else if (game === 'ludo') {
      router.replace('/games/ludo');
    } else {
      router.replace('/lobby');
    }
  };

  const stopSearch = async () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (unsubRef.current) {
      unsubRef.current();
      unsubRef.current = null;
    }
    setIsSearching(false);
    await matchmakingService.leaveQueue(playerId);
  };

  useEffect(() => {
    return () => {
      stopSearch();
    };
  }, []);

  return {
    isSearching,
    searchTime,
    error,
    startSearch,
    stopSearch,
  };
}
