// --- Get DOM Elements ---
// This script runs 'defer', so elements should exist when it executes
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
    // Optionally display an error message to the user
    const errDiv = document.createElement('div');
    errDiv.textContent = "Error loading game canvas. Please refresh or try a different browser.";
    errDiv.style.color = 'red';
    errDiv.style.position = 'absolute';
    errDiv.style.top = '50%';
    errDiv.style.left = '50%';
    errDiv.style.transform = 'translate(-50%, -50%)';
    document.body.appendChild(errDiv);
    // Stop script execution if canvas isn't found
    throw new Error("Canvas initialization failed.");
}


// --- Game Configuration ---
const config = {
    canvasWidth: canvas.width, // Initial values, will be updated by setupCanvas
    canvasHeight: canvas.height, // Initial values, will be updated by setupCanvas
    gravity: 0.45, // Base gravity factor
    jumpStrength: -10.5, // Base jump strength (negative is upwards)
    playerSpeed: 0, // Player horizontal speed relative to screen (usually 0 for runners)
    obstacleSpeed: 2.2, // Base obstacle speed multiplier
    groundHeight: 50, // Logical ground height from bottom for positioning calculations
    spawnRate: 160, // Approx frames between obstacle spawns
    jumpHoldGravityMultiplier: 0.5, // Gravity multiplier when holding jump (less gravity = higher jump)
    jumpCutGravityMultiplier: 2.0, // Gravity multiplier when releasing jump early (more gravity = shorter jump)
    stompJumpStrength: -8.5, // Base jump strength after stomping an obstacle
    maxGameSpeed: 7, // Base maximum speed multiplier for obstacles
    startLives: 5, // Starting number of lives
    recoveryDuration: 90, // Frames of invincibility after getting hit
    colors: { // Fallback colors if images fail or for drawing primitives
        green: '#0ca644', blue: '#0296c6', yellow: '#f5d306',
        black: '#151513', white: '#ffffff', ground: '#8b4513'
    }
};

// --- Game State Variables ---
let gameState = 'loading'; // Current state ('loading', 'running', 'paused', 'gameOver', 'win')
let playerState = {}; // Object to hold player properties (x, y, width, height, vy, isGrounded)
let obstacles = []; // Array to hold active obstacle objects
let landmarks = []; // Array to hold landmark objects
let score = 0; // Current score
let frameCount = 0; // Counter for frames elapsed in 'running' state
let gameSpeed = config.obstacleSpeed; // Current obstacle speed multiplier
let isJumpKeyDown = false; // Flag for spacebar being held down
let isPointerDownJump = false; // Flag for touch/mouse being held down
let playerLives = config.startLives; // Current player lives
let isRecovering = false; // Flag indicating player is invincible after hit
let recoveryTimer = 0; // Timer for recovery duration
let backgroundX = 0; // Horizontal position for scrolling background effect

// --- Asset Loading ---
const assets = {
    // Properties to hold loaded Image objects
    knightPlaceholder: null, stoneObstacle: null, familyObstacle: null,
    tractorObstacle: null, backgroundImage: null, signImage: null,
    loaded: 0, // Count of assets successfully loaded
    total: 0, // Total number of assets to load
    // *** Asset paths relative to index.html ***
    // Make sure these paths match your folder structure and filenames on GitHub
    sources: {
        knightPlaceholder: 'assets/knight_placeholder.png',
        stoneObstacle: 'assets/stones.png',
        familyObstacle: 'assets/family.png',
        tractorObstacle: 'assets/tractor.png',
        backgroundImage: 'assets/background.png',
        signImage: 'assets/sign.png'
        // Example using placeholders if assets folder doesn't work:
        // knightPlaceholder: 'https://placehold.co/60x75/0ca644/ffffff?text=Knight',
        // stoneObstacle: 'https://placehold.co/30x40/a0a0a0/ffffff?text=Stone',
        // ...etc
    }
};

