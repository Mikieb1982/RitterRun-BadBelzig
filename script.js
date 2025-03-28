// --- Get DOM Elements ---
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreDisplay = document.getElementById('scoreDisplay');
const landmarkPopup = document.getElementById('landmarkPopup');
const landmarkName = document.getElementById('landmarkName');
const landmarkDescription = document.getElementById('landmarkDescription');
// const landmarkImage = document.getElementById('landmarkImage');
const continueButton = document.getElementById('continueButton');
const gameOverScreen = document.getElementById('gameOverScreen'); // May be unused
const winScreen = document.getElementById('winScreen');

// --- Game Configuration ---
const config = {
    canvasWidth: canvas.width,
    canvasHeight: canvas.height,
    gravity: 0.5,
    jumpStrength: -10,
    playerSpeed: 0,
    obstacleSpeed: 3, // Normal speed
    groundHeight: 50,
    spawnRate: 150,
    jumpHoldGravityMultiplier: 0.5,
    jumpCutGravityMultiplier: 2.0,
    stompJumpStrength: -8,
    stumbleDuration: 60,
    stumbleSpeedMultiplier: 0.5,
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
let landmarks = []; // Populated by initializeLandmarks
let score = 0;
let frameCount = 0;
let gameSpeed = config.obstacleSpeed; // Current speed
let isJumpKeyDown = false;      // Tracks Spacebar hold
let isPointerDownJump = false; // <<< Tracks Mouse/Touch hold for jump
let isStumbling = false;
let stumbleTimer = 0;

// --- Asset Loading ---
const assets = {
    // Asset keys
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
function loadImage(key, src) {
    console.log(`Attempting to load: ${key} from ${src}`);
    assets.total++; const img = new Image(); img.src = src;
    img.onload = () => {
        console.log(`Successfully loaded: ${key}`); assets.loaded++; assets[key] = img;
        console.log(`Assets loaded: ${assets.loaded} / ${assets.total}`);
        if (assets.loaded === assets.total) { console.log("All assets loaded. Starting game..."); resetGame(); }
    };
    img.onerror = () => { console.error(`Failed to load asset: ${key} from ${src}`); };
}

// loadAllAssets function
function loadAllAssets() {
    console.log("Starting asset loading..."); gameState = 'loading';
    assets.loaded = 0; assets.total = 0;
    for (const key in assets.sources) { loadImage(key, assets.sources[key]); }
    if (assets.total === 0) { console.warn("No assets defined..."); resetGame(); }
}
// --- END Asset Loading ---


// --- Landmark Data ---
const landmarkConfig = [
    { name: "SteinTherme", worldX: 1500, width: 60, height: 90, descEN: "Relax in...", descDE: "Entspann dich...", isFinal: false },
    { name: "Freibad", worldX: 3000, width: 60, height: 90, descEN: "Cool off...", descDE: "Kühl dich...", isFinal: false },
    { name: "Kulturzentrum & Bibliothek", worldX: 4500, width: 60, height: 90, descEN: "This is the Kulturzentrum...", descDE: "Hier sind das Kulturzentrum...", isFinal: false },
    { name: "Fläming Bahnhof", worldX: 6000, width: 60, height: 90, descEN: "All aboard...", descDE: "Einsteigen bitte...", isFinal: false },
    { name: "Postmeilensäule (1725)", worldX: 7500, width: 60, height: 90, descEN: "See how far?...", descDE: "Schon gesehen?...", isFinal: false },
    { name: "Rathaus & Tourist-Information", worldX: 9000, width: 60, height: 90, descEN: "This is the Rathaus...", descDE: "Das ist das Rathaus...", isFinal: false },
    { name: "Burg Eisenhardt", worldX: 10500, width: 60, height: 90, descEN: "You made it...", descDE: "Geschafft!...", isFinal: true },
];
function initializeLandmarks() { /* ... initializes landmarks array ... */
    landmarks = landmarkConfig.map(cfg => ({ ...cfg, yPos: cfg.yPos || (config.canvasHeight - config.groundHeight - (cfg.height || 90)), hasBeenTriggered: false }));
}
// --- END Landmark Data ---


// --- Player State Initialization ---
function resetPlayer() { /* ... resets player properties ... */
    playerState = { x: 50, y: config.canvasHeight - config.groundHeight - 75, width: 60, height: 75, vy: 0, isGrounded: true };
}


// --- Game Reset Function ---
function resetGame() {
    console.log("Resetting game...");
    resetPlayer(); obstacles = []; initializeLandmarks(); score = 0; frameCount = 0;
    gameSpeed = config.obstacleSpeed;
    isJumpKeyDown = false;
    isPointerDownJump = false; // <<< Reset pointer flag
    isStumbling = false; stumbleTimer = 0;
    scoreDisplay.textContent = `Punkte / Score: 0`;
    gameOverScreen.style.display = 'none'; winScreen.style.display = 'none'; landmarkPopup.style.display = 'none';
    gameState = 'running';
    requestAnimationFrame(gameLoop);
}

// --- Input Handling (MODIFIED for Pointer Tracking) ---
function handleJump() { /* ... applies initial jump force ... */
    if (gameState === 'running' && playerState.isGrounded) { playerState.vy = config.jumpStrength; playerState.isGrounded = false; }
    else if (gameState === 'win' && winScreen.style.display !== 'none') { resetGame(); }
}
function hideLandmarkPopup() { /* ... hides landmark popup ... */
    if (gameState === 'paused') { landmarkPopup.style.display = 'none'; gameState = 'running'; requestAnimationFrame(gameLoop); }
}
// Keyboard listeners
window.addEventListener('keydown', (e) => { /* ... handles keydown ... */
    if (e.code === 'Space') { e.preventDefault(); if (!isJumpKeyDown) { handleJump(); } isJumpKeyDown = true; }
    else if (e.key === 'Enter' || e.code === 'Enter') { /* ... handles Enter ... */ }
});
window.addEventListener('keyup', (e) => { if (e.code === 'Space') { e.preventDefault(); isJumpKeyDown = false; } });

// Touch / Mouse listeners (MODIFIED to set pointer flag)
canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    if (gameState === 'running' || gameState === 'paused') {
        handleJump();
        isPointerDownJump = true; // <<< Set flag
    } else if (gameState === 'win' && winScreen.style.display !== 'none') { resetGame(); }
});
canvas.addEventListener('mousedown', (e) => {
    if (gameState === 'running') {
        handleJump();
        isPointerDownJump = true; // <<< Set flag
    }
});
// ADDED Global listeners to clear pointer flag
window.addEventListener('touchend', (e) => { isPointerDownJump = false; });
window.addEventListener('mouseup', (e) => { isPointerDownJump = false; });

