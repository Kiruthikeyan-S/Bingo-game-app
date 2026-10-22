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
import { Shield, Trophy, Star, Plus } from 'lucide-react-native';
import Svg, { Circle, Path, Rect, Defs, RadialGradient, Stop, Ellipse } from 'react-native-svg';
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
const BOARD_OUTER = Math.min(width - 24, 380);
const CELL = Math.floor(BOARD_OUTER / 15);
const EXACT_BOARD_SIZE = CELL * 15;

const COLOR_HEX: Record<LudoColor, string> = {
  blue: '#0284C7',
  yellow: '#EAB308',
  green: '#16A34A',
  red: '#EF4444',
};

const COLOR_DARK: Record<LudoColor, string> = {
  blue: '#0369A1',
  yellow: '#CA8A04',
  green: '#15803D',
  red: '#DC2626',
};

// Perimeter tracks clockwise: Blue (TL) -> Yellow (TR) -> Green (BR) -> Red (BL)
const GLOBAL_TRACK_COORDS: Array<[number, number]> = [
  // Blue (0..12) starting at [6, 1]
  [6, 1], [6, 2], [6, 3], [6, 4], [6, 5],
  [5, 6], [4, 6], [3, 6], [2, 6], [1, 6], [0, 6],
  [0, 7], [0, 8],
  // Yellow (13..25) starting at [1, 8]
  [1, 8], [2, 8], [3, 8], [4, 8], [5, 8],
  [6, 9], [6, 10], [6, 11], [6, 12], [6, 13], [6, 14],
  [7, 14], [8, 14],
  // Green (26..38) starting at [8, 13]
  [8, 13], [8, 12], [8, 11], [8, 10], [8, 9],
  [9, 8], [10, 8], [11, 8], [12, 8], [13, 8], [14, 8],
  [14, 7], [14, 6],
  // Red (39..51) starting at [13, 6]
  [13, 6], [12, 6], [11, 6], [10, 6], [9, 6],
  [8, 5], [8, 4], [8, 3], [8, 2], [8, 1], [8, 0],
  [7, 0], [6, 0],
];

const HOME_STRETCH_COORDS: Record<LudoColor, Array<[number, number]>> = {
  blue: [[7, 1], [7, 2], [7, 3], [7, 4], [7, 5]],
  yellow: [[1, 7], [2, 7], [3, 7], [4, 7], [5, 7]],
  green: [[7, 13], [7, 12], [7, 11], [7, 10], [7, 9]],
  red: [[13, 7], [12, 7], [11, 7], [10, 7], [9, 7]],
};

const HOME_FINISH_COORD: Record<LudoColor, [number, number]> = {
  blue: [7, 6],
  yellow: [6, 7],
  green: [7, 8],
  red: [8, 7],
};

