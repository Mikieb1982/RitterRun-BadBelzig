// --- Strict mode and IIFE (optional but good practice) ---
(function() {
    'use strict';

    // --- Canvas and Context ---
    const canvas = document.getElementById('gameCanvas');
    if (!canvas) {
        console.error("Fatal Error: Canvas element not found!");
        return;
    }
    const ctx = canvas.getContext('2d');
    const canvasWidth = canvas.width;
    const canvasHeight = canvas.height;

    // --- DOM Element References ---
    const startScreen = document.getElementById('startScreen');
    const gameOverScreen = document.getElementById('gameOverScreen');
    const startButton = document.getElementById('startButton');
    const restartButton = document.getElementById('restartButton');
    const scoreDisplay = document.getElementById('scoreDisplay');
    const currentScoreSpan = document.getElementById('currentScore');
    const finalScoreSpan = document.getElementById('finalScore');
    const startHighScoreSpan = document.getElementById('startHighScore');
    const gameOverHighScoreSpan = document.getElementById('gameOverHighScore');

    // --- Audio References ---
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
        width: 40,  // !!! ADJUST TO knight_placeholder.png WIDTH !!!
        height: 40, // !!! ADJUST TO knight_placeholder.png HEIGHT !!!
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
        knight: { img: new Image(), loaded: false, src: 'assets/knight_placeholder.png' },
        stone: { img: new Image(), loaded: false, src: 'assets/stone.png' },
        sign: { img: new Image(), loaded: false, src: 'assets/sign.png' },
        tractor: { img: new Image(), loaded: false, src: 'assets/tractor.png' },
        background: { img: new Image(), loaded: false, src: 'assets/background.png' }
    };
    let assetsLoadedCount = 0;
    let totalAssets = Object.keys(assets).length;
    let allAssetsLoaded = false;

    let bgX = 0; // Background position for scrolling

    // !!! ADJUST OBSTACLE DIMENSIONS TO MATCH YOUR IMAGES !!!
    const obstacleTypes = [
        { assetKey: 'stone', width: 35, height: 35 },
        { assetKey: 'sign', width: 45, height: 55 },
        { assetKey: 'tractor', width: 70, height: 45 }
    ];

    // --- Asset Loading ---
    function assetLoaded(assetKey) {
        assets[assetKey].loaded = true;
        assetsLoadedCount++;
        // console.log(`Asset loaded: ${assetKey} (${assetsLoadedCount}/${totalAssets})`);
        if (assetsLoadedCount === totalAssets) {
            allAssetsLoaded = true;
            // console.log("All assets loaded.");
            init(); // Start the game setup now that assets are ready
        }
    }

    function loadAssets() {
        // console.log("Loading assets...");
        for (const key in assets) {
            assets[key].img.onload = () => assetLoaded(key);
            assets[key].img.onerror = () => console.error(`Failed to load asset: ${assets[key].src}`);
            assets[key].img.src = assets[key].src;
        }
    }

    // --- High Score Handling ---
    function loadHighScore() {
        const savedScore = localStorage.getItem('ritterRunHighScore');
        highScore = savedScore ? parseInt(savedScore, 10) : 0;
        startHighScoreSpan.textContent = highScore;
        gameOverHighScoreSpan.textContent = highScore;
    }

    function saveHighScore() {
        if (score > highScore) {
            highScore = score;
            localStorage.setItem('ritterRunHighScore', highScore.toString());
            // Update display immediately on game over screen
            gameOverHighScoreSpan.textContent = highScore;
        }
    }

    // --- Sound Playing Helper ---
    function playSound(soundElement) {
        if (!soundElement) return;
        soundElement.currentTime = 0; // Rewind to start
        soundElement.play().catch(error => {
            // Autoplay might be blocked initially, user interaction usually enables it.
            // console.log("Sound play failed (interaction might be needed):", error);
        });
    }

    // --- Reset Game Variables ---
    function resetGame() {
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
        currentScoreSpan.textContent = score;
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
            player.grounded = true;
        }
    }

    function updateObstacles() {
        frameCount++;
        // Generate new obstacle periodically (adjust frequency based on gameSpeed)
        // Make frequency calculation slightly less aggressive
        const baseFrequency = 120;
        const speedFactor = Math.max(1, gameSpeed * 3); // Ensure frequency doesn't get too low
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
            } else {
                console.warn(`Asset ${type.assetKey} not loaded, skipping obstacle.`);
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
        for (const obstacle of obstacles) {
            // Simple AABB collision detection
            if (player.x < obstacle.x + obstacle.width &&
                player.x + player.width > obstacle.x &&
                player.y < obstacle.y + obstacle.height &&
                player.y + player.height > obstacle.y)
            {
                return true; // Collision detected
            }
        }
        return false; // No collision
    }

    function updateScoreAndSpeed() {
        score++; // Simple time-based score
        currentScoreSpan.textContent = score;

        // Increase game speed based on score
        if (score >= nextSpeedIncreaseScore) {
            gameSpeed += 0.3; // Slower speed increase
            nextSpeedIncreaseScore += speedIncreaseInterval;
            // console.log("Speed increased to:", gameSpeed.toFixed(2));
        }
    }

    // --- Draw Functions ---
    function drawBackground() {
        if (!assets.background.loaded) return; // Don't draw if not loaded

        bgX -= gameSpeed * 0.8; // Slightly slower scroll for effect if desired, or just gameSpeed

        // Reset background position for seamless looping
        if (bgX <= -canvasWidth) {
            bgX += canvasWidth; // Use += canvasWidth to avoid potential jitter if bgX goes far below -canvasWidth
        }

        // Draw the background image twice for looping
        ctx.drawImage(assets.background.img, bgX, 0, canvasWidth, canvasHeight);
        ctx.drawImage(assets.background.img, bgX + canvasWidth, 0, canvasWidth, canvasHeight);

        // Optional: Draw a ground line for debugging or if background lacks one
        // ctx.fillStyle = 'rgba(0, 100, 0, 0.5)'; // Semi-transparent green
        // ctx.fillRect(0, canvasHeight - groundHeight, canvasWidth, groundHeight);
    }

    function drawPlayer() {
        if (!assets.knight.loaded) return; // Don't draw if not loaded
        ctx.drawImage(assets.knight.img, player.x, player.y, player.width, player.height);
        // Add animation logic here later if you get a spritesheet
    }

    function drawObstacles() {
        for (const obstacle of obstacles) {
            // Ensure the asset is loaded before drawing
            if (assets[obstacle.assetKey] && assets[obstacle.assetKey].loaded) {
                ctx.drawImage(assets[obstacle.assetKey].img, obstacle.x, obstacle.y, obstacle.width, obstacle.height);
            }
        }
    }

    // --- Game Loop ---
    let lastTime = 0;
    function gameLoop(timestamp) {
        const deltaTime = timestamp - lastTime; // Time since last frame (ms)
        lastTime = timestamp;

        // Always clear canvas
        ctx.clearRect(0, 0, canvasWidth, canvasHeight);

        // Always draw background
        drawBackground();

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
                // --- SOUND ---
                playSound(collisionSound);
                playSound(gameOverSound);
                // playSound(bgMusic, 'stop'); // Assuming helper handles stopping music
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
             // Maybe draw player in a 'defeated' pose if you add one
             drawPlayer(); // Or just draw normally
             drawObstacles(); // Show the obstacle they hit
        }

        // Request the next frame
        requestAnimationFrame(gameLoop);
    }

    // --- Game State Changers / Event Handlers ---
    function startGame() {
        if (currentGameState === GameState.PLAYING) return; // Prevent starting if already playing
        // console.log("Starting game...");
        resetGame(); // Reset variables
        currentGameState = GameState.PLAYING;
        startScreen.classList.add('hidden');
        gameOverScreen.classList.add('hidden');
        scoreDisplay.classList.remove('hidden');
        // --- SOUND ---
        // playSound(bgMusic, 'play');
        // ---
    }

    function restartGame() {
         if (currentGameState === GameState.PLAYING) return;
         // console.log("Restarting game...");
         resetGame();
         currentGameState = GameState.PLAYING;
         gameOverScreen.classList.add('hidden');
         startScreen.classList.add('hidden'); // Ensure start screen is hidden too
         scoreDisplay.classList.remove('hidden');
         // --- SOUND ---
        // playSound(bgMusic, 'play');
        // ---
    }

    function handleJumpInput() {
        if (currentGameState === GameState.PLAYING && player.grounded) {
            player.dy = player.jumpPower;
            player.grounded = false;
            // --- SOUND ---
            playSound(jumpSound);
            // ---
        }
    }

    // --- Initial Setup Function (Called after assets load) ---
    function init() {
        // console.log("Initializing game...");
        // Ensure DOM elements are found
        if (!startScreen || !gameOverScreen || !startButton || !restartButton || !scoreDisplay) {
             console.error("Fatal Error: One or more UI elements not found!");
             // Display error to user?
             const errorDiv = document.createElement('div');
             errorDiv.textContent = "Error loading UI elements. Please refresh.";
             errorDiv.style.color = 'red';
             errorDiv.style.position = 'absolute';
             errorDiv.style.top = '50%';
             errorDiv.style.left = '50%';
             errorDiv.style.transform = 'translate(-50%, -50%)';
             errorDiv.style.zIndex = '100';
             document.body.appendChild(errorDiv);
             return; // Stop execution
        }

        loadHighScore();

        // Set initial visual state (Menu)
        startScreen.classList.remove('hidden');
        gameOverScreen.classList.add('hidden');
        scoreDisplay.classList.add('hidden');
        player.y = canvasHeight - player.height - groundHeight; // Place player correctly for menu

        // --- Attach Event Listeners ---
        // Use named functions for clarity and potential removal later if needed
        startButton.addEventListener('click', startGame);
        restartButton.addEventListener('click', restartGame);

        // Keyboard input
        document.addEventListener('keydown', (e) => {
            if (e.code === 'Space' || e.key === ' ' || e.keyCode === 32) { // Check spacebar press
                e.preventDefault(); // Prevent spacebar from scrolling the page
                if (currentGameState === GameState.PLAYING) {
                    handleJumpInput();
                } else if (currentGameState === GameState.MENU) {
                    startGame();
                } else if (currentGameState === GameState.GAME_OVER) {
                    restartGame();
                }
            }
        });

         // Touch input (simple tap to jump/start/restart)
        canvas.addEventListener('touchstart', (e) => {
            e.preventDefault(); // Prevent default touch behavior (scrolling, zooming)
             if (currentGameState === GameState.PLAYING) {
                handleJumpInput();
            } else if (currentGameState === GameState.MENU) {
                startGame();
            } else if (currentGameState === GameState.GAME_OVER) {
                restartGame();
            }
        });
        // Add touch listeners to buttons as well for better mobile UX
         startButton.addEventListener('touchstart', (e) => { e.preventDefault(); startGame(); });
         restartButton.addEventListener('touchstart', (e) => { e.preventDefault(); restartGame(); });


        // console.log("Event listeners attached.");

        // Start the game loop
        // console.log("Requesting first game loop frame.");
        requestAnimationFrame(gameLoop);
    }

    // --- Start Loading Assets ---
    // The init() function will be called automatically when all assets are loaded via assetLoaded()
    loadAssets();

})(); // End of IIFE
