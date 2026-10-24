import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LogIn, KeyRound } from 'lucide-react-native';
import { GameHeader } from '../components/GameHeader';
import { GameButton } from '../components/GameButton';
import { useRoom } from '../hooks/useRoom';
import { useGameStore } from '../store/gameStore';

export default function JoinRoomScreen() {
  const router = useRouter();
  const { joinRoom } = useRoom();

  const [roomCode, setRoomCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleJoin = async () => {
    const trimmed = roomCode.trim().toUpperCase();
    if (trimmed.length !== 6) {
      setError('Room code must be exactly 6 characters');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const res = await joinRoom(trimmed);
      if (res.success) {
        const joinedGameType =
          res.gameType || useGameStore.getState().selectedGame || 'bingo';
        if (joinedGameType === 'bingo') {
          router.replace('/board-setup');
        } else {
          router.replace('/lobby');
        }
      } else {
        setError(res.error || 'Failed to join room');
      }
    } catch (err: any) {
      setError(err.message || 'Error joining room');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <GameHeader title="Join Room" subtitle="Enter your invite code" />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardContainer}
      >
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.centerSection}>
            <View style={styles.iconCircle}>
              <KeyRound size={32} color="#0891B2" />
            </View>

            <Text style={styles.title}>Enter 6-Digit Code</Text>
            <Text style={styles.subtitle}>
              Works for Bingo, Chess, and Ludo rooms
            </Text>

            <View style={styles.inputContainer}>
              <TextInput
                value={roomCode}
                onChangeText={(text) => {
                  setRoomCode(text.toUpperCase());
                  setError(null);
                }}
                placeholder="e.g. 7K2M9X"
                placeholderTextColor="#94A3B8"
                maxLength={6}
                autoCapitalize="characters"
                autoCorrect={false}
                style={[styles.input, error && styles.inputError]}
              />
              {error ? <Text style={styles.errorText}>{error}</Text> : null}
            </View>

            <GameButton
              title="Enter Room"
              onPress={handleJoin}
              loading={loading}
              disabled={roomCode.trim().length !== 6}
              icon={<LogIn size={20} color="#ffffff" />}
              style={{ width: '100%', marginTop: 12 }}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  keyboardContainer: {
    flex: 1,
  },
  content: {
    padding: 24,
    flexGrow: 1,
    justifyContent: 'center',
  },
  centerSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: '#ECFEFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
  },
  subtitle: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 4,
    marginBottom: 24,
    textAlign: 'center',
  },
  inputContainer: {
    width: '100%',
    marginBottom: 16,
  },
  input: {
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    paddingVertical: 14,
    textAlign: 'center',
    fontSize: 26,
    fontWeight: '900',
    color: '#4F46E5',
    letterSpacing: 6,
  },
  inputError: {
    borderColor: '#EF4444',
  },
  errorText: {
    color: '#EF4444',
    fontSize: 12,
    marginTop: 6,
    textAlign: 'center',
  },
});
