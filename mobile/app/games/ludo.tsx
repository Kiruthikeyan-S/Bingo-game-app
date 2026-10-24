import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  Alert,
  ActivityIndicator,
  Animated,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import {
  Shield,
  Trophy,
  Star,
  RotateCcw,
  LogOut,
  Dices,
  History,
} from 'lucide-react-native';
import Svg, { Circle, Path, Rect, Defs, RadialGradient, Stop, Ellipse, Polygon } from 'react-native-svg';

import { GameHeader } from '../../components/GameHeader';
import { useGameStore } from '../../store/gameStore';
import { usePlayerStore } from '../../store/playerStore';
import {
  LudoEngine,
  SAFE_GLOBAL_SQUARES,
  HOME_STEP,
  LAST_MAIN_TRACK_STEP,
} from '../../engines/ludo/rules';
import { LudoBot } from '../../engines/ludo/bot';
import { socketService } from '../../services/socket';
import { multiplayerService } from '../../services/multiplayerService';
import {
  LudoColor,
  LudoState,
  LudoToken,
  PlayerScoreSummary,
} from '../../../shared/types';

const { width } = Dimensions.get('window');
const BOARD_OUTER = Math.min(width - 32, 380);
const CELL = Math.floor(BOARD_OUTER / 15);
const EXACT_BOARD_SIZE = CELL * 15;

const COLOR_HEX: Record<LudoColor, string> = {
  red: '#EF4444',
  green: '#10B981',
  yellow: '#F59E0B',
  blue: '#3B82F6',
};

const COLOR_BG: Record<LudoColor, string> = {
  red: '#FFF1F2',
  green: '#ECFDF5',
  yellow: '#FFFBEB',
  blue: '#EFF6FF',
};

const COLOR_BORDER: Record<LudoColor, string> = {
  red: '#F43F5E',
  green: '#10B981',
  yellow: '#F59E0B',
  blue: '#3B82F6',
};

// Perimeter tracks clockwise: Red (TL) -> Green (TR) -> Yellow (BR) -> Blue (BL)
const GLOBAL_TRACK_COORDS: Array<[number, number]> = [
  // Red (0..12) starting at [6, 1]
  [6, 1], [6, 2], [6, 3], [6, 4], [6, 5],
  [5, 6], [4, 6], [3, 6], [2, 6], [1, 6], [0, 6],
  [0, 7], [0, 8],
  // Green (13..25) starting at [1, 8]
  [1, 8], [2, 8], [3, 8], [4, 8], [5, 8],
  [6, 9], [6, 10], [6, 11], [6, 12], [6, 13], [6, 14],
  [7, 14], [8, 14],
  // Yellow (26..38) starting at [8, 13]
  [8, 13], [8, 12], [8, 11], [8, 10], [8, 9],
  [9, 8], [10, 8], [11, 8], [12, 8], [13, 8], [14, 8],
  [14, 7], [14, 6],
  // Blue (39..51) starting at [13, 6]
  [13, 6], [12, 6], [11, 6], [10, 6], [9, 6],
  [8, 5], [8, 4], [8, 3], [8, 2], [8, 1], [8, 0],
  [7, 0], [6, 0],
];

const HOME_STRETCH_COORDS: Record<LudoColor, Array<[number, number]>> = {
  red: [[7, 1], [7, 2], [7, 3], [7, 4], [7, 5]],
  green: [[1, 7], [2, 7], [3, 7], [4, 7], [5, 7]],
  yellow: [[7, 13], [7, 12], [7, 11], [7, 10], [7, 9]],
  blue: [[13, 7], [12, 7], [11, 7], [10, 7], [9, 7]],
};

const HOME_FINISH_COORD: Record<LudoColor, [number, number]> = {
  red: [7, 6],
  green: [6, 7],
  yellow: [7, 8],
  blue: [8, 7],
};

const YARD_SLOT_COORDS: Record<LudoColor, Array<[number, number]>> = {
  red: [[1, 1], [1, 4], [4, 1], [4, 4]],
  green: [[1, 10], [1, 13], [4, 10], [4, 13]],
  yellow: [[10, 10], [10, 13], [13, 10], [13, 13]],
  blue: [[10, 1], [10, 4], [13, 1], [13, 4]],
};

