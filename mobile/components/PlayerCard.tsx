import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { Shield, CheckCircle, Clock } from 'lucide-react-native';
import { Player } from '../../shared/types';

interface PlayerCardProps {
  player?: Player | null;
  isHost?: boolean;
  isTurn?: boolean;
  linesCompleted?: number;
  showReadyStatus?: boolean;
  emptyPlaceholderText?: string;
}

export const PlayerCard: React.FC<PlayerCardProps> = ({
  player,
  isHost = false,
  isTurn = false,
  linesCompleted = 0,
  showReadyStatus = false,
  emptyPlaceholderText = 'Waiting for player...',
}) => {
  if (!player) {
    return (
      <View style={[styles.card, styles.emptyCard]}>
        <View style={styles.emptyAvatar}>
          <Clock size={20} color="#64748b" />
        </View>
        <Text style={styles.emptyText}>{emptyPlaceholderText}</Text>
      </View>
    );
  }

  return (
    <View style={[styles.card, isTurn && styles.activeTurnCard]}>
      <View style={styles.avatarContainer}>
        <Image source={{ uri: player.avatarUrl }} style={styles.avatar} />
        <View style={[styles.onlineDot, player.isConnected ? styles.dotOnline : styles.dotOffline]} />
      </View>

      <View style={styles.infoColumn}>
        <View style={styles.nameRow}>
          <Text style={styles.username} numberOfLines={1}>
            {player.username}
          </Text>
          {isHost && (
            <View style={styles.hostBadge}>
              <Shield size={10} color="#ffd700" />
              <Text style={styles.hostText}>HOST</Text>
            </View>
          )}
        </View>

        {showReadyStatus && (
          <View style={styles.statusRow}>
            {player.isReady ? (
              <View style={styles.readyBadge}>
                <CheckCircle size={12} color="#10b981" />
                <Text style={styles.readyText}>READY</Text>
              </View>
            ) : (
              <View style={styles.notReadyBadge}>
                <Clock size={12} color="#f59e0b" />
                <Text style={styles.notReadyText}>ARRANGING</Text>
              </View>
            )}
          </View>
        )}

        {linesCompleted > 0 && (
          <View style={styles.linesBadge}>
            <Text style={styles.linesText}>{linesCompleted} / 5 Lines</Text>
          </View>
        )}
      </View>

      {isTurn && (
        <View style={styles.turnIndicator}>
          <Text style={styles.turnText}>TURN</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#11183c',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1.5,
    borderColor: '#1e293b',
    marginVertical: 4,
  },
  emptyCard: {
    borderStyle: 'dashed',
    borderColor: '#334155',
    justifyContent: 'center',
    paddingVertical: 18,
  },
  activeTurnCard: {
    borderColor: '#00e5ff',
    backgroundColor: '#131b47',
    shadowColor: '#00e5ff',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 3,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 12,
  },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#1e293b',
  },
  emptyAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#1e293b',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  emptyText: {
    color: '#64748b',
    fontSize: 14,
    fontWeight: '500',
  },
  onlineDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#11183c',
  },
  dotOnline: {
    backgroundColor: '#10b981',
  },
  dotOffline: {
    backgroundColor: '#ef4444',
  },
  infoColumn: {
    flex: 1,
    justifyContent: 'center',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  username: {
    fontSize: 15,
    fontWeight: '700',
    color: '#f8fafc',
    maxWidth: 130,
  },
  hostBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 215, 0, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    gap: 3,
  },
  hostText: {
    color: '#ffd700',
    fontSize: 9,
    fontWeight: '800',
  },
  statusRow: {
    marginTop: 4,
  },
  readyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  readyText: {
    color: '#10b981',
    fontSize: 11,
    fontWeight: '700',
  },
  notReadyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  notReadyText: {
    color: '#f59e0b',
    fontSize: 11,
    fontWeight: '600',
  },
  linesBadge: {
    marginTop: 3,
    backgroundColor: '#1e293b',
    alignSelf: 'flex-start',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  linesText: {
    color: '#00e5ff',
    fontSize: 10,
    fontWeight: '700',
  },
  turnIndicator: {
    backgroundColor: '#00e5ff',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  turnText: {
    color: '#070b1e',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
});
