import { createClient, SupabaseClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { RoomSession } from '../game/roomManager';

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

// In-memory fallback stores
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

export class DatabaseService {
  /**
   * Upserts a player profile.
   */
  public static async saveProfile(playerId: string, username: string, avatarUrl: string): Promise<void> {
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
   * Persists a finished match and updates player stats.
   */
  public static async recordMatch(room: RoomSession): Promise<void> {
    const [p1Id, p2Id] = room.playerOrder;
    const p1 = room.players.get(p1Id);
    const p2 = room.players.get(p2Id);
    if (!p1 || !p2) return;

    const winnerId = room.winnerId;
    const isDraw = room.resultType === 'draw';

    // Update in-memory stats
    for (const p of [p1, p2]) {
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

      if (isDraw) {
        existing.draws += 1;
      } else if (winnerId === p.id) {
        existing.wins += 1;
      } else {
        existing.losses += 1;
      }

      existing.win_percentage = Number(
        ((existing.wins / existing.games_played) * 100).toFixed(1)
      );

      inMemoryStats.set(p.id, existing);
    }

    if (!supabase) return;

    try {
      // 1. Insert match
      const { data: matchData, error: matchError } = await supabase
        .from('matches')
        .insert({
          room_code: room.roomCode,
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

      const matchId = matchData.id;

      // 2. Insert match_players
      await supabase.from('match_players').insert([
        {
          match_id: matchId,
          player_id: p1Id,
          board_layout: room.boards.get(p1Id) || [],
          lines_completed: room.playerLines.get(p1Id) || 0,
        },
        {
          match_id: matchId,
          player_id: p2Id,
          board_layout: room.boards.get(p2Id) || [],
          lines_completed: room.playerLines.get(p2Id) || 0,
        },
      ]);

      // 3. Upsert player stats in Supabase
      for (const p of [p1, p2]) {
        const stats = inMemoryStats.get(p.id)!;
        await supabase.from('player_stats').upsert({
          player_id: p.id,
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
   * Retrieves the leaderboard sorted by wins.
   */
  public static async getLeaderboard() {
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('player_stats')
          .select('player_id, games_played, wins, losses, draws, win_percentage, profiles(username, avatar_url)')
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

    // Fallback to in-memory stats
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
