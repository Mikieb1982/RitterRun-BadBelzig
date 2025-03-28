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
    playerStartX: 100, // Knight's fixed X position
    playerStartYOffset: 75, // How far above ground knight starts
    playerWidth: 60,
    playerHeight: 75,
    obstacleSpeed: 2.2, // Starting speed
    groundHeight: 50,
    spawnRate: 160, // Base spawn rate
    jumpHoldGravityMultiplier: 0.5,
    jumpCutGravityMultiplier: 2.0,
    stompJumpStrength: -8.5,
    maxGameSpeed: 7,
    startLives: 5,
    recoveryDuration: 90,
    stompBonus: 50, // Raw score bonus
    collisionPenalty: 75, // Raw score penalty
    speedIncreasePerLandmark: 0.2,
    scoreMultiplier: 8, // Lower number = faster score display increase
    recoveryFlashRate: 8, // Lower number = faster flash
    speedIncreaseInterval: 240, // Frames between speed increases (if using frame-based) -> Now using landmark-based
    obstacleInitialDelay: 100, // Frames before obstacles start spawning
    // Bad Belzig Color Palette
    colors: { green: '#0ca644', blue: '#0296c6', yellow: '#f5d306', black: '#151513', white: '#ffffff' }
};

// --- Game State Object ---
// Encapsulates most variables that change during gameplay
const game = {
    state: 'loading', // 'loading', 'running', 'paused', 'gameOver', 'win'
    playerState: {}, // Holds x, y, vy, width, height, isGrounded
    obstacles: [],
    landmarks: [],
    currentLandmarkIndex: 0, // Replaced by checking landmarks array directly mostly
    score: 0,
    frameCount: 0,
    gameSpeed: config.obstacleSpeed,
    isJumpKeyDown: false,
    isPointerDownJump: false,
    playerLives: config.startLives,
    isRecovering: false,
    recoveryTimer: 0
};

// --- Asset Loading ---
const assets = { /* ... asset keys, sources, loaded, total ... */
    knightPlaceholder: null, stoneObstacle: null, familyObstacle: null, tractorObstacle: null, backgroundImage: null, signImage: null, loaded: 0, total: 0,
    sources: { knightPlaceholder: 'assets/knight_placeholder.png', stoneObstacle: 'assets/stones.png', familyObstacle: 'assets/family.png', tractorObstacle: 'assets/tractor.png', backgroundImage: 'assets/background.png', signImage: 'assets/sign.png' }
};
function loadImage(key, src) { /* ... loads images, calls resetGame on completion ... */ console.log(`Attempting to load: ${key} from ${src}`); assets.total++; const img = new Image(); img.src = src; img.onload = () => { console.log(`Successfully loaded: ${key}`); assets.loaded++; assets[key] = img; console.log(`Assets loaded: ${assets.loaded} / ${assets.total}`); if (assets.loaded === assets.total) { console.log("All assets loaded. Starting game..."); resetGame(); } }; img.onerror = () => { console.error(`Failed to load asset: ${key} from ${src}`); }; }
function loadAllAssets() { /* ... starts loading ... */ console.log("Starting asset loading..."); game.state = 'loading'; assets.loaded = 0; assets.total = 0; for (const key in assets.sources) { loadImage(key, assets.sources[key]); } if (assets.total === 0) { console.warn("No assets defined..."); resetGame(); } }
// --- END Asset Loading ---


// --- Landmark Data & Initialization ---
const landmarkConfig = [ /* ... landmark definitions with long descriptions ... */
    { name: "SteinTherme", worldX: 1500, width: 60, height: 90, descEN: "Relax in the SteinTherme! Bad Belzig's unique thermal bath uses warm, salty water (Sole) rich in iodine...", descDE: "Entspann dich in der SteinTherme! Bad Belzigs einzigartiges Thermalbad nutzt warmes Salzwasser (Sole), reich an Jod...", isFinal: false }, { name: "Freibad", worldX: 3000, width: 60, height: 90, descEN: "Cool off at the Freibad! This outdoor pool is popular in summer (usually May-Sept)...", descDE: "Kühl dich ab im Freibad! Dieses Freibad ist im Sommer beliebt (meist Mai-Sept)...", isFinal: false }, { name: "Stadtbibliothek (Library)", worldX: 4500, width: 60, height: 90, descEN: "Located at Weitzgrunder Str. 4, the town library provides access to books, digital media...", descDE: "In der Weitzgrunder Str. 4 gelegen, bietet die Stadtbibliothek Zugang zu Büchern...", isFinal: false }, { name: "Fläming Bahnhof", worldX: 6000, width: 60, height: 90, descEN: "All aboard at Fläming Bahnhof! The RE7 train line connects Bad Belzig directly to Berlin and Dessau...", descDE: "Einsteigen bitte am Fläming Bahnhof! Die Zuglinie RE7 verbindet Bad Belzig direkt mit Berlin und Dessau...", isFinal: false }, { name: "Postmeilensäule (1725)", worldX: 7500, width: 60, height: 90, descEN: "See how far? This sandstone Postal Milestone (Postmeilensäule) dates from 1725...", descDE: "Schon gesehen? Diese kursächsische Postmeilensäule aus Sandstein von 1725...", isFinal: false }, { name: "Rathaus & Tourist-Information", worldX: 9000, width: 60, height: 90, descEN: "The historic Rathaus (Town Hall) sits centrally on the Marktplatz...", descDE: "Das historische Rathaus befindet sich zentral am Marktplatz...", isFinal: false }, { name: "Burg Eisenhardt", worldX: 10500, width: 60, height: 90, descEN: "You made it to Burg Eisenhardt! This impressive medieval castle overlooks the town...", descDE: "Geschafft! Du hast die Burg Eisenhardt erreicht! Diese beeindruckende mittelalterliche Burg...", isFinal: true },
]; // Ensure your full descriptions are pasted here
function initializeLandmarks() { game.landmarks = landmarkConfig.map(cfg => ({ ...cfg, yPos: cfg.yPos || (config.canvasHeight - config.groundHeight - (cfg.height || 90)), hasBeenTriggered: false })); }
// --- END Landmark Data ---


