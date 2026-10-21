-- Game Hub (Bingo • Chess • Ludo) Database Schema
-- Run this in your Supabase SQL Editor

-- 1. Profiles Table
CREATE TABLE IF NOT EXISTS public.profiles (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL,
  avatar_url TEXT,
  coins INT DEFAULT 500,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Matches Table
CREATE TABLE IF NOT EXISTS public.matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_code VARCHAR(6) NOT NULL,
  game_type TEXT NOT NULL DEFAULT 'bingo', -- 'bingo', 'chess', 'ludo'
  player_1_id TEXT NOT NULL,
  player_2_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'finished',
  winner_id TEXT,
  result_type TEXT NOT NULL, -- 'win', 'draw', 'forfeit', 'checkmate', 'stalemate', 'resign'
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  finished_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Match Players Table
CREATE TABLE IF NOT EXISTS public.match_players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID REFERENCES public.matches(id) ON DELETE CASCADE,
  player_id TEXT NOT NULL,
  board_layout JSONB NOT NULL DEFAULT '[]'::jsonb,
  lines_completed INT DEFAULT 0,
  final_score INT DEFAULT 0
);

-- 4. Match Moves Table
CREATE TABLE IF NOT EXISTS public.match_moves (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID REFERENCES public.matches(id) ON DELETE CASCADE,
  player_id TEXT NOT NULL,
  number_called INT DEFAULT 0,
  move_notation TEXT,
  move_number INT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Player Stats Table
CREATE TABLE IF NOT EXISTS public.player_stats (
  player_id TEXT PRIMARY KEY,
  games_played INT DEFAULT 0,
  wins INT DEFAULT 0,
  losses INT DEFAULT 0,
  draws INT DEFAULT 0,
  win_percentage NUMERIC(5, 2) DEFAULT 0.00,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indices for performance
CREATE INDEX IF NOT EXISTS idx_matches_room_code ON public.matches(room_code);
CREATE INDEX IF NOT EXISTS idx_matches_game_type ON public.matches(game_type);
CREATE INDEX IF NOT EXISTS idx_player_stats_wins ON public.player_stats(wins DESC);
CREATE INDEX IF NOT EXISTS idx_match_moves_match_id ON public.match_moves(match_id);

-- Enable Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.match_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.match_moves ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.player_stats ENABLE ROW LEVEL SECURITY;

-- Allow public read for leaderboard and stats
CREATE POLICY "Public profiles can be read" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Public player stats can be read" ON public.player_stats FOR SELECT USING (true);
CREATE POLICY "Public match results can be read" ON public.matches FOR SELECT USING (true);
