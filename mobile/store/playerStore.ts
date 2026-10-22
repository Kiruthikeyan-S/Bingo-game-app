import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { FriendItem, GameType, MatchHistoryItem } from '../../shared/types';
import { AVATAR_OPTIONS } from '../constants/avatars';

export { AVATAR_OPTIONS };

export interface PlayerProfile {
  id?: string;
  playerId?: string;
  username: string;
  avatarUrl: string;
  email?: string | null;
}

// Lazy helper to avoid require cycle
const syncToFirebase = (data: any) => {
  try {
    const { firebaseService } = require('../services/firebaseService');
    firebaseService.syncProfileToFirestore(data);
  } catch {}
};

export interface GameStatsBreakdown {
  played: number;
  wins: number;
  losses: number;
  draws: number;
}

const DEFAULT_FRIENDS: FriendItem[] = [
  {
    id: 'f_1',
    username: 'GrandmasterKai',
    avatarUrl: AVATAR_OPTIONS[1],
    status: 'online',
    favoriteGame: 'chess',
    wins: 48,
  },
  {
    id: 'f_2',
    username: 'LudoQueenAria',
    avatarUrl: AVATAR_OPTIONS[2],
    status: 'in_game',
    favoriteGame: 'ludo',
    wins: 39,
  },
  {
    id: 'f_3',
    username: 'BingoStriker',
    avatarUrl: AVATAR_OPTIONS[4],
    status: 'online',
    favoriteGame: 'bingo',
    wins: 62,
  },
];

interface PlayerStoreState {
  playerId: string;
  username: string;
  avatarUrl: string;
  email: string | null;
  coins: number;
  theme: 'dark' | 'light';
  soundEnabled: boolean;
  hapticsEnabled: boolean;
  isRegistered: boolean;
  stats: {
    played: number;
    wins: number;
    losses: number;
    draws: number;
    byGame: Record<GameType, GameStatsBreakdown>;
  };
  matchHistory: MatchHistoryItem[];
  friends: FriendItem[];

  setProfile: (profile: Partial<PlayerProfile>) => void;
  setSoundEnabled: (enabled: boolean) => void;
  setHapticsEnabled: (enabled: boolean) => void;
  setTheme: (theme: 'dark' | 'light') => void;
  toggleTheme: () => void;
  addCoins: (amount: number) => void;
  recordMatchResult: (entry: Omit<MatchHistoryItem, 'id' | 'timestamp' | 'coinsEarned'>) => void;
  addFriend: (username: string, favoriteGame?: GameType) => void;
  removeFriend: (id: string) => void;
  hydrateFromStorage: () => Promise<void>;
  resetProfile: () => void;
}

const STORAGE_KEY = '@game_hub_player_v2';

const initialByGame = (): Record<GameType, GameStatsBreakdown> => ({
  bingo: { played: 0, wins: 0, losses: 0, draws: 0 },
  chess: { played: 0, wins: 0, losses: 0, draws: 0 },
  ludo: { played: 0, wins: 0, losses: 0, draws: 0 },
});

