// --- Get DOM Elements ---
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreDisplay = document.getElementById('scoreDisplay');
const landmarkPopup = document.getElementById('landmarkPopup');
const landmarkName = document.getElementById('landmarkName');
const landmarkDescription = document.getElementById('landmarkDescription');
// const landmarkImage = document.getElementById('landmarkImage'); // For images in popup
const continueButton = document.getElementById('continueButton');
const gameOverScreen = document.getElementById('gameOverScreen'); // May be unused
const winScreen = document.getElementById('winScreen');

// --- Game Configuration ---
const config = {
    canvasWidth: canvas.width,
    canvasHeight: canvas.height,
    gravity: 0.5,
    jumpStrength: -10,
    playerSpeed: 0, // Base horizontal speed (0 for auto-runner)
    obstacleSpeed: 3, // Normal obstacle/background speed
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
let isJumpKeyDown = false;
let isStumbling = false;
let stumbleTimer = 0;

// --- Asset Loading (Includes signImage) ---
const assets = {
    // Asset keys
    knightPlaceholder: null,
    stoneObstacle: null,
    familyObstacle: null,
    tractorObstacle: null,
    backgroundImage: null,
    signImage: null,         // <<< Added

    // Loading Progress Tracking
    loaded: 0,
    total: 0,
    sources: { // Asset paths
        knightPlaceholder: 'assets/knight_placeholder.png',
        stoneObstacle: 'assets/stones.png',
        familyObstacle: 'assets/family.png',
        tractorObstacle: 'assets/tractor.png',
        backgroundImage: 'assets/background.png',
        signImage: 'assets/sign.png' // <<< Added
    }
};

// loadImage function
function loadImage(key, src) {
    console.log(`Attempting to load: ${key} from ${src}`);
    assets.total++;
    const img = new Image();
    img.src = src;
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
    img.onerror = () => { console.error(`Failed to load asset: ${key} from ${src}`); };
}

// loadAllAssets function
function loadAllAssets() {
    console.log("Starting asset loading...");
    gameState = 'loading';
    assets.loaded = 0; assets.total = 0;
    for (const key in assets.sources) { loadImage(key, assets.sources[key]); }
    if (assets.total === 0) { console.warn("No assets defined..."); resetGame(); }
}
// --- END Asset Loading ---


// --- Landmark Data (NEW STRUCTURE - Position Based) ---
const landmarkConfig = [
    // worldX = position sign starts at (off-screen right)
    // width/height = size of sign graphic
    { name: "SteinTherme", worldX: 1500, width: 60, height: 90, descEN: "Relax in...", descDE: "Entspann dich...", isFinal: false },
    { name: "Freibad", worldX: 3000, width: 60, height: 90, descEN: "Cool off...", descDE: "Kühl dich...", isFinal: false },
    { name: "Kulturzentrum & Bibliothek", worldX: 4500, width: 60, height: 90, descEN: "This is the Kulturzentrum...", descDE: "Hier sind das Kulturzentrum...", isFinal: false },
    { name: "Fläming Bahnhof", worldX: 6000, width: 60, height: 90, descEN: "All aboard...", descDE: "Einsteigen bitte...", isFinal: false },
    { name: "Postmeilensäule (1725)", worldX: 7500, width: 60, height: 90, descEN: "See how far?...", descDE: "Schon gesehen?...", isFinal: false },
    { name: "Rathaus & Tourist-Information", worldX: 9000, width: 60, height: 90, descEN: "This is the Rathaus...", descDE: "Das ist das Rathaus...", isFinal: false },
    { name: "Burg Eisenhardt", worldX: 10500, width: 60, height: 90, descEN: "You made it...", descDE: "Geschafft!...", isFinal: true }, // Mark final
];

function initializeLandmarks() {
    // Create the active landmarks array from config, setting yPos and triggered state
    landmarks = landmarkConfig.map(cfg => ({
        ...cfg, // Copy name, worldX, width, height, descriptions, isFinal
        yPos: cfg.yPos || (config.canvasHeight - config.groundHeight - (cfg.height || 90)), // Default Y near ground
        hasBeenTriggered: false // Each landmark starts untriggered
    }));
}
// --- END Landmark Data ---


// --- Player State Initialization (Bigger Knight) ---
function resetPlayer() {
    playerState = {
        x: 50, // Knight's fixed X position on screen
        y: config.canvasHeight - config.groundHeight - 75,
        width: 60,
        height: 75,
        vy: 0,
        isGrounded: true
    };
}


// --- Game Reset Function (Initializes Landmarks) ---
function resetGame() {
    console.log("Resetting game...");
    resetPlayer();
    obstacles = [];
    initializeLandmarks(); // <<< Initialize/Reset landmarks
    score = 0;
    frameCount = 0;
    gameSpeed = config.obstacleSpeed;
    isJumpKeyDown = false;
    isStumbling = false;
    stumbleTimer = 0;
    scoreDisplay.textContent = `Punkte / Score: 0`;
    gameOverScreen.style.display = 'none';
    winScreen.style.display = 'none';
    landmarkPopup.style.display = 'none';
    gameState = 'running';
    requestAnimationFrame(gameLoop);
}

// --- Input Handling ---
function handleJump() {
    if (gameState === 'running' && playerState.isGrounded) {
        playerState.vy = config.jumpStrength;
        playerState.isGrounded = false;
    } else if (gameState === 'win' && winScreen.style.display !== 'none') { resetGame(); }
}
function hideLandmarkPopup() {
    if (gameState === 'paused') {
        landmarkPopup.style.display = 'none';
        gameState = 'running';
        requestAnimationFrame(gameLoop);
    }
}
// Event listeners
window.addEventListener('keydown', (e) => {
    if (e.code === 'Space') { e.preventDefault(); if (!isJumpKeyDown) { handleJump(); } isJumpKeyDown = true; }
    else if (e.key === 'Enter' || e.code === 'Enter') {
        e.preventDefault();
        if (gameState === 'paused' && landmarkPopup.style.display !== 'none') { hideLandmarkPopup(); }
        else if (gameState === 'win' && winScreen.style.display !== 'none') { resetGame(); }
    }
});
window.addEventListener('keyup', (e) => { if (e.code === 'Space') { e.preventDefault(); isJumpKeyDown = false; } });
canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    if (gameState === 'running' || gameState === 'paused') { handleJump(); }
    else if (gameState === 'win' && winScreen.style.display !== 'none') { resetGame(); }
});
canvas.addEventListener('mousedown', (e) => { if (gameState === 'running') { handleJump(); } });
gameOverScreen.addEventListener('click', resetGame);
winScreen.addEventListener('click', resetGame);
continueButton.addEventListener('click', hideLandmarkPopup);


