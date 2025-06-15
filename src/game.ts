import { Canvas } from './utils/canvas';
import { Physics } from './engine/physics';
import { Renderer } from './engine/renderer';
import { Input } from './engine/input';
import { Camera } from './engine/camera';
import { WorldGenerator } from './engine/worldGenerator';
import { IslandGenerator } from './engine/islandGenerator';
import { GameStateManager, GameState } from './engine/gameState';
import { Player } from './objects/player';
import { SoundManager } from './engine/soundManager';
import { BaseGameObject } from './objects/objects';
import { EnemyShip } from './objects/ships/enemyShip';
import { Treasure, TreasureType } from './objects/treasure/treasure';
import { PowerUp, PowerUpType } from './objects/powerup/powerup';
import { EffectManager } from './objects/effects/effectManager';
import { WaterSplash } from './objects/effects/waterSplash';
import { Explosion } from './objects/effects/explosion';
import { Cannons } from './objects/shipModules/cannons';
import * as Matter from 'matter-js';
import { Brigantine } from './objects/ships/brigantine';
import { Ships } from './objects/ships/ships';

export class Game {
    private canvas: Canvas;
    private physics: Physics;
    private renderer: Renderer;
    private input: Input;
    private camera: Camera;
    private worldGenerator: WorldGenerator;    
    private islandGenerator: IslandGenerator;
    private gameState: GameStateManager;
    private soundManager: SoundManager;
    private effectManager: EffectManager;
    private player: Player;
    private ships: Ships[] = []; // Array to hold player and enemy ships
    private enemies: EnemyShip[];
    private enemySpawnTimer: number;
    private enemySpawnInterval: number;
    private lastTime: number;
    private running: boolean;
    private showPhysicsWorld: boolean = false; // Flag to toggle physics world visibility
    
    // Physics logging properties
    private brigantineLogInterval: number = 2.0; // Log every 2 seconds
    private brigantineLogTimer: number = 0;
    private brigantineLoggingEnabled: boolean = true; // Flag to enable/disable physics logging

    constructor() {
        this.canvas = new Canvas('game-canvas');
        this.physics = new Physics();
        this.renderer = new Renderer(this.canvas);
        this.input = new Input();        
        this.soundManager = new SoundManager();
        this.effectManager = new EffectManager();
        
        // Set up interact callback for 'E' key presses
        this.input.setInteractCallback(this.handleInteraction.bind(this));
        
        // Connect the effect manager to the physics engine for collision effects
        this.physics.setEffectManager(this.effectManager);
        
        // Connect the sound manager to the physics engine for collision sounds
        this.physics.setSoundManager(this.soundManager);
        
        // Set sound manager on Cannons class
        Cannons.setSoundManager(this.soundManager);
        
        // Set physics engine on Cannons class
        Cannons.setPhysics(this.physics);
        
        // Create camera with reference to canvas
        this.camera = new Camera(this.canvas);
        
        // Set camera on renderer
        this.renderer.setCamera(this.camera);
        
        // Create world generator
        this.worldGenerator = new WorldGenerator(this.camera, this.canvas);
        
        // Create island generator
        this.islandGenerator = new IslandGenerator(this.camera, this.canvas, this.physics);
        
        // Create game state manager
        this.gameState = new GameStateManager();
        
        // Set world generator on renderer
        this.renderer.setWorldGenerator(this.worldGenerator);
          // Set physics on renderer for debug visualization
        this.renderer.setPhysics(this.physics);
        
        // Enable debug mode and physics visualization by default for development
        BaseGameObject.setDebugMode(true);
        this.renderer.setShowDebugHUD(true);
        this.renderer.setShowPhysicsWorld(true);
        this.showPhysicsWorld = true;
        console.log("Debug mode and physics visualization enabled by default");
          // Create player and brigantine with some distance between them
        const centerX = this.canvas.getWidth() / 2;
        const centerY = this.canvas.getHeight() / 2;
        
        // Place player to the left of center
        const playerOffsetX = -200; // 200 pixels to the left
        this.player = new Player(centerX + playerOffsetX, centerY, 10, this.input);
        
        // Set camera on player and set player as camera target
        this.player.setCamera(this.camera);
        this.camera.setTarget(this.player);
        
        // Add player to physics engine and renderer
        this.physics.addBody(this.player.getBody()!);
        this.renderer.addGameObject(this.player);
        
        // Set a higher z-index for the player so it renders on top of ships when boarded
        this.player.setZIndex(10);
        
        // Initialize enemy-related properties
        this.enemies = [];
        this.enemySpawnTimer = 0;
        this.enemySpawnInterval = 15; // Spawn an enemy every 15 seconds
        
        // Start with a brigantine for testing - place it to the right of center
        this.ships = [];
        const brigantineOffsetX = 200; // 200 pixels to the right
        this.spawnBrigantine(centerX + brigantineOffsetX, centerY);

        this.lastTime = 0;
        this.running = false;
    }
    
