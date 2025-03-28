// --- Draw Game ---
function draw() {
    ctx.clearRect(0, 0, config.canvasWidth, config.canvasHeight);

    // Draw Background
    if (assets.backgroundImage) {
         ctx.drawImage(assets.backgroundImage, 0, 0, config.canvasWidth, config.canvasHeight);
    } else { /* Fallback colors */
         ctx.fillStyle = config.colors.blue; ctx.fillRect(0, 0, config.canvasWidth, config.canvasHeight - config.groundHeight);
         ctx.fillStyle = config.colors.green; ctx.fillRect(0, config.canvasHeight - config.groundHeight, config.canvasWidth, config.groundHeight);
     }

    // Draw Player (With recovery flashing)
    let drawPlayer = true;
    if (game.isRecovering && game.frameCount % config.recoveryFlashRate < Math.floor(config.recoveryFlashRate / 2)) { // Use game.isRecovering, game.frameCount
        drawPlayer = false; // Flash based on frame count and recovery state
    }
    // Use game.playerState
    if (drawPlayer && assets.knightPlaceholder) {
        ctx.drawImage(assets.knightPlaceholder, game.playerState.x, game.playerState.y, game.playerState.width, game.playerState.height);
    } else if (drawPlayer && !assets.knightPlaceholder) { /* Fallback rect */
        ctx.fillStyle = config.colors.black;
        ctx.fillRect(game.playerState.x, game.playerState.y, game.playerState.width, game.playerState.height);
    }

    // Draw Obstacles (Uses game.obstacles)
    game.obstacles.forEach(obstacle => { // <<< Check: Use game.obstacles
        const obstacleImage = assets[obstacle.typeKey];
        if (obstacleImage) {
             ctx.drawImage(obstacleImage, obstacle.x, obstacle.y, obstacle.width, obstacle.height);
        } else { // Fallback
             ctx.fillStyle = config.colors.black;
             ctx.fillRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height);
        }
    });

    // Draw Landmark Signs (Uses game.landmarks)
    if (assets.signImage) {
        game.landmarks.forEach(landmark => { // <<< Check: Use game.landmarks
            if (landmark.worldX < config.canvasWidth && landmark.worldX + landmark.width > 0) {
                ctx.drawImage(assets.signImage, landmark.worldX, landmark.yPos, landmark.width, landmark.height);
            }
        });
    }
}
// --- END Draw Game ---
