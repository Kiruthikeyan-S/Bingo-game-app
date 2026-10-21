import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LogOut, Volume2, VolumeX, Shield } from 'lucide-react-native';
import { GameHeader } from '../components/GameHeader';
import { PlayerCard } from '../components/PlayerCard';
import { BingoProgress } from '../components/BingoProgress';
import { BingoBoard } from '../components/BingoBoard';
import { BingoScene3D } from '../components/3d/bingo/BingoScene3D';
import { useGraphicsStore } from '../store/graphicsStore';
import { useGame } from '../hooks/useGame';
import { useRoom } from '../hooks/useRoom';
import { usePlayerStore } from '../store/playerStore';

export default function GameScreen() {
  const router = useRouter();
  const {
    roomCode,
    myBoard,
    calledNumbers,
    lastCalledNumber,
    isMyTurn,
    myLines,
    opponentLines,
    opponent,
    callNumber,
  } = useGame();

  const { leaveRoom } = useRoom();
  const playerId = usePlayerStore((s) => s.playerId);
  const username = usePlayerStore((s) => s.username);
  const avatarUrl = usePlayerStore((s) => s.avatarUrl);
  const soundEnabled = usePlayerStore((s) => s.soundEnabled);
  const setSoundEnabled = usePlayerStore((s) => s.setSoundEnabled);
  const fallback2D = useGraphicsStore((s) => s.fallback2D);

  const [callLoading, setCallLoading] = useState(false);

  const handleCellPress = async (number: number) => {
    if (!isMyTurn) {
      Alert.alert('Not Your Turn', 'Wait for your opponent to select a number.');
      return;
    }
    if (calledNumbers.includes(number)) {
      return;
    }

    try {
      setCallLoading(true);
      const res = await callNumber(number);
      if (!res.success) {
        Alert.alert('Invalid Move', res.error || 'Could not call number');
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Call failed');
    } finally {
      setCallLoading(false);
    }
  };

  const handleLeave = () => {
    Alert.alert(
      'Leave Match',
      'Leaving now will forfeit the game to your opponent. Are you sure?',
      [
        { text: 'Stay & Play', style: 'cancel' },
        {
          text: 'Forfeit & Leave',
          style: 'destructive',
          onPress: async () => {
            await leaveRoom();
            router.replace('/home');
          },
        },
      ]
    );
  };

  const myPlayerObj = {
    id: playerId,
    socketId: '',
    username,
    avatarUrl,
    isReady: true,
    isConnected: true,
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <GameHeader
        title="Bingo Battle"
        subtitle={roomCode === 'SOLO' ? 'Single Player Mode' : `Room ${roomCode}`}
        onBackPress={handleLeave}
      />

      <ScrollView contentContainerStyle={styles.content}>
        {/* Opponent & Self mini scoreboard */}
        <View style={styles.scoreRow}>
          <View style={styles.scoreHalf}>
            <PlayerCard
              player={myPlayerObj}
              isTurn={isMyTurn}
              linesCompleted={myLines}
            />
          </View>
          <View style={styles.scoreHalf}>
            <PlayerCard
              player={opponent}
              isTurn={!isMyTurn}
              linesCompleted={opponentLines}
              emptyPlaceholderText="Opponent disconnected"
            />
          </View>
        </View>

        {/* Turn Banner */}
        <View style={[styles.turnBanner, isMyTurn ? styles.myTurnBanner : styles.oppTurnBanner]}>
          <Shield size={16} color={isMyTurn ? '#00e5ff' : '#f59e0b'} />
          <Text style={[styles.turnBannerText, isMyTurn ? styles.myTurnText : styles.oppTurnText]}>
            {isMyTurn
              ? 'YOUR TURN — Tap an uncrossed number'
              : `${opponent?.username || 'Opponent'}'s Turn`}
          </Text>
        </View>

        {/* B-I-N-G-O Progress */}
        <BingoProgress linesCompleted={myLines} />

        {/* 5x5 Grid (3D GPU Render or 2D Fallback) */}
        <View style={styles.boardWrapper}>
          {!fallback2D ? (
            <BingoScene3D
              board={myBoard}
              calledNumbers={calledNumbers}
              lastCalledNumber={lastCalledNumber}
              onCellPress={handleCellPress}
              disabled={!isMyTurn || callLoading}
              isWinner={myLines >= 5}
            />
          ) : (
            <BingoBoard
              board={myBoard}
              calledNumbers={calledNumbers}
              lastCalledNumber={lastCalledNumber}
              onCellPress={handleCellPress}
              disabled={!isMyTurn || callLoading}
            />
          )}
        </View>

        {/* Bottom Bar: Last Called Number & Status */}
        <View style={styles.bottomBar}>
          <View style={styles.lastCalledBox}>
            <Text style={styles.lastCalledLabel}>LAST NUMBER</Text>
            <Text style={styles.lastCalledVal}>
              {lastCalledNumber !== null ? lastCalledNumber : '--'}
            </Text>
          </View>

          <View style={styles.statusBox}>
            <Text style={styles.numbersCalledCount}>
              {calledNumbers.length} / 25 Numbers Called
            </Text>
            <Text style={styles.boardProgress}>
              Need {Math.max(0, 5 - myLines)} more lines for BINGO
            </Text>
          </View>

          <View style={styles.actionsBox}>
            <TouchableOpacity
              onPress={() => setSoundEnabled(!soundEnabled)}
              style={styles.roundBtn}
            >
              {soundEnabled ? (
                <Volume2 color="#a5b4fc" size={20} />
              ) : (
                <VolumeX color="#64748b" size={20} />
              )}
            </TouchableOpacity>

            <TouchableOpacity onPress={handleLeave} style={[styles.roundBtn, styles.leaveBtn]}>
              <LogOut color="#ef4444" size={20} />
            </TouchableOpacity>
          </View>
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
    padding: 14,
    alignItems: 'center',
  },
  scoreRow: {
    flexDirection: 'row',
    gap: 8,
    width: '100%',
    marginBottom: 8,
  },
  scoreHalf: {
    flex: 1,
  },
  turnBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 14,
    width: '100%',
    marginVertical: 4,
    justifyContent: 'center',
    borderWidth: 1,
  },
  myTurnBanner: {
    backgroundColor: 'rgba(0, 229, 255, 0.1)',
    borderColor: '#00e5ff',
  },
  oppTurnBanner: {
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderColor: '#f59e0b',
  },
  turnBannerText: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  myTurnText: {
    color: '#00e5ff',
  },
  oppTurnText: {
    color: '#f59e0b',
  },
  boardWrapper: {
    width: '100%',
    alignItems: 'center',
    marginVertical: 6,
  },
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#11183c',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: '#1e293b',
    width: '100%',
    marginTop: 8,
    gap: 12,
  },
  lastCalledBox: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#6366f1',
    minWidth: 70,
  },
  lastCalledLabel: {
    fontSize: 8,
    fontWeight: '800',
    color: '#a5b4fc',
    letterSpacing: 0.5,
  },
  lastCalledVal: {
    fontSize: 22,
    fontWeight: '900',
    color: '#00e5ff',
  },
  statusBox: {
    flex: 1,
  },
  numbersCalledCount: {
    fontSize: 13,
    fontWeight: '700',
    color: '#f8fafc',
  },
  boardProgress: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 2,
  },
  actionsBox: {
    flexDirection: 'row',
    gap: 6,
  },
  roundBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#1e293b',
    alignItems: 'center',
    justifyContent: 'center',
  },
  leaveBtn: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
  },
});