    public start(): void {
        this.running = true;
        this.lastTime = performance.now();
        
        // Start background music
        this.soundManager.playMusic('background', true);
        
        requestAnimationFrame(this.gameLoop.bind(this));
    }    private gameLoop(timestamp: number): void {        // Calculate delta time in seconds
        const deltaTime = (timestamp - this.lastTime) / 1000;
        this.lastTime = timestamp;
        
        // Debug test for key inputs - BEFORE updating input state
        if (this.input.wasKeyJustPressed('t')) {
            console.log('TEST KEY (T) WAS JUST PRESSED - Input system is working!');
        }
        
        // Update physics
        this.physics.update(deltaTime * 1000); // Matter.js expects delta in ms
        
        // Update effect manager
        this.effectManager.update(deltaTime);
        
        // Update game objects
        this.update(deltaTime);
        
        // Update input state AFTER all game logic has been processed
        // This ensures any JUST_PRESSED keys can be detected by game logic
        this.input.update();
        
        // Update brigantine physics logging timer if enabled
        if (this.brigantineLoggingEnabled) {
            this.brigantineLogTimer += deltaTime;
            if (this.brigantineLogTimer >= this.brigantineLogInterval) {
                this.logBrigantinePhysicsState();
                this.brigantineLogTimer = 0; // Reset timer
            }
        }
        
        // Finalize input update - make sure toggle keys get reset
        this.input.finalizeUpdate();
        
        // Render game objects
        this.renderer.render();
        
        // Render effects on top
        const ctx = this.canvas.getContext();
        if (ctx) {
            this.effectManager.render(ctx);
        }
        
        // Continue the game loop
        if (this.running) {
            requestAnimationFrame(this.gameLoop.bind(this));
        }
    }    private update(delta: number): void {
        // If game is over, only handle restart input
        if (this.gameState.isGameOver()) {
            if (this.input.wasKeyJustPressed('r')) {
                this.restartGame();
            }
            return;
        }
        
        // Update player
        this.player.update(delta);
        
        // Check if player is dead
        if (this.player.isDead()) {
            this.gameState.setGameOver();
            this.soundManager.playSound('sinking');
            this.soundManager.playMusic('gameover', true);
            
            // Create explosion effect at player position
            const playerPos = this.player.getPosition();
            this.effectManager.createExplosion(playerPos.x, playerPos.y, 80);
            return;
        }
        
        // Update camera
        this.camera.update();
        
        // Update world generator for parallax effect
        this.worldGenerator.update();
        
        // Update island generator
        this.islandGenerator.update();
        
        // Update enemy spawn timer and spawn new enemies
        this.updateEnemies(delta);
        
        // Update all ships to sync their visual coordinates with physics bodies
        for (const ship of this.ships) {
            ship.update(delta);
            
            // If the player is on this ship and it's a Brigantine, update player physics
            if (this.player.isOnBoard() && 
                this.player.getBoardedShip() === ship && 
                ship instanceof Brigantine && 
                this.player.getBody()) {
                
                // Update the player's physics based on the ship's movement
                ship.updateBoardedPlayer(this.player.getBody()!, delta);
            }
        }
        
        // Update ships' ladder highlight states based on player proximity and mouse position
        this.updateLadderHighlights();
        
        // Handle camera zoom controls with keyboard
        if (this.input.isKeyDown('q')) {
            this.camera.zoomOut(0.02); // Zoom out slowly
        }
        if (this.input.isKeyDown('z')) { // Changed from 'e' to 'z' to avoid conflict with boarding
            this.camera.zoomIn(0.02); // Zoom in slowly
        }
          // Handle camera zoom with mouse wheel
        const wheelDelta = this.input.getWheelDelta();
        if (wheelDelta !== 0) {
            // Normalize the wheel delta (it can be quite large)
            const zoomAmount = wheelDelta * 0.0005;
            if (zoomAmount > 0) {
                this.camera.zoomOut(zoomAmount);
            } else {
                this.camera.zoomIn(-zoomAmount);
            }
        }        // Toggle debug mode with L key - now acts like a toggle switch
        if (this.input.wasKeyJustPressed('l')) {
            console.log("L key was just pressed - toggling debug mode");
            const debugEnabled = !BaseGameObject.isDebugMode();
            BaseGameObject.setDebugMode(debugEnabled);
            
            // When enabling debug mode, also enable debug HUD
            this.renderer.setShowDebugHUD(debugEnabled);
            
            // Add visual feedback for key press
            this.effectManager.addGlobalFlash(debugEnabled ? 'rgba(0, 255, 0, 0.3)' : 'rgba(255, 0, 0, 0.3)', 0.5);
            
            console.log(`Debug mode: ${debugEnabled ? 'ON' : 'OFF'}`);
        }
        
        // Toggle physics world visibility with P key - now acts like a toggle switch
        if (this.input.wasKeyJustPressed('p')) {
            console.log("P key was just pressed - toggling physics world");
            this.showPhysicsWorld = !this.showPhysicsWorld;
            this.renderer.setShowPhysicsWorld(this.showPhysicsWorld);
            
            // When enabling physics world, also enable debug HUD
            this.renderer.setShowDebugHUD(this.showPhysicsWorld);
            
            // If physics world is enabled, also enable debug mode
            if (this.showPhysicsWorld && !BaseGameObject.isDebugMode()) {
                BaseGameObject.setDebugMode(true);
                console.log("Debug mode automatically enabled with physics world");
            }
              // Add visual feedback for key press
            this.effectManager.addGlobalFlash(this.showPhysicsWorld ? 'rgba(0, 0, 255, 0.3)' : 'rgba(255, 0, 0, 0.3)', 0.5);
            
            console.log(`Physics world: ${this.showPhysicsWorld ? 'VISIBLE' : 'HIDDEN'}`);
        }
        
        // Toggle mute with M key
        if (this.input.wasKeyJustPressed('m')) {
            this.soundManager.toggleMute();
            console.log(`Sound: ${this.soundManager.isMutedState() ? 'MUTED' : 'UNMUTED'}`);
        }
        
        // Force sync brigantine visual and physics coordinates when pressing 'S'
        if (this.input.wasKeyJustPressed('s')) {
            this.syncBrigantineWithPhysics();
        }
        
        // Check for collisions between cannonballs and ships
        // this.checkProjectileCollisions();
        
        // Check for collisions between player and treasures/power-ups
        this.checkItemCollisions();
        
        // Occasional ambient ocean sounds
        if (Math.random() < 0.002) { // 0.2% chance per frame
            this.soundManager.playSound('wave', 0.3);
        }
          // Spawn an enemy immediately when pressing 'T' (for testing)
        if (this.input.wasKeyJustPressed('t')) {
            this.spawnEnemy();
        }
        
        // Spawn a brigantine near the player for collision testing when pressing 'B'
        if (this.input.wasKeyJustPressed('b')) {
            const playerPos = this.player.getPosition();
            const playerAngle = this.player.getRotation();
            
            // Spawn brigantine 150 units in front of player
            const offsetX = Math.cos(playerAngle) * 150;
            const offsetY = Math.sin(playerAngle) * 150;
            this.spawnBrigantine(playerPos.x + offsetX, playerPos.y + offsetY);
            
            console.log("Spawned brigantine in front of player for collision testing");
            this.effectManager.addGlobalFlash('rgba(0, 100, 255, 0.2)', 0.3);
        }
        
        // Log brigantine physics state at regular intervals
        this.brigantineLogTimer += delta;
        if (this.brigantineLogTimer >= this.brigantineLogInterval) {
            this.logBrigantinePhysicsState();
            this.brigantineLogTimer = 0;
        }
        
        // Test key press handling - checks a test key to verify input handling
        // This is for debugging input handling issues
        if (this.input.wasKeyJustPressed('t')) {
            console.log('=============================================');
            console.log('TEST KEY (T) WAS JUST PRESSED - Input system is working!');
            console.log('=============================================');
        }
        
        // Log E key state for comparison
        if (this.input.wasKeyJustPressed('e')) {
            console.log('E KEY WAS JUST PRESSED - Detected in testKeyPressHandling');
        }
    }
    
