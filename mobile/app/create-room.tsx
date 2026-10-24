import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Share,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import {
  PlusCircle,
  KeyRound,
  Users,
  Timer,
  Shield,
  Copy,
  Share2,
  Check,
  CheckCircle2,
  Trophy,
  Sparkles,
  LogIn,
  SlidersHorizontal,
} from 'lucide-react-native';
import Svg, { Path } from 'react-native-svg';

import { GameHeader } from '../components/GameHeader';
import { PlayerCard } from '../components/PlayerCard';
import { useRoom } from '../hooks/useRoom';
import { useGameStore } from '../store/gameStore';
import { usePlayerStore } from '../store/playerStore';
import { GameType } from '../../shared/types';

interface GameOption {
  id: GameType;
  title: string;
  badge: string;
  badgeColor: string;
  badgeTextColor: string;
  desc: string;
  capacityText: string;
  paceText: string;
  maxPlayers: number;
}

const GAME_OPTIONS: GameOption[] = [
  {
    id: 'ludo',
    title: 'Ludo Kingpin',
    badge: 'POPULAR',
    badgeColor: '#EEF2FF',
    badgeTextColor: '#4F46E5',
    desc: '2-4 Players • Classic & Rush Battle',
    capacityText: '4 Max',
    paceText: '45s / Turn',
    maxPlayers: 4,
  },
  {
    id: 'chess',
    title: 'Chess Grandmaster',
    badge: 'RANKED',
    badgeColor: '#ECFEFF',
    badgeTextColor: '#0891B2',
    desc: '1v1 Tactical • Blitz, Rapid, Classical',
    capacityText: '1v1 Duel',
    paceText: '5+0 Blitz',
    maxPlayers: 2,
  },
  {
    id: 'bingo',
    title: 'Super Bingo Royale',
    badge: 'PARTY',
    badgeColor: '#FEF3C7',
    badgeTextColor: '#D97706',
    desc: 'Party Multi • 75 & 90 Ball Live Draws',
    capacityText: 'Up to 4',
    paceText: 'Instant Draw',
    maxPlayers: 4,
  },
];

const STAKE_OPTIONS = [
  { amount: '0', label: 'Free', sub: 'Casual' },
  { amount: '100', label: '100 GC', sub: 'Standard' },
  { amount: '500', label: '500 GC', sub: 'Popular' },
  { amount: '2500', label: '2.5k GC', sub: 'High Roller' },
  { amount: '10000', label: '10,000 GC', sub: 'Grand Arena' },
];

