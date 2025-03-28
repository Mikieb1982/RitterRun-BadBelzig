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

// --- Asset Loading (MODIFIED SECTION) ---
const assets = {
    // --- ADD YOUR ASSETS HERE ---
    // Give them meaningful keys to access them later
    knightPlaceholder: null, // Will hold the loaded Image object for the knight
    stonePlaceholder: null,  // Will hold the loaded Image object for the stone
    // Add keys for other assets (landmarks, etc.) here later, e.g.:
    // steinThermeImg: null,

    // --- Loading Progress Tracking ---
    loaded: 0,
    total: 0, // loadImage function will increment this
    sources: { // Define the sources for your assets
        knightPlaceholder: 'assets/knight_placeholder.png', // Path to your knight placeholder
        stonePlaceholder: 'assets/stone_placeholder.png'   // Path to your stone placeholder
        // steinThermeImg: 'assets/steintherme.png',      // Example for later
        // ... add paths for all assets you need to load
    }
};

// Updated loadImage function - stores image in assets object using key
function loadImage(key, src) {
    console.log(`Attempting to load: ${key} from ${src}`);
    assets.total++; // Count total assets to load
    const img = new Image();
    img.src = src;
    img.onload = () => {
        console.log(`Successfully loaded: ${key}`);
        assets.loaded++; // Increment loaded count
        assets[key] = img; // Store the loaded image object in the assets object
        // Check if all assets are loaded
        if (assets.loaded === assets.total) {
            console.log("All assets loaded. Starting game...");
            resetGame(); // <<<<<<< START GAME ONLY WHEN ALL LOADED >>>>>>>>>
        }
    };
    img.onerror = () => {
        console.error(`Failed to load asset: ${key} from ${src}`);
        // Consider adding error handling (e.g., stop the game)
    };
    // No need to return img, it's stored in assets[key]
}

// Function to start loading all defined assets
function loadAllAssets() {
    console.log("Starting asset loading...");
    gameState = 'loading';
    // Reset counts in case of reload/retry
    assets.loaded = 0;
    assets.total = 0;
    // Loop through the sources and start loading each one
    for (const key in assets.sources) {
        loadImage(key, assets.sources[key]);
    }
    // Handle the edge case where no assets are defined
    if (assets.total === 0) {
        console.warn("No assets defined in assets.sources. Starting game immediately...");
        resetGame();
    }
}
// --- END Asset Loading (MODIFIED SECTION) ---


// --- Landmark Data ---
// Populate this with your landmark details
const landmarkDefinitions = [
    // NOTE: Adjust xTrigger values based on score/distance goals
    { name: "SteinTherme", xTrigger: 1000, descEN: "Relax in the SteinTherme! Bad Belzig's unique thermal bath uses warm, salty water (Sole).", descDE: "Entspann dich in der SteinTherme! Bad Belzigs einzigartiges Thermalbad nutzt warmes Salzwasser (Sole).", imgKey: 'steinThermeImg' /* Example key if image loaded */ },
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
        // Add frame tracking for animation later
        // currentFrame: 0,
        // frameTimer: 0
    };
}

// --- Game Reset Function ---
function resetGame() {
    console.log("Resetting game...");
    resetPlayer();
    obstacles = [];
    landmarks = [...landmarkDefinitions]; // Create copy to reset landmark triggers
    currentLandmarkIndex = 0;
    score = 0;
    frameCount = 0;
    gameSpeed = config.obstacleSpeed;
    scoreDisplay.textContent = `Punkte / Score: 0`;
    gameOverScreen.style.display = 'none';
    winScreen.style.display = 'none';
    landmarkPopup.style.display = 'none';
    gameState = 'running'; // Set state to running AFTER reset
    requestAnimationFrame(gameLoop); // Start the game loop
}

