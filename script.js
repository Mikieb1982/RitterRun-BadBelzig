// --- Strict mode and IIFE ---
(function() {
    'use strict';

    // --- Canvas and Context ---
    const canvas = document.getElementById('gameCanvas');
    if (!canvas || !canvas.getContext) {
        console.error("Fatal Error: Canvas not found or not supported!");
        alert("Fatal Error: Canvas not found or not supported! Try a different browser.");
        return;
    }
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
    const poiOverlay = document.getElementById('poiInfoOverlay');
    const poiNameEl = document.getElementById('poiName');
    const poiInfoTextEl = document.getElementById('poiInfoText'); // Make sure this ID exists in index.html!

    // Check essential UI elements
    if (!startScreen || !gameOverScreen || !startButton || !restartButton || !scoreDisplay ||
        !currentScoreSpan || !finalScoreSpan || !startHighScoreSpan || !gameOverHighScoreSpan ||
        !poiOverlay || !poiNameEl || !poiInfoTextEl) {
        console.error("Fatal Error: One or more required UI elements not found in index.html!");
        alert("Fatal Error: UI elements missing! Check index.html.");
        return; // Stop if critical UI missing
    }

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
        background1: { img: new Image(), loaded: false, src: 'assets/background1.png' },
        background2: { img: new Image(), loaded: false, src: 'assets/background2.png' },
        background3: { img: new Image(), loaded: false, src: 'assets/background3.png' }
    };
    let assetsLoadedCount = 0; let totalAssets = Object.keys(assets).length;
    let allAssetsLoaded = false; let gameInitialized = false;

    // --- Background Cycling Variables ---
    let bgX = 0; let currentBackgroundIndex = 0;
    const backgroundSwitchScoreInterval = 1000; let nextBackgroundSwitchScore = backgroundSwitchScoreInterval;
    const numBackgrounds = 3;

    // --- Obstacle/POI Definitions ---
    const regularObstacleTypes = [ { assetKey: 'stone', width: 35, height: 35 }, { assetKey: 'tractor', width: 70, height: 45 } ]; // !!! CHECK DIMS !!!
    const poiSignDimensions = { width: 45, height: 55 }; // !!! CHECK DIMS !!!

    // --- POI Data Structure (Defined ONCE) ---
    // !!! REPLACE WITH YOUR INFO !!!
    const poiData = [ { id: 1, name: "Burg Eisenhardt", info: "A well-preserved medieval castle..." }, { id: 2, name: "SteinTherme", info: "Modern thermal baths..." }, { id: 3, name: "Historic Town Center", info: "Walk through the Altstadt..." }, { id: 4, name: "Hagelberg Memorial", info: "Commemorates the Battle..." }, { id: 5, name: "Roger Loewig Museum", info: "Museum dedicated to the artist..." }, { id: 6, name: "Fläming Nature Park Center", info: "Info about the Hoher Fläming region..." }, ];
    let nextPoiIndex = 0; let poiTimeoutId = null; const poiDisplayDuration = 6000;

    // --- Asset Loading Functions ---
    function assetLoaded(assetKey) { assets[assetKey].loaded = true; assetsLoadedCount++; if (assetsLoadedCount === totalAssets && !gameInitialized) { allAssetsLoaded = true; init(); } }
    function assetLoadError(assetKey) { console.error(`Failed to load asset: ${assets[assetKey].src}.`); alert(`Error loading image: ${assets[assetKey].src}\nGame cannot start.`); }
    function loadAssets() { console.log("Starting asset loading..."); for (const key in assets) { if (assets.hasOwnProperty(key) && assets[key].img) { assets[key].img.onload = () => assetLoaded(key); assets[key].img.onerror = () => assetLoadError(key); assets[key].img.src = assets[key].src; } } }

    // --- High Score Handling ---
    function loadHighScore() { try { const savedScore = localStorage.getItem('ritterRunHighScore'); highScore = savedScore ? parseInt(savedScore, 10) : 0; if (isNaN(highScore)) highScore = 0; startHighScoreSpan.textContent = highScore; gameOverHighScoreSpan.textContent = highScore; } catch (e) { console.error("LS Error Load HS:", e); highScore = 0; } }
    function saveHighScore() { if (score > highScore) { highScore = score; try { localStorage.setItem('ritterRunHighScore', highScore.toString()); gameOverHighScoreSpan.textContent = highScore; } catch (e) { console.error("LS Error Save HS:", e); } } }

    // --- Sound Playing Helper (Stub) ---
    function playSound(soundElement) { /* Stubbed out */ }

    // --- Reset Game Variables ---
    function resetGame() { score = 0; obstacles = []; frameCount = 0; gameSpeed = initialGameSpeed; nextSpeedIncreaseScore = speedIncreaseInterval; bgX = 0; currentBackgroundIndex = 0; nextBackgroundSwitchScore = backgroundSwitchScoreInterval; player.y = canvasHeight - player.height - groundHeight; player.dy = 0; player.grounded = true; if (currentScoreSpan) currentScoreSpan.textContent = score; if (poiTimeoutId) clearTimeout(poiTimeoutId); poiOverlay?.classList.remove('visible'); poiOverlay?.style.opacity = 0; /* Ensure visually hidden on reset */ poiOverlay?.style.visibility = 'hidden'; nextPoiIndex = 0; }

    // --- Update Functions ---
    function updatePlayer() { if (!player.grounded) { player.dy += player.gravity; player.y += player.dy; } if (player.y >= canvasHeight - player.height - groundHeight) { player.y = canvasHeight - player.height - groundHeight; player.dy = 0; player.grounded = true; } }

    function updateObstacles() {
        frameCount++; const baseFrequency = 130; const speedFactor = Math.max(1, gameSpeed * 2.5); const spawnFrequency = Math.max(50, baseFrequency - speedFactor);
        if (frameCount % Math.floor(spawnFrequency) === 0) { let newObjectData = null; const spawnPOI = Math.random() < 0.18 && poiData.length > 0 && assets.sign.loaded; if (spawnPOI) { const poi = poiData[nextPoiIndex % poiData.length]; newObjectData = { isPOI: true, poiId: poi.id, passed: false, x: canvasWidth, y: canvasHeight - poiSignDimensions.height - groundHeight, width: poiSignDimensions.width, height: poiSignDimensions.height, assetKey: 'sign' }; nextPoiIndex++; } else { if (regularObstacleTypes.length > 0) { const typeIndex = Math.floor(Math.random() * regularObstacleTypes.length); const type = regularObstacleTypes[typeIndex]; if (assets[type.assetKey] && assets[type.assetKey].loaded) { newObjectData = { isPOI: false, x: canvasWidth, y: canvasHeight - type.height - groundHeight, width: type.width, height: type.height, assetKey: type.assetKey }; } } } if (newObjectData) { obstacles.push(newObjectData); } }
        for (let i = obstacles.length - 1; i >= 0; i--) { const obj = obstacles[i]; obj.x -= gameSpeed; if (obj.isPOI && !obj.passed) { const triggerCondition = obj.x + obj.width < player.x; if (triggerCondition) { console.log(`>>> POI TRIGGER MET for ID: ${obj.poiId}`); displayPOIInfo(obj.poiId); obj.passed = true; score += 50; if (currentScoreSpan) currentScoreSpan.textContent = score; } } if (obj.x + obj.width < -100) { obstacles.splice(i, 1); } }
    } // <-- Brace for updateObstacles

    function checkCollisions() { const playerRect={x:player.x, y:player.y, width:player.width, height:player.height}; for(const obstacle of obstacles){ if(obstacle.isPOI){continue;} const obstacleRect={x:obstacle.x, y:obstacle.y, width:obstacle.width, height:obstacle.height}; if(playerRect.x<obstacleRect.x+obstacleRect.width&&playerRect.x+playerRect.width>obstacleRect.x&&playerRect.y<obstacleRect.y+obstacleRect.height&&playerRect.y+playerRect.height>obstacleRect.y){ console.error(`Collision detected: ${obstacle.assetKey}`); return true;} } return false; }
    function updateScoreAndSpeed() { score++; if (currentScoreSpan) currentScoreSpan.textContent = score; if (score > 0 && score % speedIncreaseInterval === 0 && score >= nextSpeedIncreaseScore) { gameSpeed += 0.3; nextSpeedIncreaseScore += speedIncreaseInterval; } if (score >= nextBackgroundSwitchScore) { currentBackgroundIndex = (currentBackgroundIndex + 1) % numBackgrounds; nextBackgroundSwitchScore += backgroundSwitchScoreInterval; bgX = 0; console.log(`>>> BG switch to index: ${currentBackgroundIndex}`); } }

    // --- Draw Functions ---
    function drawBackground() { const currentBgIndex = currentBackgroundIndex + 1; const currentAssetKey = `background${currentBgIndex}`; const currentAsset = assets[currentAssetKey]; bgX -= gameSpeed; bgX = bgX % canvasWidth; if (bgX > 0) bgX -= canvasWidth; if (currentAsset && currentAsset.loaded) { ctx.drawImage(currentAsset.img, bgX, 0, canvasWidth, canvasHeight); ctx.drawImage(currentAsset.img, bgX + canvasWidth, 0, canvasWidth, canvasHeight); } else { if (assets.background1 && assets.background1.loaded) { ctx.drawImage(assets.background1.img, bgX, 0, canvasWidth, canvasHeight); ctx.drawImage(assets.background1.img, bgX + canvasWidth, 0, canvasWidth, canvasHeight); } else { ctx.fillStyle = '#87CEEB'; ctx.fillRect(0, 0, canvasWidth, canvasHeight); } ctx.fillStyle = '#228B22'; ctx.fillRect(0, canvasHeight - groundHeight, canvasWidth, groundHeight); } }
    function drawPlayer() { if (!assets.knight.loaded) { ctx.fillStyle = 'grey'; ctx.fillRect(player.x, player.y, player.width, player.height); return; } ctx.drawImage(assets.knight.img, player.x, player.y, player.width, player.height); }
    function drawObstacles() { for (const obj of obstacles) { if (assets[obj.assetKey] && assets[obj.assetKey].loaded) { ctx.drawImage(assets[obj.assetKey].img, obj.x, obj.y, obj.width, obj.height); } else { ctx.fillStyle = obj.isPOI ? 'blue' : 'red'; ctx.fillRect(obj.x, obj.y, obj.width, obj.height); } } }

    // --- Display POI Info ---
    function displayPOIInfo(poiId) { console.log(`--- displayPOIInfo called for ID: ${poiId}`); if (!poiOverlay || !poiNameEl || !poiInfoTextEl) { console.error("POI display elements missing!"); return; } const poi = poiData.find(p => p.id === poiId); if (!poi) { console.warn(`POI data not found for ID: ${poiId}`); return; } console.log(`--- Displaying text: ${poi.name}`); poiNameEl.textContent = poi.name; poiInfoTextEl.textContent = poi.info; poiOverlay.classList.add('visible'); // relies on CSS to make it visually appear
        if (poiTimeoutId) { clearTimeout(poiTimeoutId); } poiTimeoutId = setTimeout(() => { poiOverlay.classList.remove('visible'); console.log(`--- Hiding POI ID: ${poiId}`); poiTimeoutId = null; }, poiDisplayDuration); }

    // --- Game Loop ---
    let lastTime = 0; function gameLoop(timestamp) { requestAnimationFrame(gameLoop); const dt=timestamp - lastTime; lastTime=timestamp; ctx.clearRect(0,0,canvasWidth,canvasHeight); drawBackground(); if(currentGameState===GameState.PLAYING){updatePlayer(); updateObstacles(); updateScoreAndSpeed(); drawPlayer(); drawObstacles(); if(checkCollisions()){currentGameState=GameState.GAME_OVER; saveHighScore(); finalScoreSpan.textContent=score; gameOverHighScoreSpan.textContent=highScore; gameOverScreen.classList.remove('hidden'); scoreDisplay.classList.add('hidden'); if(poiTimeoutId)clearTimeout(poiTimeoutId); poiOverlay.classList.remove('visible');}}else{drawPlayer(); if(currentGameState===GameState.GAME_OVER){drawObstacles();}}}

    // --- Game State Changers / Event Handlers ---
    function startGame() { if (currentGameState === GameState.PLAYING || !allAssetsLoaded) return; console.log("Start Game"); resetGame(); currentGameState = GameState.PLAYING; startScreen.classList.add('hidden'); gameOverScreen.classList.add('hidden'); scoreDisplay.classList.remove('hidden'); }
    function restartGame() { if (currentGameState === GameState.PLAYING || !allAssetsLoaded) return; console.log("Restart Game"); resetGame(); currentGameState = GameState.PLAYING; gameOverScreen.classList.add('hidden'); startScreen.classList.add('hidden'); scoreDisplay.classList.remove('hidden'); }
    function handleJumpInput() { if (currentGameState === GameState.PLAYING && player.grounded) { player.dy = player.jumpPower; player.grounded = false; /* playSound(jumpSound); */} }

    // --- Initial Setup (init) ---
    function init() { console.log("init()"); if(gameInitialized)return; gameInitialized=true; loadHighScore(); startScreen.classList.remove('hidden'); gameOverScreen.classList.add('hidden'); scoreDisplay.classList.add('hidden'); poiOverlay?.classList.add('hidden'); player.y=canvasHeight-player.height-groundHeight; console.log("Attaching listeners"); startButton.removeEventListener('click', startGame); restartButton.removeEventListener('click', restartGame); document.removeEventListener('keydown', handleKeyDown); canvas.removeEventListener('touchstart', handleTouchStart); startButton.removeEventListener('touchstart', handleButtonTouchStart); restartButton.removeEventListener('touchstart', handleButtonTouchStart); startButton.addEventListener('click', startGame); restartButton.addEventListener('click', restartGame); document.addEventListener('keydown', handleKeyDown); canvas.addEventListener('touchstart', handleTouchStart,{passive:false}); startButton.addEventListener('touchstart', handleButtonTouchStart,{passive:false}); restartButton.addEventListener('touchstart', handleButtonTouchStart,{passive:false}); console.log("Listeners attached."); requestAnimationFrame(gameLoop);}

    // --- Named Event Handlers ---
    function handleKeyDown(e){if(e.code==='Space'||e.key===' '||e.keyCode===32){e.preventDefault(); if(!allAssetsLoaded)return; if(currentGameState===GameState.PLAYING){handleJumpInput();}else if(currentGameState===GameState.MENU){startGame();}else if(currentGameState===GameState.GAME_OVER){restartGame();}}}
    function handleTouchStart(e){e.preventDefault(); if(!allAssetsLoaded)return; if(currentGameState===GameState.PLAYING){handleJumpInput();}else if(currentGameState===GameState.MENU){startGame();}else if(currentGameState===GameState.GAME_OVER){restartGame();}}}
    function handleButtonTouchStart(e){e.preventDefault(); if(!allAssetsLoaded)return; if(e.target.id==='startButton'&¤tGameState===GameState.MENU){startGame();}else if(e.target.id==='restartButton'&¤tGameState===GameState.GAME_OVER){restartGame();}}}

    // --- Start Loading Assets ---
    document.addEventListener('DOMContentLoaded', () => { console.log("DOM Ready. Loading assets."); loadAssets(); });

})(); // End of IIFE
