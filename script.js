// --- Canvas and Context (You likely have this) ---
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const canvasWidth = canvas.width;
const canvasHeight = canvas.height;

// --- DOM Element References ---
const startScreen = document.getElementById('startScreen');
const gameOverScreen = document.getElementById('gameOverScreen');
const startButton = document.getElementById('startButton');
const restartButton = document.getElementById('restartButton');
const scoreDisplay = document.getElementById('scoreDisplay');
const currentScoreSpan = document.getElementById('currentScore');
const finalScoreSpan = document.getElementById('finalScore');
const startHighScoreSpan = document.getElementById('startHighScore');
const gameOverHighScoreSpan = document.getElementById('gameOverHighScore');

// --- Audio References ---
const jumpSound = document.getElementById('jumpSound');
const collisionSound = document.getElementById('collisionSound');
const gameOverSound = document.getElementById('gameOverSound');
// const bgMusic = document.getElementById('bgMusic'); // If you added music

// --- Game States ---
const GameState = {
    MENU: 'MENU',
    PLAYING: 'PLAYING',
    GAME_OVER: 'GAME_OVER'
};
let currentGameState = GameState.MENU;

// --- Game Variables (Adapt to your existing ones) ---
let score = 0;
let highScore = 0;
let player = { /* ... your player properties: x, y, width, height, dy, grounded, etc ... */ };
let obstacles = []; // Array to hold obstacle objects
let frameCount = 0; // Or however you track time/frames
let gameSpeed = 5; // Initial speed for obstacles/background
let speedIncreaseInterval = 500; // Increase speed every 500 score points (example)
let nextSpeedIncreaseScore = speedIncreaseInterval;

// --- Graphics Assets (Load your images) ---
const knightImage = new Image();
knightImage.src = 'assets/knight.png'; // Replace with your actual knight image

const rockImage = new Image();
rockImage.src = 'assets/rock.png'; // Replace with your actual rock image

const backgroundFarImage = new Image();
backgroundFarImage.src = 'assets/background_far.png';
let bgFarX = 0;

const backgroundNearImage = new Image();
backgroundNearImage.src = 'assets/background_near.png';
let bgNearX = 0;

// --- High Score Handling ---
function loadHighScore() {
    const savedScore = localStorage.getItem('ritterRunHighScore');
    highScore = savedScore ? parseInt(savedScore, 10) : 0;
    startHighScoreSpan.textContent = highScore;
    gameOverHighScoreSpan.textContent = highScore;
}

function saveHighScore() {
    if (score > highScore) {
        highScore = score;
        localStorage.setItem('ritterRunHighScore', highScore);
        // Update display immediately on game over screen
        gameOverHighScoreSpan.textContent = highScore;
    }
}

// --- Sound Playing Helper ---
function playSound(soundElement) {
    soundElement.currentTime = 0; // Rewind to start
    soundElement.play().catch(error => {
        // Autoplay might be blocked initially, user interaction (like start button) usually enables it.
        console.log("Sound play failed:", error);
    });
}

// --- Reset Game Variables ---
function resetGame() {
    score = 0;
    currentScoreSpan.textContent = score;
    obstacles = [];
    frameCount = 0;
    gameSpeed = 5; // Reset speed
    nextSpeedIncreaseScore = speedIncreaseInterval;

    // Reset player position (adjust to your player object structure)
    player.y = canvasHeight - player.height - 10; // Example: place on ground
    player.dy = 0;
    player.grounded = true;

    // Reset background positions
    bgFarX = 0;
    bgNearX = 0;
}

// --- Update Functions ---

function updatePlayer() {
    // --- Your existing player update logic (gravity, jump movement) ---
    // Example:
    // if (!player.grounded) {
    //     player.dy += gravity;
    //     player.y += player.dy;
    // }
    // // Ground check logic...
    // if (player.y >= canvasHeight - player.height - groundHeight) {
    //    player.y = canvasHeight - player.height - groundHeight;
    //    player.dy = 0;
    //    player.grounded = true;
    // }
}

function updateObstacles() {
    // --- Your existing obstacle generation and movement logic ---
    frameCount++;
    // Example: Generate new obstacle periodically
    // if (frameCount % 100 === 0) { // Adjust frequency
    //     obstacles.push({ x: canvasWidth, y: canvasHeight - rockHeight - groundHeight, width: rockWidth, height: rockHeight });
    // }

    // Move obstacles left
    for (let i = obstacles.length - 1; i >= 0; i--) {
        obstacles[i].x -= gameSpeed;
        // Remove obstacles that are off-screen
        if (obstacles[i].x + obstacles[i].width < 0) {
            obstacles.splice(i, 1);
            // Maybe increase score here when obstacle is passed? Or use time-based score
        }
    }
}

function checkCollisions() {
    // --- Your existing collision detection logic ---
    for (const obstacle of obstacles) {
        // Example AABB collision detection:
        // if (player.x < obstacle.x + obstacle.width &&
        //     player.x + player.width > obstacle.x &&
        //     player.y < obstacle.y + obstacle.height &&
        //     player.y + player.height > obstacle.y)
        // {
        //     return true; // Collision detected
        // }
    }
    return false; // No collision
}

