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
    gravity: 0.5,
    jumpStrength: -10,
    playerSpeed: 0,
    obstacleSpeed: 3,
    groundHeight: 50,
    spawnRate: 150,
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
let gameSpeed = config.obstacleSpeed;

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
        console.log(`Assets loaded: ${assets.loaded} / ${assets.total}`); // Log progress
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


// --- Landmark Data (MODIFIED xTrigger values) ---
const landmarkDefinitions = [
    // xTrigger values now relate to the displayed score (score / 10)
    { name: "SteinTherme", xTrigger: 100, descEN: "Relax in the SteinTherme! Bad Belzig's unique thermal bath uses warm, salty water (Sole).", descDE: "Entspann dich in der SteinTherme! Bad Belzigs einzigartiges Thermalbad nutzt warmes Salzwasser (Sole).", imgKey: 'steinThermeImg' },
    { name: "Freibad", xTrigger: 200, descEN: "Cool off at the Freibad! This outdoor swimming pool is a popular spot in summer.", descDE: "Kühl dich ab im Freibad! Dieses Freibad ist im Sommer ein beliebter Treffpunkt.", imgKey: 'freibadImg' },
    { name: "Kulturzentrum & Bibliothek", xTrigger: 300, descEN: "This is the Kulturzentrum & Library on Weitzgrunder Str. 4, a hub for reading and local culture.", descDE: "Hier sind das Kulturzentrum & die Bibliothek in der Weitzgrunder Str. 4 – ein Zentrum für Lesen und lokale Kultur.", imgKey: 'kulturzentrumImg'},
    { name: "Fläming Bahnhof", xTrigger: 400, descEN: "All aboard at Fläming Bahnhof! This station connects Bad Belzig to Berlin and the region.", descDE: "Einsteigen bitte am Fläming Bahnhof! Dieser Bahnhof verbindet Bad Belzig mit Berlin und der Region.", imgKey: 'bahnhofImg'},
    { name: "Postmeilensäule (1725)", xTrigger: 500, descEN: "See how far? This Postal Milestone (Postmeilensäule) from 1725 shows historic travel distances.", descDE: "Schon gesehen? Diese Postmeilensäule von 1725 zeigt historische Reisedistanzen.", imgKey: 'postsaeuleImg'},
    { name: "Rathaus & Tourist-Information", xTrigger: 600, descEN: "This is the Rathaus (Town Hall), also home to the Tourist Information centre for Bad Belzig.", descDE: "Das ist das Rathaus, hier befindet sich auch die Tourist-Information von Bad Belzig.", imgKey: 'rathausImg'},
    { name: "Burg Eisenhardt", xTrigger: 700, descEN: "You made it to Burg Eisenhardt! This medieval castle overlooks the town and holds a museum.", descDE: "Geschafft! Du hast die Burg Eisenhardt erreicht! Diese mittelalterliche Burg überblickt die Stadt und beherbergt ein Museum.", imgKey: 'burgImg', isFinal: true },
];
// --- END Landmark Data ---


// --- Player State Initialization (MODIFIED size/position) ---
function resetPlayer() {
    playerState = {
        x: 50,
        // Adjust y slightly based on the new height
        y: config.canvasHeight - config.groundHeight - 75, // <<< Adjusted for height 75
        width: 60,  // <<< Increased width
        height: 75, // <<< Increased height
        vy: 0,
        isGrounded: true
        // currentFrame: 0,
        // frameTimer: 0
    };
}
// --- END Player State ---


// --- Game Reset Function ---
function resetGame() {
    console.log("Resetting game...");
    resetPlayer();
    obstacles = [];
    landmarks = [...landmarkDefinitions]; // Use fresh copy of landmarks
    currentLandmarkIndex = 0;
    score = 0;
    frameCount = 0;
    gameSpeed = config.obstacleSpeed;
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
        requestAnimationFrame(gameLoop);
    }
}

// Event listeners
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
    // Smaller stone dimensions
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
// --- END Obstacle Handling ---


// --- Landmark Handling ---
function checkLandmarks() {
    if (currentLandmarkIndex < landmarks.length) {
        const nextLandmark = landmarks[currentLandmarkIndex];
        // Compare DISPLAYED score to trigger
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
    // Add image display logic here later if needed
    landmarkPopup.style.display = 'flex';
}


// --- Update Game State ---
function update() {
    if (gameState !== 'running') return;
    frameCount++;

    // Player Physics
    playerState.vy += config.gravity;
    playerState.y += playerState.vy;
    const groundLevel = config.canvasHeight - config.groundHeight - playerState.height; // Use updated height
    if (playerState.y >= groundLevel) {
        playerState.y = groundLevel;
        playerState.vy = 0;
        playerState.isGrounded = true;
    } else {
        playerState.isGrounded = false;
    }

    // Obstacles
    updateObstacles();

    // Collision Checks
    for (const obstacle of obstacles) {
        if (checkCollision(playerState, obstacle)) {
            gameState = 'gameOver';
            showGameOverScreen();
            return;
        }
    }

    // Score
    score++;
    scoreDisplay.textContent = `Punkte / Score: ${Math.floor(score / 10)}`;

    // Landmarks
    checkLandmarks();
}


// --- Draw Game ---
function draw() {
    ctx.clearRect(0, 0, config.canvasWidth, config.canvasHeight);

    // Draw Background Image
    if (assets.backgroundImage) {
        ctx.drawImage(assets.backgroundImage, 0, 0, config.canvasWidth, config.canvasHeight);
    } else { // Fallback colors
        ctx.fillStyle = config.colors.blue;
        ctx.fillRect(0, 0, config.canvasWidth, config.canvasHeight - config.groundHeight);
        ctx.fillStyle = config.colors.green;
        ctx.fillRect(0, config.canvasHeight - config.groundHeight, config.canvasWidth, config.groundHeight);
    }

    // Draw Player (Using placeholder)
    if (assets.knightPlaceholder) {
        ctx.drawImage(assets.knightPlaceholder, playerState.x, playerState.y, playerState.width, playerState.height); // Uses updated width/height
    } // (optional fallback rect)

    // Draw Obstacles (Using placeholder)
    obstacles.forEach(obstacle => {
        if (assets.stonePlaceholder) {
             ctx.drawImage(assets.stonePlaceholder, obstacle.x, obstacle.y, obstacle.width, obstacle.height); // Uses updated width/height from spawn
        } // (optional fallback rect)
    });
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
    if (gameState !== 'running') {
        return;
    }
    update();
    draw();
    requestAnimationFrame(gameLoop);
}


// --- Start Game ---
// Calls asset loader, which calls resetGame when done.
loadAllAssets();
// --- END Start Game ---
