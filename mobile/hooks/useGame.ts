import { useEffect, useCallback, useRef } from 'react';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { socketService } from '../services/socket';
import { useGameStore } from '../store/gameStore';
import { usePlayerStore } from '../store/playerStore';
import { BoardArray, GameType, PlayerScoreSummary } from '../../shared/types';
import { BingoEngine, BingoBot } from '../engines/bingo/rules';
import { BingoBot as BingoBotClass } from '../engines/bingo/bot';

export function useGame() {
  const router = useRouter();
  const playerId = usePlayerStore((s) => s.playerId);
  const username = usePlayerStore((s) => s.username);
  const avatarUrl = usePlayerStore((s) => s.avatarUrl);
  const hapticsEnabled = usePlayerStore((s) => s.hapticsEnabled);

  const selectedGame = useGameStore((s) => s.selectedGame);
  const gameMode = useGameStore((s) => s.gameMode);
  const botDifficulty = useGameStore((s) => s.botDifficulty);
  const roomCode = useGameStore((s) => s.roomCode);
  const myBoard = useGameStore((s) => s.myBoard);
  const botBoard = useGameStore((s) => s.botBoard);
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

  const opponent = Object.values(players).find((p) => p.id !== playerId);
  const opponentLines = opponent ? playerLines[opponent.id] || 0 : 0;

  const botInstanceRef = useRef<BingoBotClass>(new BingoBotClass(botDifficulty));
  useEffect(() => {
    botInstanceRef.current.changeDifficulty(botDifficulty);
  }, [botDifficulty]);

  const navigateToGameScreen = useCallback(
    (gType: GameType) => {
      if (gType === 'chess') {
        router.replace('/games/chess');
      } else if (gType === 'ludo') {
        router.replace('/games/ludo');
      } else {
        router.replace('/game');
      }
    },
    [router]
  );

  // Online socket listeners (only active when gameMode === 'online')
  useEffect(() => {
    if (gameMode === 'bot') return;

    const socket = socketService.connect();

    const handleGameStart = (data: { gameType?: GameType }) => {
      if (hapticsEnabled) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      }
      navigateToGameScreen(data.gameType || useGameStore.getState().selectedGame);
    };

    const handleNumberCalled = (data: {
      number: number;
      calledByPlayerId: string;
      playerLines: Record<string, number>;
    }) => {
      useGameStore
        .getState()
        .numberCalled(data.number, data.calledByPlayerId, data.playerLines);
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

    const handleChessStateUpdated = (chessState: any) => {
      useGameStore.getState().setChessState(chessState);
    };

    const handleLudoStateUpdated = (ludoState: any) => {
      useGameStore.getState().setLudoState(ludoState);
    };

    const handleGameFinished = (data: {
      winnerId: string | null;
      resultType: any;
      playerLines: Record<string, number>;
      summary: any[];
      gameType?: GameType;
    }) => {
      const store = useGameStore.getState();
      if (store.status === 'finished') return;

      store.setGameFinished(data.winnerId, data.resultType, data.playerLines, data.summary);

      const opp = Object.values(store.players).find((p) => p.id !== playerId);
      const isDraw = data.winnerId === null;
      const isWin = data.winnerId === playerId;

      usePlayerStore.getState().recordMatchResult({
        gameType: data.gameType || store.selectedGame,
        mode: 'online',
        opponentName: opp?.username || 'Online Rival',
        result: isDraw ? 'draw' : isWin ? 'win' : 'loss',
        resultReason: String(data.resultType || 'finished'),
        movesCount:
          store.selectedGame === 'bingo'
            ? store.calledNumbers.length
            : store.chessState?.moveHistory.length || 20,
      });

      if (hapticsEnabled) {
        if (isWin) {
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

    const handleRematchAccepted = (data: { gameType?: GameType }) => {
      navigateToGameScreen(data.gameType || useGameStore.getState().selectedGame);
    };

    socket.on('game:start', handleGameStart);
    socket.on('game:numberCalled', handleNumberCalled);
    socket.on('game:turnChanged', handleTurnChanged);
    socket.on('chess:stateUpdated', handleChessStateUpdated);
    socket.on('ludo:stateUpdated', handleLudoStateUpdated);
    socket.on('game:finished', handleGameFinished);
    socket.on('game:rematchRequest', handleRematchRequest);
    socket.on('game:rematchAccepted', handleRematchAccepted);

    return () => {
      socket.off('game:start', handleGameStart);
      socket.off('game:numberCalled', handleNumberCalled);
      socket.off('game:turnChanged', handleTurnChanged);
      socket.off('chess:stateUpdated', handleChessStateUpdated);
      socket.off('ludo:stateUpdated', handleLudoStateUpdated);
      socket.off('game:finished', handleGameFinished);
      socket.off('game:rematchRequest', handleRematchRequest);
      socket.off('game:rematchAccepted', handleRematchAccepted);
    };
  }, [gameMode, playerId, hapticsEnabled, router, navigateToGameScreen]);

  // Helper to apply a Bingo number call in offline Bot mode
  const applyLocalBotModeNumber = useCallback(
    (num: number, callerId: string) => {
      const store = useGameStore.getState();
      if (store.status !== 'playing') return;

      const nextCalled = [...store.calledNumbers, num];
      const botId = 'bot_bingo_ai';

      const outcome = BingoEngine.evaluateMatchOutcome(
        playerId,
        store.myBoard,
        botId,
        store.botBoard,
        nextCalled
      );

      const linesRecord: Record<string, number> = {
        [playerId]: outcome.p1Result.lineCount,
        [botId]: outcome.p2Result.lineCount,
      };

      store.numberCalled(num, callerId, linesRecord);

      if (hapticsEnabled) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
      }

      if (outcome.isGameOver && outcome.resultType) {
        const botPlayer = store.players[botId];
        const summaryList: PlayerScoreSummary[] = [
          {
            playerId,
            username,
            linesCompleted: outcome.p1Result.lineCount,
            isWinner: outcome.winnerId === playerId,
            isDraw: outcome.resultType === 'draw',
            gameType: 'bingo',
          },
          {
            playerId: botId,
            username: botPlayer?.username || 'BingoBot',
            linesCompleted: outcome.p2Result.lineCount,
            isWinner: outcome.winnerId === botId,
            isDraw: outcome.resultType === 'draw',
            gameType: 'bingo',
          },
        ];

        store.setGameFinished(
          outcome.winnerId,
          outcome.resultType,
          linesRecord,
          summaryList
        );
        store.setCurrentTurn(null);

        usePlayerStore.getState().recordMatchResult({
          gameType: 'bingo',
          mode: 'bot',
          difficulty: store.botDifficulty,
          opponentName: botPlayer?.username || 'BingoBot',
          result:
            outcome.resultType === 'draw'
              ? 'draw'
              : outcome.winnerId === playerId
              ? 'win'
              : 'loss',
          resultReason: outcome.resultType === 'draw' ? 'Simultaneous 5 Lines' : '5 Bingo Lines',
          movesCount: nextCalled.length,
        });

        router.push('/results');
        return;
      }

      const nextTurn = callerId === playerId ? botId : playerId;
      store.setCurrentTurn(nextTurn);
    },
    [playerId, username, hapticsEnabled, router]
  );

  // Trigger Bingo Bot move automatically when it's Bot's turn in offline mode
  useEffect(() => {
    if (
      gameMode !== 'bot' ||
      selectedGame !== 'bingo' ||
      status !== 'playing' ||
      currentTurnPlayerId !== 'bot_bingo_ai'
    ) {
      return;
    }

    let cancelled = false;
    botInstanceRef.current.executeBotMove(
      {
        botBoard,
        calledNumbers,
      },
      (chosenNum) => {
        if (!cancelled) {
          applyLocalBotModeNumber(chosenNum, 'bot_bingo_ai');
        }
      },
      {
        minDelayMs: 650,
        maxDelayMs: 1150,
        isGameActive: () =>
          !cancelled &&
          useGameStore.getState().status === 'playing' &&
          useGameStore.getState().currentTurnPlayerId === 'bot_bingo_ai',
      }
    );

    return () => {
      cancelled = true;
    };
  }, [
    gameMode,
    selectedGame,
    status,
    currentTurnPlayerId,
    botBoard,
    calledNumbers,
    applyLocalBotModeNumber,
  ]);

  const submitBoard = useCallback(
    async (board: BoardArray) => {
      if (gameMode === 'bot') {
        useGameStore.getState().setMyBoard(board);
        return { success: true };
      }
      return await socketService.submitBoard(board);
    },
    [gameMode]
  );

  const callNumber = useCallback(
    async (num: number) => {
      if (!isMyTurn) return { success: false, error: 'Not your turn!' };
      if (calledNumbers.includes(num)) return { success: false, error: 'Already called!' };

      if (gameMode === 'bot') {
        applyLocalBotModeNumber(num, playerId);
        return { success: true };
      }

      return await socketService.callNumber(num);
    },
    [isMyTurn, calledNumbers, gameMode, applyLocalBotModeNumber, playerId]
  );

  const requestRematch = useCallback(async () => {
    if (gameMode === 'bot') {
      const store = useGameStore.getState();
      if (store.selectedGame === 'bingo') {
        store.startBotBingoMatch(playerId, username, avatarUrl);
        router.replace('/game');
      } else if (store.selectedGame === 'chess') {
        router.replace('/games/chess');
      } else if (store.selectedGame === 'ludo') {
        router.replace('/games/ludo');
      }
      return { success: true };
    }
    return await socketService.requestRematch();
  }, [gameMode, playerId, username, avatarUrl, router]);

  return {
    selectedGame,
    gameMode,
    botDifficulty,
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
