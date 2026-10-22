import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  TouchableOpacity,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LogOut, Volume2, VolumeX, Shield, Clock, Settings, Star } from 'lucide-react-native';
import { PlayerCard } from '../components/PlayerCard';
import { BingoBoard } from '../components/BingoBoard';
import { useGame } from '../hooks/useGame';
import { useRoom } from '../hooks/useRoom';
import { usePlayerStore } from '../store/playerStore';

const BALL_COLORS = ['#A855F7', '#EAB308', '#22C55E', '#06B6D4'];

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

  const [callLoading, setCallLoading] = useState(false);
  const [matchSeconds, setMatchSeconds] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setMatchSeconds((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, []);

  const formatTimer = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const trailingCalled = calledNumbers.slice(-5).reverse();
  const currentBall = lastCalledNumber !== null ? lastCalledNumber : (trailingCalled[0] ?? null);
  const previousBalls = currentBall !== null ? trailingCalled.filter((n) => n !== currentBall).slice(0, 4) : [];

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
      {/* Top Header matching Image 3 */}
      <View style={styles.topGameBar}>
        <View style={styles.userPill}>
          <Image
            source={{ uri: avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100' }}
            style={styles.avatarImg}
          />
          <View style={styles.userInfo}>
            <Text style={styles.pillUsername} numberOfLines={1}>{username || 'Player'}</Text>
            <View style={styles.coinBadge}>
              <Star size={10} color="#FBBF24" fill="#FBBF24" />
              <Text style={styles.coinText}>4,000</Text>
            </View>
          </View>
        </View>

        <View style={styles.timerPill}>
          <Clock size={15} color="#FFFFFF" />
          <Text style={styles.timerText}>{formatTimer(matchSeconds)}</Text>
        </View>

        <TouchableOpacity style={styles.settingsBtn} onPress={handleLeave}>
          <Settings size={20} color="#059669" />
        </TouchableOpacity>
      </View>

      {/* Rolling Called Numbers Strip matching Image 3 */}
      <View style={styles.rollerStrip}>
        {currentBall !== null ? (
          <View style={styles.activeBallWrapper}>
            <View style={styles.activeBallStitch}>
              <View style={styles.activeBallInner}>
                <Text style={styles.activeBallText}>{currentBall}</Text>
              </View>
            </View>
          </View>
        ) : (
          <View style={styles.waitingBall}>
            <Text style={styles.waitingBallText}>--</Text>
          </View>
        )}

        <View style={styles.trailingBallsRow}>
          {previousBalls.map((num, idx) => (
            <View
              key={num}
              style={[
                styles.trailingBall,
                { backgroundColor: BALL_COLORS[idx % BALL_COLORS.length] },
              ]}
            >
              <Text style={styles.trailingBallText}>{num}</Text>
            </View>
          ))}
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Turn Status */}
        <View style={[styles.turnBanner, isMyTurn ? styles.myTurnBanner : styles.oppTurnBanner]}>
          <Shield size={16} color={isMyTurn ? '#34D399' : '#FBBF24'} />
          <Text style={[styles.turnBannerText, isMyTurn ? styles.myTurnText : styles.oppTurnText]}>
            {isMyTurn
              ? 'YOUR TURN — Tap an uncalled number'
              : `${opponent?.username || 'Opponent'}'s Turn`}
          </Text>
        </View>

        {/* 5x5 Grid with B-I-N-G-O Headers */}
        <View style={styles.boardWrapper}>
          <BingoBoard
            board={myBoard}
            calledNumbers={calledNumbers}
            lastCalledNumber={lastCalledNumber}
            onCellPress={handleCellPress}
            disabled={!isMyTurn || callLoading}
          />
        </View>

        {/* Scoreboard footer */}
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

        {/* Bottom Bar: Quick Audio & Leave */}
        <View style={styles.bottomBar}>
          <View style={styles.statusBox}>
            <Text style={styles.numbersCalledCount}>
              {calledNumbers.length} / 25 Numbers Called
            </Text>
            <Text style={styles.boardProgress}>
              Need {Math.max(0, 5 - myLines)} lines for BINGO
            </Text>
          </View>

          <View style={styles.actionsBox}>
            <TouchableOpacity
              onPress={() => setSoundEnabled(!soundEnabled)}
              style={styles.roundBtn}
            >
              {soundEnabled ? (
                <Volume2 color="#34D399" size={20} />
              ) : (
                <VolumeX color="#94A3B8" size={20} />
              )}
            </TouchableOpacity>

            <TouchableOpacity onPress={handleLeave} style={[styles.roundBtn, styles.leaveBtn]}>
              <LogOut color="#EF4444" size={20} />
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
    backgroundColor: '#0F291E',
  },
  topGameBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#15803D',
    borderBottomWidth: 1.5,
    borderBottomColor: '#22C55E',
  },
  userPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    paddingRight: 12,
    paddingLeft: 3,
    paddingVertical: 3,
    gap: 8,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  avatarImg: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#CBD5E1',
  },
  userInfo: {
    justifyContent: 'center',
  },
  pillUsername: {
    fontSize: 12,
    fontWeight: '900',
    color: '#0F172A',
    maxWidth: 90,
  },
  coinBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  coinText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#D97706',
  },
  timerPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#16A34A',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    gap: 6,
    borderWidth: 1,
    borderColor: '#4ADE80',
  },
  timerText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  settingsBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  rollerStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#166534',
    gap: 12,
  },
  activeBallWrapper: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 6,
  },
  activeBallStitch: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: '#EF4444',
    borderWidth: 3,
    borderColor: '#F87171',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeBallInner: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFBEB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeBallText: {
    fontSize: 22,
    fontWeight: '900',
    color: '#1E293B',
  },
  waitingBall: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  waitingBallText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '900',
  },
  trailingBallsRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  trailingBall: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  trailingBallText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
  },
  content: {
    padding: 14,
    alignItems: 'center',
  },
  scoreRow: {
    flexDirection: 'row',
    gap: 8,
    width: '100%',
    marginVertical: 8,
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
    borderRadius: 16,
    width: '100%',
    marginBottom: 8,
    justifyContent: 'center',
    backgroundColor: '#14532D',
    borderWidth: 1.5,
    borderColor: '#22C55E',
  },
  myTurnBanner: {
    backgroundColor: 'rgba(52, 211, 153, 0.2)',
    borderColor: '#34D399',
  },
  oppTurnBanner: {
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
    borderColor: '#F59E0B',
  },
  turnBannerText: {
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  myTurnText: {
    color: '#34D399',
  },
  oppTurnText: {
    color: '#FBBF24',
  },
  boardWrapper: {
    width: '100%',
    alignItems: 'center',
    marginVertical: 4,
  },
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#14532D',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1.5,
    borderColor: '#22C55E',
    width: '100%',
    marginTop: 6,
    gap: 12,
  },
  statusBox: {
    flex: 1,
  },
  numbersCalledCount: {
    fontSize: 13,
    fontWeight: '800',
    color: '#F8FAFC',
  },
  boardProgress: {
    fontSize: 11,
    color: '#A7F3D0',
    marginTop: 2,
    fontWeight: '700',
  },
  actionsBox: {
    flexDirection: 'row',
    gap: 8,
  },
  roundBtn: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: '#166534',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#22C55E',
  },
  leaveBtn: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    borderColor: '#EF4444',
  },
});
