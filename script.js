// --- Get DOM Elements ---
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreDisplay = document.getElementById('scoreDisplay');
const landmarkPopup = document.getElementById('landmarkPopup');
const landmarkName = document.getElementById('landmarkName');
const landmarkDescription = document.getElementById('landmarkDescription');
// const landmarkImage = document.getElementById('landmarkImage');
const continueButton = document.getElementById('continueButton');
const gameOverScreen = document.getElementById('gameOverScreen'); // Game Over screen is used again
const winScreen = document.getElementById('winScreen');

// --- Game Configuration (Stumble config removed) ---
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
    // stumbleDuration: 60,          // <<< REMOVED
    // stumbleSpeedMultiplier: 0.5, // <<< REMOVED
    // Bad Belzig Color Palette
    colors: {
        green: '#0ca644',
        blue: '#0296c6',
        yellow: '#f5d306',
        black: '#151513',
        white: '#ffffff'
    }
};

// --- Game State Variables (Stumble variables removed) ---
let gameState = 'loading';
let playerState = {};
let obstacles = [];
let landmarks = []; // Populated by initializeLandmarks
let score = 0;
let frameCount = 0;
let gameSpeed = config.obstacleSpeed; // Current speed (now only changes if you add speed-up logic)
let isJumpKeyDown = false;      // Tracks Spacebar hold
let isPointerDownJump = false; // Tracks Mouse/Touch hold for jump
// let isStumbling = false;     // <<< REMOVED
// let stumbleTimer = 0;        // <<< REMOVED

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
    /* ... loads images, calls resetGame on completion ... */
    console.log(`Attempting to load: ${key} from ${src}`); assets.total++; const img = new Image(); img.src = src;
    img.onload = () => { console.log(`Successfully loaded: ${key}`); assets.loaded++; assets[key] = img; console.log(`Assets loaded: ${assets.loaded} / ${assets.total}`); if (assets.loaded === assets.total) { console.log("All assets loaded. Starting game..."); resetGame(); } };
    img.onerror = () => { console.error(`Failed to load asset: ${key} from ${src}`); };
}

// loadAllAssets function
function loadAllAssets() { /* ... starts loading all assets ... */
    console.log("Starting asset loading..."); gameState = 'loading'; assets.loaded = 0; assets.total = 0; for (const key in assets.sources) { loadImage(key, assets.sources[key]); } if (assets.total === 0) { console.warn("No assets defined..."); resetGame(); }
}
// --- END Asset Loading ---


