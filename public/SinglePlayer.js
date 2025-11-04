// SinglePlayer.js - Handles the single player mode of the Tron game
// Use variables from app.js instead of redeclaring them
// gameStarted is declared in app.js
// soundEnabled is declared in app.js
// gameInstance is declared in app.js
// aiDifficulty is declared in app.js
// playerScoreSP is declared in app.js
// aiScore is declared in app.js
// gameCountSP is declared in app.js

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
  gameStarted = true; // Using global variable from app.js

  // Hide menu UI, show game canvas
  document.getElementById('single-player-menu').style.display = 'none';
  document.getElementById('game-container').style.display = 'block';

  // Add game-active class to body for mobile fullscreen
  document.body.classList.add('game-active');

  // Initialize game with single player settings
  // First player is always the human player (blue)
  initializeGameSP(true);
}

// Initialize game instance - renamed to avoid conflicts
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


// Add this debug function to manually trigger AI updates if needed
function debugAIUpdate() {
  if (gameInstance && gameInstance.singlePlayerMode) {
    console.log("Manually triggering AI update");
    gameInstance.updateAI();
  }
}


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

// Handle game events - renamed to avoid conflicts
function handleGameEventSP(data) {
  console.log('Game event:', data);

  if (data.type === 'gameover') {
    // Handle game over event with a delay to let the "Game Over" message be seen
    let reason = data.reason || '';
    setTimeout(() => {
      showSinglePlayerGameOverPopup(reason);
    }, 1500);
  }
}

// Show game over popup for single player
function showSinglePlayerGameOverPopup(reason) {
  console.log("Showing game over popup, reason:", reason);

  // Check if popup is already visible - prevent duplicate calls
  let popup = document.getElementById('game-over-popup');
  if (popup && popup.style.display === 'block') {
    console.log("Popup already visible, ignoring duplicate call");
    return;
  }

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

  // Use setTimeout to ensure the popup is rendered before adding event listeners
  // This prevents race conditions where buttons might not exist yet
  setTimeout(() => {
    const playAgainBtn = document.getElementById('play-again-btn');
    const backMenuBtn = document.getElementById('back-menu-btn');

    // Use onclick to replace any existing handlers (not addEventListener)
    if (playAgainBtn) {
      playAgainBtn.onclick = (e) => {
        e.stopPropagation(); // Prevent event bubbling
        popup.style.display = 'none';
        restartGameSP();
      };
    }

    if (backMenuBtn) {
      backMenuBtn.onclick = (e) => {
        e.stopPropagation(); // Prevent event bubbling
        popup.style.display = 'none';
        endGameSP();
        // Reset scores when leaving
        playerScoreSP = 0;
        aiScore = 0;
        gameCountSP = 0;
      };
    }
  }, 0);
}

// Restart the game - renamed to avoid conflicts
function restartGameSP() {
  console.log("Restarting single player game");
  gameStarted = false;

  // Properly dispose of game instance
  if (gameInstance) {
    if (typeof gameInstance.dispose === 'function') {
      gameInstance.dispose();
    } else if (gameInstance.engine) {
      gameInstance.engine.stopRenderLoop();
    }
    gameInstance = null;
  }
  
  // Clear the game container
  document.getElementById('game-container').innerHTML = '<canvas id="game-canvas"></canvas><div id="game-message"></div>';
  
  // Start a new game
  startSinglePlayerGame();
}

// End the game and return to menu - renamed to avoid conflicts
function endGameSP() {
  console.log("Ending single player game");
  gameStarted = false;

  // Properly dispose of game instance
  if (gameInstance) {
    if (typeof gameInstance.dispose === 'function') {
      gameInstance.dispose();
    } else if (gameInstance.engine) {
      gameInstance.engine.stopRenderLoop();
    }
    gameInstance = null;
  }

  // Remove game-active class from body
  document.body.classList.remove('game-active');

  document.getElementById('game-container').style.display = 'none';
  document.getElementById('main-menu').style.display = 'block';
  
  // Clear the game canvas
  document.getElementById('game-container').innerHTML = '<canvas id="game-canvas"></canvas><div id="game-message"></div>';
}

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


// Expose necessary functions to global scope
window.initSinglePlayer = initSinglePlayer;
window.startSinglePlayerGame = startSinglePlayerGame;
window.initializeGameSP = initializeGameSP;
window.resizeGameCanvas = resizeGameCanvas;
window.handleGameEventSP = handleGameEventSP;
window.showSinglePlayerGameOverPopup = showSinglePlayerGameOverPopup;
window.restartGameSP = restartGameSP;
window.endGameSP = endGameSP;
window.debugAIUpdate = debugAIUpdate;
window.debugAI = debugAI;

// Make sure the script is loaded properly
console.log("SinglePlayer.js loaded successfully");