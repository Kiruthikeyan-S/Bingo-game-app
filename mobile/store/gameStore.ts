import { create } from 'zustand';
import {
  BoardArray,
  Player,
  RoomState,
  GameResultType,
  PlayerScoreSummary,
  GameType,
  GameMode,
  BotDifficulty,
  ChessState,
  LudoState,
} from '../../shared/types';
import { generateRandomBoard } from '../utils/bingo';

interface GameStoreState {
  selectedGame: GameType;
  gameMode: GameMode;
  botDifficulty: BotDifficulty;
  ludoBotCount: 1 | 2 | 3;

  roomCode: string;
  hostPlayerId: string;
  players: Record<string, Player>;
  playerOrder: string[];
  myBoard: BoardArray;
  botBoard: BoardArray;
  isBoardConfirmed: boolean;
  isReady: boolean;
  status: RoomState['status'];
  currentTurnPlayerId: string | null;
  calledNumbers: number[];
  lastCalledNumber: number | null;
  playerLines: Record<string, number>;
  chessState: ChessState | null;
  ludoState: LudoState | null;
  winnerId: string | null;
  resultType: GameResultType | null;
  summary: PlayerScoreSummary[];
  rematchRequests: string[];
  isConnected: boolean;
  connectionError: string | null;

  // Actions
  setSelectedGame: (game: GameType) => void;
  setGameMode: (mode: GameMode) => void;
  setBotDifficulty: (difficulty: BotDifficulty) => void;
  setLudoBotCount: (count: 1 | 2 | 3) => void;

  setConnected: (connected: boolean) => void;
  setConnectionError: (error: string | null) => void;
  setMyBoard: (board: BoardArray) => void;
  swapBoardCells: (index1: number, index2: number) => void;
  shuffleBoard: () => void;
  setBoardConfirmed: (confirmed: boolean) => void;
  setIsReady: (ready: boolean) => void;
  updateFromRoomState: (state: RoomState, myPlayerId: string) => void;
  setChessState: (chessState: ChessState | null) => void;
  setLudoState: (ludoState: LudoState | null) => void;
  numberCalled: (
    number: number,
    calledByPlayerId: string,
    playerLines: Record<string, number>
  ) => void;
  setGameFinished: (
    winnerId: string | null,
    resultType: GameResultType,
    playerLines: Record<string, number>,
    summary: PlayerScoreSummary[]
  ) => void;
  setCurrentTurn: (playerId: string | null) => void;
  addRematchRequest: (playerId: string) => void;
  startBotBingoMatch: (myPlayerId: string, myUsername: string, myAvatar: string) => void;
  resetGame: () => void;
}

