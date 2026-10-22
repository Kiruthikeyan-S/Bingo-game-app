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
  LogIn,
  Settings as SettingsIcon,
  X,
  Cpu,
  Globe,
  Users,
  Crown,
  Dices,
  Grid,
  Sun,
  Moon,
  Coins,
  Swords,
  Shield,
} from 'lucide-react-native';
import { usePlayerStore } from '../store/playerStore';
import { useGameStore } from '../store/gameStore';
import { useSocket } from '../hooks/useSocket';
import { GameButton } from '../components/GameButton';
import { BottomNavBar } from '../components/BottomNavBar';
import { BotDifficulty, GameType } from '../../shared/types';

interface GameCardMeta {
  id: GameType;
  title: string;
  subtitle: string;
  badge: string;
  playersTag: string;
  description: string;
  gradient: [string, string, string];
  accentColor: string;
  previewTokens: string[];
  colorDots?: string[];
}

const GAME_CARDS: GameCardMeta[] = [
  {
    id: 'bingo',
    title: 'BINGO BATTLE',
    subtitle: '5x5 Tactical Grid',
    badge: 'CLASSIC & PVP',
    playersTag: '1-4 Players',
    description:
      'Arrange secret numbers 1 to 25, call numbers in real-time, and complete 5 B-I-N-G-O lines before your opponent.',
    gradient: ['#3b0764', '#311078', '#1e1b4b'],
    accentColor: '#00e5ff',
    previewTokens: ['B', 'I', 'N', 'G', 'O'],
  },
  {
    id: 'chess',
    title: 'ROYAL CHESS',
    subtitle: 'Grandmaster 8x8 Board',
    badge: 'FIDE RULES',
    playersTag: '1-2 Players',
    description:
      'Standard FIDE rules with castling, en passant, pawn promotion, move history, and solo practice or live 1v1 rooms.',
    gradient: ['#064e3b', '#065f46', '#0f172a'],
    accentColor: '#00ff87',
    previewTokens: ['K', 'Q', 'R', 'B', 'N'],
  },
  {
    id: 'ludo',
    title: 'CLASSIC LUDO',
    subtitle: '4-Color Dice Board',
    badge: '2-4 PLAYERS',
    playersTag: '1-4 Players',
    description:
      'Roll a 6 to deploy tokens, capture opponent pieces, protect star safe squares, and race all 4 tokens home.',
    gradient: ['#7c2d12', '#9a3412', '#1e1b4b'],
    accentColor: '#ffd700',
    previewTokens: ['R', 'G', 'Y', 'B'],
    colorDots: ['#ef4444', '#10b981', '#f59e0b', '#3b82f6'],
  },
];

