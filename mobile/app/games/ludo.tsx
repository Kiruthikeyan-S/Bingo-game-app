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
import { Dices, Shield, Trophy, Star, ChevronLeft } from 'lucide-react-native';
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
import { useGraphicsStore } from '../../store/graphicsStore';
import { LudoScene3D } from '../../components/3d/ludo/LudoScene3D';
import { EsportsPlayerCard } from '../../components/gameplay/EsportsPlayerCard';
import { EsportsBottomBar } from '../../components/gameplay/EsportsBottomBar';
import {
  GameOptionsModal,
  GameChatModal,
  GameAnalyzeModal,
} from '../../components/gameplay/GameModals';
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

const GLOBAL_TRACK_COORDS: Array<[number, number]> = [
  [6, 1], [6, 2], [6, 3], [6, 4], [6, 5],
  [5, 6], [4, 6], [3, 6], [2, 6], [1, 6], [0, 6],
  [0, 7], [0, 8],
  [1, 8], [2, 8], [3, 8], [4, 8], [5, 8],
  [6, 9], [6, 10], [6, 11], [6, 12], [6, 13], [6, 14],
  [7, 14], [8, 14],
  [8, 13], [8, 12], [8, 11], [8, 10], [8, 9],
  [9, 8], [10, 8], [11, 8], [12, 8], [13, 8], [14, 8],
  [14, 7], [14, 6],
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

export default function LudoScreen() {
  const router = useRouter();
  const playerId = usePlayerStore((s) => s.playerId);
  const username = usePlayerStore((s) => s.username) || 'kiruthik1811';
  const avatarUrl = usePlayerStore((s) => s.avatarUrl);
  const soundEnabled = usePlayerStore((s) => s.soundEnabled);
  const setSoundEnabled = usePlayerStore((s) => s.setSoundEnabled);
  const hapticsEnabled = usePlayerStore((s) => s.hapticsEnabled);
  const recordMatchResult = usePlayerStore((s) => s.recordMatchResult);

  const gameMode = useGameStore((s) => s.gameMode);
  const botDifficulty = useGameStore((s) => s.botDifficulty);
  const ludoBotCount = useGameStore((s) => s.ludoBotCount);
  const roomCode = useGameStore((s) => s.roomCode);
  const onlineLudoState = useGameStore((s) => s.ludoState);
  const players = useGameStore((s) => s.players);
  const setGameFinished = useGameStore((s) => s.setGameFinished);

  const fallback2D = useGraphicsStore((s) => s.fallback2D);
  const toggleFallback2D = useGraphicsStore((s) => s.toggleFallback2D);

  const isBotMode = gameMode === 'bot';
  const myColor: LudoColor = 'red';

  const [localLudoState, setLocalLudoState] = useState<LudoState>(() =>
    LudoEngine.createInitialState(
      ['red', 'green', 'yellow', 'blue'].slice(0, ludoBotCount + 1) as LudoColor[],
      {
        red: playerId,
        green: 'bot_green',
        yellow: 'bot_yellow',
        blue: 'bot_blue',
      }
    )
  );

  const [botProcessing, setBotProcessing] = useState(false);
  const diceAnim = useRef(new Animated.Value(1)).current;

  // Turn Clocks
  const [playerClock, setPlayerClock] = useState(600);
  const [oppClock, setOppClock] = useState(600);

  // Modals
  const [optionsVisible, setOptionsVisible] = useState(false);
  const [chatVisible, setChatVisible] = useState(false);
  const [analyzeVisible, setAnalyzeVisible] = useState(false);

  const activeState = isBotMode ? localLudoState : onlineLudoState || localLudoState;
  const isMyTurn = activeState.currentTurnColor === myColor;

  useEffect(() => {
    if (activeState.winnerOrder.length > 0) return;
    const interval = setInterval(() => {
      if (isMyTurn) {
        setPlayerClock((c) => Math.max(0, c - 1));
      } else {
        setOppClock((c) => Math.max(0, c - 1));
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [isMyTurn, activeState.winnerOrder]);

  const formatClock = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const legalMovesForCurrentTurn = useMemo(() => {
    if (activeState.canRollDice || activeState.diceValue === null) return [];
    return LudoEngine.getLegalMoves(
      activeState,
      activeState.currentTurnColor,
      activeState.diceValue
    );
  }, [activeState]);

  const animateDice = () => {
    Animated.sequence([
      Animated.timing(diceAnim, {
        toValue: 1.25,
        duration: 80,
        useNativeDriver: true,
      }),
      Animated.spring(diceAnim, {
        toValue: 1,
        friction: 4,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const handleRollDice = () => {
    if (!isMyTurn || !activeState.canRollDice || botProcessing) return;

    if (hapticsEnabled) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    }
    animateDice();

    if (isBotMode) {
      const rolledValue = Math.floor(Math.random() * 6) + 1;
      const res = LudoEngine.applyDiceRoll(localLudoState, rolledValue);
      if (res.success && res.state) {
        setLocalLudoState(res.state);
      }
    } else {
      socketService.emit('ludo_roll_dice', { roomCode });
    }
  };

  const handleTokenPress = (token: LudoToken) => {
    if (!isMyTurn || activeState.canRollDice || botProcessing) return;
    if (token.color !== myColor) return;

    const move = legalMovesForCurrentTurn.find((m) => m.tokenId === token.id);
    if (!move) return;

    if (hapticsEnabled) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }

    if (isBotMode) {
      const res = LudoEngine.applyMove(localLudoState, move);
      if (res.success && res.state) {
        setLocalLudoState(res.state);
        if (res.isGameOver) {
          finalizeMatch(res.state);
        }
      }
    } else {
      socketService.emit('ludo_move_token', { roomCode, tokenId: token.id });
    }
  };

  // Bot Turn processing
  useEffect(() => {
    if (!isBotMode || activeState.currentTurnColor === myColor) return;
    if (activeState.winnerOrder.length > 0) return;

    let cancelled = false;
    setBotProcessing(true);

    const timer = setTimeout(() => {
      if (cancelled) return;

      if (activeState.canRollDice) {
        animateDice();
        const rolledValue = Math.floor(Math.random() * 6) + 1;
        const rollRes = LudoEngine.applyDiceRoll(localLudoState, rolledValue);
        if (rollRes.success && rollRes.state) {
          setLocalLudoState(rollRes.state);
        }
        setBotProcessing(false);
      } else if (activeState.diceValue !== null) {
        const moves = LudoEngine.getLegalMoves(
          activeState,
          activeState.currentTurnColor,
          activeState.diceValue
        );

        const chosen = LudoBot.selectMove(
          activeState,
          moves,
          activeState.currentTurnColor,
          botDifficulty
        );

        if (chosen) {
          const moveRes = LudoEngine.applyMove(localLudoState, chosen);
          if (moveRes.success && moveRes.state) {
            setLocalLudoState(moveRes.state);
            if (moveRes.isGameOver) {
              finalizeMatch(moveRes.state);
            }
          }
        }
        setBotProcessing(false);
      }
    }, 450);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [
    isBotMode,
    activeState.currentTurnColor,
    activeState.canRollDice,
    activeState.diceValue,
    activeState.winnerOrder,
  ]);

  const finalizeMatch = (finishedState: LudoState) => {
    const winnerColor = finishedState.winnerOrder[0] || 'red';
    const isWin = winnerColor === myColor;

    const summary: PlayerScoreSummary[] = finishedState.activeColors.map((c) => ({
      playerId: finishedState.colorPlayerMap[c],
      username:
        c === myColor
          ? username
          : isBotMode
          ? `${c.toUpperCase()} CPU`
          : players[finishedState.colorPlayerMap[c]]?.username || c,
      linesCompleted: finishedState.tokens[c].filter((t) => t.step === HOME_STEP).length,
      isWinner: finishedState.winnerOrder[0] === c,
      isDraw: false,
      gameType: 'ludo',
      detailText: `${finishedState.tokens[c].filter((t) => t.step === HOME_STEP).length}/4 finished`,
    }));

    setGameFinished(finishedState.colorPlayerMap[winnerColor], 'Ludo Home Victory', {}, summary);
    recordMatchResult({
      gameType: 'ludo',
      mode: isBotMode ? 'bot' : 'online',
      difficulty: botDifficulty,
      opponentName: isBotMode ? `CPU Contenders` : 'Opponent',
      result: isWin ? 'win' : 'loss',
      resultReason: 'Tokens reached Home Sanctuary',
      movesCount: finishedState.winnerOrder.length,
    });
    router.push('/results');
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

  const getCellStyle = (r: number, c: number) => {
    if (r < 6 && c < 6) return { backgroundColor: COLOR_LIGHT_BG.red };
    if (r < 6 && c >= 9) return { backgroundColor: COLOR_LIGHT_BG.green };
    if (r >= 9 && c >= 9) return { backgroundColor: COLOR_LIGHT_BG.yellow };
    if (r >= 9 && c < 6) return { backgroundColor: COLOR_LIGHT_BG.blue };

    if (r >= 6 && r <= 8 && c >= 6 && c <= 8) {
      if (r === 7 && c === 6) return { backgroundColor: COLOR_HEX.red };
      if (r === 6 && c === 7) return { backgroundColor: COLOR_HEX.green };
      if (r === 7 && c === 8) return { backgroundColor: COLOR_HEX.yellow };
      if (r === 8 && c === 7) return { backgroundColor: COLOR_HEX.blue };
      return { backgroundColor: '#ffd700' };
    }

    if (r === 7 && c >= 1 && c <= 5) return { backgroundColor: COLOR_HEX.red };
    if (c === 7 && r >= 1 && r <= 5) return { backgroundColor: COLOR_HEX.green };
    if (r === 7 && c >= 9 && c <= 13) return { backgroundColor: COLOR_HEX.yellow };
    if (c === 7 && r >= 9 && r <= 13) return { backgroundColor: COLOR_HEX.blue };

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

  const oppColor: LudoColor = activeState.currentTurnColor !== myColor ? activeState.currentTurnColor : 'green';
  const oppTokensHome = activeState.tokens[oppColor]?.filter((t) => t.step === HOME_STEP).length || 0;
  const myTokensHome = activeState.tokens[myColor].filter((t) => t.step === HOME_STEP).length;

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
          <Dices size={18} color="#f59e0b" style={{ marginRight: 6 }} />
          <Text style={styles.brandTitleText}>
            Classic<Text style={{ color: '#f59e0b' }}>Ludo</Text>
          </Text>
        </View>

        <View style={styles.diceBadgePill}>
          <Text style={styles.diceBadgeText}>
            {activeState.diceValue !== null ? `DICE: ${activeState.diceValue}` : 'ROLL'}
          </Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Opponent Card (Top) */}
        <EsportsPlayerCard
          username={isBotMode ? `potawatomee (${oppColor.toUpperCase()})` : `Opponent (${oppColor.toUpperCase()})`}
          rating={302}
          countryFlag="🇺🇸"
          isTurn={!isMyTurn}
          timeText={formatClock(oppClock)}
          isTop={true}
          capturedContent={
            <Text style={styles.cardSubText}>
              {oppTokensHome}/4 Tokens in Home Sanctuary
            </Text>
          }
        />

        {/* 15x15 Classic Ludo Board (Real 3D GPU Render or 2D Fallback) */}
        {!fallback2D ? (
          <LudoScene3D
            activeState={activeState}
            myColor={myColor}
            movableTokenIds={legalMovesForCurrentTurn.map((m) => m.tokenId)}
            selectedTokenId={null}
            canRoll={isMyTurn && activeState.canRollDice && !botProcessing}
            onTokenPress={(color, tokenId) => {
              if (color === myColor) {
                const tok = activeState.tokens[color].find((t) => t.id === tokenId);
                if (tok) handleTokenPress(tok);
              }
            }}
            onRollDice={handleRollDice}
            isWinner={activeState.winnerOrder[0] === myColor}
          />
        ) : (
          <View style={styles.ludoBoardContainer}>
            {Array.from({ length: 15 }, (_, r) => (
              <View key={r} style={styles.ludoRow}>
                {Array.from({ length: 15 }, (_, c) => {
                  const cellTokens = tokensByCoord.get(`${r},${c}`) || [];
                  const isSafe = isStarSafeCell(r, c);
                  const isCenterCrown = r === 7 && c === 7;

                  return (
                    <View key={c} style={[styles.ludoCell, getCellStyle(r, c)]}>
                      {isSafe && cellTokens.length === 0 && (
                        <Star size={CELL * 0.48} color="#94a3b8" />
                      )}
                      {isCenterCrown && (
                        <Trophy size={CELL * 0.65} color="#050816" />
                      )}

                      {cellTokens.map((tok, idx) => {
                        const canMoveThis =
                          isMyTurn &&
                          !activeState.canRollDice &&
                          tok.color === myColor &&
                          legalMovesForCurrentTurn.some((m) => m.tokenId === tok.id);

                        return (
                          <TouchableOpacity
                            key={tok.id}
                            disabled={!canMoveThis}
                            onPress={() => handleTokenPress(tok)}
                            activeOpacity={0.7}
                            style={[
                              styles.tokenPill,
                              { backgroundColor: COLOR_HEX[tok.color] },
                              canMoveThis && styles.movableTokenGlow,
                              idx > 0 && { marginLeft: -6 },
                            ]}
                          >
                            <View style={styles.tokenInnerDot} />
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  );
                })}
              </View>
            ))}
          </View>
        )}

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
              {myTokensHome}/4 Tokens Finished · {activeState.lastActionText}
            </Text>
          }
        />
      </ScrollView>

      {/* 5-Button Esports Bottom Bar */}
      <EsportsBottomBar
        onOptionsPress={() => setOptionsVisible(true)}
        onChatPress={() => setChatVisible(true)}
        onAnalyzePress={() => setAnalyzeVisible(true)}
        onBackPress={handleLeave}
        onForwardPress={handleRollDice}
        canStepBack={true}
        canStepForward={isMyTurn && activeState.canRollDice}
        forwardLabel="Roll"
        forwardIcon={<Dices size={20} color={isMyTurn && activeState.canRollDice ? '#050816' : '#cbd5e1'} />}
        forwardHighlight={isMyTurn && activeState.canRollDice}
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
        gameType="ludo"
      />

      {/* Sportsmanlike Chat Modal */}
      <GameChatModal
        visible={chatVisible}
        onClose={() => setChatVisible(false)}
      />

      {/* Tactical Ludo Analysis / Safe Square Advisor */}
      <GameAnalyzeModal
        visible={analyzeVisible}
        onClose={() => setAnalyzeVisible(false)}
        evaluationScore={`Control of Track: ${myTokensHome}/4 Home`}
        bestMove="Advance token to Star Safe Square"
        tacticalTip="Keep tokens stationed on colored safe spots to block opponents from capturing."
        accuracyScore={88}
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
  diceBadgePill: {
    backgroundColor: '#151f33',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#243452',
  },
  diceBadgeText: {
    color: '#f59e0b',
    fontSize: 12,
    fontWeight: '800',
  },
  content: {
    paddingHorizontal: 12,
    paddingTop: 6,
    paddingBottom: 16,
    alignItems: 'center',
  },
  ludoBoardContainer: {
    width: EXACT_BOARD_SIZE,
    height: EXACT_BOARD_SIZE,
    backgroundColor: '#050816',
    borderWidth: 2,
    borderColor: '#1e293b',
    borderRadius: 10,
    overflow: 'hidden',
    marginVertical: 6,
  },
  ludoRow: {
    flexDirection: 'row',
  },
  ludoCell: {
    width: CELL,
    height: CELL,
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  tokenPill: {
    width: CELL * 0.72,
    height: CELL * 0.72,
    borderRadius: (CELL * 0.72) / 2,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#ffffff',
    elevation: 3,
  },
  tokenInnerDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#ffffff',
  },
  movableTokenGlow: {
    borderColor: '#00e5ff',
    borderWidth: 2.5,
  },
  cardSubText: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: '600',
  },
});
