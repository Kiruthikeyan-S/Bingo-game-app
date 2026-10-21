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
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { Dices, Sparkles, Shield, Trophy, Bot } from 'lucide-react-native';
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
import {
  LudoColor,
  LudoState,
  LudoToken,
  PlayerScoreSummary,
} from '../../../shared/types';

const { width } = Dimensions.get('window');
const BOARD_OUTER = Math.min(width - 24, 375);
const CELL = Math.floor(BOARD_OUTER / 15);
const EXACT_BOARD_SIZE = CELL * 15;

const COLOR_HEX: Record<LudoColor, string> = {
  red: '#ef4444',
  green: '#10b981',
  yellow: '#f59e0b',
  blue: '#3b82f6',
};

const COLOR_LIGHT_BG: Record<LudoColor, string> = {
  red: 'rgba(239, 68, 68, 0.25)',
  green: 'rgba(16, 185, 129, 0.25)',
  yellow: 'rgba(245, 158, 11, 0.25)',
  blue: 'rgba(59, 130, 246, 0.25)',
};

// Exact 52-square perimeter track coordinates [row, col] on a 15x15 Ludo board
const GLOBAL_TRACK_COORDS: Array<[number, number]> = [
  // 0..4 (Red start arm going right)
  [6, 1], [6, 2], [6, 3], [6, 4], [6, 5],
  // 5..10 (Up along left side of top arm)
  [5, 6], [4, 6], [3, 6], [2, 6], [1, 6], [0, 6],
  // 11..12 (Top turn)
  [0, 7], [0, 8],
  // 13..17 (Green start arm going down)
  [1, 8], [2, 8], [3, 8], [4, 8], [5, 8],
  // 18..23 (Right along top side of right arm)
  [6, 9], [6, 10], [6, 11], [6, 12], [6, 13], [6, 14],
  // 24..25 (Right turn)
  [7, 14], [8, 14],
  // 26..30 (Yellow start arm going left)
  [8, 13], [8, 12], [8, 11], [8, 10], [8, 9],
  // 31..36 (Down along right side of bottom arm)
  [9, 8], [10, 8], [11, 8], [12, 8], [13, 8], [14, 8],
  // 37..38 (Bottom turn)
  [14, 7], [14, 6],
  // 39..43 (Blue start arm going up)
  [13, 6], [12, 6], [11, 6], [10, 6], [9, 6],
  // 44..49 (Left along bottom side of left arm)
  [8, 5], [8, 4], [8, 3], [8, 2], [8, 1], [8, 0],
  // 50..51 (Left turn)
  [7, 0], [6, 0],
];

// Home stretch coordinates for steps 51..55
const HOME_STRETCH_COORDS: Record<LudoColor, Array<[number, number]>> = {
  red: [[7, 1], [7, 2], [7, 3], [7, 4], [7, 5]],
  green: [[1, 7], [2, 7], [3, 7], [4, 7], [5, 7]],
  yellow: [[7, 13], [7, 12], [7, 11], [7, 10], [7, 9]],
  blue: [[13, 7], [12, 7], [11, 7], [10, 7], [9, 7]],
};

// Finished Home positions (step === 56)
const HOME_FINISH_COORD: Record<LudoColor, [number, number]> = {
  red: [7, 6],
  green: [6, 7],
  yellow: [7, 8],
  blue: [8, 7],
};

// Base Yard token slot coordinates (step === -1)
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

