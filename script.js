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
let landmarks = []; // Populated by initializeLandmarks
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
    signImage: null,

    // Loading Progress Tracking
    loaded: 0,
    total: 0,
    sources: { // Asset paths
        knightPlaceholder: 'assets/knight_placeholder.png',
        stoneObstacle: 'assets/stones.png',
        familyObstacle: 'assets/family.png',
        tractorObstacle: 'assets/tractor.png',
        backgroundImage: 'assets/background.png',
        signImage: 'assets/sign.png'
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
        assets[key] = img;
        console.log(`Assets loaded: ${assets.loaded} / ${assets.total}`);
        if (assets.loaded === assets.total) {
            console.log("All assets loaded. Starting game...");
            resetGame();
        }
    };
    img.onerror = () => { console.error(`Failed to load asset: ${key} from ${src}`); };
}

// loadAllAssets function
function loadAllAssets() {
    console.log("Starting asset loading...");
    gameState = 'loading';
    assets.loaded = 0; assets.total = 0;
    for (const key in assets.sources) { loadImage(key, assets.sources[key]); }
    if (assets.total === 0) { console.warn("No assets defined..."); resetGame(); }
}
// --- END Asset Loading ---


// --- Landmark Data (UPDATED with LONGER INFO) ---
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

function initializeLandmarks() {
    landmarks = landmarkConfig.map(cfg => ({
        ...cfg,
        yPos: cfg.yPos || (config.canvasHeight - config.groundHeight - (cfg.height || 90)),
        hasBeenTriggered: false
    }));
}
// --- END Landmark Data ---


// --- Player State Initialization (Bigger Knight) ---
function resetPlayer() {
    playerState = {
        x: 50, y: config.canvasHeight - config.groundHeight - 75,
        width: 60, height: 75, vy: 0, isGrounded: true
    };
}


// --- Game Reset Function ---
function resetGame() {
    console.log("Resetting game...");
    resetPlayer();
    obstacles = [];
    initializeLandmarks(); // Setup landmarks
    score = 0; frameCount = 0; gameSpeed = config.obstacleSpeed;
    isJumpKeyDown = false; isStumbling = false; stumbleTimer = 0;
    scoreDisplay.textContent = `Punkte / Score: 0`;
    gameOverScreen.style.display = 'none'; winScreen.style.display = 'none'; landmarkPopup.style.display = 'none';
    gameState = 'running';
    requestAnimationFrame(gameLoop);
}

// --- Input Handling ---
function handleJump() { /* ... jump logic ... */
    if (gameState === 'running' && playerState.isGrounded) { playerState.vy = config.jumpStrength; playerState.isGrounded = false; }
    else if (gameState === 'win' && winScreen.style.display !== 'none') { resetGame(); }
}
function hideLandmarkPopup() { /* ... hide popup logic ... */
    if (gameState === 'paused') { landmarkPopup.style.display = 'none'; gameState = 'running'; requestAnimationFrame(gameLoop); }
}
// Event listeners
window.addEventListener('keydown', (e) => { /* ... keydown logic ... */
    if (e.code === 'Space') { e.preventDefault(); if (!isJumpKeyDown) { handleJump(); } isJumpKeyDown = true; }
    else if (e.key === 'Enter' || e.code === 'Enter') {
        e.preventDefault();
        if (gameState === 'paused' && landmarkPopup.style.display !== 'none') { hideLandmarkPopup(); }
        else if (gameState === 'win' && winScreen.style.display !== 'none') { resetGame(); }
    }
});
window.addEventListener('keyup', (e) => { if (e.code === 'Space') { e.preventDefault(); isJumpKeyDown = false; } });
canvas.addEventListener('touchstart', (e) => { /* ... touchstart logic ... */
    e.preventDefault();
    if (gameState === 'running' || gameState === 'paused') { handleJump(); }
    else if (gameState === 'win' && winScreen.style.display !== 'none') { resetGame(); }
});
canvas.addEventListener('mousedown', (e) => { if (gameState === 'running') { handleJump(); } });
gameOverScreen.addEventListener('click', resetGame);
winScreen.addEventListener('click', resetGame);
continueButton.addEventListener('click', hideLandmarkPopup);


// --- Collision Detection ---
function checkCollision(rect1, rect2) { /* ... AABB check ... */
    return (rect1.x < rect2.x + rect2.width && rect1.x + rect1.width > rect2.x && rect1.y < rect2.y + rect2.height && rect1.y + rect1.height > rect2.y);
}

// --- Obstacle Handling (Larger Sizes, Random Types) ---
const obstacleTypes = ['stoneObstacle', 'familyObstacle', 'tractorObstacle'];
function spawnObstacle() { /* ... spawn logic with larger sizes ... */
    const typeIndex = Math.floor(Math.random() * obstacleTypes.length);
    const selectedTypeKey = obstacleTypes[typeIndex];
    let obstacleHeight, obstacleWidth;
    switch (selectedTypeKey) {
        case 'familyObstacle':  obstacleHeight = 80 + Math.random() * 30; obstacleWidth = 60 + Math.random() * 20; break;
        case 'tractorObstacle': obstacleHeight = 70 + Math.random() * 20; obstacleWidth = 100 + Math.random() * 30; break;
        case 'stoneObstacle': default: obstacleHeight = 30 + Math.random() * 20; obstacleWidth = 20 + Math.random() * 16; break;
    }
    obstacles.push({ x: config.canvasWidth, y: config.canvasHeight - config.groundHeight - obstacleHeight, width: obstacleWidth, height: obstacleHeight, typeKey: selectedTypeKey });
}
function updateObstacles() { /* ... update obstacle positions ... */
    if (frameCount > 100 && frameCount % config.spawnRate === 0) { spawnObstacle(); }
    for (let i = obstacles.length - 1; i >= 0; i--) { obstacles[i].x -= gameSpeed; if (obstacles[i].x + obstacles[i].width < 0) { obstacles.splice(i, 1); } }
}
// --- END Obstacle Handling ---


