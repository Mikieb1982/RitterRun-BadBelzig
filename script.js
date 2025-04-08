// --- Get DOM Elements ---
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreDisplay = document.getElementById('scoreDisplay');
const livesDisplay = document.getElementById('livesDisplay');
const landmarkPopup = document.getElementById('landmarkPopup');
const landmarkName = document.getElementById('landmarkName');
const landmarkDescription = document.getElementById('landmarkDescription');
const continueButton = document.getElementById('continueButton');
const gameOverScreen = document.getElementById('gameOverScreen');
const winScreen = document.getElementById('winScreen');

// Error check: Ensure canvas and context were obtained
if (!canvas || !ctx) {
    console.error("Fatal Error: Could not get canvas or 2D context.");
    const errDiv = document.createElement('div');
    errDiv.textContent = "Error loading game canvas. Please refresh or try a different browser.";
    errDiv.style.color = 'red'; errDiv.style.position = 'absolute';
    errDiv.style.top = '50%'; errDiv.style.left = '50%';
    errDiv.style.transform = 'translate(-50%, -50%)';
    document.body.appendChild(errDiv);
    throw new Error("Canvas initialization failed.");
}

// --- Game Configuration ---
const config = {
    canvasWidth: canvas.width, canvasHeight: canvas.height,
    gravity: 0.45, jumpStrength: -10.5, playerSpeed: 0,
    obstacleSpeed: 2.2, groundHeight: 50, spawnRate: 160,
    jumpHoldGravityMultiplier: 0.5, jumpCutGravityMultiplier: 2.0,
    stompJumpStrength: -8.5, maxGameSpeed: 7, startLives: 5,
    recoveryDuration: 90,
    colors: { green: '#0ca644', blue: '#0296c6', yellow: '#f5d306', black: '#151513', white: '#ffffff', ground: '#8b4513' }
};

// --- Game State Variables ---
let gameState = 'loading';
let playerState = {};
let obstacles = [];
let landmarks = [];
let score = 0;
let frameCount = 0;
let gameSpeed = config.obstacleSpeed;
let isJumpKeyDown = false;
let isPointerDownJump = false;
let playerLives = config.startLives;
let isRecovering = false;
let recoveryTimer = 0;
let backgroundX = 0; // **MODIFIED:** Re-introduced for scrolling background

// --- Asset Loading ---
const assets = {
    knightPlaceholder: null, stoneObstacle: null, familyObstacle: null,
    tractorObstacle: null, backgroundImage: null, signImage: null,
    loaded: 0, total: 0,
    sources: {
        knightPlaceholder: 'assets/knight_placeholder.png',
        stoneObstacle: 'assets/stones.png',
        familyObstacle: 'assets/family.png',
        tractorObstacle: 'assets/tractor.png',
        backgroundImage: 'assets/background.png',
        signImage: 'assets/sign.png'
    }
};

function loadImage(key, src) {
    assets.total++;
    const img = new Image();
    img.src = src;
    img.onerror = () => {
        console.error(`Failed to load asset: ${key} from ${src}.`);
        assets.loaded++; assets[key] = null;
        if (assets.loaded === assets.total) {
            console.log("Asset loading finished (some may have failed).");
            setupCanvas(); resetGame();
        }
    };
    img.onload = () => {
        assets.loaded++; assets[key] = img;
        if (assets.loaded === assets.total) {
            console.log("All assets loaded successfully.");
            setupCanvas(); resetGame();
        }
    };
}

function loadAllAssets() {
    console.log("Starting asset loading...");
    gameState = 'loading';
    for (const key in assets.sources) { assets[key] = null; }
    assets.loaded = 0; assets.total = 0;
    for (const key in assets.sources) { loadImage(key, assets.sources[key]); }
    if (assets.total === 0) {
        console.warn("No assets defined.");
        setupCanvas(); resetGame();
    }
}
// --- END Asset Loading ---

// --- Canvas Setup ---
function setupCanvas() {
    const container = document.getElementById('gameContainer');
    if (!container) { console.error("Game container not found!"); return; }
    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;
    if (canvas.width !== containerWidth || canvas.height !== containerHeight) {
        canvas.width = containerWidth; canvas.height = containerHeight;
        console.log(`Canvas resized to: ${canvas.width}x${canvas.height}`);
    }
    config.canvasWidth = canvas.width; config.canvasHeight = canvas.height;
}

