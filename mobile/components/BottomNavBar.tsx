import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { Home, Users, History, Trophy, User } from 'lucide-react-native';
import { usePlayerStore } from '../store/playerStore';

const NAV_ITEMS = [
  { label: 'Home', path: '/home', icon: Home },
  { label: 'Friends', path: '/friends', icon: Users },
  { label: 'History', path: '/history', icon: History },
  { label: 'Ranks', path: '/leaderboard', icon: Trophy },
  { label: 'Profile', path: '/profile', icon: User },
] as const;

export const BottomNavBar: React.FC = () => {
  const router = useRouter();
  const pathname = usePathname();
  const theme = usePlayerStore((s) => s.theme);
  const isLight = theme === 'light';

  return (
    <View style={[styles.container, isLight && styles.containerLight]}>
      {NAV_ITEMS.map((item) => {
        const IconComp = item.icon;
        const isActive = pathname === item.path;
        return (
          <TouchableOpacity
            key={item.path}
            activeOpacity={0.8}
            style={[styles.tabButton, isActive && styles.tabButtonActive]}
            onPress={() => {
              if (!isActive) {
                router.replace(item.path as any);
              }
            }}
          >
            <View style={[styles.iconWrap, isActive && styles.iconWrapActive]}>
              <IconComp
                size={20}
                color={isActive ? '#4F46E5' : '#64748B'}
              />
            </View>
            <Text
              style={[
                styles.tabLabel,
                styles.tabLabelLight,
                isActive && styles.tabLabelActive,
              ]}
            >
              {item.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1.5,
    borderTopColor: '#E2E8F0',
    paddingVertical: 8,
    paddingHorizontal: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 8,
  },
  containerLight: {
    backgroundColor: '#FFFFFF',
    borderTopColor: '#E2E8F0',
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
    gap: 3,
  },
  tabButtonActive: {},
  iconWrap: {
    paddingHorizontal: 14,
    paddingVertical: 4,
    borderRadius: 12,
  },
  iconWrapActive: {
    backgroundColor: 'rgba(79, 70, 229, 0.12)',
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
  },
  tabLabelLight: {
    color: '#64748B',
  },
  tabLabelActive: {
    color: '#4F46E5',
    fontWeight: '900',
  },
});