// --- Landmark Display & Popup Trigger Function ---
function showLandmarkPopup(landmark) { /* ... show popup logic ... */
    landmarkName.textContent = landmark.name;
    landmarkDescription.innerHTML = `${landmark.descEN}<br><br>${landmark.descDE}`;
    landmarkPopup.style.display = 'flex';
}


// --- Update Game State ---
function update() {
    if (gameState !== 'running') return;
    frameCount++;

    // Manage Stumble State
    if (isStumbling) { /* ... stumble timer logic ... */
        stumbleTimer--; if (stumbleTimer <= 0) { isStumbling = false; gameSpeed = config.obstacleSpeed; console.log("Stumble finished."); }
    }

    // Player Physics (Variable Jump)
    let currentGravity = config.gravity; /* ... variable jump logic ... */
    if (!playerState.isGrounded && playerState.vy < 0) { if (isJumpKeyDown) { currentGravity *= config.jumpHoldGravityMultiplier; } else { currentGravity *= config.jumpCutGravityMultiplier; } }
    playerState.vy += currentGravity; playerState.y += playerState.vy;

    // Ground Collision
    const groundLevel = config.canvasHeight - config.groundHeight - playerState.height; /* ... ground check ... */
    if (playerState.y >= groundLevel) { playerState.y = groundLevel; playerState.vy = 0; playerState.isGrounded = true; } else { playerState.isGrounded = false; }

    // Obstacles
    updateObstacles();

    // Collision Checks (Stomp or Stumble + Score Penalty)
    let didStompThisFrame = false; /* ... collision logic ... */
    for (let i = obstacles.length - 1; i >= 0; i--) {
        const obstacle = obstacles[i]; if (checkCollision(playerState, obstacle)) {
            const isFalling = playerState.vy > 0; const previousPlayerBottom = playerState.y + playerState.height - playerState.vy; const obstacleTop = obstacle.y;
            if (isFalling && previousPlayerBottom <= obstacleTop + 1) { /* Stomp */ console.log("Stomp detected!"); playerState.vy = config.stompJumpStrength; playerState.y = obstacle.y - playerState.height; playerState.isGrounded = false; didStompThisFrame = true; break; }
            else if (!isStumbling && !didStompThisFrame) { /* Stumble */ console.log("Stumble Triggered! Score Penalty applied."); score -= 100; if (score < 0) { score = 0; } isStumbling = true; stumbleTimer = config.stumbleDuration; gameSpeed = config.obstacleSpeed * config.stumbleSpeedMultiplier; }
        }
    }

    // Update Landmarks and Check Triggers (Position Based)
    for (let landmark of landmarks) { /* ... landmark movement and trigger logic ... */
        landmark.worldX -= gameSpeed;
        if (!landmark.hasBeenTriggered && landmark.worldX < playerState.x + playerState.width && landmark.worldX + landmark.width > playerState.x) {
            console.log(`Triggering landmark: ${landmark.name}`); landmark.hasBeenTriggered = true; showLandmarkPopup(landmark);
            if (landmark.isFinal) { gameState = 'win'; showWinScreen(); } else { gameState = 'paused'; }
        }
    }

    // Score
    score++; scoreDisplay.textContent = `Punkte / Score: ${Math.floor(score / 10)}`;
}


// --- Draw Game ---
function draw() {
    ctx.clearRect(0, 0, config.canvasWidth, config.canvasHeight);

    // Draw Background
    if (assets.backgroundImage) { ctx.drawImage(assets.backgroundImage, 0, 0, config.canvasWidth, config.canvasHeight); }
    else { /* Fallback colors */ ctx.fillStyle = config.colors.blue; ctx.fillRect(0, 0, config.canvasWidth, config.canvasHeight - config.groundHeight); ctx.fillStyle = config.colors.green; ctx.fillRect(0, config.canvasHeight - config.groundHeight, config.canvasWidth, config.groundHeight); }

    // Draw Player
    // Optional: Stumble visual effect
    // if (isStumbling && frameCount % 10 < 5) { ctx.globalAlpha = 0.5; }
    if (assets.knightPlaceholder) { ctx.drawImage(assets.knightPlaceholder, playerState.x, playerState.y, playerState.width, playerState.height); }
    // ctx.globalAlpha = 1.0; // Reset alpha

    // Draw Obstacles (Uses typeKey and larger sizes)
    obstacles.forEach(obstacle => { /* ... draw obstacle logic ... */
        const obstacleImage = assets[obstacle.typeKey]; if (obstacleImage) { ctx.drawImage(obstacleImage, obstacle.x, obstacle.y, obstacle.width, obstacle.height); }
        else { /* Fallback rect */ ctx.fillStyle = config.colors.black; ctx.fillRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height); }
    });

    // Draw Landmark Signs
    if (assets.signImage) { /* ... draw sign logic ... */
        landmarks.forEach(landmark => { if (landmark.worldX < config.canvasWidth && landmark.worldX + landmark.width > 0) { ctx.drawImage(assets.signImage, landmark.worldX, landmark.yPos, landmark.width, landmark.height); } });
    }
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
