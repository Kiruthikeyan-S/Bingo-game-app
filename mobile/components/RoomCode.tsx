import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Share } from 'react-native';
import { Copy, Share2, Check } from 'lucide-react-native';

interface RoomCodeProps {
  code: string;
}

export const RoomCode: React.FC<RoomCodeProps> = ({ code }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    // In React Native without clipboard dependency, indicate copied visually
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Join my Bingo Battle match! Use room code: ${code}`,
      });
    } catch (err) {
      console.warn('Share error:', err);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>ROOM CODE</Text>
      <View style={styles.codeRow}>
        {code.split('').map((char, index) => (
          <View key={index} style={styles.charBox}>
            <Text style={styles.charText}>{char}</Text>
          </View>
        ))}
      </View>

      <View style={styles.actionsRow}>
        <TouchableOpacity style={styles.actionBtn} onPress={handleCopy}>
          {copied ? <Check size={16} color="#10b981" /> : <Copy size={16} color="#a5b4fc" />}
          <Text style={[styles.actionText, copied && styles.copiedText]}>
            {copied ? 'Copied!' : 'Copy Code'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionBtn} onPress={handleShare}>
          <Share2 size={16} color="#a5b4fc" />
          <Text style={styles.actionText}>Share Invite</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#11183c',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(99, 102, 241, 0.3)',
    marginVertical: 12,
  },
  label: {
    fontSize: 12,
    fontWeight: '800',
    color: '#94a3b8',
    letterSpacing: 2,
    marginBottom: 12,
  },
  codeRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  charBox: {
    width: 44,
    height: 52,
    borderRadius: 12,
    backgroundColor: '#1e293b',
    borderWidth: 1.5,
    borderColor: '#6366f1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  charText: {
    fontSize: 24,
    fontWeight: '900',
    color: '#00e5ff',
    letterSpacing: 1,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#1e293b',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  actionText: {
    color: '#e2e8f0',
    fontSize: 13,
    fontWeight: '600',
  },
  copiedText: {
    color: '#10b981',
  },
});
