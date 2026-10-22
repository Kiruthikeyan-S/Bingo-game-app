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
import Svg, { Path, Circle, Rect, G } from 'react-native-svg';
import { Chess } from 'chess.js';
import {
  RotateCcw,
  Flag,
  Handshake,
  AlertTriangle,
  Crown,
  Shield,
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
const BOARD_PADDING = 16;
const BOARD_SIZE = Math.min(width - BOARD_PADDING * 2, 384);
const SQUARE_SIZE = Math.floor(BOARD_SIZE / 8);

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
  const fill = isWhite ? '#FFFFFF' : '#312E2B';
  const stroke = isWhite ? '#272522' : '#181614';
  const highlight = isWhite ? '#F0F0F0' : '#45413D';

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

  const handleOfferDraw = () => {
    if (isBotMode) {
      Alert.alert(
        'Agree to Draw?',
        'End this match as a draw?',
        [
          { text: 'Keep Playing', style: 'cancel' },
          {
            text: 'Agree Draw',
            onPress: () => finalizeBotMatch(localChessState, null, 'draw'),
          },
        ]
      );
    } else {
      Alert.alert('Draw', 'Use Resign or complete the game on the board.');
    }
  };

  const handleResign = () => {
    Alert.alert(
      'Resign Match?',
      'Are you sure you want to resign and forfeit this chess match?',
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
    ? `Computer (${diffCapitalized})`
    : Object.values(players).find((p) => p.id !== playerId)?.username || 'Opponent';

  return (
    <SafeAreaView style={styles.safeArea}>
      <GameHeader
        title="Royal Chess"
        subtitle={
          isBotMode
            ? `Single Player - ${diffCapitalized}`
            : `Online Room ${roomCode}`
        }
        onBackPress={handleResign}
      />

      <ScrollView contentContainerStyle={styles.content}>
        {/* Top Opponent Bar */}
        <View style={[styles.playerBar, !isMyTurn && styles.activePlayerBar]}>
          <View style={styles.playerInfoLeft}>
            <View style={styles.colorBadgeBlack}>
              <ChessPieceVector
                type="k"
                color={myColor === 'w' ? 'b' : 'w'}
                size={24}
              />
            </View>
            <View>
              <Text style={styles.playerName}>{opponentName}</Text>
              <View style={styles.capturedRow}>
                {(myColor === 'w'
                  ? activeState.capturedByBlack
                  : activeState.capturedByWhite
                ).map((p, idx) => (
                  <ChessPieceVector
                    key={idx}
                    type={p}
                    color={myColor}
                    size={16}
                  />
                ))}
              </View>
            </View>
          </View>

          {botThinking ? (
            <View style={styles.thinkingPill}>
              <ActivityIndicator size="small" color="#00ff87" />
              <Text style={styles.thinkingText}>Opponent Turn</Text>
            </View>
          ) : !isMyTurn ? (
            <View style={styles.turnPill}>
              <Text style={styles.turnPillText}>OPPONENT TURN</Text>
            </View>
          ) : null}
        </View>

        {/* Check Alert Banner */}
        {activeState.inCheck && (
          <View style={styles.checkBanner}>
            <AlertTriangle size={16} color="#ef4444" />
            <Text style={styles.checkBannerText}>
              CHECK — Protect the {activeState.turn === 'w' ? 'White' : 'Black'} King
            </Text>
          </View>
        )}

        {/* 8x8 Chessboard */}
        <View style={styles.boardFrame}>
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
                          { color: isLightSquare ? '#779556' : '#ebecd0' },
                        ]}
                      >
                        {RANKS[rIdx]}
                      </Text>
                    )}
                    {rIdx === 7 && (
                      <Text
                        style={[
                          styles.fileCoord,
                          { color: isLightSquare ? '#779556' : '#ebecd0' },
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

        {/* Bottom Self Player Bar */}
        <View style={[styles.playerBar, isMyTurn && styles.activePlayerBar]}>
          <View style={styles.playerInfoLeft}>
            <View style={styles.colorBadgeWhite}>
              <ChessPieceVector type="k" color={myColor} size={24} />
            </View>
            <View>
              <Text style={styles.playerName}>{username} (You)</Text>
              <View style={styles.capturedRow}>
                {(myColor === 'w'
                  ? activeState.capturedByWhite
                  : activeState.capturedByBlack
                ).map((p, idx) => (
                  <ChessPieceVector
                    key={idx}
                    type={p}
                    color={myColor === 'w' ? 'b' : 'w'}
                    size={16}
                  />
                ))}
              </View>
            </View>
          </View>

          {isMyTurn && (
            <View style={[styles.turnPill, { backgroundColor: '#00e5ff' }]}>
              <Shield size={12} color="#050816" />
              <Text style={[styles.turnPillText, { color: '#050816' }]}>
                YOUR TURN
              </Text>
            </View>
          )}
        </View>

        {/* Scrollable Move History Strip */}
        <View style={styles.historyBox}>
          <Text style={styles.historyLabel}>MOVES:</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.historyMovesRow}>
              {activeState.moveHistory.length === 0 ? (
                <Text style={styles.emptyHistoryText}>
                  Tap a piece to make the opening move
                </Text>
              ) : (
                activeState.moveHistory.map((m, idx) => (
                  <View key={idx} style={styles.moveChip}>
                    <Text style={styles.moveChipText}>
                      {idx % 2 === 0 ? `${Math.floor(idx / 2) + 1}. ` : ''}
                      {m.san}
                    </Text>
                  </View>
                ))
              )}
            </View>
          </ScrollView>
        </View>

        {/* Controls Row: Undo (Solo mode), Draw, Resign */}
        <View style={styles.controlsRow}>
          {isBotMode && (
            <TouchableOpacity
              style={[
                styles.controlBtn,
                localChessState.moveHistory.length === 0 && { opacity: 0.4 },
              ]}
              onPress={handleUndo}
              disabled={localChessState.moveHistory.length === 0 || botThinking}
            >
              <RotateCcw size={18} color="#00e5ff" />
              <Text style={styles.controlBtnText}>Undo</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity style={styles.controlBtn} onPress={handleOfferDraw}>
            <Handshake size={18} color="#ffd700" />
            <Text style={styles.controlBtnText}>Draw</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.controlBtn, styles.resignBtn]}
            onPress={handleResign}
          >
            <Flag size={18} color="#ef4444" />
            <Text style={[styles.controlBtnText, { color: '#ef4444' }]}>
              Resign
            </Text>
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
            <Crown size={28} color="#ffd700" />
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
    backgroundColor: '#050816',
  },
  content: {
    paddingHorizontal: 14,
    paddingBottom: 24,
    alignItems: 'center',
    gap: 10,
  },
  playerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#0f1636',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1.5,
    borderColor: '#1e2b5e',
    width: '100%',
  },
  activePlayerBar: {
    borderColor: '#00e5ff',
    backgroundColor: '#131d47',
  },
  playerInfoLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  colorBadgeBlack: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#1e293b',
    borderWidth: 1.5,
    borderColor: '#64748b',
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorBadgeWhite: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#1e293b',
    borderWidth: 1.5,
    borderColor: '#00e5ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  playerName: {
    fontSize: 15,
    fontWeight: '800',
    color: '#f8fafc',
  },
  capturedRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 2,
    minHeight: 18,
    marginTop: 2,
  },
  thinkingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0, 255, 135, 0.14)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 135, 0.4)',
  },
  thinkingText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#00ff87',
  },
  turnPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  turnPillText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#f59e0b',
    letterSpacing: 0.6,
  },
  checkBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.18)',
    borderColor: '#ef4444',
    borderWidth: 1.5,
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 14,
    width: '100%',
  },
  checkBannerText: {
    color: '#fca5a5',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  boardFrame: {
    width: SQUARE_SIZE * 8 + 4,
    height: SQUARE_SIZE * 8 + 4,
    borderRadius: 8,
    padding: 2,
    backgroundColor: '#779556',
    borderWidth: 2,
    borderColor: '#5b7541',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 8,
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
  lightSquare: {
    backgroundColor: '#ebecd0',
  },
  darkSquare: {
    backgroundColor: '#779556',
  },
  lastMoveSquare: {
    backgroundColor: '#f7f769cc',
  },
  selectedSquare: {
    backgroundColor: '#bbcb2b',
  },
  checkSquare: {
    backgroundColor: '#eb4d4b',
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
    bottom: 1,
    right: 3,
    fontSize: 10,
    fontWeight: '800',
  },
  legalMoveDot: {
    position: 'absolute',
    width: SQUARE_SIZE * 0.3,
    height: SQUARE_SIZE * 0.3,
    borderRadius: SQUARE_SIZE * 0.15,
    backgroundColor: 'rgba(0, 0, 0, 0.22)',
  },
  captureRing: {
    position: 'absolute',
    width: SQUARE_SIZE * 0.88,
    height: SQUARE_SIZE * 0.88,
    borderRadius: SQUARE_SIZE * 0.44,
    borderWidth: 3.5,
    borderColor: 'rgba(0, 0, 0, 0.28)',
  },
  historyBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0f1636',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#1e2b5e',
    width: '100%',
    gap: 8,
  },
  historyLabel: {
    fontSize: 10,
    fontWeight: '900',
    color: '#00e5ff',
    letterSpacing: 0.8,
  },
  historyMovesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  emptyHistoryText: {
    fontSize: 11,
    color: '#64748b',
  },
  moveChip: {
    backgroundColor: '#17214b',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  moveChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#e2e8f0',
  },
  controlsRow: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
  },
  controlBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#0f1636',
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#1e2b5e',
  },
  resignBtn: {
    borderColor: 'rgba(239, 68, 68, 0.4)',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
  },
  controlBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#f8fafc',
  },
  promoOverlay: {
    flex: 1,
    backgroundColor: 'rgba(3, 6, 18, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  promoCard: {
    backgroundColor: '#0f1636',
    borderRadius: 24,
    padding: 24,
    borderWidth: 2,
    borderColor: '#00e5ff',
    alignItems: 'center',
    width: '100%',
    maxWidth: 340,
  },
  promoTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#f8fafc',
    marginTop: 8,
  },
  promoSubtitle: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 4,
    marginBottom: 16,
  },
  promoOptionsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  promoOptionBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#17214b',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#3b4f99',
    minWidth: 66,
  },
  promoPieceLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#cbd5e1',
    marginTop: 6,
  },
});
