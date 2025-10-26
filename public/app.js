// Connection and lobby UI logic - Using Socket.io directly for reliability
let socket;
let roomId;
let playerId;
let otherPlayerId;
let gameStarted = false;
let positionUpdateCount = 0;
let lastReceivedTime = 0;
let playerScore = 0;
let opponentScore = 0;
let gameCount = 0;
let gameInstance = null;
let aiDifficulty = 'medium'; // default difficulty
let playerScoreSP = 0;
let aiScore = 0;
let gameCountSP = 0;

// Initialize the single player mode
function initSinglePlayer() {
  console.log("Initializing single player mode");
  
  // Hide multiplayer UI, show single player UI
  document.getElementById('join-container').style.display = 'none';
  document.getElementById('single-player-menu').style.display = 'block';
  document.getElementById('main-menu').style.display = 'none';
  
  // Set up event listeners for the single player menu
  document.getElementById('start-game-btn').addEventListener('click', startSinglePlayerGame);
  
  // Set up difficulty selection
  const difficultySelect = document.getElementById('difficulty-select');
  difficultySelect.addEventListener('change', (e) => {
    aiDifficulty = e.target.value;
    console.log(`Difficulty set to: ${aiDifficulty}`);
  });
  
  // Back to main menu button
  document.getElementById('back-to-menu-btn').addEventListener('click', () => {
    document.getElementById('single-player-menu').style.display = 'none';
    document.getElementById('main-menu').style.display = 'block';
  });
}

// Start the single player game
function startSinglePlayerGame() {
  console.log(`Starting single player game with ${aiDifficulty} difficulty`);
  gameStarted = true;
  
  // Hide menu UI, show game canvas
  document.getElementById('single-player-menu').style.display = 'none';
  document.getElementById('game-container').style.display = 'block';
  
  // Initialize game with single player settings
  // First player is always the human player (blue)
  initializeGameSP(true);
}

// Initialize game instance
function initializeGameSP(isFirstPlayer) {
  console.log(`Initializing game instance, isFirstPlayer: ${isFirstPlayer}`);
  
  // Make sure the canvas has proper sizing
  const canvas = document.getElementById('game-canvas');
  if (canvas) {
    // Set canvas sizing
    resizeGameCanvas(canvas);
    
    // Add resize listener
    window.addEventListener('resize', () => resizeGameCanvas(canvas));
  }
  
  // Initialize game with the tron mechanics and AI mode enabled
  gameInstance = new TronGame('game-canvas', isFirstPlayer, handleGameEventSP, true, aiDifficulty);
  
  // Add an aiInitialized property to ensure we initialize on first update
  gameInstance.aiInitialized = false;
  
  // Start the game
  gameInstance.start();
  
  console.log(`Game started with AI opponent on ${aiDifficulty} difficulty`);
}

// Helper function for canvas sizing
function resizeGameCanvas(canvas) {
  // Get the game container
  const container = document.getElementById('game-container');
  if (!container) return;
  
  // Calculate the maximum square size that fits in the viewport
  const maxSize = Math.min(window.innerWidth, window.innerHeight * 0.9);
  
  // Set container size
  container.style.width = `${maxSize}px`;
  container.style.height = `${maxSize}px`;
  
  // If we're using a canvas with a fixed resolution, resize it
  if (window.gameInstance && window.gameInstance.engine) {
    window.gameInstance.engine.resize();
  }
  
  console.log(`Canvas resized to: ${maxSize}x${maxSize}`);
}

// Handle game events (similar to network events in multiplayer)
function handleGameEventSP(data) {
  console.log('Game event:', data);
  
  if (data.type === 'gameover') {
    // Handle game over event
    let reason = data.reason || '';
    showSinglePlayerGameOverPopup(reason);
  }
}

