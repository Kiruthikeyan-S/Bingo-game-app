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
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import Svg, { Path, Circle, Rect, G } from 'react-native-svg';
import { Chess } from 'chess.js';
import {
  RotateCcw,
  Flag,
  RotateCw,
  AlertTriangle,
  Crown,
  History,
} from 'lucide-react-native';
import { GameHeader } from '../../components/GameHeader';
import { useGameStore } from '../../store/gameStore';
import { usePlayerStore } from '../../store/playerStore';
import { ChessEngine } from '../../engines/chess/engine';
import { ChessBot } from '../../engines/chess/bot';
import { socketService } from '../../services/socket';
import { multiplayerService } from '../../services/multiplayerService';
import {
  ChessColor,
  ChessPieceSymbol,
  ChessState,
  PlayerScoreSummary,
} from '../../../shared/types';

const { width } = Dimensions.get('window');
const BOARD_PADDING = 20;
const EVAL_BAR_WIDTH = 14;
const BOARD_MAX_WIDTH = Math.min(width - BOARD_PADDING * 2 - EVAL_BAR_WIDTH - 8, 360);
const SQUARE_SIZE = Math.floor(BOARD_MAX_WIDTH / 8);
const EXACT_BOARD_SIZE = SQUARE_SIZE * 8;

const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
const RANKS = ['8', '7', '6', '5', '4', '3', '2', '1'];

/**
 * Clean Play-Store-ready SVG Vector Chess Piece Renderer
 */
const ChessPieceVector: React.FC<{
  type: ChessPieceSymbol;
  color: ChessColor;
  size?: number;
}> = ({ type, color, size = SQUARE_SIZE * 0.82 }) => {
  const isWhite = color === 'w';
  const fill = isWhite ? '#FFFFFF' : '#1E293B';
  const stroke = isWhite ? '#334155' : '#0F172A';

  return (
    <Svg width={size} height={size} viewBox="0 0 45 45">
      <G fill={fill} stroke={stroke} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
        {type === 'p' && (
          <>
            <Circle cx="22.5" cy="11.5" r="5.5" />
            <Path d="M19.5 17 C16 23 16 28 17 33 L28 33 C29 28 29 23 25.5 17 Z" />
            <Path d="M18 19 C21 20 24 20 27 19" stroke={stroke} strokeWidth={1.5} fill="none" />
            <Rect x="13.5" y="33" width="18" height="4.5" rx="2" />
            <Rect x="11.5" y="37.5" width="22" height="3" rx="1.5" />
          </>
        )}
        {type === 'r' && (
          <>
            <Path d="M12 11 L12 16 L16 16 L16 13 L19.5 13 L19.5 16 L25.5 16 L25.5 13 L29 13 L29 16 L33 16 L33 11 Z" />
            <Path d="M14 16 L15.5 32 L29.5 32 L31 16 Z" />
            <Path d="M14 20 L31 20" stroke={stroke} strokeWidth={1.5} fill="none" />
            <Rect x="12" y="32" width="21" height="5" rx="1" />
            <Rect x="10" y="37" width="25" height="3.5" rx="1.5" />
          </>
        )}
        {type === 'n' && (
          <>
            <Path d="M14 36 L15 28 C13 25 11 20 15 13 C17 9 22 9 25 11 C26 8 28 8 29 10 C32 14 33 22 32 30 L31 36 Z" />
            <Path d="M15 21 C18 20 23 22 25 25 C23 27 21 28 16 26" fill={fill} />
            <Circle cx="21" cy="15" r="1.5" fill={stroke} />
            <Path d="M18 12 L19 14" stroke={stroke} strokeWidth={1.5} />
            <Rect x="11" y="36" width="23" height="4.5" rx="2" />
          </>
        )}
        {type === 'b' && (
          <>
            <Circle cx="22.5" cy="8.5" r="2.2" />
            <Path d="M15 32 C13 24 16 14 22.5 12 C29 14 32 24 30 32 Z" />
            <Path d="M21 17 L24 23 M19.5 20 L25.5 20" stroke={stroke} strokeWidth={1.8} />
            <Path d="M18 27 C21 28.5 24 28.5 27 27" stroke={stroke} strokeWidth={1.5} fill="none" />
            <Rect x="13.5" y="32" width="18" height="4.5" rx="1.5" />
            <Rect x="11" y="36.5" width="23" height="3.5" rx="1.5" />
          </>
        )}
        {type === 'q' && (
          <>
            <Circle cx="10" cy="13" r="2" />
            <Circle cx="16" cy="10" r="2" />
            <Circle cx="22.5" cy="8.5" r="2" />
            <Circle cx="29" cy="10" r="2" />
            <Circle cx="35" cy="13" r="2" />
            <Path d="M10.5 15 L14 26 L18 12 L22.5 24 L27 12 L31 26 L34.5 15 L32 32 L13 32 Z" />
            <Path d="M14 26 C19 28 26 28 31 26" stroke={stroke} strokeWidth={1.5} fill="none" />
            <Rect x="12" y="32" width="21" height="4.5" rx="1.5" />
            <Rect x="10" y="36.5" width="25" height="3.5" rx="1.5" />
          </>
        )}
        {type === 'k' && (
          <>
            <Path d="M22.5 5.5 L22.5 11.5 M19.5 8.5 L25.5 8.5" stroke={stroke} strokeWidth={2.2} />
            <Circle cx="22.5" cy="12.5" r="2" />
            <Path d="M14 18 C14 13.5 31 13.5 31 18 C30 24 31 28 29.5 32 L15.5 32 C14 28 15 24 14 18 Z" />
            <Path d="M17 21 C21 23 24 23 28 21" stroke={stroke} strokeWidth={1.6} fill="none" />
            <Path d="M16 27 C21 29 24 29 29 27" stroke={stroke} strokeWidth={1.6} fill="none" />
            <Rect x="12" y="32" width="21" height="4.5" rx="1.5" />
            <Rect x="10" y="36.5" width="25" height="3.5" rx="1.5" />
          </>
        )}
      </G>
    </Svg>
  );
};