/**
 * Loads a single image asset.
 * @param {string} key - The key to store the loaded image under in the assets object.
 * @param {string} src - The source URL or path of the image.
 */
function loadImage(key, src) {
    assets.total++;
    const img = new Image();
    img.src = src;

    // Handle image loading errors
    img.onerror = () => {
        console.error(`Failed to load asset: ${key} from ${src}. Check path and file existence.`);
        assets.loaded++; // Increment loaded count even on error to proceed
        assets[key] = null; // Mark as failed/unavailable
        // Check if all assets have finished attempting to load
        if (assets.loaded === assets.total) {
            console.log("Asset loading finished (some may have failed).");
            setupCanvas(); // Setup canvas after trying all loads
            resetGame(); // Start game even if some assets failed
        }
    };

    // Handle successful image loading
    img.onload = () => {
        // console.log(`Successfully loaded: ${key}`);
        assets.loaded++;
        assets[key] = img; // Store the loaded Image object
        // Check if all assets have finished loading
        if (assets.loaded === assets.total) {
            console.log("All assets loaded successfully.");
            setupCanvas(); // Setup canvas after successful loads
            resetGame(); // Start game
        }
    };
}

/**
 * Initiates loading for all assets defined in assets.sources.
 */
function loadAllAssets() {
    console.log("Starting asset loading...");
    gameState = 'loading'; // Set initial game state

    // Reset asset object properties
    for (const key in assets.sources) {
        assets[key] = null;
    }
    assets.loaded = 0;
    assets.total = 0;

    // Trigger loading for each source
    for (const key in assets.sources) {
        loadImage(key, assets.sources[key]);
    }

    // Handle the case where no assets are defined
    if (assets.total === 0) {
        console.warn("No assets defined in sources. Starting game immediately.");
        setupCanvas(); // Setup canvas
        resetGame(); // Start game
    }
}
// --- END Asset Loading ---

// --- Canvas Setup ---
/**
 * Sets the canvas logical width and height to match its display size
 * defined by CSS. Updates the config object.
 */
function setupCanvas() {
    const container = document.getElementById('gameContainer');
    if (!container) {
        console.error("Game container not found during setup!");
        return; // Exit if container isn't found
    }
    // Get the actual displayed size of the container
    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;

    // Set the canvas drawing buffer size to match the display size
    if (canvas.width !== containerWidth || canvas.height !== containerHeight) {
        canvas.width = containerWidth;
        canvas.height = containerHeight;
        console.log(`Canvas resized to: ${canvas.width}x${canvas.height}`);
    }

    // Update config object with current dimensions
    config.canvasWidth = canvas.width;
    config.canvasHeight = canvas.height;

    // Optional: Recalculate anything dependent on canvas size immediately
    // (e.g., if player size/position is set here)
}

// Add event listener for window resize to adjust canvas
window.addEventListener('resize', () => {
    // Only resize and redraw if in landscape mode (where game is visible)
    if (window.matchMedia("(orientation: landscape)").matches) {
         setupCanvas(); // Adjust canvas size
         // Redraw the current frame immediately to avoid visual glitches
         if (gameState === 'running' || gameState === 'paused') {
             draw(); // Redraw with current game state
         } else if (gameState === 'loading') {
             // If still loading, just clear the canvas
             ctx.clearRect(0, 0, config.canvasWidth, config.canvasHeight);
             // Optionally draw a "Loading..." message
         }
         // No redraw needed for gameOver or win states as they are overlays
    }
});
// --- END Canvas Setup ---

