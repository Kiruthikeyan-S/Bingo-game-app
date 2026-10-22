import { socketService } from './socket';
import { firebaseService } from './firebaseService';

export interface LeaderboardEntry {
  playerId: string;
  username: string;
  avatarUrl: string;
  gamesPlayed: number;
  wins: number;
  losses: number;
  draws: number;
  winPercentage: number;
}

export async function fetchLeaderboard(): Promise<LeaderboardEntry[]> {
  try {
    // 1. Try Firebase Firestore live rankings first
    const firestoreEntries = await firebaseService.fetchLeaderboard();
    if (firestoreEntries.length > 0) {
      return firestoreEntries;
    }

    // 2. Fall back to multiplayer server API
    const serverUrl = socketService.getServerUrl();
    const response = await fetch(`${serverUrl}/api/leaderboard`);
    if (response.ok) {
      const data = await response.json();
      if (data.data && data.data.length > 0) {
        return data.data;
      }
    }
  } catch (err) {
    console.warn('Failed to fetch leaderboard from cloud, using fallback data:', err);
  }

  // 3. Fallback ranking champions
  return [
    {
      playerId: 'p1',
      username: 'GrandmasterKai',
      avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120',
      gamesPlayed: 48,
      wins: 38,
      losses: 8,
      draws: 2,
      winPercentage: 79.2,
    },
    {
      playerId: 'p2',
      username: 'BingoQueenAria',
      avatarUrl: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=120',
      gamesPlayed: 36,
      wins: 27,
      losses: 7,
      draws: 2,
      winPercentage: 75.0,
    },
    {
      playerId: 'p3',
      username: 'LudoTitan',
      avatarUrl: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=120',
      gamesPlayed: 25,
      wins: 17,
      losses: 7,
      draws: 1,
      winPercentage: 68.0,
    },
  ];
}