    /**
     * Check for collisions between player and treasures/power-ups
     */
    private checkItemCollisions(): void {
        if (!this.player.getBody()) return;
        
        const playerBody = this.player.getBody()!;
        const playerPos = this.player.getPosition();
        
        // Check all islands
        for (const island of this.islandGenerator.getIslands()) {
            // Check treasures
            for (let i = island.treasures.length - 1; i >= 0; i--) {
                const treasure = island.treasures[i];
                if (treasure.isCollected()) continue;
                
                const treasureBody = treasure.getBody();
                if (!treasureBody) continue;
                
                // Check collision
                if (Matter.Bounds.overlaps(playerBody.bounds, treasureBody.bounds)) {
                    // Collect the treasure
                    treasure.collect();
                    
                    // Add score based on treasure type
                    const value = treasure.getValue();
                    this.gameState.addScore(value);
                    
                    // Play sound effect
                    this.soundManager.playSound('coin');
                    
                    // Remove from physics world
                    this.physics.removeBody(treasureBody);
                    
                    // Remove from island's treasures array
                    island.treasures.splice(i, 1);
                    
                    console.log(`Collected treasure worth ${value} points!`);
                }
            }
            
            // Check power-ups
            for (let i = island.powerUps.length - 1; i >= 0; i--) {
                const powerUp = island.powerUps[i];
                if (powerUp.isCollected()) continue;
                
                const powerUpBody = powerUp.getBody();
                if (!powerUpBody) continue;
                
                // Check collision
                if (Matter.Bounds.overlaps(playerBody.bounds, powerUpBody.bounds)) {
                    // Collect the power-up
                    powerUp.collect();
                    
                    // Apply effect based on power-up type
                    switch (powerUp.getType()) {
                        case PowerUpType.HEAL:
                            // Heal the player
                            this.player.heal(50);
                            this.soundManager.playSound('powerup');
                            break;
                    }
                    
                    // Remove from physics world
                    this.physics.removeBody(powerUpBody);
                    
                    // Remove from island's power-ups array
                    island.powerUps.splice(i, 1);
                    
                    console.log(`Collected ${powerUp.getType()} power-up!`);
                }
            }
        }
    }
    
    private updateEnemies(delta: number): void {
        // Update enemy spawn timer
        this.enemySpawnTimer += delta;
        
        // Spawn new enemy if it's time
        if (this.enemySpawnTimer >= this.enemySpawnInterval) {
            this.spawnEnemy();
            this.enemySpawnTimer = 0;
        }
        
        // Update all enemies
        for (let i = this.enemies.length - 1; i >= 0; i--) {
            const enemy = this.enemies[i];
            enemy.update(delta);
            
            // Remove dead enemies
            if (enemy.isDead()) {
                // Remove from physics engine
                this.physics.removeBody(enemy.getBody()!);
                  // Remove from renderer
                this.renderer.removeGameObject(enemy);
                
                // Remove from enemies array
                this.enemies.splice(i, 1);
            }
        }
    }      private spawnBrigantine(spawnX: number, spawnY: number): Brigantine {        // Create a new brigantine enemy ship
        const brigantine: Brigantine = new Brigantine(spawnX, spawnY);
        this.physics.addBody(brigantine.getBody()!);
        this.renderer.addGameObject(brigantine);
        
        // Set the physics engine on the brigantine so modules can be added to the right world
        brigantine.setPhysicsEngine(this.physics);
        
        // Set a lower z-index for ships so the player renders on top when boarded
        brigantine.setZIndex(5);
          // Create the plank bodies for the ship
        try {
            // Call the createPlankBodies method using explicit type assertion
            (brigantine as any).createPlankBodies(this.physics);
            
            // Also create the mast bodies for collision
            (brigantine as any).createMastBodies(this.physics);
        } catch (error) {
            console.error("Error creating ship physics bodies:", error);
        }
        
        this.ships.push(brigantine);
        console.log(`Spawned brigantine at (${Math.round(spawnX)}, ${Math.round(spawnY)})`);
        return brigantine;
    }
    private spawnEnemy(): void {
        // Get player position
        const playerPos = this.player.getPosition();
        
        // Generate a random position that's far enough from the player
        const spawnDistance = 1000 + Math.random() * 500; // Between 1000 and 1500 units away
        const angle = Math.random() * Math.PI * 2; // Random angle
        
        const spawnX = playerPos.x + Math.cos(angle) * spawnDistance;
        const spawnY = playerPos.y + Math.sin(angle) * spawnDistance;
        
        // Create a new enemy ship
        const enemy = new EnemyShip(spawnX, spawnY);
        
        // Set player as its target
        enemy.setTarget(this.player);
          // Add to physics engine
        this.physics.addBody(enemy.getBody()!);
        
        // Add to renderer
        this.renderer.addGameObject(enemy);
        
        // Set a lower z-index for enemy ships, same as player ships
        enemy.setZIndex(5);// Add to enemies array
        this.enemies.push(enemy);
        
        console.log(`Spawned enemy ship at (${Math.round(spawnX)}, ${Math.round(spawnY)})`);
    }
    