// Show game over popup for single player
function showSinglePlayerGameOverPopup(reason) {
  console.log("Showing game over popup, reason:", reason);
  
  // First, check if the user won or lost based on the reason
  let playerWon = reason.startsWith('opponent');
  
  // Update scores
  if (playerWon) {
    playerScoreSP++;
  } else {
    aiScore++;
  }
  gameCountSP++;
  
  // Create the popup container if it doesn't exist
  let popup = document.getElementById('game-over-popup');
  if (!popup) {
    popup = document.createElement('div');
    popup.id = 'game-over-popup';
    document.body.appendChild(popup);
    
    // Style the popup
    popup.style.position = 'fixed';
    popup.style.top = '50%';
    popup.style.left = '50%';
    popup.style.transform = 'translate(-50%, -50%)';
    popup.style.backgroundColor = 'rgba(0, 0, 0, 0.85)';
    popup.style.color = '#00ffff';
    popup.style.padding = '20px';
    popup.style.borderRadius = '10px';
    popup.style.boxShadow = '0 0 20px rgba(0, 255, 255, 0.5)';
    popup.style.zIndex = '1000';
    popup.style.textAlign = 'center';
    popup.style.minWidth = '300px';
    popup.style.fontFamily = 'Arial, sans-serif';
    popup.style.border = '2px solid #00ffff';
  }
  
  // Generate result message
  let resultMessage = playerWon ? 
    '<span style="color: #00ff00; font-size: 24px;">You won!</span>' : 
    '<span style="color: #ff3333; font-size: 24px;">You lost!</span>';
  
  // Populate popup content
  popup.innerHTML = `
    <h2 style="margin-top: 0; color: #00ffff;">Game Over</h2>
    ${resultMessage}
    <div style="margin: 20px 0;">
      <table style="margin: 0 auto; border-collapse: collapse; width: 80%;">
        <tr style="border-bottom: 1px solid rgba(0, 255, 255, 0.3);">
          <th style="padding: 5px; text-align: left;">Round</th>
          <td style="padding: 5px; text-align: right;">${gameCountSP}</td>
        </tr>
        <tr style="border-bottom: 1px solid rgba(0, 255, 255, 0.3);">
          <th style="padding: 5px; text-align: left;">Your Score</th>
          <td style="padding: 5px; text-align: right;">${playerScoreSP}</td>
        </tr>
        <tr>
          <th style="padding: 5px; text-align: left;">AI Score</th>
          <td style="padding: 5px; text-align: right;">${aiScore}</td>
        </tr>
      </table>
    </div>
    <button id="play-again-btn" style="background-color: #00ffff; color: #000; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer; font-weight: bold; margin-right: 10px;">Play Again</button>
    <button id="back-menu-btn" style="background-color: #ff3333; color: #fff; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer; font-weight: bold;">Main Menu</button>
  `;
  
  // Show the popup
  popup.style.display = 'block';
  
  // Add event listeners to buttons
  document.getElementById('play-again-btn').addEventListener('click', () => {
    popup.style.display = 'none';
    restartGameSP();
  });
  
  document.getElementById('back-menu-btn').addEventListener('click', () => {
    popup.style.display = 'none';
    endGameSP();
    // Reset scores when leaving
    playerScoreSP = 0;
    aiScore = 0;
    gameCountSP = 0;
  });
}

// Restart the game
function restartGameSP() {
  console.log("Restarting single player game");
  gameStarted = false;
  
  // Clear game instance
  if (gameInstance) {
    if (gameInstance.engine) {
      gameInstance.engine.stopRenderLoop();
    }
    gameInstance = null;
  }
  
  // Clear the game container
  document.getElementById('game-container').innerHTML = '<canvas id="game-canvas"></canvas><div id="game-message"></div>';
  
  // Start a new game
  startSinglePlayerGame();
}

// End the game and return to menu
function endGameSP() {
  console.log("Ending single player game");
  gameStarted = false;
  
  // Clean up game instance
  if (gameInstance) {
    if (gameInstance.engine) {
      gameInstance.engine.stopRenderLoop();
    }
    gameInstance = null;
  }
  
  document.getElementById('game-container').style.display = 'none';
  document.getElementById('main-menu').style.display = 'block';
  
  // Clear the game canvas
  document.getElementById('game-container').innerHTML = '<canvas id="game-canvas"></canvas><div id="game-message"></div>';
}