function updateScoreAndSpeed() {
    // Update score (e.g., based on time/distance)
    score++; // Simple time-based score
    currentScoreSpan.textContent = score;

    // Increase game speed based on score
    if (score >= nextSpeedIncreaseScore) {
        gameSpeed += 0.5; // Increase speed slightly
        nextSpeedIncreaseScore += speedIncreaseInterval;
        console.log("Speed increased to:", gameSpeed);
    }
}

// --- Draw Functions ---

function drawBackground() {
    // Parallax effect
    const farSpeed = gameSpeed * 0.3; // Background moves slower
    const nearSpeed = gameSpeed;      // Foreground moves at game speed

    bgFarX -= farSpeed;
    bgNearX -= nearSpeed;

    // Reset background position for seamless looping
    if (bgFarX <= -canvasWidth) {
        bgFarX = 0;
    }
    if (bgNearX <= -canvasWidth) {
        bgNearX = 0;
    }

    // Draw each background image twice for looping
    ctx.drawImage(backgroundFarImage, bgFarX, 0, canvasWidth, canvasHeight);
    ctx.drawImage(backgroundFarImage, bgFarX + canvasWidth, 0, canvasWidth, canvasHeight);

    ctx.drawImage(backgroundNearImage, bgNearX, 0, canvasWidth, canvasHeight);
    ctx.drawImage(backgroundNearImage, bgNearX + canvasWidth, 0, canvasWidth, canvasHeight);
}

function drawPlayer() {
    // --- Your existing player drawing logic ---
    // Example: ctx.drawImage(knightImage, player.x, player.y, player.width, player.height);
    // Consider adding animation frames here later
}

function drawObstacles() {
    // --- Your existing obstacle drawing logic ---
    // Example:
    // ctx.fillStyle = 'red'; // Or use rockImage
    // for (const obstacle of obstacles) {
    //     ctx.drawImage(rockImage, obstacle.x, obstacle.y, obstacle.width, obstacle.height);
    // }
}

// --- Game Loop ---
function gameLoop() {
    if (currentGameState === GameState.PLAYING) {
        // --- Clear Canvas ---
        ctx.clearRect(0, 0, canvasWidth, canvasHeight);

        // --- Update ---
        updatePlayer();
        updateObstacles();
        updateScoreAndSpeed(); // Update score continuously

        // --- Draw ---
        drawBackground();
        drawPlayer();
        drawObstacles();

        // --- Check for Game Over ---
        if (checkCollisions()) {
            playSound(collisionSound);
            playSound(gameOverSound);
            // bgMusic.pause(); // Pause music if playing
            currentGameState = GameState.GAME_OVER;
            saveHighScore();
            finalScoreSpan.textContent = score;
            gameOverHighScoreSpan.textContent = highScore; // Ensure high score is updated
            gameOverScreen.classList.remove('hidden');
            scoreDisplay.classList.add('hidden'); // Hide in-game score
        }
    }

    // Continue the loop regardless of state (unless you want to stop updates entirely on menu/game over)
    requestAnimationFrame(gameLoop);
}

// --- Event Listeners ---

// Jump Input (adapt to your existing jump logic)
document.addEventListener('keydown', (e) => {
    if (e.code === 'Space' && currentGameState === GameState.PLAYING && player.grounded) {
        // player.dy = -jumpPower; // Apply jump force
        // player.grounded = false;
        playSound(jumpSound);
        // Add your specific jump code here
    }
});

// Start Button
startButton.addEventListener('click', () => {
    currentGameState = GameState.PLAYING;
    startScreen.classList.add('hidden');
    scoreDisplay.classList.remove('hidden');
    resetGame();
    // playSound(bgMusic); // Start music if you have it
    // Ensure the game loop is running - if it wasn't started before
    // requestAnimationFrame(gameLoop); // Usually started once outside
});

// Restart Button
restartButton.addEventListener('click', () => {
    currentGameState = GameState.PLAYING;
    gameOverScreen.classList.add('hidden');
    scoreDisplay.classList.remove('hidden');
    resetGame();
    // playSound(bgMusic); // Restart music if you have it
});


// --- Initial Setup ---
function init() {
    loadHighScore();
    // Show only start screen initially
    startScreen.classList.remove('hidden');
    gameOverScreen.classList.add('hidden');
    scoreDisplay.classList.add('hidden');

    // Draw initial state (optional, e.g., just the background on menu)
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);
    drawBackground(); // Draw background even on menu

    // Start the game loop (it will only run game logic when state is PLAYING)
    gameLoop();
}

// Wait for assets to load (basic example, might need more robust loading for many assets)
window.addEventListener('load', init);

// Or if images loading causes issues, use Promises:
/*
Promise.all([
    new Promise(resolve => knightImage.onload = resolve),
    new Promise(resolve => rockImage.onload = resolve),
    new Promise(resolve => backgroundFarImage.onload = resolve),
    new Promise(resolve => backgroundNearImage.onload = resolve)
]).then(init);
*/