    // private checkProjectileCollisions(): void {
    //     // This is a simple collision detection for cannonballs and ships
    //     // In a more complex game, this should be handled by the physics engine's collision events
        
    //     // Get cannonballs from player ship
    //     const player = this.player;
    //     const playerCannonballs = this.getAllCannonballs(player.ship);
        
    //     // Check collisions with enemy ships
    //     for (const enemy of this.enemies) {
    //         const enemyBody = enemy.getBody();
    //         if (!enemyBody) continue;
            
    //         // Check player cannonballs against enemy
    //         for (let i = playerCannonballs.length - 1; i >= 0; i--) {
    //             const cannonball = playerCannonballs[i];
    //             const cannonballBody = cannonball.getBody();
    //             if (!cannonballBody) continue;
                
    //             // Simple collision check (better to use Matter.js collision detection)
    //             if (Matter.Bounds.overlaps(cannonballBody.bounds, enemyBody.bounds)) {
    //                 // Enemy takes damage
    //                 enemy.takeDamage(cannonball.getDamage());
                    
    //                 // Create explosion effect
    //                 const pos = cannonball.getPosition();
    //                 this.effectManager.createExplosion(pos.x, pos.y, 20 + Math.random() * 10);
                    
    //                 // Play explosion sound
    //                 this.soundManager.playSound('explosion', 0.4 + Math.random() * 0.2);
                    
    //                 // Remove the cannonball
    //                 this.physics.removeBody(cannonballBody);
    //                 playerCannonballs.splice(i, 1);
                    
    //                 // Check if enemy was destroyed
    //                 if (enemy.isDead()) {
    //                     // Add score
    //                     this.gameState.addShipDestroyed();
                        
    //                     // Create larger explosion
    //                     const enemyPos = enemy.getPosition();
    //                     this.effectManager.createExplosion(enemyPos.x, enemyPos.y, 60);
                        
    //                     // Play explosion sound (louder)
    //                     this.soundManager.playSound('explosion', 0.7);
    //                 }
    //             }
    //         }
    //     }
        
    //     // Check enemy cannonballs against player
    //     const playerBody = playerShip.getBody();
    //     if (playerBody) {
    //         for (const enemy of this.enemies) {
    //             const enemyCannonballs = this.getAllCannonballs(enemy);
                
    //             for (let i = enemyCannonballs.length - 1; i >= 0; i--) {
    //                 const cannonball = enemyCannonballs[i];
    //                 const cannonballBody = cannonball.getBody();
    //                 if (!cannonballBody) continue;
                    
    //                 // Simple collision check
    //                 if (Matter.Bounds.overlaps(cannonballBody.bounds, playerBody.bounds)) {
    //                     // Player takes damage
    //                     playerShip.takeDamage(cannonball.getDamage());
                        
    //                     // Create explosion effect
    //                     const pos = cannonball.getPosition();
    //                     this.effectManager.createExplosion(pos.x, pos.y, 20 + Math.random() * 10);
                        
    //                     // Play damage sound
    //                     this.soundManager.playSound('damage');
                        
    //                     // Remove the cannonball
    //                     this.physics.removeBody(cannonballBody);
    //                     enemyCannonballs.splice(i, 1);
    //                 }
    //             }
    //         }
    //     }
        
    //     // Check cannonballs hitting water (missed shots)
    //     // Player cannonballs
    //     for (let i = playerCannonballs.length - 1; i >= 0; i--) {
    //         const cannonball = playerCannonballs[i];
    //         const pos = cannonball.getPosition();
            
    //         // If cannonball has traveled too far without hitting anything
    //         if (cannonball.getDistanceTraveled() > 800) {
    //             // Create water splash effect
    //             this.effectManager.createWaterSplash(pos.x, pos.y, 15 + Math.random() * 10);
                
    //             // Play splash sound
    //             this.soundManager.playSound('splash', 0.2 + Math.random() * 0.2);
                
    //             // Remove the cannonball
    //             this.physics.removeBody(cannonball.getBody()!);
    //             playerCannonballs.splice(i, 1);
    //         }
    //     }
        
    //     // Check enemy cannonballs hitting water
    //     for (const enemy of this.enemies) {
    //         const enemyCannonballs = this.getAllCannonballs(enemy);
            