export const useGameStore = create<GameStoreState>((set) => ({
  selectedGame: 'bingo',
  gameMode: 'bot',
  botDifficulty: 'medium',
  ludoBotCount: 1,

  roomCode: '',
  hostPlayerId: '',
  players: {},
  playerOrder: [],
  myBoard: generateRandomBoard(),
  botBoard: generateRandomBoard(),
  isBoardConfirmed: false,
  isReady: false,
  status: 'waiting',
  currentTurnPlayerId: null,
  calledNumbers: [],
  lastCalledNumber: null,
  playerLines: {},
  chessState: null,
  ludoState: null,
  winnerId: null,
  resultType: null,
  summary: [],
  rematchRequests: [],
  isConnected: false,
  connectionError: null,

  setSelectedGame: (game) => set({ selectedGame: game }),
  setGameMode: (mode) => set({ gameMode: mode }),
  setBotDifficulty: (difficulty) => set({ botDifficulty: difficulty }),
  setLudoBotCount: (count) => set({ ludoBotCount: count }),

  setConnected: (connected) => set({ isConnected: connected }),
  setConnectionError: (error) => set({ connectionError: error }),

  setMyBoard: (board) => set({ myBoard: board }),

  swapBoardCells: (idx1, idx2) =>
    set((state) => {
      if (state.isBoardConfirmed || state.status === 'playing') return state;
      const nextBoard = [...state.myBoard];
      const temp = nextBoard[idx1];
      nextBoard[idx1] = nextBoard[idx2];
      nextBoard[idx2] = temp;
      return { myBoard: nextBoard };
    }),

  shuffleBoard: () =>
    set((state) => {
      if (state.isBoardConfirmed || state.status === 'playing') return state;
      return { myBoard: generateRandomBoard() };
    }),

  setBoardConfirmed: (confirmed) => set({ isBoardConfirmed: confirmed }),
  setIsReady: (ready) => set({ isReady: ready }),

  updateFromRoomState: (state, myPlayerId) =>
    set((prev) => {
      const mySavedBoard = state.playerBoards[myPlayerId];
      return {
        roomCode: state.roomCode,
        selectedGame: state.gameType || prev.selectedGame,
        hostPlayerId: state.hostPlayerId,
        players: state.players,
        playerOrder: state.playerOrder,
        status: state.status,
        currentTurnPlayerId: state.currentTurnPlayerId,
        calledNumbers: state.calledNumbers,
        playerLines: state.playerLines,
        chessState: state.chessState ?? prev.chessState,
        ludoState: state.ludoState ?? prev.ludoState,
        winnerId: state.winnerId,
        resultType: state.resultType,
        rematchRequests: state.rematchRequests,
        myBoard: mySavedBoard && mySavedBoard.length === 25 ? mySavedBoard : prev.myBoard,
      };
    }),

  setChessState: (chessState) => set({ chessState }),
  setLudoState: (ludoState) => set({ ludoState }),

  numberCalled: (number, calledByPlayerId, playerLines) =>
    set((state) => ({
      calledNumbers: state.calledNumbers.includes(number)
        ? state.calledNumbers
        : [...state.calledNumbers, number],
      lastCalledNumber: number,
      playerLines,
    })),

  setGameFinished: (winnerId, resultType, playerLines, summary) =>
    set({
      status: 'finished',
      winnerId,
      resultType,
      playerLines,
      summary,
    }),

  setCurrentTurn: (playerId) => set({ currentTurnPlayerId: playerId }),

  addRematchRequest: (playerId) =>
    set((state) => ({
      rematchRequests: Array.from(new Set([...state.rematchRequests, playerId])),
    })),

  startBotBingoMatch: (myPlayerId, myUsername, myAvatar) =>
    set((state) => {
      const botId = 'bot_bingo_ai';
      const difficultyLabel =
        state.botDifficulty.charAt(0).toUpperCase() + state.botDifficulty.slice(1);
      const players: Record<string, Player> = {
        [myPlayerId]: {
          id: myPlayerId,
          socketId: 'local',
          username: myUsername,
          avatarUrl: myAvatar,
          isReady: true,
          isConnected: true,
        },
        [botId]: {
          id: botId,
          socketId: 'bot',
          username: `Computer (${difficultyLabel})`,
          avatarUrl:
            'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120',
          isReady: true,
          isConnected: true,
          isBot: true,
          botDifficulty: state.botDifficulty,
        },
      };

      return {
        selectedGame: 'bingo',
        gameMode: 'bot',
        roomCode: 'SOLO',
        hostPlayerId: myPlayerId,
        players,
        playerOrder: [myPlayerId, botId],
        myBoard: generateRandomBoard(),
        botBoard: generateRandomBoard(),
        isBoardConfirmed: false,
        isReady: true,
        status: 'playing',
        currentTurnPlayerId: myPlayerId,
        calledNumbers: [],
        lastCalledNumber: null,
        playerLines: { [myPlayerId]: 0, [botId]: 0 },
        winnerId: null,
        resultType: null,
        summary: [],
        rematchRequests: [],
      };
    }),

  resetGame: () =>
    set({
      roomCode: '',
      hostPlayerId: '',
      players: {},
      playerOrder: [],
      myBoard: generateRandomBoard(),
      botBoard: generateRandomBoard(),
      isBoardConfirmed: false,
      isReady: false,
      status: 'waiting',
      currentTurnPlayerId: null,
      calledNumbers: [],
      lastCalledNumber: null,
      playerLines: {},
      chessState: null,
      ludoState: null,
      winnerId: null,
      resultType: null,
      summary: [],
      rematchRequests: [],
      connectionError: null,
    }),
}));
