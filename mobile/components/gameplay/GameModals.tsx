import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
} from 'react-native';
import {
  X,
  Volume2,
  VolumeX,
  Layers,
  RotateCw,
  Handshake,
  Flag,
  Send,
  Sparkles,
  BarChart3,
  Lightbulb,
  CheckCircle,
} from 'lucide-react-native';

interface OptionsModalProps {
  visible: boolean;
  onClose: () => void;
  is3D: boolean;
  onToggle3D: () => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
  onFlipBoard?: () => void;
  onOfferDraw?: () => void;
  onResign: () => void;
  gameType?: 'chess' | 'bingo' | 'ludo';
}

export const GameOptionsModal: React.FC<OptionsModalProps> = ({
  visible,
  onClose,
  is3D,
  onToggle3D,
  soundEnabled,
  onToggleSound,
  onFlipBoard,
  onOfferDraw,
  onResign,
  gameType = 'chess',
}) => {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalCard}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Match Options</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <X size={20} color="#94a3b8" />
            </TouchableOpacity>
          </View>

          <View style={styles.optionsList}>
            {/* 3D vs 2D Mode */}
            <TouchableOpacity style={styles.optionRow} onPress={onToggle3D} activeOpacity={0.8}>
              <View style={styles.optionLeft}>
                <Layers size={20} color="#00e5ff" />
                <View style={styles.optionTextCol}>
                  <Text style={styles.optionTitle}>Render Engine</Text>
                  <Text style={styles.optionSubtitle}>
                    {is3D ? '3D GPU Arena Scene' : '2D High-Performance Board'}
                  </Text>
                </View>
              </View>
              <View style={[styles.togglePill, is3D && styles.togglePillActive]}>
                <Text style={[styles.toggleText, is3D && styles.toggleTextActive]}>
                  {is3D ? '3D' : '2D'}
                </Text>
              </View>
            </TouchableOpacity>

            {/* Sound Toggle */}
            <TouchableOpacity style={styles.optionRow} onPress={onToggleSound} activeOpacity={0.8}>
              <View style={styles.optionLeft}>
                {soundEnabled ? (
                  <Volume2 size={20} color="#10b981" />
                ) : (
                  <VolumeX size={20} color="#94a3b8" />
                )}
                <View style={styles.optionTextCol}>
                  <Text style={styles.optionTitle}>Audio Effects</Text>
                  <Text style={styles.optionSubtitle}>
                    {soundEnabled ? 'Move sounds & alerts enabled' : 'Muted'}
                  </Text>
                </View>
              </View>
              <View style={[styles.togglePill, soundEnabled && styles.togglePillActive]}>
                <Text style={[styles.toggleText, soundEnabled && styles.toggleTextActive]}>
                  {soundEnabled ? 'ON' : 'OFF'}
                </Text>
              </View>
            </TouchableOpacity>

            {/* Flip Board (for Chess) */}
            {onFlipBoard && gameType === 'chess' ? (
              <TouchableOpacity style={styles.optionRow} onPress={onFlipBoard} activeOpacity={0.8}>
                <View style={styles.optionLeft}>
                  <RotateCw size={20} color="#38bdf8" />
                  <View style={styles.optionTextCol}>
                    <Text style={styles.optionTitle}>Flip Perspective</Text>
                    <Text style={styles.optionSubtitle}>Invert White/Black board view</Text>
                  </View>
                </View>
              </TouchableOpacity>
            ) : null}

            {/* Offer Draw */}
            {onOfferDraw && gameType === 'chess' ? (
              <TouchableOpacity
                style={styles.optionRow}
                onPress={() => {
                  onClose();
                  onOfferDraw();
                }}
                activeOpacity={0.8}
              >
                <View style={styles.optionLeft}>
                  <Handshake size={20} color="#f59e0b" />
                  <View style={styles.optionTextCol}>
                    <Text style={styles.optionTitle}>Offer Draw</Text>
                    <Text style={styles.optionSubtitle}>Propose a peaceful conclusion</Text>
                  </View>
                </View>
              </TouchableOpacity>
            ) : null}

            {/* Resign / Forfeit */}
            <TouchableOpacity
              style={[styles.optionRow, styles.dangerOptionRow]}
              onPress={() => {
                onClose();
                onResign();
              }}
              activeOpacity={0.8}
            >
              <View style={styles.optionLeft}>
                <Flag size={20} color="#ef4444" />
                <View style={styles.optionTextCol}>
                  <Text style={[styles.optionTitle, { color: '#ef4444' }]}>
                    Resign Match
                  </Text>
                  <Text style={styles.optionSubtitle}>Concede game to opponent</Text>
                </View>
              </View>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

