// --- Get DOM Elements ---
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreDisplay = document.getElementById('scoreDisplay');
const livesDisplay = document.getElementById('livesDisplay');
const landmarkPopup = document.getElementById('landmarkPopup');
const landmarkName = document.getElementById('landmarkName');
const landmarkDescription = document.getElementById('landmarkDescription');
// const landmarkImage = document.getElementById('landmarkImage');
const continueButton = document.getElementById('continueButton');
const gameOverScreen = document.getElementById('gameOverScreen');
const winScreen = document.getElementById('winScreen');

// --- Game Configuration ---
const config = {
    canvasWidth: canvas.width,
    canvasHeight: canvas.height,
    gravity: 0.45,
    jumpStrength: -10.5,
    playerSpeed: 0,
    obstacleSpeed: 2.2, // Starting speed
    groundHeight: 50,
    spawnRate: 160, // Base spawn rate
    jumpHoldGravityMultiplier: 0.5,
    jumpCutGravityMultiplier: 2.0,
    stompJumpStrength: -8.5,
    maxGameSpeed: 7,
    startLives: 5,
    recoveryDuration: 90, // Shorter recovery time
    stompBonus: 50, // Score bonus for stomps
    collisionPenalty: 75, // Score penalty for vulnerable hit
    speedIncreasePerLandmark: 0.2,
    scoreMultiplier: 8, // Lower number = faster score display increase
    recoveryFlashRate: 8, // Lower number = faster flash
    obstacleInitialDelay: 100,
    playerStartX: 100, // Knight's fixed X position
    playerStartYOffset: 75, // How far above ground knight starts
    playerWidth: 60,
    playerHeight: 75,
    // Bad Belzig Color Palette
    colors: { green: '#0ca644', blue: '#0296c6', yellow: '#f5d306', black: '#151513', white: '#ffffff' }
};

// --- Game State Object ---
const game = {
    state: 'loading', playerState: {}, obstacles: [], landmarks: [],
    currentLandmarkIndex: 0, score: 0, frameCount: 0, gameSpeed: config.obstacleSpeed,
    isJumpKeyDown: false, isPointerDownJump: false, playerLives: config.startLives,
    isRecovering: false, recoveryTimer: 0
};

// --- Asset Loading ---
const assets = {
    knightPlaceholder: null, stoneObstacle: null, familyObstacle: null, tractorObstacle: null, backgroundImage: null, signImage: null,
    loaded: 0, total: 0,
    sources: { knightPlaceholder: 'assets/knight_placeholder.png', stoneObstacle: 'assets/stones.png', familyObstacle: 'assets/family.png', tractorObstacle: 'assets/tractor.png', backgroundImage: 'assets/background.png', signImage: 'assets/sign.png' }
};
function loadImage(key, src) { /* ... loads images ... */ console.log(`Attempting to load: ${key} from ${src}`); assets.total++; const img = new Image(); img.src = src; img.onload = () => { console.log(`Successfully loaded: ${key}`); assets.loaded++; assets[key] = img; console.log(`Assets loaded: ${assets.loaded} / ${assets.total}`); if (assets.loaded === assets.total) { console.log("All assets loaded. Starting game..."); resetGame(); } }; img.onerror = () => { console.error(`Failed to load asset: ${key} from ${src}`); }; }
function loadAllAssets() { /* ... starts loading ... */ console.log("Starting asset loading..."); game.state = 'loading'; assets.loaded = 0; assets.total = 0; for (const key in assets.sources) { loadImage(key, assets.sources[key]); } if (assets.total === 0) { console.warn("No assets defined..."); resetGame(); } }
// --- END Asset Loading ---


