import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type ThemeId = 'midnight-neon' | 'royal-purple' | 'emerald-dark' | 'light-arcade';
export type QualityLevel = 'low' | 'medium' | 'high';

export interface ThemeColors {
  id: ThemeId;
  name: string;
  background: string;
  backgroundHexNumber: number;
  primary: string;
  primaryHexNumber: number;
  secondary: string;
  secondaryHexNumber: number;
  ambientLight: number;
  ambientIntensity: number;
  directionalLight: number;
  directionalIntensity: number;
  boardDark: number;
  boardLight: number;
  accentGlow: number;
}

export const THEMES: Record<ThemeId, ThemeColors> = {
  'midnight-neon': {
    id: 'midnight-neon',
    name: 'Midnight Neon',
    background: '#080F20',
    backgroundHexNumber: 0x080f20,
    primary: '#00D5F5',
    primaryHexNumber: 0x00d5f5,
    secondary: '#8B5CF6',
    secondaryHexNumber: 0x8b5cf6,
    ambientLight: 0xffffff,
    ambientIntensity: 0.65,
    directionalLight: 0x00d5f5,
    directionalIntensity: 1.1,
    boardDark: 0x0e1738,
    boardLight: 0x1a2656,
    accentGlow: 0x00d5f5,
  },
  'royal-purple': {
    id: 'royal-purple',
    name: 'Royal Purple',
    background: '#110D24',
    backgroundHexNumber: 0x110d24,
    primary: '#A78BFA',
    primaryHexNumber: 0xa78bfa,
    secondary: '#F472B6',
    secondaryHexNumber: 0xf472b6,
    ambientLight: 0xf3e8ff,
    ambientIntensity: 0.7,
    directionalLight: 0xa78bfa,
    directionalIntensity: 1.2,
    boardDark: 0x1b143a,
    boardLight: 0x2e2055,
    accentGlow: 0xf472b6,
  },
  'emerald-dark': {
    id: 'emerald-dark',
    name: 'Emerald Dark',
    background: '#071B19',
    backgroundHexNumber: 0x071b19,
    primary: '#34D399',
    primaryHexNumber: 0x34d399,
    secondary: '#5EEAD4',
    secondaryHexNumber: 0x5eead4,
    ambientLight: 0xecfdf5,
    ambientIntensity: 0.65,
    directionalLight: 0x34d399,
    directionalIntensity: 1.1,
    boardDark: 0x0c2b27,
    boardLight: 0x14433d,
    accentGlow: 0x5eead4,
  },
  'light-arcade': {
    id: 'light-arcade',
    name: 'Light Arcade',
    background: '#F3F6FC',
    backgroundHexNumber: 0xf3f6fc,
    primary: '#2563EB',
    primaryHexNumber: 0x2563eb,
    secondary: '#7C3AED',
    secondaryHexNumber: 0x7c3aed,
    ambientLight: 0xffffff,
    ambientIntensity: 0.85,
    directionalLight: 0x2563eb,
    directionalIntensity: 1.3,
    boardDark: 0x93c5fd,
    boardLight: 0xe0e7ff,
    accentGlow: 0x2563eb,
  },
};

interface GraphicsState {
  themeId: ThemeId;
  quality: QualityLevel;
  shadowsEnabled: boolean;
  cameraRotation: boolean;
  reduceMotion: boolean;
  fallback2D: boolean;
  setTheme: (themeId: ThemeId) => void;
  setQuality: (quality: QualityLevel) => void;
  setShadowsEnabled: (enabled: boolean) => void;
  setCameraRotation: (enabled: boolean) => void;
  setReduceMotion: (enabled: boolean) => void;
  setFallback2D: (enabled: boolean) => void;
  loadSavedSettings: () => Promise<void>;
}

const STORAGE_KEY = 'bingo_gamehub_graphics_v1';

export const useGraphicsStore = create<GraphicsState>((set, get) => ({
  themeId: 'midnight-neon',
  quality: 'high',
  shadowsEnabled: true,
  cameraRotation: true,
  reduceMotion: false,
  fallback2D: false,

  setTheme: (themeId) => {
    set({ themeId });
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({
      themeId,
      quality: get().quality,
      shadowsEnabled: get().shadowsEnabled,
      cameraRotation: get().cameraRotation,
      reduceMotion: get().reduceMotion,
      fallback2D: get().fallback2D,
    })).catch(() => {});
  },

  setQuality: (quality) => {
    const shadowsEnabled = quality !== 'low';
    set({ quality, shadowsEnabled });
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({
      themeId: get().themeId,
      quality,
      shadowsEnabled,
      cameraRotation: get().cameraRotation,
      reduceMotion: get().reduceMotion,
      fallback2D: get().fallback2D,
    })).catch(() => {});
  },

  setShadowsEnabled: (shadowsEnabled) => {
    set({ shadowsEnabled });
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({
      themeId: get().themeId,
      quality: get().quality,
      shadowsEnabled,
      cameraRotation: get().cameraRotation,
      reduceMotion: get().reduceMotion,
      fallback2D: get().fallback2D,
    })).catch(() => {});
  },

  setCameraRotation: (cameraRotation) => {
    set({ cameraRotation });
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({
      themeId: get().themeId,
      quality: get().quality,
      shadowsEnabled: get().shadowsEnabled,
      cameraRotation,
      reduceMotion: get().reduceMotion,
      fallback2D: get().fallback2D,
    })).catch(() => {});
  },

  setReduceMotion: (reduceMotion) => {
    set({ reduceMotion });
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({
      themeId: get().themeId,
      quality: get().quality,
      shadowsEnabled: get().shadowsEnabled,
      cameraRotation: get().cameraRotation,
      reduceMotion,
      fallback2D: get().fallback2D,
    })).catch(() => {});
  },

  setFallback2D: (fallback2D) => {
    set({ fallback2D });
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({
      themeId: get().themeId,
      quality: get().quality,
      shadowsEnabled: get().shadowsEnabled,
      cameraRotation: get().cameraRotation,
      reduceMotion: get().reduceMotion,
      fallback2D,
    })).catch(() => {});
  },

  loadSavedSettings: async () => {
    try {
      const saved = await AsyncStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        set({
          themeId: parsed.themeId || 'midnight-neon',
          quality: parsed.quality || 'high',
          shadowsEnabled: parsed.shadowsEnabled !== undefined ? parsed.shadowsEnabled : true,
          cameraRotation: parsed.cameraRotation !== undefined ? parsed.cameraRotation : true,
          reduceMotion: parsed.reduceMotion || false,
          fallback2D: parsed.fallback2D || false,
        });
      }
    } catch {}
  },
}));
