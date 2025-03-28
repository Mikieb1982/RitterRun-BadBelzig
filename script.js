// --- Get DOM Elements ---
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreDisplay = document.getElementById('scoreDisplay');
const landmarkPopup = document.getElementById('landmarkPopup');
const landmarkName = document.getElementById('landmarkName');
const landmarkDescription = document.getElementById('landmarkDescription');
// const landmarkImage = document.getElementById('landmarkImage');
const continueButton = document.getElementById('continueButton');
const gameOverScreen = document.getElementById('gameOverScreen');
const winScreen = document.getElementById('winScreen');

// --- Game Configuration (Includes Stumble Tuning) ---
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
    stumbleDuration: 60,          // <<< How many frames stumble lasts
    stumbleSpeedMultiplier: 0.5, // <<< Speed multiplier during stumble
    // Bad Belzig Color Palette
    colors: {
        green: '#0ca644',
        blue: '#0296c6',
        yellow: '#f5d306',
        black: '#151513',
        white: '#ffffff'
    }
};

// --- Game State Variables (Includes Stumble Tracking) ---
let gameState = 'loading';
let playerState = {};
let obstacles = [];
let landmarks = [];
let currentLandmarkIndex = 0;
let score = 0;
let frameCount = 0;
let gameSpeed = config.obstacleSpeed; // Current speed, changes during stumble
let isJumpKeyDown = false;
let isStumbling = false;     // <<< Tracks if currently stumbling
let stumbleTimer = 0;        // <<< Timer for stumble duration

// --- Asset Loading ---
const assets = {
    // Asset keys
    knightPlaceholder: null,
    stonePlaceholder: null,
    backgroundImage: null,
    // Loading Progress Tracking
    loaded: 0,
    total: 0,
    sources: { // Asset paths
        knightPlaceholder: 'assets/knight_placeholder.png',
        stonePlaceholder: 'assets/stone_placeholder.png',
        backgroundImage: 'assets/background.png'
        // ... add paths for landmark images etc. here later
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
        assets[key] = img; // Store loaded image
        console.log(`Assets loaded: ${assets.loaded} / ${assets.total}`);
        if (assets.loaded === assets.total) {
            console.log("All assets loaded. Starting game...");
            resetGame(); // Start game when all loaded
        }
    };
    img.onerror = () => {
        console.error(`Failed to load asset: ${key} from ${src}`);
    };
}

// loadAllAssets function
function loadAllAssets() {
    console.log("Starting asset loading...");
    gameState = 'loading';
    assets.loaded = 0;
    assets.total = 0;
    for (const key in assets.sources) {
        loadImage(key, assets.sources[key]);
    }
    if (assets.total === 0) {
        console.warn("No assets defined. Starting game immediately...");
        resetGame();
    }
}
// --- END Asset Loading ---


// --- Landmark Data ---
const landmarkDefinitions = [
    // xTrigger values relate to displayed score (score / 10)
    { name: "SteinTherme", xTrigger: 100, descEN: "Relax in...", descDE: "Entspann dich...", imgKey: 'steinThermeImg' },
    { name: "Freibad", xTrigger: 200, descEN: "Cool off...", descDE: "Kühl dich...", imgKey: 'freibadImg' },
    { name: "Kulturzentrum & Bibliothek", xTrigger: 300, descEN: "This is the Kulturzentrum...", descDE: "Hier sind das Kulturzentrum...", imgKey: 'kulturzentrumImg'},
    { name: "Fläming Bahnhof", xTrigger: 400, descEN: "All aboard...", descDE: "Einsteigen bitte...", imgKey: 'bahnhofImg'},
    { name: "Postmeilensäule (1725)", xTrigger: 500, descEN: "See how far?...", descDE: "Schon gesehen?...", imgKey: 'postsaeuleImg'},
    { name: "Rathaus & Tourist-Information", xTrigger: 600, descEN: "This is the Rathaus...", descDE: "Das ist das Rathaus...", imgKey: 'rathausImg'},
    { name: "Burg Eisenhardt", xTrigger: 700, descEN: "You made it...", descDE: "Geschafft!...", imgKey: 'burgImg', isFinal: true },
];


// --- Player State Initialization (Bigger Knight) ---
function resetPlayer() {
    playerState = {
        x: 50,
        y: config.canvasHeight - config.groundHeight - 75, // Adjusted for height 75
        width: 60,  // Increased width
        height: 75, // Increased height
        vy: 0,
        isGrounded: true
    };
}


