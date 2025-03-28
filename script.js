// --- Get DOM Elements ---
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreDisplay = document.getElementById('scoreDisplay');
const landmarkPopup = document.getElementById('landmarkPopup');
const landmarkName = document.getElementById('landmarkName');
const landmarkDescription = document.getElementById('landmarkDescription');
// const landmarkImage = document.getElementById('landmarkImage'); // Uncomment if using image in popup
const continueButton = document.getElementById('continueButton');
const gameOverScreen = document.getElementById('gameOverScreen');
const winScreen = document.getElementById('winScreen');

// --- Game Configuration ---
const config = {
    canvasWidth: canvas.width,
    canvasHeight: canvas.height,
    gravity: 0.5, // Adjust for desired jump feel
    jumpStrength: -10, // Negative value for upward velocity
    playerSpeed: 0, // Knight doesn't move horizontally relative to screen
    obstacleSpeed: 3, // How fast obstacles move towards the player
    groundHeight: 50, // Height of the ground area from the bottom
    spawnRate: 150, // Lower number = more frequent obstacles (frames)
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
let gameState = 'loading'; // 'loading', 'running', 'paused', 'gameOver', 'win'
let playerState = {};
let obstacles = [];
let landmarks = []; // Will hold landmark data
let currentLandmarkIndex = 0;
let score = 0;
let frameCount = 0;
let gameSpeed = config.obstacleSpeed; // Can increase over time if desired

// --- Asset Loading (Includes background image) ---
const assets = {
    // Asset keys
    knightPlaceholder: null,
    stonePlaceholder: null,
    backgroundImage: null, // <<< Added for background image

    // Loading Progress Tracking
    loaded: 0,
    total: 0,
    sources: { // Asset paths
        knightPlaceholder: 'assets/knight_placeholder.png',
        stonePlaceholder: 'assets/stone_placeholder.png',
        backgroundImage: 'assets/background.png' // <<< Added background image path
        // ... add paths for landmark images etc. here later
    }
};

// Updated loadImage function
function loadImage(key, src) {
    console.log(`Attempting to load: ${key} from ${src}`);
    assets.total++;
    const img = new Image();
    img.src = src;
    img.onload = () => {
        console.log(`Successfully loaded: ${key}`);
        assets.loaded++;
        assets[key] = img; // Store loaded image
        // Check if all assets are loaded
        if (assets.loaded === assets.total) {
            console.log("All assets loaded. Starting game...");
            resetGame(); // Start game when all loaded
        }
    };
    img.onerror = () => {
        console.error(`Failed to load asset: ${key} from ${src}`);
    };
}

// Function to start loading all defined assets
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
    // Adjust xTrigger values based on score/distance goals
    { name: "SteinTherme", xTrigger: 1000, descEN: "Relax in the SteinTherme! Bad Belzig's unique thermal bath uses warm, salty water (Sole).", descDE: "Entspann dich in der SteinTherme! Bad Belzigs einzigartiges Thermalbad nutzt warmes Salzwasser (Sole).", imgKey: 'steinThermeImg' },
    { name: "Freibad", xTrigger: 2000, descEN: "Cool off at the Freibad! This outdoor swimming pool is a popular spot in summer.", descDE: "Kühl dich ab im Freibad! Dieses Freibad ist im Sommer ein beliebter Treffpunkt.", imgKey: 'freibadImg' },
    { name: "Kulturzentrum & Bibliothek", xTrigger: 3000, descEN: "This is the Kulturzentrum & Library on Weitzgrunder Str. 4, a hub for reading and local culture.", descDE: "Hier sind das Kulturzentrum & die Bibliothek in der Weitzgrunder Str. 4 – ein Zentrum für Lesen und lokale Kultur.", imgKey: 'kulturzentrumImg'},
    { name: "Fläming Bahnhof", xTrigger: 4000, descEN: "All aboard at Fläming Bahnhof! This station connects Bad Belzig to Berlin and the region.", descDE: "Einsteigen bitte am Fläming Bahnhof! Dieser Bahnhof verbindet Bad Belzig mit Berlin und der Region.", imgKey: 'bahnhofImg'},
    { name: "Postmeilensäule (1725)", xTrigger: 5000, descEN: "See how far? This Postal Milestone (Postmeilensäule) from 1725 shows historic travel distances.", descDE: "Schon gesehen? Diese Postmeilensäule von 1725 zeigt historische Reisedistanzen.", imgKey: 'postsaeuleImg'},
    { name: "Rathaus & Tourist-Information", xTrigger: 6000, descEN: "This is the Rathaus (Town Hall), also home to the Tourist Information centre for Bad Belzig.", descDE: "Das ist das Rathaus, hier befindet sich auch die Tourist-Information von Bad Belzig.", imgKey: 'rathausImg'},
    { name: "Burg Eisenhardt", xTrigger: 7000, descEN: "You made it to Burg Eisenhardt! This medieval castle overlooks the town and holds a museum.", descDE: "Geschafft! Du hast die Burg Eisenhardt erreicht! Diese mittelalterliche Burg überblickt die Stadt und beherbergt ein Museum.", imgKey: 'burgImg', isFinal: true },
];


// --- Player State Initialization ---
function resetPlayer() {
    playerState = {
        x: 50,
        y: config.canvasHeight - config.groundHeight - 50, // Start above ground
        width: 40, // Adjust to your knight sprite size
        height: 50, // Adjust to your knight sprite size
        vy: 0, // Vertical velocity
        isGrounded: true
        // currentFrame: 0, // For animation later
        // frameTimer: 0
    };
}

