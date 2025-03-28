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
let landmarks = [];
let currentLandmarkIndex = 0;
let score = 0;
let frameCount = 0;
let gameSpeed = config.obstacleSpeed; // Current speed
let isJumpKeyDown = false;
let isStumbling = false;
let stumbleTimer = 0;

// --- Asset Loading ---
const assets = {
    // Asset keys
    knightPlaceholder: null,
    stoneObstacle: null,
    familyObstacle: null,
    tractorObstacle: null,
    backgroundImage: null,

    // Loading Progress Tracking
    loaded: 0,
    total: 0,
    sources: { // Asset paths
        knightPlaceholder: 'assets/knight_placeholder.png',
        stoneObstacle: 'assets/stones.png',
        familyObstacle: 'assets/family.png',
        tractorObstacle: 'assets/tractor.png',
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


// --- Landmark Data (Longer Descriptions) ---
const landmarkDefinitions = [
    { name: "SteinTherme", xTrigger: 100, descEN: "Relax in the SteinTherme! Bad Belzig's unique thermal bath uses warm, salty water (Sole). Its iodine-rich water is great for health, and there's an extensive sauna world.", descDE: "Entspann dich in der SteinTherme! Bad Belzigs einzigartiges Thermalbad nutzt warmes Salzwasser (Sole). Das jodhaltige Wasser ist gut für die Gesundheit und es gibt eine große Saunawelt.", imgKey: 'steinThermeImg' },
    { name: "Freibad", xTrigger: 200, descEN: "Cool off at the Freibad! This outdoor swimming pool is a popular spot in summer. Features include water slides and areas for children, perfect for sunny days.", descDE: "Kühl dich ab im Freibad! Dieses Freibad ist im Sommer ein beliebter Treffpunkt. Es gibt Wasserrutschen und Bereiche für Kinder, perfekt für sonnige Tage.", imgKey: 'freibadImg' },
    { name: "Kulturzentrum & Bibliothek", xTrigger: 300, descEN: "This is the Kulturzentrum & Library on Weitzgrunder Str. 4, a hub for reading and local culture. Look out for concerts, readings, and theatre events.", descDE: "Hier sind das Kulturzentrum & die Bibliothek in der Weitzgrunder Str. 4 – ein Zentrum für Lesen und lokale Kultur. Achten Sie auf Konzerte, Lesungen und Theaterveranstaltungen.", imgKey: 'kulturzentrumImg'},
    { name: "Fläming Bahnhof", xTrigger: 400, descEN: "All aboard at Fläming Bahnhof! This station connects Bad Belzig to Berlin and the region. It's also a key access point to the Hoher Fläming nature park.", descDE: "Einsteigen bitte am Fläming Bahnhof! Dieser Bahnhof verbindet Bad Belzig mit Berlin und der Region. Er ist auch ein wichtiger Zugangspunkt zum Naturpark Hoher Fläming.", imgKey: 'bahnhofImg'},
    { name: "Postmeilensäule (1725)", xTrigger: 500, descEN: "See how far? This Postal Milestone (Postmeilensäule) from 1725 shows historic travel distances. Erected under August the Strong, it marked postal routes in hours.", descDE: "Schon gesehen? Diese Postmeilensäule von 1725 zeigt historische Reisedistanzen. Errichtet unter August dem Starken, markierte sie Postrouten in Stunden.", imgKey: 'postsaeuleImg'},
    { name: "Rathaus & Tourist-Information", xTrigger: 600, descEN: "This is the Rathaus (Town Hall), also home to the Tourist Information centre. Get maps, event info, and tips for exploring Bad Belzig here.", descDE: "Das ist das Rathaus, hier befindet sich auch die Tourist-Information. Hier erhalten Sie Karten, Veranstaltungsinformationen und Tipps zur Erkundung von Bad Belzig.", imgKey: 'rathausImg'},
    { name: "Burg Eisenhardt", xTrigger: 700, descEN: "You made it to Burg Eisenhardt! This medieval castle overlooks the town and holds a museum. Explore local history exhibits and enjoy the view from the keep.", descDE: "Geschafft! Du hast die Burg Eisenhardt erreicht! Diese mittelalterliche Burg überblickt die Stadt und beherbergt ein Museum. Erkunden Sie lokale Geschichtsausstellungen und genießen Sie die Aussicht vom Bergfried.", imgKey: 'burgImg', isFinal: true },
];
// --- END Landmark Data ---


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
    gameSpeed = config.obstacleSpeed; // Reset to normal speed
    isJumpKeyDown = false;
    isStumbling = false;     // Reset stumble state
    stumbleTimer = 0;        // Reset stumble timer
    scoreDisplay.textContent = `Punkte / Score: 0`;
    gameOverScreen.style.display = 'none'; // Hide Game Over screen if it exists
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
    } else if (gameState === 'win' && winScreen.style.display !== 'none') { // Reset on win
         resetGame();
    }
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
    if (e.code === 'Space') { e.preventDefault(); if (!isJumpKeyDown) { handleJump(); } isJumpKeyDown = true; }
    else if (e.key === 'Enter' || e.code === 'Enter') {
        e.preventDefault();
        if (gameState === 'paused' && landmarkPopup.style.display !== 'none') { hideLandmarkPopup(); }
        else if (gameState === 'win' && winScreen.style.display !== 'none') { resetGame(); }
    }
});
window.addEventListener('keyup', (e) => { if (e.code === 'Space') { e.preventDefault(); isJumpKeyDown = false; } });