function getTokenBoardRC(token: LudoToken): [number, number] {
  if (token.step === -1) {
    return YARD_SLOT_COORDS[token.color][token.id];
  }
  if (token.step === HOME_STEP) {
    return HOME_FINISH_COORD[token.color];
  }
  if (token.step > LAST_MAIN_TRACK_STEP) {
    const idx = token.step - 51;
    return HOME_STRETCH_COORDS[token.color][idx] || HOME_FINISH_COORD[token.color];
  }
  const globalSq = LudoEngine.getGlobalSquare(token.color, token.step) ?? 0;
  return GLOBAL_TRACK_COORDS[globalSq] || [7, 7];
}

/**
 * High-fidelity 3D Glossy Pawn Token Renderer matching Stitch Modern Light
 */
const GlossyPawn: React.FC<{
  color: LudoColor;
  size?: number;
  isMovable?: boolean;
}> = ({ color, size = CELL * 0.94, isMovable = false }) => {
  const hex = COLOR_HEX[color];
  return (
    <View style={[styles.pawnContainer, { width: size, height: size }]}>
      <Svg width={size} height={size} viewBox="0 0 32 32">
        <Defs>
          <RadialGradient id={`gloss-${color}`} cx="32%" cy="28%" r="65%">
            <Stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.9" />
            <Stop offset="45%" stopColor={hex} stopOpacity="1" />
            <Stop offset="100%" stopColor="#0B132B" stopOpacity="0.75" />
          </RadialGradient>
        </Defs>
        <Ellipse cx="16" cy="28" rx="9" ry="3.2" fill="rgba(0,0,0,0.25)" />
        <Path d="M8 26 C8 22 11 21 13 19 L19 19 C21 21 24 22 24 26 C24 27.5 8 27.5 8 26 Z" fill={`url(#gloss-${color})`} />
        <Rect x="12" y="17.5" width="8" height="2.5" rx="1.2" fill="#FFFFFF" opacity={0.7} />
        <Circle cx="16" cy="10.5" r="7.2" fill={`url(#gloss-${color})`} />
        <Circle cx="13.5" cy="8" r="2.2" fill="#FFFFFF" opacity={0.85} />
      </Svg>
      {isMovable && <View style={styles.pawnMovablePulse} />}
    </View>
  );
};

/**
 * 3D White Clean Dice Block matching Stitch Modern Light
 */
const WhiteDiceWithPips: React.FC<{
  value: number | null;
  active: boolean;
  onPress: () => void;
  loading?: boolean;
}> = ({ value, active, onPress, loading }) => {
  const val = value ?? 5;
  const renderPips = (num: number) => {
    switch (num) {
      case 1:
        return <View style={styles.diceCenterDot} />;
      case 2:
        return (
          <View style={styles.diceBetweenDots}>
            <View style={styles.dot} />
            <View style={[styles.dot, { alignSelf: 'flex-end' }]} />
          </View>
        );
      case 3:
        return (
          <View style={styles.diceBetweenDots}>
            <View style={styles.dot} />
            <View style={styles.diceCenterDotSelf} />
            <View style={[styles.dot, { alignSelf: 'flex-end' }]} />
          </View>
        );
      case 4:
        return (
          <View style={styles.diceGridDots}>
            <View style={styles.dotsRow}><View style={styles.dot} /><View style={styles.dot} /></View>
            <View style={styles.dotsRow}><View style={styles.dot} /><View style={styles.dot} /></View>
          </View>
        );
      case 5:
        return (
          <View style={styles.diceGridDots}>
            <View style={styles.dotsRow}><View style={styles.dot} /><View style={styles.dot} /></View>
            <View style={styles.diceCenterDotOverlay} />
            <View style={styles.dotsRow}><View style={styles.dot} /><View style={styles.dot} /></View>
          </View>
        );
      case 6:
      default:
        return (
          <View style={styles.diceGridDots}>
            <View style={styles.dotsRow}><View style={styles.dot} /><View style={styles.dot} /></View>
            <View style={styles.dotsRow}><View style={styles.dot} /><View style={styles.dot} /></View>
            <View style={styles.dotsRow}><View style={styles.dot} /><View style={styles.dot} /></View>
          </View>
        );
    }
  };

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      disabled={!active || loading}
      onPress={onPress}
      style={[styles.diceContainer, active && styles.diceContainerGlow]}
    >
      {loading ? (
        <ActivityIndicator size="small" color="#4F46E5" />
      ) : (
        renderPips(val)
      )}
    </TouchableOpacity>
  );
};

