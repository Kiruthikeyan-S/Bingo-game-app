import React, { useState, useEffect } from 'react';
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
import { ChevronLeft, Grid, Sparkles } from 'lucide-react-native';
import { BingoProgress } from '../components/BingoProgress';
import { BingoBoard } from '../components/BingoBoard';
import { BingoScene3D } from '../components/3d/bingo/BingoScene3D';
import { useGraphicsStore } from '../store/graphicsStore';
import { useGame } from '../hooks/useGame';
import { useRoom } from '../hooks/useRoom';
import { usePlayerStore } from '../store/playerStore';
import { EsportsPlayerCard } from '../components/gameplay/EsportsPlayerCard';
import { EsportsBottomBar } from '../components/gameplay/EsportsBottomBar';
import {
  GameOptionsModal,
  GameChatModal,
  GameAnalyzeModal,
} from '../components/gameplay/GameModals';

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
  const username = usePlayerStore((s) => s.username) || 'kiruthik1811';
  const avatarUrl = usePlayerStore((s) => s.avatarUrl);
  const soundEnabled = usePlayerStore((s) => s.soundEnabled);
  const setSoundEnabled = usePlayerStore((s) => s.setSoundEnabled);
  const fallback2D = useGraphicsStore((s) => s.fallback2D);
  const toggleFallback2D = useGraphicsStore((s) => s.toggleFallback2D);

  const [callLoading, setCallLoading] = useState(false);
  const [playerClock, setPlayerClock] = useState(600);
  const [oppClock, setOppClock] = useState(600);

  // Modals
  const [optionsVisible, setOptionsVisible] = useState(false);
  const [chatVisible, setChatVisible] = useState(false);
  const [analyzeVisible, setAnalyzeVisible] = useState(false);

  // Live timer tick
  useEffect(() => {
    if (myLines >= 5 || opponentLines >= 5) return;
    const interval = setInterval(() => {
      if (isMyTurn) {
        setPlayerClock((c) => Math.max(0, c - 1));
      } else {
        setOppClock((c) => Math.max(0, c - 1));
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [isMyTurn, myLines, opponentLines]);

  const formatClock = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

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

  const oppName = opponent?.username || (roomCode === 'SOLO' ? 'potawatomee (Bot)' : 'Waiting...');
  const oppAvatar = opponent?.avatarUrl;

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Top Header matching Tournament UI */}
      <View style={styles.topHeader}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={handleLeave}
          activeOpacity={0.7}
        >
          <ChevronLeft size={24} color="#f8fafc" />
        </TouchableOpacity>

        <View style={styles.brandCenter}>
          <Grid size={18} color="#00e5ff" style={{ marginRight: 6 }} />
          <Text style={styles.brandTitleText}>
            Bingo<Text style={{ color: '#00e5ff' }}>Battle</Text>
          </Text>
        </View>

        <View style={styles.callBadgePill}>
          <Text style={styles.callBadgeText}>
            {lastCalledNumber !== null ? `CALL: #${lastCalledNumber}` : 'READY'}
          </Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Opponent Player Card (Top) */}
        <EsportsPlayerCard
          avatarUrl={oppAvatar}
          username={oppName}
          rating={roomCode === 'SOLO' ? 302 : 1180}
          countryFlag="🇺🇸"
          isTurn={!isMyTurn}
          timeText={formatClock(oppClock)}
          isTop={true}
          capturedContent={
            <Text style={styles.cardSubText}>
              Progress: {opponentLines}/5 Lines Completed
            </Text>
          }
        />

        {/* B-I-N-G-O Progress Banner */}
        <BingoProgress linesCompleted={myLines} />

        {/* 5x5 Grid (Real 3D GPU Render or 2D High-Performance Fallback) */}
        <View style={styles.boardWrapper}>
          {!fallback2D ? (
            <BingoScene3D
              board={myBoard}
              calledNumbers={calledNumbers}
              lastCalledNumber={lastCalledNumber}
              onCellPress={handleCellPress}
              disabled={callLoading}
              isWinner={myLines >= 5}
            />
          ) : (
            <BingoBoard
              board={myBoard}
              calledNumbers={calledNumbers}
              lastCalledNumber={lastCalledNumber}
              onCellPress={handleCellPress}
              disabled={callLoading}
            />
          )}
        </View>

        {/* Self Player Card (Bottom) */}
        <EsportsPlayerCard
          avatarUrl={avatarUrl}
          username={username}
          rating={597}
          countryFlag="🇮🇳"
          badgeLabel="HYPE!"
          isTurn={isMyTurn}
          timeText={formatClock(playerClock)}
          isTop={false}
          capturedContent={
            <Text style={[styles.cardSubText, { color: '#00e5ff' }]}>
              {myLines}/5 Lines · {calledNumbers.length}/25 Numbers Called
            </Text>
          }
        />
      </ScrollView>

      {/* 5-Button Esports Bottom Navigation Bar */}
      <EsportsBottomBar
        onOptionsPress={() => setOptionsVisible(true)}
        onChatPress={() => setChatVisible(true)}
        onAnalyzePress={() => setAnalyzeVisible(true)}
        onBackPress={handleLeave}
        onForwardPress={() => {
          if (myLines >= 5) {
            Alert.alert('BINGO WINNER!', 'You have completed all 5 lines!');
          } else {
            setAnalyzeVisible(true);
          }
        }}
        canStepBack={true}
        canStepForward={true}
        forwardLabel={myLines >= 5 ? 'BINGO!' : 'Call'}
        forwardHighlight={myLines >= 5}
      />

      {/* Interactive Options Modal */}
      <GameOptionsModal
        visible={optionsVisible}
        onClose={() => setOptionsVisible(false)}
        is3D={!fallback2D}
        onToggle3D={toggleFallback2D}
        soundEnabled={soundEnabled}
        onToggleSound={() => setSoundEnabled(!soundEnabled)}
        onResign={handleLeave}
        gameType="bingo"
      />

      {/* Sportsmanlike Chat Modal */}
      <GameChatModal
        visible={chatVisible}
        onClose={() => setChatVisible(false)}
      />

      {/* Tactical Bingo Analysis / Line Scanner */}
      <GameAnalyzeModal
        visible={analyzeVisible}
        onClose={() => setAnalyzeVisible(false)}
        evaluationScore={`${myLines} of 5 Lines Formed`}
        bestMove={`Focus on uncrossed numbers near row/column junctions`}
        tacticalTip={`Completing corners and diagonal numbers grants fastest dual-line completions.`}
        accuracyScore={Math.min(100, Math.round((myLines / 5) * 100) + 20)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#070b1e',
  },
  topHeader: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#172238',
  },
  backButton: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: '#0e1628',
  },
  brandCenter: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  brandTitleText: {
    color: '#f8fafc',
    fontSize: 17,
    fontWeight: '900',
    letterSpacing: 0.3,
  },
  callBadgePill: {
    backgroundColor: '#151f33',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#243452',
  },
  callBadgeText: {
    color: '#00e5ff',
    fontSize: 12,
    fontWeight: '800',
  },
  content: {
    paddingHorizontal: 14,
    paddingTop: 8,
    paddingBottom: 16,
    alignItems: 'center',
  },
  boardWrapper: {
    marginVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardSubText: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: '600',
  },
});
