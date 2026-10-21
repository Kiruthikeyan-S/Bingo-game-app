export type GameType = 'bingo' | 'chess' | 'ludo';
export type GameMode = 'bot' | 'online';
export type BotDifficulty = 'easy' | 'medium' | 'hard';

export type BoardArray = number[]; // exactly 25 numbers (1-25)

export interface Player {
  id: string;
  socketId: string;
  username: string;
  avatarUrl: string;
  isReady: boolean;
  isConnected: boolean;
  isBot?: boolean;
  botDifficulty?: BotDifficulty;
  color?: LudoColor | ChessColor;
}

export type RoomStatus = 'waiting' | 'ready' | 'playing' | 'finished';

export type GameResultType =
  | 'win'
  | 'draw'
  | 'forfeit'
  | 'checkmate'
  | 'stalemate'
  | 'repetition'
  | 'fifty_move'
  | 'insufficient'
  | 'resign';

// ==================== BINGO TYPES ====================
export interface LineHighlight {
  type: 'row' | 'col' | 'diag_main' | 'diag_anti';
  index: number; // 0-4 for row/col, 0 for diag
  indices: number[]; // the 5 indices on the 0-24 board
}

// ==================== CHESS TYPES ====================
export type ChessColor = 'w' | 'b';
export type ChessPieceSymbol = 'p' | 'n' | 'b' | 'r' | 'q' | 'k';

export interface ChessMoveInput {
  from: string; // e.g. 'e2'
  to: string; // e.g. 'e4'
  promotion?: 'q' | 'r' | 'b' | 'n';
}

export interface ChessMoveRecord {
  san: string;
  from: string;
  to: string;
  piece: ChessPieceSymbol;
  color: ChessColor;
  captured?: ChessPieceSymbol;
  promotion?: ChessPieceSymbol;
  fenAfter: string;
  timestamp: number;
}

export interface ChessState {
  fen: string;
  pgn: string;
  turn: ChessColor;
  inCheck: boolean;
  isCheckmate: boolean;
  isStalemate: boolean;
  isDraw: boolean;
  drawReason: 'stalemate' | 'repetition' | 'fifty_move' | 'insufficient' | 'agreement' | null;
  moveHistory: ChessMoveRecord[];
  whitePlayerId: string;
  blackPlayerId: string;
  lastMove: { from: string; to: string } | null;
  capturedByWhite: ChessPieceSymbol[]; // black pieces captured by white
  capturedByBlack: ChessPieceSymbol[]; // white pieces captured by black
  drawOfferFromPlayerId: string | null;
}

// ==================== LUDO TYPES ====================
export type LudoColor = 'red' | 'green' | 'yellow' | 'blue';

export interface LudoToken {
  id: number; // 0, 1, 2, 3
  color: LudoColor;
  /**
   * step = -1 means in home base (yard)
   * step = 0..50 means on the main 52-square perimeter track relative to color's start
   * step = 51..55 means in the 5-square colored home stretch
   * step = 56 means reached the center Home triangle (finished)
   */
  step: number;
}

export interface LudoMoveOption {
  tokenId: number;
  fromStep: number;
  toStep: number;
  isExitBase: boolean;
  isHomeEntry: boolean;
  capturesToken?: { color: LudoColor; tokenId: number; globalSquare: number };
  landsOnSafeSquare: boolean;
}

export interface LudoState {
  activeColors: LudoColor[];
  colorPlayerMap: Record<LudoColor, string>; // color -> playerId
  tokens: Record<LudoColor, LudoToken[]>;
  currentTurnColor: LudoColor;
  diceValue: number | null;
  canRollDice: boolean;
  consecutiveSixes: number;
  lastActionText: string;
  winnerOrder: LudoColor[];
}

// ==================== ROOM & MATCH SUMMARY ====================
export interface PlayerScoreSummary {
  playerId: string;
  username: string;
  linesCompleted: number;
  isWinner: boolean;
  isDraw: boolean;
  gameType?: GameType;
  detailText?: string;
}

export interface MatchHistoryItem {
  id: string;
  gameType: GameType;
  mode: GameMode;
  difficulty?: BotDifficulty;
  opponentName: string;
  result: 'win' | 'loss' | 'draw';
  resultReason: string;
  coinsEarned: number;
  movesCount: number;
  timestamp: string;
}

export interface FriendItem {
  id: string;
  username: string;
  avatarUrl: string;
  status: 'online' | 'in_game' | 'offline';
  favoriteGame: GameType;
  wins: number;
}