// --- Landmark Data ---
const landmarkConfig = [ /* ... landmark definitions with longer descriptions ... */
    { name: "SteinTherme", worldX: 1500, width: 60, height: 90, descEN: "Relax in the SteinTherme! Bad Belzig's unique thermal bath uses warm, salty water (Sole) rich in iodine. This is great for health and relaxation. Besides the pools, there's an extensive sauna world and wellness treatments available year-round.", descDE: "Entspann dich in der SteinTherme! Bad Belzigs einzigartiges Thermalbad nutzt warmes Salzwasser (Sole), reich an Jod. Das ist gut für Gesundheit und Entspannung. Neben den Becken gibt es eine große Saunawelt und Wellnessanwendungen, ganzjährig geöffnet.", isFinal: false },
    { name: "Freibad", worldX: 3000, width: 60, height: 90, descEN: "Cool off at the Freibad! This outdoor pool is popular in summer (usually May-Sept). It features swimming lanes, water slides, and separate areas for children, making it perfect for sunny family days.", descDE: "Kühl dich ab im Freibad! Dieses Freibad ist im Sommer beliebt (meist Mai-Sept). Es gibt Schwimmbahnen, Wasserrutschen und separate Bereiche für Kinder, perfekt für sonnige Familientage.", isFinal: false },
    { name: "Kulturzentrum & Bibliothek", worldX: 4500, width: 60, height: 90, descEN: "This building at Weitzgrunder Str. 4 houses the town library and the KleinKunstWerk cultural center. Check their schedule for concerts, theatre, readings, and cabaret. The library offers books, media, and internet access.", descDE: "Dieses Gebäude in der Weitzgrunder Str. 4 beherbergt die Stadtbibliothek und das KleinKunstWerk Kulturzentrum. Informieren Sie sich über Konzerte, Theater, Lesungen und Kabarett. Die Bibliothek bietet Bücher, Medien und Internetzugang.", isFinal: false },
    { name: "Fläming Bahnhof", worldX: 6000, width: 60, height: 90, descEN: "All aboard at Fläming Bahnhof! The RE7 train line connects Bad Belzig directly to Berlin and Dessau. The station also serves as a gateway for exploring the scenic Hoher Fläming nature park, perhaps by bike.", descDE: "Einsteigen bitte am Fläming Bahnhof! Die Zuglinie RE7 verbindet Bad Belzig direkt mit Berlin und Dessau. Der Bahnhof dient auch als Tor zur Erkundung des malerischen Naturparks Hoher Fläming, vielleicht mit dem Fahrrad.", isFinal: false },
    { name: "Postmeilensäule (1725)", worldX: 7500, width: 60, height: 90, descEN: "See how far? This sandstone Postal Milestone (Postmeilensäule) from 1725 is located on the Marktplatz. Erected under August the Strong of Saxony, it marked postal routes, showing distances and travel times (often in hours) with symbols like the post horn.", descDE: "Schon gesehen? Diese kursächsische Postmeilensäule aus Sandstein von 1725 steht auf dem Marktplatz. Errichtet unter August dem Starken, markierte sie Postrouten und zeigte Distanzen und Reisezeiten (oft in Stunden) mit Symbolen wie dem Posthorn.", isFinal: false },
    { name: "Rathaus & Tourist-Information", worldX: 9000, width: 60, height: 90, descEN: "The historic Rathaus (Town Hall) sits centrally on the Marktplatz. Inside, you'll find the Tourist Information centre. They offer maps, accommodation booking, tips on events, and guided tour information.", descDE: "Das historische Rathaus befindet sich zentral am Marktplatz. Im Inneren finden Sie die Tourist-Information. Dort erhalten Sie Stadtpläne, Hilfe bei der Zimmervermittlung, Veranstaltungstipps und Informationen zu Führungen.", isFinal: false },
    { name: "Burg Eisenhardt", worldX: 10500, width: 60, height: 90, descEN: "You made it to Burg Eisenhardt! This impressive medieval castle overlooks the town. Explore the local history museum (Heimatmuseum), climb the 'Butterturm' keep for great views, and check for festivals or concerts held here.", descDE: "Geschafft! Du hast die Burg Eisenhardt erreicht! Diese beeindruckende mittelalterliche Burg überblickt die Stadt. Erkunden Sie das Heimatmuseum, besteigen Sie den Butterturm für eine tolle Aussicht und achten Sie auf Festivals oder Konzerte.", isFinal: true },
];
function initializeLandmarks() { /* ... initializes landmarks array ... */
    landmarks = landmarkConfig.map(cfg => ({ ...cfg, yPos: cfg.yPos || (config.canvasHeight - config.groundHeight - (cfg.height || 90)), hasBeenTriggered: false }));
}
// --- END Landmark Data ---


// --- Player State Initialization (Bigger Knight) ---
function resetPlayer() { /* ... resets player properties ... */
    playerState = { x: 50, y: config.canvasHeight - config.groundHeight - 75, width: 60, height: 75, vy: 0, isGrounded: true };
}


// --- Game Reset Function (Stumble resets removed) ---
function resetGame() {
    console.log("Resetting game...");
    resetPlayer(); obstacles = []; initializeLandmarks(); score = 0; frameCount = 0;
    gameSpeed = config.obstacleSpeed; // Reset speed
    isJumpKeyDown = false;
    isPointerDownJump = false;
    // isStumbling = false;     // <<< REMOVED
    // stumbleTimer = 0;        // <<< REMOVED
    scoreDisplay.textContent = `Punkte / Score: 0`;
    gameOverScreen.style.display = 'none'; // Hide Game Over screen
    winScreen.style.display = 'none'; landmarkPopup.style.display = 'none';
    gameState = 'running';
    requestAnimationFrame(gameLoop);
}