window.addEventListener('resize', () => {
    if (window.matchMedia("(orientation: landscape)").matches) {
         setupCanvas();
         if (gameState === 'running' || gameState === 'paused' || gameState === 'loading') {
             if (gameState === 'loading') { ctx.clearRect(0, 0, config.canvasWidth, config.canvasHeight); }
             else { draw(); }
         }
    }
});
// --- END Canvas Setup ---

// --- Landmark Data ---
const landmarkConfig = [
     { name: "SteinTherme", worldX: 1500, width: 60, height: 90, descEN: "Relax in the SteinTherme! Bad Belzig's unique thermal bath uses warm, salty water (Sole) rich in iodine. This is great for health and relaxation. Besides the pools, there's an extensive sauna world and wellness treatments available year-round.", descDE: "Entspann dich in der SteinTherme! Bad Belzigs einzigartiges Thermalbad nutzt warmes Salzwasser (Sole), reich an Jod. Das ist gut für Gesundheit und Entspannung. Neben den Becken gibt es eine große Saunawelt und Wellnessanwendungen, ganzjährig geöffnet.", isFinal: false },
     { name: "Frei und Erlebnisbad", worldX: 3000, width: 60, height: 90, descEN: "Cool off at the Freibad! This outdoor pool is popular in summer (usually May-Sept). It features swimming lanes, water slides, and separate areas for children, making it perfect for sunny family days.", descDE: "Kühl dich ab im Freibad! Dieses Freibad ist im Sommer beliebt (meist Mai-Sept). Es gibt Schwimmbahnen, Wasserrutschen und separate Bereiche für Kinder, perfekt für sonnige Familientage.", isFinal: false },
     { name: "Kulturzentrum & Bibliothek", worldX: 4500, width: 60, height: 90, descEN: "This building at Weitzgrunder Str. 4 houses the town library and the cultural centre.", descDE: "Dieses Gebäude in der Weitzgrunder Str. 4 beherbergt die Stadtbibliothek und das Kulturzentrum..", isFinal: false },
     { name: "Fläming Bahnhof", worldX: 6000, width: 60, height: 90, descEN: "All aboard at Fläming Bahnhof! The RE7 train line connects Bad Belzig directly to Berlin and Dessau. The station also serves as a gateway for exploring the scenic Hoher Fläming nature park, perhaps by bike.", descDE: "Einsteigen bitte am Fläming Bahnhof! Die Zuglinie RE7 verbindet Bad Belzig direkt mit Berlin und Dessau. Der Bahnhof dient auch als Tor zur Erkundung des malerischen Naturparks Hoher Fläming, vielleicht mit dem Fahrrad.", isFinal: false },
     { name: "Postmeilensäule", worldX: 7500, width: 60, height: 90, descEN: "See how far? This sandstone Postal Milestone (Postmeilensäule) from 1725 is located on the Marktplatz. Erected under August the Strong of Saxony, it marked postal routes, showing distances and travel times (often in hours) with symbols like the post horn.", descDE: "Schon gesehen? Diese kursächsische Postmeilensäule aus Sandstein von 1725 steht auf dem Marktplatz. Errichtet unter August dem Starken, markierte sie Postrouten und zeigte Distanzen und Reisezeiten (oft in Stunden) mit Symbolen wie dem Posthorn.", isFinal: false },
     { name: "Rathaus & Tourist-Information", worldX: 9000, width: 60, height: 90, descEN: "The historic Rathaus (Town Hall) sits centrally on the Marktplatz. Inside, you'll find the Tourist Information centre. They offer maps, accommodation booking, tips on events, and guided tour information.", descDE: "Das historische Rathaus befindet sich zentral am Marktplatz. Im Inneren finden Sie die Tourist-Information. Dort erhalten Sie Stadtpläne, Hilfe bei der Zimmervermittlung, Veranstaltungstipps und Informationen zu Führungen.", isFinal: false },
     { name: "Burg Eisenhardt", worldX: 10500, width: 60, height: 90, descEN: "You made it to Burg Eisenhardt! This impressive medieval castle overlooks the town. Explore the local history museum (Heimatmuseum), climb the 'Butterturm' keep for great views, and check for festivals or concerts held here.", descDE: "Geschafft! Du hast die Burg Eisenhardt erreicht! Diese beeindruckende mittelalterliche Burg überblickt die Stadt. Erkunden Sie das Heimatmuseum, besteigen Sie den Butterturm für eine tolle Aussicht und achten Sie auf Festivals oder Konzerte.", isFinal: true },
];