// --- Landmark Data ---
const landmarkConfig = [
     // Shortened descriptions for brevity
     { name: "SteinTherme", worldX: 1500, width: 60, height: 90, descEN: "Relax in the SteinTherme! Bad Belzig's unique thermal bath...", descDE: "Entspann dich in der SteinTherme! Bad Belzigs einzigartiges Thermalbad...", isFinal: false },
     { name: "Frei und Erlebnisbad", worldX: 3000, width: 60, height: 90, descEN: "Cool off at the Freibad! This outdoor pool is popular...", descDE: "Kühl dich ab im Freibad! Dieses Freibad ist im Sommer beliebt...", isFinal: false },
     { name: "Kulturzentrum & Bibliothek", worldX: 4500, width: 60, height: 90, descEN: "This building houses the town library and cultural centre.", descDE: "Dieses Gebäude beherbergt die Stadtbibliothek und das Kulturzentrum.", isFinal: false },
     { name: "Fläming Bahnhof", worldX: 6000, width: 60, height: 90, descEN: "All aboard at Fläming Bahnhof! The RE7 train line connects...", descDE: "Einsteigen bitte am Fläming Bahnhof! Die Zuglinie RE7 verbindet...", isFinal: false },
     { name: "Postmeilensäule", worldX: 7500, width: 60, height: 90, descEN: "See how far? This sandstone Postal Milestone from 1725...", descDE: "Schon gesehen? Diese kursächsische Postmeilensäule...", isFinal: false },
     { name: "Rathaus & Tourist-Information", worldX: 9000, width: 60, height: 90, descEN: "The historic Rathaus (Town Hall) sits centrally...", descDE: "Das historische Rathaus befindet sich zentral am Marktplatz...", isFinal: false },
     { name: "Burg Eisenhardt", worldX: 10500, width: 60, height: 90, descEN: "You made it to Burg Eisenhardt! This impressive medieval castle...", descDE: "Geschafft! Du hast die Burg Eisenhardt erreicht! Diese Burg...", isFinal: true },
];

/**
 * Initializes the landmarks array based on landmarkConfig and current canvas dimensions.
 */
function initializeLandmarks() {
    const currentCanvasHeight = config.canvasHeight;
    // Base height of the sign image (used for scaling calculations)
    const baseSignHeight = 90;
    // Calculate scale factor based on current canvas height vs. original design height (e.g., 400px)
    const scaleFactor = currentCanvasHeight / 400;
    // Calculate the scaled height for the signs
    const scaledSignHeight = baseSignHeight * scaleFactor;

    landmarks = landmarkConfig.map(cfg => ({
        ...cfg, // Copy properties from config
        // Calculate Y position based on canvas height, logical ground, and scaled sign height
        yPos: currentCanvasHeight - config.groundHeight - scaledSignHeight,
        hasBeenTriggered: false // Reset triggered status
    }));
}
// --- END Landmark Data ---

// --- Player State Initialization ---
/**
 * Resets the playerState object with initial values, scaled to canvas size.
 */
function resetPlayer() {
    const currentCanvasHeight = config.canvasHeight;
    // Scale player size based on canvas height (e.g., player is 15% of canvas height)
    const playerHeight = currentCanvasHeight * 0.15;
    // Maintain player aspect ratio (e.g., width is 60/75 of height)
    const playerWidth = playerHeight * (60 / 75);

    playerState = {
        x: 50, // Initial horizontal position (can be scaled too if needed)
        // Calculate initial Y position based on canvas height, ground height, and player height
        y: currentCanvasHeight - config.groundHeight - playerHeight,
        width: playerWidth,
        height: playerHeight,
        vy: 0, // Initial vertical velocity
        isGrounded: true // Starts on the ground
    };
}

// --- Game Reset Function ---
/**
 * Resets the entire game state to start a new game.
 */