export default function CreateRoomScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ gameType?: string; tab?: string }>();
  const { createRoom, joinRoom, leaveRoom, roomCode, players } = useRoom();
  const selectedGame = useGameStore((s) => s.selectedGame);
  const setSelectedGame = useGameStore((s) => s.setSelectedGame);
  const playerId = usePlayerStore((s) => s.playerId);

  const [activeTab, setActiveTab] = useState<'create' | 'join'>(
    params.tab === 'join' ? 'join' : 'create'
  );
  const [activeGame, setActiveGame] = useState<GameType>(
    (params.gameType as GameType) || selectedGame || 'ludo'
  );
  const [selectedStake, setSelectedStake] = useState('500');
  const [isPrivate, setIsPrivate] = useState(true);
  const [joinCodeInput, setJoinCodeInput] = useState('');
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [joinLoading, setJoinLoading] = useState(false);
  const [, setError] = useState<string | null>(null);
  const [joinError, setJoinError] = useState<string | null>(null);

  // Initialize or re-create room when active game changes in create tab
  useEffect(() => {
    let isMounted = true;
    const initRoom = async () => {
      if (activeTab !== 'create') return;
      try {
        setLoading(true);
        setError(null);
        setSelectedGame(activeGame);
        const maxPlayers = activeGame === 'chess' ? 2 : 4;
        const res = await createRoom(activeGame, maxPlayers);
        if (!isMounted) return;
        if (!res.success) {
          setError(res.error || 'Failed to initialize room');
        }
      } catch (err: any) {
        if (isMounted) setError(err.message || 'Error creating room');
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    initRoom();
    return () => {
      isMounted = false;
    };
  }, [activeGame, activeTab]);

  // Navigate when opponent joins or enough players arrive
  useEffect(() => {
    const playerCount = Object.keys(players).length;
    if (playerCount >= 2) {
      if (activeGame === 'bingo') {
        router.replace('/board-setup');
      } else {
        router.replace('/lobby');
      }
    }
  }, [players, router, activeGame]);

  const handleCopyCode = () => {
    if (!roomCode) return;
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShareLink = async () => {
    if (!roomCode) return;
    try {
      await Share.share({
        message: `Join my GameZone match in ${activeGame.toUpperCase()}! Use Room Code: ${roomCode}`,
      });
    } catch {
      handleCopyCode();
    }
  };

  const handleAttemptJoin = async (codeToUse?: string) => {
    const code = (codeToUse || joinCodeInput).trim().toUpperCase();
    if (code.length < 4) {
      setJoinError('Please enter a valid room code');
      return;
    }

    try {
      setJoinLoading(true);
      setJoinError(null);
      const res = await joinRoom(code);
      if (res.success) {
        const targetGame = res.gameType || activeGame;
        if (targetGame === 'bingo') {
          router.replace('/board-setup');
        } else {
          router.replace('/lobby');
        }
      } else {
        setJoinError(res.error || 'Unable to join room. Check code.');
      }
    } catch (err: any) {
      setJoinError(err.message || 'Error joining room');
    } finally {
      setJoinLoading(false);
    }
  };

  const handleCancel = async () => {
    await leaveRoom();
    router.replace('/home');
  };

  const myPlayer = players[playerId];
  const opponent = Object.values(players).find((p) => p.id !== playerId);
  const activeOption = GAME_OPTIONS.find((g) => g.id === activeGame) || GAME_OPTIONS[0];

  return (
    <SafeAreaView style={styles.safeArea}>
      <GameHeader
        title="Multiplayer Hub"
        subtitle="Create or Join Room"
        onBackPress={handleCancel}
      />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Intro Tagline */}
        <View style={styles.introHeader}>
          <View style={styles.hubBadge}>
            <Sparkles size={14} color="#4F46E5" />
            <Text style={styles.hubBadgeText}>MULTIPLAYER HUB</Text>
          </View>
          <Text style={styles.introTitle}>Create or Join Room</Text>
          <Text style={styles.introDesc}>
            Host private showdowns with friends or join with a room code.
          </Text>
        </View>

        {/* Segmented Switcher / Tabs */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'create' && styles.tabButtonActive]}
            onPress={() => setActiveTab('create')}
            activeOpacity={0.8}
          >
            <PlusCircle
              size={18}
              color={activeTab === 'create' ? '#4F46E5' : '#64748B'}
            />
            <Text
              style={[
                styles.tabButtonText,
                activeTab === 'create' && styles.tabButtonTextActive,
              ]}
            >
              Create Room
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'join' && styles.tabButtonActive]}
            onPress={() => setActiveTab('join')}
            activeOpacity={0.8}
          >
            <KeyRound
              size={18}
              color={activeTab === 'join' ? '#4F46E5' : '#64748B'}
            />
            <Text
              style={[
                styles.tabButtonText,
                activeTab === 'join' && styles.tabButtonTextActive,
              ]}
            >
              Join with Code
            </Text>
          </TouchableOpacity>
        </View>

        {activeTab === 'create' ? (
          /* ================= TAB 1: CREATE ROOM ================= */
          <View style={styles.sectionGap}>
            {/* 1. Select Game Discipline */}
            <View>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.stepTitle}>1. SELECT GAME DISCIPLINE</Text>
                <Text style={styles.stepSub}>3 Games Active</Text>
              </View>

              <View style={styles.gameCardsGrid}>
                {GAME_OPTIONS.map((opt) => {
                  const isSelected = activeGame === opt.id;
                  return (
                    <TouchableOpacity
                      key={opt.id}
                      style={[styles.gameCard, isSelected && styles.gameCardSelected]}
                      onPress={() => setActiveGame(opt.id)}
                      activeOpacity={0.85}
                    >
                      <View style={styles.gameCardIconBox}>
                        {opt.id === 'ludo' ? (
                          <Trophy size={22} color="#0891B2" />
                        ) : opt.id === 'chess' ? (
                          <Users size={22} color="#4F46E5" />
                        ) : (
                          <Sparkles size={22} color="#D97706" />
                        )}
                      </View>

                      <View style={styles.gameCardInfo}>
                        <View style={styles.gameCardTitleRow}>
                          <Text style={styles.gameCardTitle}>{opt.title}</Text>
                          <View
                            style={[
                              styles.gameCardPill,
                              { backgroundColor: opt.badgeColor },
                            ]}
                          >
                            <Text
                              style={[
                                styles.gameCardPillText,
                                { color: opt.badgeTextColor },
                              ]}
                            >
                              {opt.badge}
                            </Text>
                          </View>
                        </View>
                        <Text style={styles.gameCardDesc}>{opt.desc}</Text>
                        <View style={styles.gameCardMetaRow}>
                          <View style={styles.metaItem}>
                            <Users size={12} color="#0891B2" />
                            <Text style={styles.metaText}>{opt.capacityText}</Text>
                          </View>
                          <Text style={styles.metaDot}>•</Text>
                          <View style={styles.metaItem}>
                            <Timer size={12} color="#D97706" />
                            <Text style={styles.metaText}>{opt.paceText}</Text>
                          </View>
                        </View>
                      </View>

                      <View
                        style={[
                          styles.checkIndicator,
                          isSelected && styles.checkIndicatorActive,
                        ]}
                      >
                        {isSelected && <Check size={14} color="#FFFFFF" />}
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Generated Room Code Hero Container */}
            <LinearGradient
              colors={['#4F46E5', '#4338CA', '#3730A3']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.heroCodeBox}
            >
              <View style={styles.heroTopRow}>
                <View style={styles.heroTopLeft}>
                  <Shield size={16} color="#C7D2FE" />
                  <Text style={styles.heroLabel}>YOUR GENERATED ROOM CODE</Text>
                </View>
                <View style={styles.readyBadgePill}>
                  <Text style={styles.readyBadgePillText}>INSTANT READY</Text>
                </View>
              </View>

              <View style={styles.codeDisplayPlate}>
                <View style={styles.codeTextGroup}>
                  {loading ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.codeTextDisplay}>
                      {roomCode || 'GZ-8842'}
                    </Text>
                  )}
                  <Text style={styles.codeSubInfo}>
                    Valid for 30 mins • Max {activeOption.maxPlayers} Players
                  </Text>
                </View>

                {/* Mini Scan / Code Vector */}
                <View style={styles.qrPlate}>
                  <Svg width={24} height={24} viewBox="0 0 24 24" fill="#0F172A">
                    <Path d="M2 2h8v8H2V2zm2 2v4h4V4H4zm10-2h8v8h-8V2zm2 2v4h4V4h-4zM2 14h8v8H2v-8zm2 2v4h4v-4H4zm14-2h4v2h-4v-2zm-4 0h2v4h-2v-4zm2 4h4v4h-4v-4zm-4 2h2v2h-2v-2zm8-2h2v4h-2v-4zM6 6h0v0h0V6zm12 0h0v0h0V6zm-12 12h0v0h0v0z" />
                  </Svg>
                  <Text style={styles.qrPlateLabel}>CODE</Text>
                </View>
              </View>

              {/* Action Row */}
              <View style={styles.codeActionRow}>
                <TouchableOpacity
                  style={styles.whiteActionBtn}
                  onPress={handleCopyCode}
                  activeOpacity={0.8}
                >
                  <Copy size={16} color="#4F46E5" />
                  <Text style={styles.whiteActionBtnText}>
                    {copied ? 'Copied! ✓' : 'Copy Code'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.glassActionBtn}
                  onPress={handleShareLink}
                  activeOpacity={0.8}
                >
                  <Share2 size={16} color="#FFFFFF" />
                  <Text style={styles.glassActionBtnText}>Share Link</Text>
                </TouchableOpacity>
              </View>
            </LinearGradient>

            {/* 2. Room Rules & Stakes */}
            <View style={styles.rulesCard}>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.stepTitle}>2. ROOM RULES & STAKES</Text>
                <SlidersHorizontal size={16} color="#64748B" />
              </View>

              {/* Privacy Toggle */}
              <View style={styles.privacyTile}>
                <View style={styles.privacyLeft}>
                  <View style={styles.shieldIconBox}>
                    <Shield size={18} color="#4F46E5" />
                  </View>
                  <View>
                    <Text style={styles.privacyTitle}>Private Room</Text>
                    <Text style={styles.privacyDesc}>
                      Only players with room code can enter
                    </Text>
                  </View>
                </View>
                <TouchableOpacity
                  style={[styles.toggleTrack, isPrivate && styles.toggleTrackActive]}
                  onPress={() => setIsPrivate(!isPrivate)}
                  activeOpacity={0.8}
                >
                  <View
                    style={[styles.toggleThumb, isPrivate && styles.toggleThumbActive]}
                  />
                </TouchableOpacity>
              </View>

              {/* Entry Stake Selector */}
              <View>
                <View style={styles.stakeHeaderRow}>
                  <Text style={styles.stakeLabel}>Entry Stake per Player</Text>
                  <Text style={styles.stakeSubText}>Winner takes 90%</Text>
                </View>

                <View style={styles.stakeGrid}>
                  {STAKE_OPTIONS.map((stk) => {
                    const isStkSelected = selectedStake === stk.amount;
                    return (
                      <TouchableOpacity
                        key={stk.amount}
                        style={[
                          styles.stakePill,
                          isStkSelected && styles.stakePillSelected,
                        ]}
                        onPress={() => setSelectedStake(stk.amount)}
                        activeOpacity={0.8}
                      >
                        <Text
                          style={[
                            styles.stakePillText,
                            isStkSelected && styles.stakePillTextSelected,
                          ]}
                        >
                          {stk.label}
                        </Text>
                        <Text
                          style={[
                            styles.stakePillSub,
                            isStkSelected && styles.stakePillSubSelected,
                          ]}
                        >
                          {stk.sub}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Match Parameters */}
              <View style={styles.paramRow}>
                <View style={styles.paramBox}>
                  <Text style={styles.paramLabel}>LOBBY CAPACITY</Text>
                  <View style={styles.paramValueRow}>
                    <Text style={styles.paramValue}>
                      {activeOption.maxPlayers} Players
                    </Text>
                    <Users size={16} color="#4F46E5" />
                  </View>
                </View>

                <View style={styles.paramBox}>
                  <Text style={styles.paramLabel}>CLOCK / PACE</Text>
                  <View style={styles.paramValueRow}>
                    <Text style={styles.paramValue}>{activeOption.paceText}</Text>
                    <Timer size={16} color="#0891B2" />
                  </View>
                </View>
              </View>

              {/* Players Joined Status */}
              <View style={styles.playersJoinedBox}>
                <View style={styles.sectionHeaderRow}>
                  <Text style={styles.stepTitle}>
                    PLAYERS IN ROOM ({Object.keys(players).length}/
                    {activeOption.maxPlayers})
                  </Text>
                </View>
                <PlayerCard player={myPlayer} isHost={true} />
                <PlayerCard
                  player={opponent}
                  emptyPlaceholderText="Waiting for friends to join..."
                />
              </View>
            </View>

            {/* Launch / Waiting CTA Button */}
            <View style={styles.bottomCtaGroup}>
              <TouchableOpacity
                style={styles.launchBtn}
                onPress={() => {
                  if (activeGame === 'bingo') {
                    router.replace('/board-setup');
                  } else {
                    router.replace('/lobby');
                  }
                }}
                activeOpacity={0.88}
              >
                <View style={styles.launchBtnLeft}>
                  <CheckCircle2 size={20} color="#FFFFFF" />
                  <Text style={styles.launchBtnText}>Launch Private Lobby</Text>
                </View>
                <View style={styles.launchCodePill}>
                  <Text style={styles.launchCodePillText}>
                    Code: {roomCode || 'GZ-8842'}
                  </Text>
                </View>
              </TouchableOpacity>

              <Text style={styles.shareHintText}>
                Friends can enter code{' '}
                <Text style={styles.shareHintBold}>{roomCode || 'GZ-8842'}</Text> to join your match.
              </Text>
            </View>
          </View>
        ) : (
          /* ================= TAB 2: JOIN WITH CODE ================= */
          <View style={styles.sectionGap}>
            <View style={styles.joinCard}>
              <View style={styles.joinHeader}>
                <View style={styles.keyIconBox}>
                  <KeyRound size={26} color="#0891B2" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.joinTitle}>Enter Room Passcode</Text>
                  <Text style={styles.joinDesc}>
                    Ask your host for the 6-character room code
                  </Text>
                </View>
              </View>

              {/* Code Input */}
              <View style={styles.inputWrapper}>
                <Text style={styles.inputLabel}>ROOM CODE</Text>
                <View style={styles.inputContainer}>
                  <TextInput
                    style={styles.codeInput}
                    value={joinCodeInput}
                    onChangeText={(t) => {
                      setJoinCodeInput(t.toUpperCase());
                      setJoinError(null);
                    }}
                    placeholder="e.g. 7K2M9X"
                    placeholderTextColor="#94A3B8"
                    maxLength={7}
                    autoCapitalize="characters"
                    autoCorrect={false}
                  />
                  <TouchableOpacity
                    style={styles.pasteBtn}
                    onPress={() => setJoinCodeInput('GZ-8842')}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.pasteBtnText}>DEMO</Text>
                  </TouchableOpacity>
                </View>
                {joinError && <Text style={styles.joinErrorText}>{joinError}</Text>}
              </View>

              {/* Quick Recent Matches */}
              <View style={styles.recentSection}>
                <Text style={styles.recentHeader}>Recent Private Matches</Text>

                <TouchableOpacity
                  style={styles.recentItem}
                  onPress={() => handleAttemptJoin('GZ-4419')}
                  activeOpacity={0.75}
                >
                  <View style={styles.recentLeft}>
                    <View style={styles.recentIconBox}>
                      <Text style={styles.recentIconText}>LD</Text>
                    </View>
                    <View>
                      <Text style={styles.recentTitle}>Ludo Kingpin with @Alex</Text>
                      <Text style={styles.recentSub}>Played 2h ago • 500 GC</Text>
                    </View>
                  </View>
                  <Text style={styles.recentCode}>GZ-4419</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.recentItem}
                  onPress={() => handleAttemptJoin('GZ-9021')}
                  activeOpacity={0.75}
                >
                  <View style={styles.recentLeft}>
                    <View style={[styles.recentIconBox, { backgroundColor: '#ECFEFF' }]}>
                      <Text style={[styles.recentIconText, { color: '#0891B2' }]}>CH</Text>
                    </View>
                    <View>
                      <Text style={styles.recentTitle}>Chess Blitz Duel</Text>
                      <Text style={styles.recentSub}>Played Yesterday • Free</Text>
                    </View>
                  </View>
                  <Text style={styles.recentCode}>GZ-9021</Text>
                </TouchableOpacity>
              </View>

              {/* CTA Join Button */}
              <TouchableOpacity
                style={styles.joinActionBtn}
                onPress={() => handleAttemptJoin()}
                disabled={joinLoading}
                activeOpacity={0.85}
              >
                {joinLoading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <LogIn size={20} color="#FFFFFF" />
                    <Text style={styles.joinActionBtnText}>Enter Room Lobby</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  introHeader: {
    paddingVertical: 12,
  },
  hubBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  hubBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#4F46E5',
    letterSpacing: 1.2,
  },
  introTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.5,
  },
  introDesc: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 4,
    lineHeight: 18,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#EAEDFF',
    borderRadius: 14,
    padding: 4,
    marginVertical: 12,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  tabButtonActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  tabButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  tabButtonTextActive: {
    color: '#4F46E5',
    fontWeight: '700',
  },
  sectionGap: {
    gap: 16,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  stepTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: 1,
    flex: 1,
  },
  stepSub: {
    fontSize: 11,
    fontWeight: '700',
    color: '#4F46E5',
  },
  gameCardsGrid: {
    gap: 10,
  },
  gameCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    padding: 12,
    gap: 12,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  gameCardSelected: {
    borderColor: '#4F46E5',
    backgroundColor: '#F5F7FF',
  },
  gameCardIconBox: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  gameCardInfo: {
    flex: 1,
    minWidth: 0,
  },
  gameCardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  gameCardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  gameCardPill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  gameCardPillText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  gameCardDesc: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  gameCardMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
  },
  metaDot: {
    color: '#94A3B8',
    fontSize: 10,
  },
  checkIndicator: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkIndicatorActive: {
    backgroundColor: '#4F46E5',
    borderColor: '#4F46E5',
  },
  heroCodeBox: {
    borderRadius: 20,
    padding: 16,
    gap: 12,
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 4,
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  heroTopLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  heroLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#E0E7FF',
    letterSpacing: 1,
  },
  readyBadgePill: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  readyBadgePillText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  codeDisplayPlate: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(0, 0, 0, 0.15)',
    borderRadius: 14,
    padding: 12,
  },
  codeTextGroup: {
    flex: 1,
  },
  codeTextDisplay: {
    fontSize: 26,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 3,
    fontFamily: 'monospace',
  },
  codeSubInfo: {
    fontSize: 10,
    color: '#C7D2FE',
    marginTop: 2,
  },
  qrPlate: {
    width: 48,
    height: 48,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 4,
  },
  qrPlateLabel: {
    fontSize: 7,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 2,
  },
  codeActionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  whiteActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  whiteActionBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#4F46E5',
  },
  glassActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  glassActionBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  rulesCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 14,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  privacyTile: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 12,
  },
  privacyLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  shieldIconBox: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  privacyTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  privacyDesc: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  toggleTrack: {
    width: 44,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#CBD5E1',
    padding: 2,
    justifyContent: 'center',
  },
  toggleTrackActive: {
    backgroundColor: '#4F46E5',
  },
  toggleThumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
  },
  toggleThumbActive: {
    alignSelf: 'flex-end',
  },
  stakeHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  stakeLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0F172A',
  },
  stakeSubText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#D97706',
  },
  stakeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  stakePill: {
    flex: 1,
    minWidth: '28%',
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
  },
  stakePillSelected: {
    backgroundColor: '#4F46E5',
  },
  stakePillText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
  },
  stakePillTextSelected: {
    color: '#FFFFFF',
  },
  stakePillSub: {
    fontSize: 9,
    color: '#64748B',
    marginTop: 1,
  },
  stakePillSubSelected: {
    color: '#E0E7FF',
  },
  paramRow: {
    flexDirection: 'row',
    gap: 10,
  },
  paramBox: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 10,
  },
  paramLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.8,
  },
  paramValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  paramValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  playersJoinedBox: {
    marginTop: 4,
  },
  bottomCtaGroup: {
    gap: 8,
    marginTop: 4,
  },
  launchBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#4F46E5',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  launchBtnLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  launchBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  launchCodePill: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  launchCodePillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
    fontFamily: 'monospace',
  },
  shareHintText: {
    textAlign: 'center',
    fontSize: 11,
    color: '#64748B',
  },
  shareHintBold: {
    color: '#0F172A',
    fontWeight: '700',
    fontFamily: 'monospace',
  },
  joinCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 16,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  joinHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  keyIconBox: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#ECFEFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  joinTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
  },
  joinDesc: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  inputWrapper: {
    gap: 6,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: 1,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    paddingHorizontal: 12,
  },
  codeInput: {
    flex: 1,
    height: 50,
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    fontFamily: 'monospace',
    letterSpacing: 3,
  },
  pasteBtn: {
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  pasteBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#4F46E5',
  },
  joinErrorText: {
    fontSize: 11,
    color: '#EF4444',
    fontWeight: '600',
    marginTop: 2,
  },
  recentSection: {
    gap: 8,
  },
  recentHeader: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  recentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  recentLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  recentIconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  recentIconText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#4F46E5',
  },
  recentTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
  },
  recentSub: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 1,
  },
  recentCode: {
    fontSize: 12,
    fontWeight: '800',
    color: '#4F46E5',
    fontFamily: 'monospace',
  },
  joinActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4F46E5',
    paddingVertical: 14,
    borderRadius: 14,
    gap: 8,
    marginTop: 4,
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  joinActionBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});