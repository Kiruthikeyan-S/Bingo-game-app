import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Trophy, Flame } from 'lucide-react-native';
import { usePlayerStore } from '../store/playerStore';

export default function SplashScreen() {
  const router = useRouter();
  const isRegistered = usePlayerStore((s) => s.isRegistered);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (isRegistered) {
        router.replace('/home');
      } else {
        router.replace('/login');
      }
    }, 1500);

    return () => clearTimeout(timer);
  }, [isRegistered, router]);

  return (
    <LinearGradient
      colors={['#070b1e', '#11183c', '#1e1b4b']}
      style={styles.container}
    >
      <View style={styles.logoContainer}>
        <LinearGradient
          colors={['#8b5cf6', '#6366f1', '#00e5ff']}
          style={styles.logoBadge}
        >
          <Trophy size={54} color="#ffd700" />
        </LinearGradient>

        <View style={styles.titleRow}>
          <Text style={styles.titleBingo}>BINGO</Text>
          <Text style={styles.titleBattle}>BATTLE</Text>
        </View>

        <View style={styles.subtitleRow}>
          <Flame size={16} color="#00e5ff" />
          <Text style={styles.subtitle}>REALTIME MULTIPLAYER</Text>
        </View>
      </View>

      <View style={styles.footer}>
        <ActivityIndicator color="#00e5ff" size="small" />
        <Text style={styles.versionText}>Version 1.0.0 • Online 1v1</Text>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 50,
  },
  logoContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoBadge: {
    width: 110,
    height: 110,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#8b5cf6',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 8,
  },
  titleRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  titleBingo: {
    fontSize: 40,
    fontWeight: '900',
    color: '#ffd700',
    letterSpacing: 2,
  },
  titleBattle: {
    fontSize: 40,
    fontWeight: '900',
    color: '#00e5ff',
    letterSpacing: 2,
  },
  subtitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
  },
  subtitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#a5b4fc',
    letterSpacing: 3,
  },
  footer: {
    alignItems: 'center',
    gap: 12,
  },
  versionText: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '600',
  },
});
