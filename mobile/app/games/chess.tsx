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
}> = ({ type, color, size = SQUARE_SIZE * 0.74 }) => {
  const fill = color === 'w' ? '#F8FAFC' : '#0F172A';
  const stroke = color === 'w' ? '#1E293B' : '#94A3B8';
  const innerAccent = color === 'w' ? '#CBD5E1' : '#334155';

  return (
    <Svg width={size} height={size} viewBox="0 0 45 45">
      <G fill={fill} stroke={stroke} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
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
                          { color: isLightSquare ? '#334155' : '#94a3b8' },
                        ]}
                      >
                        {RANKS[rIdx]}
                      </Text>
                    )}
                    {rIdx === 7 && (
                      <Text
                        style={[
                          styles.fileCoord,
                          { color: isLightSquare ? '#334155' : '#94a3b8' },
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
    width: SQUARE_SIZE * 8 + 8,
    height: SQUARE_SIZE * 8 + 8,
    borderRadius: 16,
    padding: 4,
    backgroundColor: '#1e2b5e',
    borderWidth: 2,
    borderColor: '#3b4f99',
    overflow: 'hidden',
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
    backgroundColor: '#cbd5e1',
  },
  darkSquare: {
    backgroundColor: '#334155',
  },
  lastMoveSquare: {
    backgroundColor: 'rgba(250, 204, 21, 0.42)',
  },
  selectedSquare: {
    backgroundColor: 'rgba(0, 229, 255, 0.48)',
  },
  checkSquare: {
    backgroundColor: 'rgba(239, 68, 68, 0.72)',
  },
  rankCoord: {
    position: 'absolute',
    top: 2,
    left: 3,
    fontSize: 9,
    fontWeight: '800',
  },
  fileCoord: {
    position: 'absolute',
    bottom: 1,
    right: 3,
    fontSize: 9,
    fontWeight: '800',
  },
  legalMoveDot: {
    position: 'absolute',
    width: SQUARE_SIZE * 0.32,
    height: SQUARE_SIZE * 0.32,
    borderRadius: SQUARE_SIZE * 0.16,
    backgroundColor: 'rgba(0, 255, 135, 0.78)',
  },
  captureRing: {
    position: 'absolute',
    width: SQUARE_SIZE * 0.86,
    height: SQUARE_SIZE * 0.86,
    borderRadius: SQUARE_SIZE * 0.43,
    borderWidth: 3.5,
    borderColor: 'rgba(239, 68, 68, 0.85)',
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
