import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Share } from 'react-native';
import { Copy, Share2, Check } from 'lucide-react-native';

interface RoomCodeProps {
  code: string;
}

export const RoomCode: React.FC<RoomCodeProps> = ({ code }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Join my GameZone match! Use room code: ${code}`,
      });
    } catch (err) {
      console.warn('Share error:', err);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>YOUR GENERATED ROOM CODE</Text>
      <View style={styles.codeRow}>
        {code.split('').map((char, index) => (
          <View key={index} style={styles.charBox}>
            <Text style={styles.charText}>{char}</Text>
          </View>
        ))}
      </View>

      <View style={styles.actionsRow}>
        <TouchableOpacity style={styles.actionBtn} onPress={handleCopy}>
          {copied ? <Check size={16} color="#10B981" /> : <Copy size={16} color="#4F46E5" />}
          <Text style={[styles.actionText, copied && styles.copiedText]}>
            {copied ? 'Copied! ✓' : 'Copy Code'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.actionBtn, styles.shareBtn]} onPress={handleShare}>
          <Share2 size={16} color="#FFFFFF" />
          <Text style={styles.shareText}>Share Invite</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    marginVertical: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 3,
  },
  label: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 1.5,
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
    backgroundColor: '#F1F5F9',
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  charText: {
    fontSize: 24,
    fontWeight: '900',
    color: '#4F46E5',
    letterSpacing: 1,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    gap: 6,
  },
  shareBtn: {
    backgroundColor: '#4F46E5',
    borderColor: '#4F46E5',
  },
  actionText: {
    color: '#4F46E5',
    fontSize: 12,
    fontWeight: '800',
  },
  copiedText: {
    color: '#10B981',
  },
  shareText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
});
