// --- Get DOM Elements ---
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreDisplay = document.getElementById('scoreDisplay');
const landmarkPopup = document.getElementById('landmarkPopup');
const landmarkName = document.getElementById('landmarkName');
const landmarkDescription = document.getElementById('landmarkDescription');
// const landmarkImage = document.getElementById('landmarkImage');
const continueButton = document.getElementById('continueButton');
const gameOverScreen = document.getElementById('gameOverScreen'); // Used again
const winScreen = document.getElementById('winScreen');

// --- Game Configuration (Added max speed) ---
const config = {
    canvasWidth: canvas.width,
    canvasHeight: canvas.height,
    gravity: 0.5,
    jumpStrength: -10,
    playerSpeed: 0,
    obstacleSpeed: 3, // Starting speed
    groundHeight: 50,
    spawnRate: 150,
    jumpHoldGravityMultiplier: 0.5,
    jumpCutGravityMultiplier: 2.0,
    stompJumpStrength: -8,
    maxGameSpeed: 8, // <<< ADDED: Max speed limit
    // Bad Belzig Color Palette
    colors: {
        green: '#0ca644',
        blue: '#0296c6',
        yellow: '#f5d306',
        black: '#151513',
        white: '#ffffff'
    }
};

// --- Game State Variables ---
let gameState = 'loading';
let playerState = {};
let obstacles = [];
let landmarks = [];
let currentLandmarkIndex = 0;
let score = 0;
let frameCount = 0;
let gameSpeed = config.obstacleSpeed; // Current speed, increases over time
let isJumpKeyDown = false;
let isPointerDownJump = false;
// Stumble variables removed

// --- Asset Loading ---
const assets = {
    // Asset keys (using placeholders, no animation frames)
    knightPlaceholder: null, stoneObstacle: null, familyObstacle: null,
    tractorObstacle: null, backgroundImage: null, signImage: null,
    // Loading Progress Tracking
    loaded: 0, total: 0,
    sources: { // Asset paths
        knightPlaceholder: 'assets/knight_placeholder.png',
        stoneObstacle: 'assets/stones.png', familyObstacle: 'assets/family.png',
        tractorObstacle: 'assets/tractor.png', backgroundImage: 'assets/background.png',
        signImage: 'assets/sign.png'
    }
};

// loadImage function
function loadImage(key, src) { /* ... loads images ... */
    console.log(`Attempting to load: ${key} from ${src}`); assets.total++; const img = new Image(); img.src = src;
    img.onload = () => { console.log(`Successfully loaded: ${key}`); assets.loaded++; assets[key] = img; console.log(`Assets loaded: ${assets.loaded} / ${assets.total}`); if (assets.loaded === assets.total) { console.log("All assets loaded. Starting game..."); resetGame(); } };
    img.onerror = () => { console.error(`Failed to load asset: ${key} from ${src}`); };
}

// loadAllAssets function
function loadAllAssets() { /* ... starts loading ... */
    console.log("Starting asset loading..."); gameState = 'loading'; assets.loaded = 0; assets.total = 0; for (const key in assets.sources) { loadImage(key, assets.sources[key]); } if (assets.total === 0) { console.warn("No assets defined..."); resetGame(); }
}
// --- END Asset Loading ---


// --- Landmark Data ---
const landmarkConfig = [ /* ... landmark definitions with longer descriptions ... */
    { name: "SteinTherme", worldX: 1500, width: 60, height: 90, descEN: "Relax in...", descDE: "Entspann dich...", isFinal: false }, { name: "Freibad", worldX: 3000, width: 60, height: 90, descEN: "Cool off...", descDE: "Kühl dich...", isFinal: false }, { name: "Kulturzentrum & Bibliothek", worldX: 4500, width: 60, height: 90, descEN: "This building...", descDE: "Dieses Gebäude...", isFinal: false }, { name: "Fläming Bahnhof", worldX: 6000, width: 60, height: 90, descEN: "All aboard...", descDE: "Einsteigen bitte...", isFinal: false }, { name: "Postmeilensäule (1725)", worldX: 7500, width: 60, height: 90, descEN: "See how far?...", descDE: "Schon gesehen?...", isFinal: false }, { name: "Rathaus & Tourist-Information", worldX: 9000, width: 60, height: 90, descEN: "The historic Rathaus...", descDE: "Das historische Rathaus...", isFinal: false }, { name: "Burg Eisenhardt", worldX: 10500, width: 60, height: 90, descEN: "You made it...", descDE: "Geschafft!...", isFinal: true },
];
function initializeLandmarks() { /* ... initializes landmarks array ... */
    landmarks = landmarkConfig.map(cfg => ({ ...cfg, yPos: cfg.yPos || (config.canvasHeight - config.groundHeight - (cfg.height || 90)), hasBeenTriggered: false }));
}
// --- END Landmark Data ---