// --- Player State Initialization ---
function resetPlayer() {
    game.playerState = {
        x: config.playerStartX,
        y: config.canvasHeight - config.groundHeight - config.playerHeight,
        width: config.playerWidth,
        height: config.playerHeight,
        vy: 0,
        isGrounded: true
    };
}


// --- Game Reset Function ---
function resetGame() {
    console.log("Resetting game...");
    resetPlayer();
    game.obstacles = [];
    initializeLandmarks();
    game.score = 0;
    game.frameCount = 0;
    game.gameSpeed = config.obstacleSpeed; // Reset speed
    game.isJumpKeyDown = false;
    game.isPointerDownJump = false;
    game.playerLives = config.startLives;
    game.isRecovering = false;
    game.recoveryTimer = 0;
    livesDisplay.textContent = `Leben / Lives: ${game.playerLives}`;
    scoreDisplay.textContent = `Punkte / Score: 0`;
    gameOverScreen.style.display = 'none';
    winScreen.style.display = 'none';
    landmarkPopup.style.display = 'none';
    game.state = 'running'; // Set state AFTER reset is complete
    requestAnimationFrame(gameLoop);
}

// --- Input Handling ---
function setupEventListeners() { // Group listener setup
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    canvas.addEventListener('touchstart', handleTouchStart);
    canvas.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('touchend', handlePointerUp); // Use common handler
    window.addEventListener('mouseup', handlePointerUp);   // Use common handler
    gameOverScreen.addEventListener('click', resetGame);
    winScreen.addEventListener('click', resetGame);
    continueButton.addEventListener('click', hideLandmarkPopup);
}

function handleKeyDown(e) {
    if (e.code === 'Space') {
        e.preventDefault();
        if (!game.isJumpKeyDown) { handleJumpInput(); } // Changed name slightly
        game.isJumpKeyDown = true;
    } else if (e.key === 'Enter' || e.code === 'Enter') {
        handleEnterKey();
    }
}
function handleKeyUp(e) {
    if (e.code === 'Space') { e.preventDefault(); game.isJumpKeyDown = false; }
}
function handleTouchStart(e) {
    e.preventDefault();
    if (game.state === 'running' || game.state === 'paused') { handleJumpInput(); game.isPointerDownJump = true; }
    else { handleResetInput(); } // Allow reset from win/gameover on touch
}
function handleMouseDown(e) {
    if (game.state === 'running') { handleJumpInput(); game.isPointerDownJump = true; }
    // Reset handled by overlay clicks
}
function handlePointerUp(e) { game.isPointerDownJump = false; } // Unified handler

function handleJumpInput() { // Renamed from handleJump for clarity
    if (game.state === 'running' && game.playerState.isGrounded) {
        game.playerState.vy = config.jumpStrength;
        game.playerState.isGrounded = false;
        console.log(`>>> Jump Force Applied! New vy: ${game.playerState.vy}`);
    } else {
        console.log(">>> Jump conditions not met!");
    }
}
function handleResetInput() { // Handles reset attempts from various inputs
     if (game.state === 'gameOver' && gameOverScreen.style.display !== 'none') { resetGame(); }
     else if (game.state === 'win' && winScreen.style.display !== 'none') { resetGame(); }
}
function handleEnterKey(){
    if (game.state === 'paused' && landmarkPopup.style.display !== 'none') { hideLandmarkPopup(); }
    else { handleResetInput(); } // Allow reset from win/gameover on Enter
}
function hideLandmarkPopup() {
    if (game.state === 'paused') {
        landmarkPopup.style.display = 'none';
        game.state = 'running';
        requestAnimationFrame(gameLoop); // Resume loop
    }
}
// --- END Input Handling ---