function resetGame() {
    console.log("Resetting game...");
    // Ensure canvas dimensions in config are up-to-date
    setupCanvas(); // Updates config.canvasWidth/Height

    // Reset game elements and state variables
    resetPlayer(); // Initialize player state
    obstacles = []; // Clear obstacles array
    initializeLandmarks(); // Initialize landmarks based on current size
    score = 0;
    frameCount = 0;
    gameSpeed = config.obstacleSpeed; // Reset speed to base value
    isJumpKeyDown = false;
    isPointerDownJump = false;
    playerLives = config.startLives;
    isRecovering = false;
    recoveryTimer = 0;
    backgroundX = 0; // Reset background scroll position

    // Update UI display elements
    livesDisplay.textContent = `Leben / Lives: ${playerLives}`;
    scoreDisplay.textContent = `Punkte / Score: 0`;

    // Hide overlay screens
    gameOverScreen.style.display = 'none';
    winScreen.style.display = 'none';
    landmarkPopup.style.display = 'none';

    // Set game state to running and start the game loop
    gameState = 'running';
    requestAnimationFrame(gameLoop); // Start the animation loop
}

// --- Input Handling ---
/**
 * Handles the jump action based on game state.
 */
function handleJump() {
    // Allow jump only when running and grounded
    if (gameState === 'running' && playerState.isGrounded) {
        // Scale jump strength based on canvas height relative to a baseline (e.g., 400px)
        playerState.vy = config.jumpStrength * (config.canvasHeight / 400);
        playerState.isGrounded = false; // Player is now airborne
    }
    // Allow resetting from end screens via jump action (space/tap)
    else if (gameState === 'gameOver' && gameOverScreen.style.display !== 'none') {
        resetGame();
    } else if (gameState === 'win' && winScreen.style.display !== 'none') {
        resetGame();
    }
}

/**
 * Hides the landmark popup and resumes/ends the game accordingly.
 */
function hideLandmarkPopup() {
    const popupIsVisible = landmarkPopup.style.display !== 'none';
    if (!popupIsVisible) return; // Do nothing if popup isn't showing

    landmarkPopup.style.display = 'none'; // Hide the popup

    if (gameState === 'win') {
        // If the game was won (final landmark popup closed), show the win screen
        showWinScreen();
    } else if (gameState === 'paused') {
        // If the game was paused (regular landmark popup closed), resume
        gameState = 'running';
        requestAnimationFrame(gameLoop); // Restart the game loop
    }
}

// --- Event Listeners ---
// Keyboard input
window.addEventListener('keydown', (e) => {
    // Handle jump (Spacebar)
    if (e.code === 'Space') {
        e.preventDefault(); // Prevent page scrolling
        if (!isJumpKeyDown) { handleJump(); } // Trigger jump only on initial press
        isJumpKeyDown = true;
    }
    // Handle Enter key for popups/end screens
    else if (e.key === 'Enter' || e.code === 'Enter') {
        e.preventDefault();
        // If landmark popup is shown (paused or win state)
        if ((gameState === 'paused' || gameState === 'win') && landmarkPopup.style.display !== 'none') {
            hideLandmarkPopup();
        }
        // If game over screen is shown
        else if (gameState === 'gameOver' && gameOverScreen.style.display !== 'none') {
            resetGame();
        }
        // If win screen is shown (after landmark popup)
        else if (gameState === 'win' && winScreen.style.display !== 'none') {
            resetGame();
        }
    }
});

window.addEventListener('keyup', (e) => {
    // Reset jump key flag when spacebar is released
    if (e.code === 'Space') {
        e.preventDefault();
        isJumpKeyDown = false;
    }
});

// Touch input on canvas
canvas.addEventListener('touchstart', (e) => {
    e.preventDefault(); // Prevent default touch actions (like scrolling)
    // Allow jump if running/paused, or reset from end screens
    if (gameState === 'running' || gameState === 'paused') {
        handleJump();
        isPointerDownJump = true; // Track touch hold for variable jump
    } else if (gameState === 'gameOver' && gameOverScreen.style.display !== 'none') {
        resetGame();
    } else if (gameState === 'win' && winScreen.style.display !== 'none') {
        resetGame();
    }
});

// Mouse input on canvas (primarily for desktop testing)
canvas.addEventListener('mousedown', (e) => {
    // Only allow jump if game is running
    if (gameState === 'running') {
        handleJump();
        isPointerDownJump = true; // Track mouse hold
    }
});

