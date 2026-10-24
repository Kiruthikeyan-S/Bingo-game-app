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
import { LinearGradient } from 'expo-linear-gradient';
import {
  Volume2,
  VolumeX,
  LogOut,
  Trophy,
  Flame,
  Radio,
  Timer,
  Layers,
  Sparkles,
} from 'lucide-react-native';
import { GameHeader } from '../components/GameHeader';
import { BingoBoard } from '../components/BingoBoard';
import { useGame } from '../hooks/useGame';
import { useRoom } from '../hooks/useRoom';
import { usePlayerStore } from '../store/playerStore';

function getBingoLetter(num: number): string {
  if (num <= 15) return 'B';
  if (num <= 30) return 'I';
  if (num <= 45) return 'N';
  if (num <= 60) return 'G';
  return 'O';
}

export default function GameScreen() {
  const router = useRouter();
  const {
    calledNumbers,
    lastCalledNumber,
    isMyTurn,
    myLines,
    opponentLines,
    opponent,
    callNumber,
    myBoard,
  } = useGame();

  const { leaveRoom } = useRoom();
  const username = usePlayerStore((s) => s.username);
  const soundEnabled = usePlayerStore((s) => s.soundEnabled);
  const setSoundEnabled = usePlayerStore((s) => s.setSoundEnabled);

  const [callLoading, setCallLoading] = useState(false);
  const [countdownSeconds, setCountdownSeconds] = useState(4);

  // Simulated active round countdown ticker
  useEffect(() => {
    const timer = setInterval(() => {
      setCountdownSeconds((prev) => (prev <= 1 ? 5 : prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [lastCalledNumber]);

  const trailingCalled = calledNumbers.slice(-6).reverse();
  const currentBall = lastCalledNumber !== null ? lastCalledNumber : (trailingCalled[0] ?? null);
  const previousBalls = currentBall !== null ? trailingCalled.filter((n) => n !== currentBall).slice(0, 5) : [];

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

  const handleClaimBingo = () => {
    if (myLines >= 5) {
      Alert.alert('BINGO!', 'You completed 5 lines and claimed the win!');
    } else {
      Alert.alert(
        'Keep Going!',
        `You have completed ${myLines} of 5 lines. Complete ${5 - myLines} more to claim BINGO!`
      );
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

  const progressPct = Math.min(100, Math.round((myLines / 5) * 100));

  return (
    <SafeAreaView style={styles.safeArea}>
      <GameHeader
        title="Super Bingo Royale"
        subtitle="Light Live Hall"
        onBackPress={handleLeave}
      />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Live Room Status Ribbon matching Stitch Light */}
        <View style={styles.statusRibbon}>
          <View style={styles.ribbonTopRow}>
            <View style={styles.ribbonLeft}>
              <View style={styles.liveDotWrapper}>
                <View style={styles.liveDotPing} />
                <View style={styles.liveDot} />
              </View>
              <Text style={styles.hallTitleText}>Cyber Gold 75</Text>
              <View style={styles.hallBadge}>
                <Text style={styles.hallBadgeText}>LIGHT HALL</Text>
              </View>
            </View>

            <View style={styles.potBadge}>
              <Trophy size={14} color="#D97706" />
              <Text style={styles.potBadgeText}>45,000 GC</Text>
            </View>
          </View>

          <View style={styles.ribbonBottomRow}>
            <View style={styles.roundInfo}>
              <Layers size={14} color="#4F46E5" />
              <Text style={styles.roundInfoText}>
                {calledNumbers.length} / 25 Called
              </Text>
            </View>
            <View style={styles.timerBadge}>
              <Timer size={13} color="#EF4444" />
              <Text style={styles.timerBadgeText}>00:0{countdownSeconds}</Text>
            </View>
          </View>
        </View>

        {/* Called Ball Spotlight & Recent Feed matching Stitch */}
        <View style={styles.spotlightCard}>
          <View style={styles.spotlightHeader}>
            <View style={styles.radarGroup}>
              <Radio size={14} color="#0891B2" />
              <Text style={styles.radarLabel}>LIVE CALLER MACHINE</Text>
            </View>
            <Text style={styles.ballCountLabel}>
              Ball #{calledNumbers.length}
            </Text>
          </View>

          <View style={styles.spotlightRow}>
            {/* Main Spotlight Ball */}
            <View style={styles.spotlightBallWrapper}>
              <LinearGradient
                colors={['#4F46E5', '#0891B2']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.spotlightBallOuter}
              >
                <View style={styles.spotlightBallInner}>
                  {currentBall !== null ? (
                    <>
                      <Text style={styles.spotlightBallLetter}>
                        {getBingoLetter(currentBall)}
                      </Text>
                      <Text style={styles.spotlightBallNumber}>
                        {currentBall}
                      </Text>
                    </>
                  ) : (
                    <Text style={styles.spotlightBallNumber}>--</Text>
                  )}
                </View>
              </LinearGradient>
              <View style={styles.newBallBadge}>
                <Text style={styles.newBallBadgeText}>NEW</Text>
              </View>
            </View>

            {/* Recent Ball Drops Tray */}
            <View style={styles.dropsTrayCol}>
              <Text style={styles.dropsTrayLabel}>Recent Drops</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.dropsScroll}
              >
                {previousBalls.length === 0 ? (
                  <Text style={styles.emptyDropsText}>Awaiting first call...</Text>
                ) : (
                  previousBalls.map((num) => (
                    <View key={num} style={styles.dropBall}>
                      <Text style={styles.dropBallLetter}>{getBingoLetter(num)}</Text>
                      <Text style={styles.dropBallNum}>{num}</Text>
                    </View>
                  ))
                )}
              </ScrollView>
            </View>
          </View>
        </View>

        {/* Active Card Status Bar matching Stitch */}
        <View style={styles.cardStatusBar}>
          <View style={styles.cardStatusTopRow}>
            <View style={styles.cardStatusLeft}>
              <Layers size={16} color="#4F46E5" />
              <Text style={styles.cardStatusTitle}>Card #1 Active</Text>
              <Text style={styles.cardStatusSub}>({myLines} / 5 Lines)</Text>
            </View>
            <View style={styles.progressPill}>
              <Text style={styles.progressPillText}>{progressPct}% Progress</Text>
            </View>
          </View>

          {/* Progress Bar */}
          <View style={styles.progressBarTrack}>
            <LinearGradient
              colors={['#4F46E5', '#06B6D4']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[styles.progressBarFill, { width: `${progressPct}%` }]}
            />
          </View>

          <View style={styles.cardStatusBottomRow}>
            <View style={styles.fireGroup}>
              <Flame size={14} color="#D97706" />
              <Text style={styles.fireText}>
                {Math.max(0, 5 - myLines)} lines away from BINGO!
              </Text>
            </View>
            <Text style={styles.turnIndicatorText}>
              {isMyTurn ? 'Your Turn' : 'Waiting...'}
            </Text>
          </View>
        </View>

        {/* 5x5 B-I-N-G-O Matrix Board */}
        <BingoBoard
          board={myBoard}
          calledNumbers={calledNumbers}
          lastCalledNumber={lastCalledNumber}
          onCellPress={handleCellPress}
          disabled={!isMyTurn || callLoading}
        />

        {/* Live Competitors in Room */}
        <View style={styles.competitorsCard}>
          <View style={styles.competitorsHeader}>
            <View style={styles.competitorsTitleRow}>
              <Text style={styles.competitorsTitle}>COMPETITORS LIVE</Text>
              <View style={styles.inRoomBadge}>
                <Text style={styles.inRoomBadgeText}>2 in room</Text>
              </View>
            </View>
            <Text style={styles.topStreaksText}>Live Battle</Text>
          </View>

          <View style={styles.competitorsGrid}>
            {/* Player 1 (You) */}
            <View style={styles.competitorTile}>
              <View style={styles.compNameRow}>
                <Text style={styles.compNameText} numberOfLines={1}>
                  {username || 'You'}
                </Text>
                <Text style={styles.compPctText}>{progressPct}%</Text>
              </View>
              <View style={styles.compTrack}>
                <View style={[styles.compFill, { width: `${progressPct}%`, backgroundColor: '#4F46E5' }]} />
              </View>
              <Text style={styles.compSubText}>{myLines}/5 Lines</Text>
            </View>

            {/* Player 2 (Opponent) */}
            <View style={styles.competitorTile}>
              <View style={styles.compNameRow}>
                <Text style={styles.compNameText} numberOfLines={1}>
                  {opponent?.username || 'Opponent'}
                </Text>
                <Text style={[styles.compPctText, { color: '#0891B2' }]}>
                  {Math.round((opponentLines / 5) * 100)}%
                </Text>
              </View>
              <View style={styles.compTrack}>
                <View
                  style={[
                    styles.compFill,
                    {
                      width: `${Math.round((opponentLines / 5) * 100)}%`,
                      backgroundColor: '#0891B2',
                    },
                  ]}
                />
              </View>
              <Text style={styles.compSubText}>{opponentLines}/5 Lines</Text>
            </View>
          </View>
        </View>

        {/* Action Controls Bottom */}
        <View style={styles.bottomActionsCol}>
          {/* Big Glowing Claim Bingo Button */}
          <TouchableOpacity
            style={[styles.claimBingoBtn, myLines < 5 && styles.claimBingoBtnDisabled]}
            onPress={handleClaimBingo}
            activeOpacity={0.88}
          >
            <LinearGradient
              colors={myLines >= 5 ? ['#4F46E5', '#4338CA'] : ['#E2E8F0', '#CBD5E1']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.claimBingoGradient}
            >
              <Sparkles size={20} color={myLines >= 5 ? '#FBBF24' : '#64748B'} />
              <Text
                style={[
                  styles.claimBingoText,
                  myLines < 5 && { color: '#64748B' },
                ]}
              >
                CLAIM BINGO! ✨
              </Text>
            </LinearGradient>
          </TouchableOpacity>

          {/* Secondary Utility Row */}
          <View style={styles.utilityRow}>
            <TouchableOpacity
              style={styles.utilityBtn}
              onPress={() => setSoundEnabled(!soundEnabled)}
              activeOpacity={0.8}
            >
              {soundEnabled ? (
                <Volume2 size={16} color="#4F46E5" />
              ) : (
                <VolumeX size={16} color="#64748B" />
              )}
              <Text style={styles.utilityBtnText}>
                {soundEnabled ? 'Audio On' : 'Audio Muted'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.utilityBtn, styles.utilityBtnLeave]}
              onPress={handleLeave}
              activeOpacity={0.8}
            >
              <LogOut size={16} color="#EF4444" />
              <Text style={[styles.utilityBtnText, { color: '#EF4444' }]}>
                Leave Room
              </Text>
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
    backgroundColor: '#F8FAFC',
  },
  content: {
    paddingHorizontal: 16,
    paddingBottom: 36,
    gap: 12,
  },
  statusRibbon: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 8,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  ribbonTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  ribbonLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  liveDotWrapper: {
    position: 'relative',
    width: 10,
    height: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  liveDotPing: {
    position: 'absolute',
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#06B6D4',
    opacity: 0.5,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#06B6D4',
  },
  hallTitleText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  hallBadge: {
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  hallBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#4F46E5',
    letterSpacing: 0.5,
  },
  potBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    gap: 4,
  },
  potBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#D97706',
  },
  ribbonBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 4,
  },
  roundInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  roundInfoText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
  },
  timerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    gap: 4,
  },
  timerBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#EF4444',
    fontFamily: 'monospace',
  },
  spotlightCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 10,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  spotlightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  radarGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  radarLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#0891B2',
    letterSpacing: 0.8,
  },
  ballCountLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0891B2',
  },
  spotlightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  spotlightBallWrapper: {
    position: 'relative',
  },
  spotlightBallOuter: {
    width: 64,
    height: 64,
    borderRadius: 32,
    padding: 2.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  spotlightBallInner: {
    width: '100%',
    height: '100%',
    borderRadius: 30,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  spotlightBallLetter: {
    fontSize: 10,
    fontWeight: '800',
    color: '#4F46E5',
    lineHeight: 12,
  },
  spotlightBallNumber: {
    fontSize: 22,
    fontWeight: '900',
    color: '#4F46E5',
    lineHeight: 26,
  },
  newBallBadge: {
    position: 'absolute',
    bottom: -2,
    right: -4,
    backgroundColor: '#06B6D4',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 6,
  },
  newBallBadgeText: {
    fontSize: 8,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  dropsTrayCol: {
    flex: 1,
    gap: 4,
  },
  dropsTrayLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase',
  },
  dropsScroll: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 2,
  },
  emptyDropsText: {
    fontSize: 11,
    color: '#94A3B8',
    fontStyle: 'italic',
  },
  dropBall: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  dropBallLetter: {
    fontSize: 8,
    fontWeight: '800',
    color: '#64748B',
    lineHeight: 10,
  },
  dropBallNum: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
    lineHeight: 15,
  },
  cardStatusBar: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 8,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  cardStatusTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardStatusLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  cardStatusTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  cardStatusSub: {
    fontSize: 11,
    color: '#64748B',
  },
  progressPill: {
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  progressPillText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#4F46E5',
  },
  progressBarTrack: {
    width: '100%',
    height: 6,
    borderRadius: 3,
    backgroundColor: '#F1F5F9',
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  cardStatusBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  fireGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  fireText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#D97706',
  },
  turnIndicatorText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#4F46E5',
  },
  competitorsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 10,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  competitorsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  competitorsTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  competitorsTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: 0.8,
  },
  inRoomBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
  },
  inRoomBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#64748B',
  },
  topStreaksText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
  },
  competitorsGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  competitorTile: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 8,
    gap: 4,
  },
  compNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  compNameText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0F172A',
    flex: 1,
  },
  compPctText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#4F46E5',
  },
  compTrack: {
    width: '100%',
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E2E8F0',
    overflow: 'hidden',
  },
  compFill: {
    height: '100%',
    borderRadius: 2,
  },
  compSubText: {
    fontSize: 9,
    color: '#64748B',
  },
  bottomActionsCol: {
    gap: 10,
    marginTop: 4,
  },
  claimBingoBtn: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  claimBingoBtnDisabled: {
    shadowOpacity: 0,
    elevation: 0,
  },
  claimBingoGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 8,
  },
  claimBingoText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  utilityRow: {
    flexDirection: 'row',
    gap: 10,
  },
  utilityBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 6,
  },
  utilityBtnLeave: {
    backgroundColor: '#FFF1F2',
    borderColor: '#FECDD3',
  },
  utilityBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
});