// --- Collision Detection ---
function checkCollision(rect1, rect2) { /* ... AABB check ... */ return (rect1.x < rect2.x + rect2.width && rect1.x + rect1.width > rect2.x && rect1.y < rect2.y + rect2.height && rect1.y + rect1.height > rect2.y); }

// --- Obstacle Handling ---
const obstacleTypes = ['stoneObstacle', 'familyObstacle', 'tractorObstacle'];
function spawnObstacle() { /* ... spawn logic with larger sizes ... */
    const typeIndex = Math.floor(Math.random() * obstacleTypes.length); const selectedTypeKey = obstacleTypes[typeIndex]; let obstacleHeight, obstacleWidth; switch (selectedTypeKey) { case 'familyObstacle': obstacleHeight = 80 + Math.random() * 30; obstacleWidth = 60 + Math.random() * 20; break; case 'tractorObstacle': obstacleHeight = 70 + Math.random() * 20; obstacleWidth = 100 + Math.random() * 30; break; case 'stoneObstacle': default: obstacleHeight = 30 + Math.random() * 20; obstacleWidth = 20 + Math.random() * 16; break; } console.log(`Spawning ${selectedTypeKey} - Size: ${obstacleWidth.toFixed(0)}x${obstacleHeight.toFixed(0)}`); game.obstacles.push({ x: config.canvasWidth, y: config.canvasHeight - config.groundHeight - obstacleHeight, width: obstacleWidth, height: obstacleHeight, typeKey: selectedTypeKey });
}
function updateObstacles() {
    // Calculate dynamic spawn rate
    let currentSpawnRate = Math.max(60, config.spawnRate - Math.floor(game.gameSpeed * 10));
    if (game.frameCount > config.obstacleInitialDelay && game.frameCount % currentSpawnRate === 0) {
        spawnObstacle();
    }
    // Move obstacles
    for (let i = game.obstacles.length - 1; i >= 0; i--) {
        game.obstacles[i].x -= game.gameSpeed;
        if (game.obstacles[i].x + game.obstacles[i].width < 0) {
            game.obstacles.splice(i, 1);
        }
    }
}
// --- END Obstacle Handling ---


// --- Landmark Display & Popup Trigger Function ---
function showLandmarkPopup(landmark) { /* ... show popup logic ... */ landmarkName.textContent = landmark.name; landmarkDescription.innerHTML = `${landmark.descEN}<br><br>${landmark.descDE}`; landmarkPopup.style.display = 'flex'; }


// --- Update Game State (Refactored into Helpers) ---

function updatePlayerPhysics() {
    let currentGravity = config.gravity;
    // Apply variable jump gravity
    if (!game.playerState.isGrounded && game.playerState.vy < 0) { // If rising
        if (game.isJumpKeyDown || game.isPointerDownJump) { // Check both flags
            currentGravity *= config.jumpHoldGravityMultiplier;
        } else {
            currentGravity *= config.jumpCutGravityMultiplier;
        }
    }
    game.playerState.vy += currentGravity; // Apply gravity
    game.playerState.y += game.playerState.vy;  // Update position

    // Ground Collision check
    const groundLevel = config.canvasHeight - config.groundHeight - game.playerState.height;
    if (game.playerState.y >= groundLevel) {
        game.playerState.y = groundLevel;
        game.playerState.vy = 0;
        game.playerState.isGrounded = true;
    } else {
        game.playerState.isGrounded = false;
    }
}

function updateRecoveryState() {
    if (game.isRecovering) {
        game.recoveryTimer--;
        if (game.recoveryTimer <= 0) {
            game.isRecovering = false;
            console.log("Recovery finished.");
        }
    }
}

