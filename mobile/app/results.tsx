import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Trophy, Frown, Equal, RotateCcw, Home, Award } from 'lucide-react-native';
import { GameButton } from '../components/GameButton';
import { useGameStore } from '../store/gameStore';
import { usePlayerStore } from '../store/playerStore';
import { useGame } from '../hooks/useGame';

export default function ResultsScreen() {
  const router = useRouter();
  const winnerId = useGameStore((s) => s.winnerId);
  const resultType = useGameStore((s) => s.resultType);
  const summary = useGameStore((s) => s.summary);
  const rematchRequests = useGameStore((s) => s.rematchRequests);
  const resetGame = useGameStore((s) => s.resetGame);
  const gameMode = useGameStore((s) => s.gameMode);
  const selectedGame = useGameStore((s) => s.selectedGame);
  const shuffleBoard = useGameStore((s) => s.shuffleBoard);

  const playerId = usePlayerStore((s) => s.playerId);
  const { requestRematch } = useGame();

  const [requestingRematch, setRequestingRematch] = useState(false);

  const isWinner = winnerId === playerId;
  const isDraw = resultType === 'draw';
  const isBotMode = gameMode === 'bot';
  const hasRequestedRematch = rematchRequests.includes(playerId);

  const handleRematch = async () => {
    if (isBotMode) {
      resetGame();
      shuffleBoard();
      if (selectedGame === 'chess') {
        router.replace('/games/chess');
      } else if (selectedGame === 'ludo') {
        router.replace('/games/ludo');
      } else {
        router.replace('/board-setup');
      }
      return;
    }
    setRequestingRematch(true);
    await requestRematch();
    setRequestingRematch(false);
  };

  const handleHome = () => {
    resetGame();
    router.replace('/home');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Victory / Defeat Header Card */}
        <LinearGradient
          colors={
            isWinner
              ? ['#ffd700', '#f59e0b', '#d97706']
              : isDraw
              ? ['#6366f1', '#4338ca', '#312e81']
              : ['#ef4444', '#b91c1c', '#7f1d1d']
          }
          style={styles.bannerCard}
        >
          <View style={styles.iconCircle}>
            {isWinner ? (
              <Trophy size={56} color="#ffd700" />
            ) : isDraw ? (
              <Equal size={56} color="#a5b4fc" />
            ) : (
              <Frown size={56} color="#ef4444" />
            )}
          </View>

          <Text style={styles.bannerTitle}>
            {isWinner ? 'VICTORY' : isDraw ? 'MATCH DRAW' : 'GAME OVER'}
          </Text>

          <Text style={styles.bannerSubtitle}>
            {isWinner
              ? 'Congratulations! You won the match (+100 Coins).'
              : isDraw
              ? 'The match ended in a draw (+40 Coins).'
              : 'Good effort. Play again to claim victory!'}
          </Text>
        </LinearGradient>

        {/* Player Summary Cards */}
        <View style={styles.scoreboardSection}>
          <Text style={styles.sectionHeader}>FINAL MATCH STANDINGS</Text>
          {summary.map((playerSummary) => {
            const isMe = playerSummary.playerId === playerId;
            return (
              <View
                key={playerSummary.playerId}
                style={[
                  styles.scoreItem,
                  playerSummary.isWinner && styles.winnerScoreItem,
                ]}
              >
                <View style={styles.scoreLeft}>
                  <Text style={styles.scoreUsername}>
                    {playerSummary.username} {isMe ? '(You)' : ''}
                  </Text>
                  <Text style={styles.scoreDetail}>
                    {playerSummary.detailText ||
                      `Completed ${playerSummary.linesCompleted} lines`}
                  </Text>
                </View>

                {playerSummary.isWinner && (
                  <View style={styles.crownBadge}>
                    <Award size={14} color="#070b1e" />
                    <Text style={styles.crownText}>WINNER</Text>
                  </View>
                )}
              </View>
            );
          })}
        </View>

        {/* Rematch & Navigation Actions */}
        <View style={styles.actions}>
          <GameButton
            title={
              isBotMode
                ? 'Play Again'
                : hasRequestedRematch
                ? 'Rematch Requested (Waiting for opponent...)'
                : 'Request Rematch'
            }
            variant="primary"
            onPress={handleRematch}
            loading={requestingRematch}
            disabled={!isBotMode && hasRequestedRematch}
            icon={<RotateCcw size={18} color="#ffffff" />}
          />

          <GameButton
            title="Return to Game Hub"
            variant="outline"
            onPress={handleHome}
            icon={<Home size={18} color="#a5b4fc" />}
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
  bannerCard: {
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    marginVertical: 12,
  },
  iconCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#070b1e',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  bannerTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: '#ffffff',
    letterSpacing: 1,
    textAlign: 'center',
  },
  bannerSubtitle: {
    fontSize: 13,
    color: '#f8fafc',
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
  },
  scoreboardSection: {
    backgroundColor: '#11183c',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1.5,
    borderColor: '#1e293b',
    marginVertical: 12,
  },
  sectionHeader: {
    fontSize: 12,
    fontWeight: '800',
    color: '#a5b4fc',
    letterSpacing: 1.5,
    marginBottom: 12,
  },
  scoreItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#19224d',
    padding: 14,
    borderRadius: 14,
    marginVertical: 4,
    borderWidth: 1,
    borderColor: '#24326f',
  },
  winnerScoreItem: {
    borderColor: '#ffd700',
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
  },
  scoreLeft: {
    gap: 4,
  },
  scoreUsername: {
    fontSize: 16,
    fontWeight: '800',
    color: '#f8fafc',
  },
  scoreDetail: {
    fontSize: 12,
    color: '#94a3b8',
  },
  crownBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ffd700',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  crownText: {
    color: '#070b1e',
    fontSize: 10,
    fontWeight: '900',
  },
  actions: {
    marginTop: 12,
    gap: 6,
  },
});
