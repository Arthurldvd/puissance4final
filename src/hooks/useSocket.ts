'use client';

import { useEffect, useState } from 'react';
import { initSocket, getSocket, disconnectSocket } from '@/lib/socket';

interface GameState {
  board: (number | null)[][];
  currentPlayer: number;
  winner: number | 'draw' | null;
  winningCells: [number, number][];
}

interface Player {
  number: number;
  name: string;
}

export const useSocket = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [playerNumber, setPlayerNumber] = useState<number | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const setup = async () => {
      try {
        const socket = await initSocket();
        
        if (!mounted) return;

        setIsConnected(socket.connected);

        socket.on('connect', () => {
          console.log('✅ Connecté');
          if (mounted) setIsConnected(true);
        });

        socket.on('disconnect', () => {
          console.log('❌ Déconnecté');
          if (mounted) setIsConnected(false);
        });

        socket.on('player_assigned', ({ playerNumber }) => {
          console.log('👤 Player assigned:', playerNumber);
          if (mounted) setPlayerNumber(playerNumber);
        });

        socket.on('room_update', ({ players, gameState }) => {
          console.log('📊 Room update:', players);
          if (mounted) {
            setPlayers(players);
            if (gameState) setGameState(gameState);
          }
        });

        socket.on('game_state', (state: GameState) => {
          console.log('🎮 Game state update');
          if (mounted) setGameState(state);
        });

        socket.on('error', ({ message }) => {
          console.log('❌ Error:', message);
          if (mounted) {
            setError(message);
            setTimeout(() => setError(null), 3000);
          }
        });
      } catch (err) {
        console.error('Erreur init socket:', err);
      }
    };

    setup();

    return () => {
      mounted = false;
      
    };
  }, []);

  const createRoom = (callback: (code: string) => void) => {
    const socket = getSocket();
    if (!socket || !isConnected) {
      console.log('❌ Socket pas prêt, isConnected:', isConnected, 'socket:', !!socket);
      return;
    }

    console.log('📤 Émission create_room...');
    socket.emit('create_room', (res: any) => {
      console.log('📥 Réponse create_room:', res);
      if (res?.success) {
        callback(res.roomCode);
      } else {
        console.error('❌ Erreur create_room:', res);
      }
    });
  };

  const joinRoom = (roomCode: string, playerName: string, callback: (success: boolean) => void) => {
    const socket = getSocket();
    if (!socket || !isConnected) {
      console.log('❌ Socket pas prêt');
      callback(false);
      return;
    }

    console.log(`📤 Émission join_room: ${roomCode}, ${playerName}`);
    socket.emit('join_room', { roomCode, playerName }, (res: any) => {
      console.log('📥 Réponse join_room:', res);
      if (res?.success) {
        setPlayerNumber(res.playerNumber);
        callback(true);
      } else {
        setError(res.message);
        callback(false);
      }
    });
  };

  const makeMove = (roomCode: string, col: number) => {
    const socket = getSocket();
    console.log(`📤 Make move: col ${col}`);
    socket?.emit('make_move', { roomCode, col });
  };

  const resetGame = (roomCode: string) => {
    const socket = getSocket();
    console.log('📤 Reset game');
    socket?.emit('reset_game', roomCode);
  };

  const leaveRoom = (roomCode: string) => {
    const socket = getSocket();
    console.log('📤 Leave room');
    socket?.emit('leave_room', roomCode);
  };

  return {
    gameState,
    playerNumber,
    players,
    makeMove,
    resetGame,
    error,
    createRoom,
    joinRoom,
    leaveRoom,
    isConnected,
  };
};
