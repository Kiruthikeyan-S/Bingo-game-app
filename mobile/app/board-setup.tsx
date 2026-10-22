import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Shuffle, RotateCcw, Lock, Check, Clock, Play } from 'lucide-react-native';
import { GameHeader } from '../components/GameHeader';
import { BingoBoard } from '../components/BingoBoard';
import { GameButton } from '../components/GameButton';
import { useGameStore } from '../store/gameStore';
import { usePlayerStore } from '../store/playerStore';
import { useRoom } from '../hooks/useRoom';
import { useGame } from '../hooks/useGame';

export default function BoardSetupScreen() {
  const router = useRouter();
  const myBoard = useGameStore((s) => s.myBoard);
  const isBoardConfirmed = useGameStore((s) => s.isBoardConfirmed);
  const swapBoardCells = useGameStore((s) => s.swapBoardCells);
  const shuffleBoard = useGameStore((s) => s.shuffleBoard);
  const setBoardConfirmed = useGameStore((s) => s.setBoardConfirmed);
  const setMyBoard = useGameStore((s) => s.setMyBoard);
  const gameMode = useGameStore((s) => s.gameMode);
  const botDifficulty = useGameStore((s) => s.botDifficulty);

  const { players, toggleReady } = useRoom();
  const { submitBoard } = useGame();
  const playerId = usePlayerStore((s) => s.playerId);

  const [selectedCellIndex, setSelectedCellIndex] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const isBotMode = gameMode === 'bot';
  const opponent = Object.values(players).find((p) => p.id !== playerId);
  const diffCapitalized =
    botDifficulty.charAt(0).toUpperCase() + botDifficulty.slice(1);

  const handleCellPress = (number: number, index: number) => {
    if (isBoardConfirmed) return;

    if (selectedCellIndex === null) {
      setSelectedCellIndex(index);
    } else if (selectedCellIndex === index) {
      setSelectedCellIndex(null);
    } else {
      swapBoardCells(selectedCellIndex, index);
      setSelectedCellIndex(null);
    }
  };

  const handleReset = () => {
    if (isBoardConfirmed) return;
    const sequential = Array.from({ length: 25 }, (_, i) => i + 1);
    setMyBoard(sequential);
    setSelectedCellIndex(null);
  };

  const handleConfirmBoard = async () => {
    if (isBoardConfirmed) return;
    try {
      setSubmitting(true);
      const res = await submitBoard(myBoard);
      if (res.success) {
        setBoardConfirmed(true);
        if (isBotMode) {
          router.replace('/game');
        } else {
          await toggleReady();
        }
      } else {
        Alert.alert('Error', res.error || 'Failed to submit board layout');
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Submission failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <GameHeader
        title="Arrange Your Board"
        subtitle="Numbers 1 to 25 - Tap two cells to swap"
        showBack={!isBoardConfirmed}
      />

      <ScrollView contentContainerStyle={styles.content}>
        {/* Opponent Status Banner */}
        <View style={styles.opponentBanner}>
          <Text style={styles.bannerLabel}>OPPONENT:</Text>
          <Text style={styles.opponentName}>
            {isBotMode
              ? `Computer (${diffCapitalized})`
              : opponent?.username || 'Opponent'}
          </Text>
          <View
            style={[
              styles.statusPill,
              isBotMode || opponent?.isReady ? styles.pillReady : styles.pillArranging,
            ]}
          >
            {isBotMode || opponent?.isReady ? (
              <>
                <Check size={12} color="#10b981" />
                <Text style={styles.pillTextReady}>READY</Text>
              </>
            ) : (
              <>
                <Clock size={12} color="#f59e0b" />
                <Text style={styles.pillTextArranging}>ARRANGING</Text>
              </>
            )}
          </View>
        </View>

        {/* Instructions */}
        <Text style={styles.tipText}>
          {isBoardConfirmed
            ? 'Board locked. Waiting for opponent to confirm readiness...'
            : selectedCellIndex !== null
            ? `Select another cell to swap with [${myBoard[selectedCellIndex]}]`
            : 'Shuffle or tap any two cells to customize your grid.'}
        </Text>

        {/* 5x5 Grid */}
        <View style={styles.boardWrapper}>
          <BingoBoard
            board={myBoard}
            selectedSwapIndex={selectedCellIndex}
            onCellPress={handleCellPress}
            disabled={isBoardConfirmed}
          />
        </View>

        {/* Controls */}
        {!isBoardConfirmed ? (
          <View style={styles.controlsSection}>
            <View style={styles.toolRow}>
              <GameButton
                title="Shuffle"
                variant="outline"
                onPress={shuffleBoard}
                icon={<Shuffle size={18} color="#00e5ff" />}
                style={styles.halfBtn}
              />
              <GameButton
                title="Sequential"
                variant="outline"
                onPress={handleReset}
                icon={<RotateCcw size={18} color="#a5b4fc" />}
                style={styles.halfBtn}
              />
            </View>

            <GameButton
              title={isBotMode ? 'Start Match' : 'Lock & Confirm Board'}
              onPress={handleConfirmBoard}
              loading={submitting}
              icon={isBotMode ? <Play size={18} color="#ffffff" /> : <Lock size={18} color="#ffffff" />}
              style={styles.confirmBtn}
            />
          </View>
        ) : (
          <View style={styles.lockedNotice}>
            <Check size={28} color="#10b981" />
            <Text style={styles.lockedTitle}>Your Board is Confirmed</Text>
            <Text style={styles.lockedSubtitle}>
              Match will launch automatically as soon as all players lock in.
            </Text>
          </View>
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
    padding: 16,
    alignItems: 'center',
    flexGrow: 1,
    justifyContent: 'space-between',
  },
  opponentBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#11183c',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#1e293b',
    width: '100%',
    gap: 8,
  },
  bannerLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#94a3b8',
  },
  opponentName: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    color: '#f8fafc',
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  pillReady: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
  },
  pillArranging: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
  },
  pillTextReady: {
    color: '#10b981',
    fontSize: 10,
    fontWeight: '800',
  },
  pillTextArranging: {
    color: '#f59e0b',
    fontSize: 10,
    fontWeight: '800',
  },
  tipText: {
    fontSize: 13,
    color: '#cbd5e1',
    textAlign: 'center',
    marginVertical: 10,
    paddingHorizontal: 12,
  },
  boardWrapper: {
    width: '100%',
    alignItems: 'center',
    marginVertical: 8,
  },
  controlsSection: {
    width: '100%',
    marginTop: 10,
  },
  toolRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 6,
  },
  halfBtn: {
    flex: 1,
  },
  confirmBtn: {
    marginTop: 4,
  },
  lockedNotice: {
    alignItems: 'center',
    backgroundColor: '#11183c',
    padding: 20,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: '#10b981',
    width: '100%',
    marginTop: 16,
    gap: 8,
  },
  lockedTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#10b981',
  },
  lockedSubtitle: {
    fontSize: 12,
    color: '#94a3b8',
    textAlign: 'center',
    lineHeight: 18,
  },
});
