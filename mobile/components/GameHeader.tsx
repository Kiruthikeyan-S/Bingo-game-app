import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, Volume2, VolumeX, Wifi, WifiOff } from 'lucide-react-native';
import { usePlayerStore } from '../store/playerStore';
import { useGameStore } from '../store/gameStore';

interface GameHeaderProps {
  title: string;
  subtitle?: string;
  showBack?: boolean;
  onBackPress?: () => void;
  showSoundToggle?: boolean;
}

export const GameHeader: React.FC<GameHeaderProps> = ({
  title,
  subtitle,
  showBack = true,
  onBackPress,
  showSoundToggle = true,
}) => {
  const router = useRouter();
  const isConnected = useGameStore((s) => s.isConnected);
  const soundEnabled = usePlayerStore((s) => s.soundEnabled);
  const setSoundEnabled = usePlayerStore((s) => s.setSoundEnabled);

  const handleBack = () => {
    if (onBackPress) {
      onBackPress();
    } else {
      router.back();
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.leftRow}>
        {showBack && (
          <TouchableOpacity onPress={handleBack} style={styles.iconButton}>
            <ArrowLeft color="#e2e8f0" size={24} />
          </TouchableOpacity>
        )}
        <View style={styles.titleColumn}>
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>
          {subtitle ? (
            <Text style={styles.subtitle} numberOfLines={1}>
              {subtitle}
            </Text>
          ) : null}
        </View>
      </View>

      <View style={styles.rightRow}>
        <View style={[styles.networkBadge, isConnected ? styles.netOnline : styles.netOffline]}>
          {isConnected ? (
            <Wifi size={14} color="#10b981" />
          ) : (
            <WifiOff size={14} color="#ef4444" />
          )}
        </View>

        {showSoundToggle && (
          <TouchableOpacity
            onPress={() => setSoundEnabled(!soundEnabled)}
            style={styles.iconButton}
          >
            {soundEnabled ? (
              <Volume2 color="#a5b4fc" size={22} />
            ) : (
              <VolumeX color="#64748b" size={22} />
            )}
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  leftRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconButton: {
    padding: 8,
    borderRadius: 12,
    backgroundColor: '#1e293b',
    marginRight: 12,
  },
  titleColumn: {
    flex: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: '#f8fafc',
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 2,
  },
  rightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  networkBadge: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: '#1e293b',
  },
  netOnline: {
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.4)',
  },
  netOffline: {
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.4)',
  },
});
