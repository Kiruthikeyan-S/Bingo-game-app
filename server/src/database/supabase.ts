import { createClient, SupabaseClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { RoomSession } from '../game/roomManager';
import { MatchHistoryItem } from '../../../shared/types';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

let supabase: SupabaseClient | null = null;

if (supabaseUrl && supabaseServiceKey) {
  try {
    supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false },
    });
    console.log('[Supabase] Initialized Supabase client successfully');
  } catch (err) {
    console.warn('[Supabase] Failed to initialize Supabase client:', err);
  }
} else {
  console.log('[Supabase] Credentials not provided; running in local in-memory persistence mode');
}

const inMemoryProfiles = new Map<string, { id: string; username: string; avatar_url: string }>();
const inMemoryStats = new Map<
  string,
  {
    player_id: string;
    username: string;
    games_played: number;
    wins: number;
    losses: number;
    draws: number;
    win_percentage: number;
  }
>();
const inMemoryHistory: Array<MatchHistoryItem & { playerId: string }> = [];

export class DatabaseService {
  /**
   * Upserts a player profile.
   */
  public static async saveProfile(
    playerId: string,
    username: string,
    avatarUrl: string
  ): Promise<void> {
    inMemoryProfiles.set(playerId, { id: playerId, username, avatar_url: avatarUrl });

    if (!supabase) return;
    try {
      await supabase.from('profiles').upsert({
        id: playerId,
        username,
        avatar_url: avatarUrl,
      });
    } catch (e) {
      console.error('[Supabase] Error saving profile:', e);
    }
  }

  /**
   * Persists a finished match and updates player stats across Bingo, Chess, and Ludo.
   */
  public static async recordMatch(room: RoomSession): Promise<void> {
    const playerIds = room.playerOrder;
    if (playerIds.length < 2) return;

    const winnerId = room.winnerId;
    const isDraw = !winnerId || room.resultType === 'draw' || room.resultType === 'stalemate';
    const movesCount =
      room.gameType === 'bingo'
        ? room.calledNumbers.length
        : room.gameType === 'chess'
        ? room.chessState?.moveHistory.length || 0
        : 24;

    for (const pId of playerIds) {
      const p = room.players.get(pId);
      if (!p) continue;

      const existing = inMemoryStats.get(p.id) || {
        player_id: p.id,
        username: p.username,
        games_played: 0,
        wins: 0,
        losses: 0,
        draws: 0,
        win_percentage: 0,
      };

      existing.games_played += 1;
      existing.username = p.username;

      let result: 'win' | 'loss' | 'draw' = 'loss';
      let coinsEarned = 15;

      if (isDraw) {
        existing.draws += 1;
        result = 'draw';
        coinsEarned = 35;
      } else if (winnerId === p.id) {
        existing.wins += 1;
        result = 'win';
        coinsEarned = 100;
      } else {
        existing.losses += 1;
        result = 'loss';
        coinsEarned = 15;
      }

      existing.win_percentage = Number(
        ((existing.wins / existing.games_played) * 100).toFixed(1)
      );

      inMemoryStats.set(p.id, existing);

      const opponentNames = playerIds
        .filter((id) => id !== pId)
        .map((id) => room.players.get(id)?.username || 'Opponent')
        .join(', ');

      inMemoryHistory.unshift({
        id: `m_${Date.now()}_${pId}`,
        playerId: pId,
        gameType: room.gameType,
        mode: 'online',
        opponentName: opponentNames || 'Opponent',
        result,
        resultReason: room.resultType || result,
        coinsEarned,
        movesCount,
        timestamp: new Date().toISOString(),
      });
    }

    if (!supabase) return;

    try {
      const [p1Id, p2Id] = playerIds;
      const { data: matchData, error: matchError } = await supabase
        .from('matches')
        .insert({
          room_code: room.roomCode,
          game_type: room.gameType,
          player_1_id: p1Id,
          player_2_id: p2Id,
          status: 'finished',
          winner_id: winnerId,
          result_type: room.resultType || 'unknown',
          started_at: new Date(room.createdAt).toISOString(),
          finished_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (matchError || !matchData) {
        console.error('[Supabase] Error inserting match:', matchError);
        return;
      }

      for (const pId of playerIds) {
        const stats = inMemoryStats.get(pId);
        if (!stats) continue;
        await supabase.from('player_stats').upsert({
          player_id: pId,
          games_played: stats.games_played,
          wins: stats.wins,
          losses: stats.losses,
          draws: stats.draws,
          win_percentage: stats.win_percentage,
        });
      }
    } catch (err) {
      console.error('[Supabase] Error recording match to database:', err);
    }
  }

  /**
   * Retrieves recent match history for a player (or global recent matches).
   */
  public static async getMatchHistory(playerId?: string): Promise<MatchHistoryItem[]> {
    const filtered = playerId
      ? inMemoryHistory.filter((item) => item.playerId === playerId)
      : inMemoryHistory;
    return filtered.slice(0, 30);
  }

  /**
   * Retrieves the leaderboard sorted by wins.
   */
  public static async getLeaderboard() {
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('player_stats')
          .select(
            'player_id, games_played, wins, losses, draws, win_percentage, profiles(username, avatar_url)'
          )
          .order('wins', { ascending: false })
          .limit(20);

        if (!error && data) {
          return data.map((row: any) => ({
            playerId: row.player_id,
            username: row.profiles?.username || 'Player',
            avatarUrl: row.profiles?.avatar_url || '',
            gamesPlayed: row.games_played,
            wins: row.wins,
            losses: row.losses,
            draws: row.draws,
            winPercentage: row.win_percentage,
          }));
        }
      } catch (e) {
        console.error('[Supabase] Error fetching leaderboard:', e);
      }
    }

    return Array.from(inMemoryStats.values())
      .sort((a, b) => b.wins - a.wins)
      .map((row) => ({
        playerId: row.player_id,
        username: row.username,
        avatarUrl: inMemoryProfiles.get(row.player_id)?.avatar_url || '',
        gamesPlayed: row.games_played,
        wins: row.wins,
        losses: row.losses,
        draws: row.draws,
        winPercentage: row.win_percentage,
      }));
  }
}
