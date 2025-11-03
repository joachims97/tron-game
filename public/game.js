// TronGame class - With improved trail effects and enhanced physics
class TronGame {
  constructor(canvasId, isFirstPlayer, sendDataCallback, singlePlayerMode = false, aiDifficulty = 'medium') {
    // Configuration
    this.ARENA = 600;
    this.MAX = 50;
    this.ACC = 30;
    this.TURN = Math.PI / 2;
    this.TRAIL_MAX = 400; // Adjusted to match playground
    this.HIT_SQ = 9;
    
    // Physics parameters
    this.ROLL_MAX = Math.PI / 6; // Maximum roll angle (30 degrees)
    this.ROLL_SPEED = 5.0;       // How quickly the bike rolls into turns
    this.GRAVITY = 20;          // Gravity constant for jumps
    this.JUMP_FORCE = 10;        // Initial velocity for jumps
    this.JUMP_COOLDOWN = 1000;   // Cooldown between jumps (ms)
    
    // Trail params (from playground)
    this.trailParams = {
      trailColor: null, // Will be set based on player color
      alpha: 0.5,       // Increased from 0.25 to be more visible
      width: 1.6,
      length: this.TRAIL_MAX,
      glowIntensity: 2,
    };
    
    // Canvas and game state
    this.canvasId = canvasId;
    this.isFirstPlayer = isFirstPlayer;
    this.sendData = sendDataCallback;
    this.lastSentTime = 0;
    this.updateInterval = 50;
    this.keys = {};
    this.gameOver = false;
    this.scene = null; // Initialize scene reference
    
    // Physics state
    this.playerPhysics = {
      rollAngle: 0,          // Current roll angle
      jumping: false,        // Is the bike currently in a jump
      jumpVelocity: 0,       // Current vertical velocity
      height: 0,             // Current height above ground
      lastJumpTime: 0,       // Time of last jump for cooldown
      trailPaused: false     // Whether trail should be paused during jump
    };

    this.opponentPhysics = {
      rollAngle: 0,
      jumping: false,
      jumpVelocity: 0,
      height: 0,
      trailPaused: false
    };
    
    // Add single player mode properties
    this.singlePlayerMode = singlePlayerMode;
    this.aiDifficulty = aiDifficulty;
    this.aiUpdateInterval = 50; // ms between AI decisions
    this.lastAIDecision = 0;
    this.aiState = {
      targetAngle: 0,
      danger: false,
      jumpNeeded: false,
      turnDirection: 0,
      lookAheadDistance: 0,
      dangerDirections: []
    };

    // Set AI difficulty parameters
    this.setAIDifficultyParams();
    
    // Add these properties to your TronGame constructor
    this.lastOpponentUpdate = {
      position: null,
      angle: null,
      speed: null,
      timestamp: 0,
      height: 0,
      jumping: false
    };
    this.nextOpponentUpdate = {
      position: null,
      angle: null,
      speed: null,
      timestamp: 0,
      height: 0,
      jumping: false
    };
    this.interpolationTime = 100; // Time in ms to interpolate between positions
    
    // Define colors explicitly to ensure consistency
    this.playerColors = {
      player1: new BABYLON.Color3(0.0, 0.85, 1.0),  // Tron blue
      player2: new BABYLON.Color3(1.0, 0.85, 0.0)   // Yellow
    };
    
    // Mobile controls properties
    this.isMobile = this.detectMobile();
    this.virtualJoystick = null;
    this.jumpButton = null;
    this.touchControls = {
      active: false,
      turnValue: 0,
      accelerateValue: 0
    };
  }
  
  
  detectMobile() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  }
  
  
  start() {
    // Get canvas and initialize engine
    const canvas = document.getElementById(this.canvasId);
    // Explicitly set the canvas element's width and height (important for rendering quality)
    const desiredResolution = Math.min(800, Math.min(window.innerWidth, window.innerHeight));
    canvas.width = desiredResolution;
    canvas.height = desiredResolution;

    this.engine = new BABYLON.Engine(canvas, true, { 
      preserveDrawingBuffer: true, 
      stencil: true,
      disableWebGL2Support: false,
      adaptToDeviceRatio: true
    });
    
    window.addEventListener('resize', () => {
      const newSize = Math.min(800, Math.min(window.innerWidth, window.innerHeight));
      canvas.width = newSize;
      canvas.height = newSize;
      this.engine.resize();
    });
    
    // Create the scene first - THIS IS THE KEY FIX
    this.scene = new BABYLON.Scene(this.engine);
    
    // Set up lighting - just one basic light
    new BABYLON.HemisphericLight('L', new BABYLON.Vector3(0, 1, 0), this.scene)
      .intensity = 0.6; // Match playground intensity
    
    // Create ground - simple flat plane with improved material
    const ground = BABYLON.MeshBuilder.CreateGround('ground', {
      width: this.ARENA,
      height: this.ARENA
    }, this.scene);
    
    // Create the classic Tron dark floor with grid
    try {
      // Create grid material with dark background and bright lines
      const gridMaterial = new BABYLON.GridMaterial('gridMat', this.scene);
      
      // Set to dark background (almost black) with bright cyan lines
      gridMaterial.mainColor = new BABYLON.Color3(0.01, 0.01, 0.01);  // Nearly black background
      gridMaterial.lineColor = new BABYLON.Color3(0, 1.0, 1.0);       // Bright cyan lines
      
      // Adjust grid parameters for classic Tron look
      gridMaterial.gridRatio = 1;                    // Smaller grid for more lines
      gridMaterial.majorUnitFrequency = 10;         // Major lines every 10 units
      gridMaterial.minorUnitVisibility = 0.6;       // More visible minor lines
      gridMaterial.opacity = 1.0;                   // Fully opaque
      
      // Add subtle reflections
      gridMaterial.backFaceCulling = false;
      gridMaterial.gridOffset = new BABYLON.Vector3(0, 0, 0);
      
      // Force material to compute its values right away
      gridMaterial.freeze();
      
      // Apply material to ground
      ground.material = gridMaterial;
      
      console.log("Tron grid material created successfully");
    } catch (error) {
      console.error("Error creating grid material:", error);
      
      // Fallback to standard material if grid material fails
      const fallbackMat = new BABYLON.StandardMaterial('fallbackMat', this.scene);
      fallbackMat.diffuseColor = new BABYLON.Color3(0.01, 0.01, 0.01);  // Nearly black
      fallbackMat.specularColor = new BABYLON.Color3(0, 0.6, 0.8);      // Cyan specular
      fallbackMat.emissiveColor = new BABYLON.Color3(0, 0.2, 0.3);      // Slight glow
      
      // Create grid lines with diffuse texture
      const diffuseTexture = new BABYLON.Texture("https://assets.babylonjs.com/textures/grid.png", this.scene);
      diffuseTexture.uScale = diffuseTexture.vScale = 50;
      fallbackMat.diffuseTexture = diffuseTexture;
      
      // Apply fallback material
      ground.material = fallbackMat;
    }
    
    // Set player and opponent colors based on player number
    this.playerColor = this.isFirstPlayer ? 
      this.playerColors.player1 :  // Tron blue for player 1
      this.playerColors.player2;   // Yellow for player 2
    
    this.opponentColor = this.isFirstPlayer ? 
      this.playerColors.player2 :  // Yellow for player 2
      this.playerColors.player1;   // Tron blue for player 1
    
    // Set trail color to match bike highlight color
    this.trailParams.trailColor = this.playerColor;
    
    // Create position nodes for bikes
    this.player = this.createBikeNode(this.playerColor);
    this.opponent = this.createBikeNode(this.opponentColor);
    
    // Position bikes at opposite corners
    if (this.isFirstPlayer) {
      this.player.node.position.x = -this.ARENA / 4;
      this.opponent.node.position.x = this.ARENA / 4;
      this.opponent.angle = Math.PI;
    } else {
      this.player.node.position.x = this.ARENA / 4;
      this.opponent.node.position.x = -this.ARENA / 4;
      this.player.angle = Math.PI;
    }
    
    // Set up camera
    this.setupCamera();
    
    // Set up glow layer for all emissions
    this.setupGlowLayer();
    
    // Set up post processing
    this.setupPostProcessing();
    
    // Setup input - now handles both keyboard and mobile
    this.setupControls();

    // Apply performance optimizations for device type
    this.setupPerformanceOptions();
    
    
    // Load only the light cycle model - with error handling
    this.loadCycleModel();
    
    // Start game loop
    this.engine.runRenderLoop(() => this.update());
    window.addEventListener('resize', () => this.engine.resize());
  }
  
  setupControls() {
    // Keyboard input
    window.addEventListener('keydown', e => {
      this.keys[e.code] = true;

      // Handle spacebar for jump
      if (e.code === 'Space') {
        this.tryJump();
      }
    });
    window.addEventListener('keyup', e => this.keys[e.code] = false);

    // Setup mobile controls if on mobile device
    if (this.isMobile) {
      this.setupMobileControls();
    }
  }
  
  
  setupMobileControls() {
    if (!this.isMobile) return;

    console.log("Setting up mobile controls");

    // Create container for mobile controls
    const controlsContainer = document.createElement('div');
    controlsContainer.id = 'mobile-controls';
    controlsContainer.style.position = 'absolute';
    controlsContainer.style.bottom = '-100px';
    controlsContainer.style.left = '0';
    controlsContainer.style.width = '100%';
    controlsContainer.style.height = '250px';
    controlsContainer.style.display = 'flex';
    controlsContainer.style.justifyContent = 'space-between';
    controlsContainer.style.pointerEvents = 'none';
    document.body.appendChild(controlsContainer);

    // Create virtual joystick container
    const joystickContainer = document.createElement('div');
    joystickContainer.id = 'joystick-container';
    joystickContainer.style.width = '150px';
    joystickContainer.style.height = '150px';
    joystickContainer.style.position = 'relative';
    joystickContainer.style.marginLeft = '50px';
    joystickContainer.style.backgroundColor = 'rgba(0,0,0,0.2)'; // Debug visibility
    joystickContainer.style.borderRadius = '10px';
    joystickContainer.style.pointerEvents = 'auto';
    controlsContainer.appendChild(joystickContainer);

    // Create joystick base
    const joystickBase = document.createElement('div');
    joystickBase.id = 'joystick-base';
    joystickBase.style.width = '120px';
    joystickBase.style.height = '120px';
    joystickBase.style.borderRadius = '50%';
    joystickBase.style.backgroundColor = 'rgba(0, 0, 0, 0.3)';
    joystickBase.style.border = '2px solid rgba(0, 255, 255, 0.5)';
    joystickBase.style.position = 'absolute';
    joystickBase.style.top = '50%';
    joystickBase.style.left = '50%';
    joystickBase.style.transform = 'translate(-50%, -50%)';
    joystickBase.style.pointerEvents = 'none';
    joystickContainer.appendChild(joystickBase);

    // Create joystick thumb
    const joystickThumb = document.createElement('div');
    joystickThumb.id = 'joystick-thumb';
    joystickThumb.style.width = '50px';
    joystickThumb.style.height = '50px';
    joystickThumb.style.borderRadius = '50%';
    joystickThumb.style.backgroundColor = 'rgba(0, 180, 255, 0.7)';
    joystickThumb.style.border = '2px solid rgba(0, 255, 255, 0.8)';
    joystickThumb.style.position = 'absolute';
    joystickThumb.style.top = '50%';
    joystickThumb.style.left = '50%';
    joystickThumb.style.transform = 'translate(-50%, -50%)';
    joystickThumb.style.pointerEvents = 'none';
    joystickThumb.style.boxShadow = '0 0 10px rgba(0, 255, 255, 0.8)';
    joystickContainer.appendChild(joystickThumb);

    // Save reference to joystick thumb
    this.joystickThumb = joystickThumb;

    // Create jump button
    const jumpButtonElem = document.createElement('div');
    jumpButtonElem.id = 'jump-button';
    jumpButtonElem.style.width = '80px';
    jumpButtonElem.style.height = '80px';
    jumpButtonElem.style.borderRadius = '50%';
    jumpButtonElem.style.backgroundColor = 'rgba(0, 180, 255, 0.5)';
    jumpButtonElem.style.display = 'flex';
    jumpButtonElem.style.justifyContent = 'center';
    jumpButtonElem.style.alignItems = 'center';
    jumpButtonElem.style.marginRight = '40px';
    jumpButtonElem.style.pointerEvents = 'auto';
    jumpButtonElem.style.color = 'white';
    jumpButtonElem.style.fontWeight = 'bold';
    jumpButtonElem.style.fontSize = '16px';
    jumpButtonElem.innerText = 'JUMP';
    jumpButtonElem.style.userSelect = 'none';
    jumpButtonElem.style.border = '2px solid rgba(0, 255, 255, 0.8)';
    jumpButtonElem.style.boxShadow = '0 0 10px rgba(0, 255, 255, 0.8)';
    controlsContainer.appendChild(jumpButtonElem);

    // Set up jump button event
    jumpButtonElem.addEventListener('touchstart', (e) => {
      e.preventDefault();
      this.tryJump();
      jumpButtonElem.style.backgroundColor = 'rgba(0, 255, 255, 0.8)';
    });

    jumpButtonElem.addEventListener('touchend', (e) => {
      e.preventDefault();
      jumpButtonElem.style.backgroundColor = 'rgba(0, 180, 255, 0.5)';
    });

    // Add debug info
    const debugInfo = document.createElement('div');
    debugInfo.id = 'joystick-debug';
    debugInfo.style.position = 'absolute';
    debugInfo.style.top = '10px';
    debugInfo.style.left = '10px';
    debugInfo.style.color = 'white';
    debugInfo.style.backgroundColor = 'rgba(0,0,0,0.5)';
    debugInfo.style.padding = '5px';
    debugInfo.style.fontSize = '12px';
    debugInfo.style.zIndex = '1000';
    debugInfo.textContent = 'Touch: waiting...';
    document.body.appendChild(debugInfo);

    // Set up joystick container touch events with verbose debugging
    joystickContainer.addEventListener('touchstart', (e) => {
      e.preventDefault();
      this.touchControls.active = true;
      console.log("Touch started on joystick");
      debugInfo.textContent = "Touch started";
      this.updateJoystickPosition(e.touches[0]);
    });

    joystickContainer.addEventListener('touchmove', (e) => {
      e.preventDefault();
      if (this.touchControls.active) {
        console.log("Touch moved on joystick");
        debugInfo.textContent = `Move: ${e.touches[0].clientX},${e.touches[0].clientY}`;
        this.updateJoystickPosition(e.touches[0]);
      }
    });

    const endTouch = (e) => {
      e.preventDefault();
      this.touchControls.active = false;
      this.touchControls.turnValue = 0;
      this.touchControls.accelerateValue = 0;
      joystickThumb.style.transform = 'translate(-50%, -50%)';
      console.log("Touch ended on joystick");
      debugInfo.textContent = "Touch ended";
    };

    joystickContainer.addEventListener('touchend', endTouch);
    joystickContainer.addEventListener('touchcancel', endTouch);

    console.log("Mobile controls setup complete");
  }

  // Completely rewritten update method with better debugging
  updateJoystickPosition(touch) {
    if (!this.joystickThumb) {
      console.error("Joystick thumb not found!");
      return;
    }

    const joystickContainer = document.getElementById('joystick-container');
    if (!joystickContainer) {
      console.error("Joystick container not found!");
      return;
    }

    const rect = joystickContainer.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    // Calculate distance from center
    const deltaX = touch.clientX - centerX;
    const deltaY = touch.clientY - centerY;

    // Log these values to verify calculations
    console.log(`Touch at: ${touch.clientX}, ${touch.clientY}`);
    console.log(`Joystick center at: ${centerX}, ${centerY}`);
    console.log(`Delta: ${deltaX}, ${deltaY}`);

    const maxDistance = 50;  // Half of joystick base radius

    // Normalize to -1 to 1 range
    let dx = deltaX / maxDistance;
    let dy = deltaY / maxDistance;

    // Clamp values for maximum distance
    const magnitude = Math.sqrt(dx * dx + dy * dy);
    if (magnitude > 1) {
      dx /= magnitude;
      dy /= magnitude;
    }

    // Calculate thumb position
    const thumbX = dx * maxDistance;
    const thumbY = dy * maxDistance;

    // Update joystick visual - log the transform that will be applied
    const transform = `translate(calc(-50% + ${thumbX}px), calc(-50% + ${thumbY}px))`;
    console.log(`Setting transform: ${transform}`);
    this.joystickThumb.style.transform = transform;

    // Update joystick values for game control
    this.touchControls.turnValue = -dx;
    this.touchControls.accelerateValue = dy;

    // Update debug info
    const debugInfo = document.getElementById('joystick-debug');
    if (debugInfo) {
      debugInfo.textContent = `Touch: ${Math.round(dx*100)/100}, ${Math.round(dy*100)/100}`;
    }
  }

  // Add method to handle window resize
  handleWindowResize() {
    if (this.engine) {
      this.engine.resize();
    }

    // Adjust mobile controls if needed
    if (this.isMobile) {
      // Any additional resize handling for controls
    }
  }

  // Add performance optimization settings based on device with improved compatibility
  setupPerformanceOptions() {
    if (this.isMobile) {
      console.log("Applying mobile optimizations with improved compatibility");

      // Use more conservative hardware scaling (1.25 instead of 1.5)
      this.engine.setHardwareScalingLevel(1.25);
      
      // Keep post-processing enabled but simplify settings
      if (this.renderPipeline) {
        // Simplify bloom settings for better mobile performance
        this.renderPipeline.bloomEnabled = true;
        this.renderPipeline.bloomThreshold = 0.4;  // Higher threshold for less processing
        this.renderPipeline.bloomWeight = 0.5;     // Medium weight for reasonable effect
        this.renderPipeline.bloomKernel = 32;      // Smaller kernel for performance
        
        // Simplify image processing
        if (this.renderPipeline.imageProcessing) {
          this.renderPipeline.imageProcessing.vignetteEnabled = true;
          this.renderPipeline.imageProcessing.vignetteWeight = 0.6;
          this.renderPipeline.imageProcessing.vignetteBlendMode = 
            BABYLON.ImageProcessingPostProcess.VIGNETTEMODE_MULTIPLY;
          this.renderPipeline.imageProcessing.contrast = 1.1;
        }
      }
      
      // Ensure post-processing is enabled to avoid material rendering issues
      this.scene.postProcessesEnabled = true;
      
      // Enhance material parameters for mobile compatibility
      this.scene.meshes.forEach(mesh => {
        if (mesh.material) {
          // Force update of materials for mobile
          mesh.material.markAsDirty(BABYLON.Material.TextureDirtyFlag);
        }
      });
      
      // Adjust camera for better mobile view
      if (this.camera) {
        this.camera.radius = 40; 
        this.camera.heightOffset = 12;
      }
      
      // Set mobile-specific scene optimizations
      this.scene.autoClear = true;                       // Clear each frame
      this.scene.autoClearDepthAndStencil = true;        // Clear depth and stencil
      this.scene.skipPointerMovePicking = true;          // Skip pointer picking for performance
      this.scene.constantlyUpdateMeshUnderPointer = false; // Disable constant updates
      
      // Ensure renderer has correct modes for mobile
      this.engine.setHardwareScalingLevel(1.25);         // Apply scaling one more time to ensure it takes
      this.engine.adaptToDeviceRatio = true;             // Adapt to device ratio
      this.engine.disablePerformanceMonitorInBackground = true; // Save resources when in background
    }
  }

  
  createBikeNode(color) {
    // Create a transform node for position tracking
    const root = new BABYLON.TransformNode('bike', this.scene);

    // Create a box as placeholder until model loads
    const box = BABYLON.MeshBuilder.CreateBox("tempBike", {width: 1.2, height: 1.2, depth: 4}, this.scene);
    box.parent = root;

    // Create StandardMaterial for the bike
    const bikeMat = new BABYLON.StandardMaterial('bm', this.scene);
    bikeMat.diffuseColor = BABYLON.Color3.Black(); // Black base
    bikeMat.emissiveColor = color; // Emissive color gives the glow
    bikeMat.specularColor = color.scale(0.5); // Subtle specular highlight
    bikeMat.specularPower = 64; // Focused specular for shiny look
    box.material = bikeMat;

    // Initialize TrailMesh attached to the root node
    // We'll make it active/visible later
    const trail = new BABYLON.TrailMesh("trail", root, this.scene, 
      this.trailParams.width, this.trailParams.length, true);
    
    // Make trail initially invisible
    trail.visibility = 0;
    trail.setEnabled(false);
    
    // Create enhanced trail material for Tron light ribbon effect
    const trailMat = new BABYLON.StandardMaterial("trailMat", this.scene);
    trailMat.emissiveColor = color.clone(); // Base color
    trailMat.diffuseColor = BABYLON.Color3.Black();
    trailMat.specularColor = BABYLON.Color3.Black();
    trailMat.alpha = this.trailParams.alpha;
    trailMat.needDepthPrePass = true; // Correct transparent sorting

    // Add more intensity to emissive to create stronger glow
    trailMat.emissiveFresnelParameters = new BABYLON.FresnelParameters();
    trailMat.emissiveFresnelParameters.bias = 0.3;
    trailMat.emissiveFresnelParameters.power = 1;
    trailMat.emissiveFresnelParameters.leftColor = BABYLON.Color3.White();
    trailMat.emissiveFresnelParameters.rightColor = color.scale(2); // Intensify color

    trail.material = trailMat;

    return {
      node: root,
      angle: 0,
      speed: this.MAX * 0.3,
      trail: trail,
      trailActive: false,
      trailMat: trailMat,
      bikeColor: color,
      placeholder: box,
      modelNode: null  // Will store the actual model for rotation
    };
  }
  
  setupGlowLayer() {
    // Create glow layer with more compatible settings for mobile/desktop
    try {
      console.log("Setting up glow layer with optimized settings");
      
      // Use smaller kernel size for better cross-platform compatibility
      this.glowLayer = new BABYLON.GlowLayer("glow", this.scene, { 
        blurKernelSize: this.isMobile ? 32 : 64,  // Use smaller kernel on mobile
        mainTextureFixedSize: 512,                // Fixed size for better performance
        mainTextureRatio: this.isMobile ? 0.5 : 1 // Reduce resolution on mobile
      });

      // Set moderate intensity that works across devices
      this.glowLayer.intensity = this.isMobile ? 1.0 : 1.5;
      
      // Make sure excluded meshes are initialized
      this.glowLayer.excludedMeshes = this.glowLayer.excludedMeshes || [];

      // Optimize glow selector for better performance
      this.glowLayer.customEmissiveColorSelector = (mesh, subMesh, material, result) => {
        if (!material) { 
          result.set(0, 0, 0, 0); 
          return; 
        }
        
        try {
          // Only calculate glow for relevant meshes to save performance
          if (mesh.name.includes("trail") || mesh.name.includes("bike")) {
            // Get alpha value safely
            const alpha = material.alpha !== undefined ? material.alpha : 1;

            // Check if material has emissive color
            if (material.emissiveColor) {
              // Create properly scaled glow based on device
              const intensity = this.isMobile ? 1.0 : 1.5;
              result.set(
                material.emissiveColor.r * alpha * intensity,
                material.emissiveColor.g * alpha * intensity,
                material.emissiveColor.b * alpha * intensity,
                1
              );
            } else {
              result.set(0, 0, 0, 0);
            }
          } else {
            // Skip glow calculation for other objects
            result.set(0, 0, 0, 0);
          }
        } catch (e) {
          // Fallback if any error in custom glow calculation
          console.warn("Error in glow calculation:", e);
          result.set(0, 0, 0, 0);
        }
      };
    } catch (error) {
      console.error("Error setting up glow layer:", error);
      // Continue without glow layer if it fails
      this.glowLayer = null;
    }
  }
  
  setupPostProcessing() {
    try {
      console.log("Setting up post-processing with optimized settings");
      
      // Create rendering pipeline with optimized settings for cross-platform compatibility
      const pipeline = new BABYLON.DefaultRenderingPipeline(
        "pipeline", 
        true, 
        this.scene, 
        [this.camera]
      );

      // Configure bloom with platform-specific settings
      pipeline.bloomEnabled = true;
      
      if (this.isMobile) {
        // Mobile-optimized bloom settings
        pipeline.bloomThreshold = 0.4;    // Higher threshold to process fewer pixels
        pipeline.bloomWeight = 0.5;       // Medium weight for reasonable effect
        pipeline.bloomKernel = 32;        // Smaller kernel for better performance 
        pipeline.bloomScale = 0.5;        // Medium scale for better performance
      } else {
        // Desktop bloom settings (higher quality)
        pipeline.bloomThreshold = 0.35;   // Lower threshold to catch more of the glow
        pipeline.bloomWeight = 0.7;       // Increased weight for stronger effect
        pipeline.bloomKernel = 64;        // Larger kernel for better spread
        pipeline.bloomScale = 0.55;       // Increased scale for more pronounced glow
      }

      // Configure image processing with safe defaults
      pipeline.imageProcessingEnabled = true;
      
      // Set up vignette effect
      if (pipeline.imageProcessing) {
        pipeline.imageProcessing.vignetteEnabled = true;
        pipeline.imageProcessing.vignetteWeight = this.isMobile ? 0.6 : 0.8;
        pipeline.imageProcessing.vignetteStretch = 0.5;
        pipeline.imageProcessing.vignetteDarkness = this.isMobile ? 0.7 : 0.8;
        
        // Set contrast levels based on platform
        pipeline.imageProcessing.contrast = this.isMobile ? 1.1 : 1.2;
        
        // Ensure clean color grading
        if (pipeline.imageProcessing.colorGradingEnabled) {
          pipeline.imageProcessing.colorGradingEnabled = false;
        }
      }
      
      // Enable FXAA for smoother edges on desktop, disable on mobile for performance
      pipeline.fxaaEnabled = !this.isMobile;
      
      // Store reference for possible runtime adjustments
      this.renderPipeline = pipeline;
      
      console.log("Post-processing setup complete");
    } catch (error) {
      console.error("Error setting up post-processing:", error);
      
      // Create minimal pipeline as fallback if full setup fails
      try {
        const fallbackPipeline = new BABYLON.DefaultRenderingPipeline(
          "fallbackPipeline", 
          false,  // No HDR
          this.scene, 
          [this.camera]
        );
        
        // Basic bloom only
        fallbackPipeline.bloomEnabled = true;
        fallbackPipeline.bloomThreshold = 0.5;
        fallbackPipeline.bloomWeight = 0.5;
        fallbackPipeline.bloomKernel = 32;
        
        // Store reference
        this.renderPipeline = fallbackPipeline;
        
        console.log("Using fallback post-processing pipeline");
      } catch (fallbackError) {
        console.error("Failed to create fallback pipeline:", fallbackError);
        this.renderPipeline = null;
      }
    }
  }
  
  loadCycleModel() {
    // Try to load the light cycle with minimal options
    console.log("Attempting to load light cycle model...");
    const cycleUrl = "https://cdn.glitch.global/8dfd67b3-e211-4916-8346-635f7d975e09/assets%2Ftron_light_cycle.glb?v=1745381160389";
    
    BABYLON.SceneLoader.ImportMeshAsync("", "", cycleUrl, this.scene).then((result) => {   
      console.log("Light cycle loaded successfully");
        
      // Store the model
      this.cycleModel = result.meshes[0];
      
      // Log mesh structure to help identify parts
      console.log("Model structure:");
      this.logMeshHierarchy(this.cycleModel);
        
      // Apply the model to the bikes - with minimal scaling
      this.applyModelToBikes();
    })
    .catch(error => {
      console.error("Error loading light cycle model:", error);
      console.log("Continuing with placeholder boxes");
    });
  }
  
  // Helper to visualize mesh structure for identifying highlight parts
  logMeshHierarchy(rootMesh, indent = 0) {
    // Print indented mesh name
    const spacing = "  ".repeat(indent);
    console.log(`${spacing}> ${rootMesh.name}`);
    
    // Log material info if present
    if (rootMesh.material) {
      console.log(`${spacing}  Material: ${rootMesh.material.name}`);
    }
    
    // Log child meshes recursively
    const children = rootMesh.getChildMeshes(false);
    if (children && children.length > 0) {
      children.forEach(child => {
        this.logMeshHierarchy(child, indent + 1);
      });
    }
  }

  applyModelToBikes() {
    try {
      const scale = 0.5;

      // Clone for player
      const playerModel = this.cycleModel.clone("playerModel");
      playerModel.scaling = new BABYLON.Vector3(scale, scale, scale);
      
      // Rotate bike
      playerModel.rotate(BABYLON.Axis.Y, Math.PI, BABYLON.Space.LOCAL);
      
      // Create an extra node to handle the roll rotation separately
      const playerRollNode = new BABYLON.TransformNode("playerRollNode", this.scene);
      playerRollNode.parent = this.player.node; // Attach to main node
      
      // Store this for roll animations
      this.player.modelNode = playerRollNode;
      
      // Find meshes with the pipingGlow material - use includes() instead of exact match
      playerModel.getChildMeshes().forEach(mesh => {
        // Match the specific part using the full name from the logs
        if (mesh.name.includes("Body_pipingGlow_MAT_0")) {
          console.log(`Found glow part: ${mesh.name}`);

          // Create new material
          const newMaterial = new BABYLON.PBRMaterial("playerGlowMat", this.scene);

          // Set properties for strong emission
          newMaterial.emissiveColor = this.playerColor;
          newMaterial.emissiveIntensity = 0.7;

          // Make sure other properties don't interfere
          newMaterial.albedoColor = BABYLON.Color3.Black();
          newMaterial.reflectivityColor = BABYLON.Color3.Black();

          // Apply material directly
          console.log(`Setting player color to: ${this.playerColor.r}, ${this.playerColor.g}, ${this.playerColor.b}`);
          mesh.material = newMaterial;
        }
      });

      // Hide placeholder and attach model
      this.player.placeholder.setEnabled(false);
      playerModel.parent = playerRollNode; // Attach to roll node instead of main node
      playerModel.rotation.y = Math.PI / 1.5 + Math.PI;

      // Clone for opponent - similar process
      const opponentModel = this.cycleModel.clone("opponentModel");
      opponentModel.scaling = new BABYLON.Vector3(scale, scale, scale);
      
      // Rotate opponent bike 
      opponentModel.rotate(BABYLON.Axis.Y, Math.PI, BABYLON.Space.LOCAL);
      
      // Create roll node for opponent
      const opponentRollNode = new BABYLON.TransformNode("opponentRollNode", this.scene);
      opponentRollNode.parent = this.opponent.node;
      
      // Store for roll animations
      this.opponent.modelNode = opponentRollNode;
      
      // Apply opponent colors - use the same approach
      opponentModel.getChildMeshes().forEach(mesh => {
        if (mesh.name.includes("Body_pipingGlow_MAT_0")) {
          console.log(`Found opponent glow part: ${mesh.name}`);

          // Create new material
          const newMaterial = new BABYLON.PBRMaterial("opponentGlowMat", this.scene);

          // Set properties for strong emission
          newMaterial.emissiveColor = this.opponentColor;
          newMaterial.emissiveIntensity = 0.7;

          // Make sure other properties don't interfere
          newMaterial.albedoColor = BABYLON.Color3.Black();
          newMaterial.reflectivityColor = BABYLON.Color3.Black();

          // Apply material directly
          console.log(`Setting opponent color to: ${this.opponentColor.r}, ${this.opponentColor.g}, ${this.opponentColor.b}`);
          mesh.material = newMaterial;
        }
      });

      // Hide placeholder and position
      this.opponent.placeholder.setEnabled(false);
      opponentModel.parent = opponentRollNode; // Attach to roll node
      opponentModel.rotation.y = Math.PI / 2 + Math.PI;

      // Hide original
      this.cycleModel.setEnabled(false);
    } catch (error) {
      console.error("Error applying models:", error);
    }
  }
  
  setupCamera() {
    // Create follow camera that locks on player's bike - simple setup
    this.camera = new BABYLON.FollowCamera('cam', this.player.node.position.clone(), this.scene);
    this.camera.lockedTarget = this.player.node;
    this.camera.radius = 30;
    this.camera.heightOffset = 8;
    this.camera.rotationOffset = 180;
    this.camera.cameraAcceleration = 0.1;
    this.camera.maxCameraSpeed = 100;
  }
  
  checkBoundaryCollision(bike) {
    const pos = bike.node.position;
    let hit = false;

    if (Math.abs(pos.x) > this.ARENA / 2) {
      pos.x = BABYLON.Scalar.Clamp(pos.x, -this.ARENA / 2, this.ARENA / 2);
      hit = true;
    }

    if (Math.abs(pos.z) > this.ARENA / 2) {
      pos.z = BABYLON.Scalar.Clamp(pos.z, -this.ARENA / 2, this.ARENA / 2);
      hit = true;
    }

    return hit;
  }
  
  // New method to handle jump physics
  tryJump() {
    // Only allow jump if:
    // 1. Not already jumping
    // 2. Cooldown period has passed
    const now = Date.now();
    if (!this.playerPhysics.jumping && 
        now - this.playerPhysics.lastJumpTime > this.JUMP_COOLDOWN) {
      
      console.log("Jumping!");
      this.playerPhysics.jumping = true;
      this.playerPhysics.jumpVelocity = this.JUMP_FORCE;
      this.playerPhysics.lastJumpTime = now;
      
      
      // Send jump event to opponent
      this.sendData({
        type: 'jump',
        x: this.player.node.position.x,
        z: this.player.node.position.z,
        height: this.playerPhysics.height
      });
    }
  }
  
  // Handle opponent jumping
  handleOpponentJump() {
    if (!this.opponentPhysics.jumping) {
      console.log("Opponent jumping!");
      this.opponentPhysics.jumping = true;
      this.opponentPhysics.jumpVelocity = this.JUMP_FORCE;
    }
  }
  

  // Add this method to configure AI based on difficulty
  setAIDifficultyParams() {
    switch (this.aiDifficulty) {
      case 'easy':
        this.aiParams = {
          reactionTime: 400,       // ms to react to obstacles
          lookAhead: 15,           // Units to look ahead for obstacles
          errorRate: 0.3,          // Chance of making a mistake
          maxSpeed: this.MAX * 0.7 // Lower max speed
        };
        break;
      case 'normal':
        this.aiParams = {
          reactionTime: 250,
          lookAhead: 30,
          errorRate: 0.1,
          maxSpeed: this.MAX * 0.9
        };
        break;
      default:
        // Default to normal
        this.aiParams = {
          reactionTime: 250,
          lookAhead: 30,
          errorRate: 0.1,
          maxSpeed: this.MAX * 0.9
        };
    }

    console.log(`AI difficulty set to ${this.aiDifficulty}`, this.aiParams);
  }

  // Update the updateAI method in TronGame class
  updateAI() {
    if (!this.singlePlayerMode) return;

    const now = Date.now();

    // Add initialization to ensure AI at least moves forward at start
    if (!this.aiInitialized) {
      console.log("Initializing AI movement");
      this.opponent.speed = this.aiParams.maxSpeed * 0.5; // Start at half speed
      this.aiState.turnDirection = 0; // Go straight initially
      this.aiInitialized = true;

      // Force the opponent to move a bit to activate trail
      if (this.opponent.trail) {
        this.opponent.trail.setEnabled(true);
        this.opponent.trail.visibility = 1;
      }
    }

    // Only make decisions at the specified interval
    if (now - this.lastAIDecision >= this.aiParams.reactionTime) {
      this.lastAIDecision = now;

      // Reset AI state for new decision
      this.aiState.danger = false;
      this.aiState.jumpNeeded = false;
      this.aiState.dangerDirections = [];

      // AI movement logic
      this.updateAIMovement();
    }

    // Add direct movement code here to ensure the opponent moves every frame
    // This is critical for making the AI move
    const dt = this.engine.getDeltaTime() / 900;

    // Apply turning - clamp to valid range
    const turnAmount = Math.max(-1, Math.min(1, this.aiState.turnDirection));

    // Calculate target angle - NOW FRAME-RATE INDEPENDENT with smoother multiplier
    const angleChange = turnAmount * this.TURN * 1.2 * dt;
    this.opponent.angle += angleChange;

    // Add gentle turn decay to prevent continuous circling (much slower decay)
    // Gradually reduce turn direction back to zero between AI decisions
    this.aiState.turnDirection *= (1 - dt * 0.4);

    // Update position with current direction and speed
    this.opponent.node.rotation.y = -this.opponent.angle + Math.PI / 2;

    // Adjust speed based on context - more nuanced speed changes
    const targetSpeed = this.aiParams.maxSpeed;

    if (this.aiState.danger && this.aiState.dangerDirections.some(d => d.distance < 15)) {
      // Slow down significantly in dangerous situations
      const dangerSpeed = this.MAX * 0.4;
      this.opponent.speed = Math.max(dangerSpeed, this.opponent.speed - this.ACC * dt * 2);
    } else if (Math.abs(this.aiState.turnDirection) > 0.3) {
      // Slow down slightly when turning
      const turnSpeed = this.MAX * 0.75;
      if (this.opponent.speed > turnSpeed) {
        this.opponent.speed -= this.ACC * dt * 0.5;
      }
    } else {
      // Accelerate smoothly to target speed when safe
      if (this.opponent.speed < targetSpeed) {
        this.opponent.speed = Math.min(targetSpeed, this.opponent.speed + this.ACC * dt);
      } else {
        this.opponent.speed = Math.max(targetSpeed, this.opponent.speed - this.ACC * dt * 0.3);
      }
    }

    // Apply changes to position (THIS IS THE CRITICAL LINE FOR MOVEMENT)
    const movement = this.direction(this.opponent.angle).scale(this.opponent.speed * dt);
    this.opponent.node.position.addInPlace(movement);

    // Calculate opponent roll angle based on turn direction
    if (this.opponent.modelNode) {
      const opponentTargetRoll = turnAmount * this.ROLL_MAX;

      // Smoothly interpolate opponent roll
      this.opponentPhysics.rollAngle = BABYLON.Scalar.Lerp(
        this.opponentPhysics.rollAngle,
        opponentTargetRoll,
        dt * this.ROLL_SPEED
      );

      // Apply roll to opponent model
      this.opponent.modelNode.rotation.z = this.opponentPhysics.rollAngle;
    }

    // Debug log occasionally
    if (Math.random() < 0.01) {
      console.log(`AI: pos(${this.opponent.node.position.x.toFixed(2)}, ${this.opponent.node.position.z.toFixed(2)}), spd: ${this.opponent.speed.toFixed(2)}`);
    }
  }
  

  // Add method for AI movement and pathfinding
  updateAIMovement() {
    // Get opponent position
    const position = this.opponent.node.position.clone();

    // Normal difficulty gets special human-like behavior
    if (this.aiDifficulty === 'normal') {
      this.updateAIMovementNormal(position);
      return;
    }

    // Original AI logic for other difficulties
    // Look in various directions for obstacles
    const lookDirections = 16; // Number of directions to check
    const lookDistance = this.aiParams.lookAhead; // How far to look

    // Direction vectors for checking
    for (let i = 0; i < lookDirections; i++) {
      const angle = (Math.PI * 2 * i) / lookDirections;
      const direction = new BABYLON.Vector3(
        Math.cos(angle),
        0,
        Math.sin(angle)
      );

      // Create a ray from opponent position in the check direction
      const ray = new BABYLON.Ray(
        position.clone(),
        direction,
        lookDistance
      );

      // Don't hit opponent's own node
      const predicate = (mesh) => {
        return mesh !== this.opponent.node &&
               mesh !== this.opponent.placeholder &&
               mesh !== this.opponent.trail;
      };

      // Check for hit
      const hit = this.scene.pickWithRay(ray, predicate);

      if (hit.hit) {
        // Found an obstacle in this direction
        this.aiState.danger = true;
        this.aiState.dangerDirections.push({
          direction: direction,
          distance: hit.distance,
          angle: angle
        });

        // Decide if we need to jump (if the obstacle is the player's trail)
        if (hit.pickedMesh === this.player.trail &&
            hit.distance < this.aiParams.jumpThreshold &&
            Math.random() > this.aiParams.errorRate) {
          this.aiState.jumpNeeded = true;
        }
      }
    }

    // Check for boundary proximity
    if (Math.abs(position.x) > this.ARENA / 2 - lookDistance ||
        Math.abs(position.z) > this.ARENA / 2 - lookDistance) {
      this.aiState.danger = true;

      // Add boundary as a danger direction
      const toCenter = new BABYLON.Vector3(0, 0, 0).subtract(position).normalize();
      this.aiState.dangerDirections.push({
        direction: toCenter.scale(-1), // Away from center is danger
        distance: Math.min(
          this.ARENA / 2 - Math.abs(position.x),
          this.ARENA / 2 - Math.abs(position.z)
        ),
        angle: Math.atan2(toCenter.z, toCenter.x)
      });
    }

    // Determine best direction to turn if in danger
    if (this.aiState.danger) {
      this.calculateAISafeDirection();
    } else {
      // No immediate danger, add some randomness to movement
      if (Math.random() < this.aiParams.turnRandomness) {
        this.aiState.turnDirection = Math.random() > 0.5 ? 1 : -1;
      } else {
        // Consider moving toward player for more aggressive AI
        if (this.aiDifficulty === 'hard' || this.aiDifficulty === 'impossible') {
          const toPlayer = this.player.node.position.subtract(position).normalize();
          const currentDir = this.direction(this.opponent.angle);
          const dot = BABYLON.Vector3.Dot(toPlayer, currentDir);

          // If player is ahead, try to move toward them
          if (dot > 0.7) {
            const cross = BABYLON.Vector3.Cross(currentDir, toPlayer);
            this.aiState.turnDirection = Math.sign(cross.y) * 0.2;
          }
        }
      }
    }

    // Decide if jump is needed
    if (this.aiState.jumpNeeded && !this.opponentPhysics.jumping) {
      this.handleOpponentJump();
    }
  }

  // Human-like AI behavior for normal difficulty
  updateAIMovementNormal(position) {
    // Initialize state tracking for medium AI if not exists
    if (!this.aiState.mediumState) {
      this.aiState.mediumState = {
        lastDirectionChange: Date.now(),
        currentPattern: 'explore', // 'explore', 'evade', 'turn'
        turnDuration: 0,
        explorationAngle: Math.random() * Math.PI * 2
      };
    }

    const mediumState = this.aiState.mediumState;
    const currentDir = this.direction(this.opponent.angle);
    const lookDistance = this.aiParams.lookAhead;

    // Check for immediate obstacles in front and sides (like a human would see)
    const checkAngles = [-Math.PI/3, -Math.PI/6, 0, Math.PI/6, Math.PI/3]; // Left, half-left, front, half-right, right
    let frontDanger = false;
    let leftDanger = false;
    let rightDanger = false;
    let closestObstacle = Infinity;

    for (let i = 0; i < checkAngles.length; i++) {
      const checkAngle = this.opponent.angle + checkAngles[i];
      const direction = new BABYLON.Vector3(Math.cos(checkAngle), 0, Math.sin(checkAngle));

      const ray = new BABYLON.Ray(position.clone(), direction, lookDistance);
      const predicate = (mesh) => {
        return mesh !== this.opponent.node &&
               mesh !== this.opponent.placeholder &&
               mesh !== this.opponent.trail;
      };

      const hit = this.scene.pickWithRay(ray, predicate);

      if (hit.hit) {
        this.aiState.danger = true;
        closestObstacle = Math.min(closestObstacle, hit.distance);

        if (i === 2) frontDanger = true; // Front
        if (i < 2) leftDanger = true; // Left side
        if (i > 2) rightDanger = true; // Right side

        // Check if we should jump
        if (hit.pickedMesh === this.player.trail && hit.distance < 15) {
          this.aiState.jumpNeeded = true;
        }
      }
    }

    // Detect player proximity (evasion behavior)
    const playerPos = this.player.node.position;
    const distanceToPlayer = BABYLON.Vector3.Distance(position, playerPos);
    const playerDir = playerPos.subtract(position).normalize();
    const playerDot = BABYLON.Vector3.Dot(currentDir, playerDir);

    // Check if player is nearby (within visual range)
    const playerNearby = distanceToPlayer < 80;
    const playerAhead = playerDot > 0.3; // Player is somewhat ahead
    const playerBehind = playerDot < -0.3; // Player is behind

    // Detect if player is approaching (getting closer)
    if (!this.aiState.lastPlayerDistance) {
      this.aiState.lastPlayerDistance = distanceToPlayer;
    }
    const playerApproaching = distanceToPlayer < this.aiState.lastPlayerDistance - 2;
    this.aiState.lastPlayerDistance = distanceToPlayer;

    // Check boundaries with much larger margin
    const nearBoundary = Math.abs(position.x) > this.ARENA / 2 - 100 ||
                         Math.abs(position.z) > this.ARENA / 2 - 100;

    const veryNearBoundary = Math.abs(position.x) > this.ARENA / 2 - 40 ||
                             Math.abs(position.z) > this.ARENA / 2 - 40;

    // Decision making (human-like behavior)
    const now = Date.now();
    const timeSinceLastChange = now - mediumState.lastDirectionChange;

    // PRIORITY 1: Avoid walls - HIGHEST PRIORITY
    if (veryNearBoundary) {
      // Emergency wall avoidance - turn toward center strongly
      const toCenter = new BABYLON.Vector3(0, 0, 0).subtract(position).normalize();
      const cross = BABYLON.Vector3.Cross(currentDir, toCenter);
      this.aiState.turnDirection = Math.sign(cross.y) * 0.9;
      mediumState.currentPattern = 'evade';
      mediumState.lastDirectionChange = now;
    }
    // PRIORITY 2: Avoid immediate obstacles
    else if (frontDanger && closestObstacle < 25) {
      // Emergency turn - pick the safer side with smaller turn values
      if (leftDanger && !rightDanger) {
        this.aiState.turnDirection = 0.5 + Math.random() * 0.2; // Gentler turn right
      } else if (rightDanger && !leftDanger) {
        this.aiState.turnDirection = -0.5 - Math.random() * 0.2; // Gentler turn left
      } else {
        // Both sides blocked or both clear, pick randomly
        this.aiState.turnDirection = (Math.random() > 0.5 ? 1 : -1) * (0.4 + Math.random() * 0.2);
      }
      mediumState.currentPattern = 'evade';
      mediumState.lastDirectionChange = now;
    }
    // PRIORITY 3: Gentle wall avoidance
    else if (nearBoundary) {
      // Turn toward center gently
      const toCenter = new BABYLON.Vector3(0, 0, 0).subtract(position).normalize();
      const cross = BABYLON.Vector3.Cross(currentDir, toCenter);
      this.aiState.turnDirection = Math.sign(cross.y) * (0.3 + Math.random() * 0.1);
      mediumState.currentPattern = 'turn';
      mediumState.lastDirectionChange = now;
    }
    // PRIORITY 4: Evade player when nearby and approaching
    else if (playerNearby && playerApproaching && playerAhead) {
      // Try to move away from player's path
      const cross = BABYLON.Vector3.Cross(currentDir, playerDir);
      // Turn perpendicular to player direction with gentle randomness
      const evadeDirection = Math.sign(cross.y) || (Math.random() > 0.5 ? 1 : -1);
      this.aiState.turnDirection = evadeDirection * (0.25 + Math.random() * 0.15);
      mediumState.currentPattern = 'evade';
      mediumState.lastDirectionChange = now;
    }
    // PRIORITY 5: Random exploration and pattern changes (human-like wandering)
    else {
      // Change direction less frequently for smoother movement
      if (timeSinceLastChange > 4000 + Math.random() * 4000) { // Every 4-8 seconds
        // Decide on a new pattern
        const rand = Math.random();

        if (rand < 0.5) {
          // Go straight for a bit (more common)
          this.aiState.turnDirection = 0;
          mediumState.currentPattern = 'explore';
        } else if (rand < 0.85) {
          // Make a gentle turn (much gentler)
          this.aiState.turnDirection = (Math.random() - 0.5) * 0.3;
          mediumState.currentPattern = 'turn';
          mediumState.turnDuration = 2000 + Math.random() * 3000;
        } else {
          // Occasional moderate turn (not too sharp)
          this.aiState.turnDirection = (Math.random() > 0.5 ? 1 : -1) * (0.4 + Math.random() * 0.2);
          mediumState.currentPattern = 'turn';
          mediumState.turnDuration = 1500 + Math.random() * 2000;
        }

        mediumState.lastDirectionChange = now;
      }

      // If we're in a turn pattern, maintain it for the duration
      if (mediumState.currentPattern === 'turn' &&
          timeSinceLastChange < mediumState.turnDuration) {
        // Keep current turn direction (don't change it)
      } else if (mediumState.currentPattern === 'explore') {
        // Add very slight random variations while exploring (minimal jitter)
        this.aiState.turnDirection = (Math.random() - 0.5) * 0.08;
      }
    }

    // Decide if jump is needed
    if (this.aiState.jumpNeeded && !this.opponentPhysics.jumping) {
      this.handleOpponentJump();
    }
  }

  // Calculate the safest direction for AI to turn
  calculateAISafeDirection() {
    // Start with current direction
    const currentDir = this.direction(this.opponent.angle);

    // Find the most dangerous directions (closest obstacles)
    let mostDangerousDir = null;
    let shortestDistance = Infinity;

    for (const danger of this.aiState.dangerDirections) {
      if (danger.distance < shortestDistance) {
        shortestDistance = danger.distance;
        mostDangerousDir = danger.direction;
      }
    }

    if (mostDangerousDir) {
      // Calculate the dot product to see if we're heading toward danger
      const dot = BABYLON.Vector3.Dot(currentDir, mostDangerousDir);

      if (dot > 0.5) { // We're heading toward danger
        // Find best escape direction (orthogonal to danger)
        const cross = BABYLON.Vector3.Cross(currentDir, mostDangerousDir);

        // Determine if we should turn left or right
        // With some randomness to avoid predictability
        if (Math.abs(cross.y) < 0.2) {
          // Almost parallel with danger, pick a side with slight randomness
          this.aiState.turnDirection = (Math.random() > 0.5 ? 1 : -1);
        } else {
          // Turn in the direction of the cross product (with some randomness)
          const randomFactor = (Math.random() * 0.4) - 0.2; // -0.2 to 0.2
          this.aiState.turnDirection = Math.sign(cross.y) + randomFactor;
        }

        // Increase turn rate if danger is very close
        if (shortestDistance < this.aiParams.jumpThreshold / 2) {
          this.aiState.turnDirection *= 1.5;
        }
      }
    }
  }

  // Apply the AI decisions to the opponent bike
  applyAIDecisions() {
    // Get delta time first
    const dt = this.engine.getDeltaTime() / 900;

    // Apply turning - clamp to valid range
    const turnAmount = Math.max(-1, Math.min(1, this.aiState.turnDirection));

    // Calculate target angle - NOW FRAME-RATE INDEPENDENT with smoother multiplier
    const angleChange = turnAmount * this.TURN * 1.2 * dt;
    this.opponent.angle += angleChange;

    // Add gentle turn decay to prevent continuous circling (much slower decay)
    this.aiState.turnDirection *= (1 - dt * 0.4);

    // Update position with current direction and speed
    this.opponent.node.rotation.y = -this.opponent.angle + Math.PI / 2;

    // Adjust speed based on danger level
    if (this.aiState.danger && this.aiState.dangerDirections.some(d => d.distance < 10)) {
      // Slow down a bit in dangerous situations
      this.opponent.speed = Math.max(this.MAX * 0.5, this.opponent.speed * 0.95);
    } else {
      // Accelerate to target speed
      const targetSpeed = this.aiParams.maxSpeed;
      this.opponent.speed = Math.min(targetSpeed, this.opponent.speed * 1.05);
    }

    // Apply changes to position
    const movement = this.direction(this.opponent.angle).scale(this.opponent.speed * dt);
    this.opponent.node.position.addInPlace(movement);

    // Calculate opponent roll angle based on turn direction
    if (this.opponent.modelNode) {
      const opponentTargetRoll = turnAmount * this.ROLL_MAX;

      // Smoothly interpolate opponent roll
      this.opponentPhysics.rollAngle = BABYLON.Scalar.Lerp(
        this.opponentPhysics.rollAngle,
        opponentTargetRoll,
        dt * this.ROLL_SPEED
      );

      // Apply roll to opponent model
      this.opponent.modelNode.rotation.z = this.opponentPhysics.rollAngle;
    }
  }

  update() {
    if (this.gameOver) return;

    const dt = this.engine.getDeltaTime() / 900;
    
    if (this.singlePlayerMode && !this.gameOver) {
      this.updateAI();
    }
    
    // Player controls - now works with both keyboard and mobile
    let turn, accel;

    if (this.isMobile && this.touchControls.active) {
      // Mobile controls
      turn = this.touchControls.turnValue;

      // Mobile acceleration (forward/backward)
      accel = this.touchControls.accelerateValue < -0.2 ? 
        this.ACC : // Forward
        (this.touchControls.accelerateValue > 0.2 ? -this.ACC : 0); // Backward : None
    } else {
      // Keyboard controls
      turn = (this.keys['KeyA'] ? 1 : 0) - (this.keys['KeyD'] ? 1 : 0);
      accel = this.keys['KeyW'] ? this.ACC : this.keys['KeyS'] ? -this.ACC : 0;
    }

    // Update player angle and speed
    this.player.angle += turn * this.TURN * dt;
    this.player.speed = BABYLON.Scalar.Clamp(this.player.speed + accel * dt, 0, this.MAX);

    // Calculate target roll angle based on turning direction
    const targetRoll = turn * this.ROLL_MAX; // Negative for realism (lean into turn)

    // Smoothly interpolate current roll to target
    if (this.player.modelNode) {
      // Update the roll angle with smooth interpolation
      this.playerPhysics.rollAngle = BABYLON.Scalar.Lerp(
        this.playerPhysics.rollAngle,
        targetRoll,
        dt * this.ROLL_SPEED
      );

      // Apply the roll to the model node
      this.player.modelNode.rotation.z = this.playerPhysics.rollAngle;
    }

    // Update player position
    this.player.node.rotation.y = -this.player.angle + Math.PI / 2;
    this.player.node.position.addInPlace(this.direction(this.player.angle).scale(this.player.speed * dt));

    // Handle jump physics for player
    if (this.playerPhysics.jumping) {
      // Apply gravity to velocity
      this.playerPhysics.jumpVelocity -= this.GRAVITY * dt;

      // Update height based on velocity
      this.playerPhysics.height += this.playerPhysics.jumpVelocity * dt;

      // Check if we've landed
      if (this.playerPhysics.height <= 0) {
        this.playerPhysics.height = 0;
        this.playerPhysics.jumping = false;
        this.playerPhysics.jumpVelocity = 0;
      }

      // Apply height to node's Y position
      this.player.node.position.y = this.playerPhysics.height;
    }

    // Handle jump physics for opponent
    if (this.opponentPhysics.jumping) {
      // Apply gravity to velocity
      this.opponentPhysics.jumpVelocity -= this.GRAVITY * dt;

      // Update height based on velocity
      this.opponentPhysics.height += this.opponentPhysics.jumpVelocity * dt;

      // Check if we've landed
      if (this.opponentPhysics.height <= 0) {
        this.opponentPhysics.height = 0;
        this.opponentPhysics.jumping = false;
        this.opponentPhysics.jumpVelocity = 0;
      }

      // Apply height to node's Y position
      this.opponent.node.position.y = this.opponentPhysics.height;
    }

    // Handle collisions with arena boundaries
    if (this.checkBoundaryCollision(this.player)) {
      this.player.angle += Math.PI; // Reverse direction if hitting wall
    }

    // Handle trails after a brief delay
    if (!this.gameStartTime) {
      this.gameStartTime = Date.now();
    } else {
      // Activate trails after 500ms if not already active AND the bike has moved
      const currentTime = Date.now();
      const hasGameStarted = currentTime - this.gameStartTime > 500;

      // For player trail
      if (!this.player.trailActive && hasGameStarted) {
        // Check if player has moved from initial position
        if (this.player.speed > 0.1) {
          console.log("Activating player trail");

          // Dispose of existing trail if it exists
          if (this.player.trail) {
            this.player.trail.dispose();
          }

          // Create a new trail
          this.player.trail = new BABYLON.TrailMesh(
            "playerTrail", 
            this.player.node, 
            this.scene, 
            this.trailParams.width, 
            this.trailParams.length, 
            true
          );

          this.player.trail.position.y = 0.5;

          // Apply the material again
          this.player.trail.material = this.player.trailMat;
          this.player.trail.visibility = 1;
          this.player.trailActive = true;
        }
      }

      // For opponent trail - same logic
      if (!this.opponent.trailActive && hasGameStarted) {
        // Only activate trail when opponent starts moving
        if (this.opponent.speed > 0.1) {
          console.log("Activating opponent trail");

          // Dispose of existing trail if it exists
          if (this.opponent.trail) {
            this.opponent.trail.dispose();
          }

          // Create a new trail
          this.opponent.trail = new BABYLON.TrailMesh(
            "opponentTrail", 
            this.opponent.node, 
            this.scene, 
            this.trailParams.width, 
            this.trailParams.length, 
            true
          );

          // Apply the material again
          this.opponent.trail.material = this.opponent.trailMat;
          this.opponent.trail.visibility = 1;
          this.opponent.trailActive = true;
        }
      }

      // Check collisions with a 3-second grace period
      if (Date.now() - this.gameStartTime > 3000) {
        // Only check collisions when not jumping to allow jumping over trails
        if (!this.playerPhysics.jumping && this.playerPhysics.height <= 0) {
          this.checkCollisions();
        }
      }
    }

    // THIS IS THE MODIFIED SECTION FOR SINGLE PLAYER MODE
    // Handle opponent updates based on game mode
    if (this.singlePlayerMode) {
      // In single player mode, AI controls the opponent
      // AI updates already happen in updateAI() called at the top of update()

      // Check opponent boundary collisions for AI
      if (this.checkBoundaryCollision(this.opponent)) {
        // If AI hits the boundary, end game (player wins)
        if (!this.gameOver) {
          this.endGame('Opponent crashed into the boundary!', 'opponent-boundary-collision');
        }
      }

      // Check opponent collision with player's trail (for AI)
      if (!this.opponentPhysics.jumping && this.opponentPhysics.height <= 0) {
        const opPosition = this.opponent.node.position.clone();
        opPosition.y += 1; // Slightly above ground for ray casting

        // Check in multiple directions around opponent
        const checkDirections = [
          new BABYLON.Vector3(1, 0, 0),
          new BABYLON.Vector3(-1, 0, 0),
          new BABYLON.Vector3(0, 0, 1),
          new BABYLON.Vector3(0, 0, -1),
          new BABYLON.Vector3(0.7, 0, 0.7),
          new BABYLON.Vector3(-0.7, 0, 0.7),
          new BABYLON.Vector3(0.7, 0, -0.7),
          new BABYLON.Vector3(-0.7, 0, -0.7)
        ];

        const opCollisionPredicate = (mesh) => {
          return mesh !== this.opponent.node && 
                 mesh !== this.opponent.placeholder &&
                 mesh !== this.opponent.trail;
        };

        for (const dir of checkDirections) {
          const ray = new BABYLON.Ray(opPosition, dir, 3);
          const hit = this.scene.pickWithRay(ray, opCollisionPredicate);

          if (hit.hit && hit.pickedMesh === this.player.trail && !this.gameOver) {
            this.endGame('Opponent crashed into your trail!', 'opponent-trail-collision');
            return;
          }
        }
      }
    } else {
      // Multiplayer mode - use network updates
      const now = Date.now();
      if (now - this.lastSentTime > this.updateInterval) {
        this.sendData({
          type: 'position',
          x: this.player.node.position.x,
          z: this.player.node.position.z,
          angle: this.player.angle,
          speed: this.player.speed,
          height: this.playerPhysics.height,
          jumping: this.playerPhysics.jumping
        });
        this.lastSentTime = now;
      }

      // Inside your update method, after player updates but before scene.render()
      if (this.lastOpponentUpdate.position && this.nextOpponentUpdate.position) {
        const now = Date.now();
        const timeSinceLastUpdate = now - this.lastOpponentUpdate.timestamp;
        const updateDuration = this.nextOpponentUpdate.timestamp - this.lastOpponentUpdate.timestamp;

        // Calculate interpolation factor (0 to 1)
        let factor = Math.min(timeSinceLastUpdate / updateDuration, 1);

        // Use BABYLON's built-in Vector3.Lerp for position
        const interpolatedPosition = BABYLON.Vector3.Lerp(
          this.lastOpponentUpdate.position,
          this.nextOpponentUpdate.position,
          factor
        );

        // Use BABYLON's Scalar.Lerp for angle (careful with angle wrapping)
        let angleDiff = this.nextOpponentUpdate.angle - this.lastOpponentUpdate.angle;
        // Handle angle wrapping for shortest path rotation
        if (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
        if (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

        const interpolatedAngle = this.lastOpponentUpdate.angle + angleDiff * factor;

        // Apply interpolated values
        this.opponent.node.position.x = interpolatedPosition.x;
        this.opponent.node.position.z = interpolatedPosition.z;
        this.opponent.angle = interpolatedAngle;
        this.opponent.node.rotation.y = -interpolatedAngle + Math.PI / 2;

        // Calculate opponent roll angle based on turn direction
        if (this.opponent.modelNode) {
          // Calculate turn direction from angle change
          const turnDirection = angleDiff / dt;
          const opponentTargetRoll = Math.sign(turnDirection) * Math.min(Math.abs(turnDirection) / 5, 1) * this.ROLL_MAX;

          // Smoothly interpolate opponent roll
          this.opponentPhysics.rollAngle = BABYLON.Scalar.Lerp(
            this.opponentPhysics.rollAngle,
            opponentTargetRoll,
            dt * this.ROLL_SPEED
          );

          // Apply roll to opponent model
          this.opponent.modelNode.rotation.z = this.opponentPhysics.rollAngle;
        }

        // Handle opponent jumping interpolation
        if (this.nextOpponentUpdate.jumping && !this.opponentPhysics.jumping) {
          this.handleOpponentJump();
        }
      }
    }

    this.scene.render();
  }
  direction(angle) {
    return new BABYLON.Vector3(Math.cos(angle), 0, Math.sin(angle));
  }
  
  checkCollisions() {
    // Skip if we haven't established a start time yet
    if (!this.gameStartTime) {
      this.gameStartTime = Date.now();
      return;
    }

    // Skip during first 3 seconds
    if (Date.now() - this.gameStartTime < 3000) {
      return;
    }

    // Skip collision check if player is jumping
    if (this.playerPhysics.jumping || this.playerPhysics.height > 0) {
      return;
    }

    // Simple approach: Use ray casting to detect if player is near trail
    // Direction vectors to check around player
    const checkDirections = [
      new BABYLON.Vector3(1, 0, 0),
      new BABYLON.Vector3(-1, 0, 0),
      new BABYLON.Vector3(0, 0, 1),
      new BABYLON.Vector3(0, 0, -1),
      new BABYLON.Vector3(0.7, 0, 0.7),
      new BABYLON.Vector3(-0.7, 0, 0.7),
      new BABYLON.Vector3(0.7, 0, -0.7),
      new BABYLON.Vector3(-0.7, 0, -0.7)
    ];

    // Skip collision with own bike
    const playerCollisionPredicate = (mesh) => {
      return mesh !== this.player.node && 
             mesh !== this.player.placeholder &&
             mesh !== this.player.trail;
    };

    // Check for collisions in several directions around the player
    const origin = this.player.node.position.clone();
    origin.y += 1; // Slightly above ground

    for (const dir of checkDirections) {
      const ray = new BABYLON.Ray(origin, dir, 3); // 3 units distance check
      const hit = this.scene.pickWithRay(ray, playerCollisionPredicate);

      if (hit.hit && hit.pickedMesh === this.opponent.trail) {
        console.log("Collision detected with opponent trail!");
        this.endGame('You crashed into opponent\'s trail!', 'trail-collision');
        return;
      }
    }

    // Also check for boundary collisions (optional - you might want players to bounce)
    const pos = this.player.node.position;
    if (Math.abs(pos.x) > this.ARENA / 2 - 2 || Math.abs(pos.z) > this.ARENA / 2 - 2) {
      console.log("Boundary collision detected!");
      this.endGame('You crashed into the boundary!', 'boundary-collision');
      return;
    }
  }
  
  updateOpponentPosition(x, z, angle, speed, height = 0, jumping = false) {
    // Store the previous position as the last update
    this.lastOpponentUpdate = {
      position: this.nextOpponentUpdate.position ? this.nextOpponentUpdate.position.clone() : new BABYLON.Vector3(x, height, z),
      angle: this.nextOpponentUpdate.angle || angle,
      speed: this.nextOpponentUpdate.speed || speed,
      timestamp: this.nextOpponentUpdate.timestamp || Date.now(),
      height: this.nextOpponentUpdate.height || height,
      jumping: this.nextOpponentUpdate.jumping || jumping
    };

    // Set the next position target
    this.nextOpponentUpdate = {
      position: new BABYLON.Vector3(x, height, z),
      angle: angle,
      speed: speed,
      timestamp: Date.now(),
      height: height,
      jumping: jumping
    };
    
    // If opponent started jumping, handle it
    if (jumping && !this.opponentPhysics.jumping) {
      this.handleOpponentJump();
    }
  }
  
  // Handle different types of network messages
  handleNetworkMessage(data) {
    if (data.type === 'position') {
      this.updateOpponentPosition(
        data.x, 
        data.z,
        data.angle,
        data.speed,
        data.height || 0,
        data.jumping || false
      );
    } else if (data.type === 'jump') {
      console.log("Received jump event from opponent");
      this.handleOpponentJump();
    } else if (data.type === 'gameover') {
      console.log("Received game over from opponent, reason:", data.reason);

      // Different message based on why opponent crashed
      let message = 'Opponent crashed!';
      switch(data.reason) {
        case 'trail-collision':
          message = 'Opponent crashed into your trail!';
          break;
        case 'boundary-collision':
          message = 'Opponent crashed into the boundary!';
          break;
        case 'self-collision':
          message = 'Opponent crashed into their own trail!';
          break;
      }

      this.endGame(message, 'opponent-' + data.reason);
    }
  }
  
  endGame(message, reason = 'generic') {
    if (this.gameOver) return; // Prevent duplicate game over calls

    this.gameOver = true;
    console.log(`Game over: ${message}, reason: ${reason}`);

    // Show message on screen
    document.getElementById('game-message').textContent = message;
    document.getElementById('game-message').style.display = 'block';

    // Immediately stop updating positions
    this.engine.stopRenderLoop();

    // Send game over event to opponent with reason
    this.sendData({
      type: 'gameover',
      reason: reason,
      x: this.player.node.position.x,
      z: this.player.node.position.z
    });

    // Show the score popup instead of auto-reloading
    setTimeout(() => {
      // Trigger the score popup in the parent app
      if (this.singlePlayerMode && window.showSinglePlayerGameOverPopup) {
        window.showSinglePlayerGameOverPopup(reason);
      } else if (window.showGameOverPopup) {
        window.showGameOverPopup(reason);
      }
    }, 1500); // Short delay to let the message be seen
  }
}