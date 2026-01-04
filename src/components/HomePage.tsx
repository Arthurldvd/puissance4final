'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { ThemeToggle } from './ThemeToggle';
import type { User } from '@supabase/supabase-js';

export const HomePage = () => {
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [roomCode, setRoomCode] = useState('');
  const [error, setError] = useState('');
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      setLoading(false);
      
      if (!user) {
        router.push('/login');
      }
    };
    getUser();
  }, [supabase, router]);

  const handleCreateRoom = () => {
    if (!user) return;
    router.push(`/game?create=true&name=${encodeURIComponent(user.user_metadata.display_name || user.email?.split('@')[0] || 'Joueur')}`);
  };

  const handleJoinRoom = () => {
    if (!user) return;
    if (!roomCode.trim() || roomCode.length !== 6) {
      setError('Le code doit contenir 6 caractères');
      return;
    }
    router.push(`/game?room=${roomCode.toUpperCase()}&name=${encodeURIComponent(user.user_metadata.display_name || user.email?.split('@')[0] || 'Joueur')}`);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-white"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 dark:from-gray-900 dark:via-purple-900 dark:to-indigo-900 flex items-center justify-center p-4">
      <div className="absolute top-4 right-4 flex gap-2">
        <button
          onClick={() => router.push('/stats')}
          className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-semibold transition-colors flex items-center gap-2"
        >
          📊 <span>Stats</span>
        </button>
        <ThemeToggle />
        <button
          onClick={handleLogout}
          className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-semibold transition-colors"
        >
          Déconnexion
        </button>
      </div>

      <div className="max-w-md w-full">
        <div className="text-center mb-8 animate-bounce-slow">
          <div className="inline-block bg-white dark:bg-gray-800 rounded-full p-6 shadow-2xl mb-4">
            <div className="text-6xl">🔴🟡</div>
          </div>
          <h1 className="text-5xl font-black text-white mb-2 drop-shadow-lg">
            Puissance 4
          </h1>
          <p className="text-white/90 text-lg font-medium">
            Bienvenue {user.user_metadata.display_name || user.email} !
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8 space-y-6 transform transition-all hover:scale-105">
          {error && (
            <div className="bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300 px-4 py-2 rounded-lg text-sm font-medium">
              {error}
            </div>
          )}

          <button
            onClick={handleCreateRoom}
            className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-bold py-4 rounded-xl shadow-lg transform transition-all hover:scale-105 active:scale-95 flex items-center justify-center gap-2"
          >
            <span className="text-2xl">🎮</span>
            <span>Créer une partie</span>
          </button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300 dark:border-gray-600"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 font-semibold">
                OU
              </span>
            </div>
          </div>

          {!showJoinModal ? (
            <button
              onClick={() => setShowJoinModal(true)}
              className="w-full bg-gradient-to-r from-blue-500 to-cyan-600 hover:from-blue-600 hover:to-cyan-700 text-white font-bold py-4 rounded-xl shadow-lg transform transition-all hover:scale-105 active:scale-95 flex items-center justify-center gap-2"
            >
              <span className="text-2xl">🔗</span>
              <span>Rejoindre une partie</span>
            </button>
          ) : (
            <div className="space-y-3 animate-fade-in">
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                Code de la partie
              </label>
              <input
                type="text"
                value={roomCode}
                onChange={(e) => {
                  setRoomCode(e.target.value.toUpperCase());
                  setError('');
                }}
                placeholder="ABC123"
                maxLength={6}
                className="w-full px-4 py-3 rounded-lg border-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-center text-2xl font-bold tracking-widest focus:border-blue-500 focus:ring-2 focus:ring-blue-500 outline-none transition-all uppercase"
              />
              <div className="flex gap-2">
                <button
                  onClick={() => setShowJoinModal(false)}
                  className="flex-1 bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-500 text-gray-800 dark:text-white font-semibold py-3 rounded-lg transition-colors"
                >
                  Annuler
                </button>
                <button
                  onClick={handleJoinRoom}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition-colors"
                >
                  Rejoindre
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="text-center mt-6 text-white/80 text-sm">
          <p>Alignez 4 jetons de votre couleur pour gagner !</p>
        </div>
      </div>
    </div>
  );
};
