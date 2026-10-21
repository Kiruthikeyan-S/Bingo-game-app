import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { usePlayerStore } from '../store/playerStore';
import { GameType } from '../../shared/types';
import { BottomNavBar } from '../components/BottomNavBar';

const COLORS = {
  bgDark: '#04070F',
  surface: '#11183C',
  surfaceElevated: '#1E295E',
  border: '#1E293B',
  primary: '#00E5FF',
  indigoLight: '#818CF8',
  success: '#10B981',
  gold: '#F59E0B',
  danger: '#EF4444',
  text: '#F8FAFC',
  textSecondary: '#94A3B8',
  textMuted: '#64748B',
};

type FilterTab = 'all' | GameType;

const FILTERS: { id: FilterTab; label: string; icon: string }[] = [
  { id: 'all', label: 'All Games', icon: '⚡' },
  { id: 'bingo', label: 'Bingo', icon: '🎯' },
  { id: 'chess', label: 'Chess', icon: '♟️' },
  { id: 'ludo', label: 'Ludo', icon: '🎲' },
];

export default function HistoryScreen() {
  const { matchHistory, stats } = usePlayerStore();
  const [filter, setFilter] = useState<FilterTab>('all');

  const filtered =
    filter === 'all'
      ? matchHistory
      : matchHistory.filter((item) => item.gameType === filter);

  const activeStats =
    filter === 'all'
      ? {
          wins: stats.wins,
          losses: stats.losses,
          draws: stats.draws,
          played: stats.played,
        }
      : stats.byGame[filter];

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={['#04070F', '#0A0F1E', '#04070F']}
        style={styles.fill}
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.eyebrow}>CAREER ARCHIVE</Text>
          <Text style={styles.title}>Match History & Stats</Text>
        </View>

        {/* Filter Tabs */}
        <View style={styles.filterRow}>
          {FILTERS.map((f) => {
            const active = filter === f.id;
            return (
              <Pressable
                key={f.id}
                onPress={() => setFilter(f.id)}
                style={[styles.filterChip, active && styles.filterChipActive]}
              >
                <Text style={styles.filterIcon}>{f.icon}</Text>
                <Text
                  style={[styles.filterText, active && styles.filterTextActive]}
                >
                  {f.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* Stats Summary Card */}
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={[styles.statVal, { color: COLORS.success }]}>
              {activeStats.wins}
            </Text>
            <Text style={styles.statLbl}>WINS</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={[styles.statVal, { color: COLORS.danger }]}>
              {activeStats.losses}
            </Text>
            <Text style={styles.statLbl}>LOSSES</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={[styles.statVal, { color: COLORS.gold }]}>
              {activeStats.draws}
            </Text>
            <Text style={styles.statLbl}>DRAWS</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={[styles.statVal, { color: COLORS.primary }]}>
              {activeStats.played > 0
                ? `${Math.round(
                    (activeStats.wins / activeStats.played) * 100
                  )}%`
                : '0%'}
            </Text>
            <Text style={styles.statLbl}>WIN RATE</Text>
          </View>
        </View>

        {/* History Items */}
        <Text style={styles.sectionTitle}>
          RECENT MATCHES ({filtered.length})
        </Text>

        {filtered.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyEmoji}>📜</Text>
            <Text style={styles.emptyTitle}>No matches recorded yet</Text>
            <Text style={styles.emptySub}>
              Play Bingo, Chess, or Ludo against Smart Bots or Online Friends to
              build your battle log!
            </Text>
          </View>
        ) : (
          filtered.map((item) => {
            const isWin = item.result === 'win';
            const isDraw = item.result === 'draw';
            const badgeColor = isWin
              ? COLORS.success
              : isDraw
              ? COLORS.gold
              : COLORS.danger;
            const gameIcon =
              item.gameType === 'bingo'
                ? '🎯'
                : item.gameType === 'chess'
                ? '♟️'
                : '🎲';

            return (
              <View key={item.id} style={styles.historyCard}>
                <View style={styles.gameIconBadge}>
                  <Text style={styles.gameIconText}>{gameIcon}</Text>
                </View>

                <View style={styles.historyBody}>
                  <View style={styles.historyTopLine}>
                    <Text style={styles.historyGameTitle}>
                      {item.gameType.toUpperCase()} vs {item.opponentName}
                    </Text>
                    <View
                      style={[
                        styles.resultPill,
                        {
                          backgroundColor: badgeColor + '20',
                          borderColor: badgeColor,
                        },
                      ]}
                    >
                      <Text style={[styles.resultText, { color: badgeColor }]}>
                        {item.result.toUpperCase()}
                      </Text>
                    </View>
                  </View>

                  <Text style={styles.historyDetails}>
                    {item.resultReason} (+{item.coinsEarned} coins)
                  </Text>

                  <View style={styles.historyMetaRow}>
                    <Text style={styles.historyMetaTag}>
                      {item.mode === 'bot'
                        ? `🤖 Bot (${item.difficulty || 'medium'})`
                        : '🌐 Online Room'}
                    </Text>
                    <Text style={styles.historyDate}>
                      {new Date(item.timestamp).toLocaleDateString()} •{' '}
                      {item.movesCount} moves
                    </Text>
                  </View>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      <BottomNavBar />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.bgDark,
  },
  fill: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  },
  scrollContent: {
    paddingTop: 54,
    paddingHorizontal: 16,
    paddingBottom: 110,
  },
  header: {
    marginBottom: 16,
  },
  eyebrow: {
    color: COLORS.primary,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
  title: {
    color: COLORS.text,
    fontSize: 24,
    fontWeight: '900',
    marginTop: 2,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  filterChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 9,
    borderRadius: 12,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  filterChipActive: {
    borderColor: COLORS.primary,
    backgroundColor: 'rgba(16, 185, 129, 0.14)',
  },
  filterIcon: {
    fontSize: 13,
  },
  filterText: {
    color: COLORS.textSecondary,
    fontSize: 11,
    fontWeight: '700',
  },
  filterTextActive: {
    color: COLORS.text,
    fontWeight: '900',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
  },
  statBox: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  statVal: {
    fontSize: 18,
    fontWeight: '900',
  },
  statLbl: {
    color: COLORS.textMuted,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginTop: 3,
  },
  sectionTitle: {
    color: COLORS.textMuted,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.4,
    marginBottom: 10,
  },
  emptyBox: {
    backgroundColor: COLORS.surface,
    borderRadius: 18,
    padding: 28,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  emptyEmoji: {
    fontSize: 38,
    marginBottom: 8,
  },
  emptyTitle: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 4,
  },
  emptySub: {
    color: COLORS.textSecondary,
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
  },
  historyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 18,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  gameIconBadge: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: COLORS.surfaceElevated,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  gameIconText: {
    fontSize: 22,
  },
  historyBody: {
    flex: 1,
  },
  historyTopLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  historyGameTitle: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '800',
  },
  resultPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    borderWidth: 1,
  },
  resultText: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  historyDetails: {
    color: COLORS.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  historyMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 5,
  },
  historyMetaTag: {
    color: COLORS.indigoLight,
    fontSize: 10,
    fontWeight: '700',
  },
  historyDate: {
    color: COLORS.textMuted,
    fontSize: 10,
  },
});