// --- Input Handling (Handles reset from Game Over / Win) ---
function handleJump() {
    if (gameState === 'running' && playerState.isGrounded) { playerState.vy = config.jumpStrength; playerState.isGrounded = false; }
    // Allow jump button to reset from Game Over or Win screen
    else if (gameState === 'gameOver' && gameOverScreen.style.display !== 'none') { resetGame(); }
    else if (gameState === 'win' && winScreen.style.display !== 'none') { resetGame(); }
}
function hideLandmarkPopup() { /* ... hides landmark popup ... */
    if (gameState === 'paused') { landmarkPopup.style.display = 'none'; gameState = 'running'; requestAnimationFrame(gameLoop); }
}
// Keyboard listeners
window.addEventListener('keydown', (e) => {
    if (e.code === 'Space') { e.preventDefault(); if (!isJumpKeyDown) { handleJump(); } isJumpKeyDown = true; }
    // Allow Enter to reset from Game Over or Win screen
    else if (e.key === 'Enter' || e.code === 'Enter') {
        e.preventDefault();
        if (gameState === 'paused' && landmarkPopup.style.display !== 'none') { hideLandmarkPopup(); }
        else if (gameState === 'gameOver' && gameOverScreen.style.display !== 'none') { resetGame(); }
        else if (gameState === 'win' && winScreen.style.display !== 'none') { resetGame(); }
    }
});
window.addEventListener('keyup', (e) => { if (e.code === 'Space') { e.preventDefault(); isJumpKeyDown = false; } });

// Touch / Mouse listeners
canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    if (gameState === 'running' || gameState === 'paused') { handleJump(); isPointerDownJump = true; }
    // Allow tap to reset from Game Over or Win screen
    else if (gameState === 'gameOver' && gameOverScreen.style.display !== 'none') { resetGame(); }
    else if (gameState === 'win' && winScreen.style.display !== 'none') { resetGame(); }
});
canvas.addEventListener('mousedown', (e) => {
    if (gameState === 'running') { handleJump(); isPointerDownJump = true; }
    // Allow click to reset from Game Over or Win screen (delegated to overlay listeners)
});
// Global listeners to clear pointer flag
window.addEventListener('touchend', (e) => { isPointerDownJump = false; });
window.addEventListener('mouseup', (e) => { isPointerDownJump = false; });

// Overlay/Button listeners (Ensure Game Over reset works)
gameOverScreen.addEventListener('click', resetGame); // Click overlay to reset
winScreen.addEventListener('click', resetGame);
continueButton.addEventListener('click', hideLandmarkPopup);
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
    console.log(`Spawning ${selectedTypeKey} - Calculated Size: ${obstacleWidth.toFixed(0)}x${obstacleHeight.toFixed(0)}`);
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