function initializeLandmarks() {
    const currentCanvasHeight = config.canvasHeight;
    const baseSignHeight = 90;
    const scaleFactor = currentCanvasHeight / 400;
    const scaledSignHeight = baseSignHeight * scaleFactor;
    landmarks = landmarkConfig.map(cfg => ({
        ...cfg,
        yPos: currentCanvasHeight - config.groundHeight - scaledSignHeight,
        hasBeenTriggered: false
    }));
}
// --- END Landmark Data ---

// --- Player State Initialization ---
function resetPlayer() {
    const currentCanvasHeight = config.canvasHeight;
    const playerHeight = currentCanvasHeight * 0.15;
    const playerWidth = playerHeight * (60 / 75);
    playerState = {
        x: 50, y: currentCanvasHeight - config.groundHeight - playerHeight,
        width: playerWidth, height: playerHeight,
        vy: 0, isGrounded: true
    };
}

// --- Game Reset Function ---
function resetGame() {
    console.log("Resetting game...");
    setupCanvas(); // Ensure canvas size is current
    resetPlayer();
    obstacles = [];
    initializeLandmarks();
    score = 0; frameCount = 0; gameSpeed = config.obstacleSpeed;
    isJumpKeyDown = false; isPointerDownJump = false;
    playerLives = config.startLives; isRecovering = false; recoveryTimer = 0;
    backgroundX = 0; // **MODIFIED:** Reset background position

    livesDisplay.textContent = `Leben / Lives: ${playerLives}`;
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
        playerState.vy = config.jumpStrength * (config.canvasHeight / 400);
        playerState.isGrounded = false;
    } else if (gameState === 'gameOver' && gameOverScreen.style.display !== 'none') {
        resetGame();
    } else if (gameState === 'win' && winScreen.style.display !== 'none') {
        resetGame();
    }
}

function hideLandmarkPopup() {
    const popupIsVisible = landmarkPopup.style.display !== 'none';
    if (!popupIsVisible) return;
    landmarkPopup.style.display = 'none';
    if (gameState === 'win') { showWinScreen(); }
    else if (gameState === 'paused') {
        gameState = 'running';
        requestAnimationFrame(gameLoop);
    }
}

// Event listeners (No changes here)
window.addEventListener('keydown', (e) => { if (e.code === 'Space') { e.preventDefault(); if (!isJumpKeyDown) { handleJump(); } isJumpKeyDown = true; } else if (e.key === 'Enter' || e.code === 'Enter') { e.preventDefault(); if ((gameState === 'paused' || gameState === 'win') && landmarkPopup.style.display !== 'none') { hideLandmarkPopup(); } else if (gameState === 'gameOver' && gameOverScreen.style.display !== 'none') { resetGame(); } else if (gameState === 'win' && winScreen.style.display !== 'none') { resetGame(); } } });
window.addEventListener('keyup', (e) => { if (e.code === 'Space') { e.preventDefault(); isJumpKeyDown = false; } });
canvas.addEventListener('touchstart', (e) => { e.preventDefault(); if (gameState === 'running' || gameState === 'paused') { handleJump(); isPointerDownJump = true; } else if (gameState === 'gameOver') { resetGame(); } else if (gameState === 'win') { resetGame(); } });
canvas.addEventListener('mousedown', (e) => { if (gameState === 'running') { handleJump(); isPointerDownJump = true; } });
window.addEventListener('touchend', (e) => { isPointerDownJump = false; });
window.addEventListener('mouseup', (e) => { isPointerDownJump = false; });
gameOverScreen.addEventListener('click', resetGame);
winScreen.addEventListener('click', resetGame);
continueButton.addEventListener('click', hideLandmarkPopup);
// --- END Input Handling ---

// --- Collision Detection ---
function checkCollision(rect1, rect2) { return ( rect1.x < rect2.x + rect2.width && rect1.x + rect1.width > rect2.x && rect1.y < rect2.y + rect2.height && rect1.y + rect1.height > rect2.y ); }

// --- Obstacle Handling ---
const obstacleTypes = ['stoneObstacle', 'familyObstacle', 'tractorObstacle'];

function spawnObstacle() {
    const typeIndex = Math.floor(Math.random() * obstacleTypes.length);
    const selectedTypeKey = obstacleTypes[typeIndex];
    let baseHeight, baseWidth;
    switch (selectedTypeKey) {
        case 'familyObstacle': baseHeight = 100; baseWidth = 70; break;
        case 'tractorObstacle': baseHeight = 80; baseWidth = 115; break;
        case 'stoneObstacle': default: baseHeight = 40; baseWidth = 30; break;
    }
    const scaleFactor = config.canvasHeight / 400;
    let obstacleHeight = baseHeight * scaleFactor;
    let obstacleWidth = baseWidth * scaleFactor;

    obstacles.push({
        x: config.canvasWidth,
        y: config.canvasHeight - config.groundHeight - obstacleHeight,
        width: obstacleWidth, height: obstacleHeight, typeKey: selectedTypeKey
    });
}