// Debug function for AI
function debugAI() {
  if (!gameInstance) {
    console.log("No game instance found");
    return;
  }
  
  console.log("AI Debug Info:");
  console.log(`AI Initialized: ${gameInstance.aiInitialized}`);
  console.log(`AI Position: ${gameInstance.opponent?.node?.position?.x.toFixed(2)}, ${gameInstance.opponent?.node?.position?.z.toFixed(2)}`);
  console.log(`AI Speed: ${gameInstance.opponent?.speed.toFixed(2)}`);
  console.log(`AI Angle: ${gameInstance.opponent?.angle.toFixed(2)}`);
  console.log(`AI State:`, gameInstance.aiState);
}

// Wait until all scripts are loaded before initializing
document.addEventListener('DOMContentLoaded', function() {
  console.log("DOM fully loaded");
  
  // Check if SinglePlayer functions are available
  const singlePlayerAvailable = typeof window.initSinglePlayer === 'function';
  console.log(`SinglePlayer.js loaded: ${singlePlayerAvailable}`);
  
  // Initialize app only when everything is ready
  setTimeout(initApp, 100); // Small delay to ensure all scripts are processed
});


// Global game mode variable
let gameMode = 'none'; // 'none', 'single', or 'multi'
let soundEnabled = false;

// Initialize on page load
window.addEventListener('load', initApp);

// Initialize the application
function initApp() {
  console.log("Initializing app");
  
  // Hide all containers initially except main menu
  document.getElementById('join-container').style.display = 'none';
  document.getElementById('lobby-container').style.display = 'none';
  document.getElementById('game-container').style.display = 'none';
  document.getElementById('single-player-menu').style.display = 'none';
  document.getElementById('main-menu').style.display = 'block';
  
  // Set up main menu event listeners
  document.getElementById('single-player-btn').addEventListener('click', function() {
    gameMode = 'single';
    console.log("Single player button clicked");
    
    // Check if the initSinglePlayer function exists before calling it
    if (typeof window.initSinglePlayer === 'function') {
      window.initSinglePlayer();
    } else {
      console.error("initSinglePlayer function not found! Make sure SinglePlayer.js is loaded properly.");
      alert("Error loading single player mode. Please try refreshing the page.");
    }
  });
  
  document.getElementById('multi-player-btn').addEventListener('click', () => {
    gameMode = 'multi';
    document.getElementById('main-menu').style.display = 'none';
    document.getElementById('join-container').style.display = 'block';
    initSocket();
  });
  
  document.getElementById('sound-toggle').addEventListener('click', toggleSound);
  
  // Check URL for room param
  const urlParams = new URLSearchParams(window.location.search);
  const roomParam = urlParams.get('room');
  if (roomParam) {
    // Auto-start multiplayer if room is in URL
    gameMode = 'multi';
    document.getElementById('main-menu').style.display = 'none';
    document.getElementById('join-container').style.display = 'block';
    document.getElementById('room-id').value = roomParam;
    initSocket();
  }
}

// Toggle sound effects
function toggleSound() {
  soundEnabled = !soundEnabled;
  console.log(`Sound ${soundEnabled ? 'enabled' : 'disabled'}`);
  
  const soundButton = document.getElementById('sound-toggle');
  soundButton.textContent = soundEnabled ? 'Sound: ON' : 'Sound: OFF';
  
  // Will be implemented in the future with actual sound effects
}

