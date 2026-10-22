import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  useEffect(() => {
    SplashScreen.hideAsync().catch(() => {});
  }, []);

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: '#070b1e' },
          animation: 'fade',
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="login" />
        <Stack.Screen name="home" />
        <Stack.Screen name="friends" />
        <Stack.Screen name="history" />
        <Stack.Screen name="create-room" />
        <Stack.Screen name="join-room" />
        <Stack.Screen name="board-setup" />
        <Stack.Screen name="lobby" />
        <Stack.Screen name="game" />
        <Stack.Screen name="games/bingo" />
        <Stack.Screen name="games/chess" />
        <Stack.Screen name="games/ludo" />
        <Stack.Screen name="results" />
        <Stack.Screen name="leaderboard" />
        <Stack.Screen name="profile" />
        <Stack.Screen name="settings" />
      </Stack>
    </SafeAreaProvider>
  );
}