// --- Game Reset Function (Includes Stumble Reset) ---
function resetGame() {
    console.log("Resetting game...");
    resetPlayer();
    obstacles = [];
    landmarks = [...landmarkDefinitions];
    currentLandmarkIndex = 0;
    score = 0;
    frameCount = 0;
    gameSpeed = config.obstacleSpeed; // Reset to normal speed
    isJumpKeyDown = false;
    isStumbling = false;     // <<< Reset stumble state
    stumbleTimer = 0;        // <<< Reset stumble timer
    scoreDisplay.textContent = `Punkte / Score: 0`;
    gameOverScreen.style.display = 'none'; // Ensure Game Over screen is hidden
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
    } else if (gameState === 'gameOver' || gameState === 'win') { // Keep reset for overlays
        if (gameOverScreen.style.display !== 'none' || winScreen.style.display !== 'none') {
             resetGame();
        }
    }
    // No longer need gameOver check here as stumble replaces it
}

function hideLandmarkPopup() {
    if (gameState === 'paused') {
        landmarkPopup.style.display = 'none';
        gameState = 'running';
        requestAnimationFrame(gameLoop);
    }
}

// Event listeners (Keyboard)
window.addEventListener('keydown', (e) => {
    if (e.code === 'Space') {
        e.preventDefault();
        if (!isJumpKeyDown) { handleJump(); }
        isJumpKeyDown = true;
    } else if (e.key === 'Enter' || e.code === 'Enter') {
        e.preventDefault();
        if (gameState === 'paused' && landmarkPopup.style.display !== 'none') { hideLandmarkPopup(); }
        // Keep Enter for resetting on Win screen if desired
        else if (gameState === 'win' && winScreen.style.display !== 'none') { resetGame(); }
        // Enter no longer resets on Game Over as it doesn't happen
    }
});
window.addEventListener('keyup', (e) => {
     if (e.code === 'Space') { e.preventDefault(); isJumpKeyDown = false; }
});

// Touch / Mouse listeners
canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    if (gameState === 'running' || gameState === 'paused') { handleJump(); }
    // Keep reset for overlays
    else if (gameState === 'win' && winScreen.style.display !== 'none') { resetGame(); }
});
canvas.addEventListener('mousedown', (e) => { if (gameState === 'running') { handleJump(); } });
// gameOverScreen listener might become redundant, but keep for now if you repurpose it
gameOverScreen.addEventListener('click', resetGame); // Or remove if Game Over state is fully unused
winScreen.addEventListener('click', resetGame);
continueButton.addEventListener('click', hideLandmarkPopup);


// --- Collision Detection ---
function checkCollision(rect1, rect2) {
    // Simple AABB collision check
    return (
        rect1.x < rect2.x + rect2.width &&
        rect1.x + rect1.width > rect2.x &&
        rect1.y < rect2.y + rect2.height &&
        rect1.y + rect1.height > rect2.y
    );
}

// --- Obstacle Handling ---
function spawnObstacle() {
    const obstacleHeight = 15 + Math.random() * 10;
    const obstacleWidth = 10 + Math.random() * 8;
    obstacles.push({
        x: config.canvasWidth,
        y: config.canvasHeight - config.groundHeight - obstacleHeight,
        width: obstacleWidth,
        height: obstacleHeight
    });
}

function updateObstacles() {
    if (frameCount > 100 && frameCount % config.spawnRate === 0) { spawnObstacle(); }
    for (let i = obstacles.length - 1; i >= 0; i--) {
        obstacles[i].x -= gameSpeed; // Use current gameSpeed (could be slowed)
        if (obstacles[i].x + obstacles[i].width < 0) { obstacles.splice(i, 1); }
    }
}


// --- Landmark Handling ---
function checkLandmarks() {
    if (currentLandmarkIndex < landmarks.length) {
        const nextLandmark = landmarks[currentLandmarkIndex];
        const currentScore = Math.floor(score / 10);
        if (currentScore >= nextLandmark.xTrigger) {
            showLandmarkPopup(nextLandmark);
            if (nextLandmark.isFinal) { gameState = 'win'; showWinScreen(); }
            else { gameState = 'paused'; }
            currentLandmarkIndex++;
        }
    }
}

function showLandmarkPopup(landmark) {
    landmarkName.textContent = landmark.name;
    landmarkDescription.innerHTML = `${landmark.descEN}<br><br>${landmark.descDE}`;
    landmarkPopup.style.display = 'flex';
}


