<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Bad Belzig Runner</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap" rel="stylesheet">
    <style>
        body { font-family: 'Inter', sans-serif; background-color: #f0f0f0; }
        #gameContainer { position: relative; width: 800px; max-width: 100%; margin: 20px auto; border: 1px solid #ccc; overflow: hidden; }
        canvas { display: block; background-color: #e0f2fe; /* Light blue sky */ }
        .overlay { position: absolute; top: 0; left: 0; width: 100%; height: 100%; background-color: rgba(0, 0, 0, 0.7); display: none; /* Hidden by default */ justify-content: center; align-items: center; text-align: center; color: white; padding: 20px; box-sizing: border-box; }
        .popup-content { background-color: white; color: black; padding: 30px; border-radius: 10px; max-width: 90%; max-height: 90%; overflow-y: auto; box-shadow: 0 4px 15px rgba(0,0,0,0.2); }
        .popup-content h2 { margin-top: 0; font-size: 1.5rem; color: #151513; }
        .popup-content p { margin-bottom: 20px; line-height: 1.6; }
        .popup-content button { padding: 10px 20px; font-size: 1rem; background-color: #0ca644; color: white; border: none; border-radius: 5px; cursor: pointer; transition: background-color 0.3s ease; }
        .popup-content button:hover { background-color: #0a8536; }
        .game-info { position: absolute; top: 10px; left: 10px; background: rgba(0, 0, 0, 0.5); color: white; padding: 5px 10px; border-radius: 5px; font-size: 0.9rem; z-index: 10; }
        .game-info span { margin-right: 15px; }
        .end-screen-title { font-family: 'Press Start 2P', cursive; font-size: 2rem; margin-bottom: 20px; }
        .end-screen-text { font-size: 1.1rem; margin-bottom: 30px; }
        .end-screen button { padding: 15px 30px; font-size: 1.2rem; background-color: #f5d306; color: #151513; border: none; border-radius: 8px; cursor: pointer; transition: transform 0.2s ease; }
        .end-screen button:hover { transform: scale(1.05); }

         /* Simple Ground */
        .ground {
            position: absolute;
            bottom: 0;
            left: 0;
            width: 100%;
            height: 50px; /* Matches config.groundHeight */
            background-color: #8b4513; /* Brown */
            z-index: 1; /* Ensure ground is behind player/obstacles if needed */
         }

    </style>
</head>
<body class="bg-gray-100 flex flex-col items-center justify-center min-h-screen p-4">

    <h1 class="text-3xl font-bold mb-4 text-center">Bad Belzig Runner</h1>

    <div id="gameContainer" class="rounded-lg shadow-lg">
        <canvas id="gameCanvas" width="800" height="400"></canvas>
        <div class="ground"></div> <div class="game-info">
            <span id="scoreDisplay">Punkte / Score: 0</span>
            <span id="livesDisplay">Leben / Lives: 5</span>
        </div>

        <div id="landmarkPopup" class="overlay">
            <div class="popup-content">
                <h2 id="landmarkName">Landmark Name</h2>
                <p id="landmarkDescription">Landmark description goes here...</p>
                <button id="continueButton">Continue / Weiter</button>
            </div>
        </div>

        <div id="gameOverScreen" class="overlay">
            <div class="popup-content bg-red-700 text-white">
                <h2 class="end-screen-title">Game Over!</h2>
                <p class="end-screen-text">Du hast verloren. Klicke zum Neustarten.</p>
                <button class="end-screen bg-yellow-400 text-black">Retry / Nochmal</button>
            </div>
        </div>

        <div id="winScreen" class="overlay">
             <div class="popup-content bg-green-600 text-white">
                <h2 class="end-screen-title">Gewonnen! / You Win!</h2>
                <p class="end-screen-text">Glückwunsch! Du hast die Burg Eisenhardt erreicht! Klicke zum Neustarten.</p>
                <button class="end-screen bg-yellow-400 text-black">Play Again / Nochmal Spielen</button>
            </div>
        </div>
    </div>

    <p class="mt-4 text-sm text-gray-600 text-center">Steuerung: Leertaste / Tippen zum Springen. Enter / Weiter-Button zum Fortfahren.</p>
    <p class="mt-1 text-sm text-gray-600 text-center">Controls: Spacebar / Tap to Jump. Enter / Continue button to proceed.</p>


    <script>
        // --- Get DOM Elements ---
        const canvas = document.getElementById('gameCanvas');
        const ctx = canvas.getContext('2d');
        const scoreDisplay = document.getElementById('scoreDisplay');
        const livesDisplay = document.getElementById('livesDisplay');
        const landmarkPopup = document.getElementById('landmarkPopup');
        const landmarkName = document.getElementById('landmarkName');
        const landmarkDescription = document.getElementById('landmarkDescription');
        const continueButton = document.getElementById('continueButton');
        const gameOverScreen = document.getElementById('gameOverScreen');
        const winScreen = document.getElementById('winScreen');

        // --- Game Configuration ---
        const config = {
            canvasWidth: canvas.width,
            canvasHeight: canvas.height,
            gravity: 0.45,
            jumpStrength: -10.5,
            playerSpeed: 0, // Player doesn't move horizontally relative to screen
            obstacleSpeed: 2.2,
            groundHeight: 50, // Matches CSS .ground height
            spawnRate: 160, // Frames between spawns
            jumpHoldGravityMultiplier: 0.5, // Less gravity when holding jump
            jumpCutGravityMultiplier: 2.0, // More gravity when releasing jump early
            stompJumpStrength: -8.5, // Bounce after stomping
            maxGameSpeed: 7,
            startLives: 5,
            recoveryDuration: 90, // Frames of invincibility after hit
            colors: { // Fallback colors if images fail
                green: '#0ca644', blue: '#0296c6', yellow: '#f5d306',
                black: '#151513', white: '#ffffff', ground: '#8b4513'
            }
        };

        // --- Game State Variables ---
        let gameState = 'loading'; // 'loading', 'running', 'paused', 'gameOver', 'win'
        let playerState = {};
        let obstacles = [];
        let landmarks = [];
        let score = 0;
        let frameCount = 0;
        let gameSpeed = config.obstacleSpeed;
        let isJumpKeyDown = false;
        let isPointerDownJump = false; // For touch/mouse hold
        let playerLives = config.startLives;
        let isRecovering = false;
        let recoveryTimer = 0;
        let backgroundX = 0; // For scrolling background effect

        // --- Asset Loading ---
        const assets = {
            knightPlaceholder: null, stoneObstacle: null, familyObstacle: null,
            tractorObstacle: null, backgroundImage: null, signImage: null,
            loaded: 0, total: 0,
            // Placeholder URLs - replace with actual paths or URLs
            sources: {
                // Using placeholders for demonstration
                knightPlaceholder: 'https://placehold.co/60x75/0ca644/ffffff?text=Knight',
                stoneObstacle: 'https://placehold.co/30x40/a0a0a0/ffffff?text=Stone',
                familyObstacle: 'https://placehold.co/70x100/0296c6/ffffff?text=Family',
                tractorObstacle: 'https://placehold.co/115x80/f5d306/151513?text=Tractor',
                backgroundImage: 'https://placehold.co/800x350/e0f2fe/888888?text=Background', // Adjusted height
                signImage: 'https://placehold.co/60x90/8b4513/ffffff?text=Sign'
            }
        };

        function loadImage(key, src) {
            console.log(`Attempting to load: ${key} from ${src}`);
            assets.total++;
            const img = new Image();
            img.src = src;
            // Basic fallback mechanism
            img.onerror = () => {
                console.error(`Failed to load asset: ${key} from ${src}. Using fallback.`);
                assets.loaded++; // Count as loaded even if failed, to start the game
                assets[key] = null; // Ensure it's marked as unavailable
                 // Add a placeholder visual or color if needed here
                if (assets.loaded === assets.total) {
                    console.log("Asset loading finished (some may have failed). Starting game...");
                    resetGame();
                }
            };
            img.onload = () => {
                console.log(`Successfully loaded: ${key}`);
                assets.loaded++;
                assets[key] = img;
                console.log(`Assets loaded: ${assets.loaded} / ${assets.total}`);
                if (assets.loaded === assets.total) {
                    console.log("All assets loaded. Starting game...");
                    resetGame();
                }
            };
        }

        function loadAllAssets() {
            console.log("Starting asset loading...");
            gameState = 'loading';
            // Clear previous assets if any (e.g., on retry)
            for (const key in assets.sources) {
                assets[key] = null;
            }
            assets.loaded = 0;
            assets.total = 0;
            // Load all defined assets
            for (const key in assets.sources) {
                loadImage(key, assets.sources[key]);
            }
            // Handle case where no assets are defined
            if (assets.total === 0) {
                console.warn("No assets defined in sources. Starting game immediately.");
                resetGame();
            }
        }
        // --- END Asset Loading ---


        // --- Landmark Data ---
        const landmarkConfig = [
             { name: "SteinTherme", worldX: 1500, width: 60, height: 90, descEN: "Relax in the SteinTherme! Bad Belzig's unique thermal bath uses warm, salty water (Sole) rich in iodine. This is great for health and relaxation. Besides the pools, there's an extensive sauna world and wellness treatments available year-round.", descDE: "Entspann dich in der SteinTherme! Bad Belzigs einzigartiges Thermalbad nutzt warmes Salzwasser (Sole), reich an Jod. Das ist gut für Gesundheit und Entspannung. Neben den Becken gibt es eine große Saunawelt und Wellnessanwendungen, ganzjährig geöffnet.", isFinal: false },
             { name: "Frei und Erlebnisbad", worldX: 3000, width: 60, height: 90, descEN: "Cool off at the Freibad! This outdoor pool is popular in summer (usually May-Sept). It features swimming lanes, water slides, and separate areas for children, making it perfect for sunny family days.", descDE: "Kühl dich ab im Freibad! Dieses Freibad ist im Sommer beliebt (meist Mai-Sept). Es gibt Schwimmbahnen, Wasserrutschen und separate Bereiche für Kinder, perfekt für sonnige Familientage.", isFinal: false },
             { name: "Kulturzentrum & Bibliothek", worldX: 4500, width: 60, height: 90, descEN: "This building at Weitzgrunder Str. 4 houses the town library and the cultural centre.", descDE: "Dieses Gebäude in der Weitzgrunder Str. 4 beherbergt die Stadtbibliothek und das Kulturzentrum..", isFinal: false },
             { name: "Fläming Bahnhof", worldX: 6000, width: 60, height: 90, descEN: "All aboard at Fläming Bahnhof! The RE7 train line connects Bad Belzig directly to Berlin and Dessau. The station also serves as a gateway for exploring the scenic Hoher Fläming nature park, perhaps by bike.", descDE: "Einsteigen bitte am Fläming Bahnhof! Die Zuglinie RE7 verbindet Bad Belzig direkt mit Berlin und Dessau. Der Bahnhof dient auch als Tor zur Erkundung des malerischen Naturparks Hoher Fläming, vielleicht mit dem Fahrrad.", isFinal: false },
             { name: "Postmeilensäule", worldX: 7500, width: 60, height: 90, descEN: "See how far? This sandstone Postal Milestone (Postmeilensäule) from 1725 is located on the Marktplatz. Erected under August the Strong of Saxony, it marked postal routes, showing distances and travel times (often in hours) with symbols like the post horn.", descDE: "Schon gesehen? Diese kursächsische Postmeilensäule aus Sandstein von 1725 steht auf dem Marktplatz. Errichtet unter August dem Starken, markierte sie Postrouten und zeigte Distanzen und Reisezeiten (oft in Stunden) mit Symbolen wie dem Posthorn.", isFinal: false },
             { name: "Rathaus & Tourist-Information", worldX: 9000, width: 60, height: 90, descEN: "The historic Rathaus (Town Hall) sits centrally on the Marktplatz. Inside, you'll find the Tourist Information centre. They offer maps, accommodation booking, tips on events, and guided tour information.", descDE: "Das historische Rathaus befindet sich zentral am Marktplatz. Im Inneren finden Sie die Tourist-Information. Dort erhalten Sie Stadtpläne, Hilfe bei der Zimmervermittlung, Veranstaltungstipps und Informationen zu Führungen.", isFinal: false },
             { name: "Burg Eisenhardt", worldX: 10500, width: 60, height: 90, descEN: "You made it to Burg Eisenhardt! This impressive medieval castle overlooks the town. Explore the local history museum (Heimatmuseum), climb the 'Butterturm' keep for great views, and check for festivals or concerts held here.", descDE: "Geschafft! Du hast die Burg Eisenhardt erreicht! Diese beeindruckende mittelalterliche Burg überblickt die Stadt. Erkunden Sie das Heimatmuseum, besteigen Sie den Butterturm für eine tolle Aussicht und achten Sie auf Festivals oder Konzerte.", isFinal: true },
        ];
        function initializeLandmarks() {
            // Map config to landmark objects, calculating Y position based on canvas/ground height
            landmarks = landmarkConfig.map(cfg => ({
                ...cfg,
                // Place the sign image's bottom edge on the ground line
                yPos: config.canvasHeight - config.groundHeight - (cfg.height || 90),
                hasBeenTriggered: false
            }));
        }
        // --- END Landmark Data ---


        // --- Player State Initialization ---
        function resetPlayer() {
            playerState = {
                x: 50, // Initial horizontal position
                y: config.canvasHeight - config.groundHeight - 75, // Start on the ground
                width: 60, // Width of the player
                height: 75, // Height of the player
                vy: 0, // Vertical velocity
                isGrounded: true // Starts on the ground
            };
        }


        // --- Game Reset Function ---
        function resetGame() {
            console.log("Resetting game...");
            resetPlayer();
            obstacles = [];
            initializeLandmarks(); // Reset landmark positions and triggered status
            score = 0;
            frameCount = 0;
            gameSpeed = config.obstacleSpeed; // Reset game speed
            isJumpKeyDown = false;
            isPointerDownJump = false;
            playerLives = config.startLives;
            isRecovering = false;
            recoveryTimer = 0;
            backgroundX = 0; // Reset background scroll position

            // Update UI displays
            livesDisplay.textContent = `Leben / Lives: ${playerLives}`;
            scoreDisplay.textContent = `Punkte / Score: 0`;

            // Hide overlay screens
            gameOverScreen.style.display = 'none';
            winScreen.style.display = 'none';
            landmarkPopup.style.display = 'none';

            // Set state to running and start the loop
            gameState = 'running';
            requestAnimationFrame(gameLoop);
        }

        // --- Input Handling ---
        function handleJump() {
            // Allow jump only if running and grounded
            if (gameState === 'running' && playerState.isGrounded) {
                playerState.vy = config.jumpStrength;
                playerState.isGrounded = false;
            }
            // Allow reset from end screens via jump action
            else if (gameState === 'gameOver' && gameOverScreen.style.display !== 'none') {
                resetGame();
            } else if (gameState === 'win' && winScreen.style.display !== 'none') {
                resetGame();
            }
        }

        function hideLandmarkPopup() {
            // Check the game state *before* potentially changing it
             const wasWinState = (gameState === 'win');
             const wasPausedState = (gameState === 'paused');

             if (wasPausedState || wasWinState) { // Only act if paused or won
                 landmarkPopup.style.display = 'none'; // Hide the popup

                 if (wasWinState) {
                     // If we just closed the popup for the final landmark
                     showWinScreen(); // Now show the win screen
                     // Game state remains 'win', game loop is stopped implicitly
                 } else if (wasPausedState) {
                     // If it was a regular landmark pause
                     gameState = 'running'; // Resume the game
                     requestAnimationFrame(gameLoop); // Restart the loop
                 }
             }
        }

        // Event listeners for keyboard input
        window.addEventListener('keydown', (e) => {
            if (e.code === 'Space') {
                e.preventDefault(); // Prevent page scrolling
                if (!isJumpKeyDown) { // Prevent holding space from rapid firing jumps
                    handleJump();
                }
                isJumpKeyDown = true;
            }
            // Allow Enter key to dismiss popups or reset end screens
            else if (e.key === 'Enter' || e.code === 'Enter') {
                e.preventDefault();
                if (gameState === 'paused' && landmarkPopup.style.display !== 'none') {
                    hideLandmarkPopup();
                } else if (gameState === 'gameOver' && gameOverScreen.style.display !== 'none') {
                    resetGame();
                } else if (gameState === 'win' && winScreen.style.display !== 'none') {
                    resetGame();
                }
            }
        });

        window.addEventListener('keyup', (e) => {
            if (e.code === 'Space') {
                e.preventDefault();
                isJumpKeyDown = false; // Reset jump key state
            }
        });

        // Event listeners for touch/mouse input on the canvas
        canvas.addEventListener('touchstart', (e) => {
            e.preventDefault(); // Prevent default touch behavior (like scrolling)
            // Allow jump or reset based on game state
            if (gameState === 'running' || gameState === 'paused') { // Allow jump even if paused to potentially break free? No, handleJump checks state.
                handleJump();
                isPointerDownJump = true; // Track pointer down state for variable jump height
            } else if (gameState === 'gameOver' && gameOverScreen.style.display !== 'none') {
                resetGame();
            } else if (gameState === 'win' && winScreen.style.display !== 'none') {
                resetGame();
            }
        });

        canvas.addEventListener('mousedown', (e) => {
            // Allow jump only if running (prevents accidental resets on end screens via canvas click)
             if (gameState === 'running') {
                 handleJump();
                 isPointerDownJump = true;
             }
        });

        // Reset pointer down state when touch/mouse is released
        window.addEventListener('touchend', (e) => { isPointerDownJump = false; });
        window.addEventListener('mouseup', (e) => { isPointerDownJump = false; });

        // Click listeners for overlay buttons/screens
        gameOverScreen.addEventListener('click', resetGame); // Click anywhere on overlay resets
        winScreen.addEventListener('click', resetGame);      // Click anywhere on overlay resets
        continueButton.addEventListener('click', hideLandmarkPopup); // Specific button for popup
        // --- END Input Handling ---


        // --- Collision Detection ---
        function checkCollision(rect1, rect2) {
            // Simple Axis-Aligned Bounding Box (AABB) collision check
            return (
                rect1.x < rect2.x + rect2.width &&
                rect1.x + rect1.width > rect2.x &&
                rect1.y < rect2.y + rect2.height &&
                rect1.y + rect1.height > rect2.y
            );
        }

        // --- Obstacle Handling ---
        const obstacleTypes = ['stoneObstacle', 'familyObstacle', 'tractorObstacle'];
        function spawnObstacle() {
            // Randomly select an obstacle type
            const typeIndex = Math.floor(Math.random() * obstacleTypes.length);
            const selectedTypeKey = obstacleTypes[typeIndex];
            let obstacleHeight, obstacleWidth;

            // Define size variations for different obstacles
            switch (selectedTypeKey) {
                case 'familyObstacle':
                    obstacleHeight = 80 + Math.random() * 30; // Taller, variable
                    obstacleWidth = 60 + Math.random() * 20;
                    break;
                case 'tractorObstacle':
                    obstacleHeight = 70 + Math.random() * 20;
                    obstacleWidth = 100 + Math.random() * 30; // Wider, variable
                    break;
                case 'stoneObstacle':
                default: // Default to stone if key is unknown
                    obstacleHeight = 30 + Math.random() * 20; // Smaller, variable
                    obstacleWidth = 20 + Math.random() * 16;
                    break;
            }
            // console.log(`Spawning ${selectedTypeKey} - Size: ${obstacleWidth.toFixed(0)}x${obstacleHeight.toFixed(0)}`);

            // Create the obstacle object
            obstacles.push({
                x: config.canvasWidth, // Spawn off-screen to the right
                y: config.canvasHeight - config.groundHeight - obstacleHeight, // Position on the ground
                width: obstacleWidth,
                height: obstacleHeight,
                typeKey: selectedTypeKey // Store the key to retrieve the correct image asset
            });
        }

        function updateObstacles() {
            // Spawn new obstacles periodically after an initial delay
            if (frameCount > 100 && frameCount % config.spawnRate === 0) {
                spawnObstacle();
            }

            // Move existing obstacles and remove off-screen ones
            for (let i = obstacles.length - 1; i >= 0; i--) {
                obstacles[i].x -= gameSpeed; // Move left based on current game speed
                // Remove obstacles that have moved completely off-screen
                if (obstacles[i].x + obstacles[i].width < 0) {
                    obstacles.splice(i, 1);
                }
            }
        }
        // --- END Obstacle Handling ---


        // --- Landmark Display & Popup Trigger Function ---
        function showLandmarkPopup(landmark) {
            // Populate the popup with landmark details
            landmarkName.textContent = landmark.name;
            // Use innerHTML to allow basic formatting like line breaks
            landmarkDescription.innerHTML = `${landmark.descEN}<br><br>${landmark.descDE}`;
            // Display the popup overlay
            landmarkPopup.style.display = 'flex';
        }


        // --- Update Game State ---
        function update() {
            // Only run update logic if the game is in the 'running' state
            if (gameState !== 'running') return;

            frameCount++; // Increment frame counter

            // Manage Recovery State (invincibility after being hit)
            if (isRecovering) {
                recoveryTimer--;
                if (recoveryTimer <= 0) {
                    isRecovering = false; // End recovery period
                    // console.log("Recovery finished.");
                }
            }

            // Player Physics (Apply Gravity, Variable Jump Height)
            let currentGravity = config.gravity;
            // Modify gravity based on jump state for variable jump height
            if (!playerState.isGrounded && playerState.vy < 0) { // If jumping upwards
                if (isJumpKeyDown || isPointerDownJump) { // Holding jump key/pointer
                    currentGravity *= config.jumpHoldGravityMultiplier; // Apply less gravity (jump higher)
                } else { // Released jump key/pointer early
                    currentGravity *= config.jumpCutGravityMultiplier; // Apply more gravity (cut jump short)
                }
            }
            playerState.vy += currentGravity; // Apply gravity to vertical velocity
            playerState.y += playerState.vy; // Update player's vertical position

            // Ground Collision Detection
            const groundLevel = config.canvasHeight - config.groundHeight - playerState.height;
            if (playerState.y >= groundLevel) {
                playerState.y = groundLevel; // Snap to ground level
                playerState.vy = 0; // Stop vertical movement
                playerState.isGrounded = true; // Player is now grounded
            } else {
                playerState.isGrounded = false; // Player is in the air
            }

            // Update Obstacles (Spawning and Movement)
            updateObstacles(); // Uses current gameSpeed

            // Collision Checks between Player and Obstacles
            if (!isRecovering) { // Only check for collisions if not invincible
                for (let i = obstacles.length - 1; i >= 0; i--) {
                    const obstacle = obstacles[i];
                    if (checkCollision(playerState, obstacle)) {
                        // Collision detected! Determine the type of collision.
                        const isFalling = playerState.vy > 0;
                        // Calculate player's bottom edge position in the *previous* frame
                        const previousPlayerBottom = playerState.y + playerState.height - playerState.vy;
                        const obstacleTop = obstacle.y;

                        // Check for Stomp: Player is falling AND was above the obstacle in the previous frame
                        if (isFalling && previousPlayerBottom <= obstacleTop + 1) { // +1 for tolerance
                            // console.log("Stomp detected!");
                            playerState.vy = config.stompJumpStrength; // Bounce off the obstacle
                            playerState.y = obstacle.y - playerState.height; // Correct position slightly above obstacle
                            playerState.isGrounded = false; // Player is airborne after stomp
                            score += 50; // Award bonus points for stomping
                            obstacles.splice(i, 1); // Remove the stomped obstacle
                            continue; // Skip further checks for this (now removed) obstacle
                        } else {
                            // Not a Stomp - this is a damaging hit
                             // console.log("Vulnerable Collision Detected!");
                             playerLives--;
                             livesDisplay.textContent = `Leben / Lives: ${playerLives}`;
                             score -= 75; // Penalty for getting hit
                             if (score < 0) { score = 0; } // Prevent negative score

                             if (playerLives <= 0) {
                                 // Game Over
                                 console.log("Game Over!");
                                 gameState = 'gameOver';
                                 showGameOverScreen();
                                 return; // Stop the update loop immediately
                             } else {
                                 // Lose a life, but continue playing - trigger recovery
                                 // console.log("Lost a life, starting recovery.");
                                 isRecovering = true;
                                 recoveryTimer = config.recoveryDuration;
                                 // Optional: small bounce back effect
                                 playerState.vy = -3;
                                 playerState.isGrounded = false;
                                 // Remove the obstacle that was hit
                                 // obstacles.splice(i, 1); // Decide if obstacle should be removed on hit
                                 break; // Stop checking collisions for this frame after taking a hit
                             }
                        }
                    }
                }
            }

            // Update Landmarks and Check Triggers
            for (let landmark of landmarks) {
                landmark.worldX -= gameSpeed; // Move landmark based on game speed
                // Check if player has reached an untriggered landmark
                if (!landmark.hasBeenTriggered &&
                    landmark.worldX < playerState.x + playerState.width && // Player's right edge passed landmark's left edge
                    landmark.worldX + landmark.width > playerState.x) {    // Player's left edge has not passed landmark's right edge
                    console.log(`Triggering landmark: ${landmark.name}`);
                    landmark.hasBeenTriggered = true;
                    showLandmarkPopup(landmark); // Display the popup

                    if (landmark.isFinal) {
                        gameState = 'win'; // Set game state to win
                        // ** CHANGE: Do NOT show win screen immediately **
                        // showWinScreen(); // <<-- REMOVED
                    } else {
                        gameState = 'paused'; // Pause the game for regular landmarks
                    }
                    // Game loop will stop because state is no longer 'running'
                    return; // Exit update early after triggering a landmark
                }
            }

            // Update Score (based on time/distance)
            score++; // Increment score each frame
            // Update score display less frequently or scale score
            scoreDisplay.textContent = `Punkte / Score: ${Math.floor(score / 5)}`; // Display scaled score

            // Gradual Speed Increase
            if (frameCount > 0 && frameCount % 240 === 0) { // Increase speed every 240 frames (adjust as needed)
                if (gameSpeed < config.maxGameSpeed) {
                    gameSpeed += 0.07; // Increment speed
                    gameSpeed = parseFloat(gameSpeed.toFixed(2)); // Avoid floating point issues
                    // console.log("Speed Increased:", gameSpeed);
                }
            }

             // Update Background Scrolling
             backgroundX -= gameSpeed * 0.5; // Scroll background slower than obstacles
             if (assets.backgroundImage && backgroundX <= -assets.backgroundImage.width) {
                 backgroundX += assets.backgroundImage.width; // Reset background position for seamless loop
             }

        }


        // --- Draw Game ---
        function draw() {
            // Clear the canvas
            ctx.clearRect(0, 0, config.canvasWidth, config.canvasHeight);

             // Draw Scrolling Background
             if (assets.backgroundImage) {
                 let currentX = backgroundX;
                 // Draw the background image multiple times if needed to cover the canvas
                 while (currentX < config.canvasWidth) {
                     // Draw image from its top-left corner (0,0) up to canvas height minus ground height
                     ctx.drawImage(assets.backgroundImage, 0, 0, assets.backgroundImage.width, assets.backgroundImage.height,
                                   currentX, 0, assets.backgroundImage.width, config.canvasHeight - config.groundHeight);
                     currentX += assets.backgroundImage.width;
                 }
             } else {
                 // Fallback: Draw solid sky color if background image fails
                 ctx.fillStyle = config.colors.blue; // Light blue sky
                 ctx.fillRect(0, 0, config.canvasWidth, config.canvasHeight - config.groundHeight);
             }

             // Draw Ground (simple rect, CSS handles the main visual)
             // Optional: Draw details on canvas ground if needed
             // ctx.fillStyle = config.colors.ground;
             // ctx.fillRect(0, config.canvasHeight - config.groundHeight, config.canvasWidth, config.groundHeight);


            // Draw Player (with flashing effect during recovery)
            let drawPlayer = true;
            if (isRecovering && frameCount % 10 < 5) { // Flash effect: on/off every 5 frames
                drawPlayer = false;
            }
            if (drawPlayer) {
                if (assets.knightPlaceholder) {
                    // Draw player image if loaded
                    ctx.drawImage(assets.knightPlaceholder, playerState.x, playerState.y, playerState.width, playerState.height);
                } else {
                    // Fallback: Draw a green rectangle if player image failed
                    ctx.fillStyle = config.colors.green;
                    ctx.fillRect(playerState.x, playerState.y, playerState.width, playerState.height);
                }
            }

            // Draw Obstacles
            obstacles.forEach(obstacle => {
                const obstacleImage = assets[obstacle.typeKey]; // Get the correct image asset
                if (obstacleImage) {
                    // Draw obstacle image if loaded
                    ctx.drawImage(obstacleImage, obstacle.x, obstacle.y, obstacle.width, obstacle.height);
                } else {
                    // Fallback: Draw a black rectangle if obstacle image failed
                    ctx.fillStyle = config.colors.black;
                    ctx.fillRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height);
                }
            });

            // Draw Landmark Signs
            landmarks.forEach(landmark => {
                // Only draw landmarks that are currently on screen
                if (landmark.worldX < config.canvasWidth && landmark.worldX + landmark.width > 0) {
                    if (assets.signImage) {
                        // Draw sign image if loaded
                        ctx.drawImage(assets.signImage, landmark.worldX, landmark.yPos, landmark.width, landmark.height);
                    } else {
                        // Fallback: Draw a brown rectangle if sign image failed
                        ctx.fillStyle = config.colors.ground; // Use ground color for fallback sign
                        ctx.fillRect(landmark.worldX, landmark.yPos, landmark.width, landmark.height);
                    }
                }
            });
        }
        // --- END Draw Game ---


        // --- UI Updates ---
        function showGameOverScreen() {
            gameOverScreen.style.display = 'flex'; // Show the game over overlay
        }
        function showWinScreen() {
            winScreen.style.display = 'flex'; // Show the win overlay
        }


        // --- Main Game Loop ---
        function gameLoop() {
            // Stop the loop if game is not in 'running' state
            if (gameState !== 'running') {
                 // console.log(`Game loop stopping. State: ${gameState}`);
                 return;
            }

            // Perform game logic updates
            update();
            // Render the current game state
            draw();

            // Request the next frame to continue the loop
            requestAnimationFrame(gameLoop);
        }


        // --- Start Game ---
        // Load assets first, which will call resetGame() upon completion
        loadAllAssets();
        // --- END Start Game ---

    </script>

</body>
</html>