// Release touch/mouse hold flags
window.addEventListener('touchend', (e) => { isPointerDownJump = false; });
window.addEventListener('mouseup', (e) => { isPointerDownJump = false; });

// Click listeners for overlays (allow clicking anywhere on overlay to reset)
gameOverScreen.addEventListener('click', resetGame);
winScreen.addEventListener('click', resetGame);
// Click listener specifically for the continue button in the landmark popup
continueButton.addEventListener('click', hideLandmarkPopup);
// --- END Input Handling ---

// --- Collision Detection ---
/**
 * Simple Axis-Aligned Bounding Box (AABB) collision check.
 * @param {object} rect1 - First rectangle {x, y, width, height}.
 * @param {object} rect2 - Second rectangle {x, y, width, height}.
 * @returns {boolean} - True if rectangles overlap, false otherwise.
 */
function checkCollision(rect1, rect2) {
    return (
        rect1.x < rect2.x + rect2.width &&
        rect1.x + rect1.width > rect2.x &&
        rect1.y < rect2.y + rect2.height &&
        rect1.y + rect1.height > rect2.y
    );
}

// --- Obstacle Handling ---
const obstacleTypes = ['stoneObstacle', 'familyObstacle', 'tractorObstacle']; // Keys match assets.sources

/**
 * Spawns a new obstacle of a random type, scaled to canvas size.
 */
function spawnObstacle() {
    const typeIndex = Math.floor(Math.random() * obstacleTypes.length);
    const selectedTypeKey = obstacleTypes[typeIndex];

    // Base dimensions for different obstacle types (adjust as needed)
    let baseHeight, baseWidth;
    switch (selectedTypeKey) {
        case 'familyObstacle': baseHeight = 100; baseWidth = 70; break;
        case 'tractorObstacle': baseHeight = 80; baseWidth = 115; break;
        case 'stoneObstacle': default: baseHeight = 40; baseWidth = 30; break;
    }

    // Calculate scale factor based on current canvas height vs. original design height (e.g., 400px)
    const scaleFactor = config.canvasHeight / 400;
    // Calculate scaled dimensions with some random variation
    let obstacleHeight = (baseHeight + Math.random() * (baseHeight * 0.3)) * scaleFactor;
    let obstacleWidth = (baseWidth + Math.random() * (baseWidth * 0.2)) * scaleFactor;

    // Add the new obstacle to the array
    obstacles.push({
        x: config.canvasWidth, // Spawn off-screen to the right
        // Position obstacle on the logical ground line
        y: config.canvasHeight - config.groundHeight - obstacleHeight,
        width: obstacleWidth,
        height: obstacleHeight,
        typeKey: selectedTypeKey // Store key to retrieve correct image
    });
}

/**
 * Updates the position of all obstacles and removes off-screen ones.
 */
function updateObstacles() {
     // Scale game speed based on canvas width relative to original design width (e.g., 800px)
     const scaledGameSpeed = gameSpeed * (config.canvasWidth / 800);

    // Spawn new obstacles periodically after an initial delay
    if (frameCount > 100 && frameCount % config.spawnRate === 0) {
        spawnObstacle();
    }

    // Move existing obstacles leftwards and remove if off-screen
    for (let i = obstacles.length - 1; i >= 0; i--) {
        obstacles[i].x -= scaledGameSpeed; // Move using scaled speed
        // Remove if obstacle is completely off the left edge
        if (obstacles[i].x + obstacles[i].width < 0) {
            obstacles.splice(i, 1); // Remove from array
        }
    }
}
// --- END Obstacle Handling ---

// --- Landmark Display ---
/**
 * Shows the landmark popup with details for the given landmark.
 * @param {object} landmark - The landmark object to display.
 */