// Overlay/Button listeners
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

    // Manage Stumble State
    if (isStumbling) { /* ... stumble timer logic ... */
        stumbleTimer--; if (stumbleTimer <= 0) { isStumbling = false; gameSpeed = config.obstacleSpeed; console.log("Stumble finished."); }
    }

    // -- Player Physics (MODIFIED for Variable Jump Pointer Check) --
    let currentGravity = config.gravity;
    if (!playerState.isGrounded && playerState.vy < 0) { // If rising
        // Apply reduced gravity if EITHER space OR mouse/touch is held
        if (isJumpKeyDown || isPointerDownJump) { // <<< MODIFIED THIS CONDITION
            currentGravity *= config.jumpHoldGravityMultiplier;
        } else { // Apply increased gravity if jump released while rising
            currentGravity *= config.jumpCutGravityMultiplier;
        }
    }
    playerState.vy += currentGravity; // Apply calculated gravity
    playerState.y += playerState.vy;  // Update position
    // --- END Player Physics Modification ---


    // Ground Collision
    const groundLevel = config.canvasHeight - config.groundHeight - playerState.height; /* ... ground check ... */
    if (playerState.y >= groundLevel) { playerState.y = groundLevel; playerState.vy = 0; playerState.isGrounded = true; } else { playerState.isGrounded = false; }

    // Obstacles
    updateObstacles();

    // Collision Checks (Stomp or Stumble + Score Penalty)
    let didStompThisFrame = false; /* ... collision logic ... */
    for (let i = obstacles.length - 1; i >= 0; i--) {
        const obstacle = obstacles[i]; if (checkCollision(playerState, obstacle)) {
            const isFalling = playerState.vy > 0; const previousPlayerBottom = playerState.y + playerState.height - playerState.vy; const obstacleTop = obstacle.y;
            if (isFalling && previousPlayerBottom <= obstacleTop + 1) { /* Stomp */ console.log("Stomp detected!"); playerState.vy = config.stompJumpStrength; playerState.y = obstacle.y - playerState.height; playerState.isGrounded = false; didStompThisFrame = true; break; }
            else if (!isStumbling && !didStompThisFrame) { /* Stumble */ console.log("Stumble Triggered! Score Penalty applied."); score -= 100; if (score < 0) { score = 0; } isStumbling = true; stumbleTimer = config.stumbleDuration; gameSpeed = config.obstacleSpeed * config.stumbleSpeedMultiplier; }
        }
    }

    // Update Landmarks and Check Triggers (Position Based)
    for (let landmark of landmarks) { /* ... landmark movement and trigger logic ... */
        landmark.worldX -= gameSpeed;
        if (!landmark.hasBeenTriggered && landmark.worldX < playerState.x + playerState.width && landmark.worldX + landmark.width > playerState.x) {
            console.log(`Triggering landmark: ${landmark.name}`); landmark.hasBeenTriggered = true; showLandmarkPopup(landmark);
            if (landmark.isFinal) { gameState = 'win'; showWinScreen(); } else { gameState = 'paused'; }
        }
    }

    // Score
    score++; scoreDisplay.textContent = `Punkte / Score: ${Math.floor(score / 10)}`;
}