function handleCollisions() {
    if (game.isRecovering) return false; // Skip collision checks if recovering

    for (let i = game.obstacles.length - 1; i >= 0; i--) {
        const obstacle = game.obstacles[i];
        if (checkCollision(game.playerState, obstacle)) {
            const isFalling = game.playerState.vy > 0;
            const previousPlayerBottom = game.playerState.y + game.playerState.height - game.playerState.vy;
            const obstacleTop = obstacle.y;

            // Stomp Condition
            if (isFalling && previousPlayerBottom <= obstacleTop + 1) {
                console.log("Stomp detected!");
                game.playerState.vy = config.stompJumpStrength;
                game.playerState.y = obstacle.y - game.playerState.height;
                game.playerState.isGrounded = false;
                game.score += config.stompBonus;
                game.obstacles.splice(i, 1); // Remove obstacle
                continue; // Check next obstacle
            } else {
                // Not a Stomp - Check if vulnerable
                if (game.playerState.isGrounded || game.playerState.vy >= 0) {
                    console.log("Vulnerable Collision Detected!");
                    game.playerLives--;
                    livesDisplay.textContent = `Leben / Lives: ${game.playerLives}`;
                    game.score -= config.collisionPenalty; // Use config for penalty
                    if (game.score < 0) { game.score = 0; }

                    if (game.playerLives <= 0) {
                        console.log("Game Over!");
                        game.state = 'gameOver';
                        showGameOverScreen();
                        return true; // Indicate game over happened
                    } else {
                        console.log("Lost a life, starting recovery.");
                        game.isRecovering = true;
                        game.recoveryTimer = config.recoveryDuration;
                        game.playerState.vy = -3; // Optional bounce
                        game.playerState.isGrounded = false;
                        return false; // Collision handled (recovery), stop checking this frame
                    }
                } else {
                    // Collision while Rising -> Safe
                    console.log("Collision ignored (Player rising).");
                }
            }
        }
    }
    return false; // No game over occurred in this check
}

function updateLandmarksAndSpeed() {
    let speedIncreasedThisFrame = false;
    for (let landmark of game.landmarks) {
        landmark.worldX -= game.gameSpeed; // Move landmark

        // Check trigger
        if (!landmark.hasBeenTriggered && landmark.worldX < game.playerState.x + game.playerState.width && landmark.worldX + landmark.width > game.playerState.x) {
            console.log(`Triggering landmark: ${landmark.name}`);
            landmark.hasBeenTriggered = true;
            showLandmarkPopup(landmark);

            // Increase speed (only if not already increased this frame)
            if (!speedIncreasedThisFrame && game.gameSpeed < config.maxGameSpeed) {
                 game.gameSpeed += config.speedIncreasePerLandmark;
                 game.gameSpeed = parseFloat(game.gameSpeed.toFixed(2));
                 console.log("Speed Increased via Landmark:", game.gameSpeed);
                 speedIncreasedThisFrame = true;
            }

            if (landmark.isFinal) { game.state = 'win'; showWinScreen(); return true; } // Return true if game won
            else { game.state = 'paused'; return true; } // Return true if paused
        }
    }
    return false; // Game not paused or won
}

function updateScore() {
    game.score++;
    scoreDisplay.textContent = `Punkte / Score: ${Math.floor(game.score / config.scoreMultiplier)}`;
}


function update() {
    if (game.state !== 'running') return; // Check state at the very beginning
    game.frameCount++;

    updateRecoveryState();
    updatePlayerPhysics();
    updateObstacles(); // Uses current game.gameSpeed

    if (handleCollisions()) { // If collision caused game over, stop update
        return;
    }

    if (updateLandmarksAndSpeed()) { // If landmark paused/won game, stop update
        return;
    }

    updateScore();

    // Frame-based speed increase removed (now landmark based)
}


// --- Draw Game ---
function draw() {
    ctx.clearRect(0, 0, config.canvasWidth, config.canvasHeight);

    // Draw Background
    if (assets.backgroundImage) { ctx.drawImage(assets.backgroundImage, 0, 0, config.canvasWidth, config.canvasHeight); } else { /* Fallback colors */ }

    // Draw Player (With recovery flashing)
    let drawPlayer = true;
    // Use game object state
    if (game.isRecovering && game.frameCount % config.recoveryFlashRate < Math.floor(config.recoveryFlashRate / 2) ) {
        drawPlayer = false; // Flash based on frame count and recovery state
    }
    // Use game object state
    if (drawPlayer && assets.knightPlaceholder) { ctx.drawImage(assets.knightPlaceholder, game.playerState.x, game.playerState.y, game.playerState.width, game.playerState.height); }
    else if (drawPlayer && !assets.knightPlaceholder) { /* Fallback rect */ }

    // Draw Obstacles
    game.obstacles.forEach(obstacle => { /* ... draw obstacle logic ... */ });

    // Draw Landmark Signs
    if (assets.signImage) { /* ... draw sign logic ... */ }
}
// --- END Draw Game ---


// --- UI Updates ---
function showGameOverScreen() { gameOverScreen.style.display = 'flex'; }
function showWinScreen() { winScreen.style.display = 'flex'; }


// --- Main Game Loop ---
function gameLoop(timestamp) { // Pass timestamp for potential deltaTime later
    // Check state at the very beginning
    if (game.state === 'paused' || game.state === 'gameOver' || game.state === 'win') { return; }

    if (game.state === 'running') {
        update(); // Pass deltaTime if using it
        draw();
        requestAnimationFrame(gameLoop); // Continue loop
    }
}


// --- Start Game ---
setupEventListeners(); // Call listener setup once
loadAllAssets();     // Initiates loading, calls resetGame on completion
// --- END Start Game ---
