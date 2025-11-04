const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));
app.use('/assets', express.static(path.join(__dirname, 'assets')));

// Game rooms storage
const rooms = {};

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);
  
  // Create or join a game room
  socket.on('join-room', ({ roomId, playerName }) => {
    console.log(`${playerName} trying to join room ${roomId}`);
    
    // Create room if doesn't exist
    if (!rooms[roomId]) {
      rooms[roomId] = {
        players: {},
        readyCount: 0,
        restartReadyCount: 0
      };
    }
    
    // Room full check
    if (Object.keys(rooms[roomId].players).length >= 2) {
      socket.emit('room-full');
      return;
    }
    
    // Add player to room
    socket.join(roomId);
    rooms[roomId].players[socket.id] = {
      id: socket.id,
      name: playerName,
      ready: false,
      restartReady: false
    };
    
    // Notify room
    io.to(roomId).emit('player-joined', {
      playerId: socket.id,
      playerName,
      players: rooms[roomId].players
    });
    
    // Save room ID in socket for cleanup
    socket.roomId = roomId;
  });
  
  // Player ready
  socket.on('player-ready', () => {
    const roomId = socket.roomId;
    if (!roomId || !rooms[roomId]) return;
    
    rooms[roomId].players[socket.id].ready = true;
    rooms[roomId].readyCount++;
    
    // Update players about ready status
    io.to(roomId).emit('ready-update', {
      playerId: socket.id,
      players: rooms[roomId].players
    });
    
    // Start game if both players ready
    if (rooms[roomId].readyCount === 2) {
      io.to(roomId).emit('game-start', {
        players: rooms[roomId].players
      });
    }
  });
  
  // Handle WebRTC signaling
  socket.on('signal', ({ to, signal }) => {
    io.to(to).emit('signal', {
      from: socket.id,
      signal
    });
  });
  
  // Handle position updates directly via Socket.io
  socket.on('position-update', ({ to, roomId, data }) => {
    // Relay position updates to the other player in the room
    if (to) {
      io.to(to).emit('position-update', data);
    } else if (roomId && rooms[roomId]) {
      // If no specific target, send to everyone in the room except sender
      socket.to(roomId).emit('position-update', data);
    }
  });
  
  // NEW: Handle game events (like game over, jump, etc.)
  socket.on('game-event', ({ to, roomId, data }) => {
    console.log(`Game event from ${socket.id} to ${to}: ${data.type}`);
    
    // Forward the event to the specified player
    if (to && io.sockets.sockets.has(to)) {
      io.to(to).emit('game-event', data);
    } else if (roomId && rooms[roomId]) {
      // If no specific target, send to everyone in the room except sender
      socket.to(roomId).emit('game-event', data);
    }
  });
  
  // NEW: Handle player ready to restart
  socket.on('restart-ready', () => {
    const roomId = socket.roomId;
    if (!roomId || !rooms[roomId]) return;
    
    // Mark this player as ready to restart
    rooms[roomId].players[socket.id].restartReady = true;
    rooms[roomId].restartReadyCount++;
    
    console.log(`Player ${socket.id} ready to restart. Count: ${rooms[roomId].restartReadyCount}`);
    
    // Count how many players are ready
    const totalPlayers = Object.keys(rooms[roomId].players).length;
    
    // Notify players of restart status
    io.to(roomId).emit('restart-status', { 
      readyCount: rooms[roomId].restartReadyCount,
      totalPlayers
    });
    
    // If all players are ready, restart the game
    if (rooms[roomId].restartReadyCount === totalPlayers) {
      console.log(`All players ready to restart in room ${roomId}`);
      
      // Reset restart ready flags
      Object.values(rooms[roomId].players).forEach(player => {
        player.restartReady = false;
      });
      rooms[roomId].restartReadyCount = 0;
      
      // Send restart game event
      io.to(roomId).emit('restart-game', { 
        players: rooms[roomId].players 
      });
    }
  });
  
  // NEW: Handle player leaving the game
  socket.on('leave-game', () => {
    const roomId = socket.roomId;
    if (!roomId || !rooms[roomId]) return;
    
    console.log(`Player ${socket.id} leaving game in room ${roomId}`);
    
    // Reset player ready states
    if (rooms[roomId].players[socket.id]) {
      if (rooms[roomId].players[socket.id].ready) {
        rooms[roomId].readyCount--;
      }
      if (rooms[roomId].players[socket.id].restartReady) {
        rooms[roomId].restartReadyCount--;
      }
      rooms[roomId].players[socket.id].ready = false;
      rooms[roomId].players[socket.id].restartReady = false;
    }
    
    // Notify other players
    socket.to(roomId).emit('player-left-game', {
      playerId: socket.id
    });
  });
  
  // Cleanup on disconnect
  socket.on('disconnect', () => {
    const roomId = socket.roomId;
    if (roomId && rooms[roomId]) {
      // Remove player
      if (rooms[roomId].players[socket.id]) {
        if (rooms[roomId].players[socket.id].ready) {
          rooms[roomId].readyCount--;
        }
        if (rooms[roomId].players[socket.id].restartReady) {
          rooms[roomId].restartReadyCount--;
        }
        delete rooms[roomId].players[socket.id];
      }
      
      // Notify remaining player
      io.to(roomId).emit('player-left', {
        playerId: socket.id
      });
      
      // Clean up empty rooms
      if (Object.keys(rooms[roomId].players).length === 0) {
        delete rooms[roomId];
      }
    }
  });
});

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});