// Touch / Mouse listeners
canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    if (gameState === 'running' || gameState === 'paused') { handleJump(); }
    else if (gameState === 'win' && winScreen.style.display !== 'none') { resetGame(); }
});
canvas.addEventListener('mousedown', (e) => { if (gameState === 'running') { handleJump(); } });
gameOverScreen.addEventListener('click', resetGame); // Keep if useful
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

// --- Obstacle Handling (MODIFIED for bigger sizes) ---
const obstacleTypes = ['stoneObstacle', 'familyObstacle', 'tractorObstacle']; // Array of asset keys

function spawnObstacle() {
    // 1. Randomly choose an obstacle type
    const typeIndex = Math.floor(Math.random() * obstacleTypes.length);
    const selectedTypeKey = obstacleTypes[typeIndex];

    let obstacleHeight, obstacleWidth;

    // 2. Set size based on type (Ranges roughly doubled - ADJUST AS NEEDED!)
    switch (selectedTypeKey) {
        case 'familyObstacle':
            // Was: H=40-55, W=30-40
            obstacleHeight = 80 + Math.random() * 30; // Example: ~80-110px tall
            obstacleWidth = 60 + Math.random() * 20;  // Example: ~60-80px wide
            break;
        case 'tractorObstacle':
            // Was: H=35-45, W=50-65
            obstacleHeight = 70 + Math.random() * 20; // Example: ~70-90px tall
            obstacleWidth = 100 + Math.random() * 30; // Example: ~100-130px wide
            break;
        case 'stoneObstacle':
        default: // Default to stone size
            // Was: H=15-25, W=10-18
            obstacleHeight = 30 + Math.random() * 20; // Example: ~30-50px tall
            obstacleWidth = 20 + Math.random() * 16;  // Example: ~20-36px wide
            break;
    }

    // 3. Create obstacle object (position calculation uses new height)
    obstacles.push({
        x: config.canvasWidth,
        y: config.canvasHeight - config.groundHeight - obstacleHeight, // Position correctly
        width: obstacleWidth,
        height: obstacleHeight,
        typeKey: selectedTypeKey
    });
}
// updateObstacles function remains the same
function updateObstacles() {
    if (frameCount > 100 && frameCount % config.spawnRate === 0) { spawnObstacle(); }
    for (let i = obstacles.length - 1; i >= 0; i--) {
        obstacles[i].x -= gameSpeed; // Use current gameSpeed
        if (obstacles[i].x + obstacles[i].width < 0) { obstacles.splice(i, 1); }
    }
}
// --- END Obstacle Handling ---


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


// --- Update Game State ---
function update() {
    if (gameState !== 'running') return;
    frameCount++;

    // Manage Stumble State
    if (isStumbling) {
        stumbleTimer--;
        if (stumbleTimer <= 0) {
            isStumbling = false;
            gameSpeed = config.obstacleSpeed; // Restore speed
            console.log("Stumble finished.");
        }
    }

    // Player Physics (Variable Jump)
    let currentGravity = config.gravity;
    if (!playerState.isGrounded && playerState.vy < 0) {
        if (isJumpKeyDown) { currentGravity *= config.jumpHoldGravityMultiplier; }
        else { currentGravity *= config.jumpCutGravityMultiplier; }
    }
    playerState.vy += currentGravity;
    playerState.y += playerState.vy;

    // Ground Collision
    const groundLevel = config.canvasHeight - config.groundHeight - playerState.height;
    if (playerState.y >= groundLevel) {
        playerState.y = groundLevel;
        playerState.vy = 0;
        playerState.isGrounded = true;
    } else {
        playerState.isGrounded = false;
    }

    // Obstacles
    updateObstacles();

    // Collision Checks (Stomp or Stumble)
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
                playerState.isGrounded = false;
                // Optional: obstacles.splice(i, 1); score += 50;
                didStompThisFrame = true;
                break;

            } else if (!isStumbling && !didStompThisFrame) { // Side/Bottom hit, not already stumbling
                // Trigger Stumble
                console.log("Stumble Triggered!");
                isStumbling = true;
                stumbleTimer = config.stumbleDuration;
                gameSpeed = config.obstacleSpeed * config.stumbleSpeedMultiplier;
            }
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

    // Draw Background
    if (assets.backgroundImage) {
        ctx.drawImage(assets.backgroundImage, 0, 0, config.canvasWidth, config.canvasHeight);
    } else { // Fallback
        ctx.fillStyle = config.colors.blue; ctx.fillRect(0, 0, config.canvasWidth, config.canvasHeight - config.groundHeight);
        ctx.fillStyle = config.colors.green; ctx.fillRect(0, config.canvasHeight - config.groundHeight, config.canvasWidth, config.groundHeight);
    }

    // Draw Player
    // Optional: Add visual effect if stumbling
    // if (isStumbling && frameCount % 10 < 5) { ctx.globalAlpha = 0.5; } // Flash
    if (assets.knightPlaceholder) {
        ctx.drawImage(assets.knightPlaceholder, playerState.x, playerState.y, playerState.width, playerState.height);
    }
    // ctx.globalAlpha = 1.0; // Reset alpha

    // Draw Obstacles (Uses typeKey and bigger sizes)
    obstacles.forEach(obstacle => {
        const obstacleImage = assets[obstacle.typeKey];
        if (obstacleImage) {
             ctx.drawImage(obstacleImage, obstacle.x, obstacle.y, obstacle.width, obstacle.height);
        } else { // Fallback
             ctx.fillStyle = config.colors.black;
             ctx.fillRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height);
        }
    });
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
