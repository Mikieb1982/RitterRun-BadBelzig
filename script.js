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

// --- Game Configuration (Includes Jump Tuning) ---
const config = {
    canvasWidth: canvas.width,
    canvasHeight: canvas.height,
    gravity: 0.5,
    jumpStrength: -10, // Initial upward force
    playerSpeed: 0,
    obstacleSpeed: 3,
    groundHeight: 50,
    spawnRate: 150,
    jumpHoldGravityMultiplier: 0.5, // Gravity multiplier while holding jump & rising
    jumpCutGravityMultiplier: 2.0,  // Gravity multiplier if jump released while rising
    // Bad Belzig Color Palette
    colors: {
        green: '#0ca644',
        blue: '#0296c6',
        yellow: '#f5d306',
        black: '#151513',
        white: '#ffffff'
    }
};

// --- Game State Variables (Includes Jump Key Tracking) ---
let gameState = 'loading';
let playerState = {};
let obstacles = [];
let landmarks = [];
let currentLandmarkIndex = 0;
let score = 0;
let frameCount = 0;
let gameSpeed = config.obstacleSpeed;
let isJumpKeyDown = false; // <<< Variable to track if jump key is held

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

// loadImage function (remains the same)
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

// loadAllAssets function (remains the same)
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


// --- Game Reset Function ---
function resetGame() {
    console.log("Resetting game...");
    resetPlayer();
    obstacles = [];
    landmarks = [...landmarkDefinitions];
    currentLandmarkIndex = 0;
    score = 0;
    frameCount = 0;
    gameSpeed = config.obstacleSpeed;
    isJumpKeyDown = false; // Reset jump key state on game reset
    scoreDisplay.textContent = `Punkte / Score: 0`;
    gameOverScreen.style.display = 'none';
    winScreen.style.display = 'none';
    landmarkPopup.style.display = 'none';
    gameState = 'running';
    requestAnimationFrame(gameLoop);
}

// --- Input Handling (MODIFIED for Jump Key Tracking) ---
function handleJump() {
    // Allow jump only if running and grounded (prevents double jump)
    if (gameState === 'running' && playerState.isGrounded) {
        playerState.vy = config.jumpStrength; // Apply initial jump velocity
        playerState.isGrounded = false;
        // Optional: Add jump sound effect
    } else if (gameState === 'gameOver' || gameState === 'win') {
        // Handle restart from overlays
        if (gameOverScreen.style.display !== 'none' || winScreen.style.display !== 'none') {
             resetGame();
        }
    }
}

function hideLandmarkPopup() {
    if (gameState === 'paused') {
        landmarkPopup.style.display = 'none';
        gameState = 'running';
        requestAnimationFrame(gameLoop); // Resume game loop
    }
}

// Event listeners
window.addEventListener('keydown', (e) => {
    if (e.code === 'Space') {
        e.preventDefault();
        if (!isJumpKeyDown) { // Trigger jump only on initial press if grounded
             handleJump();
        }
        isJumpKeyDown = true; // Set flag: key is being held
    }
    else if (e.key === 'Enter' || e.code === 'Enter') {
        e.preventDefault();
        if (gameState === 'paused' && landmarkPopup.style.display !== 'none') { hideLandmarkPopup(); }
        else if (gameState === 'gameOver' || gameState === 'win') { resetGame(); }
    }
});

// Add keyup listener for Space to track release
window.addEventListener('keyup', (e) => {
     if (e.code === 'Space') {
        e.preventDefault();
        isJumpKeyDown = false; // Clear flag: key is released
    }
});

// Touch / Mouse listeners (Note: Variable jump height for touch not implemented here)
canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    // This currently triggers a full jump strength jump on tap
    if (gameState === 'running' || gameState === 'paused') { handleJump(); }
    else if (gameState === 'gameOver' || gameState === 'win') { resetGame(); }
});
canvas.addEventListener('mousedown', (e) => { if (gameState === 'running') { handleJump(); } });
gameOverScreen.addEventListener('click', resetGame);
winScreen.addEventListener('click', resetGame);
continueButton.addEventListener('click', hideLandmarkPopup);
// --- END Input Handling ---


