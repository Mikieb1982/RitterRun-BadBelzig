// --- Get DOM Elements ---
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreDisplay = document.getElementById('scoreDisplay');
const livesDisplay = document.getElementById('livesDisplay'); // <<< Ensure this ID exists in HTML
const landmarkPopup = document.getElementById('landmarkPopup');
const landmarkName = document.getElementById('landmarkName');
const landmarkDescription = document.getElementById('landmarkDescription');
// const landmarkImage = document.getElementById('landmarkImage');
const continueButton = document.getElementById('continueButton');
const gameOverScreen = document.getElementById('gameOverScreen');
const winScreen = document.getElementById('winScreen');

// --- Game Configuration (Tweaked Values) ---
const config = {
    canvasWidth: canvas.width,
    canvasHeight: canvas.height,
    gravity: 0.45,
    jumpStrength: -10.5,
    playerSpeed: 0,
    obstacleSpeed: 2.2, // Starting speed
    groundHeight: 50,
    spawnRate: 160,
    jumpHoldGravityMultiplier: 0.5,
    jumpCutGravityMultiplier: 2.0,
    stompJumpStrength: -8.5,
    maxGameSpeed: 7,
    startLives: 5,
    recoveryDuration: 90,
    stompBonus: 50,
    speedIncreasePerLandmark: 0.2,
    // Bad Belzig Color Palette
    colors: { /* ... colors ... */ }
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
let isJumpKeyDown = false;
let isPointerDownJump = false;
let playerLives = config.startLives;
let isRecovering = false;
let recoveryTimer = 0;

// --- Asset Loading ---
const assets = { /* ... asset keys and sources ... */
    knightPlaceholder: null, stoneObstacle: null, familyObstacle: null, tractorObstacle: null, backgroundImage: null, signImage: null, loaded: 0, total: 0,
    sources: { knightPlaceholder: 'assets/knight_placeholder.png', stoneObstacle: 'assets/stones.png', familyObstacle: 'assets/family.png', tractorObstacle: 'assets/tractor.png', backgroundImage: 'assets/background.png', signImage: 'assets/sign.png' }
};
function loadImage(key, src) { /* ... loads images ... */
    console.log(`Attempting to load: ${key} from ${src}`); assets.total++; const img = new Image(); img.src = src;
    img.onload = () => { console.log(`Successfully loaded: ${key}`); assets.loaded++; assets[key] = img; console.log(`Assets loaded: ${assets.loaded} / ${assets.total}`); if (assets.loaded === assets.total) { console.log("All assets loaded. Starting game..."); resetGame(); } };
    img.onerror = () => { console.error(`Failed to load asset: ${key} from ${src}`); };
}
function loadAllAssets() { /* ... starts loading ... */
    console.log("Starting asset loading..."); gameState = 'loading'; assets.loaded = 0; assets.total = 0; for (const key in assets.sources) { loadImage(key, assets.sources[key]); } if (assets.total === 0) { console.warn("No assets defined..."); resetGame(); }
}
// --- END Asset Loading ---


// --- Landmark Data (Long Descriptions) ---
const landmarkConfig = [ /* ... Correct, longer descriptions here ... */
    { name: "SteinTherme", worldX: 1500, width: 60, height: 90, descEN: "Relax in the SteinTherme! Bad Belzig's unique thermal bath uses warm, salty water (Sole) rich in iodine. This is great for health and relaxation. Besides the pools, there's an extensive sauna world and wellness treatments available year-round.", descDE: "Entspann dich in der SteinTherme! Bad Belzigs einzigartiges Thermalbad nutzt warmes Salzwasser (Sole), reich an Jod. Das ist gut für Gesundheit und Entspannung. Neben den Becken gibt es eine große Saunawelt und Wellnessanwendungen, ganzjährig geöffnet.", isFinal: false },
    { name: "Freibad", worldX: 3000, width: 60, height: 90, descEN: "Cool off at the Freibad! This outdoor pool is popular in summer (usually May-Sept). It features swimming lanes, water slides, and separate areas for children, making it perfect for sunny family days.", descDE: "Kühl dich ab im Freibad! Dieses Freibad ist im Sommer beliebt (meist Mai-Sept). Es gibt Schwimmbahnen, Wasserrutschen und separate Bereiche für Kinder, perfekt für sonnige Familientage.", isFinal: false },
    { name: "Stadtbibliothek (Library)", worldX: 4500, width: 60, height: 90, descEN: "Located at Weitzgrunder Str. 4, the town library provides access to books, digital media, and internet resources for the community. It often hosts readings and events for various age groups.", descDE: "In der Weitzgrunder Str. 4 gelegen, bietet die Stadtbibliothek Zugang zu Büchern, digitalen Medien und Internetressourcen für die Gemeinde. Sie veranstaltet oft Lesungen und Events für verschiedene Altersgruppen.", isFinal: false },
    { name: "Fläming Bahnhof", worldX: 6000, width: 60, height: 90, descEN: "All aboard at Fläming Bahnhof! The RE7 train line connects Bad Belzig directly to Berlin and Dessau. The station also serves as a gateway for exploring the scenic Hoher Fläming nature park, perhaps by bike.", descDE: "Einsteigen bitte am Fläming Bahnhof! Die Zuglinie RE7 verbindet Bad Belzig direkt mit Berlin und Dessau. Der Bahnhof dient auch als Tor zur Erkundung des malerischen Naturparks Hoher Fläming, vielleicht mit dem Fahrrad.", isFinal: false },
    { name: "Postmeilensäule (1725)", worldX: 7500, width: 60, height: 90, descEN: "See how far? This sandstone Postal Milestone (Postmeilensäule) dates from 1725. Erected under August the Strong of Saxony, it marked postal routes, showing distances and travel times (often in hours) with symbols like the post horn.", descDE: "Schon gesehen? Diese kursächsische Postmeilensäule aus Sandstein von 1725 markierte Postrouten unter August dem Starken und zeigte Distanzen und Reisezeiten (oft in Stunden) mit Symbolen wie dem Posthorn.", isFinal: false },
    { name: "Rathaus & Tourist-Information", worldX: 9000, width: 60, height: 90, descEN: "The historic Rathaus (Town Hall) sits centrally on the Marktplatz. Inside, you'll find the Tourist Information centre. They offer maps, accommodation booking, tips on events, and guided tour information.", descDE: "Das historische Rathaus befindet sich zentral am Marktplatz. Im Inneren finden Sie die Tourist-Information. Dort erhalten Sie Stadtpläne, Hilfe bei der Zimmervermittlung, Veranstaltungstipps und Informationen zu Führungen.", isFinal: false },
    { name: "Burg Eisenhardt", worldX: 10500, width: 60, height: 90, descEN: "You made it to Burg Eisenhardt! This impressive medieval castle overlooks the town. Explore the local history museum (Heimatmuseum), climb the 'Butterturm' keep for great views, and check for festivals or concerts held here.", descDE: "Geschafft! Du hast die Burg Eisenhardt erreicht! Diese beeindruckende mittelalterliche Burg überblickt die Stadt. Erkunden Sie das Heimatmuseum, besteigen Sie den Butterturm für eine tolle Aussicht und achten Sie auf Festivals oder Konzerte.", isFinal: true },
];
function initializeLandmarks() { /* ... initializes landmarks array ... */
    landmarks = landmarkConfig.map(cfg => ({ ...cfg, yPos: cfg.yPos || (config.canvasHeight - config.groundHeight - (cfg.height || 90)), hasBeenTriggered: false }));
}
// --- END Landmark Data ---


// --- Player State Initialization ---
function resetPlayer() { /* ... resets player properties ... */
    playerState = { x: 100, y: config.canvasHeight - config.groundHeight - 75, width: 60, height: 75, vy: 0, isGrounded: true };
}


// --- Game Reset Function ---
function resetGame() { /* ... resets game state ... */
    console.log("Resetting game..."); resetPlayer(); obstacles = []; initializeLandmarks(); score = 0; frameCount = 0; gameSpeed = config.obstacleSpeed; isJumpKeyDown = false; isPointerDownJump = false; playerLives = config.startLives; isRecovering = false; recoveryTimer = 0; livesDisplay.textContent = `Leben / Lives: ${playerLives}`; scoreDisplay.textContent = `Punkte / Score: 0`; gameOverScreen.style.display = 'none'; winScreen.style.display = 'none'; landmarkPopup.style.display = 'none'; gameState = 'running'; requestAnimationFrame(gameLoop);
}

// --- Input Handling (ADDED console logs) ---
function handleJump() {
    console.log(`>>> handleJump called. State: ${gameState}, Grounded: ${playerState.isGrounded}`); // <<< LOG
    if (gameState === 'running' && playerState.isGrounded) {
        playerState.vy = config.jumpStrength;
        playerState.isGrounded = false;
        console.log(`>>> Jump Force Applied! New vy: ${playerState.vy}`); // <<< LOG
    } else if (gameState === 'gameOver' && gameOverScreen.style.display !== 'none') {
        resetGame();
    } else if (gameState === 'win' && winScreen.style.display !== 'none') {
        resetGame();
    } else {
        console.log(">>> Jump conditions not met!"); // <<< LOG
    }
}
function hideLandmarkPopup() { /* ... hide popup logic ... */
    if (gameState === 'paused') { landmarkPopup.style.display = 'none'; gameState = 'running'; requestAnimationFrame(gameLoop); }
}
// Event listeners
window.addEventListener('keydown', (e) => {
    if (e.code === 'Space') {
        e.preventDefault();
        console.log(">>> Spacebar pressed"); // <<< LOG
        if (!isJumpKeyDown) { handleJump(); }
        isJumpKeyDown = true;
    } else if (e.key === 'Enter' || e.code === 'Enter') {
        /* ... Enter key logic ... */
        e.preventDefault(); if (gameState === 'paused' && landmarkPopup.style.display !== 'none') { hideLandmarkPopup(); } else if (gameState === 'gameOver' && gameOverScreen.style.display !== 'none') { resetGame(); } else if (gameState === 'win' && winScreen.style.display !== 'none') { resetGame(); }
    }
});
window.addEventListener('keyup', (e) => { if (e.code === 'Space') { e.preventDefault(); isJumpKeyDown = false; } });
canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    console.log(">>> Touch detected"); // <<< LOG
    if (gameState === 'running' || gameState === 'paused') { handleJump(); isPointerDownJump = true; }
    else if (gameState === 'gameOver' && gameOverScreen.style.display !== 'none') { resetGame(); } else if (gameState === 'win' && winScreen.style.display !== 'none') { resetGame(); }
});
canvas.addEventListener('mousedown', (e) => {
    console.log(">>> Mouse click detected"); // <<< LOG
    if (gameState === 'running') { handleJump(); isPointerDownJump = true; }
});
window.addEventListener('touchend', (e) => { isPointerDownJump = false; }); window.addEventListener('mouseup', (e) => { isPointerDownJump = false; });
gameOverScreen.addEventListener('click', resetGame); winScreen.addEventListener('click', resetGame); continueButton.addEventListener('click', hideLandmarkPopup);
// --- END Input Handling ---


