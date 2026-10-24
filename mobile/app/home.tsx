import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  Modal,
  Animated,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Play,
  Settings as SettingsIcon,
  X,
  Cpu,
  Globe,
  Users,
  Crown,
  Dices,
  Grid,
  Volume2,
  VolumeX,
  Flame,
  Clock,
  Trophy,
  Gift,
  ArrowRight,
  Shield,
  Zap,
  Gauge,
  Sparkles,
} from 'lucide-react-native';
import { usePlayerStore } from '../store/playerStore';
import { useGameStore } from '../store/gameStore';
import { useSocket } from '../hooks/useSocket';
import { BottomNavBar } from '../components/BottomNavBar';
import { BotDifficulty, GameType } from '../../shared/types';

interface GameItem {
  id: GameType;
  title: string;
  subtitle: string;
  tag: string;
  tagType: 'trending' | 'ranked' | 'jackpot';
  playersTag: string;
  playerCount: string;
  image: string;
}

const FEATURED_GAMES: GameItem[] = [
  {
    id: 'ludo',
    title: 'Ludo Kingpin',
    subtitle: 'Fast-paced classic dice roller with tactical boost traps and power dice.',
    tag: 'Trending',
    tagType: 'trending',
    playersTag: '4 Players',
    playerCount: '14.2k playing',
    image: 'https://images.unsplash.com/photo-1610890716171-6b1bb98ffd09?w=500',
  },
  {
    id: 'chess',
    title: 'Chess Grandmaster',
    subtitle: '1v1 tactical duel with real-time Elo match analysis and blitz clock modes.',
    tag: 'Ranked Season 4',
    tagType: 'ranked',
    playersTag: '3m Blitz',
    playerCount: '8.6k playing',
    image: 'https://images.unsplash.com/photo-1529699211952-734e80c4d42b?w=500',
  },
  {
    id: 'bingo',
    title: 'Bingo Blitz Royale',
    subtitle: '75-ball live multiplayer frenzy with speed-dabbing and global progressive pots.',
    tag: 'Jackpot 50k',
    tagType: 'jackpot',
    playersTag: '75-Ball',
    playerCount: '19.8k playing',
    image: 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=500',
  },
];