// --- Update Game State (Includes Variable Jump, Stomp, and Stumble Logic) ---
function update() {
    if (gameState !== 'running') return;
    frameCount++;

    // -- Manage Stumble State -- (Counts down timer, restores speed)
    if (isStumbling) {
        stumbleTimer--;
        if (stumbleTimer <= 0) {
            isStumbling = false;
            gameSpeed = config.obstacleSpeed; // Restore normal speed
            console.log("Stumble finished, speed restored.");
        }
    }
    // --- END Stumble Management ---


    // -- Player Physics -- (Variable Jump Logic included)
    let currentGravity = config.gravity;
    if (!playerState.isGrounded && playerState.vy < 0) { // If rising
        if (isJumpKeyDown) { currentGravity *= config.jumpHoldGravityMultiplier; } // Reduce gravity if holding
        else { currentGravity *= config.jumpCutGravityMultiplier; } // Increase if released
    }
    playerState.vy += currentGravity;
    playerState.y += playerState.vy;

    // -- Ground Collision -- Check BEFORE Obstacle Collision Check
    const groundLevel = config.canvasHeight - config.groundHeight - playerState.height;
    if (playerState.y >= groundLevel) {
        playerState.y = groundLevel;
        playerState.vy = 0;
        playerState.isGrounded = true;
    } else {
        playerState.isGrounded = false;
    }

    // -- Obstacles --
    updateObstacles(); // Move, spawn, remove obstacles using current gameSpeed

    // -- Collision Checks (MODIFIED: Stomp or Stumble, NO Game Over) --
    let didStompThisFrame = false;

    for (let i = obstacles.length - 1; i >= 0; i--) {
        const obstacle = obstacles[i];

        if (checkCollision(playerState, obstacle)) {
            const isFalling = playerState.vy > 0;
            const previousPlayerBottom = playerState.y + playerState.height - playerState.vy;
            const obstacleTop = obstacle.y;

            // Stomp Condition
            if (isFalling && previousPlayerBottom <= obstacleTop + 1) {
                console.log("Stomp detected!");
                playerState.vy = config.stompJumpStrength;
                playerState.y = obstacle.y - playerState.height;
                playerState.isGrounded = false; // Still airborne
                // Optional: obstacles.splice(i, 1); score += 50;
                didStompThisFrame = true;
                break; // Stomp one per frame

            } else if (!isStumbling && !didStompThisFrame) { // <<< Check if NOT already stumbling
                // --- Side/Bottom Collision -> Trigger Stumble ---
                console.log("Stumble Triggered!");
                isStumbling = true; // Set stumbling flag
                stumbleTimer = config.stumbleDuration; // Start stumble timer
                gameSpeed = config.obstacleSpeed * config.stumbleSpeedMultiplier; // Slow down game
                // Optional: Add visual/audio cue for stumble
                // Optional: Apply small knockback/bounce effect (e.g., playerState.vy = -2;)

                // NO Game Over state is set here anymore
            }
            // If already stumbling, side collisions are ignored in this loop iteration
        }
    }
    // --- END Collision Checks ---


    // -- Score --
    score++;
    scoreDisplay.textContent = `Punkte / Score: ${Math.floor(score / 10)}`;

    // -- Landmarks --
    checkLandmarks(); // Check last
}


// --- Draw Game ---
function draw() {
    ctx.clearRect(0, 0, config.canvasWidth, config.canvasHeight);

    // Draw Background
    if (assets.backgroundImage) {
        ctx.drawImage(assets.backgroundImage, 0, 0, config.canvasWidth, config.canvasHeight);
    } else { // Fallback
        ctx.fillStyle = config.colors.blue; ctx.fillRect(0, 0, config.canvasWidth, config.canvasHeight - config.groundHeight);
        ctx.fillStyle = config.colors.green; ctx.fillRect(0, config.canvasHeight - config.groundHeight, config.canvasWidth, config.groundHeight);
    }

    // Draw Player
    // Optional: Add visual effect if stumbling (e.g., change opacity)
    // if (isStumbling && frameCount % 10 < 5) { ctx.globalAlpha = 0.5; } // Flashing effect
    if (assets.knightPlaceholder) {
        ctx.drawImage(assets.knightPlaceholder, playerState.x, playerState.y, playerState.width, playerState.height);
    }
    // ctx.globalAlpha = 1.0; // Reset alpha if changed

    // Draw Obstacles
    obstacles.forEach(obstacle => {
        if (assets.stonePlaceholder) {
             ctx.drawImage(assets.stonePlaceholder, obstacle.x, obstacle.y, obstacle.width, obstacle.height);
        }
    });
}
// --- END Draw Game ---


// --- UI Updates ---
// showGameOverScreen might not be used anymore, keep showWinScreen
function showGameOverScreen() { gameOverScreen.style.display = 'flex'; } // Or remove if unused
function showWinScreen() { winScreen.style.display = 'flex'; }


// --- Main Game Loop ---
function gameLoop() {
    if (gameState !== 'running') { return; } // Stop loop if paused or won
    update();
    draw();
    requestAnimationFrame(gameLoop);
}


// --- Start Game ---
loadAllAssets();
// --- END Start Game ---
