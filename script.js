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

// --- Game Configuration (Tweaked Values) ---
const config = {
    canvasWidth: canvas.width,
    canvasHeight: canvas.height,
    gravity: 0.45, // Slightly lower gravity
    jumpStrength: -10.5, // Slightly stronger jump
    playerSpeed: 0,
    obstacleSpeed: 2.2, // Slower starting speed
    groundHeight: 50,
    spawnRate: 160, // Slightly slower spawn rate
    jumpHoldGravityMultiplier: 0.5,
    jumpCutGravityMultiplier: 2.0,
    stompJumpStrength: -8.5, // Slightly stronger stomp bounce
    maxGameSpeed: 7, // Slightly higher max speed
    startLives: 5,
    recoveryDuration: 90, // Shorter recovery time
    // Bad Belzig Color Palette
    colors: {
        green: '#0ca644', blue: '#0296c6', yellow: '#f5d306',
        black: '#151513', white: '#ffffff'
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
let isJumpKeyDown = false;
let isPointerDownJump = false;
let playerLives = config.startLives;
let isRecovering = false;
let recoveryTimer = 0;

// --- Asset Loading ---
const assets = {
    knightPlaceholder: null, stoneObstacle: null, familyObstacle: null,
    tractorObstacle: null, backgroundImage: null, signImage: null,
    loaded: 0, total: 0,
    sources: {
        knightPlaceholder: 'assets/knight_placeholder.png', stoneObstacle: 'assets/stones.png',
        familyObstacle: 'assets/family.png', tractorObstacle: 'assets/tractor.png',
        backgroundImage: 'assets/background.png', signImage: 'assets/sign.png'
    }
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


// --- Landmark Data (CORRECTED - LONGER Descriptions Included This Time!) ---
const landmarkConfig = [
    {
        name: "SteinTherme", worldX: 1500, width: 60, height: 90,
        descEN: "Relax in the SteinTherme! Bad Belzig's unique thermal bath uses warm, salty water (Sole) rich in iodine. This is great for health and relaxation. Besides the pools, there's an extensive sauna world and wellness treatments available year-round.",
        descDE: "Entspann dich in der SteinTherme! Bad Belzigs einzigartiges Thermalbad nutzt warmes Salzwasser (Sole), reich an Jod. Das ist gut für Gesundheit und Entspannung. Neben den Becken gibt es eine große Saunawelt und Wellnessanwendungen, ganzjährig geöffnet.",
        isFinal: false
    },
    {
        name: "Freibad", worldX: 3000, width: 60, height: 90,
        descEN: "Cool off at the Freibad! This outdoor pool is popular in summer (usually May-Sept). It features swimming lanes, water slides, and separate areas for children, making it perfect for sunny family days.",
        descDE: "Kühl dich ab im Freibad! Dieses Freibad ist im Sommer beliebt (meist Mai-Sept). Es gibt Schwimmbahnen, Wasserrutschen und separate Bereiche für Kinder, perfekt für sonnige Familientage.",
        isFinal: false
    },
    {
        name: "Kulturzentrum & Bibliothek", worldX: 4500, width: 60, height: 90,
        descEN: "This building at Weitzgrunder Str. 4 houses the town library and the KleinKunstWerk cultural center. Check their schedule for concerts, theatre, readings, and cabaret. The library offers books, media, and internet access.",
        descDE: "Dieses Gebäude in der Weitzgrunder Str. 4 beherbergt die Stadtbibliothek und das KleinKunstWerk Kulturzentrum. Informieren Sie sich über Konzerte, Theater, Lesungen und Kabarett. Die Bibliothek bietet Bücher, Medien und Internetzugang.",
        isFinal: false
    },
    {
        name: "Fläming Bahnhof", worldX: 6000, width: 60, height: 90,
        descEN: "All aboard at Fläming Bahnhof! The RE7 train line connects Bad Belzig directly to Berlin and Dessau. The station also serves as a gateway for exploring the scenic Hoher Fläming nature park, perhaps by bike.",
        descDE: "Einsteigen bitte am Fläming Bahnhof! Die Zuglinie RE7 verbindet Bad Belzig direkt mit Berlin und Dessau. Der Bahnhof dient auch als Tor zur Erkundung des malerischen Naturparks Hoher Fläming, vielleicht mit dem Fahrrad.",
        isFinal: false
    },
    {
        name: "Postmeilensäule (1725)", worldX: 7500, width: 60, height: 90, // Sign size
        descEN: "See how far? This sandstone Postal Milestone (Postmeilensäule) from 1725 is located on the Marktplatz. Erected under August the Strong of Saxony, it marked postal routes, showing distances and travel times (often in hours) with symbols like the post horn.",
        descDE: "Schon gesehen? Diese kursächsische Postmeilensäule aus Sandstein von 1725 steht auf dem Marktplatz. Errichtet unter August dem Starken, markierte sie Postrouten und zeigte Distanzen und Reisezeiten (oft in Stunden) mit Symbolen wie dem Posthorn.",
        isFinal: false
    },
    {
        name: "Rathaus & Tourist-Information", worldX: 9000, width: 60, height: 90,
        descEN: "The historic Rathaus (Town Hall) sits centrally on the Marktplatz. Inside, you'll find the Tourist Information centre. They offer maps, accommodation booking, tips on events, and guided tour information.",
        descDE: "Das historische Rathaus befindet sich zentral am Marktplatz. Im Inneren finden Sie die Tourist-Information. Dort erhalten Sie Stadtpläne, Hilfe bei der Zimmervermittlung, Veranstaltungstipps und Informationen zu Führungen.",
        isFinal: false
    },
    {
        name: "Burg Eisenhardt", worldX: 10500, width: 60, height: 90, // Sign size
        descEN: "You made it to Burg Eisenhardt! This impressive medieval castle overlooks the town. Explore the local history museum (Heimatmuseum), climb the 'Butterturm' keep for great views, and check for festivals or concerts held here.",
        descDE: "Geschafft! Du hast die Burg Eisenhardt erreicht! Diese beeindruckende mittelalterliche Burg überblickt die Stadt. Erkunden Sie das Heimatmuseum, besteigen Sie den Butterturm für eine tolle Aussicht und achten Sie auf Festivals oder Konzerte.",
        isFinal: true
    },
];
function initializeLandmarks() { /* ... initializes landmarks array ... */
    landmarks = landmarkConfig.map(cfg => ({ ...cfg, yPos: cfg.yPos || (config.canvasHeight - config.groundHeight - (cfg.height || 90)), hasBeenTriggered: false }));
}
// --- END Landmark Data ---


// --- Player State Initialization ---
function resetPlayer() { /* ... resets player properties ... */
    playerState = { x: 50, y: config.canvasHeight - config.groundHeight - 75, width: 60, height: 75, vy: 0, isGrounded: true };
}


// --- Game Reset Function ---
function resetGame() {
    console.log("Resetting game...");
    resetPlayer(); obstacles = []; initializeLandmarks(); score = 0; frameCount = 0;
    gameSpeed = config.obstacleSpeed; // Reset speed
    isJumpKeyDown = false; isPointerDownJump = false;
    playerLives = config.startLives; isRecovering = false; recoveryTimer = 0; // Reset lives/recovery
    livesDisplay.textContent = `Leben / Lives: ${playerLives}`; // Update display
    scoreDisplay.textContent = `Punkte / Score: 0`;
    gameOverScreen.style.display = 'none'; winScreen.style.display = 'none'; landmarkPopup.style.display = 'none';
    gameState = 'running';
    requestAnimationFrame(gameLoop);
}

// --- Input Handling ---
function handleJump() { /* ... jump logic ... */
    if (gameState === 'running' && playerState.isGrounded) { playerState.vy = config.jumpStrength; playerState.isGrounded = false; }
    else if (gameState === 'gameOver' && gameOverScreen.style.display !== 'none') { resetGame(); } else if (gameState === 'win' && winScreen.style.display !== 'none') { resetGame(); }
}
function hideLandmarkPopup() { /* ... hide popup logic ... */
    if (gameState === 'paused') { landmarkPopup.style.display = 'none'; gameState = 'running'; requestAnimationFrame(gameLoop); }
}
// Event listeners
window.addEventListener('keydown', (e) => { /* ... keydown logic ... */
    if (e.code === 'Space') { e.preventDefault(); if (!isJumpKeyDown) { handleJump(); } isJumpKeyDown = true; }
    else if (e.key === 'Enter' || e.code === 'Enter') { e.preventDefault(); if (gameState === 'paused' && landmarkPopup.style.display !== 'none') { hideLandmarkPopup(); } else if (gameState === 'gameOver' && gameOverScreen.style.display !== 'none') { resetGame(); } else if (gameState === 'win' && winScreen.style.display !== 'none') { resetGame(); } }
});
window.addEventListener('keyup', (e) => { if (e.code === 'Space') { e.preventDefault(); isJumpKeyDown = false; } });
canvas.addEventListener('touchstart', (e) => { /* ... touchstart logic ... */
    e.preventDefault(); if (gameState === 'running' || gameState === 'paused') { handleJump(); isPointerDownJump = true; } else if (gameState === 'gameOver' && gameOverScreen.style.display !== 'none') { resetGame(); } else if (gameState === 'win' && winScreen.style.display !== 'none') { resetGame(); }
});
canvas.addEventListener('mousedown', (e) => { if (gameState === 'running') { handleJump(); isPointerDownJump = true; } });
window.addEventListener('touchend', (e) => { isPointerDownJump = false; }); window.addEventListener('mouseup', (e) => { isPointerDownJump = false; });
gameOverScreen.addEventListener('click', resetGame); winScreen.addEventListener('click', resetGame); continueButton.addEventListener('click', hideLandmarkPopup);
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
    console.log(`Spawning ${selectedTypeKey} - Size: ${obstacleWidth.toFixed(0)}x${obstacleHeight.toFixed(0)}`);
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


// --- Update Game State ---
function update() {
    if (gameState !== 'running') return;
    frameCount++;

    // Manage Recovery State
    if (isRecovering) { /* ... recovery timer logic ... */
        recoveryTimer--; if (recoveryTimer <= 0) { isRecovering = false; console.log("Recovery finished."); }
    }

    // Player Physics (Variable Jump)
    let currentGravity = config.gravity; /* ... variable jump gravity ... */
    if (!playerState.isGrounded && playerState.vy < 0) { if (isJumpKeyDown || isPointerDownJump) { currentGravity *= config.jumpHoldGravityMultiplier; } else { currentGravity *= config.jumpCutGravityMultiplier; } }
    playerState.vy += currentGravity; playerState.y += playerState.vy;

    // Ground Collision
    const groundLevel = config.canvasHeight - config.groundHeight - playerState.height; /* ... ground check ... */
    if (playerState.y >= groundLevel) { playerState.y = groundLevel; playerState.vy = 0; playerState.isGrounded = true; } else { playerState.isGrounded = false; }

    // Obstacles
    updateObstacles(); // Uses current gameSpeed

    // Collision Checks (Stomp=Bounce, Vulnerable Hit=Lose Life/GameOver, Rising Hit=Safe, Score Penalty)
    if (!isRecovering) { // Only check collisions if NOT recovering
        for (let i = obstacles.length - 1; i >= 0; i--) {
            const obstacle = obstacles[i]; if (checkCollision(playerState, obstacle)) {
                const isFalling = playerState.vy > 0; const previousPlayerBottom = playerState.y + playerState.height - playerState.vy; const obstacleTop = obstacle.y;
                if (isFalling && previousPlayerBottom <= obstacleTop + 1) { /* Stomp */
                     console.log("Stomp detected!"); playerState.vy = config.stompJumpStrength; playerState.y = obstacle.y - playerState.height; playerState.isGrounded = false;
                     score += 50; // Stomp bonus
                     obstacles.splice(i, 1); // Remove obstacle
                     continue; // Skip other checks for this obstacle
                } else { /* Not a Stomp */ if (playerState.isGrounded || playerState.vy >= 0) { /* Vulnerable Hit */
                    console.log("Vulnerable Collision Detected!"); playerLives--; livesDisplay.textContent = `Leben / Lives: ${playerLives}`; score -= 75; if (score < 0) { score = 0; } // Penalty
                    if (playerLives <= 0) { /* Game Over */ console.log("Game Over!"); gameState = 'gameOver'; showGameOverScreen(); return; /* STOP update */ }
                    else { /* Trigger Recovery */ console.log("Lost a life, starting recovery."); isRecovering = true; recoveryTimer = config.recoveryDuration; playerState.vy = -3; playerState.isGrounded = false; break; /* Stop checking collisions */ }
                 } else { /* Rising Hit -> Safe */ console.log("Collision ignored (Player rising)."); }
                }
            }
        }
    }

    // Update Landmarks and Check Triggers
    for (let landmark of landmarks) { /* ... landmark movement and trigger logic ... */
        landmark.worldX -= gameSpeed; if (!landmark.hasBeenTriggered && landmark.worldX < playerState.x + playerState.width && landmark.worldX + landmark.width > playerState.x) { console.log(`Triggering landmark: ${landmark.name}`); landmark.hasBeenTriggered = true; showLandmarkPopup(landmark); if (landmark.isFinal) { gameState = 'win'; showWinScreen(); } else { gameState = 'paused'; } }
    }

    // Score
    score++; scoreDisplay.textContent = `Punkte / Score: ${Math.floor(score / 8)}`; // Faster score display

    // Gradual Speed Increase
    if (frameCount > 0 && frameCount % 240 === 0) { // Faster interval
        if (gameSpeed < config.maxGameSpeed) {
            gameSpeed += 0.07; // Slightly faster increment
            gameSpeed = parseFloat(gameSpeed.toFixed(2)); console.log("Speed Increased:", gameSpeed);
        }
    }
}


// --- Draw Game ---
function draw() {
    ctx.clearRect(0, 0, config.canvasWidth, config.canvasHeight);

    // Draw Background
    if (assets.backgroundImage) { ctx.drawImage(assets.backgroundImage, 0, 0, config.canvasWidth, config.canvasHeight); }
    else { /* Fallback colors */ }

    // Draw Player (With recovery flashing)
    let drawPlayer = true;
    if (isRecovering && frameCount % 8 < 4) { drawPlayer = false; } // Faster flash
    if (drawPlayer && assets.knightPlaceholder) { ctx.drawImage(assets.knightPlaceholder, playerState.x, playerState.y, playerState.width, playerState.height); }
    else if (drawPlayer && !assets.knightPlaceholder) { /* Fallback rect */ }

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
function showGameOverScreen() { gameOverScreen.style.display = 'flex'; }
function showWinScreen() { winScreen.style.display = 'flex'; }


// --- Main Game Loop ---
function gameLoop() { /* ... checks state and calls update/draw ... */
    if (gameState === 'paused' || gameState === 'gameOver' || gameState === 'win') { return; }
    if (gameState === 'running') { update(); draw(); requestAnimationFrame(gameLoop); }
}


// --- Start Game ---
loadAllAssets(); // Initiates loading, calls resetGame on completion
// --- END Start Game ---