export default function HomeScreen() {
  const router = useRouter();
  useSocket();

  const playerId = usePlayerStore((s) => s.playerId);
  const username = usePlayerStore((s) => s.username);
  const avatarUrl = usePlayerStore((s) => s.avatarUrl);
  const coins = usePlayerStore((s) => s.coins);
  const soundEnabled = usePlayerStore((s) => s.soundEnabled);
  const setSoundEnabled = usePlayerStore((s) => s.setSoundEnabled);

  const selectedGame = useGameStore((s) => s.selectedGame);
  const setSelectedGame = useGameStore((s) => s.setSelectedGame);
  const setGameMode = useGameStore((s) => s.setGameMode);
  const setBotDifficulty = useGameStore((s) => s.setBotDifficulty);
  const setLudoBotCount = useGameStore((s) => s.setLudoBotCount);

  const [modeModalVisible, setModeModalVisible] = useState(false);
  const [activeGameId, setActiveGameId] = useState<GameType>('ludo');
  const [claimedDaily, setClaimedDaily] = useState(false);

  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.05,
          duration: 1200,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1200,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [pulseAnim]);

  const handleOpenGameModal = (gameId: GameType) => {
    setActiveGameId(gameId);
    setSelectedGame(gameId);
    setModeModalVisible(true);
  };

  const handlePlaySolo = (diff: BotDifficulty = 'medium', botCount: 1 | 2 | 3 = 3) => {
    setModeModalVisible(false);
    setSelectedGame(activeGameId);
    setGameMode('bot');
    setBotDifficulty(diff);
    setLudoBotCount(botCount);

    if (activeGameId === 'chess') {
      router.push('/games/chess');
    } else if (activeGameId === 'ludo') {
      router.push('/games/ludo');
    } else {
      router.push('/board-setup');
    }
  };

  const handleCreateOnlineRoom = () => {
    setModeModalVisible(false);
    setSelectedGame(activeGameId);
    setGameMode('online');
    router.push('/create-room');
  };

  const handleJoinOnlineRoom = () => {
    setModeModalVisible(false);
    setSelectedGame(activeGameId);
    setGameMode('online');
    router.push('/join-room');
  };

  const handlePublicMatchmaking = () => {
    setModeModalVisible(false);
    setSelectedGame(activeGameId);
    setGameMode('online');
    router.push('/matchmaking');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        {/* Header: GameZone Brand, Coins Pill, User Profile matching Stitch */}
        <View style={styles.topHeader}>
          <View style={styles.brandGroup}>
            <View style={styles.brandIconBox}>
              <Zap size={18} color="#FFFFFF" />
            </View>
            <Text style={styles.brandTitle}>GameZone</Text>
          </View>

          <View style={styles.headerRight}>
            <View style={styles.currencyBadge}>
              <View style={styles.coinDot}>
                <Text style={styles.coinSymbol}>$</Text>
              </View>
              <Text style={styles.currencyAmount}>{coins.toLocaleString()}</Text>
              <Text style={styles.currencyUnit}>GC</Text>
            </View>

            <TouchableOpacity
              activeOpacity={0.85}
              style={styles.avatarButton}
              onPress={() => router.push('/profile')}
            >
              <Image source={{ uri: avatarUrl }} style={styles.avatarImg} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Hero Banner: "LEVEL UP YOUR PLAY" matching Stitch */}
        <LinearGradient
          colors={['#EEF2FF', '#ECFEFF', '#F8FAFC']}
          style={styles.heroSection}
        >
          {/* Live Badge Pill */}
          <View style={styles.liveBadgePill}>
            <Animated.View
              style={[styles.liveDotPulse, { transform: [{ scale: pulseAnim }] }]}
            />
            <Text style={styles.liveBadgeText}>SEASON 4 NOW LIVE</Text>
          </View>

          {/* Hero Typography */}
          <Text style={styles.heroHeadline}>LEVEL UP YOUR PLAY</Text>
          <Text style={styles.heroDescription}>
            Your favorite games, all in one place. Jump straight into competitive arenas or casual matches in seconds.
          </Text>

          {/* Primary Action Buttons */}
          <View style={styles.heroActionRow}>
            <TouchableOpacity
              activeOpacity={0.88}
              style={styles.exploreButton}
              onPress={() => handleOpenGameModal('ludo')}
            >
              <Text style={styles.exploreButtonText}>Explore Games</Text>
              <ArrowRight size={18} color="#FFFFFF" />
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.8}
              style={styles.soundButton}
              onPress={() => setSoundEnabled(!soundEnabled)}
            >
              {soundEnabled ? (
                <Volume2 size={20} color="#4F46E5" />
              ) : (
                <VolumeX size={20} color="#64748B" />
              )}
            </TouchableOpacity>
          </View>
        </LinearGradient>

        {/* Quick Telemetry Stats Ribbon matching Stitch */}
        <View style={styles.telemetryCard}>
          <View style={styles.telemetryItem}>
            <View style={styles.telemetryIconRow}>
              <Users size={16} color="#0891B2" />
              <Text style={styles.telemetryNumber}>2.4M</Text>
            </View>
            <Text style={styles.telemetryLabel}>Active Players</Text>
          </View>

          <View style={styles.telemetryDivider} />

          <View style={styles.telemetryItem}>
            <View style={styles.telemetryIconRow}>
              <Zap size={16} color="#4F46E5" />
              <Text style={styles.telemetryNumber}>99.9%</Text>
            </View>
            <Text style={styles.telemetryLabel}>Uptime SLA</Text>
          </View>

          <View style={styles.telemetryDivider} />

          <View style={styles.telemetryItem}>
            <View style={styles.telemetryIconRow}>
              <Gauge size={16} color="#4F46E5" />
              <Text style={styles.telemetryNumber}>&lt;2s</Text>
            </View>
            <Text style={styles.telemetryLabel}>Matchmaking</Text>
          </View>
        </View>

        {/* Daily Rewards & Live Tournament Bento matching Stitch */}
        <View style={styles.bentoSection}>
          {/* Live Tournament Banner */}
          <LinearGradient
            colors={['#FFFFFF', '#EEF2FF', '#ECFEFF']}
            style={styles.tournamentCard}
          >
            <View style={styles.tournamentHeader}>
              <View style={styles.firePill}>
                <Flame size={13} color="#D97706" />
                <Text style={styles.firePillText}>TOURNAMENT ENDS IN 04:12:49</Text>
              </View>
              <Text style={styles.tournamentRound}>Round 3/5</Text>
            </View>

            <View style={styles.tournamentBottomRow}>
              <View>
                <Text style={styles.tournamentSubtitle}>Grand Arena Championship</Text>
                <View style={styles.prizeRow}>
                  <Trophy size={18} color="#D97706" />
                  <Text style={styles.prizeAmount}>100,000</Text>
                  <Text style={styles.prizeUnit}>G-Coins</Text>
                </View>
              </View>

              <TouchableOpacity
                activeOpacity={0.85}
                style={styles.joinFreeBtn}
                onPress={() => handleOpenGameModal('chess')}
              >
                <Text style={styles.joinFreeBtnText}>Join Free</Text>
              </TouchableOpacity>
            </View>
          </LinearGradient>

          {/* Daily Chest Tile */}
          <View style={styles.dailyRewardCard}>
            <View style={styles.dailyRewardLeft}>
              <View style={styles.chestIconBox}>
                <Gift size={24} color="#4F46E5" />
              </View>
              <View>
                <View style={styles.chestTitleRow}>
                  <Text style={styles.chestTitle}>Daily Chest</Text>
                  <View style={styles.readyTag}>
                    <Text style={styles.readyTagText}>READY</Text>
                  </View>
                </View>
                <Text style={styles.chestSubtitle}>Day 6 Streak • +750 G-Coins inside</Text>
              </View>
            </View>

            <TouchableOpacity
              activeOpacity={0.85}
              style={[styles.claimBtn, claimedDaily && styles.claimedBtn]}
              onPress={() => setClaimedDaily(true)}
              disabled={claimedDaily}
            >
              <Text style={[styles.claimBtnText, claimedDaily && styles.claimedBtnText]}>
                {claimedDaily ? 'Claimed ✓' : 'Claim'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Featured Classics Section matching Stitch */}
        <View style={styles.classicsSection}>
          <View style={styles.classicsHeader}>
            <View>
              <Text style={styles.classicsTitle}>Featured Classics</Text>
              <Text style={styles.classicsSubtitle}>Instant queue multiplayer battlegrounds</Text>
            </View>
          </View>

          {/* Game Cards Stack */}
          <View style={styles.gamesStack}>
            {FEATURED_GAMES.map((item) => (
              <View key={item.id} style={styles.gameCard}>
                {/* Game Banner Image */}
                <View style={styles.gameImageWrap}>
                  <Image source={{ uri: item.image }} style={styles.gameImage} />
                  <LinearGradient
                    colors={['transparent', 'rgba(15, 23, 42, 0.7)']}
                    style={styles.imageGradientOverlay}
                  />

                  {/* Top Tags */}
                  <View style={styles.tagLeft}>
                    {item.tagType === 'trending' ? (
                      <Flame size={13} color="#EF4444" />
                    ) : item.tagType === 'ranked' ? (
                      <Trophy size={13} color="#0891B2" />
                    ) : (
                      <Sparkles size={13} color="#D97706" />
                    )}
                    <Text style={styles.tagLeftText}>{item.tag}</Text>
                  </View>

                  <View style={styles.tagRight}>
                    <Text style={styles.tagRightText}>{item.playersTag}</Text>
                  </View>
                </View>

                {/* Game Info */}
                <View style={styles.gameInfoRow}>
                  <Text style={styles.gameCardTitle}>{item.title}</Text>
                  <Text style={styles.gameCardDescription}>{item.subtitle}</Text>
                </View>

                {/* Footer Bar: Online Count & Quick Play */}
                <View style={styles.gameCardFooter}>
                  <View style={styles.onlineStatusRow}>
                    <View style={styles.onlineDot} />
                    <Text style={styles.onlineCountText}>{item.playerCount}</Text>
                  </View>

                  <TouchableOpacity
                    activeOpacity={0.85}
                    style={styles.quickPlayBtn}
                    onPress={() => handleOpenGameModal(item.id)}
                  >
                    <Play size={16} color="#FFFFFF" fill="#FFFFFF" />
                    <Text style={styles.quickPlayText}>Quick Play</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>

      {/* Mode Picker Modal with GameZone Light Styling */}
      <Modal
        visible={modeModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setModeModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>
                  {activeGameId === 'ludo'
                    ? 'Ludo Kingpin'
                    : activeGameId === 'chess'
                    ? 'Chess Grandmaster'
                    : 'Bingo Blitz Royale'}
                </Text>
                <Text style={styles.modalSubtitle}>Choose how you want to play</Text>
              </View>
              <TouchableOpacity
                onPress={() => setModeModalVisible(false)}
                style={styles.modalCloseBtn}
              >
                <X size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            {/* Mode Option 1: Solo vs AI Practice */}
            <TouchableOpacity
              activeOpacity={0.85}
              style={styles.modeOption}
              onPress={() => handlePlaySolo('medium', 3)}
            >
              <View style={[styles.modeIconBox, { backgroundColor: '#EEF2FF' }]}>
                <Cpu size={22} color="#4F46E5" />
              </View>
              <View style={styles.modeTextCol}>
                <Text style={styles.modeOptionTitle}>Solo Practice (Computer)</Text>
                <Text style={styles.modeOptionDesc}>Sub-200ms smart AI with adjustable difficulty</Text>
              </View>
            </TouchableOpacity>

            {/* Mode Option 2: Public Matchmaking */}
            <TouchableOpacity
              activeOpacity={0.85}
              style={styles.modeOption}
              onPress={handlePublicMatchmaking}
            >
              <View style={[styles.modeIconBox, { backgroundColor: '#ECFEFF' }]}>
                <Globe size={22} color="#0891B2" />
              </View>
              <View style={styles.modeTextCol}>
                <Text style={styles.modeOptionTitle}>Public Matchmaking (Find Rival)</Text>
                <Text style={styles.modeOptionDesc}>Live search radar matching you with active players</Text>
              </View>
            </TouchableOpacity>

            {/* Mode Option 3: Create Private Room */}
            <TouchableOpacity
              activeOpacity={0.85}
              style={styles.modeOption}
              onPress={handleCreateOnlineRoom}
            >
              <View style={[styles.modeIconBox, { backgroundColor: '#FEF3C7' }]}>
                <Crown size={22} color="#D97706" />
              </View>
              <View style={styles.modeTextCol}>
                <Text style={styles.modeOptionTitle}>Create Private Room</Text>
                <Text style={styles.modeOptionDesc}>Get a 6-character room code to invite friends</Text>
              </View>
            </TouchableOpacity>

            {/* Mode Option 4: Join by Room Code */}
            <TouchableOpacity
              activeOpacity={0.85}
              style={styles.modeOption}
              onPress={handleJoinOnlineRoom}
            >
              <View style={[styles.modeIconBox, { backgroundColor: '#F1F5F9' }]}>
                <Users size={22} color="#0F172A" />
              </View>
              <View style={styles.modeTextCol}>
                <Text style={styles.modeOptionTitle}>Join with Room Code</Text>
                <Text style={styles.modeOptionDesc}>Enter an invitation passcode to join a match</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <BottomNavBar />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  container: {
    paddingBottom: 20,
  },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  brandGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  brandIconBox: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#4F46E5',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#4F46E5',
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  brandTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#4F46E5',
    letterSpacing: -0.4,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  currencyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFEFF',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#A5F3FC',
    gap: 5,
  },
  coinDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#0891B2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  coinSymbol: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '900',
  },
  currencyAmount: {
    fontSize: 12,
    fontWeight: '900',
    color: '#0F172A',
  },
  currencyUnit: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0891B2',
  },
  avatarButton: {
    padding: 2,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: 'rgba(79, 70, 229, 0.4)',
  },
  avatarImg: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#CBD5E1',
  },
  heroSection: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 28,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  liveBadgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#BAE6FD',
    gap: 6,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 2,
  },
  liveDotPulse: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#06B6D4',
  },
  liveBadgeText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#0891B2',
    letterSpacing: 0.6,
  },
  heroHeadline: {
    fontSize: 28,
    fontWeight: '900',
    color: '#0F172A',
    letterSpacing: -0.5,
    lineHeight: 34,
  },
  heroDescription: {
    fontSize: 13,
    color: '#64748B',
    lineHeight: 19,
    marginTop: 6,
    maxWidth: '92%',
  },
  heroActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 18,
  },
  exploreButton: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#4F46E5',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.28,
    shadowRadius: 8,
    elevation: 4,
  },
  exploreButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  soundButton: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  telemetryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: -16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingVertical: 12,
    paddingHorizontal: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 3,
  },
  telemetryItem: {
    flex: 1,
    alignItems: 'center',
  },
  telemetryIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  telemetryNumber: {
    fontSize: 15,
    fontWeight: '900',
    color: '#0F172A',
  },
  telemetryLabel: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 2,
    fontWeight: '600',
  },
  telemetryDivider: {
    width: 1,
    height: 28,
    backgroundColor: '#F1F5F9',
  },
  bentoSection: {
    paddingHorizontal: 16,
    marginTop: 16,
    gap: 12,
  },
  tournamentCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 14,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  tournamentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  firePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    gap: 4,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  firePillText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#B45309',
    letterSpacing: 0.5,
  },
  tournamentRound: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
  },
  tournamentBottomRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  tournamentSubtitle: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
  },
  prizeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 2,
  },
  prizeAmount: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0F172A',
  },
  prizeUnit: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0891B2',
  },
  joinFreeBtn: {
    backgroundColor: '#0891B2',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
    shadowColor: '#0891B2',
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  joinFreeBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  dailyRewardCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 14,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  dailyRewardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  chestIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#EEF2FF',
    borderWidth: 1,
    borderColor: '#E0E7FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chestTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  chestTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  readyTag: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  readyTagText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#059669',
  },
  chestSubtitle: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  claimBtn: {
    backgroundColor: '#4F46E5',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
    shadowColor: '#4F46E5',
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  claimedBtn: {
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    shadowOpacity: 0,
    elevation: 0,
  },
  claimBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  claimedBtnText: {
    color: '#059669',
  },
  classicsSection: {
    paddingHorizontal: 16,
    marginTop: 20,
    gap: 12,
  },
  classicsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  classicsTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#0F172A',
    letterSpacing: -0.3,
  },
  classicsSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 1,
  },
  gamesStack: {
    gap: 14,
  },
  gameCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
    gap: 10,
  },
  gameImageWrap: {
    width: '100%',
    height: 160,
    borderRadius: 14,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#E2E8F0',
  },
  gameImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  imageGradientOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 80,
  },
  tagLeft: {
    position: 'absolute',
    top: 10,
    left: 10,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
    gap: 4,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  tagLeftText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#0F172A',
    textTransform: 'uppercase',
  },
  tagRight: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  tagRightText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#0891B2',
  },
  gameInfoRow: {
    gap: 2,
  },
  gameCardTitle: {
    fontSize: 17,
    fontWeight: '900',
    color: '#0F172A',
  },
  gameCardDescription: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 17,
  },
  gameCardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  onlineStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  onlineDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#06B6D4',
  },
  onlineCountText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  quickPlayBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4F46E5',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
    gap: 5,
    shadowColor: '#4F46E5',
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  quickPlayText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    gap: 12,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0F172A',
  },
  modalSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  modalCloseBtn: {
    padding: 4,
  },
  modeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 12,
  },
  modeIconBox: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modeTextCol: {
    flex: 1,
  },
  modeOptionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  modeOptionDesc: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
});