// Initialize socket connection
function initSocket() {
  console.log("Initializing socket connection");
  socket = io();
  
  socket.on('connect', () => {
    playerId = socket.id;
    console.log(`Connected with ID: ${playerId}`);
    document.getElementById('connection-status').textContent = 'Connected';
  });
  
  socket.on('player-joined', (data) => {
    updatePlayerList(data.players);
    console.log(`Player joined: ${JSON.stringify(data)}`);
  
    // Store other player's ID
    if (Object.keys(data.players).length === 2) {
      const otherPlayer = Object.keys(data.players).find(id => id !== playerId);
      otherPlayerId = otherPlayer;
      console.log(`Other player joined: ${otherPlayer}`);
    }
  });
  
  socket.on('ready-update', (data) => {
    updatePlayerList(data.players);
  });
  
  socket.on('game-start', (data) => {
    console.log(`Game starting with players: ${JSON.stringify(data)}`);
    startGame(data);
  });
  
  // Add this inside your initSocket() function, alongside your other socket listeners
  socket.on('game-event', (data) => {
    console.log('Received game event:', data);

    if (data.type === 'gameover') {
      if (window.gameInstance) {
        window.gameInstance.handleNetworkMessage(data);
      }
    } else if (data.type === 'jump') {
      if (window.gameInstance) {
        window.gameInstance.handleNetworkMessage(data);
      }
    }
  });
  
  socket.on('player-left', (data) => {
    console.log(`Player left: ${JSON.stringify(data)}`);
    if (gameStarted) {
      showMessage('Other player disconnected');
      endGame();
    } else {
      updatePlayerList({}); // Clear list
    }
  });
  
  socket.on('room-full', () => {
    showMessage('Room is full, please try another room ID');
  });
  
  // NEW: Handle position updates directly via Socket.io
  socket.on('position-update', (data) => {
    lastReceivedTime = Date.now();
    if (window.gameInstance) {
      window.gameInstance.updateOpponentPosition(
        data.x, 
        data.z, 
        data.angle, 
        data.speed,
        data.count
      );
    }
  });
  
  socket.on('restart-game', (data) => {
    console.log('Restarting game with same players');
    startGame(data);
  });

  socket.on('restart-status', (data) => {
    showMessage(`Waiting for opponent: ${data.readyCount}/2 players ready`);
  });
}

// Join game room
function joinRoom() {
  const roomInput = document.getElementById('room-id');
  const nameInput = document.getElementById('player-name');
  
  roomId = roomInput.value.trim();
  const playerName = nameInput.value.trim();
  
  if (!roomId || !playerName) {
    showMessage('Please enter room ID and your name');
    return;
  }
  
  console.log(`Joining room: ${roomId} as ${playerName}`);
  socket.emit('join-room', {
    roomId,
    playerName
  });
  
  // Hide join UI, show lobby
  document.getElementById('join-container').style.display = 'none';
  document.getElementById('lobby-container').style.display = 'block';
  document.getElementById('room-id-display').textContent = roomId;
}

// Set player ready status
function setReady() {
  socket.emit('player-ready');
  document.getElementById('ready-btn').disabled = true;
  document.getElementById('ready-btn').textContent = 'Ready ✓';
}

// Update player list in the UI
function updatePlayerList(players) {
  const list = document.getElementById('player-list');
  list.innerHTML = '';
  
  Object.values(players).forEach(player => {
    const item = document.createElement('li');
    item.textContent = `${player.name} ${player.ready ? '(Ready)' : '(Not Ready)'}`;
    list.appendChild(item);
  });
}

// Start the game
function startGame(data) {
  console.log("Starting game");
  gameStarted = true;
  
  // Hide lobby UI, show game canvas
  document.getElementById('lobby-container').style.display = 'none';
  document.getElementById('game-container').style.display = 'block';
  
  // Determine player colors (first player blue, second player yellow)
  const players = Object.values(data.players);
  const isFirstPlayer = players[0].id === playerId;
  console.log(`This player is ${isFirstPlayer ? 'first' : 'second'} player`);
  
  // Initialize game with multiplayer settings
  initializeGame(isFirstPlayer);
  
  // Start position update interval 
  setInterval(() => {
    if (gameStarted && window.gameInstance) {
      sendPositionUpdate();
    }
  }, 50); // Update position 20 times per second
}

// End the game and return to lobby
function endGame() {
  console.log("Ending game");
  gameStarted = false;
  
  if (gameMode === 'multi') {
    // Tell server this player is leaving the game
    socket.emit('leave-game');
  }
  
  // Clean up game instance
  if (window.gameInstance) {
    window.gameInstance = null;
  }
  
  // Return to appropriate screen based on game mode
  document.getElementById('game-container').style.display = 'none';
  
  if (gameMode === 'multi') {
    document.getElementById('join-container').style.display = 'block';
  } else {
    document.getElementById('main-menu').style.display = 'block';
  }
  
  // Reset game mode
  gameMode = 'none';
  
  // Clear the game canvas
  document.getElementById('game-container').innerHTML = '<canvas id="game-canvas"></canvas><div id="game-message"></div>';
}

