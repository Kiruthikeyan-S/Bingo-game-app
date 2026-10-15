import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Users, AlertCircle } from 'lucide-react-native';
import { GameHeader } from '../components/GameHeader';
import { RoomCode } from '../components/RoomCode';
import { PlayerCard } from '../components/PlayerCard';
import { GameButton } from '../components/GameButton';
import { useRoom } from '../hooks/useRoom';
import { useGameStore } from '../store/gameStore';
import { usePlayerStore } from '../store/playerStore';

export default function CreateRoomScreen() {
  const router = useRouter();
  const { createRoom, leaveRoom, roomCode, players } = useRoom();
  const playerId = usePlayerStore((s) => s.playerId);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    const initRoom = async () => {
      try {
        setLoading(true);
        const res = await createRoom();
        if (!isMounted) return;
        if (!res.success) {
          setError(res.error || 'Failed to create room');
        }
      } catch (err: any) {
        if (isMounted) setError(err.message || 'Error creating room');
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    initRoom();
    return () => {
      isMounted = false;
    };
  }, []);

  // When second player joins, navigate to board setup
  useEffect(() => {
    const playerCount = Object.keys(players).length;
    if (playerCount >= 2) {
      router.replace('/board-setup');
    }
  }, [players, router]);

  const handleCancel = async () => {
    await leaveRoom();
    router.replace('/home');
  };

  const myPlayer = players[playerId];
  const opponent = Object.values(players).find((p) => p.id !== playerId);

  return (
    <SafeAreaView style={styles.safeArea}>
      <GameHeader
        title="Create Room"
        subtitle="Invite an opponent"
        onBackPress={handleCancel}
      />

      <ScrollView contentContainerStyle={styles.content}>
        {loading ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color="#00e5ff" />
            <Text style={styles.loadingText}>Creating battle room...</Text>
          </View>
        ) : error ? (
          <View style={styles.centerContainer}>
            <AlertCircle size={48} color="#ef4444" />
            <Text style={styles.errorTitle}>Error</Text>
            <Text style={styles.errorDesc}>{error}</Text>
            <GameButton
              title="Return Home"
              onPress={handleCancel}
              style={{ marginTop: 20 }}
            />
          </View>
        ) : (
          <>
            <RoomCode code={roomCode} />

            <View style={styles.playersSection}>
              <View style={styles.sectionHeader}>
                <Users size={18} color="#a5b4fc" />
                <Text style={styles.sectionTitle}>PLAYERS IN ROOM (1/2)</Text>
              </View>

              <PlayerCard player={myPlayer} isHost={true} />
              <PlayerCard player={opponent} emptyPlaceholderText="Waiting for opponent to join..." />
            </View>

            <View style={styles.waitingNotice}>
              <ActivityIndicator size="small" color="#00e5ff" />
              <Text style={styles.waitingText}>
                Share the 6-character room code above. The match will setup once Player 2 joins!
              </Text>
            </View>

            <View style={styles.footer}>
              <GameButton
                title="Cancel Room"
                variant="outline"
                onPress={handleCancel}
              />
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#070b1e',
  },
  content: {
    padding: 20,
    flexGrow: 1,
    justifyContent: 'space-between',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    color: '#94a3b8',
    fontSize: 14,
    fontWeight: '600',
  },
  errorTitle: {
    color: '#ef4444',
    fontSize: 20,
    fontWeight: '800',
  },
  errorDesc: {
    color: '#94a3b8',
    fontSize: 14,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  playersSection: {
    marginVertical: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#a5b4fc',
    letterSpacing: 1.5,
  },
  waitingNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#11183c',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#1e293b',
    marginVertical: 12,
  },
  waitingText: {
    flex: 1,
    color: '#cbd5e1',
    fontSize: 12,
    lineHeight: 18,
  },
  footer: {
    marginTop: 20,
  },
});
