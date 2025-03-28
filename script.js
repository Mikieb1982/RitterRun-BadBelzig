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

// --- Asset Loading (Placeholder) ---
// IMPORTANT: Replace with actual image loading logic
// You'll need Image() objects and ensure they load before starting the game.
const assets = {
    // knightRun1: loadImage('assets/knight_run1.png'), // Example
    // stone: loadImage('assets/stone.png'),          // Example
    loaded: 0,
    total: 0 // Set this to the number of assets you need to load
};

function loadImage(src) {
    assets.total++;
    const img = new Image();
    img.src = src;
    img.onload = () => {
        assets.loaded++;
        if (assets.loaded === assets.total) {
            // All assets loaded, ready to start
            // resetGame(); // Call resetGame ONLY after assets are loaded
        }
    };
    img.onerror = () => {
        console.error(`Failed to load asset: ${src}`);
    };
    return img;
}
// --- END Asset Loading Placeholder ---

// --- Landmark Data ---
// Populate this with your landmark details
const landmarkDefinitions = [
    { name: "SteinTherme", xTrigger: 1000, descEN: "Relax in...", descDE: "Entspann dich...", img: 'assets/steintherme.png' },
    { name: "Freibad", xTrigger: 2000, descEN: "Cool off...", descDE: "Kühl dich...", img: 'assets/freibad.png' },
    // ... Add all 7 landmarks here
    { name: "Burg Eisenhardt", xTrigger: 7000, descEN: "You made it...", descDE: "Geschafft!...", img: 'assets/burg_eisenhardt.png', isFinal: true },
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
    };
}

// --- Game Reset Function ---
function resetGame() {
    console.log("Resetting game...");
    resetPlayer();
    obstacles = [];
    landmarks = [...landmarkDefinitions]; // Reset landmarks
    currentLandmarkIndex = 0;
    score = 0;
    frameCount = 0;
    gameSpeed = config.obstacleSpeed;
    scoreDisplay.textContent = `Punkte / Score: 0`;
    gameOverScreen.style.display = 'none';
    winScreen.style.display = 'none';
    landmarkPopup.style.display = 'none';
    gameState = 'running'; // Assume assets are loaded for this skeleton
    requestAnimationFrame(gameLoop); // Start the game loop
}

// --- Input Handling (User Provided + Integration) ---
function handleJump() {
    if (gameState === 'running' && playerState.isGrounded) {
        playerState.vy = config.jumpStrength;
        playerState.isGrounded = false;
        // Add jump sound effect here if desired
    } else if (gameState === 'gameOver' || gameState === 'win') {
        resetGame(); // Restart on input after game over/win
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
    if (gameState === 'running' || gameState === 'paused') { // Allow jump if paused to maybe buffer? Or remove paused state check.
       handleJump();
    } else if (gameState === 'gameOver' || gameState === 'win') {
        resetGame(); // Allow restart on tap too
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
    // Spawn new obstacles periodically
    if (frameCount % config.spawnRate === 0) {
        spawnObstacle();
    }

    // Move and remove off-screen obstacles
    for (let i = obstacles.length - 1; i >= 0; i--) {
        obstacles[i].x -= gameSpeed;
        if (obstacles[i].x + obstacles[i].width < 0) {
            obstacles.splice(i, 1);
        }
    }
}

// --- Landmark Handling ---
function checkLandmarks() {
    if (currentLandmarkIndex < landmarks.length) {
        const nextLandmark = landmarks[currentLandmarkIndex];
        // Check if the player has 'passed' the trigger point based on score or distance
        // Using score as a proxy for distance here - adjust trigger values!
        if (score >= nextLandmark.xTrigger) {
            showLandmarkPopup(nextLandmark);
            if (nextLandmark.isFinal) {
                gameState = 'win'; // Trigger win state immediately
                showWinScreen();
            } else {
                 gameState = 'paused'; // Pause for regular landmarks
            }
            currentLandmarkIndex++;
        }
    }
}

function showLandmarkPopup(landmark) {
    landmarkName.textContent = landmark.name;
    landmarkDescription.innerHTML = `${landmark.descEN}<br><br>${landmark.descDE}`; // Use innerHTML for line break
    // if (landmarkImage) landmarkImage.src = landmark.img; // Uncomment if using image
    landmarkPopup.style.display = 'flex';
}

// --- Update Game State ---
function update() {
    if (gameState !== 'running') return;

    frameCount++;

    // -- Player Physics --
    playerState.vy += config.gravity;
    playerState.y += playerState.vy;

    // Ground collision
    const groundLevel = config.canvasHeight - config.groundHeight - playerState.height;
    if (playerState.y >= groundLevel) {
        playerState.y = groundLevel;
        playerState.vy = 0;
        playerState.isGrounded = true;
    } else {
        playerState.isGrounded = false;
    }

    // -- Obstacles --
    updateObstacles();

    // -- Collision Checks --
    for (const obstacle of obstacles) {
        if (checkCollision(playerState, obstacle)) {
            gameState = 'gameOver';
            showGameOverScreen();
            // Add game over sound effect here
            return; // Stop update on game over
        }
    }

    // -- Score --
    // Simple score based on time/frames survived
    score++;
    scoreDisplay.textContent = `Punkte / Score: ${Math.floor(score / 10)}`; // Example scoring

    // -- Landmarks --
    checkLandmarks(); // This might change gameState to 'paused' or 'win'

}

// --- Draw Game ---
function draw() {
    // Clear canvas
    ctx.clearRect(0, 0, config.canvasWidth, config.canvasHeight);

    // Draw background (Simple Example)
    ctx.fillStyle = config.colors.blue; // Sky
    ctx.fillRect(0, 0, config.canvasWidth, config.canvasHeight - config.groundHeight);
    ctx.fillStyle = config.colors.green; // Ground
    ctx.fillRect(0, config.canvasHeight - config.groundHeight, config.canvasWidth, config.groundHeight);

    // Draw Player (Placeholder Rectangle)
    ctx.fillStyle = config.colors.black; // Use black from palette
    ctx.fillRect(playerState.x, playerState.y, playerState.width, playerState.height);
    // LATER: Replace with ctx.drawImage(assets.knightRunX, playerState.x, playerState.y, playerState.width, playerState.height);

    // Draw Obstacles (Placeholder Rectangles)
    ctx.fillStyle = config.colors.black; // Use black from palette
    obstacles.forEach(obstacle => {
        ctx.fillRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height);
         // LATER: Replace with ctx.drawImage(assets.stone, obstacle.x, obstacle.y, obstacle.width, obstacle.height);
    });

     // Draw Landmarks visually as they approach (Optional - more complex)
     // Could draw simplified shapes or icons scrolling in the background


    // Score is updated via HTML element, not drawn on canvas here
}

// --- UI Updates ---
function showGameOverScreen() {
    gameOverScreen.style.display = 'flex';
}

function showWinScreen() {
    winScreen.style.display = 'flex';
}


// --- Main Game Loop ---
function gameLoop() {
    if (gameState === 'paused' || gameState === 'gameOver' || gameState === 'win') {
        // Stop the loop if not running - waits for input to restart/resume
        return;
    }
    update();
    draw();
    requestAnimationFrame(gameLoop);
}

// --- Start Game ---
// IMPORTANT: In a real scenario, you'd call resetGame() only *after*
// all assets (images, sounds) have finished loading.
// For this skeleton, we start immediately.
resetGame();
// If using the asset loader placeholder:
// 1. Call loadImage for all your assets.
// 2. The loadImage callback will call resetGame() when assets.loaded === assets.total.
