require('dotenv').config({ path: '.env.local' });

const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const { Server } = require('socket.io');
const Connect4 = require('./src/lib/game');
const { createClient } = require('@supabase/supabase-js');

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = 3000;

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

const rooms = new Map();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Variables d\'environnement Supabase manquantes !');
  console.error('Vérifiez que .env.local contient :');
  console.error('- NEXT_PUBLIC_SUPABASE_URL');
  console.error('- SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

console.log('Supabase configuré');

app.prepare().then(() => {
  const httpServer = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error occurred handling', req.url, err);
      res.statusCode = 500;
      res.end('internal server error');
    }
  });

  const io = new Server(httpServer, {
    cors: {
      origin: `http://${hostname}:${port}`,
      methods: ['GET', 'POST']
    }
  });

  io.on('connection', async (socket) => {
    const token = socket.handshake.auth.token;
    
    let user = null;
    if (token) {
      const { data, error } = await supabase.auth.getUser(token);
      if (!error && data.user) {
        user = data.user;
      } else {
        console.log('❌ Token invalide');
        socket.disconnect();
        return;
      }
    } else {
      console.log('❌ Pas de token');
      socket.disconnect();
      return;
    }

    console.log('Client connecté:', user.email);

    socket.on('create_room', (callback) => {
      console.log('🎯 EVENT create_room REÇU');
      
      const roomCode = generateRoomCode();
      
      rooms.set(roomCode, {
        game: new Connect4(),
        players: [],
        createdAt: Date.now(),
        gameId: null,
        moveCount: 0
      });

      console.log(`Salle créée: ${roomCode}`);
      callback({ success: true, roomCode });
    });

    socket.on('join_room', async ({ roomCode, playerName }, callback) => {
      const room = rooms.get(roomCode);

      if (!room) {
        callback({ success: false, message: 'Salle introuvable' });
        return;
      }

      if (room.players.length >= 2) {
        callback({ success: false, message: 'La salle est pleine' });
        return;
      }

      socket.join(roomCode);
      const playerNumber = room.players.length + 1;
      room.players.push({ 
        id: socket.id, 
        number: playerNumber, 
        name: playerName,
        userId: user.id
      });

      callback({ success: true, playerNumber });
      socket.emit('player_assigned', { playerNumber, playerName });
      
      io.to(roomCode).emit('room_update', {
        players: room.players.map(p => ({ number: p.number, name: p.name })),
        gameState: room.game.getState()
      });

      if (room.players.length === 2) {
        try {
          console.log('🎮 Création partie:', {
            roomCode,
            player1: room.players[0].userId,
            player1_name: room.players[0].name,
            player2: room.players[1].userId,
            player2_name: room.players[1].name
          });

          const { data, error } = await supabase
            .from('games')
            .insert({
              room_code: roomCode,
              player1_id: room.players[0].userId,
              player1_name: room.players[0].name,
              player2_id: room.players[1].userId,
              player2_name: room.players[1].name,
              status: 'in_progress',
              started_at: new Date().toISOString()
            })
            .select()
            .single();

          if (!error && data) {
            room.gameId = data.id;
            console.log(`Partie créée dans DB: ${data.id}`);
          } else {
            console.error('❌ Erreur création partie:', error);
          }
        } catch (err) {
          console.error('❌ Erreur DB:', err);
        }

        io.to(roomCode).emit('game_start', { message: 'La partie commence !' });
      }

      console.log(`${playerName} (${user.email}) a rejoint la salle ${roomCode}`);
    });

    socket.on('make_move', async ({ roomCode, col }) => {
      const room = rooms.get(roomCode);
      if (!room) return;

      const player = room.players.find(p => p.id === socket.id);
      if (!player || player.number !== room.game.currentPlayer) {
        socket.emit('error', { message: 'Ce n\'est pas votre tour' });
        return;
      }

      const result = room.game.makeMove(col);
      
      if (result.success) {
        room.moveCount++;
        io.to(roomCode).emit('game_state', room.game.getState());
        
        if (room.game.winner) {
          const winnerPlayer = room.game.winner === 'draw' 
            ? null 
            : room.players.find(p => p.number === room.game.winner);
          
          const winnerName = winnerPlayer?.name || null;
          const winnerId = winnerPlayer?.userId || null;
          
          io.to(roomCode).emit('game_over', {
            winner: room.game.winner,
            winnerName,
            winningCells: room.game.winningCells
          });

          if (room.gameId) {
            try {
              console.log('🎯 Sauvegarde partie:', {
                gameId: room.gameId,
                winnerId: winnerId,
                winnerNumber: room.game.winner === 'draw' ? null : room.game.winner,
                totalMoves: room.moveCount,
                player1: room.players[0]?.userId,
                player2: room.players[1]?.userId
              });

              const { data, error } = await supabase
                .from('games')
                .update({
                  winner_id: winnerId,
                  winner_number: room.game.winner === 'draw' ? null : room.game.winner,
                  total_moves: room.moveCount,
                  status: 'completed',
                  ended_at: new Date().toISOString()
                })
                .eq('id', room.gameId);

              if (error) {
                console.error('❌ Erreur mise à jour partie:', error);
              } else {
                console.log(`Partie terminée dans DB: ${room.gameId}`);
                
                const { data: checkData } = await supabase
                  .from('games')
                  .select('*')
                  .eq('id', room.gameId)
                  .single();
                
                console.log('Données enregistrées:', checkData);
              }
            } catch (err) {
              console.error('❌ Erreur DB:', err);
            }
          } else {
            console.error('❌ Pas de gameId pour sauvegarder !');
          }
        }
      } else {
        socket.emit('error', result);
      }
    });

    socket.on('reset_game', async (roomCode) => {
      const room = rooms.get(roomCode);
      if (room) {
        room.game.reset();
        room.moveCount = 0;
        
        if (room.players.length === 2) {
          try {
            const { data, error } = await supabase
              .from('games')
              .insert({
                room_code: roomCode,
                player1_id: room.players[0].userId,
                player1_name: room.players[0].name,
                player2_id: room.players[1].userId,
                player2_name: room.players[1].name,
                status: 'in_progress',
                started_at: new Date().toISOString()
              })
              .select()
              .single();

            if (!error && data) {
              room.gameId = data.id;
              console.log(`Nouvelle partie créée dans DB: ${data.id}`);
            }
          } catch (err) {
            console.error('❌ Erreur DB:', err);
          }
        }
        
        io.to(roomCode).emit('game_state', room.game.getState());
        io.to(roomCode).emit('game_reset');
      }
    });

    socket.on('leave_room', (roomCode) => {
      socket.leave(roomCode);
      const room = rooms.get(roomCode);
      
      if (room) {
        room.players = room.players.filter(p => p.id !== socket.id);
        io.to(roomCode).emit('room_update', {
          players: room.players.map(p => ({ number: p.number, name: p.name }))
        });
        
        if (room.players.length === 0) {
          rooms.delete(roomCode);
          console.log(`Salle ${roomCode} supprimée`);
        }
      }
    });

    socket.on('disconnect', () => {
      console.log('Client déconnecté:', socket.id);
      rooms.forEach((room, roomCode) => {
        const playerIndex = room.players.findIndex(p => p.id === socket.id);
        if (playerIndex !== -1) {
          room.players.splice(playerIndex, 1);
          io.to(roomCode).emit('player_left', { message: 'Un joueur a quitté la partie' });
          
          if (room.players.length === 0) {
            rooms.delete(roomCode);
          }
        }
      });
    });
  });

  httpServer
    .once('error', (err) => {
      console.error(err);
      process.exit(1);
    })
    .listen(port, () => {
      console.log(`Ready on http://${hostname}:${port}`);
    });
});

function generateRoomCode() {
  const characters = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  
  if (rooms.has(code)) {
    return generateRoomCode();
  }
  
  return code;
}