// --- Landmark Data (CORRECTED KULTURZENTRUM DESCRIPTION) ---
const landmarkConfig = [
    { name: "SteinTherme", worldX: 1500, width: 60, height: 90, descEN: "Relax in the SteinTherme! Bad Belzig's unique thermal bath uses warm, salty water (Sole) rich in iodine...", descDE: "Entspann dich in der SteinTherme! Bad Belzigs einzigartiges Thermalbad nutzt warmes Salzwasser (Sole), reich an Jod...", isFinal: false },
    { name: "Freibad", worldX: 3000, width: 60, height: 90, descEN: "Cool off at the Freibad! This outdoor pool is popular in summer (usually May-Sept)...", descDE: "Kühl dich ab im Freibad! Dieses Freibad ist im Sommer beliebt (meist Mai-Sept)...", isFinal: false },
    { // REVISED description - removing specific venue name
        name: "Kulturzentrum & Bibliothek", worldX: 4500, width: 60, height: 90,
        descEN: "This building at Weitzgrunder Str. 4 serves as a cultural hub and houses the town library. Check for local events, or use the library's collection of books, media, and internet resources.",
        descDE: "Dieses Gebäude in der Weitzgrunder Str. 4 dient als kultureller Treffpunkt und beherbergt die Stadtbibliothek. Informieren Sie sich über lokale Veranstaltungen oder nutzen Sie die Sammlung an Büchern, Medien und Internetressourcen der Bibliothek.",
        isFinal: false
    },
    { name: "Fläming Bahnhof", worldX: 6000, width: 60, height: 90, descEN: "All aboard at Fläming Bahnhof! The RE7 train line connects Bad Belzig directly to Berlin and Dessau...", descDE: "Einsteigen bitte am Fläming Bahnhof! Die Zuglinie RE7 verbindet Bad Belzig direkt mit Berlin und Dessau...", isFinal: false },
    { name: "Postmeilensäule (1725)", worldX: 7500, width: 60, height: 90, descEN: "See how far? This sandstone Postal Milestone (Postmeilensäule) dates from 1725...", descDE: "Schon gesehen? Diese kursächsische Postmeilensäule aus Sandstein von 1725...", isFinal: false },
    { name: "Rathaus & Tourist-Information", worldX: 9000, width: 60, height: 90, descEN: "The historic Rathaus (Town Hall) sits centrally on the Marktplatz...", descDE: "Das historische Rathaus befindet sich zentral am Marktplatz...", isFinal: false },
    { name: "Burg Eisenhardt", worldX: 10500, width: 60, height: 90, descEN: "You made it to Burg Eisenhardt! This impressive medieval castle overlooks the town...", descDE: "Geschafft! Du hast die Burg Eisenhardt erreicht! Diese beeindruckende mittelalterliche Burg...", isFinal: true },
]; // Ensure your full descriptions are pasted correctly in the other entries
function initializeLandmarks() { /* ... initializes landmarks array ... */ game.landmarks = landmarkConfig.map(cfg => ({ ...cfg, yPos: cfg.yPos || (config.canvasHeight - config.groundHeight - (cfg.height || 90)), hasBeenTriggered: false })); }
// --- END Landmark Data ---


// --- Player State Initialization ---
function resetPlayer() { /* ... resets player properties ... */
    game.playerState = { x: config.playerStartX, y: config.canvasHeight - config.groundHeight - config.playerHeight, width: config.playerWidth, height: config.playerHeight, vy: 0, isGrounded: true };
}


// --- Game Reset Function ---
function resetGame() { /* ... resets game state ... */
    console.log("Resetting game..."); resetPlayer(); game.obstacles = []; initializeLandmarks(); game.score = 0; game.frameCount = 0; game.gameSpeed = config.obstacleSpeed; game.isJumpKeyDown = false; game.isPointerDownJump = false; game.playerLives = config.startLives; game.isRecovering = false; game.recoveryTimer = 0; livesDisplay.textContent = `Leben / Lives: ${game.playerLives}`; scoreDisplay.textContent = `Punkte / Score: 0`; gameOverScreen.style.display = 'none'; winScreen.style.display = 'none'; landmarkPopup.style.display = 'none'; game.state = 'running'; requestAnimationFrame(gameLoop);
}

// --- Input Handling ---
function setupEventListeners() { /* ... sets up listeners ... */ window.addEventListener('keydown', handleKeyDown); window.addEventListener('keyup', handleKeyUp); canvas.addEventListener('touchstart', handleTouchStart); canvas.addEventListener('mousedown', handleMouseDown); window.addEventListener('touchend', handlePointerUp); window.addEventListener('mouseup', handlePointerUp); gameOverScreen.addEventListener('click', resetGame); winScreen.addEventListener('click', resetGame); continueButton.addEventListener('click', hideLandmarkPopup); }
function handleKeyDown(e) { /* ... keydown logic ... */ if (e.code === 'Space') { e.preventDefault(); if (!game.isJumpKeyDown) { handleJumpInput(); } game.isJumpKeyDown = true; } else if (e.key === 'Enter' || e.code === 'Enter') { handleEnterKey(); } }
function handleKeyUp(e) { if (e.code === 'Space') { e.preventDefault(); game.isJumpKeyDown = false; } }
function handleTouchStart(e) { /* ... touchstart logic ... */ e.preventDefault(); if (game.state === 'running' || game.state === 'paused') { handleJumpInput(); game.isPointerDownJump = true; } else { handleResetInput(); } }
function handleMouseDown(e) { /* ... mousedown logic ... */ if (game.state === 'running') { handleJumpInput(); game.isPointerDownJump = true; } }
function handlePointerUp(e) { game.isPointerDownJump = false; } // Unified handler
function handleJumpInput() { /* ... jump input logic ... */ if (game.state === 'running' && game.playerState.isGrounded) { game.playerState.vy = config.jumpStrength; game.playerState.isGrounded = false; console.log(`>>> Jump Force Applied! New vy: ${game.playerState.vy}`); } else { console.log(">>> Jump conditions not met!"); } }
function handleResetInput() { /* ... reset input logic ... */ if (game.state === 'gameOver' && gameOverScreen.style.display !== 'none') { resetGame(); } else if (game.state === 'win' && winScreen.style.display !== 'none') { resetGame(); } }
function handleEnterKey() { /* ... enter key logic ... */ if (game.state === 'paused' && landmarkPopup.style.display !== 'none') { hideLandmarkPopup(); } else { handleResetInput(); } }
function hideLandmarkPopup() { /* ... hides landmark popup ... */ if (game.state === 'paused') { landmarkPopup.style.display = 'none'; game.state = 'running'; requestAnimationFrame(gameLoop); } }
// --- END Input Handling ---


