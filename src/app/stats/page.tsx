'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { ThemeToggle } from '@/components/ThemeToggle';

interface PlayerStats {
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
  unique_opponents: number;
  last_played_at: string | null;
}

interface HeadToHeadStats {
  opponent_id: string;
  opponent_name: string;
  total_games: number;
  wins: number;
  losses: number;
  draws: number;
}

export default function StatsPage() {
  const [stats, setStats] = useState<PlayerStats | null>(null);
  const [headToHead, setHeadToHead] = useState<HeadToHeadStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState('');
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const loadStats = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        router.push('/login');
        return;
      }

      setUserName(user.user_metadata.display_name || user.email?.split('@')[0] || 'Joueur');

      // Récupérer toutes les parties du joueur (sans JOIN)
      const { data: games, error } = await supabase
        .from('games')
        .select('*')
        .or(`player1_id.eq.${user.id},player2_id.eq.${user.id}`)
        .eq('status', 'completed')
        .order('ended_at', { ascending: false });

      if (error) {
        console.error('Erreur chargement games:', error);
        setLoading(false);
        return;
      }

      console.log('📊 Parties chargées:', games?.length || 0);

      if (!games || games.length === 0) {
        setStats({
          total_games: 0,
          wins: 0,
          losses: 0,
          draws: 0,
          win_rate: 0,
          total_moves: 0,
          avg_moves_per_game: 0,
          fastest_win: null,
          wins_as_player1: 0,
          wins_as_player2: 0,
          games_as_player1: 0,
          games_as_player2: 0,
          unique_opponents: 0,
          last_played_at: null
        });
        setLoading(false);
        return;
      }

      // Calculer les stats
      let wins = 0;
      let losses = 0;
      let draws = 0;
      let gamesAsPlayer1 = 0;
      let gamesAsPlayer2 = 0;
      let winsAsPlayer1 = 0;
      let winsAsPlayer2 = 0;
      let totalMoves = 0;
      let fastestWin: number | null = null;
      const opponents = new Set<string>();
      const opponentStats = new Map<string, HeadToHeadStats>();

      games.forEach(game => {
        const isPlayer1 = game.player1_id === user.id;
        const isPlayer2 = game.player2_id === user.id;
        
        if (isPlayer1) {
          gamesAsPlayer1++;
          totalMoves += Math.ceil((game.total_moves || 0) / 2);
          opponents.add(game.player2_id);
          
          // Head to head
          const opponentId = game.player2_id;
          const opponentName = game.player2_name || `Adversaire ${opponentStats.size + 1}`;
          
          if (!opponentStats.has(opponentId)) {
            opponentStats.set(opponentId, {
              opponent_id: opponentId,
              opponent_name: opponentName,
              total_games: 0,
              wins: 0,
              losses: 0,
              draws: 0
            });
          }
          
          const oppStats = opponentStats.get(opponentId)!;
          oppStats.total_games++;
          
          if (game.winner_id === user.id) {
            wins++;
            winsAsPlayer1++;
            oppStats.wins++;
            
            const playerMoves = Math.ceil((game.total_moves || 0) / 2);
            if (fastestWin === null || playerMoves < fastestWin) {
              fastestWin = playerMoves;
            }
          } else if (game.winner_id === null) {
            draws++;
            oppStats.draws++;
          } else {
            losses++;
            oppStats.losses++;
          }
        } else if (isPlayer2) {
          gamesAsPlayer2++;
          totalMoves += Math.floor((game.total_moves || 0) / 2);
          opponents.add(game.player1_id);
          
          // Head to head
          const opponentId = game.player1_id;
          const opponentName = game.player1_name || `Adversaire ${opponentStats.size + 1}`;
          
          if (!opponentStats.has(opponentId)) {
            opponentStats.set(opponentId, {
              opponent_id: opponentId,
              opponent_name: opponentName,
              total_games: 0,
              wins: 0,
              losses: 0,
              draws: 0
            });
          }
          
          const oppStats = opponentStats.get(opponentId)!;
          oppStats.total_games++;
          
          if (game.winner_id === user.id) {
            wins++;
            winsAsPlayer2++;
            oppStats.wins++;
            
            const playerMoves = Math.floor((game.total_moves || 0) / 2);
            if (fastestWin === null || playerMoves < fastestWin) {
              fastestWin = playerMoves;
            }
          } else if (game.winner_id === null) {
            draws++;
            oppStats.draws++;
          } else {
            losses++;
            oppStats.losses++;
          }
        }
      });

      const totalGames = games.length;
      const winRate = totalGames > 0 ? (wins / totalGames) * 100 : 0;
      const avgMovesPerGame = totalGames > 0 ? totalMoves / totalGames : 0;

      setStats({
        total_games: totalGames,
        wins,
        losses,
        draws,
        win_rate: Math.round(winRate * 100) / 100,
        total_moves: totalMoves,
        avg_moves_per_game: Math.round(avgMovesPerGame * 10) / 10,
        fastest_win: fastestWin,
        wins_as_player1: winsAsPlayer1,
        wins_as_player2: winsAsPlayer2,
        games_as_player1: gamesAsPlayer1,
        games_as_player2: gamesAsPlayer2,
        unique_opponents: opponents.size,
        last_played_at: games[0]?.ended_at || null
      });

      setHeadToHead(Array.from(opponentStats.values()).sort((a, b) => b.total_games - a.total_games));
      setLoading(false);
    };

    loadStats();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 dark:from-gray-900 dark:via-purple-900 dark:to-indigo-900">
        <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-white"></div>
      </div>
    );
  }

  const winRatePlayer1 = stats?.games_as_player1 
    ? ((stats.wins_as_player1 / stats.games_as_player1) * 100).toFixed(1)
    : '0.0';
  
  const winRatePlayer2 = stats?.games_as_player2 
    ? ((stats.wins_as_player2 / stats.games_as_player2) * 100).toFixed(1)
    : '0.0';

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 dark:from-gray-900 dark:via-purple-900 dark:to-indigo-900 p-4">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <button
            onClick={() => router.push('/')}
            className="px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-lg font-semibold backdrop-blur-sm"
          >
            ← Retour
          </button>
          
          <h1 className="text-4xl font-black text-white">📊 Statistiques</h1>
          
          <ThemeToggle />
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-6 mb-6">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-4xl">
              👤
            </div>
            <div>
              <h2 className="text-3xl font-bold text-gray-800 dark:text-white">{userName}</h2>
              <p className="text-gray-600 dark:text-gray-400">
                {stats?.last_played_at ? `Dernière partie: ${new Date(stats.last_played_at).toLocaleDateString('fr-FR')}` : 'Aucune partie jouée'}
              </p>
            </div>
          </div>
        </div>

        {/* Statistiques principales */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <StatCard
            icon="🎮"
            label="Parties jouées"
            value={stats?.total_games || 0}
            color="bg-blue-500"
          />
          <StatCard
            icon="🏆"
            label="Victoires"
            value={stats?.wins || 0}
            color="bg-green-500"
          />
          <StatCard
            icon="💔"
            label="Défaites"
            value={stats?.losses || 0}
            color="bg-red-500"
          />
          <StatCard
            icon="🤝"
            label="Matchs nuls"
            value={stats?.draws || 0}
            color="bg-gray-500"
          />
        </div>

        {/* Taux de victoire */}
        {stats && stats.total_games > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 mb-6">
            <h3 className="text-2xl font-bold text-gray-800 dark:text-white mb-4">🎯 Performance</h3>
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <p className="text-gray-600 dark:text-gray-400 mb-2">Taux de victoire</p>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-8 overflow-hidden">
                  <div 
                    className="bg-gradient-to-r from-green-500 to-emerald-600 h-full flex items-center justify-center text-white font-bold transition-all duration-500"
                    style={{ width: `${stats.win_rate}%` }}
                  >
                    {stats.win_rate}%
                  </div>
                </div>
              </div>
              <div className="text-5xl font-black text-green-500">
                {stats.win_rate}%
              </div>
            </div>
          </div>
        )}

        {/* Statistiques de jeu */}
        {stats && stats.total_games > 0 && (
          <div className="grid md:grid-cols-2 gap-6 mb-6">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6">
              <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-4">🎲 Statistiques de jeu</h3>
              <div className="space-y-3">
                <StatRow label="Coups totaux joués" value={stats.total_moves} />
                <StatRow label="Moyenne coups/partie" value={stats.avg_moves_per_game} />
                <StatRow label="Victoire la plus rapide" value={stats.fastest_win ? `${stats.fastest_win} coups` : 'N/A'} />
                <StatRow label="Adversaires affrontés" value={stats.unique_opponents} />
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6">
              <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-4">🎨 Par position</h3>
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                      <span className="w-6 h-6 rounded-full bg-red-500"></span>
                      Joueur 1 (Rouge)
                    </span>
                    <span className="font-bold text-gray-900 dark:text-white">{winRatePlayer1}%</span>
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    {stats.wins_as_player1} victoires / {stats.games_as_player1} parties
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                      <span className="w-6 h-6 rounded-full bg-yellow-400"></span>
                      Joueur 2 (Jaune)
                    </span>
                    <span className="font-bold text-gray-900 dark:text-white">{winRatePlayer2}%</span>
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    {stats.wins_as_player2} victoires / {stats.games_as_player2} parties
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Head to Head */}
        {headToHead.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 mb-6">
            <h3 className="text-2xl font-bold text-gray-800 dark:text-white mb-4">⚔️ Head-to-Head</h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="text-left py-3 px-4 font-semibold text-gray-700 dark:text-gray-300">Adversaire</th>
                    <th className="text-center py-3 px-4 font-semibold text-gray-700 dark:text-gray-300">Parties</th>
                    <th className="text-center py-3 px-4 font-semibold text-green-600 dark:text-green-400">V</th>
                    <th className="text-center py-3 px-4 font-semibold text-red-600 dark:text-red-400">D</th>
                    <th className="text-center py-3 px-4 font-semibold text-gray-600 dark:text-gray-400">N</th>
                    <th className="text-center py-3 px-4 font-semibold text-gray-700 dark:text-gray-300">%V</th>
                  </tr>
                </thead>
                <tbody>
                  {headToHead.map((h2h) => {
                    const winRate = h2h.total_games > 0 ? ((h2h.wins / h2h.total_games) * 100).toFixed(1) : '0.0';
                    return (
                      <tr key={h2h.opponent_id} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700">
                        <td className="py-3 px-4 font-medium text-gray-800 dark:text-white">{h2h.opponent_name}</td>
                        <td className="py-3 px-4 text-center text-gray-700 dark:text-gray-300">{h2h.total_games}</td>
                        <td className="py-3 px-4 text-center font-bold text-green-600 dark:text-green-400">{h2h.wins}</td>
                        <td className="py-3 px-4 text-center font-bold text-red-600 dark:text-red-400">{h2h.losses}</td>
                        <td className="py-3 px-4 text-center font-bold text-gray-600 dark:text-gray-400">{h2h.draws}</td>
                        <td className="py-3 px-4 text-center font-semibold text-gray-800 dark:text-white">{winRate}%</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {!stats || stats.total_games === 0 ? (
          <div className="bg-yellow-100 dark:bg-yellow-900/50 text-yellow-800 dark:text-yellow-200 p-6 rounded-xl text-center">
            <p className="text-xl font-semibold">🎮 Aucune partie jouée pour le moment</p>
            <p className="mt-2">Commence à jouer pour voir tes statistiques !</p>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, color }: { icon: string; label: string; value: number; color: string }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4">
      <div className={`w-12 h-12 ${color} rounded-lg flex items-center justify-center text-2xl mb-3`}>
        {icon}
      </div>
      <p className="text-gray-600 dark:text-gray-400 text-sm mb-1">{label}</p>
      <p className="text-3xl font-black text-gray-900 dark:text-white">{value}</p>
    </div>
  );
}

function StatRow({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex justify-between items-center py-2 border-b border-gray-200 dark:border-gray-700 last:border-0">
      <span className="text-gray-600 dark:text-gray-400">{label}</span>
      <span className="font-bold text-gray-900 dark:text-white">{value}</span>
    </div>
  );
}