export default function LudoScreen() {
  const router = useRouter();
  const playerId = usePlayerStore((s) => s.playerId);
  const username = usePlayerStore((s) => s.username);
  const hapticsEnabled = usePlayerStore((s) => s.hapticsEnabled);
  const recordMatchResult = usePlayerStore((s) => s.recordMatchResult);

  const gameMode = useGameStore((s) => s.gameMode);
  const botDifficulty = useGameStore((s) => s.botDifficulty);
  const ludoBotCount = useGameStore((s) => s.ludoBotCount);
  const onlineLudoState = useGameStore((s) => s.ludoState);
  const setGameFinished = useGameStore((s) => s.setGameFinished);

  const isBotMode = gameMode === 'bot';

  const [localLudoState, setLocalLudoState] = useState<LudoState>(() => {
    const botIds = Array.from({ length: ludoBotCount }, (_, i) => `cpu_ludo_${i + 1}`);
    return LudoEngine.createInitialState([playerId, ...botIds]);
  });

  const [botProcessing, setBotProcessing] = useState(false);
  const [turnSeconds, setTurnSeconds] = useState(15);
  const diceSpinAnim = useRef(new Animated.Value(1)).current;

  const activeState = isBotMode
    ? localLudoState
    : onlineLudoState || localLudoState;

  const botRef = useRef(new LudoBot(botDifficulty));
  useEffect(() => {
    botRef.current.changeDifficulty(botDifficulty);
  }, [botDifficulty]);

  // Turn timer countdown simulation
  useEffect(() => {
    const timer = setInterval(() => {
      setTurnSeconds((prev) => (prev <= 1 ? 15 : prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [activeState.currentTurnColor]);

  const myColor: LudoColor = useMemo(() => {
    const found = activeState.activeColors.find(
      (c) => activeState.colorPlayerMap[c] === playerId
    );
    return found || 'red';
  }, [activeState, playerId]);

  const isMyTurn = activeState.currentTurnColor === myColor;

  const legalMovesForCurrentTurn = useMemo(() => {
    if (activeState.canRollDice || !activeState.diceValue) return [];
    return LudoEngine.getLegalMoves(
      activeState,
      activeState.currentTurnColor,
      activeState.diceValue
    );
  }, [activeState]);

  const animateDice = () => {
    diceSpinAnim.setValue(0.75);
    Animated.spring(diceSpinAnim, {
      toValue: 1,
      friction: 4,
      tension: 120,
      useNativeDriver: true,
    }).start();
  };

  const finalizeBotLudoMatch = (
    finishedState: LudoState,
    winnerColor: LudoColor
  ) => {
    const winnerPlayerId = finishedState.colorPlayerMap[winnerColor];
    const summary: PlayerScoreSummary[] = finishedState.activeColors.map((col) => {
      const pId = finishedState.colorPlayerMap[col];
      const homeCount = finishedState.tokens[col].filter(
        (t) => t.step === HOME_STEP
      ).length;
      const isMe = pId === playerId;
      return {
        playerId: pId,
        username: isMe ? username : `${col.toUpperCase()} Bot`,
        linesCompleted: homeCount,
        isWinner: col === winnerColor,
        isDraw: false,
        gameType: 'ludo',
        detailText: `${homeCount}/4 Tokens Home`,
      };
    });

    setGameFinished(winnerPlayerId, 'win', {}, summary);
    recordMatchResult({
      gameType: 'ludo',
      mode: 'bot',
      difficulty: botDifficulty,
      opponentName: `${ludoBotCount} Opponents`,
      result: winnerColor === myColor ? 'win' : 'loss',
      resultReason: `${winnerColor.toUpperCase()} reached home first`,
      movesCount: 28,
    });
    router.push('/results');
  };

  // Sub-200ms Fast Computer turns in Solo mode
  useEffect(() => {
    if (!isBotMode) return;
    const currentTurnPlayer =
      localLudoState.colorPlayerMap[localLudoState.currentTurnColor];
    if (
      !currentTurnPlayer ||
      currentTurnPlayer === playerId ||
      localLudoState.winnerOrder.length > 0
    ) {
      return;
    }

    let cancelled = false;
    setBotProcessing(true);

    const runBotTurn = async () => {
      await new Promise((r) => setTimeout(r, 180));
      if (cancelled) return;

      if (localLudoState.canRollDice) {
        animateDice();
        const rollOut = LudoEngine.applyDiceRoll(localLudoState);
        setLocalLudoState(rollOut.state);
        if (rollOut.autoTurnPassed) {
          setBotProcessing(false);
        }
        return;
      }

      const chosen = botRef.current.selectBotMove(localLudoState, botDifficulty);
      if (!chosen) {
        setBotProcessing(false);
        return;
      }

      const moveRes = LudoEngine.applyTokenMove(localLudoState, chosen.tokenId);
      setBotProcessing(false);
      if (moveRes.success && moveRes.state) {
        setLocalLudoState(moveRes.state);
        if (moveRes.isGameOver && moveRes.winnerColor) {
          finalizeBotLudoMatch(moveRes.state, moveRes.winnerColor);
        }
      }
    };

    runBotTurn();

    return () => {
      cancelled = true;
    };
  }, [isBotMode, localLudoState, playerId, botDifficulty]);

  const handleRollDice = async () => {
    if (!isMyTurn || !activeState.canRollDice || botProcessing) return;

    animateDice();
    if (hapticsEnabled) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    }

    if (isBotMode) {
      const rollOut = LudoEngine.applyDiceRoll(localLudoState);
      setLocalLudoState(rollOut.state);
    } else {
      const store = useGameStore.getState();
      if (store.roomCode) {
        const res = await multiplayerService.rollLudoDice(store.roomCode, playerId);
        if (!res.success) {
          Alert.alert('Roll Error', res.error || 'Could not roll dice');
        }
      } else {
        const res = await socketService.ludoRollDice();
        if (!res.success) {
          Alert.alert('Roll Error', res.error || 'Could not roll dice');
        }
      }
    }
  };

  const handleTokenPress = async (token: LudoToken) => {
    if (!isMyTurn || activeState.canRollDice || token.color !== myColor) return;

    const isLegal = legalMovesForCurrentTurn.some((m) => m.tokenId === token.id);
    if (!isLegal) return;

    if (hapticsEnabled) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }

    if (isBotMode) {
      const res = LudoEngine.applyTokenMove(localLudoState, token.id);
      if (res.success && res.state) {
        setLocalLudoState(res.state);
        if (res.isGameOver && res.winnerColor) {
          finalizeBotLudoMatch(res.state, res.winnerColor);
        }
      }
    } else {
      const store = useGameStore.getState();
      if (store.roomCode) {
        const res = await multiplayerService.moveLudoToken(store.roomCode, playerId, token.id);
        if (!res.success) {
          Alert.alert('Move Error', res.error || 'Illegal token move');
        }
      } else {
        const res = await socketService.ludoMoveToken(token.id);
        if (!res.success) {
          Alert.alert('Move Error', res.error || 'Illegal token move');
        }
      }
    }
  };

  const handleLeave = () => {
    Alert.alert('Leave Ludo Arena?', 'Are you sure you want to exit this match?', [
      { text: 'Stay', style: 'cancel' },
      {
        text: 'Leave',
        style: 'destructive',
        onPress: async () => {
          if (!isBotMode) {
            await socketService.leaveRoom();
          }
          router.replace('/home');
        },
      },
    ]);
  };

  const tokensByCoord = useMemo(() => {
    const map = new Map<string, LudoToken[]>();
    for (const col of activeState.activeColors) {
      for (const tok of activeState.tokens[col] || []) {
        const [r, c] = getTokenBoardRC(tok);
        const key = `${r},${c}`;
        const list = map.get(key) || [];
        list.push(tok);
        map.set(key, list);
      }
    }
    return map;
  }, [activeState]);

  const getCellBg = (r: number, c: number) => {
    // Quadrant yards
    if (r < 6 && c < 6) return COLOR_BG.red;
    if (r < 6 && c >= 9) return COLOR_BG.green;
    if (r >= 9 && c < 6) return COLOR_BG.blue;
    if (r >= 9 && c >= 9) return COLOR_BG.yellow;

    // Home stretch colored tracks
    if (r === 7 && c >= 1 && c <= 5) return COLOR_HEX.red;
    if (c === 7 && r >= 1 && r <= 5) return COLOR_HEX.green;
    if (r === 7 && c >= 9 && c <= 13) return COLOR_HEX.yellow;
    if (c === 7 && r >= 9 && r <= 13) return COLOR_HEX.blue;

    // Track entry start squares
    if (r === 6 && c === 1) return '#FFE4E6';
    if (r === 1 && c === 8) return '#D1FAE5';
    if (r === 8 && c === 13) return '#FEF3C7';
    if (r === 13 && c === 6) return '#DBEAFE';

    return '#FFFFFF';
  };

  const isStarSafeCell = (r: number, c: number) => {
    const idx = GLOBAL_TRACK_COORDS.findIndex(([gr, gc]) => gr === r && gc === c);
    return idx !== -1 && SAFE_GLOBAL_SQUARES.has(idx);
  };

  // Helper to render Stitch Light Player Card Deck
  const renderStitchPlayerCard = (
    col: LudoColor,
    defaultName: string,
    avatarUri: string,
    slotNumber: string
  ) => {
    const pId = activeState.colorPlayerMap[col];
    const isMe = pId === playerId;
    const isTurn = activeState.currentTurnColor === col;
    const displayName = isMe ? (username || 'You') : defaultName;
    const yardTokens = (activeState.tokens[col] || []).filter((t) => t.step === -1).length;
    const pathTokens = (activeState.tokens[col] || []).filter(
      (t) => t.step >= 0 && t.step < HOME_STEP
    ).length;

    return (
      <View
        style={[
          styles.playerCardDeck,
          isTurn && {
            borderColor: COLOR_HEX[col],
            backgroundColor: COLOR_BG[col],
          },
        ]}
      >
        <View style={styles.cardAvatarWrapper}>
          <Image source={{ uri: avatarUri }} style={styles.cardAvatar} />
          <View
            style={[
              styles.cardOnlineDot,
              { backgroundColor: COLOR_HEX[col] },
            ]}
          />
        </View>

        <View style={styles.cardInfoCol}>
          <View style={styles.cardTitleRow}>
            <Text style={styles.cardNameText} numberOfLines={1}>
              {displayName}
            </Text>
            {isTurn ? (
              <View
                style={[
                  styles.nowBadge,
                  { backgroundColor: COLOR_HEX[col] },
                ]}
              >
                <Text style={styles.nowBadgeText}>NOW</Text>
              </View>
            ) : (
              <Text
                style={[
                  styles.slotBadgeText,
                  { color: COLOR_HEX[col] },
                ]}
              >
                {slotNumber}
              </Text>
            )}
          </View>
          <Text style={styles.cardSubCountText}>
            {col.toUpperCase()} · Yard: {yardTokens} · Path: {pathTokens}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <GameHeader
        title="Ludo Kingpin"
        subtitle="15x15 Light Arena"
        onBackPress={handleLeave}
      />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Match Status HUD Header matching Stitch */}
        <View style={styles.hudHeader}>
          <View style={styles.hudLeft}>
            {/* SVG Countdown Ring */}
            <View style={styles.ringWrapper}>
              <Svg width={44} height={44} style={{ transform: [{ rotate: '-90deg' }] }}>
                <Circle
                  cx="22"
                  cy="22"
                  r="18"
                  stroke="#E2E8F0"
                  strokeWidth="3.5"
                  fill="transparent"
                />
                <Circle
                  cx="22"
                  cy="22"
                  r="18"
                  stroke={COLOR_HEX[activeState.currentTurnColor]}
                  strokeWidth="3.5"
                  strokeDasharray="113"
                  strokeDashoffset={113 - (113 * turnSeconds) / 15}
                  strokeLinecap="round"
                  fill="transparent"
                />
              </Svg>
              <Text
                style={[
                  styles.ringSecondsText,
                  { color: COLOR_HEX[activeState.currentTurnColor] },
                ]}
              >
                {turnSeconds}s
              </Text>
            </View>

            <View style={styles.hudTurnInfo}>
              <View style={styles.activeTurnPill}>
                <View
                  style={[
                    styles.pingDot,
                    { backgroundColor: COLOR_HEX[activeState.currentTurnColor] },
                  ]}
                />
                <Text
                  style={[
                    styles.activeTurnPillText,
                    { color: COLOR_HEX[activeState.currentTurnColor] },
                  ]}
                >
                  ACTIVE TURN
                </Text>
              </View>
              <Text style={styles.hudPlayerTurnLabel} numberOfLines={1}>
                {activeState.colorPlayerMap[activeState.currentTurnColor] === playerId
                  ? `${username || 'You'} (Your Turn)`
                  : `${activeState.currentTurnColor.toUpperCase()} Turn`}
              </Text>
            </View>
          </View>

          {/* Prize Pot Badge */}
          <View style={styles.hudRight}>
            <Text style={styles.potLabel}>Prize Pot</Text>
            <View style={styles.potRow}>
              <Trophy size={16} color="#D97706" />
              <Text style={styles.potAmount}>50,000 GC</Text>
            </View>
          </View>
        </View>

        {/* Player 1 & Player 2 Top Quick Deck */}
        <View style={styles.playersDeckGrid}>
          {renderStitchPlayerCard(
            'red',
            'CyberSamurai',
            'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100',
            '#P1'
          )}
          {renderStitchPlayerCard(
            'green',
            'PixelLord',
            'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=100',
            '#P2'
          )}
        </View>

        {/* 15x15 Authentic Ludo Board Arena (Crisp Light Theme) */}
        <View style={styles.ludoBoardWrapper}>
          <View style={styles.ludoBoardContainer}>
            {Array.from({ length: 15 }, (_, r) => (
              <View key={r} style={styles.ludoRow}>
                {Array.from({ length: 15 }, (_, c) => {
                  const cellTokens = tokensByCoord.get(`${r},${c}`) || [];
                  const isSafe = isStarSafeCell(r, c);
                  const isCenterArea = r >= 6 && r <= 8 && c >= 6 && c <= 8;
                  const bg = getCellBg(r, c);

                  // Recessed yard box styling
                  const isRedYard = r < 6 && c < 6;
                  const isGreenYard = r < 6 && c >= 9;
                  const isBlueYard = r >= 9 && c < 6;
                  const isYellowYard = r >= 9 && c >= 9;

                  // Render 3x3 Center Victory Triangles Apex
                  if (r === 6 && c === 6) {
                    return (
                      <View
                        key={c}
                        style={[
                          styles.centerApexBase,
                          { width: CELL * 3, height: CELL * 3 },
                        ]}
                      >
                        <Svg width={CELL * 3} height={CELL * 3} viewBox="0 0 100 100">
                          {/* Top: Green Triangle */}
                          <Polygon points="0,0 100,0 50,50" fill={COLOR_HEX.green} opacity={0.92} />
                          {/* Right: Yellow Triangle */}
                          <Polygon points="100,0 100,100 50,50" fill={COLOR_HEX.yellow} opacity={0.92} />
                          {/* Bottom: Blue Triangle */}
                          <Polygon points="100,100 0,100 50,50" fill={COLOR_HEX.blue} opacity={0.92} />
                          {/* Left: Red Triangle */}
                          <Polygon points="0,100 0,0 50,50" fill={COLOR_HEX.red} opacity={0.92} />
                        </Svg>
                        <View style={styles.centerTrophyBadge}>
                          <Trophy size={14} color="#D97706" />
                        </View>
                      </View>
                    );
                  }

                  // Skip other center cells covered by the 3x3 apex base
                  if (isCenterArea) {
                    return null;
                  }

                  return (
                    <View
                      key={c}
                      style={[
                        styles.ludoCell,
                        { backgroundColor: bg },
                        isRedYard && { borderColor: '#FECDD3' },
                        isGreenYard && { borderColor: '#A7F3D0' },
                        isBlueYard && { borderColor: '#BFDBFE' },
                        isYellowYard && { borderColor: '#FDE68A' },
                      ]}
                    >
                      {isSafe && cellTokens.length === 0 && (
                        <Star size={CELL * 0.55} color="#F59E0B" fill="#F59E0B" />
                      )}

                      {cellTokens.map((tok, idx) => {
                        const canMoveThis =
                          isMyTurn &&
                          !activeState.canRollDice &&
                          tok.color === myColor &&
                          legalMovesForCurrentTurn.some(
                            (m) => m.tokenId === tok.id
                          );

                        return (
                          <TouchableOpacity
                            key={`${tok.color}-${tok.id}-${idx}`}
                            activeOpacity={0.8}
                            onPress={() => handleTokenPress(tok)}
                            disabled={!canMoveThis}
                            style={[
                              styles.tokenTouchArea,
                              canMoveThis && styles.tokenActiveGlow,
                            ]}
                          >
                            <GlossyPawn
                              color={tok.color}
                              size={CELL * 0.9}
                              isMovable={canMoveThis}
                            />
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  );
                })}
              </View>
            ))}
          </View>
        </View>

        {/* Player 3 & Player 4 Bottom Quick Deck */}
        <View style={styles.playersDeckGrid}>
          {renderStitchPlayerCard(
            'blue',
            'GlitchQueen',
            'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=100',
            '#P4'
          )}
          {renderStitchPlayerCard(
            'yellow',
            'NeonValkyrie',
            'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100',
            '#P3'
          )}
        </View>

        {/* Interactive Modern Dice & Controls Dock */}
        <View style={styles.controlsDock}>
          <View style={styles.diceRowContainer}>
            {/* 3D Modern Dice Block */}
            <Animated.View style={{ transform: [{ scale: diceSpinAnim }] }}>
              <WhiteDiceWithPips
                value={activeState.diceValue}
                active={isMyTurn && activeState.canRollDice}
                loading={botProcessing}
                onPress={handleRollDice}
              />
            </Animated.View>

            {/* Action Buttons Column */}
            <View style={styles.actionCol}>
              <TouchableOpacity
                style={[
                  styles.rollPrimaryBtn,
                  (!isMyTurn || !activeState.canRollDice || botProcessing) &&
                    styles.rollPrimaryBtnDisabled,
                ]}
                onPress={handleRollDice}
                disabled={!isMyTurn || !activeState.canRollDice || botProcessing}
                activeOpacity={0.85}
              >
                <Dices size={20} color="#FFFFFF" />
                <Text style={styles.rollPrimaryBtnText}>
                  Roll Dice ({activeState.diceValue || 5})
                </Text>
              </TouchableOpacity>

              <View style={styles.auxBtnRow}>
                <TouchableOpacity
                  style={styles.auxBtn}
                  onPress={() => {
                    if (isBotMode) {
                      const botIds = Array.from(
                        { length: ludoBotCount },
                        (_, i) => `cpu_ludo_${i + 1}`
                      );
                      setLocalLudoState(LudoEngine.createInitialState([playerId, ...botIds]));
                    }
                  }}
                  activeOpacity={0.8}
                >
                  <RotateCcw size={15} color="#475569" />
                  <Text style={styles.auxBtnText}>Restart</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.auxBtn, styles.auxBtnForfeit]}
                  onPress={handleLeave}
                  activeOpacity={0.8}
                >
                  <LogOut size={15} color="#EF4444" />
                  <Text style={[styles.auxBtnText, { color: '#EF4444' }]}>Forfeit</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Turn Ticker Bar */}
          <View style={styles.turnTickerPlate}>
            <History size={16} color="#4F46E5" />
            <Text style={styles.turnTickerText} numberOfLines={1}>
              {isMyTurn
                ? activeState.canRollDice
                  ? 'Your move! Tap "Roll Dice" to get your number'
                  : 'Select a highlighted token to advance on board'
                : `${activeState.currentTurnColor.toUpperCase()} turn in progress...`}
            </Text>
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
    alignItems: 'center',
    gap: 12,
  },
  hudHeader: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  hudLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  ringWrapper: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringSecondsText: {
    position: 'absolute',
    fontSize: 12,
    fontWeight: '800',
  },
  hudTurnInfo: {
    gap: 2,
  },
  activeTurnPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  pingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  activeTurnPillText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  hudPlayerTurnLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  hudRight: {
    alignItems: 'flex-end',
  },
  potLabel: {
    fontSize: 10,
    color: '#64748B',
    fontWeight: '600',
  },
  potRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  potAmount: {
    fontSize: 14,
    fontWeight: '800',
    color: '#D97706',
  },
  playersDeckGrid: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
  },
  playerCardDeck: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 10,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    gap: 10,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
  },
  cardAvatarWrapper: {
    position: 'relative',
  },
  cardAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F1F5F9',
  },
  cardOnlineDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  cardInfoCol: {
    flex: 1,
    minWidth: 0,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardNameText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
    flex: 1,
  },
  nowBadge: {
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 8,
  },
  nowBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  slotBadgeText: {
    fontSize: 11,
    fontWeight: '800',
  },
  cardSubCountText: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 2,
  },
  ludoBoardWrapper: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 8,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 4,
  },
  ludoBoardContainer: {
    width: EXACT_BOARD_SIZE,
    height: EXACT_BOARD_SIZE,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  ludoRow: {
    flexDirection: 'row',
  },
  ludoCell: {
    width: CELL,
    height: CELL,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 0.5,
    borderColor: '#E2E8F0',
    position: 'relative',
  },
  centerApexBase: {
    position: 'absolute',
    top: CELL * 6,
    left: CELL * 6,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  centerTrophyBadge: {
    position: 'absolute',
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#F59E0B',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  pawnContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  pawnMovablePulse: {
    position: 'absolute',
    top: 2,
    left: 2,
    right: 2,
    bottom: 2,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#4F46E5',
  },
  tokenTouchArea: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  tokenActiveGlow: {
    transform: [{ scale: 1.15 }],
  },
  controlsDock: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 12,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  diceRowContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  diceContainer: {
    width: 64,
    height: 64,
    borderRadius: 18,
    backgroundColor: '#F8FAFC',
    borderWidth: 2,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  diceContainerGlow: {
    borderColor: '#4F46E5',
    backgroundColor: '#EEF2FF',
    elevation: 6,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#4F46E5',
  },
  diceCenterDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#4F46E5',
  },
  diceCenterDotSelf: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#4F46E5',
    alignSelf: 'center',
  },
  diceCenterDotOverlay: {
    position: 'absolute',
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#4F46E5',
    top: 19,
    left: 19,
  },
  diceBetweenDots: {
    width: '100%',
    height: '100%',
    justifyContent: 'space-between',
  },
  diceGridDots: {
    width: '100%',
    height: '100%',
    justifyContent: 'space-between',
    position: 'relative',
  },
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  actionCol: {
    flex: 1,
    gap: 8,
  },
  rollPrimaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4F46E5',
    borderRadius: 14,
    paddingVertical: 12,
    gap: 8,
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  rollPrimaryBtnDisabled: {
    backgroundColor: '#CBD5E1',
    shadowOpacity: 0,
    elevation: 0,
  },
  rollPrimaryBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  auxBtnRow: {
    flexDirection: 'row',
    gap: 8,
  },
  auxBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 10,
    paddingVertical: 8,
    gap: 6,
  },
  auxBtnForfeit: {
    backgroundColor: '#FFF1F2',
  },
  auxBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  turnTickerPlate: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 10,
    gap: 8,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  turnTickerText: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '600',
    flex: 1,
  },
});