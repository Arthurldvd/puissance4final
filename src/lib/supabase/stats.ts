import { createClient } from './client';

export interface PlayerStats {
  player_id: string;
  display_name: string;
  total_games: number;
  wins: number;
  losses: number;
  draws: number;
  win_rate: number;
  total_moves: number;
  avg_moves_per_game: number;
  fastest_win: number | null;
  wins_as_player1: number;
  wins_as_player2: number;
  games_as_player1: number;
  games_as_player2: number;
  last_played_at: string | null;
  unique_opponents: number;
}

export async function getPlayerStats(userId: string): Promise<PlayerStats | null> {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from('player_stats')
    .select('*')
    .eq('player_id', userId)
    .single();

  if (error) {
    console.error('Erreur récupération stats:', error);
    return null;
  }

  return data;
}

export async function getLeaderboard(limit: number = 10) {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from('player_stats')
    .select('*')
    .order('wins', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Erreur récupération leaderboard:', error);
    return [];
  }

  return data;
}

export async function getRecentGames(userId: string, limit: number = 10) {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from('games')
    .select(`
      *,
      player1:player1_id(email, raw_user_meta_data),
      player2:player2_id(email, raw_user_meta_data)
    `)
    .or(`player1_id.eq.${userId},player2_id.eq.${userId}`)
    .eq('status', 'completed')
    .order('ended_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Erreur récupération parties récentes:', error);
    return [];
  }

  return data;
}
