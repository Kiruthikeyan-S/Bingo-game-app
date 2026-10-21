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
import { Chess } from 'chess.js';
import {
  RotateCcw,
  Flag,
  Handshake,
  Bot,
  AlertTriangle,
  Sparkles,
  Crown,
} from 'lucide-react-native';
import { GameHeader } from '../../components/GameHeader';
import { GameButton } from '../../components/GameButton';
import { useGameStore } from '../../store/gameStore';
import { usePlayerStore } from '../../store/playerStore';
import { ChessEngine } from '../../engines/chess/engine';
import { ChessBot } from '../../engines/chess/bot';
import { socketService } from '../../services/socket';
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

const PIECE_UNICODE: Record<ChessColor, Record<ChessPieceSymbol, string>> = {
  w: {
    k: '♔',
    q: '♕',
    r: '♖',
    b: '♗',
    n: '♘',
    p: '♙',
  },
  b: {
    k: '♚',
    q: '♛',
    r: '♜',
    b: '♝',
    n: '♞',
    p: '♟',
  },
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
  const botId = 'bot_chess_ai';

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

  // Parse 8x8 board matrix from current FEN
  const boardMatrix = useMemo(() => {
    try {
      const c = new Chess(activeState.fen);
      return c.board();
    } catch {
      return new Chess().board();
    }
  }, [activeState.fen]);

  // Compute legal destinations for currently selected square
  const legalTargets = useMemo(() => {
    if (!selectedSquare || !isMyTurn) return [];
    return ChessEngine.getLegalMovesFromSquare(activeState.fen, selectedSquare);
  }, [activeState.fen, selectedSquare, isMyTurn]);

  // Handle game over in Bot Mode
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
        username: `ChessBot (${diffLabel})`,
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
      opponentName: `ChessBot (${diffLabel})`,
      result: winner === null ? 'draw' : winner === playerId ? 'win' : 'loss',
      resultReason: String(reason),
      movesCount: finishedState.moveHistory.length,
    });
    router.push('/results');
  };

  // Trigger Bot move when it is Black's turn in Bot mode
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
        minDelayMs: 550,
        maxDelayMs: 1100,
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

    // Check if tapping a valid target square for currently selected piece
    const matchingTarget = legalTargets.find((t) => t.to === square);
    if (selectedSquare && matchingTarget) {
      if (matchingTarget.isPromotion) {
        setPendingPromotion({ from: selectedSquare, to: square });
        return;
      }
      executeChessMove(selectedSquare, square);
      return;
    }

    // Select own piece
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
        'End this bot match as a draw by mutual agreement?',
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
              await socketService.chessResign();
            }
          },
        },
      ]
    );
  };

  const opponentName = isBotMode
    ? `ChessBot (${botDifficulty.toUpperCase()})`
    : Object.values(players).find((p) => p.id !== playerId)?.username || 'Opponent';

  return (
    <SafeAreaView style={styles.safeArea}>
      <GameHeader
        title="Royal Chess"
        subtitle={
          isBotMode
            ? `Single Player vs ${botDifficulty.toUpperCase()} AI`
            : `Online Room ${roomCode}`
        }
        onBackPress={handleResign}
      />

      <ScrollView contentContainerStyle={styles.content}>
        {/* Top Opponent Bar */}
        <View style={[styles.playerBar, !isMyTurn && styles.activePlayerBar]}>
          <View style={styles.playerInfoLeft}>
            <View style={styles.colorBadgeBlack}>
              <Text style={styles.colorBadgeTextBlack}>
                {myColor === 'w' ? '♚' : '♔'}
              </Text>
            </View>
            <View>
              <Text style={styles.playerName}>{opponentName}</Text>
              <View style={styles.capturedRow}>
                {(myColor === 'w'
                  ? activeState.capturedByBlack
                  : activeState.capturedByWhite
                ).map((p, idx) => (
                  <Text key={idx} style={styles.capturedPieceText}>
                    {PIECE_UNICODE[myColor][p]}
                  </Text>
                ))}
              </View>
            </View>
          </View>

          {botThinking ? (
            <View style={styles.thinkingPill}>
              <ActivityIndicator size="small" color="#00ff87" />
              <Text style={styles.thinkingText}>AI Thinking...</Text>
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
              CHECK! Protect the {activeState.turn === 'w' ? 'White' : 'Black'} King!
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
                    {/* Coordinate Labels on Board Edges */}
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

                    {/* Piece Glyph */}
                    {cell && (
                      <Text
                        style={[
                          styles.pieceGlyph,
                          cell.color === 'w' ? styles.whitePiece : styles.blackPiece,
                        ]}
                      >
                        {
                          PIECE_UNICODE[cell.color as ChessColor][
                            cell.type as ChessPieceSymbol
                          ]
                        }
                      </Text>
                    )}

                    {/* Legal Move Indicator Dot / Capture Ring */}
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
              <Text style={styles.colorBadgeTextWhite}>
                {myColor === 'w' ? '♔' : '♚'}
              </Text>
            </View>
            <View>
              <Text style={styles.playerName}>{username} (You)</Text>
              <View style={styles.capturedRow}>
                {(myColor === 'w'
                  ? activeState.capturedByWhite
                  : activeState.capturedByBlack
                ).map((p, idx) => (
                  <Text key={idx} style={styles.capturedPieceText}>
                    {PIECE_UNICODE[myColor === 'w' ? 'b' : 'w'][p]}
                  </Text>
                ))}
              </View>
            </View>
          </View>

          {isMyTurn && (
            <View style={[styles.turnPill, { backgroundColor: '#00e5ff' }]}>
              <Sparkles size={12} color="#050816" />
              <Text style={[styles.turnPillText, { color: '#050816' }]}>
                YOUR TURN
              </Text>
            </View>
          )}
        </View>

        {/* Scrollable Move History Strip */}
        <View style={styles.historyBox}>
          <Text style={styles.historyLabel}>MOVE LOG:</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.historyMovesRow}>
              {activeState.moveHistory.length === 0 ? (
                <Text style={styles.emptyHistoryText}>
                  Tap a piece to make the opening move...
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

        {/* Controls Row: Undo (Bot mode), Draw, Resign */}
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
            <Text style={styles.promoSubtitle}>Choose your promotion piece:</Text>
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
                    <Text style={styles.promoPieceGlyph}>
                      {PIECE_UNICODE[myColor][pieceType]}
                    </Text>
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
  },
  playerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    backgroundColor: '#0c122e',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#1e2b5e',
    marginVertical: 6,
  },
  activePlayerBar: {
    borderColor: '#00e5ff',
    backgroundColor: '#111a42',
  },
  playerInfoLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  colorBadgeWhite: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#f8fafc',
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorBadgeBlack: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: '#475569',
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorBadgeTextWhite: {
    fontSize: 22,
    color: '#0f172a',
  },
  colorBadgeTextBlack: {
    fontSize: 22,
    color: '#f8fafc',
  },
  playerName: {
    fontSize: 15,
    fontWeight: '800',
    color: '#f8fafc',
  },
  capturedRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    minHeight: 16,
  },
  capturedPieceText: {
    fontSize: 13,
    color: '#cbd5e1',
    marginRight: 2,
  },
  thinkingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0, 255, 135, 0.14)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
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
    backgroundColor: '#1e293b',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  turnPillText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#cbd5e1',
  },
  checkBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    width: '100%',
    backgroundColor: 'rgba(239, 68, 68, 0.18)',
    borderWidth: 1,
    borderColor: '#ef4444',
    paddingVertical: 7,
    borderRadius: 12,
    marginBottom: 4,
  },
  checkBannerText: {
    color: '#fca5a5',
    fontSize: 12,
    fontWeight: '900',
  },
  boardFrame: {
    width: SQUARE_SIZE * 8 + 8,
    height: SQUARE_SIZE * 8 + 8,
    padding: 4,
    backgroundColor: '#1e2b5e',
    borderRadius: 14,
    overflow: 'hidden',
    marginVertical: 4,
    shadowColor: '#00e5ff',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 6,
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
    backgroundColor: 'rgba(250, 204, 21, 0.45)',
  },
  selectedSquare: {
    backgroundColor: 'rgba(0, 229, 255, 0.55)',
  },
  checkSquare: {
    backgroundColor: 'rgba(239, 68, 68, 0.75)',
  },
  rankCoord: {
    position: 'absolute',
    top: 2,
    left: 3,
    fontSize: 8,
    fontWeight: '800',
  },
  fileCoord: {
    position: 'absolute',
    bottom: 1,
    right: 3,
    fontSize: 8,
    fontWeight: '800',
  },
  pieceGlyph: {
    fontSize: SQUARE_SIZE * 0.74,
    lineHeight: SQUARE_SIZE * 0.84,
  },
  whitePiece: {
    color: '#ffffff',
    textShadowColor: '#020617',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  blackPiece: {
    color: '#020617',
    textShadowColor: 'rgba(255, 255, 255, 0.4)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  legalMoveDot: {
    position: 'absolute',
    width: SQUARE_SIZE * 0.32,
    height: SQUARE_SIZE * 0.32,
    borderRadius: SQUARE_SIZE * 0.16,
    backgroundColor: 'rgba(0, 255, 135, 0.75)',
  },
  captureRing: {
    position: 'absolute',
    width: SQUARE_SIZE * 0.86,
    height: SQUARE_SIZE * 0.86,
    borderRadius: SQUARE_SIZE * 0.43,
    borderWidth: 3.5,
    borderColor: 'rgba(244, 63, 94, 0.85)',
  },
  historyBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0c122e',
    width: '100%',
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#1e293b',
    marginTop: 4,
    gap: 8,
  },
  historyLabel: {
    fontSize: 10,
    fontWeight: '900',
    color: '#00e5ff',
  },
  historyMovesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  emptyHistoryText: {
    fontSize: 11,
    color: '#64748b',
    fontStyle: 'italic',
  },
  moveChip: {
    backgroundColor: '#161f48',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  moveChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#e2e8f0',
  },
  controlsRow: {
    flexDirection: 'row',
    width: '100%',
    gap: 10,
    marginTop: 10,
  },
  controlBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#11183c',
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#1e2b5e',
  },
  resignBtn: {
    borderColor: 'rgba(239, 68, 68, 0.35)',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
  },
  controlBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#e2e8f0',
  },
  promoOverlay: {
    flex: 1,
    backgroundColor: 'rgba(5, 8, 22, 0.82)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  promoCard: {
    backgroundColor: '#0f1636',
    borderRadius: 24,
    padding: 22,
    width: '100%',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#ffd700',
  },
  promoTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#ffffff',
    marginTop: 6,
  },
  promoSubtitle: {
    fontSize: 12,
    color: '#94a3b8',
    marginBottom: 16,
  },
  promoOptionsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  promoOptionBtn: {
    alignItems: 'center',
    backgroundColor: '#19224d',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#00e5ff',
  },
  promoPieceGlyph: {
    fontSize: 34,
    color: '#ffffff',
  },
  promoPieceLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#00e5ff',
    marginTop: 4,
  },
});
