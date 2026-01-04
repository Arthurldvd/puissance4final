'use client';

import { useEffect, useState, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useSocket } from '@/hooks/useSocket';
import { Board } from './Board';
import { ThemeToggle } from './ThemeToggle';

export const GameContainer = () => {
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const [roomCode, setRoomCode] = useState('');
  const [isReady, setIsReady] = useState(false);

  const hasStarted = useRef(false);

  const name = searchParams.get('name') || '';
  const room = searchParams.get('room') || '';
  const shouldCreate = searchParams.get('create') === 'true';

  const { gameState, playerNumber, players, makeMove, resetGame, error, createRoom, joinRoom, leaveRoom, isConnected } = useSocket();

useEffect(() => {
  if (!isConnected || hasStarted.current) return;

  if (shouldCreate) {
    hasStarted.current = true;
    const timer = setTimeout(() => {
      createRoom((code, playerNum) => {
        console.log('✅ Room créée, je suis le joueur:', playerNum);
        setRoomCode(code);
        setIsReady(true);
        window.history.replaceState({}, '', `/game?room=${code}&name=${encodeURIComponent(name)}`);
      });
    }, 500);
    return () => clearTimeout(timer);
  } else if (room) {
    hasStarted.current = true;
    setRoomCode(room); 
    const timer = setTimeout(() => {
      joinRoom(room, name, (success) => {
        if (success) {
          console.log('✅ Room rejointe:', room); 
          setIsReady(true);
        } else {
          setTimeout(() => router.push('/'), 2000);
        }
      });
    }, 500);
    return () => clearTimeout(timer);
  }
}, [isConnected, name, room, shouldCreate]);




  if (!name) return null;

  if (!isConnected || !isReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-100 via-purple-100 to-pink-100 dark:from-gray-900 dark:via-purple-900 dark:to-indigo-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-4"></div>
          <p className="text-xl font-semibold text-gray-700 dark:text-gray-300">
            {!isConnected ? 'Connexion au serveur...' : 'Préparation de la partie...'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-100 via-purple-100 to-pink-100 dark:from-gray-900 dark:via-purple-900 dark:to-indigo-900 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <button
            onClick={() => {
              if (roomCode) leaveRoom(roomCode);
              router.push('/');
            }}
            className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-semibold"
          >
            ← Quitter
          </button>
          <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Puissance 4</h1>
          <ThemeToggle />
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4 mb-6 flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400">Code de la partie</p>
            <p className="text-2xl font-black tracking-widest text-blue-600 dark:text-blue-400">{roomCode}</p>
          </div>
          <button
            onClick={() => {
              navigator.clipboard.writeText(roomCode);
            }}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold"
          >
            📋 Copier
          </button>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className={`bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4 ${playerNumber === 1 ? 'ring-4 ring-red-500' : ''}`}>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-red-500 flex items-center justify-center text-2xl">🔴</div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Joueur 1</p>
                <p className="font-bold text-gray-900 dark:text-white">
                  {players.find(p => p.number === 1)?.name || 'En attente...'}
                  {playerNumber === 1 && ' (vous)'}
                </p>
              </div>
            </div>
          </div>

          <div className={`bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4 ${playerNumber === 2 ? 'ring-4 ring-yellow-400' : ''}`}>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-yellow-400 flex items-center justify-center text-2xl">🟡</div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Joueur 2</p>
                <p className="font-bold text-gray-900 dark:text-white">
                  {players.find(p => p.number === 2)?.name || 'En attente...'}
                  {playerNumber === 2 && ' (vous)'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-200 p-4 rounded-lg mb-4">
            {error}
          </div>
        )}

        {gameState && (
          <div className="text-center mb-6">
            {gameState.winner ? (
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                <p className="text-2xl font-bold text-gray-800 dark:text-white mb-4">
                  {gameState.winner === 'draw' 
                    ? '🤝 Match nul !' 
                    : `🎉 ${players.find(p => p.number === gameState.winner)?.name} a gagné !`}
                </p>
                <button
                  onClick={() => resetGame(roomCode)}
                  className="px-6 py-3 bg-green-500 hover:bg-green-600 text-white rounded-lg font-bold"
                >
                  🔄 Nouvelle partie
                </button>
              </div>
            ) : players.length < 2 ? (
              <div className="bg-yellow-100 dark:bg-yellow-900/50 text-yellow-800 dark:text-yellow-200 p-4 rounded-lg font-semibold">
                ⏳ En attente d'un 2e joueur... Code: <strong>{roomCode}</strong>
              </div>
            ) : (
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4">
                <p className="text-xl font-bold text-gray-800 dark:text-white">
                  {gameState.currentPlayer === playerNumber ? (
                    <span className="text-green-600 dark:text-green-400">🎯 C'est votre tour !</span>
                  ) : (
                    <span className="text-gray-600 dark:text-gray-400">
                      ⏳ Au tour de {players.find(p => p.number === gameState.currentPlayer)?.name}
                    </span>
                  )}
                </p>
              </div>
            )}
          </div>
        )}

        <div className="flex justify-center">
          <Board
            gameState={gameState}
            onColumnClick={(col) => makeMove(roomCode, col)}
            playerNumber={playerNumber}
          />
        </div>
      </div>
    </div>
  );
};
