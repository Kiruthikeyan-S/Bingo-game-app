export type BoardArray = number[]; // exactly 25 numbers (1-25)

export interface Player {
  id: string;
  socketId: string;
  username: string;
  avatarUrl: string;
  isReady: boolean;
  isConnected: boolean;
}

export type RoomStatus = 'waiting' | 'ready' | 'playing' | 'finished';

export type GameResultType = 'win' | 'draw' | 'forfeit';

export interface RoomState {
  roomId: string;
  roomCode: string;
  hostPlayerId: string;
  players: Record<string, Player>;
  playerOrder: string[]; // [p1, p2]
  status: RoomStatus;
  currentTurnPlayerId: string | null;
  calledNumbers: number[];
  playerBoards: Record<string, BoardArray>;
  playerLines: Record<string, number>;
  winnerId: string | null;
  resultType: GameResultType | null;
  rematchRequests: string[];
}

export interface LineHighlight {
  type: 'row' | 'col' | 'diag_main' | 'diag_anti';
  index: number; // 0-4 for row/col, 0 for diag
  indices: number[]; // the 5 indices on the 0-24 board
}

export interface PlayerScoreSummary {
  playerId: string;
  username: string;
  linesCompleted: number;
  isWinner: boolean;
  isDraw: boolean;
}

// Client to Server Events
export interface ClientToServerEvents {
  'room:create': (
    payload: { username: string; avatarUrl: string },
    callback: (res: { success: boolean; roomCode?: string; playerId?: string; error?: string }) => void
  ) => void;

  'room:join': (
    payload: { roomCode: string; username: string; avatarUrl: string; playerId?: string },
    callback: (res: { success: boolean; roomCode?: string; playerId?: string; error?: string }) => void
  ) => void;

  'room:ready': (
    payload: { isReady: boolean },
    callback?: (res: { success: boolean; error?: string }) => void
  ) => void;

  'room:leave': (
    callback?: (res: { success: boolean; error?: string }) => void
  ) => void;

  'game:boardSubmit': (
    payload: { board: BoardArray },
    callback: (res: { success: boolean; error?: string }) => void
  ) => void;

  'game:callNumber': (
    payload: { number: number },
    callback: (res: { success: boolean; error?: string }) => void
  ) => void;

  'game:rematchRequest': (
    callback?: (res: { success: boolean; error?: string }) => void
  ) => void;
}

// Server to Client Events
export interface ServerToClientEvents {
  'room:state': (state: RoomState) => void;
  'room:error': (data: { message: string; code?: string }) => void;
  'game:start': (data: { starterPlayerId: string; players: Record<string, Player> }) => void;
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
  'game:finished': (data: {
    winnerId: string | null;
    resultType: GameResultType;
    playerLines: Record<string, number>;
    summary: PlayerScoreSummary[];
  }) => void;
  'game:rematchRequest': (data: { playerId: string; username: string }) => void;
  'game:rematchAccepted': (data: { starterPlayerId: string }) => void;
  'player:disconnected': (data: { playerId: string; username: string; gracePeriodSeconds: number }) => void;
  'player:reconnected': (data: { playerId: string; username: string }) => void;
}
