import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { Clock } from 'lucide-react-native';

interface EsportsPlayerCardProps {
  avatarUrl?: string;
  pieceAvatar?: React.ReactNode;
  username: string;
  rating?: number | string;
  countryFlag?: string;
  badgeLabel?: string;
  isTurn?: boolean;
  timeText?: string;
  capturedContent?: React.ReactNode;
  isTop?: boolean;
  onPress?: () => void;
}

export const EsportsPlayerCard: React.FC<EsportsPlayerCardProps> = ({
  avatarUrl,
  pieceAvatar,
  username,
  rating = 1200,
  countryFlag = '🇮🇳',
  badgeLabel,
  isTurn = false,
  timeText = '10:00',
  capturedContent,
  isTop = false,
  onPress,
}) => {
  return (
    <TouchableOpacity
      activeOpacity={onPress ? 0.85 : 1}
      onPress={onPress}
      style={[
        styles.container,
        isTurn && styles.activeContainer,
        isTop ? styles.topMargin : styles.bottomMargin,
      ]}
    >
      <View style={styles.leftSection}>
        {/* Avatar or Piece Avatar */}
        <View style={[styles.avatarWrap, isTurn && styles.activeAvatarWrap]}>
          {avatarUrl ? (
            <Image source={{ uri: avatarUrl }} style={styles.avatarImage} />
          ) : pieceAvatar ? (
            <View style={styles.pieceAvatarWrap}>{pieceAvatar}</View>
          ) : (
            <View style={styles.fallbackAvatar}>
              <Text style={styles.fallbackAvatarText}>
                {username.charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
        </View>

        {/* Player Meta Info */}
        <View style={styles.metaColumn}>
          <View style={styles.nameRow}>
            <Text style={styles.usernameText} numberOfLines={1}>
              {username}
            </Text>
            {rating ? <Text style={styles.ratingText}>({rating})</Text> : null}
            {countryFlag ? <Text style={styles.flagText}>{countryFlag}</Text> : null}
            {badgeLabel ? (
              <View style={styles.badgePill}>
                <Text style={styles.badgePillText}>{badgeLabel}</Text>
              </View>
            ) : null}
          </View>

          {/* Captured Pieces or Sub-content */}
          {capturedContent ? (
            <View style={styles.capturedRow}>{capturedContent}</View>
          ) : null}
        </View>
      </View>

      {/* Right Time Clock Badge */}
      <View style={[styles.clockBadge, isTurn && styles.activeClockBadge]}>
        <Clock size={12} color={isTurn ? '#00e5ff' : '#94a3b8'} style={{ marginRight: 5 }} />
        <Text style={[styles.clockText, isTurn && styles.activeClockText]}>
          {timeText}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: '#0d1322',
    borderWidth: 1,
    borderColor: '#19243a',
    borderRadius: 12,
  },
  topMargin: {
    marginBottom: 6,
  },
  bottomMargin: {
    marginTop: 6,
  },
  activeContainer: {
    borderColor: '#00e5ff',
    backgroundColor: '#0f182c',
    shadowColor: '#00e5ff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
  },
  avatarWrap: {
    width: 40,
    height: 40,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#1e293b',
    borderWidth: 1.5,
    borderColor: '#334155',
    marginRight: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeAvatarWrap: {
    borderColor: '#00e5ff',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  pieceAvatarWrap: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#151d30',
  },
  fallbackAvatar: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2563eb',
  },
  fallbackAvatarText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '800',
  },
  metaColumn: {
    flex: 1,
    justifyContent: 'center',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'nowrap',
    gap: 6,
  },
  usernameText: {
    color: '#f8fafc',
    fontSize: 14,
    fontWeight: '700',
    maxWidth: 120,
  },
  ratingText: {
    color: '#94a3b8',
    fontSize: 13,
    fontWeight: '600',
  },
  flagText: {
    fontSize: 14,
  },
  badgePill: {
    backgroundColor: '#10b981',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  badgePillText: {
    color: '#050816',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  capturedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 3,
    minHeight: 18,
    gap: 2,
  },
  clockBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0a0f1d',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#1e293b',
    minWidth: 80,
    justifyContent: 'center',
  },
  activeClockBadge: {
    backgroundColor: '#12233c',
    borderColor: '#00e5ff',
  },
  clockText: {
    color: '#94a3b8',
    fontSize: 13,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  activeClockText: {
    color: '#00e5ff',
  },
});