// --- Collision Detection ---
function checkCollision(rect1, rect2) { /* ... AABB check ... */ return (rect1.x < rect2.x + rect2.width && rect1.x + rect1.width > rect2.x && rect1.y < rect2.y + rect2.height && rect1.y + rect1.height > rect2.y); }

// --- Obstacle Handling ---
const obstacleTypes = ['stoneObstacle', 'familyObstacle', 'tractorObstacle'];
function spawnObstacle() { /* ... spawn logic ... */ const typeIndex = Math.floor(Math.random() * obstacleTypes.length); const selectedTypeKey = obstacleTypes[typeIndex]; let obstacleHeight, obstacleWidth; switch (selectedTypeKey) { case 'familyObstacle': obstacleHeight = 80 + Math.random() * 30; obstacleWidth = 60 + Math.random() * 20; break; case 'tractorObstacle': obstacleHeight = 70 + Math.random() * 20; obstacleWidth = 100 + Math.random() * 30; break; case 'stoneObstacle': default: obstacleHeight = 30 + Math.random() * 20; obstacleWidth = 20 + Math.random() * 16; break; } console.log(`Spawning ${selectedTypeKey} - Size: ${obstacleWidth.toFixed(0)}x${obstacleHeight.toFixed(0)}`); game.obstacles.push({ x: config.canvasWidth, y: config.canvasHeight - config.groundHeight - obstacleHeight, width: obstacleWidth, height: obstacleHeight, typeKey: selectedTypeKey }); }
function updateObstacles() { /* ... update obstacle positions & spawn rate ... */ let currentSpawnRate = Math.max(60, config.spawnRate - Math.floor(game.gameSpeed * 10)); if (game.frameCount > config.obstacleInitialDelay && game.frameCount % currentSpawnRate === 0) { spawnObstacle(); } for (let i = game.obstacles.length - 1; i >= 0; i--) { game.obstacles[i].x -= game.gameSpeed; if (game.obstacles[i].x + game.obstacles[i].width < 0) { game.obstacles.splice(i, 1); } } }
// --- END Obstacle Handling ---


// --- Landmark Display & Popup Trigger Function ---
function showLandmarkPopup(landmark) { /* ... show popup logic ... */ landmarkName.textContent = landmark.name; landmarkDescription.innerHTML = `${landmark.descEN}<br><br>${landmark.descDE}`; landmarkPopup.style.display = 'flex'; }


