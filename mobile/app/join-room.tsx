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
        router.replace('/board-setup');
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
              <KeyRound size={36} color="#00e5ff" />
            </View>

            <Text style={styles.title}>Enter 6-Digit Code</Text>
            <Text style={styles.subtitle}>
              Ask your friend for their unique room code
            </Text>

            <View style={styles.inputContainer}>
              <TextInput
                value={roomCode}
                onChangeText={(text) => {
                  setRoomCode(text.toUpperCase());
                  setError(null);
                }}
                placeholder="e.g. 7K2M9X"
                placeholderTextColor="#475569"
                maxLength={6}
                autoCapitalize="characters"
                autoCorrect={false}
                style={[styles.input, error && styles.inputError]}
              />
              {error ? <Text style={styles.errorText}>{error}</Text> : null}
            </View>

            <GameButton
              title="Enter Battle"
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
    backgroundColor: '#070b1e',
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
    alignItems: 'center',
  },
  iconCircle: {
    width: 76,
    height: 76,
    borderRadius: 24,
    backgroundColor: '#11183c',
    borderWidth: 1.5,
    borderColor: '#00e5ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#f8fafc',
  },
  subtitle: {
    fontSize: 14,
    color: '#94a3b8',
    marginTop: 6,
    marginBottom: 28,
    textAlign: 'center',
  },
  inputContainer: {
    width: '100%',
    marginBottom: 16,
  },
  input: {
    backgroundColor: '#11183c',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#6366f1',
    paddingVertical: 18,
    textAlign: 'center',
    fontSize: 28,
    fontWeight: '900',
    color: '#00e5ff',
    letterSpacing: 8,
  },
  inputError: {
    borderColor: '#ef4444',
  },
  errorText: {
    color: '#ef4444',
    fontSize: 13,
    marginTop: 8,
    textAlign: 'center',
  },
});
