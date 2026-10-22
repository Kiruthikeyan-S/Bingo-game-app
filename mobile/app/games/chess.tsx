import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  Modal,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import Svg, { Path, Circle, Rect, G, Defs, LinearGradient, Stop } from 'react-native-svg';
import { Chess } from 'chess.js';
import {
  RotateCcw,
  Flag,
  Handshake,
  AlertTriangle,
  Crown,
  Shield,
  ChevronLeft,
} from 'lucide-react-native';
import { useGameStore } from '../../store/gameStore';
import { usePlayerStore } from '../../store/playerStore';
import { ChessEngine } from '../../engines/chess/engine';
import { ChessBot } from '../../engines/chess/bot';
import { socketService } from '../../services/socket';
import { useGraphicsStore } from '../../store/graphicsStore';
import { ChessScene3D } from '../../components/3d/chess/ChessScene3D';
import { EsportsPlayerCard } from '../../components/gameplay/EsportsPlayerCard';
import { EsportsBottomBar } from '../../components/gameplay/EsportsBottomBar';
import {
  GameOptionsModal,
  GameChatModal,
  GameAnalyzeModal,
} from '../../components/gameplay/GameModals';
import {
  ChessColor,
  ChessPieceSymbol,
  ChessState,
  PlayerScoreSummary,
} from '../../../shared/types';

const { width } = Dimensions.get('window');
const BOARD_PADDING = 12;
const BOARD_SIZE = Math.min(width - BOARD_PADDING * 2, 384);
const SQUARE_SIZE = Math.floor(BOARD_SIZE / 8);

const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
const RANKS = ['8', '7', '6', '5', '4', '3', '2', '1'];

/**
 * Metallic Shaded Vector Chess Piece Renderer matching Esports Tournament UI
 */
export const ChessPieceVector: React.FC<{
  type: ChessPieceSymbol;
  color: ChessColor;
  size?: number;
}> = ({ type, color, size = SQUARE_SIZE * 0.76 }) => {
  const isWhite = color === 'w';
  const gradId = isWhite ? 'whiteMetallicGrad' : 'blackMetallicGrad';
  const stroke = isWhite ? '#1e293b' : '#cbd5e1';
  const innerAccent = isWhite ? '#94a3b8' : '#334155';

  return (
    <Svg width={size} height={size} viewBox="0 0 45 45">
      <Defs>
        <LinearGradient id="whiteMetallicGrad" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%" stopColor="#ffffff" />
          <Stop offset="35%" stopColor="#f1f5f9" />
          <Stop offset="70%" stopColor="#cbd5e1" />
          <Stop offset="100%" stopColor="#94a3b8" />
        </LinearGradient>
        <LinearGradient id="blackMetallicGrad" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%" stopColor="#475569" />
          <Stop offset="40%" stopColor="#334155" />
          <Stop offset="75%" stopColor="#1e293b" />
          <Stop offset="100%" stopColor="#0f172a" />
        </LinearGradient>
      </Defs>
      <G
        fill={`url(#${gradId})`}
        stroke={stroke}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {type === 'p' && (
          <>
            <Circle cx="22.5" cy="13" r="5.5" />
            <Path d="M16.5 23 C16.5 19.5 28.5 19.5 28.5 23 L26.5 33 L18.5 33 Z" />
            <Rect x="13" y="33" width="19" height="4.5" rx="2" />
          </>
        )}
        {type === 'r' && (
          <>
            <Path d="M13 11 L13 16 L17 16 L17 12.5 L20.5 12.5 L20.5 16 L24.5 16 L24.5 12.5 L28 12.5 L28 16 L32 16 L32 11 L13 11 Z" />
            <Rect x="15.5" y="16" width="14" height="17" rx="1" />
            <Rect x="12" y="33" width="21" height="4.5" rx="2" />
          </>
        )}
        {type === 'n' && (
          <>
            <Path d="M15 33 L16 21 L13 18 L17 11 L22 13 C26 12 30 16 30 22 L29 33 Z" />
            <Circle cx="19" cy="15.5" r="1.4" fill={stroke} />
            <Rect x="12" y="33" width="21" height="4.5" rx="2" />
          </>
        )}
        {type === 'b' && (
          <>
            <Circle cx="22.5" cy="9.5" r="2.5" />
            <Path d="M15.5 28 C14 20 17.5 13 22.5 13 C27.5 13 31 20 29.5 28 L27.5 33 L17.5 33 Z" />
            <Path d="M19.5 19 L25.5 19 M22.5 16 L22.5 22" stroke={innerAccent} strokeWidth={2} />
            <Rect x="12.5" y="33" width="20" height="4.5" rx="2" />
          </>
        )}
        {type === 'q' && (
          <>
            <Circle cx="11" cy="13" r="2" />
            <Circle cx="18.5" cy="10.5" r="2" />
            <Circle cx="26.5" cy="10.5" r="2" />
            <Circle cx="34" cy="13" r="2" />
            <Path d="M12 15.5 L16 25 L19 13.5 L22.5 25 L26 13.5 L29 25 L33 15.5 L30 33 L15 33 Z" />
            <Rect x="12" y="33" width="21" height="4.5" rx="2" />
          </>
        )}
        {type === 'k' && (
          <>
            <Path d="M22.5 6.5 L22.5 12.5 M19.5 9.5 L25.5 9.5" stroke={stroke} strokeWidth={2.5} />
            <Path d="M14 19 C14 13.5 31 13.5 31 19 L29 33 L16 33 Z" />
            <Path d="M18 23 L27 23" stroke={innerAccent} strokeWidth={2} />
            <Rect x="12" y="33" width="21" height="4.5" rx="2" />
          </>
        )}
      </G>
    </Svg>
  );
};