// --- Collision Detection ---
function checkCollision(rect1, rect2) {
    return (
        rect1.x < rect2.x + rect2.width &&
        rect1.x + rect1.width > rect2.x &&
        rect1.y < rect2.y + rect2.height &&
        rect1.y + rect1.height > rect2.y
    );
}

// --- Obstacle Handling (Larger Sizes, Random Types) ---
const obstacleTypes = ['stoneObstacle', 'familyObstacle', 'tractorObstacle'];
function spawnObstacle() {
    const typeIndex = Math.floor(Math.random() * obstacleTypes.length);
    const selectedTypeKey = obstacleTypes[typeIndex];
    let obstacleHeight, obstacleWidth;
    switch (selectedTypeKey) { // Larger sizes
        case 'familyObstacle':  obstacleHeight = 80 + Math.random() * 30; obstacleWidth = 60 + Math.random() * 20; break;
        case 'tractorObstacle': obstacleHeight = 70 + Math.random() * 20; obstacleWidth = 100 + Math.random() * 30; break;
        case 'stoneObstacle': default: obstacleHeight = 30 + Math.random() * 20; obstacleWidth = 20 + Math.random() * 16; break;
    }
    obstacles.push({
        x: config.canvasWidth, y: config.canvasHeight - config.groundHeight - obstacleHeight,
        width: obstacleWidth, height: obstacleHeight, typeKey: selectedTypeKey
    });
}
function updateObstacles() {
    if (frameCount > 100 && frameCount % config.spawnRate === 0) { spawnObstacle(); }
    for (let i = obstacles.length - 1; i >= 0; i--) {
        obstacles[i].x -= gameSpeed;
        if (obstacles[i].x + obstacles[i].width < 0) { obstacles.splice(i, 1); }
    }
}
// --- END Obstacle Handling ---


// --- Landmark Display & Popup Trigger Function (Replaces checkLandmarks) ---
function showLandmarkPopup(landmark) {
    landmarkName.textContent = landmark.name;
    landmarkDescription.innerHTML = `${landmark.descEN}<br><br>${landmark.descDE}`;
    // Add image display logic here later if needed using landmark.imgKey
    landmarkPopup.style.display = 'flex';
}


