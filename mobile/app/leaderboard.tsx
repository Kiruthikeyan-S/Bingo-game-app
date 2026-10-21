import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Trophy, Medal, Crown } from 'lucide-react-native';
import { GameHeader } from '../components/GameHeader';
import { BottomNavBar } from '../components/BottomNavBar';
import { fetchLeaderboard, LeaderboardEntry } from '../services/api';
import { usePlayerStore } from '../store/playerStore';

export default function LeaderboardScreen() {
  const currentUsername = usePlayerStore((s) => s.username);
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async () => {
    try {
      const data = await fetchLeaderboard();
      setEntries(data);
    } catch (e) {
      console.warn(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const getRankBadge = (rank: number) => {
    if (rank === 1) return <Crown size={20} color="#ffd700" />;
    if (rank === 2) return <Medal size={20} color="#cbd5e1" />;
    if (rank === 3) return <Medal size={20} color="#b45309" />;
    return <Text style={styles.rankNum}>#{rank}</Text>;
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <GameHeader title="Leaderboard" subtitle="Top Game Hub Champions" />

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#00e5ff" />
          <Text style={styles.loadingText}>Fetching warrior ranks...</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#00e5ff"
            />
          }
        >
          {entries.map((entry, index) => {
            const rank = index + 1;
            const isMe = entry.username.toLowerCase() === currentUsername.toLowerCase();

            return (
              <View
                key={entry.playerId || index}
                style={[styles.entryCard, isMe && styles.myCard]}
              >
                <View style={styles.rankContainer}>{getRankBadge(rank)}</View>

                <Image
                  source={{
                    uri:
                      entry.avatarUrl ||
                      'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120',
                  }}
                  style={styles.avatar}
                />

                <View style={styles.userColumn}>
                  <Text style={styles.username} numberOfLines={1}>
                    {entry.username} {isMe ? '(You)' : ''}
                  </Text>
                  <Text style={styles.statsSummary}>
                    {entry.wins}W / {entry.losses}L / {entry.draws}D
                  </Text>
                </View>

                <View style={styles.winRateBox}>
                  <Text style={styles.winRateVal}>{entry.winPercentage}%</Text>
                  <Text style={styles.winRateLabel}>WIN RATE</Text>
                </View>
              </View>
            );
          })}
        </ScrollView>
      )}
      <BottomNavBar />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#070b1e',
  },
  content: {
    padding: 16,
    paddingBottom: 110,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    color: '#94a3b8',
    fontSize: 14,
    fontWeight: '600',
  },
  entryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#11183c',
    borderRadius: 16,
    padding: 14,
    marginVertical: 5,
    borderWidth: 1.5,
    borderColor: '#1e293b',
  },
  myCard: {
    borderColor: '#00e5ff',
    backgroundColor: 'rgba(0, 229, 255, 0.08)',
  },
  rankContainer: {
    width: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankNum: {
    fontSize: 14,
    fontWeight: '900',
    color: '#64748b',
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginHorizontal: 12,
    backgroundColor: '#1e293b',
  },
  userColumn: {
    flex: 1,
  },
  username: {
    fontSize: 15,
    fontWeight: '800',
    color: '#f8fafc',
  },
  statsSummary: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 2,
  },
  winRateBox: {
    alignItems: 'flex-end',
  },
  winRateVal: {
    fontSize: 16,
    fontWeight: '900',
    color: '#00ff87',
  },
  winRateLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#64748b',
    letterSpacing: 0.5,
  },
});