function showLandmarkPopup(landmark) {
    landmarkName.textContent = landmark.name;
    // Use innerHTML to allow basic formatting (line breaks)
    landmarkDescription.innerHTML = `${landmark.descEN}<br><br>${landmark.descDE}`;
    landmarkPopup.style.display = 'flex'; // Show the popup
}

// --- Update Game State (Main Logic Loop) ---
/**
 * Updates the game state for a single frame (player movement, physics, collisions, etc.).
 */
function update() {
    // Only run update logic if the game is in the 'running' state
    if (gameState !== 'running') return;

    frameCount++; // Increment frame counter

    // --- Recovery State ---
    if (isRecovering) {
        recoveryTimer--; // Decrement timer
        if (recoveryTimer <= 0) {
            isRecovering = false; // End recovery period
        }
    }

    // --- Player Physics ---
    // Scale gravity based on canvas height relative to baseline (400px)
    let currentGravity = config.gravity * (config.canvasHeight / 400);
    // Apply variable jump gravity based on holding the jump input
    if (!playerState.isGrounded && playerState.vy < 0) { // If moving upwards
        if (isJumpKeyDown || isPointerDownJump) { // If holding jump
            currentGravity *= config.jumpHoldGravityMultiplier; // Reduce gravity
        } else { // If jump released early
            currentGravity *= config.jumpCutGravityMultiplier; // Increase gravity
        }
    }
    playerState.vy += currentGravity; // Apply gravity to vertical velocity
    playerState.y += playerState.vy; // Update vertical position

    // --- Ground Collision ---
    // Calculate ground level based on canvas height, ground height, and player height
    const groundLevel = config.canvasHeight - config.groundHeight - playerState.height;
    if (playerState.y >= groundLevel) { // If player is at or below ground level
        playerState.y = groundLevel; // Snap to ground
        playerState.vy = 0; // Stop vertical movement
        playerState.isGrounded = true; // Player is grounded
    } else {
        playerState.isGrounded = false; // Player is airborne
    }

    // --- Obstacle Updates ---
    updateObstacles(); // Handle obstacle spawning and movement (includes speed scaling)

    // --- Collision Checks ---
    if (!isRecovering) { // Only check collisions if player is not invincible
        for (let i = obstacles.length - 1; i >= 0; i--) {
            const obstacle = obstacles[i];
            if (checkCollision(playerState, obstacle)) { // Check for overlap
                // Determine if it's a stomp (falling onto the top)
                const isFalling = playerState.vy > 0;
                // Estimate player bottom position in the previous frame
                const previousPlayerBottom = playerState.y + playerState.height - playerState.vy;
                const obstacleTop = obstacle.y;

                if (isFalling && previousPlayerBottom <= obstacleTop + 1) { // Stomp detected (+1 tolerance)
                    // console.log("Stomp!");
                    // Scale stomp jump strength based on canvas height
                    playerState.vy = config.stompJumpStrength * (config.canvasHeight / 400);
                    playerState.y = obstacle.y - playerState.height; // Position player above obstacle
                    playerState.isGrounded = false; // Player is airborne after stomp
                    score += 50; // Add stomp bonus score
                    obstacles.splice(i, 1); // Remove stomped obstacle
                    continue; // Skip further checks for this obstacle
                } else { // Not a stomp - it's a hit
                    // console.log("Hit!");
                    playerLives--; // Lose a life
                    livesDisplay.textContent = `Leben / Lives: ${playerLives}`; // Update UI
                    score -= 75; if (score < 0) { score = 0; } // Score penalty

                    if (playerLives <= 0) { // Check for game over
                        console.log("Game Over!");
                        gameState = 'gameOver';
                        showGameOverScreen(); // Show game over overlay
                        return; // Stop the update loop
                    } else { // Lose life, but continue
                        isRecovering = true; // Start recovery period
                        recoveryTimer = config.recoveryDuration;
                        // Small bounce back effect (scaled)
                        playerState.vy = -3 * (config.canvasHeight / 400);
                        playerState.isGrounded = false;
                        // Optional: Remove the obstacle that was hit
                        // obstacles.splice(i, 1);
                        break; // Stop checking collisions for this frame after taking a hit
                    }
                }
            }
        }
    }

    // --- Landmark Triggers ---
    // Scale game speed based on canvas width relative to baseline (800px)
    const scaledGameSpeed = gameSpeed * (config.canvasWidth / 800);
    for (let landmark of landmarks) {
        landmark.worldX -= scaledGameSpeed; // Move landmark leftwards based on scaled speed

        // Check if player overlaps with an untriggered landmark
        // Use player's bounding box and landmark's current worldX
        const scaleFactor = config.canvasHeight / 400; // Use same scale factor as drawing
        const signW = (landmark.width || 60) * scaleFactor; // Use scaled width for check
        if (!landmark.hasBeenTriggered &&
            landmark.worldX < playerState.x + playerState.width &&
            landmark.worldX + signW > playerState.x)
        {
            console.log(`Triggering landmark: ${landmark.name}`);
            landmark.hasBeenTriggered = true;
            showLandmarkPopup(landmark); // Show the info popup

            if (landmark.isFinal) {
                gameState = 'win'; // Set state to win (popup handled by hideLandmarkPopup)
            } else {
                gameState = 'paused'; // Pause for regular landmarks
            }
            return; // Exit update loop early after triggering a landmark
        }
    }

    // --- Score Update ---
    score++; // Increment score based on time/distance (frames)
    // Update score display less frequently or scale score for readability
    scoreDisplay.textContent = `Punkte / Score: ${Math.floor(score / 5)}`;

    // --- Speed Increase ---
    // Increase speed periodically (e.g., every 240 frames)
    if (frameCount > 0 && frameCount % 240 === 0) {
        // Compare current base speed with base max speed
        if (gameSpeed < config.maxGameSpeed) {
            gameSpeed += 0.07; // Increment base speed
            gameSpeed = parseFloat(gameSpeed.toFixed(2)); // Avoid floating point issues
            // console.log("Base Game Speed Increased:", gameSpeed);
        }
    }

     // --- Background Scrolling ---
     // Use scaled game speed for background scroll
     backgroundX -= scaledGameSpeed * 0.5; // Scroll background slower than foreground
     // Estimate scaled background width for seamless looping
     let scaledBgWidth = config.canvasWidth; // Default if no image
     if (assets.backgroundImage) {
         const bgScaleFactor = (config.canvasHeight - config.groundHeight) / assets.backgroundImage.height;
         scaledBgWidth = assets.backgroundImage.width * bgScaleFactor;
     }
     // Reset background position for looping effect
     if (backgroundX <= -scaledBgWidth) {
         backgroundX += scaledBgWidth;
     }
}