// --- Update Game State ---
function update() {
    if (gameState !== 'running') return;
    frameCount++;

    // Manage Stumble State
    if (isStumbling) {
        stumbleTimer--;
        if (stumbleTimer <= 0) { isStumbling = false; gameSpeed = config.obstacleSpeed; console.log("Stumble finished."); }
    }

    // Player Physics (Variable Jump)
    let currentGravity = config.gravity;
    if (!playerState.isGrounded && playerState.vy < 0) { /* Variable jump gravity */
        if (isJumpKeyDown) { currentGravity *= config.jumpHoldGravityMultiplier; } else { currentGravity *= config.jumpCutGravityMultiplier; }
    }
    playerState.vy += currentGravity; playerState.y += playerState.vy;

    // Ground Collision
    const groundLevel = config.canvasHeight - config.groundHeight - playerState.height;
    if (playerState.y >= groundLevel) { playerState.y = groundLevel; playerState.vy = 0; playerState.isGrounded = true; }
    else { playerState.isGrounded = false; }

    // Obstacles
    updateObstacles();

    // Collision Checks (Stomp or Stumble)
    let didStompThisFrame = false;
    for (let i = obstacles.length - 1; i >= 0; i--) { /* Collision loop */
        const obstacle = obstacles[i];
        if (checkCollision(playerState, obstacle)) {
            const isFalling = playerState.vy > 0;
            const previousPlayerBottom = playerState.y + playerState.height - playerState.vy;
            const obstacleTop = obstacle.y;
            // Stomp Condition
            if (isFalling && previousPlayerBottom <= obstacleTop + 1) { /* Stomp */
                console.log("Stomp detected!"); playerState.vy = config.stompJumpStrength; playerState.y = obstacle.y - playerState.height; playerState.isGrounded = false;
                // Optional: obstacles.splice(i, 1); score += 50;
                didStompThisFrame = true; break;
            } else if (!isStumbling && !didStompThisFrame) { /* Side/Bottom Hit -> Stumble */
                console.log("Stumble Triggered! Score Penalty applied.");
                score -= 100; if (score < 0) { score = 0; } // Apply penalty
                isStumbling = true; stumbleTimer = config.stumbleDuration; gameSpeed = config.obstacleSpeed * config.stumbleSpeedMultiplier;
            }
        }
    }

    // -- Update Landmarks and Check Triggers -- (NEW SECTION - Replaces score check)
    for (let landmark of landmarks) {
        // Move landmark left
        landmark.worldX -= gameSpeed;

        // Check if sign reaches player and hasn't been triggered
        if (!landmark.hasBeenTriggered &&
            landmark.worldX < playerState.x + playerState.width && // Sign overlaps player horizontally
            landmark.worldX + landmark.width > playerState.x)
        {
            console.log(`Triggering landmark: ${landmark.name}`);
            landmark.hasBeenTriggered = true; // Trigger only once
            showLandmarkPopup(landmark);      // Show info

            if (landmark.isFinal) { gameState = 'win'; showWinScreen(); }
            else { gameState = 'paused'; } // Pause the game
            // Update loop will stop due to gameState change
        }
    }
    // --- END Landmark Update ---


    // Score (Continuous increment)
    score++;
    scoreDisplay.textContent = `Punkte / Score: ${Math.floor(score / 10)}`; // Update display
}


// --- Draw Game ---
function draw() {
    ctx.clearRect(0, 0, config.canvasWidth, config.canvasHeight);

    // Draw Background
    if (assets.backgroundImage) { ctx.drawImage(assets.backgroundImage, 0, 0, config.canvasWidth, config.canvasHeight); }
    else { /* Fallback colors */ ctx.fillStyle = config.colors.blue; ctx.fillRect(0, 0, config.canvasWidth, config.canvasHeight - config.groundHeight); ctx.fillStyle = config.colors.green; ctx.fillRect(0, config.canvasHeight - config.groundHeight, config.canvasWidth, config.groundHeight); }

    // Draw Player
    // Optional: Stumble visual effect
    // if (isStumbling && frameCount % 10 < 5) { ctx.globalAlpha = 0.5; }
    if (assets.knightPlaceholder) { ctx.drawImage(assets.knightPlaceholder, playerState.x, playerState.y, playerState.width, playerState.height); }
    // ctx.globalAlpha = 1.0; // Reset alpha

    // Draw Obstacles
    obstacles.forEach(obstacle => {
        const obstacleImage = assets[obstacle.typeKey];
        if (obstacleImage) { ctx.drawImage(obstacleImage, obstacle.x, obstacle.y, obstacle.width, obstacle.height); }
        else { /* Fallback rect */ ctx.fillStyle = config.colors.black; ctx.fillRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height); }
    });

    // --- Draw Landmark Signs --- (NEW SECTION)
    if (assets.signImage) {
        landmarks.forEach(landmark => {
            // Only draw if sign is on screen
            if (landmark.worldX < config.canvasWidth && landmark.worldX + landmark.width > 0) {
                ctx.drawImage(assets.signImage, landmark.worldX, landmark.yPos, landmark.width, landmark.height);
            }
        });
    }
    // --- END Landmark Sign Drawing ---
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
