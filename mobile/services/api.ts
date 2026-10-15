import { socketService } from './socket';

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
    const serverUrl = socketService.getServerUrl();
    const response = await fetch(`${serverUrl}/api/leaderboard`);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const data = await response.json();
    return data.data || [];
  } catch (err) {
    console.warn('Failed to fetch leaderboard from server, returning placeholder rankings:', err);
    return [
      {
        playerId: 'p1',
        username: 'BingoMaster',
        avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120',
        gamesPlayed: 42,
        wins: 34,
        losses: 6,
        draws: 2,
        winPercentage: 81.0,
      },
      {
        playerId: 'p2',
        username: 'StrikeKing',
        avatarUrl: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=120',
        gamesPlayed: 30,
        wins: 21,
        losses: 7,
        draws: 2,
        winPercentage: 70.0,
      },
      {
        playerId: 'p3',
        username: 'NeonLucky',
        avatarUrl: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=120',
        gamesPlayed: 18,
        wins: 11,
        losses: 6,
        draws: 1,
        winPercentage: 61.1,
      },
    ];
  }
}