interface ChatModalProps {
  visible: boolean;
  onClose: () => void;
  onSendMessage?: (msg: string) => void;
}

export const GameChatModal: React.FC<ChatModalProps> = ({
  visible,
  onClose,
  onSendMessage,
}) => {
  const [inputText, setInputText] = useState('');
  const [messages, setMessages] = useState<Array<{ sender: string; text: string; time: string }>>([
    { sender: 'System', text: 'Match connected! Fair play protocol active.', time: '12:56' },
  ]);

  const quickEmotes = [
    'Good luck! 🍀',
    'Nice move! 🎯',
    'Well played! 🤝',
    'Thinking... 🤔',
    'Check! ⚡',
    'Rematch after this? 🔥',
  ];

  const handleSend = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    setMessages((prev) => [
      ...prev,
      {
        sender: 'You',
        text: trimmed,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
    if (onSendMessage) onSendMessage(trimmed);
    setInputText('');
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalCard}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>In-Game Chat</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <X size={20} color="#94a3b8" />
            </TouchableOpacity>
          </View>

          {/* Quick Emote Chips */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.emotesScroll}
          >
            {quickEmotes.map((emote, idx) => (
              <TouchableOpacity
                key={idx}
                style={styles.emoteChip}
                onPress={() => handleSend(emote)}
                activeOpacity={0.7}
              >
                <Text style={styles.emoteChipText}>{emote}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Chat Messages */}
          <ScrollView style={styles.chatScroll} contentContainerStyle={styles.chatScrollContent}>
            {messages.map((m, idx) => (
              <View
                key={idx}
                style={[
                  styles.chatBubble,
                  m.sender === 'You' ? styles.chatBubbleMe : styles.chatBubbleOther,
                ]}
              >
                <Text style={styles.chatSender}>{m.sender}</Text>
                <Text style={styles.chatText}>{m.text}</Text>
                <Text style={styles.chatTime}>{m.time}</Text>
              </View>
            ))}
          </ScrollView>

          {/* Input Bar */}
          <View style={styles.chatInputRow}>
            <TextInput
              style={styles.chatInput}
              placeholder="Send a sportsmanlike message..."
              placeholderTextColor="#64748b"
              value={inputText}
              onChangeText={setInputText}
              onSubmitEditing={() => handleSend(inputText)}
            />
            <TouchableOpacity
              style={styles.sendBtn}
              onPress={() => handleSend(inputText)}
              activeOpacity={0.8}
            >
              <Send size={18} color="#050816" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

interface AnalyzeModalProps {
  visible: boolean;
  onClose: () => void;
  evaluationScore?: string;
  bestMove?: string;
  tacticalTip?: string;
  accuracyScore?: number;
}

export const GameAnalyzeModal: React.FC<AnalyzeModalProps> = ({
  visible,
  onClose,
  evaluationScore = '+0.4 (Equal position)',
  bestMove = 'Develop Knight to center (Nf3)',
  tacticalTip = 'Control key center squares e4/d4 to maximize piece activity and king safety.',
  accuracyScore = 92,
}) => {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalCard}>
          <View style={styles.modalHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Sparkles size={20} color="#00e5ff" />
              <Text style={styles.modalTitle}>Engine Analysis</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <X size={20} color="#94a3b8" />
            </TouchableOpacity>
          </View>

          <View style={styles.analysisContent}>
            {/* Eval Bar */}
            <View style={styles.evalCard}>
              <View style={styles.evalHeader}>
                <BarChart3 size={16} color="#00e5ff" />
                <Text style={styles.evalLabel}>POSITION EVALUATION</Text>
              </View>
              <Text style={styles.evalScore}>{evaluationScore}</Text>
              <View style={styles.meterTrack}>
                <View style={[styles.meterFill, { width: `${accuracyScore}%` }]} />
              </View>
              <Text style={styles.meterSubtext}>Accuracy {accuracyScore}% · Optimal play</Text>
            </View>

            {/* Best Move Recommendation */}
            <View style={styles.hintCard}>
              <View style={styles.evalHeader}>
                <Lightbulb size={16} color="#ffd700" />
                <Text style={[styles.evalLabel, { color: '#ffd700' }]}>BEST MOVE</Text>
              </View>
              <Text style={styles.hintTitle}>{bestMove}</Text>
              <Text style={styles.hintDescription}>{tacticalTip}</Text>
            </View>

            {/* Fair-Play Notice */}
            <View style={styles.fairPlayRow}>
              <CheckCircle size={14} color="#10b981" />
              <Text style={styles.fairPlayText}>
                Live engine assistance is calculated from official rules tables.
              </Text>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(5, 8, 22, 0.75)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#0f172a',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    borderColor: '#1e293b',
    padding: 18,
    maxHeight: '82%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  modalTitle: {
    color: '#f8fafc',
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  closeBtn: {
    padding: 4,
  },
  optionsList: {
    gap: 10,
    marginBottom: 16,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#131e34',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1e2d4a',
  },
  dangerOptionRow: {
    borderColor: 'rgba(239, 68, 68, 0.35)',
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
  },
  optionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  optionTextCol: {
    flex: 1,
  },
  optionTitle: {
    color: '#f8fafc',
    fontSize: 14,
    fontWeight: '700',
  },
  optionSubtitle: {
    color: '#94a3b8',
    fontSize: 11,
    marginTop: 2,
  },
  togglePill: {
    backgroundColor: '#1e293b',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 8,
  },
  togglePillActive: {
    backgroundColor: '#00e5ff',
  },
  toggleText: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '800',
  },
  toggleTextActive: {
    color: '#050816',
  },
  emotesScroll: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 8,
  },
  emoteChip: {
    backgroundColor: '#1e293b',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  emoteChipText: {
    color: '#f8fafc',
    fontSize: 12,
    fontWeight: '600',
  },
  chatScroll: {
    maxHeight: 220,
    marginVertical: 10,
  },
  chatScrollContent: {
    gap: 8,
  },
  chatBubble: {
    padding: 10,
    borderRadius: 10,
    maxWidth: '85%',
  },
  chatBubbleMe: {
    backgroundColor: '#1e3a5f',
    alignSelf: 'flex-end',
    borderWidth: 1,
    borderColor: '#0284c7',
  },
  chatBubbleOther: {
    backgroundColor: '#1e293b',
    alignSelf: 'flex-start',
  },
  chatSender: {
    color: '#38bdf8',
    fontSize: 10,
    fontWeight: '800',
    marginBottom: 2,
  },
  chatText: {
    color: '#f8fafc',
    fontSize: 13,
  },
  chatTime: {
    color: '#64748b',
    fontSize: 9,
    alignSelf: 'flex-end',
    marginTop: 3,
  },
  chatInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  chatInput: {
    flex: 1,
    backgroundColor: '#0a0f1d',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#233252',
    height: 44,
    paddingHorizontal: 12,
    color: '#f8fafc',
    fontSize: 13,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: '#00e5ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  analysisContent: {
    gap: 12,
    paddingBottom: 8,
  },
  evalCard: {
    backgroundColor: '#131e34',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1e2d4a',
  },
  evalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  evalLabel: {
    color: '#00e5ff',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  evalScore: {
    color: '#f8fafc',
    fontSize: 20,
    fontWeight: '900',
    marginBottom: 10,
  },
  meterTrack: {
    height: 6,
    backgroundColor: '#1e293b',
    borderRadius: 3,
    overflow: 'hidden',
  },
  meterFill: {
    height: '100%',
    backgroundColor: '#00e5ff',
  },
  meterSubtext: {
    color: '#94a3b8',
    fontSize: 11,
    marginTop: 6,
  },
  hintCard: {
    backgroundColor: '#162238',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.25)',
  },
  hintTitle: {
    color: '#f8fafc',
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 4,
  },
  hintDescription: {
    color: '#cbd5e1',
    fontSize: 12,
    lineHeight: 17,
  },
  fairPlayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingTop: 4,
  },
  fairPlayText: {
    color: '#64748b',
    fontSize: 11,
    flex: 1,
  },
});
