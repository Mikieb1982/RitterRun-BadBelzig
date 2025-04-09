// --- Strict mode and IIFE ---
(function() {
    'use strict';

    // --- Canvas and Context ---
    const canvas = document.getElementById('gameCanvas');
    if (!canvas || !canvas.getContext) { /* ... error handling ... */ return; }
    const ctx = canvas.getContext('2d');
    const canvasWidth = canvas.width; const canvasHeight = canvas.height;

    // --- DOM Element References ---
    const startScreen = document.getElementById('startScreen'); /* ... and others ... */
    const poiInfoTextEl = document.getElementById('poiInfoText'); // Make sure this ID exists in index.html!
    if (!startScreen || /* ... other checks ... */ !poiInfoTextEl) { /* ... error handling ... */ return; }

    // --- Game States ---
    const GameState = { MENU: 'MENU', PLAYING: 'PLAYING', GAME_OVER: 'GAME_OVER' };
    let currentGameState = GameState.MENU;

    // --- Game Variables ---
    let score = 0; let highScore = 0;
    let player = { x: 60, y: canvasHeight - 60, /* !!! CHECK DIMENSIONS !!! */ width: 40, height: 40, dx: 0, dy: 0, gravity: 0.65, jumpPower: -13, grounded: true };
    let obstacles = []; let frameCount = 0; let gameSpeed = 5.5; let initialGameSpeed = 5.5;
    let speedIncreaseInterval = 400; let nextSpeedIncreaseScore = speedIncreaseInterval;
    let groundHeight = 25;

    // --- Graphics Assets ---
    const assets = {
        knight: { img: new Image(), loaded: false, src: 'assets/knight_placeholder.png' },
        stone: { img: new Image(), loaded: false, src: 'assets/stone.png' },
        sign: { img: new Image(), loaded: false, src: 'assets/sign.png' },
        tractor: { img: new Image(), loaded: false, src: 'assets/tractor.png' },
        // *** Use the three background layers ***
        background1: { img: new Image(), loaded: false, src: 'assets/background1.png' }, // Furthest
        background2: { img: new Image(), loaded: false, src: 'assets/background2.png' }, // Middle
        background3: { img: new Image(), loaded: false, src: 'assets/background3.png' }  // Nearest
    };
    let assetsLoadedCount = 0;
    let totalAssets = Object.keys(assets).length; // Calculate total dynamically
    let allAssetsLoaded = false;
    let gameInitialized = false;

    // Position variables for each background layer
    let bg1X = 0; let bg2X = 0; let bg3X = 0;

    // --- Obstacle/POI Definitions ---
    const regularObstacleTypes = [ { assetKey: 'stone', width: 35, height: 35 }, { assetKey: 'tractor', width: 70, height: 45 } ];
    const poiSignDimensions = { width: 45, height: 55 }; // !!! CHECK sign.png SIZE !!!

    // --- POI Data & Handling ---
    const poiData = [ /* ... your poi data array ... */ ];
    let nextPoiIndex = 0; let poiTimeoutId = null; const poiDisplayDuration = 6000;

    // --- Asset Loading Functions (assetLoaded, assetLoadError, loadAssets) ---
    function assetLoaded(assetKey) { assets[assetKey].loaded = true; assetsLoadedCount++; if (assetsLoadedCount === totalAssets && !gameInitialized) { allAssetsLoaded = true; init(); } }
    function assetLoadError(assetKey) { console.error(`Failed to load asset: ${assets[assetKey].src}.`); alert(`Error loading image: ${assets[assetKey].src}\nGame cannot start.`); }
    function loadAssets() { console.log("Starting asset loading..."); for (const key in assets) { if (assets.hasOwnProperty(key) && assets[key].img) { assets[key].img.onload = () => assetLoaded(key); assets[key].img.onerror = () => assetLoadError(key); assets[key].img.src = assets[key].src; } } }

    // --- High Score Handling (loadHighScore, saveHighScore) ---
    function loadHighScore() { /* ... keep existing ... */ try { const savedScore = localStorage.getItem('ritterRunHighScore'); highScore = savedScore ? parseInt(savedScore, 10) : 0; if (isNaN(highScore)) highScore = 0; startHighScoreSpan.textContent = highScore; gameOverHighScoreSpan.textContent = highScore; } catch (e) { console.error("LS Error Load HS:", e); highScore = 0; } }
    function saveHighScore() { /* ... keep existing ... */ if (score > highScore) { highScore = score; try { localStorage.setItem('ritterRunHighScore', highScore.toString()); gameOverHighScoreSpan.textContent = highScore; } catch (e) { console.error("LS Error Save HS:", e); } } }

    // --- Sound Playing Helper ---
     function playSound(soundElement) { /* ... keep existing ... */ }

    // --- Reset Game Variables ---
     function resetGame() {
         score = 0; obstacles = []; frameCount = 0;
         gameSpeed = initialGameSpeed; nextSpeedIncreaseScore = speedIncreaseInterval;
         // Reset all background positions
         bg1X = 0; bg2X = 0; bg3X = 0;
         player.y = canvasHeight - player.height - groundHeight;
         player.dy = 0; player.grounded = true;
         if (currentScoreSpan) currentScoreSpan.textContent = score;
         if (poiTimeoutId) clearTimeout(poiTimeoutId); poiOverlay?.classList.remove('visible');
         nextPoiIndex = 0;
    }

    // --- Update Functions ---
     function updatePlayer() { /* ... keep existing ... */ if (!player.grounded) { player.dy += player.gravity; player.y += player.dy; } if (player.y >= canvasHeight - player.height - groundHeight) { player.y = canvasHeight - player.height - groundHeight; player.dy = 0; player.grounded = true; } }

    function updateObstacles() { /* ... keep existing POI spawning/checking logic ... */
        frameCount++;
        const baseFrequency = 130; const speedFactor = Math.max(1, gameSpeed * 2.5);
        const spawnFrequency = Math.max(50, baseFrequency - speedFactor);
        if (frameCount % Math.floor(spawnFrequency) === 0) {
            let newObjectData = null;
            const spawnPOI = Math.random() < 0.18 && poiData.length > 0 && assets.sign.loaded;
            if (spawnPOI) { const poi = poiData[nextPoiIndex % poiData.length]; newObjectData = { isPOI: true, poiId: poi.id, passed: false, x: canvasWidth, y: canvasHeight - poiSignDimensions.height - groundHeight, width: poiSignDimensions.width, height: poiSignDimensions.height, assetKey: 'sign' }; nextPoiIndex++; }
            else { if (regularObstacleTypes.length > 0) { const typeIndex = Math.floor(Math.random() * regularObstacleTypes.length); const type = regularObstacleTypes[typeIndex]; if (assets[type.assetKey] && assets[type.assetKey].loaded) { newObjectData = { isPOI: false, x: canvasWidth, y: canvasHeight - type.height - groundHeight, width: type.width, height: type.height, assetKey: type.assetKey }; } } }
            if (newObjectData) { obstacles.push(newObjectData); }
        }
        for (let i = obstacles.length - 1; i >= 0; i--) { const obj = obstacles[i]; obj.x -= gameSpeed; if (obj.isPOI && !obj.passed && obj.x + obj.width < player.x) { /*console.log(`*** Player passed POI ID: ${obj.poiId}...`);*/ displayPOIInfo(obj.poiId); obj.passed = true; score += 50; if (currentScoreSpan) currentScoreSpan.textContent = score; } if (obj.x + obj.width < -100) { obstacles.splice(i, 1); } }
    }

    function checkCollisions() { /* ... keep existing ... */ const playerRect={x:player.x, y:player.y, width:player.width, height:player.height}; for(const obstacle of obstacles){if(obstacle.isPOI){continue;} const obstacleRect={x:obstacle.x, y:obstacle.y, width:obstacle.width, height:obstacle.height}; if(playerRect.x<obstacleRect.x+obstacleRect.width&&playerRect.x+playerRect.width>obstacleRect.x&&playerRect.y<obstacleRect.y+obstacleRect.height&&playerRect.y+playerRect.height>obstacleRect.y){console.error(`Collision detected: ${obstacle.assetKey}`); return true;} } return false; }
    function updateScoreAndSpeed() { /* ... keep existing ... */ score++; if (currentScoreSpan) currentScoreSpan.textContent = score; if (score > 0 && score % speedIncreaseInterval === 0 && score >= nextSpeedIncreaseScore) { gameSpeed += 0.3; nextSpeedIncreaseScore += speedIncreaseInterval; } }


    // --- *** REVISED: drawBackground Function for Parallax *** ---
    function drawBackground() {
        const speed1 = gameSpeed * 0.2; // Furthest layer scrolls slowest
        const speed2 = gameSpeed * 0.5; // Middle layer scrolls medium speed
        const speed3 = gameSpeed * 1.0; // Nearest layer scrolls at game speed

        bg1X -= speed1; bg2X -= speed2; bg3X -= speed3; // Update positions
        // Loop positions
        bg1X = bg1X % canvasWidth; if (bg1X > 0) bg1X -= canvasWidth;
        bg2X = bg2X % canvasWidth; if (bg2X > 0) bg2X -= canvasWidth;
        bg3X = bg3X % canvasWidth; if (bg3X > 0) bg3X -= canvasWidth;

        // Draw layers from back to front
        if (assets.background1 && assets.background1.loaded) { // Layer 1
            ctx.drawImage(assets.background1.img, bg1X, 0, canvasWidth, canvasHeight);
            ctx.drawImage(assets.background1.img, bg1X + canvasWidth, 0, canvasWidth, canvasHeight);
        } else { ctx.fillStyle = '#ADD8E6'; ctx.fillRect(0, 0, canvasWidth, canvasHeight); } // Fallback L1
        if (assets.background2 && assets.background2.loaded) { // Layer 2
            ctx.drawImage(assets.background2.img, bg2X, 0, canvasWidth, canvasHeight);
            ctx.drawImage(assets.background2.img, bg2X + canvasWidth, 0, canvasWidth, canvasHeight);
        }
        if (assets.background3 && assets.background3.loaded) { // Layer 3
            ctx.drawImage(assets.background3.img, bg3X, 0, canvasWidth, canvasHeight);
            ctx.drawImage(assets.background3.img, bg3X + canvasWidth, 0, canvasWidth, canvasHeight);
        } else { ctx.fillStyle = '#228B22'; ctx.fillRect(0, canvasHeight - groundHeight, canvasWidth, groundHeight); } // Fallback L3
    }
    // --- END REVISED drawBackground ---


    function drawPlayer() { /* ... keep existing ... */ if (!assets.knight.loaded) { ctx.fillStyle = 'grey'; ctx.fillRect(player.x, player.y, player.width, player.height); return; } ctx.drawImage(assets.knight.img, player.x, player.y, player.width, player.height); }
    function drawObstacles() { /* ... keep existing ... */ for (const obj of obstacles) { if (assets[obj.assetKey] && assets[obj.assetKey].loaded) { ctx.drawImage(assets[obj.assetKey].img, obj.x, obj.y, obj.width, obj.height); } else { ctx.fillStyle = obj.isPOI ? 'blue' : 'red'; ctx.fillRect(obj.x, obj.y, obj.width, obj.height); } } }

    // --- Display POI Info ---
    function displayPOIInfo(poiId) { /* ... keep existing ... */ if (!poiOverlay || !poiNameEl || !poiInfoTextEl) { return; } const poi = poiData.find(p => p.id === poiId); if (!poi) { return; } poiNameEl.textContent = poi.name; poiInfoTextEl.textContent = poi.info; poiOverlay.classList.add('visible'); if (poiTimeoutId) { clearTimeout(poiTimeoutId); } poiTimeoutId = setTimeout(() => { poiOverlay.classList.remove('visible'); poiTimeoutId = null; }, poiDisplayDuration); }

    // --- Game Loop ---
     let lastTime = 0;
     function gameLoop(timestamp) { /* ... keep existing ... */ requestAnimationFrame(gameLoop); const dt=timestamp - lastTime; lastTime=timestamp; ctx.clearRect(0,0,canvasWidth,canvasHeight); drawBackground(); if(currentGameState===GameState.PLAYING){updatePlayer(); updateObstacles(); updateScoreAndSpeed(); drawPlayer(); drawObstacles(); if(checkCollisions()){currentGameState=GameState.GAME_OVER; saveHighScore(); finalScoreSpan.textContent=score; gameOverHighScoreSpan.textContent=highScore; gameOverScreen.classList.remove('hidden'); scoreDisplay.classList.add('hidden'); if(poiTimeoutId)clearTimeout(poiTimeoutId); poiOverlay.classList.remove('visible');}}else{drawPlayer(); if(currentGameState===GameState.GAME_OVER){drawObstacles();}}}


    // --- Game State Changers / Event Handlers ---
    function startGame() { /* ... keep existing ... */ if(currentGameState===GameState.PLAYING||!allAssetsLoaded)return; console.log("Start Game"); resetGame(); currentGameState=GameState.PLAYING; startScreen.classList.add('hidden'); gameOverScreen.classList.add('hidden'); scoreDisplay.classList.remove('hidden');}
    function restartGame() { /* ... keep existing ... */ if(currentGameState===GameState.PLAYING||!allAssetsLoaded)return; console.log("Restart Game"); resetGame(); currentGameState=GameState.PLAYING; gameOverScreen.classList.add('hidden'); startScreen.classList.add('hidden'); scoreDisplay.classList.remove('hidden');}
    function handleJumpInput() { /* ... keep existing ... */ if(currentGameState===GameState.PLAYING&&player.grounded){player.dy=player.jumpPower; player.grounded=false;}}

    // --- Initial Setup (init) ---
    function init() { /* ... keep existing ... */ console.log("init()"); if(gameInitialized)return; gameInitialized=true; loadHighScore(); startScreen.classList.remove('hidden'); gameOverScreen.classList.add('hidden'); scoreDisplay.classList.add('hidden'); poiOverlay?.classList.add('hidden'); player.y=canvasHeight-player.height-groundHeight; console.log("Attaching listeners"); startButton.removeEventListener('click', startGame); restartButton.removeEventListener('click', restartGame); document.removeEventListener('keydown', handleKeyDown); canvas.removeEventListener('touchstart', handleTouchStart); startButton.removeEventListener('touchstart', handleButtonTouchStart); restartButton.removeEventListener('touchstart', handleButtonTouchStart); startButton.addEventListener('click', startGame); restartButton.addEventListener('click', restartGame); document.addEventListener('keydown', handleKeyDown); canvas.addEventListener('touchstart', handleTouchStart,{passive:false}); startButton.addEventListener('touchstart', handleButtonTouchStart,{passive:false}); restartButton.addEventListener('touchstart', handleButtonTouchStart,{passive:false}); console.log("Listeners attached."); requestAnimationFrame(gameLoop);}


    // --- Named Event Handlers ---
    function handleKeyDown(e){if(e.code==='Space'||e.key===' '||e.keyCode===32){e.preventDefault(); if(!allAssetsLoaded)return; if(currentGameState===GameState.PLAYING){handleJumpInput();}else if(currentGameState===GameState.MENU){startGame();}else if(currentGameState===GameState.GAME_OVER){restartGame();}}}
    function handleTouchStart(e){e.preventDefault(); if(!allAssetsLoaded)return; if(currentGameState===GameState.PLAYING){handleJumpInput();}else if(currentGameState===GameState.MENU){startGame();}else if(currentGameState===GameState.GAME_OVER){restartGame();}}}
    function handleButtonTouchStart(e){e.preventDefault(); if(!allAssetsLoaded)return; if(e.target.id==='startButton'&¤tGameState===GameState.MENU){startGame();}else if(e.target.id==='restartButton'&¤tGameState===GameState.GAME_OVER){restartGame();}}}


    // --- Start Loading Assets ---
    document.addEventListener('DOMContentLoaded', () => { console.log("DOM Ready. Loading assets."); loadAssets(); });

})(); // End of IIFE