// --- Update Game State (Refactored into Helpers) ---
function updatePlayerPhysics() { /* ... player physics logic ... */ let currentGravity = config.gravity; if (!game.playerState.isGrounded && game.playerState.vy < 0) { if (game.isJumpKeyDown || game.isPointerDownJump) { currentGravity *= config.jumpHoldGravityMultiplier; } else { currentGravity *= config.jumpCutGravityMultiplier; } } game.playerState.vy += currentGravity; game.playerState.y += game.playerState.vy; const groundLevel = config.canvasHeight - config.groundHeight - game.playerState.height; if (game.playerState.y >= groundLevel) { game.playerState.y = groundLevel; game.playerState.vy = 0; game.playerState.isGrounded = true; } else { game.playerState.isGrounded = false; } }
function updateRecoveryState() { /* ... recovery timer logic ... */ if (game.isRecovering) { game.recoveryTimer--; if (game.recoveryTimer <= 0) { game.isRecovering = false; console.log("Recovery finished."); } } }
function handleCollisions() { /* ... collision check logic ... */ if (game.isRecovering) return false; for (let i = game.obstacles.length - 1; i >= 0; i--) { const obstacle = game.obstacles[i]; if (checkCollision(game.playerState, obstacle)) { const isFalling = game.playerState.vy > 0; const previousPlayerBottom = game.playerState.y + game.playerState.height - game.playerState.vy; const obstacleTop = obstacle.y; if (isFalling && previousPlayerBottom <= obstacleTop + 1) { console.log("Stomp detected!"); game.playerState.vy = config.stompJumpStrength; game.playerState.y = obstacle.y - game.playerState.height; game.playerState.isGrounded = false; game.score += config.stompBonus; game.obstacles.splice(i, 1); continue; } else { if (game.playerState.isGrounded || game.playerState.vy >= 0) { console.log("Vulnerable Collision Detected!"); game.playerLives--; livesDisplay.textContent = `Leben / Lives: ${game.playerLives}`; game.score -= config.collisionPenalty; if (game.score < 0) { game.score = 0; } if (game.playerLives <= 0) { console.log("Game Over!"); game.state = 'gameOver'; showGameOverScreen(); return true; } else { console.log("Lost a life, starting recovery."); game.isRecovering = true; game.recoveryTimer = config.recoveryDuration; game.playerState.vy = -3; game.playerState.isGrounded = false; return false; /* Collision handled (recovery), stop checking */ } } else { console.log("Collision ignored (Player rising)."); } } } } return false; }
function updateLandmarksAndSpeed() { /* ... landmark update logic ... */ let speedIncreasedThisFrame = false; for (let landmark of game.landmarks) { landmark.worldX -= game.gameSpeed; if (!landmark.hasBeenTriggered && landmark.worldX < game.playerState.x + game.playerState.width && landmark.worldX + landmark.width > game.playerState.x) { console.log(`Triggering landmark: ${landmark.name}`); landmark.hasBeenTriggered = true; showLandmarkPopup(landmark); if (!speedIncreasedThisFrame && game.gameSpeed < config.maxGameSpeed) { game.gameSpeed += config.speedIncreasePerLandmark; game.gameSpeed = parseFloat(game.gameSpeed.toFixed(2)); console.log("Speed Increased via Landmark:", game.gameSpeed); speedIncreasedThisFrame = true; } if (landmark.isFinal) { game.state = 'win'; showWinScreen(); return true; } else { game.state = 'paused'; return true; } } } return false; }
function updateScore() { /* ... score update logic ... */ game.score++; scoreDisplay.textContent = `Punkte / Score: ${Math.floor(game.score / config.scoreMultiplier)}`; }

function update() {
    if (game.state !== 'running') return;
    game.frameCount++;
    updateRecoveryState();
    updatePlayerPhysics();
    updateObstacles();
    if (handleCollisions()) return; // Stop if game over
    if (updateLandmarksAndSpeed()) return; // Stop if paused or won
    updateScore();
}


// --- Draw Game ---
function draw() {
    ctx.clearRect(0, 0, config.canvasWidth, config.canvasHeight);
    // Draw Background
    if (assets.backgroundImage) { ctx.drawImage(assets.backgroundImage, 0, 0, config.canvasWidth, config.canvasHeight); } else { /* Fallback colors */ }
    // Draw Player
    let drawPlayer = true; if (game.isRecovering && game.frameCount % config.recoveryFlashRate < Math.floor(config.recoveryFlashRate / 2)) { drawPlayer = false; } if (drawPlayer && assets.knightPlaceholder) { ctx.drawImage(assets.knightPlaceholder, game.playerState.x, game.playerState.y, game.playerState.width, game.playerState.height); } else if (drawPlayer && !assets.knightPlaceholder) { /* Fallback rect */ }
    // Draw Obstacles
    game.obstacles.forEach(obstacle => { const obstacleImage = assets[obstacle.typeKey]; if (obstacleImage) { ctx.drawImage(obstacleImage, obstacle.x, obstacle.y, obstacle.width, obstacle.height); } else { /* Fallback rect */ } });
    // Draw Landmark Signs
    if (assets.signImage) { game.landmarks.forEach(landmark => { if (landmark.worldX < config.canvasWidth && landmark.worldX + landmark.width > 0) { ctx.drawImage(assets.signImage, landmark.worldX, landmark.yPos, landmark.width, landmark.height); } }); }
}
// --- END Draw Game ---


// --- UI Updates ---
function showGameOverScreen() { gameOverScreen.style.display = 'flex'; }
function showWinScreen() { winScreen.style.display = 'flex'; }


// --- Main Game Loop ---
function gameLoop(timestamp) { /* ... game loop logic ... */ if (game.state === 'paused' || game.state === 'gameOver' || game.state === 'win') { return; } if (game.state === 'running') { update(); draw(); requestAnimationFrame(gameLoop); } }


// --- Start Game ---
setupEventListeners(); // Call listener setup once
loadAllAssets();     // Initiates loading, calls resetGame on completion
// --- END Start Game ---