// --- Update Game State (MODIFIED Collision Logic) ---
function update() {
    if (gameState !== 'running') return; // Check if running at the start
    frameCount++;

    // --- Stumble Management REMOVED ---

    // -- Player Physics -- (Variable Jump Logic included)
    let currentGravity = config.gravity;
    if (!playerState.isGrounded && playerState.vy < 0) { /* Variable jump gravity */
        if (isJumpKeyDown || isPointerDownJump) { currentGravity *= config.jumpHoldGravityMultiplier; } else { currentGravity *= config.jumpCutGravityMultiplier; }
    }
    playerState.vy += currentGravity; playerState.y += playerState.vy;

    // -- Ground Collision --
    const groundLevel = config.canvasHeight - config.groundHeight - playerState.height;
    if (playerState.y >= groundLevel) { playerState.y = groundLevel; playerState.vy = 0; playerState.isGrounded = true; }
    else { playerState.isGrounded = false; }

    // -- Obstacles --
    updateObstacles(); // Move/spawn using normal gameSpeed

    // -- Collision Checks (MODIFIED: Stomp=Bounce, Vulnerable Hit=GameOver, Rising Hit=Safe) --
    for (let i = obstacles.length - 1; i >= 0; i--) {
        const obstacle = obstacles[i];
        if (checkCollision(playerState, obstacle)) {
            const isFalling = playerState.vy > 0;
            const previousPlayerBottom = playerState.y + playerState.height - playerState.vy;
            const obstacleTop = obstacle.y;

            // Stomp Condition (Safe bounce)
            if (isFalling && previousPlayerBottom <= obstacleTop + 1) {
                console.log("Stomp detected!");
                playerState.vy = config.stompJumpStrength;
                playerState.y = obstacle.y - playerState.height;
                playerState.isGrounded = false; // Ensure not grounded after bounce
                // Optional: obstacles.splice(i, 1); // Remove stomped obstacle
                // Optional: score += 50;
                continue; // Skip other checks for this obstacle
            } else {
                 // Not a Stomp - Check if player is vulnerable (Grounded or Falling)
                 if (playerState.isGrounded || playerState.vy >= 0) {
                    // --- Vulnerable Collision -> Game Over ---
                    console.log("Game Over Collision Detected (Grounded or Falling)!");
                    gameState = 'gameOver';
                    showGameOverScreen(); // Show Game Over overlay
                    return; // STOP the update loop immediately
                 } else {
                    // --- Collision while Rising (vy < 0) ---
                    // Rule: Survive if jumping upwards. Do nothing.
                    console.log("Collision ignored (Player rising).");
                    // Optional: Add spark/sound effect without changing state
                 }
            }
        }
    }
    // --- END Collision Checks ---


    // -- Update Landmarks and Check Triggers -- (Position Based)
    for (let landmark of landmarks) {
        landmark.worldX -= gameSpeed; // Move sign
        // Check trigger condition
        if (!landmark.hasBeenTriggered && landmark.worldX < playerState.x + playerState.width && landmark.worldX + landmark.width > playerState.x) {
            console.log(`Triggering landmark: ${landmark.name}`); landmark.hasBeenTriggered = true; showLandmarkPopup(landmark);
            if (landmark.isFinal) { gameState = 'win'; showWinScreen(); } else { gameState = 'paused'; }
            // State change will pause/stop the update loop in the next frame check
        }
    }

    // -- Score --
    score++; scoreDisplay.textContent = `Punkte / Score: ${Math.floor(score / 10)}`;
}


// --- Draw Game ---
function draw() {
    ctx.clearRect(0, 0, config.canvasWidth, config.canvasHeight);

    // Draw Background
    if (assets.backgroundImage) { ctx.drawImage(assets.backgroundImage, 0, 0, config.canvasWidth, config.canvasHeight); }
    else { /* Fallback colors */ }

    // Draw Player
    if (assets.knightPlaceholder) { ctx.drawImage(assets.knightPlaceholder, playerState.x, playerState.y, playerState.width, playerState.height); }

    // Draw Obstacles
    obstacles.forEach(obstacle => { /* ... draw obstacle logic ... */
        const obstacleImage = assets[obstacle.typeKey]; if (obstacleImage) { ctx.drawImage(obstacleImage, obstacle.x, obstacle.y, obstacle.width, obstacle.height); } else { /* Fallback rect */ }
    });

    // Draw Landmark Signs
    if (assets.signImage) { /* ... draw sign logic ... */
        landmarks.forEach(landmark => { if (landmark.worldX < config.canvasWidth && landmark.worldX + landmark.width > 0) { ctx.drawImage(assets.signImage, landmark.worldX, landmark.yPos, landmark.width, landmark.height); } });
    }
}
// --- END Draw Game ---


// --- UI Updates ---
function showGameOverScreen() { gameOverScreen.style.display = 'flex'; } // Shows Game Over overlay
function showWinScreen() { winScreen.style.display = 'flex'; }


// --- Main Game Loop ---
function gameLoop() {
    // Check state at the very beginning of the loop
    if (gameState === 'paused' || gameState === 'gameOver' || gameState === 'win') {
        // console.log(`Game loop stopping/paused. State: ${gameState}`); // Optional debug
        return; // Stop loop if paused, game over, or won
    }
    // Only run update and draw if gameState is 'running' (or 'loading' initially handled by asset loader)
    if (gameState === 'running') {
        update();
        draw();
        requestAnimationFrame(gameLoop); // Continue loop
    }
}


// --- Start Game ---
loadAllAssets(); // Initiates asset loading, which calls resetGame on completion
// --- END Start Game ---