// --- Game Reset Function ---
function resetGame() {
    console.log("Resetting game...");
    resetPlayer();
    obstacles = [];
    landmarks = [...landmarkDefinitions]; // Reset landmark triggers
    currentLandmarkIndex = 0;
    score = 0;
    frameCount = 0;
    gameSpeed = config.obstacleSpeed;
    scoreDisplay.textContent = `Punkte / Score: 0`;
    gameOverScreen.style.display = 'none';
    winScreen.style.display = 'none';
    landmarkPopup.style.display = 'none';
    gameState = 'running'; // Set state AFTER reset
    requestAnimationFrame(gameLoop); // Start the game loop
}

// --- Input Handling ---
function handleJump() {
    if (gameState === 'running' && playerState.isGrounded) {
        playerState.vy = config.jumpStrength;
        playerState.isGrounded = false;
    } else if (gameState === 'gameOver' || gameState === 'win') {
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

// Event listeners (Keyboard, Touch, Mouse, Button, Overlays)
window.addEventListener('keydown', (e) => {
    if (e.code === 'Space') { e.preventDefault(); handleJump(); }
    else if (e.key === 'Enter' || e.code === 'Enter') {
        e.preventDefault();
        if (gameState === 'paused' && landmarkPopup.style.display !== 'none') { hideLandmarkPopup(); }
        else if (gameState === 'gameOver' || gameState === 'win') { resetGame(); }
    }
});
canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    if (gameState === 'running' || gameState === 'paused') { handleJump(); }
    else if (gameState === 'gameOver' || gameState === 'win') { resetGame(); }
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

// --- Obstacle Handling (Spawns smaller stones) ---
function spawnObstacle() {
    // --- Smaller stone dimensions --- (MODIFIED)
    const obstacleHeight = 15 + Math.random() * 10; // e.g., height 15-25px
    const obstacleWidth = 10 + Math.random() * 8;  // e.g., width 10-18px
    // --- END modification ---

    obstacles.push({
        x: config.canvasWidth,
        y: config.canvasHeight - config.groundHeight - obstacleHeight, // Position based on height
        width: obstacleWidth,
        height: obstacleHeight
    });
}

function updateObstacles() {
    // Spawn new obstacles periodically
    if (frameCount > 100 && frameCount % config.spawnRate === 0) { // Start spawning after ~1.5s
        spawnObstacle();
    }
    // Move and remove off-screen obstacles
    for (let i = obstacles.length - 1; i >= 0; i--) {
        obstacles[i].x -= gameSpeed;
        if (obstacles[i].x + obstacles[i].width < 0) {
            obstacles.splice(i, 1);
        }
    }
}
// --- END Obstacle Handling ---


// --- Landmark Handling ---
function checkLandmarks() {
    if (currentLandmarkIndex < landmarks.length) {
        const nextLandmark = landmarks[currentLandmarkIndex];
        const currentScore = Math.floor(score / 10); // Use displayed score
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
    // Add logic here later to display landmark image if loaded via assets[landmark.imgKey]
    landmarkPopup.style.display = 'flex';
}


// --- Update Game State ---
function update() {
    if (gameState !== 'running') return; // Only run updates if game is 'running'
    frameCount++;

    // Player Physics (Gravity, Ground Check)
    playerState.vy += config.gravity;
    playerState.y += playerState.vy;
    const groundLevel = config.canvasHeight - config.groundHeight - playerState.height;
    if (playerState.y >= groundLevel) {
        playerState.y = groundLevel;
        playerState.vy = 0;
        playerState.isGrounded = true;
    } else {
        playerState.isGrounded = false;
    }
    // Add animation updates later

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

    // Landmarks (Check last, as it can pause/end the game)
    checkLandmarks();
}


// --- Draw Game (Draws background image) ---
function draw() {
    // Clear canvas
    ctx.clearRect(0, 0, config.canvasWidth, config.canvasHeight);

    // --- Draw Background Image --- (MODIFIED)
    if (assets.backgroundImage) { // Draw image if loaded
        ctx.drawImage(assets.backgroundImage, 0, 0, config.canvasWidth, config.canvasHeight);
    } else { // Fallback colors if image not loaded
        ctx.fillStyle = config.colors.blue; // Sky
        ctx.fillRect(0, 0, config.canvasWidth, config.canvasHeight - config.groundHeight);
        ctx.fillStyle = config.colors.green; // Ground
        ctx.fillRect(0, config.canvasHeight - config.groundHeight, config.canvasWidth, config.groundHeight);
    }
    // --- END Background Image Drawing ---

    // --- Draw Player --- (Using placeholder)
    if (assets.knightPlaceholder) {
        ctx.drawImage(assets.knightPlaceholder, playerState.x, playerState.y, playerState.width, playerState.height);
    } // ... (optional fallback rect)

    // --- Draw Obstacles --- (Using placeholder)
    obstacles.forEach(obstacle => {
        if (assets.stonePlaceholder) {
             ctx.drawImage(assets.stonePlaceholder, obstacle.x, obstacle.y, obstacle.width, obstacle.height);
        } // ... (optional fallback rect)
    });

    // Draw Landmarks visually (Optional advanced feature)
}
// --- END Draw Game ---


// --- UI Updates ---
function showGameOverScreen() {
    gameOverScreen.style.display = 'flex';
}
function showWinScreen() {
    winScreen.style.display = 'flex';
}


// --- Main Game Loop ---
function gameLoop() {
    if (gameState !== 'running') { // Stop loop if not running
        // console.log(`Game loop stopping. State: ${gameState}`); // Optional debug
        return;
    }
    update(); // Update logic
    draw();   // Draw frame
    requestAnimationFrame(gameLoop); // Request next frame
}


// --- Start Game ---
// Call loadAllAssets() to initiate loading. resetGame() is called by the loader.
loadAllAssets();
// --- END Start Game ---