    //         for (let i = enemyCannonballs.length - 1; i >= 0; i--) {
    //             const cannonball = enemyCannonballs[i];
    //             const pos = cannonball.getPosition();
                
    //             // If cannonball has traveled too far without hitting anything
    //             if (cannonball.getDistanceTraveled() > 800) {
    //                 // Create water splash effect
    //                 this.effectManager.createWaterSplash(pos.x, pos.y, 15 + Math.random() * 10);
                    
    //                 // Play splash sound (quieter for enemy misses)
    //                 this.soundManager.playSound('splash', 0.1 + Math.random() * 0.1);
                
    //                 // Remove the cannonball
    //                 this.physics.removeBody(cannonball.getBody()!);
    //                 enemyCannonballs.splice(i, 1);
    //             }
    //         }
    //     }
    // }
    
    // private getAllCannonballs(ship: any): any[] {
    //     // This function extracts all cannonballs from a ship's cannons
    //     // It assumes the ship has cannons with a getCannonballs() method
    //     const cannonballs: any[] = [];
        
    //     // For PlayerShip
    //     if (ship instanceof PlayerShip) {
    //         // Assume PlayerShip has leftCannon and rightCannon properties
    //         if (ship.leftCannon && typeof ship.leftCannon.getCannonballs === 'function') {
    //             cannonballs.push(...ship.leftCannon.getCannonballs());
    //         }
    //         if (ship.rightCannon && typeof ship.rightCannon.getCannonballs === 'function') {
    //             cannonballs.push(...ship.rightCannon.getCannonballs());
    //         }
    //     }
    //     // For EnemyShip
    //     else if (ship instanceof EnemyShip) {
    //         // Assume EnemyShip has leftCannon and rightCannon properties
    //         if (ship.leftCannon && typeof ship.leftCannon.getCannonballs === 'function') {
    //             cannonballs.push(...ship.leftCannon.getCannonballs());
    //         }
    //         if (ship.rightCannon && typeof ship.rightCannon.getCannonballs === 'function') {
    //             cannonballs.push(...ship.rightCannon.getCannonballs());
    //         }
    //     }
        
    //     return cannonballs;
    // }
    
    private restartGame(): void {
        // Reset game state
        this.gameState.resetGame();
        
        // Switch back to background music
        this.soundManager.playMusic('background', true);
          // Reset player
        this.physics.removeBody(this.player.getBody()!);
        this.renderer.removeGameObject(this.player);
        
        const centerX = this.canvas.getWidth() / 2;
        const centerY = this.canvas.getHeight() / 2;
        
        // Place player to the left of center
        const playerOffsetX = -200; // 200 pixels to the left
        this.player = new Player(centerX + playerOffsetX, centerY, 10, this.input);
        
        this.player.setCamera(this.camera);
        this.camera.setTarget(this.player);
        
        this.physics.addBody(this.player.getBody()!);
        this.renderer.addGameObject(this.player);
        
        // Set a higher z-index for the player so it renders on top of ships when boarded
        this.player.setZIndex(10);
        
        // Remove all enemies
        for (const enemy of this.enemies) {
            this.physics.removeBody(enemy.getBody()!);
            this.renderer.removeGameObject(enemy);
        }
        this.enemies = [];
        this.ships = [];
        
        // Place brigantine to the right of center
        const brigantineOffsetX = 200; // 200 pixels to the right
        this.spawnBrigantine(centerX + brigantineOffsetX, centerY); // Add a brigantine for testing
        // Reset enemy spawn timer
        this.enemySpawnTimer = 0;
        
        console.log('Game restarted');
    }
      private renderGameOver(ctx: CanvasRenderingContext2D): void {
        const canvasWidth = this.canvas.getWidth();
        const canvasHeight = this.canvas.getHeight();
        
        // Draw semi-transparent background
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(0, 0, canvasWidth, canvasHeight);
        
        // Draw game over text
        ctx.font = 'bold 48px Arial';
        ctx.fillStyle = '#FF0000';
        ctx.textAlign = 'center';
        ctx.fillText('GAME OVER', canvasWidth / 2, canvasHeight / 2 - 50);
        
        // Draw score
        ctx.font = '24px Arial';
        ctx.fillStyle = '#FFFFFF';
        ctx.fillText(`Score: ${this.gameState.getScore()}`, canvasWidth / 2, canvasHeight / 2);
        ctx.fillText(`Ships Destroyed: ${this.gameState.getShipsDestroyed()}`, canvasWidth / 2, canvasHeight / 2 + 30);
        ctx.fillText(`High Score: ${this.gameState.getHighScore()}`, canvasWidth / 2, canvasHeight / 2 + 60);
        
        // Draw restart instructions
        ctx.font = '18px Arial';
        ctx.fillStyle = '#FFFF00';
        ctx.fillText('Press "R" to restart', canvasWidth / 2, canvasHeight / 2 + 120);
    }

    /**
     * Get input manager - for testing
     */
    public getInput(): Input {
        return this.input;
    }
    
    /**
     * Directly toggle the physics world visibility
     * Used by KeyDebugger for testing
     */
    public togglePhysicsWorld(): void {
        this.showPhysicsWorld = !this.showPhysicsWorld;
        this.renderer.setShowPhysicsWorld(this.showPhysicsWorld);
        
        // When enabling physics world, also enable debug HUD
        this.renderer.setShowDebugHUD(this.showPhysicsWorld);
        
        // If physics world is enabled, also enable debug mode
        if (this.showPhysicsWorld && !BaseGameObject.isDebugMode()) {
            BaseGameObject.setDebugMode(true);
            console.log("Debug mode automatically enabled with physics world");
        }
        
        // Add visual feedback
        this.effectManager.addGlobalFlash(this.showPhysicsWorld ? 'rgba(0, 0, 255, 0.3)' : 'rgba(255, 0, 0, 0.3)', 0.5);
        
        console.log(`Physics world: ${this.showPhysicsWorld ? 'VISIBLE' : 'HIDDEN'}`);
    }
    
