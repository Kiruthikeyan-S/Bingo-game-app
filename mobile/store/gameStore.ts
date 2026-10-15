import { create } from 'zustand';
import { BoardArray, Player, RoomState, GameResultType, PlayerScoreSummary } from '../../shared/types';
import { generateRandomBoard } from '../utils/bingo';

interface GameStoreState {
  roomCode: string;
  hostPlayerId: string;
  players: Record<string, Player>;
  playerOrder: string[];
  myBoard: BoardArray;
  isBoardConfirmed: boolean;
  isReady: boolean;
  status: RoomState['status'];
  currentTurnPlayerId: string | null;
  calledNumbers: number[];
  lastCalledNumber: number | null;
  playerLines: Record<string, number>;
  winnerId: string | null;
  resultType: GameResultType | null;
  summary: PlayerScoreSummary[];
  rematchRequests: string[];
  isConnected: boolean;
  connectionError: string | null;

  // Actions
  setConnected: (connected: boolean) => void;
  setConnectionError: (error: string | null) => void;
  setMyBoard: (board: BoardArray) => void;
  swapBoardCells: (index1: number, index2: number) => void;
  shuffleBoard: () => void;
  setBoardConfirmed: (confirmed: boolean) => void;
  setIsReady: (ready: boolean) => void;
  updateFromRoomState: (state: RoomState, myPlayerId: string) => void;
  numberCalled: (number: number, calledByPlayerId: string, playerLines: Record<string, number>) => void;
  setGameFinished: (winnerId: string | null, resultType: GameResultType, playerLines: Record<string, number>, summary: PlayerScoreSummary[]) => void;
  setCurrentTurn: (playerId: string) => void;
  addRematchRequest: (playerId: string) => void;
  resetGame: () => void;
}

export const useGameStore = create<GameStoreState>((set) => ({
  roomCode: '',
  hostPlayerId: '',
  players: {},
  playerOrder: [],
  myBoard: generateRandomBoard(),
  isBoardConfirmed: false,
  isReady: false,
  status: 'waiting',
  currentTurnPlayerId: null,
  calledNumbers: [],
  lastCalledNumber: null,
  playerLines: {},
  winnerId: null,
  resultType: null,
  summary: [],
  rematchRequests: [],
  isConnected: false,
  connectionError: null,

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
        hostPlayerId: state.hostPlayerId,
        players: state.players,
        playerOrder: state.playerOrder,
        status: state.status,
        currentTurnPlayerId: state.currentTurnPlayerId,
        calledNumbers: state.calledNumbers,
        playerLines: state.playerLines,
        winnerId: state.winnerId,
        resultType: state.resultType,
        rematchRequests: state.rematchRequests,
        myBoard: mySavedBoard && mySavedBoard.length === 25 ? mySavedBoard : prev.myBoard,
      };
    }),

  numberCalled: (number, calledByPlayerId, playerLines) =>
    set((state) => ({
      calledNumbers: [...state.calledNumbers, number],
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

  resetGame: () =>
    set({
      roomCode: '',
      hostPlayerId: '',
      players: {},
      playerOrder: [],
      isBoardConfirmed: false,
      isReady: false,
      status: 'waiting',
      currentTurnPlayerId: null,
      calledNumbers: [],
      lastCalledNumber: null,
      playerLines: {},
      winnerId: null,
      resultType: null,
      summary: [],
      rematchRequests: [],
      connectionError: null,
    }),
}));
