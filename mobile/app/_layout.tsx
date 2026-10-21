import React from 'react';
import { LogBox } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

// Ignore non-fatal Three.js WebGL deprecation warning in Expo GL context
LogBox.ignoreLogs([
  'THREE.WebGLRenderer: WebGL 1 support was deprecated',
  'THREE.WebGLRenderer: A WebGL 1 context was provided',
]);

export default function RootLayout() {
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
        <Stack.Screen name="signup" />
        <Stack.Screen name="forgot-password" />
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