export const usePlayerStore = create<PlayerStoreState>((set, get) => ({
  playerId: `p_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
  username: 'LuckyPlayer',
  avatarUrl: AVATAR_OPTIONS[0],
  email: null,
  coins: 1250,
  theme: 'dark',
  soundEnabled: true,
  hapticsEnabled: true,
  isRegistered: false,
  stats: {
    played: 0,
    wins: 0,
    losses: 0,
    draws: 0,
    byGame: initialByGame(),
  },
  matchHistory: [],
  friends: DEFAULT_FRIENDS,

  setProfile: (profile) =>
    set((state) => {
      const next = {
        ...state,
        playerId: profile.playerId || profile.id || state.playerId,
        username: profile.username ?? state.username,
        avatarUrl: profile.avatarUrl ?? state.avatarUrl,
        email: profile.email !== undefined ? profile.email : state.email,
        isRegistered: true,
      };

      // Sync with AsyncStorage for offline use
      AsyncStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          playerId: next.playerId,
          username: next.username,
          avatarUrl: next.avatarUrl,
          email: next.email,
          coins: next.coins,
          theme: next.theme,
          stats: next.stats,
          matchHistory: next.matchHistory,
          friends: next.friends,
          isRegistered: next.isRegistered,
        })
      ).catch(() => {});

      // Sync with Firebase Firestore Cloud
      syncToFirebase({
        username: next.username,
        avatarUrl: next.avatarUrl,
        coins: next.coins,
        stats: {
          played: next.stats.played,
          wins: next.stats.wins,
          losses: next.stats.losses,
          draws: next.stats.draws,
        },
      });

      return next;
    }),

  setSoundEnabled: (enabled) => set({ soundEnabled: enabled }),
  setHapticsEnabled: (enabled) => set({ hapticsEnabled: enabled }),

  setTheme: (theme) => set({ theme }),
  toggleTheme: () =>
    set((state) => ({ theme: state.theme === 'dark' ? 'light' : 'dark' })),

  addCoins: (amount) =>
    set((state) => {
      const newCoins = Math.max(0, state.coins + amount);
      syncToFirebase({ coins: newCoins });
      return { coins: newCoins };
    }),

  recordMatchResult: (entry) =>
    set((state) => {
      const coinsEarned =
        entry.result === 'win' ? 100 : entry.result === 'draw' ? 40 : 15;
      const newRecord: MatchHistoryItem = {
        ...entry,
        id: `mh_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        coinsEarned,
        timestamp: new Date().toISOString(),
      };

      const gameStats = state.stats.byGame[entry.gameType] || {
        played: 0,
        wins: 0,
        losses: 0,
        draws: 0,
      };

      const updatedGameStats: GameStatsBreakdown = {
        played: gameStats.played + 1,
        wins: gameStats.wins + (entry.result === 'win' ? 1 : 0),
        losses: gameStats.losses + (entry.result === 'loss' ? 1 : 0),
        draws: gameStats.draws + (entry.result === 'draw' ? 1 : 0),
      };

      const nextStats = {
        played: state.stats.played + 1,
        wins: state.stats.wins + (entry.result === 'win' ? 1 : 0),
        losses: state.stats.losses + (entry.result === 'loss' ? 1 : 0),
        draws: state.stats.draws + (entry.result === 'draw' ? 1 : 0),
        byGame: {
          ...state.stats.byGame,
          [entry.gameType]: updatedGameStats,
        },
      };

      const nextHistory = [newRecord, ...state.matchHistory].slice(0, 50);
      const nextCoins = state.coins + coinsEarned;

      AsyncStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          playerId: state.playerId,
          username: state.username,
          avatarUrl: state.avatarUrl,
          email: state.email,
          coins: nextCoins,
          theme: state.theme,
          stats: nextStats,
          matchHistory: nextHistory,
          friends: state.friends,
          isRegistered: state.isRegistered,
        })
      ).catch(() => {});

      // Cloud Firestore sync
      syncToFirebase({
        coins: nextCoins,
        stats: {
          played: nextStats.played,
          wins: nextStats.wins,
          losses: nextStats.losses,
          draws: nextStats.draws,
        },
      });

      return {
        coins: nextCoins,
        stats: nextStats,
        matchHistory: nextHistory,
      };
    }),

  addFriend: (username, favoriteGame = 'bingo') =>
    set((state) => {
      const trimmed = username.trim();
      if (!trimmed) return state;
      const newFriend: FriendItem = {
        id: `f_${Date.now()}`,
        username: trimmed,
        avatarUrl: AVATAR_OPTIONS[state.friends.length % AVATAR_OPTIONS.length],
        status: 'online',
        favoriteGame,
        wins: Math.floor(Math.random() * 25) + 5,
      };
      return { friends: [newFriend, ...state.friends] };
    }),

  removeFriend: (id) =>
    set((state) => ({
      friends: state.friends.filter((f) => f.id !== id),
    })),

  hydrateFromStorage: async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      set((state) => ({
        ...state,
        playerId: parsed.playerId || state.playerId,
        username: parsed.username || state.username,
        avatarUrl: parsed.avatarUrl || state.avatarUrl,
        email: parsed.email || state.email,
        coins: typeof parsed.coins === 'number' ? parsed.coins : state.coins,
        theme: parsed.theme || state.theme,
        stats: parsed.stats || state.stats,
        matchHistory: Array.isArray(parsed.matchHistory) ? parsed.matchHistory : [],
        friends: Array.isArray(parsed.friends) ? parsed.friends : state.friends,
        isRegistered: Boolean(parsed.isRegistered),
      }));
    } catch {
      // ignore storage read errors
    }
  },

  resetProfile: () => {
    AsyncStorage.removeItem(STORAGE_KEY).catch(() => {});
    set({
      playerId: `p_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      username: 'LuckyPlayer',
      avatarUrl: AVATAR_OPTIONS[0],
      email: null,
      coins: 1250,
      isRegistered: false,
      stats: {
        played: 0,
        wins: 0,
        losses: 0,
        draws: 0,
        byGame: initialByGame(),
      },
      matchHistory: [],
      friends: DEFAULT_FRIENDS,
    });
  },
}));
