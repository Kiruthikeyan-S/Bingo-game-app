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
                color={isActive ? '#00e5ff' : isLight ? '#475569' : '#64748b'}
              />
            </View>
            <Text
              style={[
                styles.tabLabel,
                isLight && styles.tabLabelLight,
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
    backgroundColor: '#090e26',
    borderTopWidth: 1.5,
    borderTopColor: '#1e2b5e',
    paddingVertical: 8,
    paddingHorizontal: 8,
  },
  containerLight: {
    backgroundColor: '#ffffff',
    borderTopColor: '#e2e8f0',
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
    backgroundColor: 'rgba(0, 229, 255, 0.14)',
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748b',
  },
  tabLabelLight: {
    color: '#475569',
  },
  tabLabelActive: {
    color: '#00e5ff',
    fontWeight: '900',
  },
});