function updateObstacles() {
     const scaledGameSpeed = gameSpeed * (config.canvasWidth / 800);
    if (frameCount > 100 && frameCount % config.spawnRate === 0) { spawnObstacle(); }
    for (let i = obstacles.length - 1; i >= 0; i--) {
        obstacles[i].x -= scaledGameSpeed;
        if (obstacles[i].x + obstacles[i].width < 0) { obstacles.splice(i, 1); }
    }
}
// --- END Obstacle Handling ---

// --- Landmark Display ---
function showLandmarkPopup(landmark) { landmarkName.textContent = landmark.name; landmarkDescription.innerHTML = `${landmark.descEN}<br><br>${landmark.descDE}`; landmarkPopup.style.display = 'flex'; }

// --- Update Game State ---
function update() {
    if (gameState !== 'running') return;
    frameCount++;
    if (isRecovering) { if (--recoveryTimer <= 0) { isRecovering = false; } }

    // Player physics
    let currentGravity = config.gravity * (config.canvasHeight / 400);
    if (!playerState.isGrounded && playerState.vy < 0) {
        if (isJumpKeyDown || isPointerDownJump) { currentGravity *= config.jumpHoldGravityMultiplier; }
        else { currentGravity *= config.jumpCutGravityMultiplier; }
    }
    playerState.vy += currentGravity; playerState.y += playerState.vy;

    // Ground collision
    const groundLevel = config.canvasHeight - config.groundHeight - playerState.height;
    if (playerState.y >= groundLevel) { playerState.y = groundLevel; playerState.vy = 0; playerState.isGrounded = true; }
    else { playerState.isGrounded = false; }

    updateObstacles();

    // Collision Checks
    if (!isRecovering) {
        for (let i = obstacles.length - 1; i >= 0; i--) {
            const obstacle = obstacles[i];
            if (checkCollision(playerState, obstacle)) {
                const isFalling = playerState.vy > 0;
                const previousPlayerBottom = playerState.y + playerState.height - playerState.vy;
                const obstacleTop = obstacle.y;
                if (isFalling && previousPlayerBottom <= obstacleTop + 1) { // Stomp
                    playerState.vy = config.stompJumpStrength * (config.canvasHeight / 400);
                    playerState.y = obstacle.y - playerState.height;
                    playerState.isGrounded = false; score += 50; obstacles.splice(i, 1); continue;
                } else { // Hit
                     playerLives--; livesDisplay.textContent = `Leben / Lives: ${playerLives}`;
                     score -= 75; if (score < 0) { score = 0; }
                     if (playerLives <= 0) { gameState = 'gameOver'; showGameOverScreen(); return; }
                     else { isRecovering = true; recoveryTimer = config.recoveryDuration; playerState.vy = -3 * (config.canvasHeight / 400); playerState.isGrounded = false; break; }
                }
            }
        }
    }

    // Landmark Triggers
    const scaledGameSpeed = gameSpeed * (config.canvasWidth / 800);
    for (let landmark of landmarks) {
        landmark.worldX -= scaledGameSpeed;
        const scaleFactor = config.canvasHeight / 400;
        const signW = (landmark.width || 60) * scaleFactor;
        if (!landmark.hasBeenTriggered && landmark.worldX < playerState.x + playerState.width && landmark.worldX + signW > playerState.x) {
            landmark.hasBeenTriggered = true; showLandmarkPopup(landmark);
            if (landmark.isFinal) { gameState = 'win'; } else { gameState = 'paused'; }
            return;
        }
    }

    // Score update
    score++; scoreDisplay.textContent = `Punkte / Score: ${Math.floor(score / 5)}`;

    // Speed increase
    if (frameCount > 0 && frameCount % 240 === 0) {
        if (gameSpeed < config.maxGameSpeed) { gameSpeed += 0.07; gameSpeed = parseFloat(gameSpeed.toFixed(2)); }
    }

     // **MODIFIED:** Background Scroll Update
     backgroundX -= scaledGameSpeed * 0.5; // Adjust 0.5 for parallax speed
     // Estimate scaled background width for seamless looping (using height scaling)
     let scaledBgWidth = config.canvasWidth; // Default if no image
     if (assets.backgroundImage) {
         const bgScaleFactor = (config.canvasHeight - config.groundHeight) / assets.backgroundImage.height;
         scaledBgWidth = assets.backgroundImage.width * bgScaleFactor;
     }
     // Reset background position for looping effect
     // Use Math.abs to prevent issues if scaledBgWidth is somehow negative/zero
     if (scaledBgWidth > 0 && backgroundX <= -scaledBgWidth) {
         backgroundX += scaledBgWidth;
     }
}


