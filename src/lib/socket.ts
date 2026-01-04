'use client';

import { io, Socket } from 'socket.io-client';
import { createClient } from '@/lib/supabase/client';

let socket: Socket | null = null;
let isInitialized = false;
let initPromise: Promise<Socket> | null = null;

export async function initSocket() {
  
  if (initPromise) {
    console.log('⏳ Init déjà en cours, attente...');
    return initPromise;
  }

  if (isInitialized && socket?.connected) {
    console.log('♻️ Socket déjà initialisé et connecté');
    return socket;
  }

  console.log('🔌 Initialisation socket...');
  
  initPromise = (async () => {
    const supabase = createClient();
    const { data } = await supabase.auth.getSession();
    
    if (!data.session) {
      throw new Error('Pas de session');
    }

  
    if (socket) {
      console.log('🔌 Déconnexion ancien socket');
      socket.removeAllListeners();
      socket.disconnect();
    }

    socket = io({
      auth: { token: data.session.access_token },
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    return new Promise<Socket>((resolve) => {
      socket!.on('connect', () => {
        console.log('✅ Socket connecté - ID:', socket?.id);
        isInitialized = true;
        initPromise = null;
        resolve(socket!);
      });

      socket!.on('disconnect', (reason) => {
        console.log('❌ Socket déconnecté, raison:', reason);
        isInitialized = false;
      });

      socket!.on('connect_error', (error) => {
        console.error('❌ Erreur connexion:', error);
        initPromise = null;
      });
    });
  })();

  return initPromise;
}

export function getSocket() {
  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
    isInitialized = false;
    initPromise = null;
  }
}