// --- Player State Initialization (Bigger Knight) ---
function resetPlayer() { /* ... resets player properties ... */
    playerState = { x: 50, y: config.canvasHeight - config.groundHeight - 75, width: 60, height: 75, vy: 0, isGrounded: true };
}


// --- Game Reset Function ---
function resetGame() {
    console.log("Resetting game...");
    resetPlayer(); obstacles = []; initializeLandmarks(); score = 0; frameCount = 0;
    gameSpeed = config.obstacleSpeed; // Reset speed
    isJumpKeyDown = false;
    isPointerDownJump = false;
    // Stumble variables removed
    scoreDisplay.textContent = `Punkte / Score: 0`;
    gameOverScreen.style.display = 'none'; winScreen.style.display = 'none'; landmarkPopup.style.display = 'none';
    gameState = 'running';
    requestAnimationFrame(gameLoop);
}

// --- Input Handling ---
function handleJump() { /* ... jump logic, includes reset from gameover/win ... */
    if (gameState === 'running' && playerState.isGrounded) { playerState.vy = config.jumpStrength; playerState.isGrounded = false; }
    else if (gameState === 'gameOver' && gameOverScreen.style.display !== 'none') { resetGame(); } else if (gameState === 'win' && winScreen.style.display !== 'none') { resetGame(); }
}
function hideLandmarkPopup() { /* ... hide popup logic ... */
    if (gameState === 'paused') { landmarkPopup.style.display = 'none'; gameState = 'running'; requestAnimationFrame(gameLoop); }
}
// Event listeners
window.addEventListener('keydown', (e) => { /* ... keydown logic, includes reset from gameover/win ... */
    if (e.code === 'Space') { e.preventDefault(); if (!isJumpKeyDown) { handleJump(); } isJumpKeyDown = true; }
    else if (e.key === 'Enter' || e.code === 'Enter') { e.preventDefault(); if (gameState === 'paused' && landmarkPopup.style.display !== 'none') { hideLandmarkPopup(); } else if (gameState === 'gameOver' && gameOverScreen.style.display !== 'none') { resetGame(); } else if (gameState === 'win' && winScreen.style.display !== 'none') { resetGame(); } }
});
window.addEventListener('keyup', (e) => { if (e.code === 'Space') { e.preventDefault(); isJumpKeyDown = false; } });
canvas.addEventListener('touchstart', (e) => { /* ... touchstart logic, includes reset from gameover/win ... */
    e.preventDefault(); if (gameState === 'running' || gameState === 'paused') { handleJump(); isPointerDownJump = true; } else if (gameState === 'gameOver' && gameOverScreen.style.display !== 'none') { resetGame(); } else if (gameState === 'win' && winScreen.style.display !== 'none') { resetGame(); }
});
canvas.addEventListener('mousedown', (e) => { if (gameState === 'running') { handleJump(); isPointerDownJump = true; } });
window.addEventListener('touchend', (e) => { isPointerDownJump = false; });
window.addEventListener('mouseup', (e) => { isPointerDownJump = false; });
gameOverScreen.addEventListener('click', resetGame); winScreen.addEventListener('click', resetGame); continueButton.addEventListener('click', hideLandmarkPopup);
// --- END Input Handling ---