export interface RoomState {
  roomId: string;
  roomCode: string;
  gameType: GameType;
  maxPlayers: number;
  hostPlayerId: string;
  players: Record<string, Player>;
  playerOrder: string[]; // [p1, p2, ...]
  status: RoomStatus;
  currentTurnPlayerId: string | null;
  // Bingo state
  calledNumbers: number[];
  playerBoards: Record<string, BoardArray>;
  playerLines: Record<string, number>;
  // Chess state
  chessState?: ChessState | null;
  // Ludo state
  ludoState?: LudoState | null;
  // Outcome
  winnerId: string | null;
  resultType: GameResultType | null;
  rematchRequests: string[];
}

// ==================== SOCKET EVENTS ====================
export interface ClientToServerEvents {
  'room:create': (
    payload: {
      username: string;
      avatarUrl: string;
      playerId?: string;
      gameType?: GameType;
      maxPlayers?: number;
    },
    callback: (res: {
      success: boolean;
      roomCode?: string;
      playerId?: string;
      gameType?: GameType;
      error?: string;
    }) => void
  ) => void;

  'room:join': (
    payload: { roomCode: string; username: string; avatarUrl: string; playerId?: string },
    callback: (res: {
      success: boolean;
      roomCode?: string;
      playerId?: string;
      gameType?: GameType;
      error?: string;
    }) => void
  ) => void;

  'room:ready': (
    payload: { isReady: boolean },
    callback?: (res: { success: boolean; error?: string }) => void
  ) => void;

  'room:leave': (
    callback?: (res: { success: boolean; error?: string }) => void
  ) => void;

  // Bingo events
  'game:boardSubmit': (
    payload: { board: BoardArray },
    callback: (res: { success: boolean; error?: string }) => void
  ) => void;

  'game:callNumber': (
    payload: { number: number },
    callback: (res: { success: boolean; error?: string }) => void
  ) => void;

  'game:claimBingo': (
    callback: (res: { success: boolean; error?: string }) => void
  ) => void;

  // Chess events
  'chess:move': (
    payload: ChessMoveInput,
    callback: (res: { success: boolean; error?: string }) => void
  ) => void;

  'chess:resign': (
    callback?: (res: { success: boolean; error?: string }) => void
  ) => void;

  'chess:offerDraw': (
    callback?: (res: { success: boolean; error?: string }) => void
  ) => void;

  'chess:respondDraw': (
    payload: { accept: boolean },
    callback?: (res: { success: boolean; error?: string }) => void
  ) => void;

  // Ludo events
  'ludo:rollDice': (
    callback: (res: {
      success: boolean;
      diceValue?: number;
      legalTokenIds?: number[];
      autoSkipped?: boolean;
      error?: string;
    }) => void
  ) => void;

  'ludo:moveToken': (
    payload: { tokenId: number },
    callback: (res: { success: boolean; error?: string }) => void
  ) => void;

  // Shared rematch
  'game:rematchRequest': (
    callback?: (res: { success: boolean; error?: string }) => void
  ) => void;
}

export interface ServerToClientEvents {
  'room:state': (state: RoomState) => void;
  'room:error': (data: { message: string; code?: string }) => void;
  'game:start': (data: {
    starterPlayerId: string;
    gameType?: GameType;
    players: Record<string, Player>;
  }) => void;
  'game:numberCalled': (data: {
    number: number;
    calledByPlayerId: string;
    calledNumbers: number[];
    playerLines: Record<string, number>;
  }) => void;
  'game:turnChanged': (data: { currentTurnPlayerId: string }) => void;
  'game:progressUpdated': (data: {
    playerId: string;
    linesCompleted: number;
    activeLetters: string[];
    completedLines: LineHighlight[];
  }) => void;
  'chess:stateUpdated': (chessState: ChessState) => void;
  'ludo:stateUpdated': (ludoState: LudoState) => void;
  'game:finished': (data: {
    winnerId: string | null;
    resultType: GameResultType;
    playerLines: Record<string, number>;
    summary: PlayerScoreSummary[];
    gameType?: GameType;
  }) => void;
  'game:rematchRequest': (data: { playerId: string; username: string }) => void;
  'game:rematchAccepted': (data: { starterPlayerId: string; gameType?: GameType }) => void;
  'player:disconnected': (data: {
    playerId: string;
    username: string;
    gracePeriodSeconds: number;
  }) => void;
  'player:reconnected': (data: { playerId: string; username: string }) => void;
}