// --- Draw Game ---
function draw() {
    const canvasW = config.canvasWidth;
    const canvasH = config.canvasHeight;
    ctx.clearRect(0, 0, canvasW, canvasH);

     // --- Draw Background (Scrolling Tiled) ---
     // **MODIFIED:** Changed drawing logic back to tiling/scrolling
     const destH = canvasH - config.groundHeight; // Height to draw background
     if (assets.backgroundImage && destH > 0) {
         const img = assets.backgroundImage;
         // Scale background to fit the available height
         const scaleFactor = destH / img.height;
         const scaledBgWidth = img.width * scaleFactor;

         // Calculate starting X position for seamless looping based on backgroundX
         // Use Math.abs to handle potential negative scaledBgWidth if image/canvas is tiny
         let currentX = scaledBgWidth > 0 ? (backgroundX % scaledBgWidth) : backgroundX;
         // Ensure it starts off-screen left if necessary for smooth loop
         if (currentX > 0 && scaledBgWidth > 0) currentX -= scaledBgWidth;

         // Draw background image tiles to cover the canvas width
         // Ensure scaledBgWidth is positive before entering loop to prevent infinite loop
         if (scaledBgWidth > 0) {
             while (currentX < canvasW) {
                 ctx.drawImage(
                     img, // Source image
                     0, 0, img.width, img.height, // Source rect (full image)
                     currentX, 0, scaledBgWidth, destH // Destination rect (scaled and positioned)
                 );
                 currentX += scaledBgWidth; // Move to next tile position
             }
         } else {
             // Handle case where scaledBgWidth is zero or negative (e.g., image failed to load height)
             ctx.fillStyle = config.colors.blue;
             ctx.fillRect(0, 0, canvasW, destH);
         }

     } else if (destH > 0) {
         // Fallback: Draw solid blue sky if background image failed or destH is 0
         ctx.fillStyle = config.colors.blue;
         ctx.fillRect(0, 0, canvasW, destH);
     }


     // --- Draw Visual Ground ---
     ctx.fillStyle = config.colors.ground;
     ctx.fillRect(0, canvasH - config.groundHeight, canvasW, config.groundHeight);

    // --- Draw Player ---
    let drawPlayer = true;
    if (isRecovering && frameCount % 10 < 5) { drawPlayer = false; }
    if (drawPlayer) {
        if (assets.knightPlaceholder) { ctx.drawImage(assets.knightPlaceholder, playerState.x, playerState.y, playerState.width, playerState.height); }
        else { ctx.fillStyle = config.colors.green; ctx.fillRect(playerState.x, playerState.y, playerState.width, playerState.height); }
    }

    // --- Draw Obstacles ---
    obstacles.forEach(obstacle => {
        const obstacleImage = assets[obstacle.typeKey];
        if (obstacleImage) { ctx.drawImage(obstacleImage, obstacle.x, obstacle.y, obstacle.width, obstacle.height); }
        else { ctx.fillStyle = config.colors.black; ctx.fillRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height); }
    });

    // --- Draw Landmark Signs ---
    landmarks.forEach(landmark => {
         const scaleFactor = config.canvasHeight / 400;
         const signW = (landmark.width || 60) * scaleFactor;
         const signH = (landmark.height || 90) * scaleFactor;
         const signY = config.canvasHeight - config.groundHeight - signH;
         if (landmark.worldX < canvasW && landmark.worldX + signW > 0) {
             if (assets.signImage) { ctx.drawImage(assets.signImage, landmark.worldX, signY, signW, signH); }
             else { ctx.fillStyle = config.colors.ground; ctx.fillRect(landmark.worldX, signY, signW, signH); }
         }
    });
}
// --- END Draw Game ---

// --- UI Updates ---
function showGameOverScreen() { gameOverScreen.style.display = 'flex'; }
function showWinScreen() { winScreen.style.display = 'flex'; }

// --- Main Game Loop ---
function gameLoop() {
    if (gameState !== 'running') { return; }
    update();
    draw();
    requestAnimationFrame(gameLoop);
}

// --- Start Game ---
loadAllAssets(); // Start loading assets, which calls setupCanvas and resetGame
// --- END Start Game ---