// --- Input Handling (User Provided + Integration) ---
function handleJump() {
    if (gameState === 'running' && playerState.isGrounded) {
        playerState.vy = config.jumpStrength;
        playerState.isGrounded = false;
        // Add jump sound effect here if desired
    } else if (gameState === 'gameOver' || gameState === 'win') {
        // Only reset if overlays are visible, prevent accidental immediate reset
        if (gameOverScreen.style.display !== 'none' || winScreen.style.display !== 'none') {
             resetGame(); // Restart on input after game over/win
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

window.addEventListener('keydown', (e) => {
    if (e.code === 'Space') {
        e.preventDefault();
        handleJump();
    } else if (e.key === 'Enter' || e.code === 'Enter') {
        e.preventDefault();
        if (gameState === 'paused' && landmarkPopup.style.display !== 'none') {
            hideLandmarkPopup();
        } else if (gameState === 'gameOver' || gameState === 'win') {
            resetGame();
        }
    }
});

canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    if (gameState === 'running' || gameState === 'paused') {
       handleJump();
    } else if (gameState === 'gameOver' || gameState === 'win') {
        resetGame();
    }
});

canvas.addEventListener('mousedown', (e) => {
    if (gameState === 'running') {
        handleJump();
    }
    // Overlays handle their own clicks for restart below
});

// Restart listener for game over/win screens
gameOverScreen.addEventListener('click', resetGame);
winScreen.addEventListener('click', resetGame);

// Event Listener for Continue Button
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

// --- Obstacle Handling ---
function spawnObstacle() {
    const obstacleHeight = 30 + Math.random() * 20; // Example random height
    const obstacleWidth = 20 + Math.random() * 10;  // Example random width
    obstacles.push({
        x: config.canvasWidth,
        y: config.canvasHeight - config.groundHeight - obstacleHeight,
        width: obstacleWidth,
        height: obstacleHeight
    });
}

function updateObstacles() {
    // Spawn new obstacles periodically based on frame count
    // Ensure spawnRate is reasonable (e.g., > 60 for roughly 1 per second at 60fps)
    if (frameCount > 100 && frameCount % config.spawnRate === 0) { // Add initial delay
        spawnObstacle();
    }

    // Move and remove off-screen obstacles
    for (let i = obstacles.length - 1; i >= 0; i--) {
        obstacles[i].x -= gameSpeed;
        if (obstacles[i].x + obstacles[i].width < 0) {
            obstacles.splice(i, 1); // Remove obstacle
        }
    }
}

// --- Landmark Handling ---
function checkLandmarks() {
    if (currentLandmarkIndex < landmarks.length) {
        const nextLandmark = landmarks[currentLandmarkIndex];
        // Using score as a proxy for distance - adjust trigger values as needed!
        const currentScore = Math.floor(score / 10); // Use displayed score
        if (currentScore >= nextLandmark.xTrigger) {
            // landmarkImage.src = assets.sources[nextLandmark.imgKey]; // Set image source if using images in popup
            showLandmarkPopup(nextLandmark);
            if (nextLandmark.isFinal) {
                gameState = 'win'; // Trigger win state
                showWinScreen(); // Show win screen immediately
            } else {
                 gameState = 'paused'; // Pause for regular landmarks
            }
            currentLandmarkIndex++; // Move to next landmark trigger
        }
    }
}

function showLandmarkPopup(landmark) {
    landmarkName.textContent = landmark.name;
    landmarkDescription.innerHTML = `${landmark.descEN}<br><br>${landmark.descDE}`; // Use innerHTML for line break
    // Uncomment and ensure asset key exists if using images in popup
    // if (landmark.imgKey && assets[landmark.imgKey]) {
    //     if(landmarkImage) landmarkImage.src = assets[landmark.imgKey].src;
    // } else {
    //      if(landmarkImage) landmarkImage.src = ""; // Clear image if none defined
    // }
    landmarkPopup.style.display = 'flex'; // Show the popup
}

// --- Update Game State ---
function update() {
    if (gameState !== 'running') return; // Only run updates if game is 'running'

    frameCount++;

    // -- Player Physics --
    playerState.vy += config.gravity;
    playerState.y += playerState.vy;

    // Ground collision detection
    const groundLevel = config.canvasHeight - config.groundHeight - playerState.height;
    if (playerState.y >= groundLevel) {
        playerState.y = groundLevel;
        playerState.vy = 0;
        playerState.isGrounded = true;
    } else {
        playerState.isGrounded = false;
    }
    // Add animation frame updates here later

    // -- Obstacles --
    updateObstacles();

    // -- Collision Checks --
    for (const obstacle of obstacles) {
        if (checkCollision(playerState, obstacle)) {
            gameState = 'gameOver'; // Change state
            showGameOverScreen(); // Show overlay
            // Optional: Add game over sound effect
            return; // Stop the update loop immediately on collision
        }
    }

    // -- Score --
    score++; // Increment raw score (based on frames)
    scoreDisplay.textContent = `Punkte / Score: ${Math.floor(score / 10)}`; // Update displayed score

    // -- Landmarks --
    // CheckLandmarks might change gameState to 'paused' or 'win', stopping subsequent updates in the loop
    checkLandmarks();

}

// --- Draw Game (MODIFIED SECTION) ---
function draw() {
    // Clear canvas
    ctx.clearRect(0, 0, config.canvasWidth, config.canvasHeight);

    // Draw background (Simple Example)
    ctx.fillStyle = config.colors.blue; // Sky
    ctx.fillRect(0, 0, config.canvasWidth, config.canvasHeight - config.groundHeight);
    ctx.fillStyle = config.colors.green; // Ground
    ctx.fillRect(0, config.canvasHeight - config.groundHeight, config.canvasWidth, config.groundHeight);

    // --- Draw Player ---
    // Check if the knight placeholder image asset has been loaded
    if (assets.knightPlaceholder) {
        // Add animation logic here later by choosing different assets based on frameCount/playerState
        ctx.drawImage(
            assets.knightPlaceholder, // Use the loaded image object
            playerState.x,
            playerState.y,
            playerState.width,
            playerState.height
        );
    } else {
        // Optional: Draw a fallback rectangle if image hasn't loaded yet
        ctx.fillStyle = config.colors.black;
        ctx.fillRect(playerState.x, playerState.y, playerState.width, playerState.height);
    }

    // --- Draw Obstacles ---
    obstacles.forEach(obstacle => {
        // Check if the stone placeholder image asset has been loaded
        if (assets.stonePlaceholder) {
             ctx.drawImage(
                assets.stonePlaceholder, // Use the loaded image object
                obstacle.x,
                obstacle.y,
                obstacle.width,
                obstacle.height
            );
        } else {
             // Optional: Draw a fallback rectangle if image hasn't loaded yet
             ctx.fillStyle = config.colors.black;
             ctx.fillRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height);
        }
    });

    // Draw Landmarks visually as they approach (Optional - more complex implementation)
    // Could involve checking landmark proximity and drawing loaded landmark images

    // Score is updated via HTML element, not drawn on canvas here
}
// --- END Draw Game (MODIFIED SECTION) ---


// --- UI Updates ---
function showGameOverScreen() {
    gameOverScreen.style.display = 'flex'; // Show the game over overlay
}

function showWinScreen() {
    winScreen.style.display = 'flex'; // Show the win overlay
}


// --- Main Game Loop ---
function gameLoop() {
    // Stop loop if not in 'running' state
    if (gameState !== 'running') {
        console.log(`Game loop stopping. State: ${gameState}`);
        return;
    }
    update(); // Update game logic
    draw();   // Draw the current frame
    requestAnimationFrame(gameLoop); // Request the next frame
}

// --- Start Game (MODIFIED SECTION) ---
// Instead of calling resetGame() directly, call loadAllAssets()
// This ensures assets are loaded before the game attempts to start/draw them.

// resetGame(); // <<<<< ORIGINAL CALL - REMOVED >>>>>
loadAllAssets(); // <<<<< CALL THIS INSTEAD TO START LOADING PROCESS >>>>>
// --- END Start Game (MODIFIED SECTION) ---
