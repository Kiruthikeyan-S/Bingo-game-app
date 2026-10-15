import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Play,
  PlusCircle,
  LogIn,
  Trophy,
  HelpCircle,
  Settings as SettingsIcon,
  User,
  X,
  CheckCircle2,
} from 'lucide-react-native';
import { usePlayerStore } from '../store/playerStore';
import { GameButton } from '../components/GameButton';

export default function HomeScreen() {
  const router = useRouter();
  const username = usePlayerStore((s) => s.username);
  const avatarUrl = usePlayerStore((s) => s.avatarUrl);

  const [howToPlayVisible, setHowToPlayVisible] = useState(false);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        {/* Top Profile Header */}
        <View style={styles.topBar}>
          <TouchableOpacity
            style={styles.profileBadge}
            onPress={() => router.push('/profile')}
          >
            <Image source={{ uri: avatarUrl }} style={styles.profileAvatar} />
            <View>
              <Text style={styles.greeting}>WELCOME BACK</Text>
              <Text style={styles.playerName}>{username}</Text>
            </View>
          </TouchableOpacity>

          <View style={styles.topRightActions}>
            <TouchableOpacity
              style={styles.iconCircle}
              onPress={() => router.push('/settings')}
            >
              <SettingsIcon size={20} color="#a5b4fc" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Hero Card */}
        <LinearGradient
          colors={['#7928ca', '#4338ca', '#2563eb']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroCard}
        >
          <View style={styles.heroContent}>
            <Text style={styles.heroSubtitle}>SEASON 1</Text>
            <Text style={styles.heroTitle}>BINGO BATTLE 1v1</Text>
            <Text style={styles.heroDescription}>
              Compete live with friends. Call numbers, complete 5 lines, and shout BINGO!
            </Text>
          </View>
        </LinearGradient>

        {/* Primary Action Buttons */}
        <View style={styles.menuSection}>
          <TouchableOpacity
            activeOpacity={0.85}
            style={styles.playNowCard}
            onPress={() => router.push('/create-room')}
          >
            <LinearGradient
              colors={['#10b981', '#059669']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.playGradient}
            >
              <View style={styles.playIconContainer}>
                <Play size={28} color="#070b1e" fill="#070b1e" />
              </View>
              <View style={styles.playTextContainer}>
                <Text style={styles.playTitle}>Create Battle Room</Text>
                <Text style={styles.playSubtitle}>Generate a 6-digit code for a friend</Text>
              </View>
            </LinearGradient>
          </TouchableOpacity>

          <View style={styles.rowActions}>
            <TouchableOpacity
              activeOpacity={0.8}
              style={[styles.actionTile, { borderColor: '#6366f1' }]}
              onPress={() => router.push('/join-room')}
            >
              <LogIn size={26} color="#00e5ff" />
              <Text style={styles.tileTitle}>Join Room</Text>
              <Text style={styles.tileDesc}>Enter 6-char code</Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.8}
              style={[styles.actionTile, { borderColor: '#ffd700' }]}
              onPress={() => router.push('/leaderboard')}
            >
              <Trophy size={26} color="#ffd700" />
              <Text style={styles.tileTitle}>Leaderboard</Text>
              <Text style={styles.tileDesc}>Global rankings</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.rowActions}>
            <TouchableOpacity
              activeOpacity={0.8}
              style={[styles.actionTile, { borderColor: '#334155' }]}
              onPress={() => setHowToPlayVisible(true)}
            >
              <HelpCircle size={26} color="#a5b4fc" />
              <Text style={styles.tileTitle}>How to Play</Text>
              <Text style={styles.tileDesc}>Rules & Winning lines</Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.8}
              style={[styles.actionTile, { borderColor: '#334155' }]}
              onPress={() => router.push('/profile')}
            >
              <User size={26} color="#a5b4fc" />
              <Text style={styles.tileTitle}>My Profile</Text>
              <Text style={styles.tileDesc}>Stats & History</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* How to Play Modal */}
        <Modal
          visible={howToPlayVisible}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setHowToPlayVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>How to Play Bingo Battle</Text>
                <TouchableOpacity onPress={() => setHowToPlayVisible(false)}>
                  <X size={24} color="#94a3b8" />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalScroll}>
                <View style={styles.ruleItem}>
                  <CheckCircle2 size={18} color="#00e5ff" />
                  <Text style={styles.ruleText}>
                    Each player receives a 5×5 grid with numbers 1 to 25.
                  </Text>
                </View>

                <View style={styles.ruleItem}>
                  <CheckCircle2 size={18} color="#00e5ff" />
                  <Text style={styles.ruleText}>
                    Shuffle or manually arrange your numbers before confirming your board.
                  </Text>
                </View>

                <View style={styles.ruleItem}>
                  <CheckCircle2 size={18} color="#00e5ff" />
                  <Text style={styles.ruleText}>
                    Take turns calling numbers between 1 and 25.
                  </Text>
                </View>

                <View style={styles.ruleItem}>
                  <CheckCircle2 size={18} color="#00e5ff" />
                  <Text style={styles.ruleText}>
                    Called numbers are automatically crossed off on both players' boards!
                  </Text>
                </View>

                <View style={styles.ruleItem}>
                  <CheckCircle2 size={18} color="#00e5ff" />
                  <Text style={styles.ruleText}>
                    Completing any 5-number horizontal, vertical, or diagonal line lights up a letter in B-I-N-G-O.
                  </Text>
                </View>

                <View style={styles.ruleItem}>
                  <CheckCircle2 size={18} color="#ffd700" />
                  <Text style={styles.ruleText}>
                    First player to complete 5 lines wins! If both hit 5 lines on the same call, it's a DRAW.
                  </Text>
                </View>
              </ScrollView>

              <GameButton
                title="Got It!"
                onPress={() => setHowToPlayVisible(false)}
                style={{ marginTop: 16 }}
              />
            </View>
          </View>
        </Modal>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#070b1e',
  },
  container: {
    padding: 20,
    paddingBottom: 40,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  profileBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#11183c',
    padding: 8,
    paddingRight: 16,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#1e293b',
    gap: 12,
  },
  profileAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: '#00e5ff',
  },
  greeting: {
    fontSize: 10,
    fontWeight: '800',
    color: '#94a3b8',
    letterSpacing: 1,
  },
  playerName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#f8fafc',
  },
  topRightActions: {
    flexDirection: 'row',
    gap: 8,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#11183c',
    borderWidth: 1,
    borderColor: '#1e293b',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroCard: {
    borderRadius: 22,
    padding: 22,
    marginBottom: 24,
    shadowColor: '#7928ca',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 14,
    elevation: 6,
  },
  heroContent: {
    gap: 6,
  },
  heroSubtitle: {
    fontSize: 11,
    fontWeight: '900',
    color: '#ffd700',
    letterSpacing: 2,
  },
  heroTitle: {
    fontSize: 26,
    fontWeight: '900',
    color: '#ffffff',
    letterSpacing: 0.5,
  },
  heroDescription: {
    fontSize: 13,
    color: '#e2e8f0',
    lineHeight: 18,
    marginTop: 4,
  },
  menuSection: {
    gap: 14,
  },
  playNowCard: {
    borderRadius: 18,
    overflow: 'hidden',
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  playGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    gap: 16,
  },
  playIconContainer: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  playTextContainer: {
    flex: 1,
  },
  playTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#ffffff',
  },
  playSubtitle: {
    fontSize: 12,
    color: '#d1fae5',
    marginTop: 2,
  },
  rowActions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionTile: {
    flex: 1,
    backgroundColor: '#11183c',
    borderRadius: 18,
    padding: 18,
    borderWidth: 1.5,
    gap: 6,
  },
  tileTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#f8fafc',
    marginTop: 6,
  },
  tileDesc: {
    fontSize: 11,
    color: '#94a3b8',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#11183c',
    borderRadius: 22,
    padding: 22,
    width: '100%',
    maxHeight: '80%',
    borderWidth: 1.5,
    borderColor: '#6366f1',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#f8fafc',
  },
  modalScroll: {
    maxHeight: 340,
  },
  ruleItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginVertical: 8,
  },
  ruleText: {
    flex: 1,
    fontSize: 14,
    color: '#e2e8f0',
    lineHeight: 20,
  },
});
