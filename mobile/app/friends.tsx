import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Pressable,
  Share,
  Image,
} from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import {
  Grid,
  Crown,
  Dices,
  UserPlus,
  Share2,
  X,
  Plus,
} from 'lucide-react-native';
import { usePlayerStore } from '../store/playerStore';
import { useGameStore } from '../store/gameStore';
import { GameType } from '../../shared/types';
import { BottomNavBar } from '../components/BottomNavBar';

const COLORS = {
  bgDark: '#04070F',
  surface: '#11183C',
  surfaceLight: '#19224D',
  surfaceElevated: '#1E295E',
  border: '#1E293B',
  borderLight: '#334155',
  primary: '#00E5FF',
  indigoLight: '#818CF8',
  success: '#10B981',
  gold: '#F59E0B',
  danger: '#EF4444',
  text: '#F8FAFC',
  textSecondary: '#94A3B8',
  textMuted: '#64748B',
  textDim: '#475569',
};

const GAME_OPTIONS: { id: GameType; label: string; color: string }[] = [
  { id: 'bingo', label: 'Bingo 5x5', color: COLORS.primary },
  { id: 'chess', label: 'Royal Chess', color: '#818CF8' },
  { id: 'ludo', label: 'Classic Ludo', color: '#10B981' },
];

export default function FriendsScreen() {
  const { friends, addFriend, removeFriend, username } = usePlayerStore();
  const { setSelectedGame, setGameMode, roomCode } = useGameStore();
  const [newFriendName, setNewFriendName] = useState('');
  const [selectedInviteGame, setSelectedInviteGame] = useState<GameType>('bingo');

  const handleAddFriend = () => {
    const trimmed = newFriendName.trim();
    if (!trimmed) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    addFriend(trimmed, selectedInviteGame);
    setNewFriendName('');
  };

  const handleInviteFriend = async (friendName: string) => {
    Haptics.selectionAsync().catch(() => {});
    const gameMeta = GAME_OPTIONS.find((g) => g.id === selectedInviteGame)!;
    const codeMsg = roomCode
      ? `Join my private room [${roomCode}] in ${gameMeta.label}!`
      : `Hey ${friendName}! Come play ${gameMeta.label} with me on Game Hub!`;

    try {
      await Share.share({
        message: `${codeMsg} - Invited by ${username}`,
      });
    } catch {
      // ignore
    }
  };

  const handleCreatePrivateRoomForFriend = (game: GameType) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    setSelectedGame(game);
    setGameMode('online');
    router.push({ pathname: '/create-room' as any, params: { gameType: game } });
  };

  const renderGameIcon = (id: GameType, color: string) => {
    if (id === 'bingo') return <Grid size={14} color={color} />;
    if (id === 'chess') return <Crown size={14} color={color} />;
    return <Dices size={14} color={color} />;
  };

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
        {/* Header */}
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.eyebrow}>MULTIPLAYER SQUAD</Text>
            <Text style={styles.title}>Friends & Invites</Text>
          </View>
          <View style={styles.onlinePill}>
            <View style={styles.onlineDot} />
            <Text style={styles.onlineCountText}>
              {friends.filter((f) => f.status !== 'offline').length} Online
            </Text>
          </View>
        </View>

        {/* Quick Create Room Banner */}
        <View style={styles.quickRoomCard}>
          <Text style={styles.sectionLabel}>HOST PRIVATE MATCH FOR FRIENDS</Text>
          <View style={styles.gameSwitchRow}>
            {GAME_OPTIONS.map((g) => {
              const active = selectedInviteGame === g.id;
              return (
                <Pressable
                  key={g.id}
                  onPress={() => {
                    Haptics.selectionAsync().catch(() => {});
                    setSelectedInviteGame(g.id);
                  }}
                  style={[
                    styles.gameChip,
                    active && { borderColor: g.color, backgroundColor: g.color + '20' },
                  ]}
                >
                  {renderGameIcon(g.id, active ? g.color : COLORS.textSecondary)}
                  <Text
                    style={[
                      styles.gameChipText,
                      active && { color: COLORS.text, fontWeight: '900' },
                    ]}
                  >
                    {g.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <Pressable
            onPress={() => handleCreatePrivateRoomForFriend(selectedInviteGame)}
            style={({ pressed }) => [
              styles.hostRoomBtn,
              pressed && { opacity: 0.9, transform: [{ scale: 0.99 }] },
            ]}
          >
            <LinearGradient
              colors={['#00E5FF', '#6366F1']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.hostRoomBtnInner}
            >
              <Plus size={15} color="#03120E" />
              <Text style={styles.hostRoomBtnText}>
                CREATE {selectedInviteGame.toUpperCase()} ROOM CODE
              </Text>
            </LinearGradient>
          </Pressable>
        </View>

        {/* Add Friend Input */}
        <View style={styles.addCard}>
          <Text style={styles.sectionLabel}>ADD FRIEND BY USERNAME</Text>
          <View style={styles.inputRow}>
            <TextInput
              value={newFriendName}
              onChangeText={setNewFriendName}
              placeholder="Enter friend's username..."
              placeholderTextColor={COLORS.textDim}
              style={styles.input}
              maxLength={20}
              onSubmitEditing={handleAddFriend}
            />
            <Pressable
              onPress={handleAddFriend}
              style={({ pressed }) => [
                styles.addBtn,
                pressed && { opacity: 0.85 },
              ]}
            >
              <UserPlus size={15} color="#04120E" />
              <Text style={styles.addBtnText}>ADD</Text>
            </Pressable>
          </View>
        </View>

        {/* Friends List */}
        <Text style={styles.listHeader}>FRIENDS LIST ({friends.length})</Text>
        {friends.map((friend) => {
          const isOnline = friend.status === 'online';
          const isInGame = friend.status === 'in_game';
          return (
            <View key={friend.id} style={styles.friendCard}>
              <View style={styles.friendAvatar}>
                <Image
                  source={{ uri: friend.avatarUrl }}
                  style={styles.friendAvatarImg}
                />
                <View
                  style={[
                    styles.statusDot,
                    {
                      backgroundColor: isOnline
                        ? COLORS.success
                        : isInGame
                        ? COLORS.gold
                        : COLORS.textDim,
                    },
                  ]}
                />
              </View>

              <View style={styles.friendInfo}>
                <Text style={styles.friendName}>{friend.username}</Text>
                <Text style={styles.friendMeta}>
                  {isOnline
                    ? `Online | Fav: ${friend.favoriteGame.toUpperCase()} | ${friend.wins}W`
                    : isInGame
                    ? `In Match (${friend.favoriteGame.toUpperCase()})`
                    : 'Offline'}
                </Text>
              </View>

              <View style={styles.friendActions}>
                <Pressable
                  onPress={() => handleInviteFriend(friend.username)}
                  style={styles.inviteBtn}
                >
                  <Share2 size={12} color={COLORS.indigoLight} />
                  <Text style={styles.inviteBtnText}>INVITE</Text>
                </Pressable>
                <Pressable
                  onPress={() => removeFriend(friend.id)}
                  style={styles.removeBtn}
                >
                  <X size={14} color={COLORS.textMuted} />
                </Pressable>
              </View>
            </View>
          );
        })}
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
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  onlinePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(16, 185, 129, 0.14)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.35)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  onlineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.success,
  },
  onlineCountText: {
    color: COLORS.success,
    fontSize: 11,
    fontWeight: '900',
  },
  quickRoomCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    marginBottom: 16,
  },
  sectionLabel: {
    color: COLORS.textSecondary,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.3,
    marginBottom: 10,
  },
  gameSwitchRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  gameChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 9,
    borderRadius: 12,
    backgroundColor: COLORS.surfaceLight,
    borderWidth: 1.5,
    borderColor: COLORS.border,
  },
  gameChipText: {
    color: COLORS.textSecondary,
    fontSize: 11,
    fontWeight: '700',
  },
  hostRoomBtn: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  hostRoomBtnInner: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 13,
    alignItems: 'center',
    borderRadius: 12,
  },
  hostRoomBtnText: {
    color: '#03120E',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1,
  },
  addCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 16,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 8,
  },
  input: {
    flex: 1,
    backgroundColor: COLORS.surfaceLight,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 11,
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '700',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  addBtn: {
    flexDirection: 'row',
    gap: 5,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
  },
  addBtnText: {
    color: '#04120E',
    fontWeight: '900',
    fontSize: 12,
    letterSpacing: 1,
  },
  listHeader: {
    color: COLORS.textMuted,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.4,
    marginBottom: 10,
  },
  friendCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 18,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  friendAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.surfaceElevated,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    position: 'relative',
  },
  friendAvatarImg: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  statusDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: COLORS.surface,
  },
  friendInfo: {
    flex: 1,
  },
  friendName: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: '800',
  },
  friendMeta: {
    color: COLORS.textSecondary,
    fontSize: 11,
    marginTop: 2,
    fontWeight: '600',
  },
  friendActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  inviteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(99, 102, 241, 0.18)',
    borderWidth: 1,
    borderColor: COLORS.indigoLight,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 12,
  },
  inviteBtnText: {
    color: COLORS.indigoLight,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  removeBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: COLORS.surfaceLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
