import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Grid, LogOut, CheckCircle2 } from 'lucide-react-native';
import { GameHeader } from '../components/GameHeader';
import { RoomCode } from '../components/RoomCode';
import { PlayerCard } from '../components/PlayerCard';
import { GameButton } from '../components/GameButton';
import { useRoom } from '../hooks/useRoom';
import { usePlayerStore } from '../store/playerStore';
import { useGameStore } from '../store/gameStore';

export default function LobbyScreen() {
  const router = useRouter();
  const { roomCode, players, isHost, toggleReady, isReady, leaveRoom } = useRoom();
  const playerId = usePlayerStore((s) => s.playerId);
  const selectedGame = useGameStore((s) => s.selectedGame);

  const playerList = Object.values(players);

  const handleLeave = async () => {
    await leaveRoom();
    router.replace('/home');
  };

  const gameLabel =
    selectedGame === 'bingo'
      ? 'Bingo 5×5'
      : selectedGame === 'chess'
      ? 'Royal Chess'
      : 'Ludo Royale';

  return (
    <SafeAreaView style={styles.safeArea}>
      <GameHeader
        title={`${gameLabel} Lobby`}
        subtitle={`Room: ${roomCode}`}
        onBackPress={handleLeave}
      />

      <ScrollView contentContainerStyle={styles.content}>
        <RoomCode code={roomCode} />

        <View style={styles.playersSection}>
          <Text style={styles.sectionTitle}>
            PLAYERS IN ROOM ({playerList.length})
          </Text>
          {playerList.map((p) => (
            <PlayerCard
              key={p.id}
              player={p}
              isHost={p.id === playerId ? isHost : false}
              showReadyStatus={true}
            />
          ))}
          {playerList.length < 2 && (
            <PlayerCard
              player={undefined}
              isHost={false}
              showReadyStatus={true}
              emptyPlaceholderText="Waiting for another player to join..."
            />
          )}
        </View>

        <View style={styles.actionButtons}>
          {selectedGame === 'bingo' && (
            <GameButton
              title="Configure 5×5 Board"
              variant="outline"
              onPress={() => router.push('/board-setup')}
              icon={<Grid size={18} color="#00e5ff" />}
            />
          )}

          <GameButton
            title={
              isReady
                ? 'Ready! Waiting for others (Tap to Cancel)'
                : 'Mark Ready to Start Match'
            }
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
