import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Grid, Play, LogOut, CheckCircle2 } from 'lucide-react-native';
import { GameHeader } from '../components/GameHeader';
import { RoomCode } from '../components/RoomCode';
import { PlayerCard } from '../components/PlayerCard';
import { GameButton } from '../components/GameButton';
import { useRoom } from '../hooks/useRoom';
import { usePlayerStore } from '../store/playerStore';

export default function LobbyScreen() {
  const router = useRouter();
  const { roomCode, players, isHost, toggleReady, isReady, leaveRoom } = useRoom();
  const playerId = usePlayerStore((s) => s.playerId);

  const myPlayer = players[playerId];
  const opponent = Object.values(players).find((p) => p.id !== playerId);

  const handleLeave = async () => {
    await leaveRoom();
    router.replace('/home');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <GameHeader
        title="Battle Lobby"
        subtitle={`Room: ${roomCode}`}
        onBackPress={handleLeave}
      />

      <ScrollView contentContainerStyle={styles.content}>
        <RoomCode code={roomCode} />

        <View style={styles.playersSection}>
          <Text style={styles.sectionTitle}>WARRIORS IN ROOM</Text>
          <PlayerCard
            player={myPlayer}
            isHost={isHost}
            showReadyStatus={true}
          />
          <PlayerCard
            player={opponent}
            isHost={!isHost}
            showReadyStatus={true}
            emptyPlaceholderText="Waiting for Player 2 to enter..."
          />
        </View>

        <View style={styles.actionButtons}>
          <GameButton
            title="Configure 5x5 Board"
            variant="outline"
            onPress={() => router.push('/board-setup')}
            icon={<Grid size={18} color="#00e5ff" />}
          />

          <GameButton
            title={isReady ? 'Ready! (Tap to Cancel)' : 'Mark Ready'}
            variant={isReady ? 'success' : 'primary'}
            onPress={toggleReady}
            icon={<CheckCircle2 size={18} color="#ffffff" />}
          />

          <GameButton
            title="Leave Lobby"
            variant="danger"
            onPress={handleLeave}
            icon={<LogOut size={18} color="#ffffff" />}
            style={{ marginTop: 8 }}
          />
        </View>
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
  playersSection: {
    marginVertical: 14,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#a5b4fc',
    letterSpacing: 1.5,
    marginBottom: 8,
  },
  actionButtons: {
    marginTop: 20,
    gap: 6,
  },
});