// Initialize game instance
function initializeGame(isFirstPlayer) {
  console.log(`Initializing game instance, isFirstPlayer: ${isFirstPlayer}, mode: ${gameMode}`);
  
  if (gameMode === 'single') {
    // Initialize game with the tron mechanics and AI mode
    window.gameInstance = new game(
      'game-canvas', 
      true, // Always first player in single player mode
      handleGameEvent, 
      true, // Single player mode ON
      document.getElementById('difficulty-select')?.value || 'medium'
    );
  } else {
    // Initialize multiplayer game
    window.gameInstance = new TronGame(
      'game-canvas', 
      isFirstPlayer, 
      sendGameData,
      false // Single player mode OFF
    );
  }
  
  window.gameInstance.start();
}

// Generic game event handler (for both modes)
function handleGameEvent(data) {
  if (data.type === 'position') {
    // Position updates handled by sendPositionUpdate in multiplayer
    return;
  }
  
  if (data.type === 'gameover') {
    if (gameMode === 'multi') {
      // Send the game over message to the opponent
      socket.emit('game-event', {
        to: otherPlayerId,
        roomId: roomId,
        data: data
      });
    } else {
      // Handle game over in single player mode
      showSinglePlayerGameOverPopup(data.reason);
    }
  }
  
  if (data.type === 'jump') {
    if (gameMode === 'multi') {
      // Send jump events in multiplayer
      socket.emit('game-event', {
        to: otherPlayerId,
        roomId: roomId,
        data: data
      });
    }
  }
}

// NEW: Send position update via Socket.io
function sendPositionUpdate() {
  if (!window.gameInstance || !gameStarted || gameMode !== 'multi') return;
  
  const player = window.gameInstance.player;
  const data = {
    type: 'position',
    x: player.node.position.x,
    z: player.node.position.z, 
    angle: player.angle,
    speed: player.speed,
    count: ++positionUpdateCount,
    timestamp: Date.now()
  };
  
  socket.emit('position-update', {
    to: otherPlayerId,
    roomId: roomId,
    data: data
  });
}

// Send game data to other player (multiplayer only)
function sendGameData(data) {
  if (gameMode !== 'multi') return;
  
  // Handle different types of messages
  if (data.type === 'position') {
    // Position updates handled by sendPositionUpdate
    return;
  }
  
  if (data.type === 'gameover') {
    // Send the game over message to the opponent
    socket.emit('game-event', {
      to: otherPlayerId,
      roomId: roomId,
      data: data
    });
  }
  
  if (data.type === 'jump') {
    // Send jump events
    socket.emit('game-event', {
      to: otherPlayerId,
      roomId: roomId,
      data: data
    });
  }
}