export default function HomeScreen() {
  const router = useRouter();
  useSocket();

  const playerId = usePlayerStore((s) => s.playerId);
  const username = usePlayerStore((s) => s.username);
  const avatarUrl = usePlayerStore((s) => s.avatarUrl);
  const coins = usePlayerStore((s) => s.coins);
  const stats = usePlayerStore((s) => s.stats);
  const theme = usePlayerStore((s) => s.theme);
  const toggleTheme = usePlayerStore((s) => s.toggleTheme);
  const hydrateFromStorage = usePlayerStore((s) => s.hydrateFromStorage);

  const isConnected = useGameStore((s) => s.isConnected);
  const selectedGame = useGameStore((s) => s.selectedGame);
  const botDifficulty = useGameStore((s) => s.botDifficulty);
  const ludoBotCount = useGameStore((s) => s.ludoBotCount);
  const setSelectedGame = useGameStore((s) => s.setSelectedGame);
  const setGameMode = useGameStore((s) => s.setGameMode);
  const setBotDifficulty = useGameStore((s) => s.setBotDifficulty);
  const setLudoBotCount = useGameStore((s) => s.setLudoBotCount);
  const startBotBingoMatch = useGameStore((s) => s.startBotBingoMatch);

  const [modeModalVisible, setModeModalVisible] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    hydrateFromStorage();
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 380,
      useNativeDriver: true,
    }).start();
  }, []);

  const isLight = theme === 'light';

  const handleSelectGameCard = (game: GameType) => {
    setSelectedGame(game);
    setModeModalVisible(true);
  };

  const handleStartBotGame = () => {
    setModeModalVisible(false);
    setGameMode('bot');

    if (selectedGame === 'bingo') {
      startBotBingoMatch(playerId, username, avatarUrl);
      router.push('/board-setup');
    } else if (selectedGame === 'chess') {
      router.push('/games/chess');
    } else if (selectedGame === 'ludo') {
      router.push('/games/ludo');
    }
  };

  const handleCreateOnlineRoom = () => {
    setModeModalVisible(false);
    setGameMode('online');
    router.push('/create-room');
  };

  const handlePublicMatchmaking = () => {
    setModeModalVisible(false);
    setGameMode('online');
    router.push('/matchmaking');
  };

  const handleJoinOnlineRoom = () => {
    setModeModalVisible(false);
    setGameMode('online');
    router.push('/join-room');
  };

  const handleInviteFriends = () => {
    setModeModalVisible(false);
    setGameMode('online');
    router.push('/friends');
  };

  const activeGameMeta =
    GAME_CARDS.find((g) => g.id === selectedGame) || GAME_CARDS[0];

  const renderGameIcon = (id: GameType, color: string) => {
    if (id === 'bingo') return <Grid size={13} color={color} />;
    if (id === 'chess') return <Crown size={13} color={color} />;
    return <Dices size={13} color={color} />;
  };

  return (
    <SafeAreaView style={[styles.safeArea, isLight && styles.safeAreaLight]}>
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        {/* Top Bar: App Logo/Name, Profile, Coins, Theme & Settings */}
        <View style={styles.topBar}>
          <TouchableOpacity
            activeOpacity={0.85}
            style={[styles.profileBadge, isLight && styles.cardLight]}
            onPress={() => router.push('/profile')}
          >
            <View style={styles.avatarRing}>
              <Image source={{ uri: avatarUrl }} style={styles.profileAvatar} />
              <View style={styles.levelPill}>
                <Text style={styles.levelPillText}>PRO</Text>
              </View>
            </View>
            <View style={styles.profileTextCol}>
              <View style={styles.greetingRow}>
                <Shield size={11} color="#00e5ff" />
                <Text style={styles.greeting}>GAME HUB</Text>
              </View>
              <Text
                style={[styles.playerName, isLight && styles.textDark]}
                numberOfLines={1}
              >
                {username}
              </Text>
            </View>
          </TouchableOpacity>

          <View style={styles.topRightActions}>
            <View style={styles.coinsPill}>
              <Coins size={15} color="#ffd700" />
              <Text style={styles.coinsText}>{coins}</Text>
            </View>

            <TouchableOpacity
              activeOpacity={0.8}
              style={[styles.iconCircle, isLight && styles.cardLight]}
              onPress={toggleTheme}
            >
              {isLight ? (
                <Moon size={18} color="#334155" />
              ) : (
                <Sun size={18} color="#ffd700" />
              )}
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.8}
              style={[styles.iconCircle, isLight && styles.cardLight]}
              onPress={() => router.push('/settings')}
            >
              <SettingsIcon size={18} color={isLight ? '#334155' : '#cbd5e1'} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Player Quick Summary Strip */}
        <View style={[styles.statsBanner, isLight && styles.cardLight]}>
          <View style={styles.statCell}>
            <Text style={styles.statValue}>{stats.played}</Text>
            <Text style={styles.statLabel}>MATCHES</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statCell}>
            <Text style={[styles.statValue, { color: '#00ff87' }]}>{stats.wins}</Text>
            <Text style={styles.statLabel}>VICTORIES</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statCell}>
            <Text style={[styles.statValue, { color: '#00e5ff' }]}>
              {stats.played > 0
                ? `${Math.round((stats.wins / stats.played) * 100)}%`
                : '0%'}
            </Text>
            <Text style={styles.statLabel}>WIN RATE</Text>
          </View>
          <View style={styles.statDivider} />
          <TouchableOpacity
            style={styles.statCell}
            onPress={() => router.push('/settings')}
          >
            <View style={styles.onlineRow}>
              <View
                style={[
                  styles.netDot,
                  { backgroundColor: isConnected ? '#10b981' : '#f59e0b' },
                ]}
              />
              <Text
                style={[
                  styles.statValue,
                  {
                    fontSize: 13,
                    color: isConnected ? '#10b981' : '#f59e0b',
                  },
                ]}
              >
                {isConnected ? 'ONLINE' : 'LOCAL'}
              </Text>
            </View>
            <Text style={styles.statLabel}>SERVER</Text>
          </TouchableOpacity>
        </View>

        {/* Section Header */}
        <View style={styles.sectionHeaderRow}>
          <View style={styles.sectionTitleLeft}>
            <Swords size={16} color="#00e5ff" />
            <Text style={[styles.sectionTitle, isLight && styles.textDark]}>
              SELECT A GAME
            </Text>
          </View>
          <TouchableOpacity
            style={styles.quickJoinPill}
            onPress={() => router.push('/join-room')}
          >
            <LogIn size={13} color="#00e5ff" />
            <Text style={styles.quickJoinText}>Join with Code</Text>
          </TouchableOpacity>
        </View>

        {/* Three Game Cards: 1. Bingo, 2. Chess, 3. Ludo */}
        <Animated.View style={{ opacity: fadeAnim, gap: 14 }}>
          {GAME_CARDS.map((game) => (
            <TouchableOpacity
              key={game.id}
              activeOpacity={0.88}
              onPress={() => handleSelectGameCard(game.id)}
              style={styles.gameCardTouchable}
            >
              <LinearGradient
                colors={game.gradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[
                  styles.gameCard,
                  { borderColor: `${game.accentColor}66` },
                ]}
              >
                <View style={styles.cardTopRow}>
                  <View
                    style={[
                      styles.cardBadge,
                      {
                        backgroundColor: `${game.accentColor}20`,
                        borderColor: `${game.accentColor}55`,
                      },
                    ]}
                  >
                    {renderGameIcon(game.id, game.accentColor)}
                    <Text
                      style={[styles.cardBadgeText, { color: game.accentColor }]}
                    >
                      {game.badge}
                    </Text>
                  </View>

                  <View style={styles.playersPill}>
                    <Users size={11} color="#e2e8f0" />
                    <Text style={styles.playersPillText}>{game.playersTag}</Text>
                  </View>
                </View>

                <View style={styles.cardMainRow}>
                  <View style={styles.cardInfoCol}>
                    <Text style={styles.gameCardTitle}>{game.title}</Text>
                    <Text
                      style={[
                        styles.gameCardSubtitle,
                        { color: game.accentColor },
                      ]}
                    >
                      {game.subtitle}
                    </Text>
                    <Text style={styles.gameCardDesc}>{game.description}</Text>
                  </View>
                </View>

                {/* Preview Orbs + Play CTA Row */}
                <View style={styles.cardFooterRow}>
                  <View style={styles.previewTokensRow}>
                    {game.previewTokens.map((tok, i) => (
                      <View
                        key={i}
                        style={[
                          styles.previewOrb,
                          {
                            borderColor: game.colorDots
                              ? game.colorDots[i]
                              : `${game.accentColor}55`,
                          },
                        ]}
                      >
                        {game.colorDots ? (
                          <View
                            style={{
                              width: 14,
                              height: 14,
                              borderRadius: 7,
                              backgroundColor: game.colorDots[i],
                            }}
                          />
                        ) : (
                          <Text style={styles.previewOrbText}>{tok}</Text>
                        )}
                      </View>
                    ))}
                  </View>

                  <View
                    style={[
                      styles.playBtnPill,
                      { backgroundColor: game.accentColor },
                    ]}
                  >
                    <Play size={14} color="#050816" fill="#050816" />
                    <Text style={styles.playBtnPillText}>PLAY</Text>
                  </View>
                </View>
              </LinearGradient>
            </TouchableOpacity>
          ))}
        </Animated.View>
      </ScrollView>

      {/* Bottom Navigation Bar */}
      <BottomNavBar />

      {/* Game Selection Modal (Single Player / Play Online / Difficulty) */}
      <Modal
        visible={modeModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModeModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, isLight && styles.cardLight]}>
            <View style={styles.modalHeader}>
              <View>
                <Text
                  style={[
                    styles.modalGameTag,
                    { color: activeGameMeta.accentColor },
                  ]}
                >
                  {activeGameMeta.subtitle.toUpperCase()}
                </Text>
                <Text style={[styles.modalTitle, isLight && styles.textDark]}>
                  {activeGameMeta.title}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.modalCloseBtn}
                onPress={() => setModeModalVisible(false)}
              >
                <X size={20} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* 1. SINGLE PLAYER SECTION */}
              <View style={styles.modeSectionCard}>
                <View style={styles.modeHeaderRow}>
                  <View style={styles.modeIconBadge}>
                    <Cpu size={20} color="#00ff87" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.modeTitle}>Single Player</Text>
                    <Text style={styles.modeSubtitle}>
                      Instant offline match, no internet required
                    </Text>
                  </View>
                </View>

                <Text style={styles.selectorLabel}>DIFFICULTY LEVEL</Text>
                <View style={styles.difficultyRow}>
                  {(['easy', 'medium', 'hard'] as BotDifficulty[]).map((diff) => {
                    const active = botDifficulty === diff;
                    return (
                      <TouchableOpacity
                        key={diff}
                        activeOpacity={0.8}
                        onPress={() => setBotDifficulty(diff)}
                        style={[
                          styles.diffPill,
                          active && styles.diffPillActive,
                        ]}
                      >
                        <Text
                          style={[
                            styles.diffPillText,
                            active && styles.diffPillTextActive,
                          ]}
                        >
                          {diff.toUpperCase()}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {selectedGame === 'ludo' && (
                  <>
                    <Text style={[styles.selectorLabel, { marginTop: 10 }]}>
                      OPPONENT COUNT
                    </Text>
                    <View style={styles.difficultyRow}>
                      {([1, 2, 3] as Array<1 | 2 | 3>).map((cnt) => {
                        const active = ludoBotCount === cnt;
                        return (
                          <TouchableOpacity
                            key={cnt}
                            activeOpacity={0.8}
                            onPress={() => setLudoBotCount(cnt)}
                            style={[
                              styles.diffPill,
                              active && styles.diffPillActive,
                            ]}
                          >
                            <Text
                              style={[
                                styles.diffPillText,
                                active && styles.diffPillTextActive,
                              ]}
                            >
                              1 VS {cnt}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </>
                )}

                <GameButton
                  title={`Play Single Player (${
                    botDifficulty.charAt(0).toUpperCase() + botDifficulty.slice(1)
                  })`}
                  variant="success"
                  onPress={handleStartBotGame}
                  icon={<Play size={18} color="#ffffff" />}
                  style={{ marginTop: 12 }}
                />
              </View>

              {/* 2. PLAY ONLINE MULTIPLAYER SECTION */}
              <View style={[styles.modeSectionCard, styles.onlineSectionCard]}>
                <View style={styles.modeHeaderRow}>
                  <View
                    style={[
                      styles.modeIconBadge,
                      { backgroundColor: 'rgba(0, 229, 255, 0.14)' },
                    ]}
                  >
                    <Globe size={20} color="#00e5ff" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.modeTitle}>Online Multiplayer</Text>
                    <Text style={styles.modeSubtitle}>
                      Real-time rooms with private 6-character codes
                    </Text>
                  </View>
                </View>

                <GameButton
                  title="Public Matchmaking (Find Rival)"
                  variant="outline"
                  onPress={handlePublicMatchmaking}
                  icon={<Swords size={18} color="#00ff87" />}
                  style={{ marginBottom: 10 }}
                />

                <GameButton
                  title="Create Private Room"
                  variant="primary"
                  onPress={handleCreateOnlineRoom}
                  icon={<Crown size={18} color="#ffffff" />}
                />

                <View style={styles.onlineSubRow}>
                  <GameButton
                    title="Join with Code"
                    variant="outline"
                    onPress={handleJoinOnlineRoom}
                    icon={<LogIn size={16} color="#00e5ff" />}
                    style={{ flex: 1 }}
                  />
                  <GameButton
                    title="Invite Friends"
                    variant="outline"
                    onPress={handleInviteFriends}
                    icon={<Users size={16} color="#a5b4fc" />}
                    style={{ flex: 1 }}
                  />
                </View>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#050816',
  },
  safeAreaLight: {
    backgroundColor: '#f1f5f9',
  },
  container: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 24,
  },
  cardLight: {
    backgroundColor: '#ffffff',
    borderColor: '#cbd5e1',
  },
  textDark: {
    color: '#0f172a',
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  profileBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0f1636',
    paddingVertical: 6,
    paddingLeft: 8,
    paddingRight: 14,
    borderRadius: 26,
    borderWidth: 1.5,
    borderColor: '#1e2b5e',
    gap: 10,
    flexShrink: 1,
  },
  avatarRing: {
    position: 'relative',
  },
  profileAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#00e5ff',
  },
  levelPill: {
    position: 'absolute',
    bottom: -3,
    right: -4,
    backgroundColor: '#ffd700',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#050816',
  },
  levelPillText: {
    fontSize: 7,
    fontWeight: '900',
    color: '#050816',
  },
  profileTextCol: {
    justifyContent: 'center',
  },
  greetingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  greeting: {
    fontSize: 8,
    fontWeight: '900',
    color: '#00e5ff',
    letterSpacing: 1,
  },
  playerName: {
    fontSize: 15,
    fontWeight: '900',
    color: '#f8fafc',
  },
  topRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  coinsPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#0f1636',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 215, 0, 0.35)',
  },
  coinsText: {
    fontSize: 13,
    fontWeight: '900',
    color: '#ffd700',
  },
  iconCircle: {
    width: 38,
    height: 38,
    borderRadius: 14,
    backgroundColor: '#0f1636',
    borderWidth: 1.5,
    borderColor: '#1e2b5e',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statsBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#0f1636',
    borderRadius: 18,
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderWidth: 1.5,
    borderColor: '#1e2b5e',
    marginBottom: 14,
  },
  statCell: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 16,
    fontWeight: '900',
    color: '#f8fafc',
  },
  statLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#94a3b8',
    letterSpacing: 0.8,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 24,
    backgroundColor: '#1e2b5e',
  },
  onlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  netDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionTitleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '900',
    color: '#e2e8f0',
    letterSpacing: 1.4,
  },
  quickJoinPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(0, 229, 255, 0.12)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(0, 229, 255, 0.35)',
  },
  quickJoinText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#00e5ff',
  },
  gameCardTouchable: {
    borderRadius: 24,
  },
  gameCard: {
    borderRadius: 24,
    padding: 18,
    borderWidth: 1.5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 6,
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  cardBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
  },
  cardBadgeText: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1,
  },
  playersPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  playersPillText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#e2e8f0',
  },
  cardMainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  cardInfoCol: {
    flex: 1,
  },
  gameCardTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#ffffff',
    letterSpacing: 1,
  },
  gameCardSubtitle: {
    fontSize: 12,
    fontWeight: '800',
    marginTop: 2,
    marginBottom: 6,
  },
  gameCardDesc: {
    fontSize: 12,
    color: '#cbd5e1',
    lineHeight: 17,
  },
  cardFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
    paddingTop: 12,
  },
  previewTokensRow: {
    flexDirection: 'row',
    gap: 6,
  },
  previewOrb: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: 'rgba(5, 8, 22, 0.65)',
    borderWidth: 1.2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewOrbText: {
    fontSize: 13,
    fontWeight: '900',
    color: '#ffffff',
  },
  playBtnPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 14,
  },
  playBtnPillText: {
    fontSize: 13,
    fontWeight: '900',
    color: '#050816',
    letterSpacing: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(3, 6, 18, 0.85)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#0b102b',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 20,
    maxHeight: '88%',
    borderTopWidth: 1.5,
    borderColor: '#253470',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalGameTag: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.4,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#f8fafc',
  },
  modalCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#151e46',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modeSectionCard: {
    backgroundColor: '#111942',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(0, 255, 135, 0.3)',
    marginBottom: 14,
  },
  onlineSectionCard: {
    borderColor: 'rgba(0, 229, 255, 0.35)',
  },
  modeHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 14,
  },
  modeIconBadge: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(0, 255, 135, 0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modeTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#f8fafc',
  },
  modeSubtitle: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 2,
  },
  selectorLabel: {
    fontSize: 10,
    fontWeight: '900',
    color: '#a5b4fc',
    letterSpacing: 1.2,
    marginBottom: 8,
  },
  difficultyRow: {
    flexDirection: 'row',
    gap: 8,
  },
  diffPill: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#0b102b',
    borderWidth: 1.5,
    borderColor: '#253470',
    alignItems: 'center',
  },
  diffPillActive: {
    backgroundColor: 'rgba(0, 255, 135, 0.18)',
    borderColor: '#00ff87',
  },
  diffPillText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#94a3b8',
  },
  diffPillTextActive: {
    color: '#00ff87',
    fontWeight: '900',
  },
  onlineSubRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 6,
  },
});