// --- Collision Detection ---
function checkCollision(rect1, rect2) { /* ... AABB check ... */
    return (rect1.x < rect2.x + rect2.width && rect1.x + rect1.width > rect2.x && rect1.y < rect2.y + rect2.height && rect1.y + rect1.height > rect2.y);
}

// --- Obstacle Handling ---
const obstacleTypes = ['stoneObstacle', 'familyObstacle', 'tractorObstacle'];
function spawnObstacle() { /* ... spawn logic with larger sizes ... */
    const typeIndex = Math.floor(Math.random() * obstacleTypes.length); const selectedTypeKey = obstacleTypes[typeIndex]; let obstacleHeight, obstacleWidth;
    switch (selectedTypeKey) { /* size variations */ case 'familyObstacle': obstacleHeight = 80 + Math.random() * 30; obstacleWidth = 60 + Math.random() * 20; break; case 'tractorObstacle': obstacleHeight = 70 + Math.random() * 20; obstacleWidth = 100 + Math.random() * 30; break; case 'stoneObstacle': default: obstacleHeight = 30 + Math.random() * 20; obstacleWidth = 20 + Math.random() * 16; break; }
    console.log(`Spawning ${selectedTypeKey} - Size: ${obstacleWidth.toFixed(0)}x${obstacleHeight.toFixed(0)}`);
    obstacles.push({ x: config.canvasWidth, y: config.canvasHeight - config.groundHeight - obstacleHeight, width: obstacleWidth, height: obstacleHeight, typeKey: selectedTypeKey });
}
function updateObstacles() { /* ... update obstacle positions ... */
    if (frameCount > 100 && frameCount % config.spawnRate === 0) { spawnObstacle(); }
    for (let i = obstacles.length - 1; i >= 0; i--) { obstacles[i].x -= gameSpeed; if (obstacles[i].x + obstacles[i].width < 0) { obstacles.splice(i, 1); } }
}
// --- END Obstacle Handling ---


// --- Landmark Display & Popup Trigger Function ---
function showLandmarkPopup(landmark) { /* ... show popup logic ... */
    landmarkName.textContent = landmark.name; landmarkDescription.innerHTML = `${landmark.descEN}<br><br>${landmark.descDE}`; landmarkPopup.style.display = 'flex';
}