// --- Collision Detection ---
function checkCollision(rect1, rect2) { /* ... AABB check ... */ return (rect1.x < rect2.x + rect2.width && rect1.x + rect1.width > rect2.x && rect1.y < rect2.y + rect2.height && rect1.y + rect1.height > rect2.y); }

// --- Obstacle Handling ---
const obstacleTypes = ['stoneObstacle', 'familyObstacle', 'tractorObstacle'];
function spawnObstacle() { /* ... spawn logic ... */ }
function updateObstacles() { /* ... update obstacle positions ... */ }
// --- END Obstacle Handling ---


// --- Landmark Display & Popup Trigger Function ---
function showLandmarkPopup(landmark) { /* ... show popup logic ... */ }


// --- Update Game State (ADDED console log) ---
function update() {
    if (gameState !== 'running') return;
    frameCount++;
    // <<< LOG Player State >>>
    console.log(`Update Frame ${frameCount} - Y: ${playerState.y.toFixed(1)}, VY: ${playerState.vy.toFixed(1)}, Grounded: ${playerState.isGrounded}`);

    // Manage Recovery State
    if (isRecovering) { /* ... recovery timer logic ... */ }

    // Player Physics (Variable Jump)
    let currentGravity = config.gravity; /* ... variable jump gravity ... */
    if (!playerState.isGrounded && playerState.vy < 0) { if (isJumpKeyDown || isPointerDownJump) { currentGravity *= config.jumpHoldGravityMultiplier; } else { currentGravity *= config.jumpCutGravityMultiplier; } }
    playerState.vy += currentGravity; playerState.y += playerState.vy;

    // Ground Collision
    const groundLevel = config.canvasHeight - config.groundHeight - playerState.height; /* ... ground check ... */
    if (playerState.y >= groundLevel) { playerState.y = groundLevel; playerState.vy = 0; playerState.isGrounded = true; } else { playerState.isGrounded = false; }

    // Obstacles
    updateObstacles();

    // Collision Checks (Stomp=Bounce, Vulnerable Hit=Lose Life/GameOver, Rising Hit=Safe)
    if (!isRecovering) { /* ... collision logic ... */ }

    // Update Landmarks and Check Triggers
    for (let landmark of landmarks) { /* ... landmark movement and trigger logic ... */ }

    // Score
    score++; scoreDisplay.textContent = `Punkte / Score: ${Math.floor(score / 8)}`;

    // Gradual Speed Increase (Landmark based)
    // Removed frame-based increase, logic is inside landmark trigger section now
}


