import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  ScrollView,
  Switch,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  User,
  Volume2,
  Vibrate,
  LogOut,
  Edit2,
  Trophy,
  Flame,
} from 'lucide-react-native';
import { GameHeader } from '../components/GameHeader';
import { GameButton } from '../components/GameButton';
import { usePlayerStore } from '../store/playerStore';

export default function ProfileScreen() {
  const router = useRouter();
  const username = usePlayerStore((s) => s.username);
  const avatarUrl = usePlayerStore((s) => s.avatarUrl);
  const soundEnabled = usePlayerStore((s) => s.soundEnabled);
  const setSoundEnabled = usePlayerStore((s) => s.setSoundEnabled);
  const hapticsEnabled = usePlayerStore((s) => s.hapticsEnabled);
  const setHapticsEnabled = usePlayerStore((s) => s.setHapticsEnabled);
  const resetProfile = usePlayerStore((s) => s.resetProfile);

  const handleLogout = () => {
    resetProfile();
    router.replace('/login');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <GameHeader title="Player Profile" subtitle="Identity & Settings" />

      <ScrollView contentContainerStyle={styles.content}>
        {/* Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.avatarWrapper}>
            <Image source={{ uri: avatarUrl }} style={styles.avatar} />
            <TouchableOpacity
              style={styles.editBadge}
              onPress={() => router.push('/login')}
            >
              <Edit2 size={14} color="#070b1e" />
            </TouchableOpacity>
          </View>

          <Text style={styles.username}>{username}</Text>
          <Text style={styles.guestBadge}>GUEST WARRIOR</Text>
        </View>

        {/* Quick Stats Grid */}
        <View style={styles.statsGrid}>
          <View style={styles.statBox}>
            <Trophy size={20} color="#ffd700" />
            <Text style={styles.statVal}>Level 1</Text>
            <Text style={styles.statLabel}>RANK</Text>
          </View>
          <View style={styles.statBox}>
            <Flame size={20} color="#00e5ff" />
            <Text style={styles.statVal}>Active</Text>
            <Text style={styles.statLabel}>STATUS</Text>
          </View>
        </View>

        {/* Preferences Section */}
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>PREFERENCES</Text>

          <View style={styles.prefRow}>
            <View style={styles.prefLeft}>
              <Volume2 size={20} color="#a5b4fc" />
              <View>
                <Text style={styles.prefTitle}>Sound Effects</Text>
                <Text style={styles.prefDesc}>Play audio on taps and calls</Text>
              </View>
            </View>
            <Switch
              value={soundEnabled}
              onValueChange={setSoundEnabled}
              thumbColor={soundEnabled ? '#00e5ff' : '#64748b'}
              trackColor={{ false: '#1e293b', true: 'rgba(0, 229, 255, 0.4)' }}
            />
          </View>

          <View style={styles.prefRow}>
            <View style={styles.prefLeft}>
              <Vibrate size={20} color="#a5b4fc" />
              <View>
                <Text style={styles.prefTitle}>Haptic Feedback</Text>
                <Text style={styles.prefDesc}>Vibrate on moves and victories</Text>
              </View>
            </View>
            <Switch
              value={hapticsEnabled}
              onValueChange={setHapticsEnabled}
              thumbColor={hapticsEnabled ? '#00e5ff' : '#64748b'}
              trackColor={{ false: '#1e293b', true: 'rgba(0, 229, 255, 0.4)' }}
            />
          </View>
        </View>

        {/* Account Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>ACCOUNT</Text>
          <GameButton
            title="Switch Avatar & Name"
            variant="outline"
            onPress={() => router.push('/login')}
            icon={<User size={18} color="#a5b4fc" />}
          />
          <GameButton
            title="Reset Profile / Logout"
            variant="danger"
            onPress={handleLogout}
            icon={<LogOut size={18} color="#ffffff" />}
            style={{ marginTop: 8 }}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#070b1e',
  },
  content: {
    padding: 20,
    gap: 16,
  },
  profileCard: {
    alignItems: 'center',
    backgroundColor: '#11183c',
    borderRadius: 22,
    padding: 24,
    borderWidth: 1.5,
    borderColor: '#1e293b',
  },
  avatarWrapper: {
    position: 'relative',
    marginBottom: 14,
  },
  avatar: {
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 3,
    borderColor: '#00e5ff',
    backgroundColor: '#1e293b',
  },
  editBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    backgroundColor: '#00e5ff',
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  username: {
    fontSize: 22,
    fontWeight: '800',
    color: '#f8fafc',
  },
  guestBadge: {
    fontSize: 11,
    fontWeight: '800',
    color: '#a5b4fc',
    letterSpacing: 1.5,
    marginTop: 4,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  statBox: {
    flex: 1,
    backgroundColor: '#11183c',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1e293b',
    gap: 4,
  },
  statVal: {
    fontSize: 16,
    fontWeight: '800',
    color: '#f8fafc',
    marginTop: 4,
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#64748b',
    letterSpacing: 1,
  },
  section: {
    backgroundColor: '#11183c',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1.5,
    borderColor: '#1e293b',
    gap: 12,
  },
  sectionHeader: {
    fontSize: 12,
    fontWeight: '800',
    color: '#a5b4fc',
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  prefRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  prefLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  prefTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#f8fafc',
  },
  prefDesc: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 2,
  },
});
