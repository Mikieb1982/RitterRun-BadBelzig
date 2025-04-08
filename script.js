<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Bad Belzig Runner</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap" rel="stylesheet">
    <style>
        /* Basic styles */
        body { font-family: 'Inter', sans-serif; background-color: #f0f0f0; }
        #gameContainer { position: relative; width: 800px; max-width: 100%; margin: 20px auto; border: 1px solid #ccc; overflow: hidden; }
        canvas { display: block; background-color: #e0f2fe; /* Light blue sky */ }

        /* Overlays (Popups, End Screens) */
        .overlay { position: absolute; top: 0; left: 0; width: 100%; height: 100%; background-color: rgba(0, 0, 0, 0.7); display: none; /* Hidden by default */ justify-content: center; align-items: center; text-align: center; color: white; padding: 20px; box-sizing: border-box; z-index: 20; /* Ensure overlays are on top */ }
        .popup-content { background-color: white; color: black; padding: 30px; border-radius: 10px; max-width: 90%; max-height: 90%; overflow-y: auto; box-shadow: 0 4px 15px rgba(0,0,0,0.2); }
        .popup-content h2 { margin-top: 0; font-size: 1.5rem; color: #151513; }
        .popup-content p { margin-bottom: 20px; line-height: 1.6; }
        .popup-content button { padding: 10px 20px; font-size: 1rem; background-color: #0ca644; color: white; border: none; border-radius: 5px; cursor: pointer; transition: background-color 0.3s ease; }
        .popup-content button:hover { background-color: #0a8536; }

        /* Game Info Display (Score, Lives) */
        .game-info { position: absolute; top: 10px; left: 10px; background: rgba(0, 0, 0, 0.5); color: white; padding: 5px 10px; border-radius: 5px; font-size: 0.9rem; z-index: 10; }
        .game-info span { margin-right: 15px; }

        /* End Screen Specific Styles */
        .end-screen-title { font-family: 'Press Start 2P', cursive; font-size: 2rem; margin-bottom: 20px; }
        .end-screen-text { font-size: 1.1rem; margin-bottom: 30px; }
        .end-screen button { padding: 15px 30px; font-size: 1.2rem; background-color: #f5d306; color: #151513; border: none; border-radius: 8px; cursor: pointer; transition: transform 0.2s ease; }
        .end-screen button:hover { transform: scale(1.05); }

         /* Simple Ground Element */
        .ground {
            position: absolute;
            bottom: 0;
            left: 0;
            width: 100%;
            height: 50px; /* Matches config.groundHeight */
            background-color: #8b4513; /* Brown */
            z-index: 1; /* Below player/obstacles but above background */
         }
    </style>
</head>
<body class="bg-gray-100 flex flex-col items-center justify-center min-h-screen p-4">

    <h1 class="text-3xl font-bold mb-4 text-center">Bad Belzig Runner</h1>

    <div id="gameContainer" class="rounded-lg shadow-lg">
        <canvas id="gameCanvas" width="800" height="400"></canvas>
        <div class="ground"></div>
        <div class="game-info">
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
            // console.log(`Attempting to load: ${key} from ${src}`);
            assets.total++;
            const img = new Image();
            img.src = src;
            // Basic fallback mechanism
            img.onerror = () => {
                console.error(`Failed to load asset: ${key} from ${src}. Using fallback.`);
                assets.loaded++; // Count as loaded even if failed, to start the game
                assets[key] = null; // Ensure it's marked as unavailable
                if (assets.loaded === assets.total) {
                    console.log("Asset loading finished (some may have failed). Starting game...");
                    resetGame();
                }
            };
            img.onload = () => {
                // console.log(`Successfully loaded: ${key}`);
                assets.loaded++;
                assets[key] = img;
                // console.log(`Assets loaded: ${assets.loaded} / ${assets.total}`);
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
             { name: "SteinTherme", worldX: 1500, width: 60, height: 90, descEN: "Relax in the SteinTherme! Bad Belzig's unique thermal bath uses warm, salty water (Sole) rich in iodine...", descDE: "Entspann dich in der SteinTherme! Bad Belzigs einzigartiges Thermalbad nutzt warmes Salzwasser (Sole), reich an Jod...", isFinal: false },
             { name: "Frei und Erlebnisbad", worldX: 3000, width: 60, height: 90, descEN: "Cool off at the Freibad! This outdoor pool is popular in summer...", descDE: "Kühl dich ab im Freibad! Dieses Freibad ist im Sommer beliebt...", isFinal: false },
             { name: "Kulturzentrum & Bibliothek", worldX: 4500, width: 60, height: 90, descEN: "This building at Weitzgrunder Str. 4 houses the town library and the cultural centre.", descDE: "Dieses Gebäude in der Weitzgrunder Str. 4 beherbergt die Stadtbibliothek und das Kulturzentrum..", isFinal: false },
             { name: "Fläming Bahnhof", worldX: 6000, width: 60, height: 90, descEN: "All aboard at Fläming Bahnhof! The RE7 train line connects Bad Belzig directly to Berlin and Dessau...", descDE: "Einsteigen bitte am Fläming Bahnhof! Die Zuglinie RE7 verbindet Bad Belzig direkt mit Berlin und Dessau...", isFinal: false },
             { name: "Postmeilensäule", worldX: 7500, width: 60, height: 90, descEN: "See how far? This sandstone Postal Milestone (Postmeilensäule) from 1725 is located on the Marktplatz...", descDE: "Schon gesehen? Diese kursächsische Postmeilensäule aus Sandstein von 1725 steht auf dem Marktplatz...", isFinal: false },
             { name: "Rathaus & Tourist-Information", worldX: 9000, width: 60, height: 90, descEN: "The historic Rathaus (Town Hall) sits centrally on the Marktplatz. Inside, you'll find the Tourist Information centre...", descDE: "Das historische Rathaus befindet sich zentral am Marktplatz. Im Inneren finden Sie die Tourist-Information...", isFinal: false },
             { name: "Burg Eisenhardt", worldX: 10500, width: 60, height: 90, descEN: "You made it to Burg Eisenhardt! This impressive medieval castle overlooks the town...", descDE: "Geschafft! Du hast die Burg Eisenhardt erreicht! Diese beeindruckende mittelalterliche Burg überblickt die Stadt...", isFinal: true },
        ]; // Descriptions shortened for brevity in this example

        function initializeLandmarks() {
            // Map config to landmark objects, calculating Y position
            landmarks = landmarkConfig.map(cfg => ({
                ...cfg,
                yPos: config.canvasHeight - config.groundHeight - (cfg.height || 90),
                hasBeenTriggered: false
            }));
        }
        // --- END Landmark Data ---


        // --- Player State Initialization ---
        function resetPlayer() {
            playerState = {
                x: 50, y: config.canvasHeight - config.groundHeight - 75,
                width: 60, height: 75, vy: 0, isGrounded: true
            };
        }


        // --- Game Reset Function ---
        function resetGame() {
            console.log("Resetting game...");
            resetPlayer();
            obstacles = [];
            initializeLandmarks();
            score = 0;
            frameCount = 0;
            gameSpeed = config.obstacleSpeed;
            isJumpKeyDown = false;
            isPointerDownJump = false;
            playerLives = config.startLives;
            isRecovering = false;
            recoveryTimer = 0;
            backgroundX = 0;

            // Update UI
            livesDisplay.textContent = `Leben / Lives: ${playerLives}`;
            scoreDisplay.textContent = `Punkte / Score: 0`;

            // Hide overlays
            gameOverScreen.style.display = 'none';
            winScreen.style.display = 'none';
            landmarkPopup.style.display = 'none';

            // Start game
            gameState = 'running';
            requestAnimationFrame(gameLoop);
        }

        // --- Input Handling ---
        function handleJump() {
            if (gameState === 'running' && playerState.isGrounded) {
                playerState.vy = config.jumpStrength;
                playerState.isGrounded = false;
            } else if (gameState === 'gameOver' && gameOverScreen.style.display !== 'none') {
                resetGame();
            } else if (gameState === 'win' && winScreen.style.display !== 'none') {
                resetGame();
            }
        }

        function hideLandmarkPopup() {
            const popupIsVisible = landmarkPopup.style.display !== 'none';
            if (!popupIsVisible) return; // Do nothing if popup isn't visible

            landmarkPopup.style.display = 'none'; // Hide the popup

            if (gameState === 'win') {
                // If we just closed the popup for the final landmark
                showWinScreen(); // Now show the win screen
            } else if (gameState === 'paused') {
                // If it was a regular landmark pause
                gameState = 'running'; // Resume the game
                requestAnimationFrame(gameLoop); // Restart the loop
            }
        }

        // Event listeners for keyboard input
        window.addEventListener('keydown', (e) => {
            if (e.code === 'Space') {
                e.preventDefault();
                if (!isJumpKeyDown) { handleJump(); }
                isJumpKeyDown = true;
            }
            // --- MODIFIED Enter Key Logic ---
            else if (e.key === 'Enter' || e.code === 'Enter') {
                e.preventDefault();
                // If paused OR won, AND the landmark popup is visible, hide it.
                if ((gameState === 'paused' || gameState === 'win') && landmarkPopup.style.display !== 'none') {
                    hideLandmarkPopup();
                }
                // Reset from Game Over screen
                else if (gameState === 'gameOver' && gameOverScreen.style.display !== 'none') {
                    resetGame();
                }
                // Reset from Win screen (only after it's displayed)
                else if (gameState === 'win' && winScreen.style.display !== 'none') {
                    resetGame();
                }
            }
        });

        window.addEventListener('keyup', (e) => {
            if (e.code === 'Space') { e.preventDefault(); isJumpKeyDown = false; }
        });

        // Event listeners for touch/mouse input
        canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            if (gameState === 'running' || gameState === 'paused') {
                handleJump(); isPointerDownJump = true;
            } else if (gameState === 'gameOver' && gameOverScreen.style.display !== 'none') {
                resetGame();
            } else if (gameState === 'win' && winScreen.style.display !== 'none') {
                resetGame();
            }
        });
        canvas.addEventListener('mousedown', (e) => {
             if (gameState === 'running') { handleJump(); isPointerDownJump = true; }
        });
        window.addEventListener('touchend', (e) => { isPointerDownJump = false; });
        window.addEventListener('mouseup', (e) => { isPointerDownJump = false; });

        // Click listeners for overlays
        gameOverScreen.addEventListener('click', resetGame);
        winScreen.addEventListener('click', resetGame);
        continueButton.addEventListener('click', hideLandmarkPopup);
        // --- END Input Handling ---


        // --- Collision Detection ---
        function checkCollision(rect1, rect2) {
            return ( rect1.x < rect2.x + rect2.width && rect1.x + rect1.width > rect2.x &&
                     rect1.y < rect2.y + rect2.height && rect1.y + rect1.height > rect2.y );
        }

        // --- Obstacle Handling ---
        const obstacleTypes = ['stoneObstacle', 'familyObstacle', 'tractorObstacle'];
        function spawnObstacle() {
            const typeIndex = Math.floor(Math.random() * obstacleTypes.length);
            const selectedTypeKey = obstacleTypes[typeIndex];
            let obstacleHeight, obstacleWidth;
            switch (selectedTypeKey) {
                case 'familyObstacle': obstacleHeight = 80 + Math.random() * 30; obstacleWidth = 60 + Math.random() * 20; break;
                case 'tractorObstacle': obstacleHeight = 70 + Math.random() * 20; obstacleWidth = 100 + Math.random() * 30; break;
                case 'stoneObstacle': default: obstacleHeight = 30 + Math.random() * 20; obstacleWidth = 20 + Math.random() * 16; break;
            }
            obstacles.push({ x: config.canvasWidth, y: config.canvasHeight - config.groundHeight - obstacleHeight, width: obstacleWidth, height: obstacleHeight, typeKey: selectedTypeKey });
        }
        function updateObstacles() {
            if (frameCount > 100 && frameCount % config.spawnRate === 0) { spawnObstacle(); }
            for (let i = obstacles.length - 1; i >= 0; i--) {
                obstacles[i].x -= gameSpeed;
                if (obstacles[i].x + obstacles[i].width < 0) { obstacles.splice(i, 1); }
            }
        }
        // --- END Obstacle Handling ---


        // --- Landmark Display ---
        function showLandmarkPopup(landmark) {
            landmarkName.textContent = landmark.name;
            landmarkDescription.innerHTML = `${landmark.descEN}<br><br>${landmark.descDE}`;
            landmarkPopup.style.display = 'flex';
        }


        // --- Update Game State ---
        function update() {
            if (gameState !== 'running') return;
            frameCount++;

            // Recovery state
            if (isRecovering) {
                recoveryTimer--;
                if (recoveryTimer <= 0) { isRecovering = false; }
            }

            // Player physics
            let currentGravity = config.gravity;
            if (!playerState.isGrounded && playerState.vy < 0) {
                if (isJumpKeyDown || isPointerDownJump) { currentGravity *= config.jumpHoldGravityMultiplier; }
                else { currentGravity *= config.jumpCutGravityMultiplier; }
            }
            playerState.vy += currentGravity;
            playerState.y += playerState.vy;

            // Ground collision
            const groundLevel = config.canvasHeight - config.groundHeight - playerState.height;
            if (playerState.y >= groundLevel) {
                playerState.y = groundLevel; playerState.vy = 0; playerState.isGrounded = true;
            } else { playerState.isGrounded = false; }

            // Obstacles
            updateObstacles();

            // Obstacle Collision Checks
            if (!isRecovering) {
                for (let i = obstacles.length - 1; i >= 0; i--) {
                    const obstacle = obstacles[i];
                    if (checkCollision(playerState, obstacle)) {
                        const isFalling = playerState.vy > 0;
                        const previousPlayerBottom = playerState.y + playerState.height - playerState.vy;
                        const obstacleTop = obstacle.y;

                        if (isFalling && previousPlayerBottom <= obstacleTop + 1) { // Stomp
                            playerState.vy = config.stompJumpStrength;
                            playerState.y = obstacle.y - playerState.height;
                            playerState.isGrounded = false;
                            score += 50;
                            obstacles.splice(i, 1);
                            continue;
                        } else { // Hit
                             playerLives--;
                             livesDisplay.textContent = `Leben / Lives: ${playerLives}`;
                             score -= 75; if (score < 0) { score = 0; }
                             if (playerLives <= 0) { // Game Over
                                 console.log("Game Over!"); gameState = 'gameOver'; showGameOverScreen(); return;
                             } else { // Lose life, recover
                                 isRecovering = true; recoveryTimer = config.recoveryDuration;
                                 playerState.vy = -3; playerState.isGrounded = false;
                                 // obstacles.splice(i, 1); // Optional: remove obstacle on hit
                                 break; // Stop collision checks for this frame
                             }
                        }
                    }
                }
            }

            // Landmark Triggers
            for (let landmark of landmarks) {
                landmark.worldX -= gameSpeed;
                if (!landmark.hasBeenTriggered && landmark.worldX < playerState.x + playerState.width && landmark.worldX + landmark.width > playerState.x) {
                    console.log(`Triggering landmark: ${landmark.name}`);
                    landmark.hasBeenTriggered = true;
                    showLandmarkPopup(landmark);
                    if (landmark.isFinal) { gameState = 'win'; }
                    else { gameState = 'paused'; }
                    return; // Exit update early after triggering landmark
                }
            }

            // Score update
            score++;
            scoreDisplay.textContent = `Punkte / Score: ${Math.floor(score / 5)}`;

            // Speed increase
            if (frameCount > 0 && frameCount % 240 === 0) {
                if (gameSpeed < config.maxGameSpeed) {
                    gameSpeed += 0.07; gameSpeed = parseFloat(gameSpeed.toFixed(2));
                }
            }

             // Background scroll
             backgroundX -= gameSpeed * 0.5;
             if (assets.backgroundImage && backgroundX <= -assets.backgroundImage.width) {
                 backgroundX += assets.backgroundImage.width;
             }
        }


        // --- Draw Game ---
        function draw() {
            ctx.clearRect(0, 0, config.canvasWidth, config.canvasHeight);

             // Draw Background
             if (assets.backgroundImage) {
                 let currentX = backgroundX;
                 while (currentX < config.canvasWidth) {
                     ctx.drawImage(assets.backgroundImage, 0, 0, assets.backgroundImage.width, assets.backgroundImage.height,
                                   currentX, 0, assets.backgroundImage.width, config.canvasHeight - config.groundHeight);
                     currentX += assets.backgroundImage.width;
                 }
             } else { // Fallback
                 ctx.fillStyle = config.colors.blue;
                 ctx.fillRect(0, 0, config.canvasWidth, config.canvasHeight - config.groundHeight);
             }

            // Draw Player (with recovery flash)
            let drawPlayer = true;
            if (isRecovering && frameCount % 10 < 5) { drawPlayer = false; }
            if (drawPlayer) {
                if (assets.knightPlaceholder) { ctx.drawImage(assets.knightPlaceholder, playerState.x, playerState.y, playerState.width, playerState.height); }
                else { ctx.fillStyle = config.colors.green; ctx.fillRect(playerState.x, playerState.y, playerState.width, playerState.height); } // Fallback
            }

            // Draw Obstacles
            obstacles.forEach(obstacle => {
                const obstacleImage = assets[obstacle.typeKey];
                if (obstacleImage) { ctx.drawImage(obstacleImage, obstacle.x, obstacle.y, obstacle.width, obstacle.height); }
                else { ctx.fillStyle = config.colors.black; ctx.fillRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height); } // Fallback
            });

            // Draw Landmark Signs
            landmarks.forEach(landmark => {
                if (landmark.worldX < config.canvasWidth && landmark.worldX + landmark.width > 0) {
                    if (assets.signImage) { ctx.drawImage(assets.signImage, landmark.worldX, landmark.yPos, landmark.width, landmark.height); }
                    else { ctx.fillStyle = config.colors.ground; ctx.fillRect(landmark.worldX, landmark.yPos, landmark.width, landmark.height); } // Fallback
                }
            });
        }
        // --- END Draw Game ---


        // --- UI Updates ---
        function showGameOverScreen() { gameOverScreen.style.display = 'flex'; }
        function showWinScreen() { winScreen.style.display = 'flex'; }


        // --- Main Game Loop ---
        function gameLoop() {
            if (gameState !== 'running') { return; } // Stop loop if not running
            update();
            draw();
            requestAnimationFrame(gameLoop); // Continue loop
        }


        // --- Start Game ---
        loadAllAssets(); // Load assets, then calls resetGame()
        // --- END Start Game ---

    </script>

</body>
</html>