function showGameOverPopup(reason) {
  console.log("Showing game over popup, reason:", reason);
  
  // First, check if the user won or lost based on the reason
  let playerWon = reason.startsWith('opponent');
  
  // Update scores
  if (playerWon) {
    playerScore++;
  } else {
    opponentScore++;
  }
  gameCount++;
  
  // Create the popup container if it doesn't exist
  let popup = document.getElementById('game-over-popup');
  if (!popup) {
    popup = document.createElement('div');
    popup.id = 'game-over-popup';
    document.body.appendChild(popup);
    
    // Style the popup
    popup.style.position = 'fixed';
    popup.style.top = '50%';
    popup.style.left = '50%';
    popup.style.transform = 'translate(-50%, -50%)';
    popup.style.backgroundColor = 'rgba(0, 0, 0, 0.85)';
    popup.style.color = '#00ffff';
    popup.style.padding = '20px';
    popup.style.borderRadius = '10px';
    popup.style.boxShadow = '0 0 20px rgba(0, 255, 255, 0.5)';
    popup.style.zIndex = '1000';
    popup.style.textAlign = 'center';
    popup.style.minWidth = '300px';
    popup.style.fontFamily = 'Arial, sans-serif';
    popup.style.border = '2px solid #00ffff';
  }
  
  // Generate result message
  let resultMessage = playerWon ? 
    '<span style="color: #00ff00; font-size: 24px;">You won!</span>' : 
    '<span style="color: #ff3333; font-size: 24px;">You lost!</span>';
  
  // Populate popup content
  popup.innerHTML = `
    <h2 style="margin-top: 0; color: #00ffff;">Game Over</h2>
    ${resultMessage}
    <div style="margin: 20px 0;">
      <table style="margin: 0 auto; border-collapse: collapse; width: 80%;">
        <tr style="border-bottom: 1px solid rgba(0, 255, 255, 0.3);">
          <th style="padding: 5px; text-align: left;">Round</th>
          <td style="padding: 5px; text-align: right;">${gameCount}</td>
        </tr>
        <tr style="border-bottom: 1px solid rgba(0, 255, 255, 0.3);">
          <th style="padding: 5px; text-align: left;">Your Score</th>
          <td style="padding: 5px; text-align: right;">${playerScore}</td>
        </tr>
        <tr>
          <th style="padding: 5px; text-align: left;">Opponent Score</th>
          <td style="padding: 5px; text-align: right;">${opponentScore}</td>
        </tr>
      </table>
    </div>
    <button id="play-again-btn" style="background-color: #00ffff; color: #000; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer; font-weight: bold; margin-right: 10px;">Play Again</button>
    <button id="leave-game-btn" style="background-color: #ff3333; color: #fff; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer; font-weight: bold;">Leave Game</button>
  `;
  
  // Show the popup
  popup.style.display = 'block';
  
  // Add event listeners to buttons
  document.getElementById('play-again-btn').addEventListener('click', () => {
    popup.style.display = 'none';
    restartGame();
  });
  
  document.getElementById('leave-game-btn').addEventListener('click', () => {
    popup.style.display = 'none';
    endGame();
    // Reset scores when leaving
    playerScore = 0;
    opponentScore = 0;
    gameCount = 0;
  });
}

// Add this function to restart the game with the same players
function restartGame() {
  console.log("Restarting game");
  gameStarted = false;
  
  // Clear game instance
  if (window.gameInstance) {
    window.gameInstance = null;
  }
  
  // Show loading message
  showMessage('Waiting for opponent to restart...');
  
  // Signal to server that this player is ready to restart
  socket.emit('restart-ready');
  
  // Clear the game container
  document.getElementById('game-container').innerHTML = '<canvas id="game-canvas"></canvas><div id="game-message"></div>';
}

// Show message in UI
function showMessage(text) {
  console.log(`Showing message: ${text}`);
  const messageEl = document.getElementById('message');
  if (messageEl) {
    messageEl.textContent = text;
    messageEl.style.display = 'block';
    setTimeout(() => {
      messageEl.style.display = 'none';
    }, 3000);
  }
}

// Add event listeners for buttons and UI elements
document.getElementById('join-btn')?.addEventListener('click', joinRoom);
document.getElementById('ready-btn')?.addEventListener('click', setReady);
document.getElementById('share-btn')?.addEventListener('click', () => {
  const url = window.location.href.split('?')[0];
  navigator.clipboard.writeText(`${url}?room=${roomId}`);
  showMessage('Link copied to clipboard!');
});

// Create debug button
window.addEventListener('load', () => {
  if (process.env.NODE_ENV !== 'production') {
    const debugButton = document.createElement('button');
    debugButton.textContent = "Force Position Update";
    debugButton.style.position = 'absolute';
    debugButton.style.top = '10px';
    debugButton.style.right = '10px';
    debugButton.style.zIndex = '1000';
    debugButton.addEventListener('click', () => {
      if (gameMode === 'multi') {
        sendPositionUpdate();
        console.log("Forced position update sent");
      } else {
        console.log("Debug: Force AI update");
        if (window.gameInstance) {
          window.gameInstance.updateAI();
        }
      }
    });
    document.body.appendChild(debugButton);
  }
});

window.showGameOverPopup = showGameOverPopup;
window.toggleSound = toggleSound;
