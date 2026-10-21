import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Trophy, Shield } from 'lucide-react-native';
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
    }, 1200);

    return () => clearTimeout(timer);
  }, [isRegistered, router]);

  return (
    <LinearGradient
      colors={['#050816', '#0f1636', '#1e1b4b']}
      style={styles.container}
    >
      <View style={styles.logoContainer}>
        <LinearGradient
          colors={['#6366f1', '#00e5ff']}
          style={styles.logoBadge}
        >
          <Trophy size={54} color="#050816" />
        </LinearGradient>

        <View style={styles.titleRow}>
          <Text style={styles.titleBingo}>GAME</Text>
          <Text style={styles.titleBattle}>HUB</Text>
        </View>

        <View style={styles.subtitleRow}>
          <Shield size={14} color="#00e5ff" />
          <Text style={styles.subtitle}>BINGO | CHESS | LUDO</Text>
        </View>
      </View>

      <View style={styles.footer}>
        <ActivityIndicator color="#00e5ff" size="small" />
        <Text style={styles.versionText}>Version 2.0.0</Text>
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
    width: 108,
    height: 108,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
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
    fontSize: 12,
    fontWeight: '800',
    color: '#a5b4fc',
    letterSpacing: 2.5,
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