export default function ChessScreen() {
  const router = useRouter();
  const playerId = usePlayerStore((s) => s.playerId);
  const username = usePlayerStore((s) => s.username);
  const hapticsEnabled = usePlayerStore((s) => s.hapticsEnabled);
  const recordMatchResult = usePlayerStore((s) => s.recordMatchResult);

  const gameMode = useGameStore((s) => s.gameMode);
  const botDifficulty = useGameStore((s) => s.botDifficulty);
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

  const activeState = isBotMode
    ? localChessState
    : onlineChessState || localChessState;

  const myColor: ChessColor =
    !isBotMode && activeState.blackPlayerId === playerId ? 'b' : 'w';
  const isMyTurn = activeState.turn === myColor;

  const botRef = useRef(new ChessBot(botDifficulty));
  useEffect(() => {
    botRef.current.changeDifficulty(botDifficulty);
  }, [botDifficulty]);

  const boardMatrix = useMemo(() => {
    try {
      const c = new Chess(activeState.fen);
      return c.board();
    } catch {
      return new Chess().board();
    }
  }, [activeState.fen]);

  const legalTargets = useMemo(() => {
    if (!selectedSquare || !isMyTurn) return [];
    return ChessEngine.getLegalMovesFromSquare(activeState.fen, selectedSquare);
  }, [activeState.fen, selectedSquare, isMyTurn]);

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
        username: `Grandmaster Bot (${diffLabel})`,
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
      opponentName: `Grandmaster Bot (${diffLabel})`,
      result: winner === null ? 'draw' : winner === playerId ? 'win' : 'loss',
      resultReason: String(reason),
      movesCount: finishedState.moveHistory.length,
    });
    router.push('/results');
  };

  // Fast Computer move execution in Solo mode (sub-200ms)
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
            finalizeBotMatch(res.state, res.winnerId || null, res.resultType || 'draw');
          }
        }
      },
      {
        minDelayMs: 120,
        maxDelayMs: 190,
        isGameActive: () => !cancelled,
      }
    );

    return () => {
      cancelled = true;
    };
  }, [isBotMode, localChessState]);

  const executeChessMove = async (
    from: string,
    to: string,
    promotion?: 'q' | 'r' | 'b' | 'n'
  ) => {
    setSelectedSquare(null);
    setPendingPromotion(null);

    if (isBotMode) {
      const res = ChessEngine.applyMove(localChessState, {
        from,
        to,
        promotion,
      });
      if (!res.success || !res.state) {
        Alert.alert('Illegal Move', res.error || 'Cannot make that move');
        return;
      }
      setLocalChessState(res.state);
      if (hapticsEnabled) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
      }
      if (res.isGameOver) {
        finalizeBotMatch(res.state, res.winnerId || null, res.resultType || 'draw');
      }
    } else {
      const res = await socketService.chessMove({ from, to, promotion });
      if (!res.success) {
        Alert.alert('Invalid Move', res.error || 'Move rejected by server');
      }
    }
  };

  const handleSquarePress = (square: string, pieceColor?: ChessColor) => {
    if (!isMyTurn || botThinking) return;

    const matchingTarget = legalTargets.find((t) => t.to === square);
    if (selectedSquare && matchingTarget) {
      if (matchingTarget.isPromotion) {
        setPendingPromotion({ from: selectedSquare, to: square });
        return;
      }
      executeChessMove(selectedSquare, square);
      return;
    }

    if (pieceColor === myColor) {
      setSelectedSquare(square === selectedSquare ? null : square);
    } else {
      setSelectedSquare(null);
    }
  };

  const handleUndo = () => {
    if (!isBotMode || botThinking || localChessState.moveHistory.length === 0) {
      return;
    }
    const count = localChessState.turn === 'w' ? 2 : 1;
    setLocalChessState(ChessEngine.undoMoves(localChessState, count));
    setSelectedSquare(null);
  };

  const handleRestart = () => {
    if (isBotMode) {
      setLocalChessState(ChessEngine.createInitialState(playerId, botId));
      setSelectedSquare(null);
    } else {
      Alert.alert('Multiplayer', 'In multiplayer, use Resign to end the current match.');
    }
  };

  const handleResign = () => {
    Alert.alert(
      'Resign Match?',
      'Are you sure you want to resign and forfeit this chess duel?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Resign',
          style: 'destructive',
          onPress: async () => {
            if (isBotMode) {
              finalizeBotMatch(localChessState, botId, 'resign');
            } else {
              const store = useGameStore.getState();
              if (store.roomCode) {
                await multiplayerService.resignChess(store.roomCode, playerId);
              } else {
                await socketService.chessResign();
              }
            }
          },
        },
      ]
    );
  };

  const diffCapitalized =
    botDifficulty.charAt(0).toUpperCase() + botDifficulty.slice(1);
  const opponentName = isBotMode
    ? `Grandmaster_${diffCapitalized}`
    : Object.values(players).find((p) => p.id !== playerId)?.username || 'Grandmaster_Nova';

  return (
    <SafeAreaView style={styles.safeArea}>
      <GameHeader
        title="Chess Arena"
        subtitle="1v1 Tactical Duel"
        onBackPress={handleResign}
      />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Top Opponent Card (Black) */}
        <View style={styles.opponentCard}>
          <View style={styles.playerCardLeft}>
            <View style={styles.avatarWrapper}>
              <Image
                source={{
                  uri: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100',
                }}
                style={styles.playerAvatar}
              />
              <View style={styles.flagBadge}>
                <Text style={styles.flagText}>🇳🇴</Text>
              </View>
            </View>

            <View style={styles.playerDetails}>
              <View style={styles.nameRow}>
                <Text style={styles.playerNameText} numberOfLines={1}>
                  {opponentName}
                </Text>
                <View style={styles.gmBadge}>
                  <Text style={styles.gmBadgeText}>GM</Text>
                </View>
              </View>
              <View style={styles.metaRow}>
                <Text style={styles.eloText}>2140 ELO</Text>
                {/* Captured pieces tray */}
                <View style={styles.capturedTray}>
                  {(myColor === 'w'
                    ? activeState.capturedByBlack
                    : activeState.capturedByWhite
                  ).slice(0, 5).map((p, idx) => (
                    <Text key={idx} style={styles.capturedSymbol}>
                      {p === 'p' ? '♙' : p === 'n' ? '♘' : p === 'b' ? '♗' : p === 'r' ? '♖' : '♕'}
                    </Text>
                  ))}
                </View>
              </View>
            </View>
          </View>

          {/* Opponent Clock */}
          <View style={styles.clockBox}>
            <View style={[styles.clockPill, !isMyTurn && styles.clockPillActive]}>
              <View
                style={[
                  styles.clockDot,
                  !isMyTurn && styles.clockDotActive,
                ]}
              />
              <Text style={styles.clockText}>
                {botThinking ? 'Thinking' : '04:32'}
              </Text>
            </View>
            <Text style={styles.clockSubText}>Rapid 10+0</Text>
          </View>
        </View>

        {/* Check Alert Banner */}
        {activeState.inCheck && (
          <View style={styles.checkBanner}>
            <AlertTriangle size={16} color="#EF4444" />
            <Text style={styles.checkBannerText}>
              CHECK — Protect the {activeState.turn === 'w' ? 'White' : 'Black'} King
            </Text>
          </View>
        )}

        {/* Board Arena Area with Integrated Evaluation Bar */}
        <View style={styles.arenaRow}>
          {/* Slim Modern Evaluation Bar */}
          <View style={styles.evalBar}>
            <View style={styles.evalBlack} />
            <View style={styles.evalWhite} />
            <Text style={styles.evalLabel}>+0.4</Text>
          </View>

          {/* 8x8 Classic Tournament Chessboard Container */}
          <View style={styles.boardContainer}>
            <View style={styles.boardGrid}>
              {boardMatrix.map((row, rIdx) => (
                <View key={rIdx} style={styles.boardRow}>
                  {row.map((cell, cIdx) => {
                    const squareName = `${FILES[cIdx]}${RANKS[rIdx]}`;
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
                        activeOpacity={0.88}
                        onPress={() => handleSquarePress(squareName, cell?.color as ChessColor)}
                        style={[
                          styles.square,
                          isLightSquare ? styles.squareLight : styles.squareDark,
                          isLastMove && styles.squareLastMove,
                          isSelected && styles.squareSelected,
                          isKingInCheck && styles.squareCheck,
                        ]}
                      >
                        {/* Rank Coordinate on File A */}
                        {cIdx === 0 && (
                          <Text
                            style={[
                              styles.rankText,
                              { color: isLightSquare ? '#B58863' : '#F0D9B5' },
                            ]}
                          >
                            {RANKS[rIdx]}
                          </Text>
                        )}

                        {/* File Coordinate on Rank 1 */}
                        {rIdx === 7 && (
                          <Text
                            style={[
                              styles.fileText,
                              { color: isLightSquare ? '#B58863' : '#F0D9B5' },
                            ]}
                          >
                            {FILES[cIdx]}
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
          </View>
        </View>

        {/* Bottom Player Profile Card (White / User) */}
        <View style={styles.userCard}>
          <View style={styles.playerCardLeft}>
            <View style={styles.avatarWrapper}>
              <Image
                source={{
                  uri: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=100',
                }}
                style={[styles.playerAvatar, { borderColor: '#4F46E5' }]}
              />
              <View style={styles.flagBadge}>
                <Text style={styles.flagText}>🇺🇸</Text>
              </View>
            </View>

            <View style={styles.playerDetails}>
              <View style={styles.nameRow}>
                <Text style={styles.playerNameText} numberOfLines={1}>
                  {username || 'CyberCrown_You'}
                </Text>
                <View style={styles.youBadge}>
                  <Text style={styles.youBadgeText}>YOU</Text>
                </View>
              </View>
              <View style={styles.metaRow}>
                <Text style={[styles.eloText, { color: '#4F46E5', fontWeight: '700' }]}>
                  1980 ELO
                </Text>
                {/* Captured pieces tray */}
                <View style={styles.capturedTray}>
                  {(myColor === 'w'
                    ? activeState.capturedByWhite
                    : activeState.capturedByBlack
                  ).slice(0, 5).map((p, idx) => (
                    <Text key={idx} style={[styles.capturedSymbol, { color: '#0F172A' }]}>
                      {p === 'p' ? '♟' : p === 'n' ? '♞' : p === 'b' ? '♝' : p === 'r' ? '♜' : '♛'}
                    </Text>
                  ))}
                </View>
              </View>
            </View>
          </View>

          {/* User Clock */}
          <View style={styles.clockBox}>
            <View
              style={[
                styles.clockPill,
                isMyTurn && styles.clockPillActiveUser,
              ]}
            >
              {isMyTurn && <View style={[styles.clockDot, styles.clockDotPing]} />}
              <Text
                style={[
                  styles.clockText,
                  isMyTurn && { color: '#4F46E5', fontWeight: '800' },
                ]}
              >
                05:48
              </Text>
            </View>
            <Text
              style={[
                styles.clockSubText,
                isMyTurn && { color: '#4F46E5', fontWeight: '700' },
              ]}
            >
              {isMyTurn ? 'Your Move' : 'Waiting'}
            </Text>
          </View>
        </View>

        {/* Move-History Horizontal Drawer / Feed matching Stitch */}
        <View style={styles.notationCard}>
          <View style={styles.notationHeader}>
            <View style={styles.notationTitleRow}>
              <History size={16} color="#4F46E5" />
              <Text style={styles.notationTitle}>NOTATION FEED</Text>
            </View>
            <Text style={styles.openingText}>
              {activeState.moveHistory.length > 0
                ? `${activeState.moveHistory.length} Moves Played`
                : 'Standard Opening'}
            </Text>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.notationStream}>
            <View style={styles.notationStreamRow}>
              {activeState.moveHistory.length === 0 ? (
                <View style={styles.emptyNotationBox}>
                  <Text style={styles.emptyNotationText}>
                    Select any White pawn or knight to open match
                  </Text>
                </View>
              ) : (
                activeState.moveHistory.map((m, idx) => {
                  const isLast = idx === activeState.moveHistory.length - 1;
                  return (
                    <View
                      key={idx}
                      style={[
                        styles.notationChip,
                        isLast && styles.notationChipActive,
                      ]}
                    >
                      {idx % 2 === 0 && (
                        <Text
                          style={[
                            styles.notationNum,
                            isLast && { color: '#4F46E5' },
                          ]}
                        >
                          {Math.floor(idx / 2) + 1}.
                        </Text>
                      )}
                      <Text
                        style={[
                          styles.notationSan,
                          isLast && styles.notationSanActive,
                        ]}
                      >
                        {m.san}
                      </Text>
                    </View>
                  );
                })
              )}
            </View>
          </ScrollView>
        </View>

        {/* Tactical Action Dock */}
        <View style={styles.actionDock}>
          <TouchableOpacity
            style={[
              styles.dockBtn,
              (localChessState.moveHistory.length === 0 || botThinking) &&
                styles.dockBtnDisabled,
            ]}
            onPress={handleUndo}
            disabled={localChessState.moveHistory.length === 0 || botThinking}
            activeOpacity={0.8}
          >
            <RotateCcw size={18} color="#475569" />
            <Text style={styles.dockBtnText}>Undo</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.dockBtn, styles.dockBtnPrimary]}
            onPress={handleRestart}
            activeOpacity={0.88}
          >
            <RotateCw size={18} color="#FFFFFF" />
            <Text style={styles.dockBtnPrimaryText}>New Game</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.dockBtn, styles.dockBtnResign]}
            onPress={handleResign}
            activeOpacity={0.8}
          >
            <Flag size={18} color="#EF4444" />
            <Text style={styles.dockBtnResignText}>Resign</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Pawn Promotion Picker Modal */}
      <Modal
        visible={Boolean(pendingPromotion)}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setPendingPromotion(null)}
      >
        <View style={styles.promoOverlay}>
          <View style={styles.promoCard}>
            <Crown size={28} color="#D97706" />
            <Text style={styles.promoTitle}>Promote Pawn</Text>
            <Text style={styles.promoSubtitle}>Select promotion piece:</Text>
            <View style={styles.promoOptionsRow}>
              {(['q', 'r', 'b', 'n'] as Array<'q' | 'r' | 'b' | 'n'>).map(
                (pieceType) => (
                  <TouchableOpacity
                    key={pieceType}
                    style={styles.promoOptionBtn}
                    onPress={() => {
                      if (pendingPromotion) {
                        executeChessMove(
                          pendingPromotion.from,
                          pendingPromotion.to,
                          pieceType
                        );
                      }
                    }}
                    activeOpacity={0.8}
                  >
                    <ChessPieceVector
                      type={pieceType}
                      color={myColor}
                      size={36}
                    />
                    <Text style={styles.promoPieceLabel}>
                      {pieceType === 'q'
                        ? 'Queen'
                        : pieceType === 'r'
                        ? 'Rook'
                        : pieceType === 'b'
                        ? 'Bishop'
                        : 'Knight'}
                    </Text>
                  </TouchableOpacity>
                )
              )}
            </View>
          </View>
        </View>
      </Modal>
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
  opponentCard: {
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
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 12,
    borderWidth: 1.5,
    borderColor: '#C7D2FE',
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  playerCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  avatarWrapper: {
    position: 'relative',
  },
  playerAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F1F5F9',
    borderWidth: 2,
    borderColor: '#E2E8F0',
  },
  flagBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: '#F1F5F9',
    borderRadius: 6,
    paddingHorizontal: 2,
  },
  flagText: {
    fontSize: 10,
  },
  playerDetails: {
    flex: 1,
    gap: 2,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  playerNameText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  gmBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  gmBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#334155',
  },
  youBadge: {
    backgroundColor: '#4F46E5',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
  },
  youBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  eloText: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
  },
  capturedTray: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  capturedSymbol: {
    fontSize: 14,
    color: '#64748B',
  },
  clockBox: {
    alignItems: 'flex-end',
  },
  clockPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    gap: 6,
  },
  clockPillActive: {
    backgroundColor: '#F8FAFC',
    borderColor: '#CBD5E1',
    borderWidth: 1,
  },
  clockPillActiveUser: {
    backgroundColor: '#EEF2FF',
    borderColor: '#C7D2FE',
    borderWidth: 1,
  },
  clockDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#94A3B8',
  },
  clockDotActive: {
    backgroundColor: '#0F172A',
  },
  clockDotPing: {
    backgroundColor: '#4F46E5',
  },
  clockText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
    fontFamily: 'monospace',
  },
  clockSubText: {
    fontSize: 10,
    color: '#94A3B8',
    marginTop: 2,
    fontWeight: '600',
  },
  checkBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECDD3',
    borderRadius: 12,
    padding: 8,
    gap: 6,
  },
  checkBannerText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#EF4444',
  },
  arenaRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'stretch',
    gap: 8,
  },
  evalBar: {
    width: EVAL_BAR_WIDTH,
    borderRadius: 8,
    backgroundColor: '#E2E8F0',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    overflow: 'hidden',
    position: 'relative',
    justifyContent: 'space-between',
    padding: 1,
  },
  evalBlack: {
    width: '100%',
    height: '46%',
    backgroundColor: '#334155',
    borderRadius: 6,
  },
  evalWhite: {
    width: '100%',
    height: '54%',
    backgroundColor: '#FFFFFF',
    borderRadius: 6,
  },
  evalLabel: {
    position: 'absolute',
    alignSelf: 'center',
    top: '46%',
    fontSize: 7,
    fontWeight: '800',
    color: '#0F172A',
    fontFamily: 'monospace',
  },
  boardContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 6,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  boardGrid: {
    width: EXACT_BOARD_SIZE,
    height: EXACT_BOARD_SIZE,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#B58863',
  },
  boardRow: {
    flexDirection: 'row',
  },
  square: {
    width: SQUARE_SIZE,
    height: SQUARE_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  squareLight: {
    backgroundColor: '#F0D9B5',
  },
  squareDark: {
    backgroundColor: '#B58863',
  },
  squareLastMove: {
    backgroundColor: '#C5D37C',
  },
  squareSelected: {
    backgroundColor: '#B8D8D8',
    borderWidth: 2,
    borderColor: '#4F46E5',
  },
  squareCheck: {
    backgroundColor: '#F87171',
  },
  rankText: {
    position: 'absolute',
    top: 2,
    left: 3,
    fontSize: 9,
    fontWeight: '800',
    fontFamily: 'monospace',
  },
  fileText: {
    position: 'absolute',
    bottom: 2,
    right: 3,
    fontSize: 9,
    fontWeight: '800',
    fontFamily: 'monospace',
  },
  legalMoveDot: {
    position: 'absolute',
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: 'rgba(79, 70, 229, 0.45)',
  },
  captureRing: {
    position: 'absolute',
    width: SQUARE_SIZE * 0.85,
    height: SQUARE_SIZE * 0.85,
    borderRadius: (SQUARE_SIZE * 0.85) / 2,
    borderWidth: 3,
    borderColor: 'rgba(239, 68, 68, 0.65)',
  },
  notationCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 8,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  notationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  notationTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  notationTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#4F46E5',
    letterSpacing: 0.8,
  },
  openingText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
  },
  notationStream: {
    maxHeight: 38,
  },
  notationStreamRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  emptyNotationBox: {
    paddingVertical: 4,
  },
  emptyNotationText: {
    fontSize: 12,
    color: '#94A3B8',
    fontStyle: 'italic',
  },
  notationChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    gap: 4,
  },
  notationChipActive: {
    backgroundColor: '#EEF2FF',
    borderWidth: 1,
    borderColor: '#C7D2FE',
  },
  notationNum: {
    fontSize: 11,
    color: '#64748B',
    fontFamily: 'monospace',
  },
  notationSan: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
    fontFamily: 'monospace',
  },
  notationSanActive: {
    color: '#4F46E5',
    fontWeight: '800',
  },
  actionDock: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 2,
  },
  dockBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 6,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
  },
  dockBtnDisabled: {
    opacity: 0.45,
  },
  dockBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#475569',
  },
  dockBtnPrimary: {
    backgroundColor: '#4F46E5',
    borderColor: '#4F46E5',
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  dockBtnPrimaryText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  dockBtnResign: {
    borderColor: '#FECDD3',
    backgroundColor: '#FFF1F2',
  },
  dockBtnResignText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#EF4444',
  },
  promoOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  promoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 24,
    alignItems: 'center',
    width: '100%',
    maxWidth: 320,
    gap: 10,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 5,
  },
  promoTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
  },
  promoSubtitle: {
    fontSize: 13,
    color: '#64748B',
  },
  promoOptionsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  promoOptionBtn: {
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 10,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
  },
  promoPieceLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#475569',
    marginTop: 4,
  },
});