// --- Update Game State ---
function update() {
    if (gameState !== 'running') return;
    frameCount++;

    // --- Stumble Management REMOVED ---

    // -- Player Physics -- (Variable Jump Logic included)
    let currentGravity = config.gravity; /* ... variable jump gravity ... */
    if (!playerState.isGrounded && playerState.vy < 0) { if (isJumpKeyDown || isPointerDownJump) { currentGravity *= config.jumpHoldGravityMultiplier; } else { currentGravity *= config.jumpCutGravityMultiplier; } }
    playerState.vy += currentGravity; playerState.y += playerState.vy;

    // -- Ground Collision --
    const groundLevel = config.canvasHeight - config.groundHeight - playerState.height; /* ... ground check ... */
    if (playerState.y >= groundLevel) { playerState.y = groundLevel; playerState.vy = 0; playerState.isGrounded = true; } else { playerState.isGrounded = false; }

    // -- Obstacles --
    updateObstacles(); // Uses current gameSpeed

    // -- Collision Checks (MODIFIED: Breakable Stomp, Game Over on Vulnerable Hit) --
    for (let i = obstacles.length - 1; i >= 0; i--) { // Loop backwards because we might splice
        const obstacle = obstacles[i];
        if (checkCollision(playerState, obstacle)) {
            const isFalling = playerState.vy > 0;
            const previousPlayerBottom = playerState.y + playerState.height - playerState.vy;
            const obstacleTop = obstacle.y;

            // Stomp Condition (Safe bounce, remove obstacle)
            if (isFalling && previousPlayerBottom <= obstacleTop + 1) {
                console.log("Stomp detected!");
                playerState.vy = config.stompJumpStrength;
                playerState.y = obstacle.y - playerState.height;
                playerState.isGrounded = false; // Ensure not grounded

                obstacles.splice(i, 1); // <<< REMOVE stomped obstacle

                // Optional: score += 50;

                // Since we removed the item at index i, the next iteration
                // of the loop (with i--) will correctly check the next item
                // that shifted into the current index 'i'. No 'break' needed here
                // if we want potential multi-stomps, but usually not possible/desirable.
                // Let's proceed without break to be safe with splice.
                continue; // Skip to check next obstacle

            } else {
                 // Not a Stomp - Check if player is vulnerable (Grounded or Falling)
                 if (playerState.isGrounded || playerState.vy >= 0) {
                    // --- Vulnerable Collision -> Game Over ---
                    console.log("Game Over Collision Detected (Grounded or Falling)!");
                    gameState = 'gameOver';
                    showGameOverScreen(); // Show Game Over overlay
                    return; // Stop the update loop immediately
                 } else {
                    // --- Collision while Rising (vy < 0) ---
                    // Rule: Survive. Do nothing.
                    console.log("Collision ignored (Player rising).");
                 }
            }
        }
    }
    // --- END Collision Checks ---


    // -- Update Landmarks and Check Triggers -- (Position Based)
    for (let landmark of landmarks) { /* ... landmark movement and trigger logic ... */
        landmark.worldX -= gameSpeed;
        if (!landmark.hasBeenTriggered && landmark.worldX < playerState.x + playerState.width && landmark.worldX + landmark.width > playerState.x) {
            console.log(`Triggering landmark: ${landmark.name}`); landmark.hasBeenTriggered = true; showLandmarkPopup(landmark);
            if (landmark.isFinal) { gameState = 'win'; showWinScreen(); } else { gameState = 'paused'; }
        }
    }

    // -- Score --
    score++; scoreDisplay.textContent = `Punkte / Score: ${Math.floor(score / 10)}`;

    // -- Gradual Speed Increase -- (ADD THIS SECTION)
    // Increase speed every 300 frames (~5 seconds at 60fps), up to a max limit
    if (frameCount > 0 && frameCount % 300 === 0) {
        if (gameSpeed < config.maxGameSpeed) {
            gameSpeed += 0.1; // Increment speed slightly
            gameSpeed = parseFloat(gameSpeed.toFixed(2)); // Avoid floating point issues
            console.log("Speed Increased:", gameSpeed);
        }
    }
    // --- END Speed Increase ---
}


// --- Draw Game ---
function draw() {
    ctx.clearRect(0, 0, config.canvasWidth, config.canvasHeight);

    // Draw Background
    if (assets.backgroundImage) { ctx.drawImage(assets.backgroundImage, 0, 0, config.canvasWidth, config.canvasHeight); }
    else { /* Fallback colors */ }

    // Draw Player (Using placeholder)
    if (assets.knightPlaceholder) { ctx.drawImage(assets.knightPlaceholder, playerState.x, playerState.y, playerState.width, playerState.height); }

    // Draw Obstacles
    obstacles.forEach(obstacle => { /* ... draw obstacle logic ... */
        const obstacleImage = assets[obstacle.typeKey]; if (obstacleImage) { ctx.drawImage(obstacleImage, obstacle.x, obstacle.y, obstacle.width, obstacle.height); } else { /* Fallback rect */ }
    });

    // Draw Landmark Signs
    if (assets.signImage) { /* ... draw sign logic ... */
        landmarks.forEach(landmark => { if (landmark.worldX < config.canvasWidth && landmark.worldX + landmark.width > 0) { ctx.drawImage(assets.signImage, landmark.worldX, landmark.yPos, landmark.width, landmark.height); } });
    }
}
// --- END Draw Game ---


// --- UI Updates ---
function showGameOverScreen() { gameOverScreen.style.display = 'flex'; } // Shows Game Over
function showWinScreen() { winScreen.style.display = 'flex'; }


// --- Main Game Loop ---
function gameLoop() { /* ... checks state and calls update/draw ... */
    if (gameState === 'paused' || gameState === 'gameOver' || gameState === 'win') { return; }
    if (gameState === 'running') { update(); draw(); requestAnimationFrame(gameLoop); }
}


// --- Start Game ---
loadAllAssets(); // Initiates loading, calls resetGame on completion
// --- END Start Game ---