    /**
     * Directly toggle debug mode
     * Used by KeyDebugger for testing
     */
    public toggleDebugMode(): void {
        const debugEnabled = !BaseGameObject.isDebugMode();
        BaseGameObject.setDebugMode(debugEnabled);
        
        // When enabling debug mode, also enable debug HUD
        this.renderer.setShowDebugHUD(debugEnabled);
        
        // Add visual feedback
        this.effectManager.addGlobalFlash(debugEnabled ? 'rgba(0, 255, 0, 0.3)' : 'rgba(255, 0, 0, 0.3)', 0.5);
        
        console.log(`Debug mode: ${debugEnabled ? 'ON' : 'OFF'}`);
    }    /**
     * Log the physics state of the brigantine ship
     * Shows both visual coordinates and physics body coordinates
     */
    private logBrigantinePhysicsState(): void {
        if (this.ships.length === 0) {
            console.log("No brigantine ships found to log");
            return;
        }
        
        // Get the first brigantine (we usually only have one)
        const brigantine = this.ships[0];
        const body = brigantine.getBody();
        
        if (!body) {
            console.log("Brigantine physics body not found");
            return;
        }
        
        // Get player information for relative position tracking
        const playerPos = this.player.getPosition();
        const playerBody = this.player.getBody();
        const distanceToPlayer = Math.sqrt(
            Math.pow(playerPos.x - body.position.x, 2) + 
            Math.pow(playerPos.y - body.position.y, 2)
        );
        
        // Get brigantine visual and physics coordinates
        const visualPos = brigantine.getPosition();
        const visualRot = brigantine.getRotation();
        const physicsPos = body.position;
        const physicsRot = body.angle;
        
        // Check for mismatch
        const positionMismatch = Math.sqrt(
            Math.pow(visualPos.x - physicsPos.x, 2) + 
            Math.pow(visualPos.y - physicsPos.y, 2)
        );
        const rotationMismatch = Math.abs(visualRot - physicsRot);
        
        // console.log(`Brigantine Physics State:
        //     Visual Position: (${visualPos.x.toFixed(2)}, ${visualPos.y.toFixed(2)})
        //     Physics Position: (${physicsPos.x.toFixed(2)}, ${physicsPos.y.toFixed(2)})
        //     Position Mismatch: ${positionMismatch.toFixed(4)} pixels
            
        //     Visual Rotation: ${visualRot.toFixed(4)} rad
        //     Physics Rotation: ${physicsRot.toFixed(4)} rad
        //     Rotation Mismatch: ${rotationMismatch.toFixed(6)} rad
            
        //     Distance to Player: ${distanceToPlayer.toFixed(2)} pixels
        //     Velocity: (${body.velocity.x.toFixed(2)}, ${body.velocity.y.toFixed(2)})
        //     Speed: ${body.speed.toFixed(2)} px/s
        //     Angular Velocity: ${body.angularVelocity.toFixed(4)} rad/s
        // `);
        
        // Highlight significant mismatches
        if (positionMismatch > 0.5 || rotationMismatch > 0.01) {
            console.warn(`Significant mismatch detected between visual and physics coordinates!`);
        }
        
        // Calculate if there's a potential collision based on bounds
        let boundsOverlap = false;
        let minDistance = 0;
        
        if (playerBody && playerBody.bounds && body.bounds) {
            boundsOverlap = Matter.Bounds.overlaps(playerBody.bounds, body.bounds);
            
            // Calculate minimum distance between bodies (approximation)
            const centerDist = distanceToPlayer;
            const playerRadius = (playerBody.bounds.max.x - playerBody.bounds.min.x) / 2;
            const brigantineWidth = (body.bounds.max.x - body.bounds.min.x) / 2;
            const brigantineHeight = (body.bounds.max.y - body.bounds.min.y) / 2;
            const brigantineRadius = Math.max(brigantineWidth, brigantineHeight);
            
            // Approximate minimum distance between bodies
            minDistance = centerDist - playerRadius - brigantineRadius;
        }
        
        // // Log physics properties
        // console.log("=== Brigantine Physics State ===");
        // console.log(`Position: (${body.position.x.toFixed(2)}, ${body.position.y.toFixed(2)})`);
        // console.log(`Velocity: (${body.velocity.x.toFixed(2)}, ${body.velocity.y.toFixed(2)})`);
        // console.log(`Speed: ${body.speed.toFixed(2)}`);
        // console.log(`Angle: ${(body.angle * 180 / Math.PI).toFixed(2)}°`);
        // console.log(`Angular Velocity: ${body.angularVelocity.toFixed(4)}`);
        // console.log(`Mass: ${body.mass.toFixed(2)}`);
        // console.log(`Inertia: ${body.inertia.toFixed(2)}`);
        // console.log(`Restitution: ${body.restitution}`);
        // console.log(`Friction: ${body.friction}`);
        // console.log(`Air Friction: ${body.frictionAir}`);
        // console.log(`Category: ${body.collisionFilter.category}`);
        // console.log(`Mask: ${body.collisionFilter.mask}`);
        // console.log(`Group: ${body.collisionFilter.group}`);
        // console.log(`Is Static: ${body.isStatic}`);
        // console.log(`Is Sleeping: ${body.isSleeping}`);
        // console.log(`Is Sensor: ${body.isSensor}`);
        
        // // Log player relationship
        // console.log(`Distance to Player: ${distanceToPlayer.toFixed(2)}`);
        // console.log(`Min Distance (approx): ${minDistance.toFixed(2)}`);
        // console.log(`Bounds Overlap: ${boundsOverlap ? 'YES' : 'NO'}`);
        
        // // Log collision bounds
        // if (body.bounds) {
        //     console.log(`Bounds: min(${body.bounds.min.x.toFixed(2)}, ${body.bounds.min.y.toFixed(2)}), max(${body.bounds.max.x.toFixed(2)}, ${body.bounds.max.y.toFixed(2)})`);
        //     console.log(`Size: width=${(body.bounds.max.x - body.bounds.min.x).toFixed(2)}, height=${(body.bounds.max.y - body.bounds.min.y).toFixed(2)}`);
        // }
        
        // // Log number of vertices and vertex details in the body
        // if (body.vertices) {
        //     console.log(`Vertex Count: ${body.vertices.length}`);
            
        //     // Log first few vertices to help debug complex shapes
        //     if (body.vertices.length > 0 && body.vertices.length < 20) {
        //         console.log("Vertex Positions (local):");
        //         body.vertices.forEach((vertex, index) => {
        //             // Calculate vertex position relative to body center
        //             const relX = vertex.x - body.position.x;
        //             const relY = vertex.y - body.position.y;
        //             console.log(`  V${index}: (${relX.toFixed(2)}, ${relY.toFixed(2)})`);
        //         });
        //     }
        // }
        
        // // Log collision properties from recent collisions if any
        // if (this.physics.hasRecentCollision('player', 'brigantine')) {
        //     console.log("Recent collision detected between player and brigantine!");
        //     const collisionData = this.physics.getLastCollisionData('player', 'brigantine');
        //     if (collisionData) {
        //         console.log(`  Collision Depth: ${collisionData.depth.toFixed(2)}`);
        //         console.log(`  Collision Point: (${collisionData.point.x.toFixed(2)}, ${collisionData.point.y.toFixed(2)})`);
        //         console.log(`  Collision Normal: (${collisionData.normal.x.toFixed(2)}, ${collisionData.normal.y.toFixed(2)})`);
        //         console.log(`  Collision Time: ${new Date(collisionData.time).toISOString()}`);
        //     }
        // }
        
        // console.log("===============================");
    }    /**
     * Spawn a brigantine ship near the player for collision testing
     * This is a public method that can be called directly from the KeyDebugger
     */    public spawnBrigantineNearPlayer(): void {
        const playerPos = this.player.getPosition();
        const playerAngle = this.player.getRotation();
        
        // Spawn brigantine closer to player (120 units) for more immediate collision
        const offsetX = Math.cos(playerAngle) * 120;
        const offsetY = Math.sin(playerAngle) * 120;
        
        // Create brigantine with initial velocity toward player
        const brigantine = this.spawnBrigantine(playerPos.x + offsetX, playerPos.y + offsetY);
        
        // If brigantine has a physics body, give it a small initial velocity toward the player
        if (brigantine) {
            const body = brigantine.getBody();
            // if (body) {
            //     // Calculate velocity towards player
            //     const velocityMagnitude = 2; // Initial speed (reduced for more controlled test)
            //     const velocityX = -Math.cos(playerAngle) * velocityMagnitude;
            //     const velocityY = -Math.sin(playerAngle) * velocityMagnitude;
                
            //     // Set the initial velocity
            //     Matter.Body.setVelocity(body, { x: velocityX, y: velocityY });
                
            //     // Ensure the brigantine is facing the player
            //     const angleToPlayer = Math.atan2(-offsetY, -offsetX);
            //     Matter.Body.setAngle(body, angleToPlayer);
                
            //     // Test collision filtering between player and brigantine
            //     const playerBody = this.player.getBody();
            //     if (playerBody) {
            //         // Check if collision filtering is set up correctly
            //         this.physics.checkCollisionFiltering(playerBody, body);
                    
            //         // Log positions for debugging
            //         console.log(`Player position: (${playerBody.position.x.toFixed(2)}, ${playerBody.position.y.toFixed(2)})`);
            //         console.log(`Brigantine position: (${body.position.x.toFixed(2)}, ${body.position.y.toFixed(2)})`);
            //         console.log(`Distance between bodies: ${
            //             Math.sqrt(
            //                 Math.pow(playerBody.position.x - body.position.x, 2) +
            //                 Math.pow(playerBody.position.y - body.position.y, 2)
            //             ).toFixed(2)
            //         }`);
                    
            //         // Increase size of the physics bodies to make collision more likely
            //         // This is for testing purposes only
            //         console.log("Increasing physics body sizes for more reliable collision detection");
                    
            //         // Slightly increase player's collision radius by scaling
            //         const scaleFactor = 1.2; // 20% larger
            //         const scale = {
            //             x: scaleFactor,
            //             y: scaleFactor
            //         };
                    
            //         // Scale up the player's physics body
            //         Matter.Body.scale(playerBody, scale.x, scale.y);
            //         console.log(`Player body scaled by ${scaleFactor}x`);
                    
            //         // Also check for manual collision
            //         this.physics.manualCollisionCheck();
            //     }
            // }
        }
        
        console.log("Spawned brigantine in front of player for collision testing");
        this.effectManager.addGlobalFlash('rgba(0, 100, 255, 0.2)', 0.3);
        
        // Enable physics world and debug mode to see the collision better
        if (!this.showPhysicsWorld) {
            this.togglePhysicsWorld();
        }
    }
    
