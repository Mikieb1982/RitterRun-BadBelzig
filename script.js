// --- Strict mode and IIFE (optional but good practice) ---
(function() {
    'use strict';

    // --- Canvas and Context ---
    const canvas = document.getElementById('gameCanvas');
    if (!canvas) {
        console.error("Fatal Error: Canvas element not found!");
        alert("Fatal Error: Canvas element not found! Check index.html."); // Alert user
        return;
    }
    // Basic check for getContext
    if (!canvas.getContext) {
        console.error("Fatal Error: Canvas context not supported!");
        alert("Fatal Error: Canvas context not supported! Try a different browser."); // Alert user
        return;
    }
    const ctx = canvas.getContext('2d');
    const canvasWidth = canvas.width;
    const canvasHeight = canvas.height;

    // --- DOM Element References ---
    // Add checks to ensure elements exist right away
    const startScreen = document.getElementById('startScreen');
    const gameOverScreen = document.getElementById('gameOverScreen');
    const startButton = document.getElementById('startButton');
    const restartButton = document.getElementById('restartButton');
    const scoreDisplay = document.getElementById('scoreDisplay');
    const currentScoreSpan = document.getElementById('currentScore');
    const finalScoreSpan = document.getElementById('finalScore');
    const startHighScoreSpan = document.getElementById('startHighScore');
    const gameOverHighScoreSpan = document.getElementById('gameOverHighScore');

    if (!startScreen || !gameOverScreen || !startButton || !restartButton || !scoreDisplay ||
        !currentScoreSpan || !finalScoreSpan || !startHighScoreSpan || !gameOverHighScoreSpan) {
        console.error("Fatal Error: One or more required UI elements not found in index.html!");
        alert("Fatal Error: UI elements missing! Check index.html."); // Alert user
        return; // Stop script execution if critical UI is missing
    }


    // --- Audio References ---
    // These might be null if the <audio> tags are missing, handle gracefully later
    const jumpSound = document.getElementById('jumpSound');
    const collisionSound = document.getElementById('collisionSound');
    const gameOverSound = document.getElementById('gameOverSound');
    // const bgMusic = document.getElementById('bgMusic');

    // --- Game States ---
    const GameState = {
        MENU: 'MENU',
        PLAYING: 'PLAYING',
        GAME_OVER: 'GAME_OVER'
    };
    let currentGameState = GameState.MENU; // Start at menu

    // --- Game Variables ---
    let score = 0;
    let highScore = 0;
    let player = {
        x: 60,
        y: canvasHeight - 60, // Initial position (adjust)
        // !!! IMPORTANT: ADJUST THESE TO MATCH YOUR knight_placeholder.png ACTUAL SIZE !!!
        width: 40,
        height: 40,
        // !!! ----------------------------------------------------------------------- !!!
        dx: 0, // Horizontal velocity (if needed)
        dy: 0, // Vertical velocity
        gravity: 0.65, // Gravity strength (adjust feel)
        jumpPower: -13, // Jump impulse strength (adjust feel)
        grounded: true
    };
    let obstacles = [];
    let frameCount = 0; // For timing events
    let gameSpeed = 5.5; // Initial scrolling speed
    let initialGameSpeed = 5.5; // Store initial speed for reset
    let speedIncreaseInterval = 400; // Score interval to increase speed
    let nextSpeedIncreaseScore = speedIncreaseInterval;
    let groundHeight = 25; // Visual 'floor' height if background is seamless

    // --- Graphics Assets ---
    // Use objects to manage loading state
    const assets = {
        // Ensure these paths and filenames EXACTLY match your files in the 'assets' folder
        knight: { img: new Image(), loaded: false, src: 'assets/knight_placeholder.png' },
        stone: { img: new Image(), loaded: false, src: 'assets/stone.png' },
        sign: { img: new Image(), loaded: false, src: 'assets/sign.png' },
        tractor: { img: new Image(), loaded: false, src: 'assets/tractor.png' },
        background: { img: new Image(), loaded: false, src: 'assets/background.png' }
    };
    let assetsLoadedCount = 0;
    let totalAssets = Object.keys(assets).length;
    let allAssetsLoaded = false;
    let gameInitialized = false; // Flag to prevent multiple initializations

    let bgX = 0; // Background position for scrolling

    // !!! IMPORTANT: ADJUST THESE DIMENSIONS TO MATCH YOUR ACTUAL OBSTACLE IMAGE SIZES !!!
    const obstacleTypes = [
        { assetKey: 'stone', width: 35, height: 35 },
        { assetKey: 'sign', width: 45, height: 55 },
        { assetKey: 'tractor', width: 70, height: 45 }
    ];
    // !!! --------------------------------------------------------------------------- !!!


    // --- Asset Loading ---
    function assetLoaded(assetKey) {
        // console.log(`Asset loaded successfully: ${assets[assetKey].src}`);
        assets[assetKey].loaded = true;
        assetsLoadedCount++;
        // console.log(`Progress: ${assetsLoadedCount}/${totalAssets} assets loaded.`);
        if (assetsLoadedCount === totalAssets && !gameInitialized) {
            // console.log("All assets reported loaded. Calling init().");
            allAssetsLoaded = true;
            init(); // Start the game setup now that assets are ready
        }
    }

    function assetLoadError(assetKey) {
         console.error(`Failed to load asset: ${assets[assetKey].src}. Check path and file existence.`);
         // Optionally, provide feedback to the user
         // For now, the game won't initialize because assetsLoadedCount won't reach totalAssets
         alert(`Error loading image: ${assets[assetKey].src}\nGame cannot start. Please check the file exists in the repository.`);
    }


    function loadAssets() {
        console.log("Starting asset loading...");
        let imagesExist = true; // Assume they exist initially

        // Pre-check if asset keys are valid before assigning callbacks
        for (const key in assets) {
            if (!assets.hasOwnProperty(key) || typeof assets[key] !== 'object' || !assets[key].img) {
                console.error(`Invalid asset definition for key: ${key}`);
                imagesExist = false; // Mark as problematic
                continue; // Skip this invalid entry
            }
             // Assign callbacks only if the asset structure seems okay
            assets[key].img.onload = () => assetLoaded(key);
            assets[key].img.onerror = () => assetLoadError(key);
        }

         if (!imagesExist) {
            console.error("Asset definition errors found. Halting loading.");
            return; // Don't proceed if definitions are wrong
        }

        // Now actually set the src to trigger loading
        for (const key in assets) {
             if (assets.hasOwnProperty(key) && assets[key].img) { // Check again before setting src
                 console.log(`Requesting load for: ${assets[key].src}`);
                 assets[key].img.src = assets[key].src;
             }
        }
    }

    // --- High Score Handling ---
    function loadHighScore() {
        try {
            const savedScore = localStorage.getItem('ritterRunHighScore');
            highScore = savedScore ? parseInt(savedScore, 10) : 0;
            if (isNaN(highScore)) highScore = 0; // Handle case where saved value isn't a number
            startHighScoreSpan.textContent = highScore;
            gameOverHighScoreSpan.textContent = highScore;
        } catch (e) {
            console.error("Could not access localStorage for high score:", e);
            highScore = 0; // Default to 0 if localStorage fails
        }
    }

    function saveHighScore() {
        if (score > highScore) {
            highScore = score;
            try {
                localStorage.setItem('ritterRunHighScore', highScore.toString());
                gameOverHighScoreSpan.textContent = highScore; // Update display
            } catch (e) {
                 console.error("Could not save high score to localStorage:", e);
            }
        }
    }

    // --- Sound Playing Helper ---
    function playSound(soundElement) {
        // Check if the sound element exists in the DOM first
        if (!soundElement || typeof soundElement.play !== 'function') {
            // console.log("Sound element missing or invalid, cannot play sound.");
            return;
        }
        soundElement.currentTime = 0; // Rewind to start
        const playPromise = soundElement.play();

        if (playPromise !== undefined) {
            playPromise.then(_ => {
                // Automatic playback started!
            }).catch(error => {
                // Auto-play was prevented
                // Show a message asking the user to click?
                // console.log("Sound playback prevented:", error);
            });
        }
    }

    // --- Reset Game Variables ---
    function resetGame() {
        // console.log("resetGame called");
        score = 0;
        obstacles = [];
        frameCount = 0;
        gameSpeed = initialGameSpeed; // Reset speed
        nextSpeedIncreaseScore = speedIncreaseInterval;
        bgX = 0;

        // Reset player position and state
        player.y = canvasHeight - player.height - groundHeight;
        player.dy = 0;
        player.grounded = true;

        // Update score display
        if (currentScoreSpan) currentScoreSpan.textContent = score;
    }

    // --- Update Functions ---
    function updatePlayer() {
        // Apply gravity
        if (!player.grounded) {
            player.dy += player.gravity;
            player.y += player.dy;
        }

        // Ground check - prevent falling through floor
        if (player.y >= canvasHeight - player.height - groundHeight) {
            player.y = canvasHeight - player.height - groundHeight;
            player.dy = 0;
            if (!player.grounded) {
                // console.log("Player landed"); // Debug landing
                player.grounded = true;
            }
        }
    }

    function updateObstacles() {
        frameCount++;
        // Generate new obstacle periodically (adjust frequency based on gameSpeed)
        const baseFrequency = 120;
        const speedFactor = Math.max(1, gameSpeed * 3);
        const spawnFrequency = Math.max(45, baseFrequency - speedFactor); // Min frequency of 45 frames

        if (frameCount % Math.floor(spawnFrequency) === 0) {
            const typeIndex = Math.floor(Math.random() * obstacleTypes.length);
            const type = obstacleTypes[typeIndex];

            // Ensure the asset for this type is loaded before trying to use its image
            if (assets[type.assetKey] && assets[type.assetKey].loaded) {
                obstacles.push({
                    x: canvasWidth,
                    y: canvasHeight - type.height - groundHeight, // Position on ground
                    width: type.width,
                    height: type.height,
                    assetKey: type.assetKey // Store key to access image later
                });
                 // console.log(`Spawned obstacle: ${type.assetKey}`);
            } else {
                // console.warn(`Asset ${type.assetKey} not loaded, skipping obstacle spawn.`);
            }
        }

        // Move obstacles left and remove off-screen ones
        for (let i = obstacles.length - 1; i >= 0; i--) {
            obstacles[i].x -= gameSpeed;
            if (obstacles[i].x + obstacles[i].width < 0) {
                obstacles.splice(i, 1);
            }
        }
    }

    function checkCollisions() {
        const playerRect = { x: player.x, y: player.y, width: player.width, height: player.height };

        for (const obstacle of obstacles) {
            const obstacleRect = { x: obstacle.x, y: obstacle.y, width: obstacle.width, height: obstacle.height };

            // Simple AABB collision detection
            if (playerRect.x < obstacleRect.x + obstacleRect.width &&
                playerRect.x + playerRect.width > obstacleRect.x &&
                playerRect.y < obstacleRect.y + obstacleRect.height &&
                playerRect.y + playerRect.height > obstacleRect.y)
            {
                 // console.log("Collision detected!");
                 // console.log("Player:", playerRect);
                 // console.log("Obstacle:", obstacleRect);
                return true; // Collision detected
            }
        }
        return false; // No collision
    }

    function updateScoreAndSpeed() {
        score++; // Simple time-based score
        if (currentScoreSpan) currentScoreSpan.textContent = score;

        // Increase game speed based on score
        if (score > 0 && score % speedIncreaseInterval === 0 && score >= nextSpeedIncreaseScore) {
             gameSpeed += 0.3; // Slower speed increase
             nextSpeedIncreaseScore += speedIncreaseInterval; // Set the next milestone
             // console.log(`Score milestone ${score} reached. Speed increased to: ${gameSpeed.toFixed(2)}`);
        }
    }

    // --- Draw Functions ---
    function drawBackground() {
        if (!assets.background.loaded) {
             // Draw a fallback background if image fails
             ctx.fillStyle = '#87CEEB'; // Sky blue
             ctx.fillRect(0, 0, canvasWidth, canvasHeight);
             ctx.fillStyle = '#228B22'; // Forest green ground
             ctx.fillRect(0, canvasHeight - groundHeight, canvasWidth, groundHeight);
             return;
        }

        // Calculate scrolling speed (adjust multiplier for parallax effect if desired)
        const scrollSpeed = gameSpeed * 0.8; // Example: Background scrolls slightly slower
        bgX -= scrollSpeed;

        // Reset background position for seamless looping
        // Use modulo for cleaner looping calculation
        bgX = bgX % canvasWidth;
        // If bgX became positive due to modulo, adjust (though unlikely with subtraction)
        if (bgX > 0) bgX -= canvasWidth;


        // Draw the background image twice for looping
        ctx.drawImage(assets.background.img, bgX, 0, canvasWidth, canvasHeight);
        // The second image starts exactly where the first one ends
        ctx.drawImage(assets.background.img, bgX + canvasWidth, 0, canvasWidth, canvasHeight);

        // Optional: Draw ground line on top of background if needed for clarity
        // ctx.fillStyle = 'rgba(0, 80, 0, 0.6)'; // Darker, semi-transparent green
        // ctx.fillRect(0, canvasHeight - groundHeight, canvasWidth, groundHeight);
    }

    function drawPlayer() {
        if (!assets.knight.loaded) {
            // Draw fallback rectangle if knight image fails
            ctx.fillStyle = 'grey';
            ctx.fillRect(player.x, player.y, player.width, player.height);
            return;
        }
        ctx.drawImage(assets.knight.img, player.x, player.y, player.width, player.height);
        // Add animation logic here later if you get a spritesheet
    }

    function drawObstacles() {
        for (const obstacle of obstacles) {
            // Ensure the asset is loaded before drawing
            if (assets[obstacle.assetKey] && assets[obstacle.assetKey].loaded) {
                ctx.drawImage(assets[obstacle.assetKey].img, obstacle.x, obstacle.y, obstacle.width, obstacle.height);
            } else {
                // Draw fallback rectangle if obstacle image fails
                ctx.fillStyle = 'red';
                ctx.fillRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height);
            }
        }
    }

    // --- Game Loop ---
    let lastTime = 0;
    function gameLoop(timestamp) {
        // Calculate delta time (optional, but good for physics consistency if needed later)
        const deltaTime = timestamp - lastTime;
        lastTime = timestamp;

        // Request the next frame *early* - ensures loop continues even if errors occur below
        requestAnimationFrame(gameLoop);

        // Always clear canvas
        ctx.clearRect(0, 0, canvasWidth, canvasHeight);

        // Always draw background
        drawBackground();

        // --- Game Logic based on State ---
        if (currentGameState === GameState.PLAYING) {
            // --- Update ---
            updatePlayer();
            updateObstacles();
            updateScoreAndSpeed();

            // --- Draw ---
            // Background already drawn
            drawPlayer();
            drawObstacles();

            // --- Check for Game Over ---
            if (checkCollisions()) {
                // console.log("Game Over triggered by collision.");
                // --- SOUND ---
                playSound(collisionSound);
                playSound(gameOverSound);
                // playSound(bgMusic, 'stop');
                // ---
                currentGameState = GameState.GAME_OVER;
                saveHighScore(); // Save score check
                finalScoreSpan.textContent = score; // Update score display
                gameOverHighScoreSpan.textContent = highScore; // Ensure high score shown
                gameOverScreen.classList.remove('hidden'); // Show game over screen
                scoreDisplay.classList.add('hidden'); // Hide in-game score
            }
        } else if (currentGameState === GameState.MENU) {
            // Draw player standing idle on menu screen
            drawPlayer();
        } else if (currentGameState === GameState.GAME_OVER) {
             // Draw player (maybe in a 'defeated' pose later)
             drawPlayer();
             // Also draw the obstacles as they were at the moment of game over
             drawObstacles();
        }
    }

    // --- Game State Changers / Event Handlers ---
    function startGame() {
        if (currentGameState === GameState.PLAYING || !allAssetsLoaded) return; // Prevent starting if playing or assets not ready
        console.log("Attempting to start game...");
        resetGame(); // Reset variables
        currentGameState = GameState.PLAYING;
        startScreen.classList.add('hidden');
        gameOverScreen.classList.add('hidden');
        scoreDisplay.classList.remove('hidden');
        // --- SOUND ---
        // playSound(bgMusic, 'play');
        // ---
        console.log("Game state set to PLAYING.");
    }

    function restartGame() {
         if (currentGameState === GameState.PLAYING || !allAssetsLoaded) return; // Prevent restarting if playing or assets not ready
         console.log("Attempting to restart game...");
         resetGame();
         currentGameState = GameState.PLAYING;
         gameOverScreen.classList.add('hidden');
         startScreen.classList.add('hidden'); // Ensure start screen is hidden too
         scoreDisplay.classList.remove('hidden');
         // --- SOUND ---
        // playSound(bgMusic, 'play');
        // ---
         console.log("Game state set to PLAYING after restart.");
    }

    function handleJumpInput() {
        // console.log("handleJumpInput called. Grounded:", player.grounded);
        if (currentGameState === GameState.PLAYING && player.grounded) {
            player.dy = player.jumpPower;
            player.grounded = false;
            // console.log("Player Jumped!");
            // --- SOUND ---
            playSound(jumpSound);
            // ---
        }
    }

    // --- Initial Setup Function (Called *after* assets load) ---
    function init() {
        console.log("init() function called.");
        if (gameInitialized) {
            console.warn("init() called more than once. Skipping.");
            return; // Prevent re-initialization
        }
        gameInitialized = true; // Set flag

        // Final check for UI elements just in case something went wrong before asset loading
         if (!startScreen || !gameOverScreen || !startButton || !restartButton || !scoreDisplay) {
             console.error("UI elements missing during init! Cannot attach listeners.");
             return;
         }

        loadHighScore();

        // Set initial visual state (Menu)
        startScreen.classList.remove('hidden');
        gameOverScreen.classList.add('hidden');
        scoreDisplay.classList.add('hidden');
        // Ensure player starts visually on the ground in the menu
        player.y = canvasHeight - player.height - groundHeight;

        // --- Attach Event Listeners ---
        console.log("Attaching event listeners...");

        // Remove any potential old listeners before adding new ones (safer)
        startButton.removeEventListener('click', startGame);
        restartButton.removeEventListener('click', restartGame);
        document.removeEventListener('keydown', handleKeyDown); // Use named handler
        canvas.removeEventListener('touchstart', handleTouchStart); // Use named handler
        startButton.removeEventListener('touchstart', handleButtonTouchStart); // Use named handler
        restartButton.removeEventListener('touchstart', handleButtonTouchStart); // Use named handler


        // Add listeners using named handlers
        startButton.addEventListener('click', startGame);
        restartButton.addEventListener('click', restartGame);
        document.addEventListener('keydown', handleKeyDown);
        canvas.addEventListener('touchstart', handleTouchStart, { passive: false }); // Use passive: false if preventDefault is needed
        startButton.addEventListener('touchstart', handleButtonTouchStart, { passive: false });
        restartButton.addEventListener('touchstart', handleButtonTouchStart, { passive: false });


        console.log("Event listeners attached.");

        // Start the game loop *after* listeners are attached
        console.log("Requesting first game loop frame.");
        requestAnimationFrame(gameLoop);
    }

    // --- Named Event Handlers ---
    function handleKeyDown(e) {
        // console.log(`Key Down: ${e.code}`); // Debug key presses
        if (e.code === 'Space' || e.key === ' ' || e.keyCode === 32) { // Check spacebar press robustly
            e.preventDefault(); // Prevent spacebar from scrolling the page
            if (!allAssetsLoaded) { // Don't allow actions if assets haven't loaded
                console.log("Assets not loaded yet, ignoring spacebar.");
                return;
            }
            if (currentGameState === GameState.PLAYING) {
                handleJumpInput();
            } else if (currentGameState === GameState.MENU) {
                startGame();
            } else if (currentGameState === GameState.GAME_OVER) {
                restartGame();
            }
        }
    }

    function handleTouchStart(e) {
        // console.log("Canvas Touch Start");
        e.preventDefault(); // Prevent default touch behavior (scrolling, zooming)
        if (!allAssetsLoaded) return; // Ignore touch if assets not loaded

         if (currentGameState === GameState.PLAYING) {
            handleJumpInput();
        } else if (currentGameState === GameState.MENU) {
            startGame();
        } else if (currentGameState === GameState.GAME_OVER) {
            restartGame();
        }
    }

    // Separate handler for buttons to avoid conflicts if needed
    function handleButtonTouchStart(e) {
        // console.log(`Button Touch Start: ${e.target.id}`);
        e.preventDefault(); // Prevent click event firing after touch end sometimes
        if (!allAssetsLoaded) return;

        if (e.target.id === 'startButton' && currentGameState === GameState.MENU) {
            startGame();
        } else if (e.target.id === 'restartButton' && currentGameState === GameState.GAME_OVER) {
            restartGame();
        }
    }


    // --- Start Loading Assets ---
    // Add a listener to ensure the DOM is ready before trying to load assets/find elements
    document.addEventListener('DOMContentLoaded', () => {
         console.log("DOM Content Loaded. Starting asset load.");
         loadAssets();
    });

})(); // End of IIFE
