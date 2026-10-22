import { GameType, ChessColor, LudoColor, BoardArray, ChessMoveRecord, LudoToken } from '../../shared/types';

export type RoomVisibility = 'private' | 'public';
export type RoomStatus = 'waiting' | 'starting' | 'playing' | 'completed' | 'cancelled';

export interface FirebaseRoomPlayer {
  uid: string;
  username: string;
  avatarUrl: string;
  isHost: boolean;
  isReady: boolean;
  joinedAt: number;
  // Game specific role/assignment
  chessColor?: ChessColor;
  ludoColor?: LudoColor;
  seatIndex: number;
  boardSubmitted?: boolean;
  linesCompleted?: number;
}

export interface FirebaseBingoState {
  calledNumbers: number[];
  lastCalledNumber: number | null;
  currentTurnUid: string;
  playerLines: Record<string, number>;
  // Player board submissions (kept private in subcollections or hidden until claimed)
  submittedBoards: Record<string, number[]>;
}

export interface FirebaseChessState {
  fen: string;
  pgn: string;
  turn: ChessColor;
  inCheck: boolean;
  isCheckmate: boolean;
  isStalemate: boolean;
  isDraw: boolean;
  whiteUid: string;
  blackUid: string;
  lastMove: { from: string; to: string } | null;
  moveHistory: ChessMoveRecord[];
}

export interface FirebaseLudoState {
  currentTurnUid: string;
  currentColor: LudoColor;
  diceValue: number | null;
  hasRolled: boolean;
  consecutiveSixes: number;
  tokens: Record<LudoColor, LudoToken[]>;
  playerColorMap: Record<string, LudoColor>;
  colorPlayerMap: Record<LudoColor, string>;
  activeColors: LudoColor[];
  winnerColor: LudoColor | null;
}

export type FirebaseGameState = {
  bingo?: FirebaseBingoState;
  chess?: FirebaseChessState;
  ludo?: FirebaseLudoState;
};

export interface FirebaseRoom {
  id: string; // Document ID
  roomCode: string; // 6-digit code
  gameType: GameType;
  visibility: RoomVisibility;
  hostUid: string;
  playerUids: string[];
  playerCount: number;
  maxPlayers: number;
  status: RoomStatus;
  createdAt: number;
  updatedAt: number;
  expiresAt: number;
  currentTurnUid?: string;
  players: Record<string, FirebaseRoomPlayer>;
  gameState?: FirebaseGameState;
  winnerUid?: string | null;
  resultType?: string | null;
}

export interface RoomCodeMapping {
  roomId: string;
  gameType: GameType;
  expiresAt: number;
  createdAt: number;
}

export interface MatchmakingQueueEntry {
  uid: string;
  username: string;
  avatarUrl: string;
  gameType: GameType;
  joinedAt: number;
  status: 'queued' | 'matched' | 'cancelled';
  matchedRoomId?: string;
}