// --- Draw Game (Rendering Loop) ---
/**
 * Draws the current game state onto the canvas.
 */
function draw() {
    // Get current canvas dimensions from config (updated by setupCanvas)
    const canvasW = config.canvasWidth;
    const canvasH = config.canvasHeight;

    // Clear the entire canvas
    ctx.clearRect(0, 0, canvasW, canvasH);

     // --- Draw Background ---
     if (assets.backgroundImage) {
         // Calculate scale factor to make background height fit space above ground
         const bgHeightToDraw = canvasH - config.groundHeight;
         const scaleFactor = bgHeightToDraw / assets.backgroundImage.height;
         const scaledBgWidth = assets.backgroundImage.width * scaleFactor;

         // Calculate starting X position for seamless looping
         let currentX = backgroundX % scaledBgWidth;
         // Ensure it starts off-screen left if necessary for smooth loop
         if (currentX > 0) currentX -= scaledBgWidth;

         // Draw background image tiles to cover the canvas width
         while (currentX < canvasW) {
             ctx.drawImage(
                 assets.backgroundImage, // Source image
                 0, 0, assets.backgroundImage.width, assets.backgroundImage.height, // Source rect
                 currentX, 0, scaledBgWidth, bgHeightToDraw // Destination rect (scaled)
             );
             currentX += scaledBgWidth; // Move to next tile position
         }
     } else {
         // Fallback: Draw solid blue sky if background image failed
         ctx.fillStyle = config.colors.blue;
         ctx.fillRect(0, 0, canvasW, canvasH - config.groundHeight);
     }

     // --- Draw Visual Ground ---
     // Draw a rectangle representing the ground using the logical groundHeight
     ctx.fillStyle = config.colors.ground; // Brown color
     ctx.fillRect(0, canvasH - config.groundHeight, canvasW, config.groundHeight);

    // --- Draw Player ---
    let drawPlayer = true;
    // Apply flashing effect during recovery
    if (isRecovering && frameCount % 10 < 5) { // Flash on/off every 5 frames
        drawPlayer = false;
    }
    if (drawPlayer) {
        // Use player image if loaded
        if (assets.knightPlaceholder) {
            ctx.drawImage(assets.knightPlaceholder, playerState.x, playerState.y, playerState.width, playerState.height);
        } else {
            // Fallback: Draw green rectangle if image failed
            ctx.fillStyle = config.colors.green;
            ctx.fillRect(playerState.x, playerState.y, playerState.width, playerState.height);
        }
    }

    // --- Draw Obstacles ---
    obstacles.forEach(obstacle => {
        const obstacleImage = assets[obstacle.typeKey]; // Get the correct image
        if (obstacleImage) {
            // Draw obstacle image if loaded
            ctx.drawImage(obstacleImage, obstacle.x, obstacle.y, obstacle.width, obstacle.height);
        } else {
            // Fallback: Draw black rectangle if image failed
            ctx.fillStyle = config.colors.black;
            ctx.fillRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height);
        }
    });

    // --- Draw Landmark Signs ---
    landmarks.forEach(landmark => {
         // Calculate scale factor based on current canvas height vs. baseline (400px)
         const scaleFactor = config.canvasHeight / 400;
         // Calculate scaled dimensions for the sign
         const signW = (landmark.width || 60) * scaleFactor;
         const signH = (landmark.height || 90) * scaleFactor;
         // Recalculate Y position based on current dimensions and scaled height
         const signY = config.canvasHeight - config.groundHeight - signH;

         // Only draw if the landmark sign is potentially visible on screen
         if (landmark.worldX < canvasW && landmark.worldX + signW > 0) {
             // Use sign image if loaded
             if (assets.signImage) {
                 ctx.drawImage(assets.signImage, landmark.worldX, signY, signW, signH);
             } else {
                 // Fallback: Draw brown rectangle if image failed
                 ctx.fillStyle = config.colors.ground;
                 ctx.fillRect(landmark.worldX, signY, signW, signH);
             }
         }
    });
}
// --- END Draw Game ---

// --- UI Updates ---
/** Shows the game over screen overlay. */
function showGameOverScreen() { gameOverScreen.style.display = 'flex'; }
/** Shows the win screen overlay. */
function showWinScreen() { winScreen.style.display = 'flex'; }

// --- Main Game Loop ---
/**
 * The main animation loop. Checks game state, calls update and draw.
 */
function gameLoop() {
    // Stop the loop if game is not in 'running' state
    if (gameState !== 'running') {
        // console.log(`Game loop stopping. State: ${gameState}`);
        return;
    }

    // Update game logic
    update();
    // Render the current frame
    draw();

    // Request the next animation frame to continue the loop
    requestAnimationFrame(gameLoop);
}

// --- Start Game ---
// Initial setup actions when the script loads
// setupCanvas(); // Initial canvas setup - Moved to asset load callback to ensure dimensions are ready
loadAllAssets(); // Start loading assets, which will then call setupCanvas and resetGame
// --- END Start Game ---
