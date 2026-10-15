import { create } from 'zustand';

export interface PlayerProfile {
  id: string;
  username: string;
  avatarUrl: string;
}

export const AVATAR_OPTIONS = [
  'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120',
  'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=120',
  'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=120',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=120',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120',
  'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=120',
];

interface PlayerStoreState {
  playerId: string;
  username: string;
  avatarUrl: string;
  soundEnabled: boolean;
  hapticsEnabled: boolean;
  isRegistered: boolean;

  setProfile: (profile: Partial<PlayerProfile>) => void;
  setSoundEnabled: (enabled: boolean) => void;
  setHapticsEnabled: (enabled: boolean) => void;
  resetProfile: () => void;
}

export const usePlayerStore = create<PlayerStoreState>((set) => ({
  playerId: `p_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
  username: 'LuckyPlayer',
  avatarUrl: AVATAR_OPTIONS[0],
  soundEnabled: true,
  hapticsEnabled: true,
  isRegistered: false,

  setProfile: (profile) =>
    set((state) => ({
      ...state,
      ...profile,
      isRegistered: true,
    })),

  setSoundEnabled: (enabled) => set({ soundEnabled: enabled }),
  setHapticsEnabled: (enabled) => set({ hapticsEnabled: enabled }),

  resetProfile: () =>
    set({
      playerId: `p_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      username: 'LuckyPlayer',
      avatarUrl: AVATAR_OPTIONS[0],
      isRegistered: false,
    }),
}));