    /**
     * Force synchronization of brigantine visual coordinates with physics body
     * This can be called when you suspect there might be a mismatch
     */
    public syncBrigantineWithPhysics(): void {
        if (this.ships.length === 0) {
            console.log("No brigantine ships found to sync");
            return;
        }
        
        // Get the first brigantine (we usually only have one)
        const brigantine = this.ships[0];
        
        // Call the ship's syncWithPhysics method if it's a Brigantine
        if (brigantine instanceof Brigantine) {
            brigantine.syncWithPhysics();
            
            // Add visual feedback for sync
            this.effectManager.addGlobalFlash('rgba(0, 255, 0, 0.2)', 0.3);
            
            console.log("Brigantine coordinates forcibly synchronized with physics body");
        } else {
            console.log("First ship is not a Brigantine instance");
        }
    }    private updateLadderHighlights(): void {
        // If there are no ships or player is already boarded, skip highlighting
        if (this.ships.length === 0) return;
        
        // Get player position
        const playerPos = this.player.getPosition();
        
        // Get mouse position in world coordinates
        const mouseScreenPos = this.input.getMousePosition();
        const mouseWorldPos = this.camera.screenToWorld(mouseScreenPos.x, mouseScreenPos.y);
        
        // Check each brigantine ship
        for (const ship of this.ships) {
            if (ship instanceof Brigantine) {
                // Check if player is close enough to the ladder (simple distance check)
                const playerInLadderArea = ship.isPointInLadderArea(playerPos.x, playerPos.y, 70);
                ship.setPlayerInLadderArea(playerInLadderArea);
                
                // Check if mouse is hovering directly over the ladder (precise check)
                const mouseOverLadder = ship.isPointHoveringLadder(mouseWorldPos.x, mouseWorldPos.y);
                ship.setPlayerHovering(mouseOverLadder);
            }
        }
    }
    