export default function LudoScreen() {
  const router = useRouter();
  const playerId = usePlayerStore((s) => s.playerId);
  const username = usePlayerStore((s) => s.username);
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

  // Initialize Offline Bot Ludo State (1 Human + 1..3 Bots)
  const [localLudoState, setLocalLudoState] = useState<LudoState>(() => {
    const botIds = Array.from({ length: ludoBotCount }, (_, i) => `bot_ludo_${i + 1}`);
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
      opponentName: `${ludoBotCount} Ludo ${ludoBotCount === 1 ? 'Bot' : 'Bots'}`,
      result: winnerColor === myColor ? 'win' : 'loss',
      resultReason: `${winnerColor.toUpperCase()} completed all 4 tokens`,
      movesCount: 30,
    });
    router.push('/results');
  };

  // Automate Bot turns in offline Bot mode
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
      await new Promise((r) => setTimeout(r, 650));
      if (cancelled) return;

      // Step 1: Bot rolls the dice
      if (localLudoState.canRollDice) {
        animateDice();
        const rollOut = LudoEngine.applyDiceRoll(localLudoState);
        setLocalLudoState(rollOut.state);
        if (rollOut.autoTurnPassed) {
          setBotProcessing(false);
        }
        return;
      }

      // Step 2: Bot chooses and executes a token move
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
      // If only 1 legal move exists and all other tokens are in base, let player tap it
    } else {
      const res = await socketService.ludoRollDice();
      if (!res.success) {
        Alert.alert('Roll Error', res.error || 'Could not roll dice');
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
      const res = await socketService.ludoMoveToken(token.id);
      if (!res.success) {
        Alert.alert('Move Error', res.error || 'Illegal token move');
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

  // Group all active tokens by their (row, col) on the 15x15 board
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

  // Helper to determine cell background color on the 15x15 Ludo board
  const getCellStyle = (r: number, c: number) => {
    // 4 Corner Yards (6x6)
    if (r < 6 && c < 6) return { backgroundColor: COLOR_LIGHT_BG.red };
    if (r < 6 && c >= 9) return { backgroundColor: COLOR_LIGHT_BG.green };
    if (r >= 9 && c >= 9) return { backgroundColor: COLOR_LIGHT_BG.yellow };
    if (r >= 9 && c < 6) return { backgroundColor: COLOR_LIGHT_BG.blue };

    // Center 3x3 Home Box (rows 6..8, cols 6..8)
    if (r >= 6 && r <= 8 && c >= 6 && c <= 8) {
      if (r === 7 && c === 6) return { backgroundColor: COLOR_HEX.red };
      if (r === 6 && c === 7) return { backgroundColor: COLOR_HEX.green };
      if (r === 7 && c === 8) return { backgroundColor: COLOR_HEX.yellow };
      if (r === 8 && c === 7) return { backgroundColor: COLOR_HEX.blue };
      return { backgroundColor: '#ffd700' };
    }

    // Colored Home Stretches
    if (r === 7 && c >= 1 && c <= 5) return { backgroundColor: COLOR_HEX.red };
    if (c === 7 && r >= 1 && r <= 5) return { backgroundColor: COLOR_HEX.green };
    if (r === 7 && c >= 9 && c <= 13) return { backgroundColor: COLOR_HEX.yellow };
    if (c === 7 && r >= 9 && r <= 13) return { backgroundColor: COLOR_HEX.blue };

    // Colored Start Squares
    if (r === 6 && c === 1) return { backgroundColor: COLOR_HEX.red };
    if (r === 1 && c === 8) return { backgroundColor: COLOR_HEX.green };
    if (r === 8 && c === 13) return { backgroundColor: COLOR_HEX.yellow };
    if (r === 13 && c === 6) return { backgroundColor: COLOR_HEX.blue };

    return { backgroundColor: '#1e293b' };
  };

  const isStarSafeCell = (r: number, c: number) => {
    const idx = GLOBAL_TRACK_COORDS.findIndex(([gr, gc]) => gr === r && gc === c);
    return idx !== -1 && SAFE_GLOBAL_SQUARES.has(idx);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <GameHeader
        title="Classic Ludo"
        subtitle={
          isBotMode
            ? `1 Human vs ${ludoBotCount} ${botDifficulty.toUpperCase()} AI`
            : `Room ${roomCode}`
        }
        onBackPress={handleLeave}
      />

      <ScrollView contentContainerStyle={styles.content}>
        {/* Player Color Status Cards */}
        <View style={styles.playersRow}>
          {activeState.activeColors.map((col) => {
            const pId = activeState.colorPlayerMap[col];
            const isTurn = activeState.currentTurnColor === col;
            const isMe = pId === playerId;
            const homeCount = activeState.tokens[col].filter(
              (t) => t.step === HOME_STEP
            ).length;
            const label = isMe
              ? 'YOU'
              : isBotMode
              ? `${col.toUpperCase()} BOT`
              : players[pId]?.username || col.toUpperCase();

            return (
              <View
                key={col}
                style={[
                  styles.colorCard,
                  { borderColor: isTurn ? COLOR_HEX[col] : '#1e293b' },
                  isTurn && { backgroundColor: COLOR_LIGHT_BG[col] },
                ]}
              >
                <View
                  style={[styles.colorDot, { backgroundColor: COLOR_HEX[col] }]}
                />
                <View style={{ flex: 1 }}>
                  <Text style={styles.colorCardName} numberOfLines={1}>
                    {label}
                  </Text>
                  <Text style={styles.colorCardHome}>{homeCount}/4 Home</Text>
                </View>
              </View>
            );
          })}
        </View>

        {/* Action Banner */}
        <View style={styles.actionBanner}>
          <Sparkles size={15} color="#00e5ff" />
          <Text style={styles.actionBannerText} numberOfLines={1}>
            {activeState.lastActionText}
          </Text>
        </View>

        {/* 15x15 Classic Ludo Board */}
        <View style={styles.ludoBoardContainer}>
          {Array.from({ length: 15 }, (_, r) => (
            <View key={r} style={styles.ludoRow}>
              {Array.from({ length: 15 }, (_, c) => {
                const cellTokens = tokensByCoord.get(`${r},${c}`) || [];
                const isSafe = isStarSafeCell(r, c);
                const isCenterCrown = r === 7 && c === 7;

                return (
                  <View
                    key={c}
                    style={[styles.ludoCell, getCellStyle(r, c)]}
                  >
                    {isSafe && cellTokens.length === 0 && (
                      <Text style={styles.starIcon}>★</Text>
                    )}
                    {isCenterCrown && (
                      <Trophy size={CELL * 0.65} color="#050816" />
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
                          activeOpacity={0.75}
                          onPress={() => handleTokenPress(tok)}
                          disabled={!canMoveThis}
                          style={[
                            styles.tokenDisk,
                            { backgroundColor: COLOR_HEX[tok.color] },
                            canMoveThis && styles.tokenMovableGlow,
                          ]}
                        >
                          <Text style={styles.tokenNumText}>{tok.id + 1}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                );
              })}
            </View>
          ))}
        </View>

        {/* Bottom Dice & Turn Control Bar */}
        <View style={styles.diceBar}>
          <View style={styles.turnInfoCol}>
            <Text style={styles.turnTitle}>
              {isMyTurn
                ? activeState.canRollDice
                  ? 'YOUR TURN — Tap Dice to Roll!'
                  : 'TAP A GLOWING TOKEN TO MOVE!'
                : `Waiting for ${activeState.currentTurnColor.toUpperCase()}...`}
            </Text>
            <Text style={styles.turnSubtitle}>
              Roll a 6 to deploy a token from your yard • Star squares (★) are safe
            </Text>
          </View>

          <Animated.View style={{ transform: [{ scale: diceSpinAnim }] }}>
            <TouchableOpacity
              activeOpacity={0.8}
              disabled={!isMyTurn || !activeState.canRollDice || botProcessing}
              onPress={handleRollDice}
              style={[
                styles.diceButton,
                {
                  borderColor:
                    COLOR_HEX[activeState.currentTurnColor] || '#00e5ff',
                },
                isMyTurn && activeState.canRollDice && styles.diceButtonActive,
              ]}
            >
              {botProcessing ? (
                <ActivityIndicator color="#00e5ff" size="small" />
              ) : (
                <>
                  <Dices
                    size={24}
                    color={
                      isMyTurn && activeState.canRollDice ? '#050816' : '#00e5ff'
                    }
                  />
                  <Text
                    style={[
                      styles.diceValueText,
                      isMyTurn &&
                        activeState.canRollDice && { color: '#050816' },
                    ]}
                  >
                    {activeState.diceValue ?? 'ROLL'}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </Animated.View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#050816',
  },
  content: {
    paddingHorizontal: 12,
    paddingBottom: 24,
    alignItems: 'center',
  },
  playersRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    width: '100%',
    marginBottom: 8,
  },
  colorCard: {
    flex: 1,
    minWidth: '46%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#0c122e',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  colorDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
  },
  colorCardName: {
    fontSize: 12,
    fontWeight: '900',
    color: '#f8fafc',
  },
  colorCardHome: {
    fontSize: 10,
    color: '#94a3b8',
    fontWeight: '700',
  },
  actionBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    width: '100%',
    backgroundColor: '#0f1636',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1e2b5e',
    marginBottom: 8,
  },
  actionBannerText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#e2e8f0',
    flex: 1,
  },
  ludoBoardContainer: {
    width: EXACT_BOARD_SIZE + 6,
    height: EXACT_BOARD_SIZE + 6,
    padding: 3,
    backgroundColor: '#1e2b5e',
    borderRadius: 16,
    overflow: 'hidden',
  },
  ludoRow: {
    flexDirection: 'row',
  },
  ludoCell: {
    width: CELL,
    height: CELL,
    borderWidth: 0.5,
    borderColor: 'rgba(15, 23, 42, 0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  starIcon: {
    fontSize: CELL * 0.58,
    color: 'rgba(255, 255, 255, 0.65)',
  },
  tokenDisk: {
    width: CELL * 0.82,
    height: CELL * 0.82,
    borderRadius: CELL * 0.41,
    borderWidth: 2,
    borderColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'absolute',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 3,
    elevation: 4,
  },
  tokenMovableGlow: {
    borderColor: '#ffd700',
    borderWidth: 2.5,
    transform: [{ scale: 1.15 }],
  },
  tokenNumText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#ffffff',
  },
  diceBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    backgroundColor: '#0c122e',
    borderRadius: 18,
    padding: 14,
    marginTop: 10,
    borderWidth: 1.5,
    borderColor: '#1e2b5e',
    gap: 12,
  },
  turnInfoCol: {
    flex: 1,
  },
  turnTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: '#00e5ff',
  },
  turnSubtitle: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 3,
  },
  diceButton: {
    width: 78,
    height: 64,
    borderRadius: 16,
    backgroundColor: '#161f48',
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  diceButtonActive: {
    backgroundColor: '#00ff87',
    borderColor: '#ffffff',
  },
  diceValueText: {
    fontSize: 15,
    fontWeight: '900',
    color: '#ffffff',
  },
});