const YARD_SLOT_COORDS: Record<LudoColor, Array<[number, number]>> = {
  blue: [[1, 1], [1, 4], [4, 1], [4, 4]],
  yellow: [[1, 10], [1, 13], [4, 10], [4, 13]],
  green: [[10, 10], [10, 13], [13, 10], [13, 13]],
  red: [[10, 1], [10, 4], [13, 1], [13, 4]],
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
 * High-fidelity 3D Glossy Pawn Token Renderer matching Image 1
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
        <Ellipse cx="16" cy="28" rx="9" ry="3.2" fill="rgba(0,0,0,0.38)" />
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
 * 3D White Dice with Pips matching Image 1
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
        <ActivityIndicator size="small" color="#0284C7" />
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
  const avatarUrl = usePlayerStore((s) => s.avatarUrl);
  const hapticsEnabled = usePlayerStore((s) => s.hapticsEnabled);
  const recordMatchResult = usePlayerStore((s) => s.recordMatchResult);

  const gameMode = useGameStore((s) => s.gameMode);
  const botDifficulty = useGameStore((s) => s.botDifficulty);
  const ludoBotCount = useGameStore((s) => s.ludoBotCount);
  const roomCode = useGameStore((s) => s.roomCode);
  const onlineLudoState = useGameStore((s) => s.ludoState);
  const players = useGameStore((s) => s.players);
  const setGameFinished = useGameStore((s) => s.setGameFinished);

  const isBotMode = gameMode === 'bot';

  const [localLudoState, setLocalLudoState] = useState<LudoState>(() => {
    const botIds = Array.from({ length: ludoBotCount }, (_, i) => `cpu_ludo_${i + 1}`);
    return LudoEngine.createInitialState([playerId, ...botIds]);
  });

  const [botProcessing, setBotProcessing] = useState(false);
  const diceSpinAnim = useRef(new Animated.Value(1)).current;

  const activeState = isBotMode
    ? localLudoState
    : onlineLudoState || localLudoState;

  const botRef = useRef(new LudoBot(botDifficulty));
  useEffect(() => {
    botRef.current.changeDifficulty(botDifficulty);
  }, [botDifficulty]);

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
        username: isMe ? username : `${col.toUpperCase()} CPU`,
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
      resultReason: `${winnerColor.toUpperCase()} completed all 4 tokens`,
      movesCount: 30,
    });
    router.push('/results');
  };

  // Fast Computer turns in Solo mode
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
    Alert.alert('Leave Ludo Match?', 'Are you sure you want to exit this match?', [
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
    if (r < 6 && c < 6) return COLOR_HEX.blue;
    if (r < 6 && c >= 9) return COLOR_HEX.yellow;
    if (r >= 9 && c < 6) return COLOR_HEX.red;
    if (r >= 9 && c >= 9) return COLOR_HEX.green;

    // Center triangles
    if (r >= 6 && r <= 8 && c >= 6 && c <= 8) {
      if (r === 7 && c === 6) return COLOR_HEX.blue;
      if (r === 6 && c === 7) return COLOR_HEX.yellow;
      if (r === 7 && c === 8) return COLOR_HEX.green;
      if (r === 8 && c === 7) return COLOR_HEX.red;
      return '#FFFFFF';
    }

    // Home stretch colored tracks
    if (r === 7 && c >= 1 && c <= 5) return COLOR_HEX.blue;
    if (c === 7 && r >= 1 && r <= 5) return COLOR_HEX.yellow;
    if (r === 7 && c >= 9 && c <= 13) return COLOR_HEX.green;
    if (c === 7 && r >= 9 && r <= 13) return COLOR_HEX.red;

    // Track entry start squares
    if (r === 6 && c === 1) return COLOR_HEX.blue;
    if (r === 1 && c === 8) return COLOR_HEX.yellow;
    if (r === 8 && c === 13) return COLOR_HEX.green;
    if (r === 13 && c === 6) return COLOR_HEX.red;

    return '#FFFFFF';
  };

  const isStarSafeCell = (r: number, c: number) => {
    const idx = GLOBAL_TRACK_COORDS.findIndex(([gr, gc]) => gr === r && gc === c);
    return idx !== -1 && SAFE_GLOBAL_SQUARES.has(idx);
  };

  const getArrowDirection = (r: number, c: number) => {
    if (r === 6 && c === 0) return '>>';
    if (r === 0 && c === 8) return 'vv';
    if (r === 8 && c === 14) return '<<';
    if (r === 14 && c === 6) return '^^';
    return null;
  };

  // Helper to render individual Player Pill matching Image 1
  const renderPlayerPill = (
    col: LudoColor,
    defaultName: string,
    avatarUri: string,
    isRightAligned: boolean = false
  ) => {
    const pId = activeState.colorPlayerMap[col];
    const isMe = pId === playerId;
    const isTurn = activeState.currentTurnColor === col;
    const displayName = isMe ? (username || 'Player 1') : defaultName;

    return (
      <View
        style={[
          styles.playerPill,
          { backgroundColor: COLOR_HEX[col] },
          isRightAligned && styles.playerPillRight,
          isTurn && styles.playerPillActiveTurn,
        ]}
      >
        {!isRightAligned && (
          <Image source={{ uri: avatarUri }} style={styles.pillAvatar} />
        )}

        <View style={[styles.pillTextCol, isRightAligned && { alignItems: 'flex-end' }]}>
          <Text style={styles.pillNameText} numberOfLines={1}>
            {displayName}
          </Text>
          <View style={styles.pillCoinRow}>
            <View style={styles.goldCoinIcon}>
              <Text style={styles.goldCoinSymbol}>$</Text>
            </View>
            <Text style={styles.pillCoinText}>10 K</Text>
          </View>
        </View>

        {isRightAligned && (
          <Image source={{ uri: avatarUri }} style={styles.pillAvatar} />
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Top Bar with Currency Pill matching Image 1 */}
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.exitBtn} onPress={handleLeave}>
          <Text style={styles.exitBtnText}>BACK</Text>
        </TouchableOpacity>

        <View style={styles.currencyPill}>
          <View style={styles.coinPillItem}>
            <View style={styles.goldCoinIcon}>
              <Text style={styles.goldCoinSymbol}>$</Text>
            </View>
            <Text style={styles.currencyAmount}>10K</Text>
          </View>
          <View style={styles.gemPillItem}>
            <View style={styles.gemIcon} />
            <Text style={styles.currencyAmount}>100</Text>
          </View>
          <TouchableOpacity style={styles.addCurrencyBtn}>
            <Plus size={14} color="#FFFFFF" strokeWidth={3} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Top 2 Players: Player 1 (Blue) on Left, Player 2 (Yellow) on Right */}
        <View style={styles.playersRowTop}>
          {renderPlayerPill(
            'blue',
            'Player 1',
            'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100',
            false
          )}
          {renderPlayerPill(
            'yellow',
            'Player 2',
            'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=100',
            true
          )}
        </View>

        {/* 15x15 Ludo Board with Yellow Rounded Border matching Image 1 */}
        <View style={styles.ludoBoardWrapper}>
          <View style={styles.ludoBoardContainer}>
            {Array.from({ length: 15 }, (_, r) => (
              <View key={r} style={styles.ludoRow}>
                {Array.from({ length: 15 }, (_, c) => {
                  const cellTokens = tokensByCoord.get(`${r},${c}`) || [];
                  const isSafe = isStarSafeCell(r, c);
                  const arrow = getArrowDirection(r, c);
                  const isCenterWhite = r === 7 && c === 7;
                  const bg = getCellBg(r, c);

                  // Recessed yard box styling
                  const isBlueYardInner = r >= 1 && r <= 4 && c >= 1 && c <= 4;
                  const isYellowYardInner = r >= 1 && r <= 4 && c >= 10 && c <= 13;
                  const isRedYardInner = r >= 10 && r <= 13 && c >= 1 && c <= 4;
                  const isGreenYardInner = r >= 10 && r <= 13 && c >= 10 && c <= 13;

                  return (
                    <View
                      key={c}
                      style={[
                        styles.ludoCell,
                        { backgroundColor: bg },
                        isBlueYardInner && { backgroundColor: COLOR_DARK.blue },
                        isYellowYardInner && { backgroundColor: COLOR_DARK.yellow },
                        isRedYardInner && { backgroundColor: COLOR_DARK.red },
                        isGreenYardInner && { backgroundColor: COLOR_DARK.green },
                        isCenterWhite && styles.centerCircleWhite,
                      ]}
                    >
                      {arrow && (
                        <Text style={styles.arrowText}>{arrow}</Text>
                      )}

                      {isSafe && cellTokens.length === 0 && (
                        <Star size={CELL * 0.58} color="#94A3B8" fill="#94A3B8" />
                      )}

                      {isCenterWhite && cellTokens.length === 0 && (
                        <View style={styles.centerPuck} />
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

        {/* Bottom Row: Player 3 (Red) with 3D White Dice, Player 4 (Green) on Right */}
        <View style={styles.playersRowBottom}>
          <View style={styles.playerWithDiceLeft}>
            <Animated.View style={{ transform: [{ scale: diceSpinAnim }] }}>
              <WhiteDiceWithPips
                value={activeState.diceValue}
                active={isMyTurn && activeState.canRollDice}
                loading={botProcessing}
                onPress={handleRollDice}
              />
            </Animated.View>

            {renderPlayerPill(
              'red',
              'Player 3',
              'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100',
              false
            )}
          </View>

          {renderPlayerPill(
            'green',
            'Player 4',
            'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=100',
            true
          )}
        </View>

        {/* Turn Status Message */}
        <View style={styles.statusFooter}>
          <Shield size={14} color="#00E5FF" />
          <Text style={styles.statusFooterText}>
            {isMyTurn
              ? activeState.canRollDice
                ? 'YOUR TURN — Tap Dice'
                : 'TAP A GLOWING TOKEN TO ADVANCE'
              : `${activeState.currentTurnColor.toUpperCase()} Turn in Progress`}
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0A0F2B',
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  exitBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#1E293B',
  },
  exitBtnText: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '800',
  },
  currencyPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A2352',
    borderRadius: 20,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderWidth: 1.5,
    borderColor: '#3B82F6',
    gap: 10,
  },
  coinPillItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  goldCoinIcon: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#F59E0B',
    borderWidth: 1.5,
    borderColor: '#FDE047',
    alignItems: 'center',
    justifyContent: 'center',
  },
  goldCoinSymbol: {
    color: '#78350F',
    fontSize: 10,
    fontWeight: '900',
  },
  gemPillItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  gemIcon: {
    width: 14,
    height: 14,
    backgroundColor: '#38BDF8',
    transform: [{ rotate: '45deg' }],
  },
  currencyAmount: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '900',
  },
  addCurrencyBtn: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#0284C7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    paddingHorizontal: 12,
    paddingBottom: 24,
    alignItems: 'center',
    gap: 12,
  },
  playersRowTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 4,
  },
  playersRowBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    paddingHorizontal: 4,
  },
  playerWithDiceLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  playerPill: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 22,
    paddingHorizontal: 6,
    paddingVertical: 4,
    minWidth: 120,
    gap: 8,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  },
  playerPillRight: {
    justifyContent: 'flex-end',
  },
  playerPillActiveTurn: {
    borderColor: '#FFFFFF',
    elevation: 8,
  },
  pillAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#CBD5E1',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  pillTextCol: {
    justifyContent: 'center',
  },
  pillNameText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '900',
  },
  pillCoinRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  pillCoinText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  ludoBoardWrapper: {
    padding: 6,
    backgroundColor: '#FACC15',
    borderRadius: 24,
    shadowColor: '#FACC15',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 14,
    elevation: 10,
  },
  ludoBoardContainer: {
    width: EXACT_BOARD_SIZE,
    height: EXACT_BOARD_SIZE,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: '#000000',
  },
  ludoRow: {
    flexDirection: 'row',
  },
  ludoCell: {
    width: CELL,
    height: CELL,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 0.45,
    borderColor: 'rgba(0, 0, 0, 0.25)',
    position: 'relative',
  },
  centerCircleWhite: {
    backgroundColor: '#FFFFFF',
    borderRadius: CELL / 2,
  },
  centerPuck: {
    width: CELL * 0.75,
    height: CELL * 0.75,
    borderRadius: (CELL * 0.75) / 2,
    backgroundColor: '#F1F5F9',
    borderWidth: 1.5,
    borderColor: '#94A3B8',
  },
  arrowText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#000000',
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
    borderColor: '#FACC15',
  },
  tokenTouchArea: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  tokenActiveGlow: {
    transform: [{ scale: 1.1 }],
  },
  diceContainer: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 5,
  },
  diceContainerGlow: {
    borderColor: '#00E5FF',
    elevation: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#0F172A',
  },
  diceCenterDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#0F172A',
  },
  diceCenterDotSelf: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#0F172A',
    alignSelf: 'center',
  },
  diceCenterDotOverlay: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#0F172A',
    top: 14,
    left: 14,
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
  statusFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: 'rgba(0, 229, 255, 0.1)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#00E5FF',
  },
  statusFooterText: {
    color: '#00E5FF',
    fontSize: 11,
    fontWeight: '800',
  },
});