// --- Draw Game ---
function draw() {
    ctx.clearRect(0, 0, config.canvasWidth, config.canvasHeight);
    // Draw Background
    if (assets.backgroundImage) { ctx.drawImage(assets.backgroundImage, 0, 0, config.canvasWidth, config.canvasHeight); } else { /* Fallback colors */ }
    // Draw Player (With recovery flashing)
    let drawPlayer = true; if (isRecovering && frameCount % 8 < 4) { drawPlayer = false; } // Faster flash
    if (drawPlayer && assets.knightPlaceholder) { ctx.drawImage(assets.knightPlaceholder, playerState.x, playerState.y, playerState.width, playerState.height); } else if (drawPlayer && !assets.knightPlaceholder) { /* Fallback rect */ }
    // Draw Obstacles
    obstacles.forEach(obstacle => { /* ... draw obstacle logic ... */ });
    // Draw Landmark Signs
    if (assets.signImage) { /* ... draw sign logic ... */ }
}
// --- END Draw Game ---


// --- UI Updates ---
function showGameOverScreen() { gameOverScreen.style.display = 'flex'; }
function showWinScreen() { winScreen.style.display = 'flex'; }


// --- Main Game Loop ---
function gameLoop() { /* ... checks state and calls update/draw ... */
    if (gameState === 'paused' || gameState === 'gameOver' || gameState === 'win') { return; }
    if (gameState === 'running') { update(); draw(); requestAnimationFrame(gameLoop); }
}


// --- Start Game ---
loadAllAssets();
// --- END Start Game ---