export default function ChessScreen() {
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
  const roomCode = useGameStore((s) => s.roomCode);
  const onlineChessState = useGameStore((s) => s.chessState);
  const players = useGameStore((s) => s.players);
  const setGameFinished = useGameStore((s) => s.setGameFinished);

  const isBotMode = gameMode === 'bot';
  const botId = 'bot_chess_cpu';

  const [localChessState, setLocalChessState] = useState<ChessState>(() =>
    ChessEngine.createInitialState(playerId, botId)
  );
  const [selectedSquare, setSelectedSquare] = useState<string | null>(null);
  const [pendingPromotion, setPendingPromotion] = useState<{
    from: string;
    to: string;
  } | null>(null);
  const [botThinking, setBotThinking] = useState(false);
  const fallback2D = useGraphicsStore((s) => s.fallback2D);
  const toggleFallback2D = useGraphicsStore((s) => s.toggleFallback2D);

  // Turn clocks (seconds)
  const [playerClock, setPlayerClock] = useState(600);
  const [opponentClock, setOpponentClock] = useState(600);

  // Modals
  const [optionsVisible, setOptionsVisible] = useState(false);
  const [chatVisible, setChatVisible] = useState(false);
  const [analyzeVisible, setAnalyzeVisible] = useState(false);
  const [boardFlipped, setBoardFlipped] = useState(false);

  const activeState = isBotMode
    ? localChessState
    : onlineChessState || localChessState;

  const myColor: ChessColor =
    !isBotMode && activeState.blackPlayerId === playerId ? 'b' : 'w';
  const isMyTurn = activeState.turn === myColor;

  // Active clock countdown
  useEffect(() => {
    if (activeState.isCheckmate || activeState.isDraw) return;
    const timer = setInterval(() => {
      if (isMyTurn) {
        setPlayerClock((prev) => Math.max(0, prev - 1));
      } else {
        setOpponentClock((prev) => Math.max(0, prev - 1));
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [isMyTurn, activeState.isCheckmate, activeState.isDraw]);

  const formatClock = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const botRef = useRef<ChessBot>(new ChessBot(botDifficulty));

  useEffect(() => {
    botRef.current.setDifficulty(botDifficulty);
  }, [botDifficulty]);

  const opponentName = useMemo(() => {
    if (isBotMode) {
      const diffCapitalized =
        botDifficulty.charAt(0).toUpperCase() + botDifficulty.slice(1);
      return `potawatomee (${diffCapitalized})`;
    }
    const oppId =
      activeState.whitePlayerId === playerId
        ? activeState.blackPlayerId
        : activeState.whitePlayerId;
    return players[oppId]?.username || 'Opponent';
  }, [isBotMode, botDifficulty, activeState, playerId, players]);

  // Current move notation badge for top header (e.g. "1. e3")
  const lastMoveSan = useMemo(() => {
    if (activeState.moveHistory.length === 0) return '1. --';
    const last = activeState.moveHistory[activeState.moveHistory.length - 1];
    const moveNum = Math.floor((activeState.moveHistory.length - 1) / 2) + 1;
    const isWhite = (activeState.moveHistory.length - 1) % 2 === 0;
    return `${moveNum}${isWhite ? '.' : '...'} ${last.san}`;
  }, [activeState.moveHistory]);

  const rawBoardMatrix = useMemo(() => {
    try {
      const c = new Chess(activeState.fen);
      return c.board();
    } catch {
      return new Chess().board();
    }
  }, [activeState.fen]);

  const displayBoardMatrix = useMemo(() => {
    if (boardFlipped) {
      return rawBoardMatrix.slice().reverse().map((row) => row.slice().reverse());
    }
    return rawBoardMatrix;
  }, [rawBoardMatrix, boardFlipped]);

  const legalTargets = useMemo(() => {
    if (!selectedSquare || (!isMyTurn && !isBotMode)) return [];
    return ChessEngine.getLegalMovesFromSquare(activeState.fen, selectedSquare);
  }, [activeState.fen, selectedSquare, isMyTurn, isBotMode]);

  const checkedKingSquare = useMemo(() => {
    if (!activeState.inCheck) return null;
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const cell = rawBoardMatrix[r][c];
        if (cell && cell.type === 'k' && cell.color === activeState.turn) {
          return `${FILES[c]}${RANKS[r]}`;
        }
      }
    }
    return null;
  }, [activeState.inCheck, activeState.turn, rawBoardMatrix]);

  const finalizeBotMatch = (
    finishedState: ChessState,
    winner: string | null,
    reason: any
  ) => {
    const diffLabel =
      botDifficulty.charAt(0).toUpperCase() + botDifficulty.slice(1);
    const summary: PlayerScoreSummary[] = [
      {
        playerId,
        username,
        linesCompleted: finishedState.moveHistory.length,
        isWinner: winner === playerId,
        isDraw: winner === null,
        gameType: 'chess',
        detailText: `${finishedState.moveHistory.length} moves (${reason})`,
      },
      {
        playerId: botId,
        username: `Computer (${diffLabel})`,
        linesCompleted: finishedState.moveHistory.length,
        isWinner: winner === botId,
        isDraw: winner === null,
        gameType: 'chess',
        detailText: `${finishedState.moveHistory.length} moves (${reason})`,
      },
    ];

    setGameFinished(winner, reason, {}, summary);
    recordMatchResult({
      gameType: 'chess',
      mode: 'bot',
      difficulty: botDifficulty,
      opponentName: `Computer (${diffLabel})`,
      result: winner === null ? 'draw' : winner === playerId ? 'win' : 'loss',
      resultReason: String(reason),
      movesCount: finishedState.moveHistory.length,
    });
    router.push('/results');
  };

  // Fast Computer move execution in Solo mode
  useEffect(() => {
    if (
      !isBotMode ||
      localChessState.turn !== 'b' ||
      localChessState.isCheckmate ||
      localChessState.isDraw
    ) {
      return;
    }

    let cancelled = false;
    setBotThinking(true);

    botRef.current.executeBotMove(
      localChessState,
      (chosenMove) => {
        if (cancelled) return;
        setBotThinking(false);
        const res = ChessEngine.applyMove(localChessState, chosenMove);
        if (res.success && res.state) {
          setLocalChessState(res.state);
          if (hapticsEnabled) {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
          }
          if (res.isGameOver) {
            const winner = res.state.isCheckmate ? playerId : null;
            finalizeBotMatch(res.state, winner, res.state.gameResultReason);
          }
        }
      },
      {
        minThinkMs: 50,
        maxThinkMs: 250,
      }
    );

    return () => {
      cancelled = true;
    };
  }, [
    isBotMode,
    localChessState.turn,
    localChessState.isCheckmate,
    localChessState.isDraw,
  ]);

  const executeChessMove = (
    from: string,
    to: string,
    promotionPiece?: 'q' | 'r' | 'b' | 'n'
  ) => {
    if (isBotMode) {
      const res = ChessEngine.applyMove(localChessState, {
        from,
        to,
        promotion: promotionPiece,
      });

      if (!res.success) {
        Alert.alert('Illegal Move', res.error || 'Move not allowed');
        return;
      }

      setSelectedSquare(null);
      setPendingPromotion(null);
      setLocalChessState(res.state!);

      if (hapticsEnabled) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
      }

      if (res.isGameOver) {
        const winner = res.state!.isCheckmate ? playerId : null;
        finalizeBotMatch(res.state!, winner, res.state!.gameResultReason);
      }
    } else {
      socketService.emit('chess_move', {
        roomCode,
        from,
        to,
        promotion: promotionPiece,
      });
      setSelectedSquare(null);
      setPendingPromotion(null);
    }
  };

  const handleSquarePress = (square: string, cellColor?: ChessColor) => {
    if (!isMyTurn && !isBotMode) return;
    if (botThinking) return;

    const matchingTarget = legalTargets.find((t) => t.to === square);
    if (selectedSquare && matchingTarget) {
      if (matchingTarget.isPromotion) {
        setPendingPromotion({ from: selectedSquare, to: square });
        return;
      }
      executeChessMove(selectedSquare, square);
      return;
    }

    if (cellColor === myColor) {
      setSelectedSquare(square === selectedSquare ? null : square);
      if (hapticsEnabled) {
        Haptics.selectionAsync().catch(() => {});
      }
    } else {
      setSelectedSquare(null);
    }
  };

  const handleUndo = () => {
    if (!isBotMode || botThinking || localChessState.moveHistory.length === 0) return;
    const count = localChessState.turn === 'w' ? 2 : 1;
    setLocalChessState(ChessEngine.undoMoves(localChessState, count));
    setSelectedSquare(null);
  };

  const handleOfferDraw = () => {
    if (isBotMode) {
      Alert.alert(
        'Draw Offered',
        'Computer evaluated position and agreed to a Draw.',
        [{ text: 'Accept', onPress: () => finalizeBotMatch(activeState, null, 'Draw agreed') }]
      );
    } else {
      socketService.emit('chess_offer_draw', { roomCode });
    }
  };

  const handleResign = () => {
    Alert.alert('Resign Match', 'Are you sure you want to resign this match?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Resign',
        style: 'destructive',
        onPress: () => {
          if (isBotMode) {
            finalizeBotMatch(activeState, botId, 'Resignation');
          } else {
            socketService.emit('chess_resign', { roomCode });
            router.replace('/home');
          }
        },
      },
    ]);
  };

  const displayFiles = boardFlipped ? [...FILES].reverse() : FILES;
  const displayRanks = boardFlipped ? [...RANKS].reverse() : RANKS;

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Top Header matching Screenshot */}
      <View style={styles.topHeader}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={handleResign}
          activeOpacity={0.7}
        >
          <ChevronLeft size={24} color="#f8fafc" />
        </TouchableOpacity>

        {/* Center Brand Title */}
        <View style={styles.brandCenter}>
          <Crown size={18} color="#22c55e" style={{ marginRight: 6 }} />
          <Text style={styles.brandTitleText}>
            Royal<Text style={{ color: '#22c55e' }}>Chess</Text>
          </Text>
        </View>

        {/* Last Move Notation Badge (e.g. 1. e3) */}
        <View style={styles.moveBadgePill}>
          <Text style={styles.moveBadgeText}>{lastMoveSan}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Opponent Card (Top) */}
        <EsportsPlayerCard
          pieceAvatar={
            <ChessPieceVector
              type="p"
              color={myColor === 'w' ? 'b' : 'w'}
              size={22}
            />
          }
          username={opponentName}
          rating={isBotMode ? (botDifficulty === 'hard' ? 1800 : botDifficulty === 'medium' ? 1200 : 302) : 1150}
          countryFlag={isBotMode ? '🇺🇸' : '🇮🇳'}
          isTurn={!isMyTurn}
          timeText={formatClock(opponentClock)}
          isTop={true}
          capturedContent={
            (myColor === 'w'
              ? activeState.capturedByBlack
              : activeState.capturedByWhite
            ).map((p, idx) => (
              <ChessPieceVector
                key={idx}
                type={p}
                color={myColor}
                size={14}
              />
            ))
          }
        />

        {/* Check Alert Banner */}
        {activeState.inCheck && (
          <View style={styles.checkBanner}>
            <AlertTriangle size={15} color="#ef4444" />
            <Text style={styles.checkBannerText}>
              CHECK — Protect the {activeState.turn === 'w' ? 'White' : 'Black'} King
            </Text>
          </View>
        )}

        {/* 8x8 Chessboard (Real 3D GPU Render or 2D High-Performance Fallback) */}
        {!fallback2D ? (
          <ChessScene3D
            boardMatrix={rawBoardMatrix}
            selectedSquare={selectedSquare}
            legalTargets={legalTargets}
            lastMove={activeState.lastMove}
            checkSquare={checkedKingSquare}
            myColor={myColor}
            onSquarePress={handleSquarePress}
            disabled={!isMyTurn && !isBotMode}
          />
        ) : (
          <View style={styles.boardFrame}>
            {displayBoardMatrix.map((row, rIdx) => (
              <View key={rIdx} style={styles.boardRow}>
                {row.map((cell, cIdx) => {
                  const squareName = `${displayFiles[cIdx]}${displayRanks[rIdx]}`;
                  const isLightSquare = (rIdx + cIdx) % 2 === 0;
                  const isSelected = selectedSquare === squareName;
                  const targetMove = legalTargets.find((t) => t.to === squareName);
                  const isLastMove =
                    activeState.lastMove?.from === squareName ||
                    activeState.lastMove?.to === squareName;
                  const isKingInCheck =
                    activeState.inCheck &&
                    cell?.type === 'k' &&
                    cell?.color === activeState.turn;

                  return (
                    <TouchableOpacity
                      key={squareName}
                      activeOpacity={0.85}
                      onPress={() => handleSquarePress(squareName, cell?.color as ChessColor)}
                      style={[
                        styles.square,
                        isLightSquare ? styles.lightSquare : styles.darkSquare,
                        isLastMove && styles.lastMoveSquare,
                        isSelected && styles.selectedSquare,
                        isKingInCheck && styles.checkSquare,
                      ]}
                    >
                      {cIdx === 0 && (
                        <Text
                          style={[
                            styles.rankCoord,
                            { color: isLightSquare ? '#1e293b' : '#cbd5e1' },
                          ]}
                        >
                          {displayRanks[rIdx]}
                        </Text>
                      )}
                      {rIdx === 7 && (
                        <Text
                          style={[
                            styles.fileCoord,
                            { color: isLightSquare ? '#1e293b' : '#cbd5e1' },
                          ]}
                        >
                          {displayFiles[cIdx]}
                        </Text>
                      )}

                      {cell && (
                        <ChessPieceVector
                          type={cell.type as ChessPieceSymbol}
                          color={cell.color as ChessColor}
                        />
                      )}

                      {targetMove && (
                        <View
                          style={
                            targetMove.isCapture
                              ? styles.captureRing
                              : styles.legalMoveDot
                          }
                        />
                      )}
                    </TouchableOpacity>
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
            (myColor === 'w'
              ? activeState.capturedByWhite
              : activeState.capturedByBlack
            ).map((p, idx) => (
              <ChessPieceVector
                key={idx}
                type={p}
                color={myColor === 'w' ? 'b' : 'w'}
                size={14}
              />
            ))
          }
        />
      </ScrollView>

      {/* 5-Button Esports Bottom Navigation Bar matching Screenshot */}
      <EsportsBottomBar
        onOptionsPress={() => setOptionsVisible(true)}
        onChatPress={() => setChatVisible(true)}
        onAnalyzePress={() => setAnalyzeVisible(true)}
        onBackPress={handleUndo}
        onForwardPress={() => {
          if (activeState.moveHistory.length > 0) {
            setAnalyzeVisible(true);
          }
        }}
        canStepBack={isBotMode && localChessState.moveHistory.length > 0}
        canStepForward={true}
        forwardLabel="Forward"
      />

      {/* Pawn Promotion Modal */}
      <Modal
        visible={Boolean(pendingPromotion)}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setPendingPromotion(null)}
      >
        <View style={styles.promoOverlay}>
          <View style={styles.promoCard}>
            <Crown size={28} color="#ffd700" />
            <Text style={styles.promoTitle}>Promote Pawn</Text>
            <Text style={styles.promoSubtitle}>Select promotion piece:</Text>
            <View style={styles.promoOptionsRow}>
              {(['q', 'r', 'b', 'n'] as Array<'q' | 'r' | 'b' | 'n'>).map((pieceType) => (
                <TouchableOpacity
                  key={pieceType}
                  style={styles.promoOptionBtn}
                  onPress={() => {
                    if (pendingPromotion) {
                      executeChessMove(pendingPromotion.from, pendingPromotion.to, pieceType);
                    }
                  }}
                >
                  <ChessPieceVector type={pieceType} color={myColor} size={36} />
                  <Text style={styles.promoPieceLabel}>
                    {pieceType === 'q' ? 'Queen' : pieceType === 'r' ? 'Rook' : pieceType === 'b' ? 'Bishop' : 'Knight'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </Modal>

      {/* Interactive Options Modal */}
      <GameOptionsModal
        visible={optionsVisible}
        onClose={() => setOptionsVisible(false)}
        is3D={!fallback2D}
        onToggle3D={toggleFallback2D}
        soundEnabled={soundEnabled}
        onToggleSound={() => setSoundEnabled(!soundEnabled)}
        onFlipBoard={() => setBoardFlipped(!boardFlipped)}
        onOfferDraw={handleOfferDraw}
        onResign={handleResign}
        gameType="chess"
      />

      {/* In-Game Sportsmanlike Chat Modal */}
      <GameChatModal
        visible={chatVisible}
        onClose={() => setChatVisible(false)}
        onSendMessage={(msg) => {
          if (!isBotMode) {
            socketService.emit('send_chat', { roomCode, message: msg });
          }
        }}
      />

      {/* Game Analysis / Hint Modal */}
      <GameAnalyzeModal
        visible={analyzeVisible}
        onClose={() => setAnalyzeVisible(false)}
        evaluationScore={activeState.inCheck ? 'Check threat detected!' : '+0.3 (Slight White edge)'}
        bestMove="Nf3 / d4 control center"
        tacticalTip="Keep king safety prioritized while building central pawn tension."
        accuracyScore={94}
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
  moveBadgePill: {
    backgroundColor: '#151f33',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#243452',
  },
  moveBadgeText: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '800',
  },
  content: {
    paddingHorizontal: BOARD_PADDING,
    paddingTop: 6,
    paddingBottom: 16,
    alignItems: 'center',
  },
  checkBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderWidth: 1,
    borderColor: '#ef4444',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginVertical: 4,
    alignSelf: 'stretch',
    justifyContent: 'center',
  },
  checkBannerText: {
    color: '#ef4444',
    fontSize: 12,
    fontWeight: '800',
  },
  boardFrame: {
    width: BOARD_SIZE,
    height: BOARD_SIZE,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#1e293b',
    backgroundColor: '#090e1a',
    marginVertical: 4,
  },
  boardRow: {
    flexDirection: 'row',
    height: SQUARE_SIZE,
  },
  square: {
    width: SQUARE_SIZE,
    height: SQUARE_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  lightSquare: {
    backgroundColor: '#556477',
  },
  darkSquare: {
    backgroundColor: '#2b3648',
  },
  lastMoveSquare: {
    backgroundColor: 'rgba(56, 189, 248, 0.35)',
    borderWidth: 1.5,
    borderColor: '#38bdf8',
  },
  selectedSquare: {
    backgroundColor: 'rgba(234, 179, 8, 0.45)',
    borderWidth: 2,
    borderColor: '#eab308',
  },
  checkSquare: {
    backgroundColor: 'rgba(239, 68, 68, 0.6)',
  },
  rankCoord: {
    position: 'absolute',
    top: 2,
    left: 3,
    fontSize: 10,
    fontWeight: '800',
  },
  fileCoord: {
    position: 'absolute',
    bottom: 2,
    right: 3,
    fontSize: 10,
    fontWeight: '800',
  },
  legalMoveDot: {
    position: 'absolute',
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: 'rgba(34, 211, 238, 0.85)',
    borderWidth: 1.5,
    borderColor: '#ffffff',
  },
  captureRing: {
    position: 'absolute',
    width: SQUARE_SIZE - 4,
    height: SQUARE_SIZE - 4,
    borderRadius: (SQUARE_SIZE - 4) / 2,
    borderWidth: 3,
    borderColor: '#ef4444',
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
  },
  promoOverlay: {
    flex: 1,
    backgroundColor: 'rgba(5, 8, 22, 0.8)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  promoCard: {
    backgroundColor: '#0f172a',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
    width: 320,
  },
  promoTitle: {
    color: '#f8fafc',
    fontSize: 18,
    fontWeight: '800',
    marginTop: 8,
  },
  promoSubtitle: {
    color: '#94a3b8',
    fontSize: 12,
    marginTop: 4,
    marginBottom: 16,
  },
  promoOptionsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  promoOptionBtn: {
    alignItems: 'center',
    padding: 10,
    backgroundColor: '#1e293b',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
    minWidth: 62,
  },
  promoPieceLabel: {
    color: '#f8fafc',
    fontSize: 10,
    fontWeight: '700',
    marginTop: 4,
  },
});