    /**
     * Render boarding UI elements if player is currently boarded
     * Called by the renderer after rendering all game objects
     */
    public renderBoardingUI(ctx: CanvasRenderingContext2D): void {
        // Check if player is currently boarded
        if (!this.player.isOnBoard()) return;
        
        // Get the boarded ship and render its UI
        const boardedShip = this.player.getBoardedShip();
        if (boardedShip && boardedShip instanceof Brigantine) {
            boardedShip.renderBoardedUI(ctx);
        }
    }
    
    /**
     * Handles interaction when the 'E' key is pressed
     * This is called directly by the Input system
     */    private handleInteraction(): void {
        // If game is over, ignore interaction
        if (this.gameState.isGameOver()) return;
        
        // Check if player is already on a ship - if so, handle unboarding, but only if near the ladder
        if (this.player.isOnBoard()) {
            const boardedShip = this.player.getBoardedShip();
            if (boardedShip instanceof Brigantine) {
                const playerPos = this.player.getPosition();
                const mouseWorldPos = this.camera.screenToWorld(
                    this.input.getMousePosition().x, 
                    this.input.getMousePosition().y
                );
                
                // Only allow deboarding if player is at the ladder
                const inLadderArea = boardedShip.isPointInLadderArea(playerPos.x, playerPos.y, 70);
                const isHovering = boardedShip.isPointHoveringLadder(mouseWorldPos.x, mouseWorldPos.y);
                
                if (inLadderArea && isHovering) {
                    console.log('🔑 INTERACT: Player is disembarking from ship at the ladder');
                    this.player.unboardShip();
                } else {
                    console.log('🔑 INTERACT: Cannot disembark - Player must be at the ladder');
                }
            }
            return;
        }
        
        // Otherwise, check for boarding
        this.tryBoardNearestShip();
    }
    
    /**
     * Attempts to board the nearest ship if conditions are met
     */
    private tryBoardNearestShip(): void {
        if (this.ships.length === 0) return;
        
        // Get player position
        const playerPos = this.player.getPosition();
        
        // Get mouse position in world coordinates
        const mouseScreenPos = this.input.getMousePosition();
        const mouseWorldPos = this.camera.screenToWorld(mouseScreenPos.x, mouseScreenPos.y);
        
        // Find the nearest ship with a ladder the player can board
        let playerInLadderArea = false;
        let mouseHoveringLadder = false;
        let nearestShip: Brigantine | null = null;
        
        // Check each brigantine ship
        for (const ship of this.ships) {
            if (ship instanceof Brigantine) {
                // Check if player is close enough to the ladder
                const inLadderArea = ship.isPointInLadderArea(playerPos.x, playerPos.y, 70);
                ship.setPlayerInLadderArea(inLadderArea);
                
                // Check if mouse is hovering over the ladder
                const isHovering = ship.isPointHoveringLadder(mouseWorldPos.x, mouseWorldPos.y);
                ship.setPlayerHovering(isHovering);
                
                if (inLadderArea) {
                    playerInLadderArea = true;
                    nearestShip = ship;
                }
                
                if (isHovering) {
                    mouseHoveringLadder = true;
                }
            }
        }
        
        // If all conditions are met, board the ship
        if (playerInLadderArea && mouseHoveringLadder && nearestShip) {
            console.log('🔑 INTERACT: Boarding conditions met, boarding ship');
            this.player.boardShip(nearestShip);
        } else {
            // Log why boarding failed
            console.log(`🔑 INTERACT: Cannot board - Player near ladder: ${playerInLadderArea ? '✅' : '❌'} | Mouse hovering ladder: ${mouseHoveringLadder ? '✅' : '❌'} | Ship available: ${nearestShip !== null ? '✅' : '❌'}`);
        }
    }
}