// --- Draw Game ---
function draw() {
    ctx.clearRect(0, 0, config.canvasWidth, config.canvasHeight);

    // Draw Background
    if (assets.backgroundImage) { ctx.drawImage(assets.backgroundImage, 0, 0, config.canvasWidth, config.canvasHeight); }
    else { /* Fallback colors */ ctx.fillStyle = config.colors.blue; ctx.fillRect(0, 0, config.canvasWidth, config.canvasHeight - config.groundHeight); ctx.fillStyle = config.colors.green; ctx.fillRect(0, config.canvasHeight - config.groundHeight, config.canvasWidth, config.groundHeight); }

    // Draw Player
    if (assets.knightPlaceholder) { ctx.drawImage(assets.knightPlaceholder, playerState.x, playerState.y, playerState.width, playerState.height); }

    // Draw Obstacles
    obstacles.forEach(obstacle => { /* ... draw obstacle logic ... */
        const obstacleImage = assets[obstacle.typeKey]; if (obstacleImage) { ctx.drawImage(obstacleImage, obstacle.x, obstacle.y, obstacle.width, obstacle.height); }
        else { /* Fallback rect */ ctx.fillStyle = config.colors.black; ctx.fillRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height); }
    });

    // Draw Landmark Signs
    if (assets.signImage) { /* ... draw sign logic ... */
        landmarks.forEach(landmark => { if (landmark.worldX < config.canvasWidth && landmark.worldX + landmark.width > 0) { ctx.drawImage(assets.signImage, landmark.worldX, landmark.yPos, landmark.width, landmark.height); } });
    }
}
// --- END Draw Game ---


// --- UI Updates ---
function showGameOverScreen() { gameOverScreen.style.display = 'flex'; } // May be unused
function showWinScreen() { winScreen.style.display = 'flex'; }


// --- Main Game Loop ---
function gameLoop() {
    if (gameState !== 'running') { return; } // Stop loop if paused/won
    update();
    draw();
    requestAnimationFrame(gameLoop);
}


// --- Start Game ---
loadAllAssets();
// --- END Start Game ---
