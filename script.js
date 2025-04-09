// --- Strict mode and IIFE ---
(function() {
    'use strict';

    // --- Canvas and Context ---
    const canvas = document.getElementById('gameCanvas');
    if (!canvas || !canvas.getContext) {
        console.error("Fatal Error: Canvas not found or not supported!");
        alert("Fatal Error: Canvas not found or not supported! Try a different browser.");
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
    // *** NEW: POI Overlay Elements ***
    const poiOverlay = document.getElementById('poiInfoOverlay');
    const poiNameEl = document.getElementById('poiName');
    const poiInfoTextEl = document.getElementById('poiInfoText');
    // *** --------------- ***

    // Check essential UI elements
    if (!startScreen || !gameOverScreen || !startButton || !restartButton || !scoreDisplay ||
        !currentScoreSpan || !finalScoreSpan || !startHighScoreSpan || !gameOverHighScoreSpan ||
        !poiOverlay || !poiNameEl || !poiInfoTextEl) { // Added POI elements check
        console.error("Fatal Error: One or more required UI elements not found in index.html!");
        alert("Fatal Error: UI elements missing! Check index.html.");
        return;
    }

    // --- Audio References ---
    const jumpSound = document.getElementById('jumpSound');
    const collisionSound = document.getElementById('collisionSound');
    const gameOverSound = document.getElementById('gameOverSound');

    // --- Game States ---
    const GameState = {
        MENU: 'MENU',
        PLAYING: 'PLAYING',
        GAME_OVER: 'GAME_OVER'
    };
    let currentGameState = GameState.MENU;

    // --- Game Variables ---
    let score = 0;
    let highScore = 0;
    let player = {
        x: 60, y: canvasHeight - 60,
        // !!! ADJUST THESE TO MATCH YOUR KNIGHT IMAGE SIZE !!!
        width: 40, height: 40,
        // -------------------------------------------------
        dx: 0, dy: 0, gravity: 0.65, jumpPower: -13, grounded: true
    };
    let obstacles = []; // Will now contain both obstacles and POI signs
    let frameCount = 0;
    let gameSpeed = 5.5;
    let initialGameSpeed = 5.5;
    let speedIncreaseInterval = 400;
    let nextSpeedIncreaseScore = speedIncreaseInterval;
    let groundHeight = 25;

    // --- Graphics Assets ---
    const assets = {
        knight: { img: new Image(), loaded: false, src: 'assets/knight_placeholder.png' },
        stone: { img: new Image(), loaded: false, src: 'assets/stone.png' },
        sign: { img: new Image(), loaded: false, src: 'assets/sign.png' }, // Used for POIs
        tractor: { img: new Image(), loaded: false, src: 'assets/tractor.png' },
        background: { img: new Image(), loaded: false, src: 'assets/background.png' }
    };
    let assetsLoadedCount = 0;
    let totalAssets = Object.keys(assets).length;
    let allAssetsLoaded = false;
    let gameInitialized = false;

    let bgX = 0;

    // !!! IMPORTANT: ADJUST OBSTACLE DIMENSIONS !!!
    // Define types for *game-ending* obstacles only now
    const regularObstacleTypes = [
        { assetKey: 'stone', width: 35, height: 35 },
        { assetKey: 'tractor', width: 70, height: 45 }
    ];
    // Define dimensions for the POI sign separately
    const poiSignDimensions = { width: 45, height: 55 }; // !!! ADJUST TO YOUR sign.png SIZE !!!
    // ---------------------------------------------


    // --- *** NEW: POI Data and Handling *** ---
    // !!! IMPORTANT: REPLACE WITH YOUR ACTUAL BAD BELZIG POI INFO !!!
    const poiData = [
        { id: 1, name: "Burg Eisenhardt", info: "A well-preserved medieval castle overlooking Bad Belzig. Features a museum and tower access with great views." },
        { id: 2, name: "SteinTherme", info: "Modern thermal baths known for unique brine pools ('Liquid Sound Temple') and sauna world." },
        { id: 3, name: "Historic Town Center", info: "Walk through the Altstadt, see the Marienkirche, Rathaus (Town Hall), and half-timbered houses." },
        { id: 4, name: "Hagelberg Memorial", info: "Commemorates the Battle of Hagelberg (1813) against Napoleon's forces. Located south of the town." },
        { id: 5, name: "Roger Loewig Museum", info: "Museum dedicated to the artist Roger Loewig, housed in his former residence." },
        { id: 6, name: "Fläming Nature Park Center", info: "Located in nearby Raben, provides info about the Hoher Fläming region, hiking, and nature." },
        // Add more POIs if you like
    ];
    let nextPoiIndex = 0; // To cycle through POIs
    let poiTimeoutId = null; // To store the timeout ID for hiding the overlay
    const poiDisplayDuration = 6000; // Show POI info for 6 seconds (6000ms)
    // --- *** -------------------------- *** ---


    // --- Asset Loading ---
    function assetLoaded(assetKey) {
        assets[assetKey].loaded = true;
        assetsLoadedCount++;
        if (assetsLoadedCount === totalAssets && !gameInitialized) {
            allAssetsLoaded = true;
            init();
        }
    }
    function assetLoadError(assetKey) {
        console.error(`Failed to load asset: ${assets[assetKey].src}.`);
        alert(`Error loading image: ${assets[assetKey].src}\nGame cannot start.`);
    }
    function loadAssets() {
        console.log("Starting asset loading...");
        for (const key in assets) {
            if (assets.hasOwnProperty(key) && assets[key].img) {
                assets[key].img.onload = () => assetLoaded(key);
                assets[key].img.onerror = () => assetLoadError(key);
                assets[key].img.src = assets[key].src; // Start loading
            }
        }
    }

    // --- High Score Handling ---
    function loadHighScore() { /* ... (keep existing function) ... */
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
    function saveHighScore() { /* ... (keep existing function) ... */
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
    function playSound(soundElement) { /* ... (keep existing function) ... */
        if (!soundElement || typeof soundElement.play !== 'function') return;
        soundElement.currentTime = 0;
        const playPromise = soundElement.play();
        if (playPromise !== undefined) { playPromise.catch(error => {}); } // Ignore autoplay errors silently
    }

    // --- Reset Game Variables ---
    function resetGame() { /* ... (keep existing function) ... */
        score = 0; obstacles = []; frameCount = 0;
        gameSpeed = initialGameSpeed; nextSpeedIncreaseScore = speedIncreaseInterval;
        bgX = 0; player.y = canvasHeight - player.height - groundHeight;
        player.dy = 0; player.grounded = true;
        if (currentScoreSpan) currentScoreSpan.textContent = score;
         // Hide POI overlay on reset
        if (poiTimeoutId) clearTimeout(poiTimeoutId);
        poiOverlay.classList.remove('visible');
        nextPoiIndex = 0; // Reset POI cycle
    }

    // --- Update Functions ---
    function updatePlayer() { /* ... (keep existing function) ... */
        if (!player.grounded) {
            player.dy += player.gravity;
            player.y += player.dy;
        }
        if (player.y >= canvasHeight - player.height - groundHeight) {
            player.y = canvasHeight - player.height - groundHeight;
            player.dy = 0;
            player.grounded = true;
        }
    }

    // --- *** MODIFIED: updateObstacles Function *** ---
    function updateObstacles() {
        frameCount++;
        const baseFrequency = 130; // Slightly less frequent spawns overall
        const speedFactor = Math.max(1, gameSpeed * 2.5); // Less impact from speed
        const spawnFrequency = Math.max(50, baseFrequency - speedFactor); // Min freq 50

        if (frameCount % Math.floor(spawnFrequency) === 0) {
            let newObjectData = null;
            // Decide type: POI (sign) or regular obstacle (stone/tractor)
            // POI Spawn Chance (e.g., 15-20%? Adjust for desired frequency)
            const spawnPOI = Math.random() < 0.18 && poiData.length > 0 && assets.sign.loaded;

            if (spawnPOI) {
                // Spawn a POI sign
                const poi = poiData[nextPoiIndex % poiData.length];
                newObjectData = {
                    isPOI: true, // Mark as POI
                    poiId: poi.id, // Store which POI this is
                    passed: false, // Has player passed it yet?
                    x: canvasWidth,
                    y: canvasHeight - poiSignDimensions.height - groundHeight, // Use POI sign dimensions
                    width: poiSignDimensions.width,
                    height: poiSignDimensions.height,
                    assetKey: 'sign' // Use the sign asset
                };
                nextPoiIndex++; // Prepare for the next POI
                // console.log(`Spawning POI Sign: ID ${poi.id}`);
            } else {
                // Spawn a regular game-ending obstacle
                if (regularObstacleTypes.length > 0) {
                    const typeIndex = Math.floor(Math.random() * regularObstacleTypes.length);
                    const type = regularObstacleTypes[typeIndex];

                    if (assets[type.assetKey] && assets[type.assetKey].loaded) {
                        newObjectData = {
                            isPOI: false, // Not a POI
                            x: canvasWidth,
                            y: canvasHeight - type.height - groundHeight,
                            width: type.width,
                            height: type.height,
                            assetKey: type.assetKey
                        };
                        // console.log(`Spawning Obstacle: ${type.assetKey}`);
                    }
                }
            }

            // Add the successfully created object to the array
            if (newObjectData) {
                obstacles.push(newObjectData);
            }
        }

        // Move all objects (obstacles and POIs) left
        for (let i = obstacles.length - 1; i >= 0; i--) {
            const obj = obstacles[i]; // Reference the current object
            obj.x -= gameSpeed;

            // --- NEW: Check for Passing a POI Sign ---
            if (obj.isPOI && !obj.passed) {
                // Check if the player's front (x) is past the POI sign's center
                 if (player.x > obj.x + obj.width / 2) {
                    displayPOIInfo(obj.poiId); // Show the info for this POI
                    obj.passed = true; // Mark as passed to prevent re-triggering
                    score += 50; // Optional: Score bonus for seeing POI info
                    if (currentScoreSpan) currentScoreSpan.textContent = score; // Update score display
                 }
            }
            // --- END NEW ---

            // Remove objects that are well off-screen
            if (obj.x + obj.width < -100) { // Allow extra space for POI text visibility
                obstacles.splice(i, 1);
            }
        }
    }
    // --- *** END MODIFIED updateObstacles *** ---


    // --- *** MODIFIED: checkCollisions Function *** ---
    function checkCollisions() {
        const playerRect = { x: player.x, y: player.y, width: player.width, height: player.height };

        for (const obstacle of obstacles) {
            // --- >>> IMPORTANT: Skip collision check if it's a POI sign <<<---
            if (obstacle.isPOI) {
                continue; // Ignore POI signs for game-ending collisions
            }
            // --- >>> ---------------------------------------------------- <<<---

            // Regular collision check for game-ending obstacles
            const obstacleRect = { x: obstacle.x, y: obstacle.y, width: obstacle.width, height: obstacle.height };
            if (playerRect.x < obstacleRect.x + obstacleRect.width &&
                playerRect.x + playerRect.width > obstacleRect.x &&
                playerRect.y < obstacleRect.y + obstacleRect.height &&
                playerRect.y + playerRect.height > obstacleRect.y)
            {
                return true; // Collision detected
            }
        }
        return false; // No game-ending collision
    }
    // --- *** END MODIFIED checkCollisions *** ---


    function updateScoreAndSpeed() { /* ... (keep existing function) ... */
        score++;
        if (currentScoreSpan) currentScoreSpan.textContent = score;
        if (score > 0 && score % speedIncreaseInterval === 0 && score >= nextSpeedIncreaseScore) {
            gameSpeed += 0.3;
            nextSpeedIncreaseScore += speedIncreaseInterval;
        }
    }

    // --- Draw Functions ---
    function drawBackground() { /* ... (keep existing function) ... */
        if (!assets.background.loaded) {
             ctx.fillStyle = '#87CEEB'; ctx.fillRect(0, 0, canvasWidth, canvasHeight);
             ctx.fillStyle = '#228B22'; ctx.fillRect(0, canvasHeight - groundHeight, canvasWidth, groundHeight); return;
        }
        const scrollSpeed = gameSpeed; // Scroll background at main game speed
        bgX -= scrollSpeed;
        bgX = bgX % canvasWidth;
        if (bgX > 0) bgX -= canvasWidth;
        ctx.drawImage(assets.background.img, bgX, 0, canvasWidth, canvasHeight);
        ctx.drawImage(assets.background.img, bgX + canvasWidth, 0, canvasWidth, canvasHeight);
    }
    function drawPlayer() { /* ... (keep existing function) ... */
        if (!assets.knight.loaded) { ctx.fillStyle = 'grey'; ctx.fillRect(player.x, player.y, player.width, player.height); return; }
        ctx.drawImage(assets.knight.img, player.x, player.y, player.width, player.height);
    }
    // --- MODIFIED: drawObstacles now draws POIs too ---
    function drawObstacles() { // Renamed to drawObjects is clearer, but keeping name for now
        for (const obj of obstacles) { // Changed variable name to 'obj'
            if (assets[obj.assetKey] && assets[obj.assetKey].loaded) {
                ctx.drawImage(assets[obj.assetKey].img, obj.x, obj.y, obj.width, obj.height);
            } else {
                // Draw fallback rectangle if image fails
                ctx.fillStyle = obj.isPOI ? 'blue' : 'red'; // Different fallback for POIs
                ctx.fillRect(obj.x, obj.y, obj.width, obj.height);
            }
        }
    }
    // --- END MODIFIED ---

    // --- *** NEW: POI Display Function *** ---
    function displayPOIInfo(poiId) {
        if (!poiOverlay || !poiNameEl || !poiInfoTextEl) {
            console.error("POI display elements not found!");
            return;
        }
        const poi = poiData.find(p => p.id === poiId);
        if (!poi) {
            console.warn(`POI data not found for ID: ${poiId}`);
            return;
        }
        // console.log(`Displaying POI: ${poi.name}`);
        poiNameEl.textContent = poi.name;
        poiInfoTextEl.textContent = poi.info;
        poiOverlay.classList.add('visible'); // Show with fade-in

        // Clear any previous timeout to ensure the new one runs fully
        if (poiTimeoutId) {
            clearTimeout(poiTimeoutId);
        }
        // Set timeout to hide the overlay
        poiTimeoutId = setTimeout(() => {
            poiOverlay.classList.remove('visible'); // Hide with fade-out
            poiTimeoutId = null;
        }, poiDisplayDuration);
    }
    // --- *** ------------------------- *** ---


    // --- Game Loop ---
    let lastTime = 0;
    function gameLoop(timestamp) { /* ... (keep existing game loop structure) ... */
        requestAnimationFrame(gameLoop); // Request next frame early
        const deltaTime = timestamp - lastTime; lastTime = timestamp;
        ctx.clearRect(0, 0, canvasWidth, canvasHeight);
        drawBackground();

        if (currentGameState === GameState.PLAYING) {
            updatePlayer(); updateObstacles(); updateScoreAndSpeed();
            drawPlayer(); drawObstacles(); // Draws both obstacles and POIs
            if (checkCollisions()) { // checkCollisions now ignores POIs
                playSound(collisionSound); playSound(gameOverSound);
                currentGameState = GameState.GAME_OVER;
                saveHighScore(); finalScoreSpan.textContent = score;
                gameOverHighScoreSpan.textContent = highScore;
                gameOverScreen.classList.remove('hidden');
                scoreDisplay.classList.add('hidden');
                // Hide POI overlay instantly on game over
                if (poiTimeoutId) clearTimeout(poiTimeoutId);
                poiOverlay.classList.remove('visible');
            }
        } else { // Menu or Game Over state
             drawPlayer(); // Draw player standing
             if (currentGameState === GameState.GAME_OVER) {
                 drawObstacles(); // Show final state
             }
        }
    }

    // --- Game State Changers / Event Handlers ---
    function startGame() { /* ... (keep existing function, ensures POI overlay is hidden on start) ... */
        if (currentGameState === GameState.PLAYING || !allAssetsLoaded) return;
        console.log("Attempting to start game...");
        resetGame(); // Reset includes hiding POI overlay
        currentGameState = GameState.PLAYING;
        startScreen.classList.add('hidden');
        gameOverScreen.classList.add('hidden');
        scoreDisplay.classList.remove('hidden');
        console.log("Game state set to PLAYING.");
    }
    function restartGame() { /* ... (keep existing function, ensures POI overlay is hidden on restart) ... */
         if (currentGameState === GameState.PLAYING || !allAssetsLoaded) return;
         console.log("Attempting to restart game...");
         resetGame(); // Reset includes hiding POI overlay
         currentGameState = GameState.PLAYING;
         gameOverScreen.classList.add('hidden');
         startScreen.classList.add('hidden');
         scoreDisplay.classList.remove('hidden');
         console.log("Game state set to PLAYING after restart.");
    }
    function handleJumpInput() { /* ... (keep existing function) ... */
        if (currentGameState === GameState.PLAYING && player.grounded) {
            player.dy = player.jumpPower; player.grounded = false;
            playSound(jumpSound);
        }
    }

    // --- Initial Setup Function ---
    function init() { /* ... (keep existing init structure, just attaches listeners) ... */
        console.log("init() function called.");
        if (gameInitialized) { console.warn("init() called more than once. Skipping."); return; }
        gameInitialized = true;

        loadHighScore();
        startScreen.classList.remove('hidden'); gameOverScreen.classList.add('hidden');
        scoreDisplay.classList.add('hidden'); poiOverlay.classList.add('hidden'); // Ensure POI hidden initially
        player.y = canvasHeight - player.height - groundHeight; // Place player correctly for menu

        console.log("Attaching event listeners...");
        // Remove potential old listeners first
        startButton.removeEventListener('click', startGame); restartButton.removeEventListener('click', restartGame);
        document.removeEventListener('keydown', handleKeyDown); canvas.removeEventListener('touchstart', handleTouchStart);
        startButton.removeEventListener('touchstart', handleButtonTouchStart); restartButton.removeEventListener('touchstart', handleButtonTouchStart);
        // Add listeners
        startButton.addEventListener('click', startGame); restartButton.addEventListener('click', restartGame);
        document.addEventListener('keydown', handleKeyDown);
        canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
        startButton.addEventListener('touchstart', handleButtonTouchStart, { passive: false });
        restartButton.addEventListener('touchstart', handleButtonTouchStart, { passive: false });
        console.log("Event listeners attached.");

        console.log("Requesting first game loop frame.");
        requestAnimationFrame(gameLoop); // Start the loop
    }

    // --- Named Event Handlers --- (Keep existing handlers: handleKeyDown, handleTouchStart, handleButtonTouchStart)
    function handleKeyDown(e) { /* ... (keep existing function) ... */
        if (e.code === 'Space' || e.key === ' ' || e.keyCode === 32) {
            e.preventDefault();
            if (!allAssetsLoaded) { return; }
            if (currentGameState === GameState.PLAYING) { handleJumpInput(); }
            else if (currentGameState === GameState.MENU) { startGame(); }
            else if (currentGameState === GameState.GAME_OVER) { restartGame(); }
        }
    }
    function handleTouchStart(e) { /* ... (keep existing function) ... */
        e.preventDefault();
        if (!allAssetsLoaded) return;
         if (currentGameState === GameState.PLAYING) { handleJumpInput(); }
         else if (currentGameState === GameState.MENU) { startGame(); }
         else if (currentGameState === GameState.GAME_OVER) { restartGame(); }
    }
    function handleButtonTouchStart(e) { /* ... (keep existing function) ... */
        e.preventDefault();
        if (!allAssetsLoaded) return;
        if (e.target.id === 'startButton' && currentGameState === GameState.MENU) { startGame(); }
        else if (e.target.id === 'restartButton' && currentGameState === GameState.GAME_OVER) { restartGame(); }
    }

    // --- Start Loading Assets ---
    document.addEventListener('DOMContentLoaded', () => {
         console.log("DOM Content Loaded. Starting asset load.");
         loadAssets(); // This will trigger init() when done
    });

})(); // End of IIFE
