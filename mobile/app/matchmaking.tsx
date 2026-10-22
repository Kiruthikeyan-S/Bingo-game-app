import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Animated,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Swords, X, Shield, Globe, Award } from 'lucide-react-native';
import { GameHeader } from '../components/GameHeader';
import { GameButton } from '../components/GameButton';
import { useMatchmaking } from '../hooks/useMatchmaking';
import { useGameStore } from '../store/gameStore';

export default function MatchmakingScreen() {
  const router = useRouter();
  const selectedGame = useGameStore((s) => s.selectedGame);
  const { isSearching, searchTime, error, startSearch, stopSearch } = useMatchmaking(selectedGame);

  const pulseAnim = React.useRef(new Animated.Value(1)).current;

  useEffect(() => {
    startSearch();

    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.25,
          duration: 900,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 900,
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();

    return () => {
      loop.stop();
    };
  }, []);

  const handleCancel = async () => {
    await stopSearch();
    router.replace('/home');
  };

  const gameTitle =
    selectedGame === 'bingo'
      ? 'Bingo Battle 5x5'
      : selectedGame === 'chess'
      ? 'Royal Chess'
      : 'Classic Ludo';

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <GameHeader
        title="Public Matchmaking"
        subtitle="Finding an online rival"
        onBackPress={handleCancel}
      />

      <View style={styles.container}>
        <View style={styles.radarCard}>
          <Animated.View
            style={[
              styles.pulseCircle,
              {
                transform: [{ scale: pulseAnim }],
              },
            ]}
          >
            <View style={styles.innerCircle}>
              <Globe size={48} color="#00e5ff" />
            </View>
          </Animated.View>

          <Text style={styles.statusTitle}>Searching for Opponent...</Text>
          <Text style={styles.statusSubtitle}>Game: {gameTitle}</Text>

          <View style={styles.timerBadge}>
            <Text style={styles.timerText}>{formatTime(searchTime)}</Text>
          </View>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}
        </View>

        <View style={styles.infoBox}>
          <Shield size={18} color="#a5b4fc" />
          <Text style={styles.infoText}>
            Public matchmaking matches you with compatible rivals across mobile devices.
          </Text>
        </View>

        <View style={styles.footer}>
          <GameButton
            title="Cancel Matchmaking"
            variant="danger"
            onPress={handleCancel}
            icon={<X size={18} color="#ffffff" />}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#070b1e',
  },
  container: {
    flex: 1,
    padding: 24,
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  radarCard: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  pulseCircle: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(0, 229, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 32,
  },
  innerCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#11183c',
    borderWidth: 2,
    borderColor: '#00e5ff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#f8fafc',
    marginBottom: 6,
  },
  statusSubtitle: {
    fontSize: 14,
    color: '#00e5ff',
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 16,
  },
  timerBadge: {
    backgroundColor: '#11183c',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#1e293b',
  },
  timerText: {
    color: '#a5b4fc',
    fontSize: 20,
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
  },
  errorText: {
    color: '#ef4444',
    fontSize: 13,
    marginTop: 14,
    textAlign: 'center',
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#11183c',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#1e293b',
    width: '100%',
    marginBottom: 20,
  },
  infoText: {
    flex: 1,
    color: '#94a3b8',
    fontSize: 12,
    lineHeight: 18,
  },
  footer: {
    width: '100%',
  },
});
