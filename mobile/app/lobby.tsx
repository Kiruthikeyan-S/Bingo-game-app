import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Grid, LogOut, CheckCircle2, Play, Share2 } from 'lucide-react-native';
import { GameHeader } from '../components/GameHeader';
import { RoomCode } from '../components/RoomCode';
import { PlayerCard } from '../components/PlayerCard';
import { GameButton } from '../components/GameButton';
import { useRoom } from '../hooks/useRoom';
import { usePlayerStore } from '../store/playerStore';
import { useGameStore } from '../store/gameStore';

export default function LobbyScreen() {
  const router = useRouter();
  const {
    roomCode,
    players,
    status,
    isHost,
    toggleReady,
    isReady,
    startMatch,
    shareRoomInvitation,
    leaveRoom,
  } = useRoom();
  const playerId = usePlayerStore((s) => s.playerId);
  const selectedGame = useGameStore((s) => s.selectedGame);

  const [starting, setStarting] = useState(false);

  const playerList = Object.values(players);

  // Navigate when match starts
  useEffect(() => {
    if (status === 'playing') {
      if (selectedGame === 'bingo') {
        router.replace('/board-setup');
      } else if (selectedGame === 'chess') {
        router.replace('/games/chess');
      } else if (selectedGame === 'ludo') {
        router.replace('/games/ludo');
      } else {
        router.replace('/game');
      }
    }
  }, [status, selectedGame, router]);

  const handleLeave = async () => {
    await leaveRoom();
    router.replace('/home');
  };

  const handleStartGame = async () => {
    try {
      setStarting(true);
      const res = await startMatch();
      if (!res.success) {
        Alert.alert('Cannot Start', res.error || 'Make sure all players are ready.');
      }
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setStarting(false);
    }
  };

  const gameLabel =
    selectedGame === 'bingo'
      ? 'Bingo 5x5'
      : selectedGame === 'chess'
      ? 'Royal Chess'
      : 'Ludo Royale';

  const canStart = isHost && playerList.length >= 2;

  return (
    <SafeAreaView style={styles.safeArea}>
      <GameHeader
        title={`${gameLabel} Lobby`}
        subtitle={`Room: ${roomCode}`}
        onBackPress={handleLeave}
      />

      <ScrollView contentContainerStyle={styles.content}>
        <RoomCode code={roomCode} />

        <View style={styles.shareRow}>
          <GameButton
            title="Share Invitation Code"
            variant="outline"
            onPress={shareRoomInvitation}
            icon={<Share2 size={16} color="#00e5ff" />}
          />
        </View>

        <View style={styles.playersSection}>
          <Text style={styles.sectionTitle}>
            PLAYERS IN ROOM ({playerList.length}/
            {selectedGame === 'chess' ? 2 : 4})
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
              title="Configure 5x5 Board"
              variant="outline"
              onPress={() => router.push('/board-setup')}
              icon={<Grid size={18} color="#00e5ff" />}
            />
          )}

          {isHost ? (
            <GameButton
              title={
                starting
                  ? 'Starting Match...'
                  : playerList.length < 2
                  ? 'Waiting for Players...'
                  : 'Start Match'
              }
              variant="primary"
              disabled={!canStart || starting}
              loading={starting}
              onPress={handleStartGame}
              icon={<Play size={18} color="#ffffff" />}
            />
          ) : (
            <GameButton
              title={
                isReady
                  ? 'Ready! Waiting for Host (Tap to Cancel)'
                  : 'Mark Ready to Start Match'
              }
              variant={isReady ? 'success' : 'primary'}
              onPress={toggleReady}
              icon={<CheckCircle2 size={18} color="#ffffff" />}
            />
          )}

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
  shareRow: {
    marginVertical: 10,
  },
  playersSection: {
    marginVertical: 12,
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