// --- Collision Detection ---
function checkCollision(rect1, rect2) {
    return (
        rect1.x < rect2.x + rect2.width &&
        rect1.x + rect1.width > rect2.x &&
        rect1.y < rect2.y + rect2.height &&
        rect1.y + rect1.height > rect2.y
    );
}

// --- Obstacle Handling (Smaller stones) ---
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
    if (frameCount > 100 && frameCount % config.spawnRate === 0) {
        spawnObstacle();
    }
    for (let i = obstacles.length - 1; i >= 0; i--) {
        obstacles[i].x -= gameSpeed;
        if (obstacles[i].x + obstacles[i].width < 0) {
            obstacles.splice(i, 1);
        }
    }
}


// --- Landmark Handling ---
function checkLandmarks() {
    if (currentLandmarkIndex < landmarks.length) {
        const nextLandmark = landmarks[currentLandmarkIndex];
        const currentScore = Math.floor(score / 10);
        if (currentScore >= nextLandmark.xTrigger) {
            showLandmarkPopup(nextLandmark);
            if (nextLandmark.isFinal) {
                gameState = 'win';
                showWinScreen();
            } else {
                 gameState = 'paused';
            }
            currentLandmarkIndex++;
        }
    }
}

function showLandmarkPopup(landmark) {
    landmarkName.textContent = landmark.name;
    landmarkDescription.innerHTML = `${landmark.descEN}<br><br>${landmark.descDE}`;
    landmarkPopup.style.display = 'flex';
}


// --- Update Game State (MODIFIED Physics for Variable Jump) ---
function update() {
    if (gameState !== 'running') return;
    frameCount++;

    // -- Player Physics --
    let currentGravity = config.gravity; // Start with normal gravity

    // Apply variable gravity based on jump state
    if (!playerState.isGrounded && playerState.vy < 0) { // If rising
        if (isJumpKeyDown) { // And jump key is held
            currentGravity *= config.jumpHoldGravityMultiplier; // Reduce gravity
        } else { // Jump key released while rising
            currentGravity *= config.jumpCutGravityMultiplier; // Increase gravity (cut jump short)
        }
    }

    // Apply calculated gravity & update position
    playerState.vy += currentGravity;
    playerState.y += playerState.vy;

    // Ground collision
    const groundLevel = config.canvasHeight - config.groundHeight - playerState.height;
    if (playerState.y >= groundLevel) {
        playerState.y = groundLevel;
        playerState.vy = 0;
        playerState.isGrounded = true;
    } else {
        playerState.isGrounded = false;
    }
    // --- END Player Physics Modification ---

    // Obstacles
    updateObstacles();

    // Collision Checks
    for (const obstacle of obstacles) {
        if (checkCollision(playerState, obstacle)) {
            gameState = 'gameOver';
            showGameOverScreen();
            return; // Stop update loop
        }
    }

    // Score
    score++;
    scoreDisplay.textContent = `Punkte / Score: ${Math.floor(score / 10)}`;

    // Landmarks
    checkLandmarks(); // Check last as it might change gameState
}


// --- Draw Game ---
function draw() {
    ctx.clearRect(0, 0, config.canvasWidth, config.canvasHeight);

    // Draw Background Image
    if (assets.backgroundImage) {
        ctx.drawImage(assets.backgroundImage, 0, 0, config.canvasWidth, config.canvasHeight);
    } else { // Fallback colors
        ctx.fillStyle = config.colors.blue; ctx.fillRect(0, 0, config.canvasWidth, config.canvasHeight - config.groundHeight);
        ctx.fillStyle = config.colors.green; ctx.fillRect(0, config.canvasHeight - config.groundHeight, config.canvasWidth, config.groundHeight);
    }

    // Draw Player (Using placeholder & updated size)
    if (assets.knightPlaceholder) {
        ctx.drawImage(assets.knightPlaceholder, playerState.x, playerState.y, playerState.width, playerState.height);
    }

    // Draw Obstacles (Using placeholder & updated size)
    obstacles.forEach(obstacle => {
        if (assets.stonePlaceholder) {
             ctx.drawImage(assets.stonePlaceholder, obstacle.x, obstacle.y, obstacle.width, obstacle.height);
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
    requestAnimationFrame(gameLoop);
}


// --- Start Game ---
// Calls asset loader, which calls resetGame when done.
loadAllAssets();
// --- END Start Game ---
