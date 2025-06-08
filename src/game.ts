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
import { EffectManager, WaterSplash, Explosion } from './objects/effects/visualEffect';
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
    
    constructor() {
        this.canvas = new Canvas('game-canvas');
        this.physics = new Physics();
        this.renderer = new Renderer(this.canvas);
        this.input = new Input();        this.soundManager = new SoundManager();
        this.effectManager = new EffectManager();
        
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
        
        // Create player in the center of the screen
        const centerX = this.canvas.getWidth() / 2;
        const centerY = this.canvas.getHeight() / 2;
        this.player = new Player(centerX, centerY, 10, this.input);
        
        // Set camera on player and set player as camera target
        this.player.setCamera(this.camera);
        this.camera.setTarget(this.player);
        
        // Add player to physics engine and renderer
        this.physics.addBody(this.player.getBody()!);
        this.renderer.addGameObject(this.player);
        
        // Initialize enemy-related properties
        this.enemies = [];
        this.enemySpawnTimer = 0;
        this.enemySpawnInterval = 15; // Spawn an enemy every 15 seconds
        
        // Start with a brigantine for testing
        this.ships = [];
        this.spawnBrigantine(centerX, centerY);

        this.lastTime = 0;
        this.running = false;
    }
    
    public start(): void {
        this.running = true;
        this.lastTime = performance.now();
        
        // Start background music
        this.soundManager.playMusic('background', true);
        
        requestAnimationFrame(this.gameLoop.bind(this));
    }      private gameLoop(timestamp: number): void {
        // Calculate delta time in seconds
        const deltaTime = (timestamp - this.lastTime) / 1000;
        this.lastTime = timestamp;
        
        // Update input state
        this.input.update();
        
        // Update physics
        this.physics.update(deltaTime * 1000); // Matter.js expects delta in ms
        
        // Update effect manager
        this.effectManager.update(deltaTime);
        
        // Update game objects
        this.update(deltaTime);
        
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
        
        // Handle camera zoom controls with keyboard
        if (this.input.isKeyDown('q')) {
            this.camera.zoomOut(0.02); // Zoom out slowly
        }
        if (this.input.isKeyDown('e')) {
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
    }
    private spawnBrigantine(spawnX: number, spawnY: number): void {
        // Create a new brigantine enemy ship
        const brigantine: Brigantine = new Brigantine(spawnX, spawnY);
        this.physics.addBody(brigantine.getBody()!);
        this.renderer.addGameObject(brigantine);
        this.ships.push(brigantine);
        console.log(`Spawned brigantine at (${Math.round(spawnX)}, ${Math.round(spawnY)})`);
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
        
        // Add to enemies array
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
        this.player = new Player(centerX, centerY, 10, this.input);
        
        this.player.setCamera(this.camera);
        this.camera.setTarget(this.player);
        
        this.physics.addBody(this.player.getBody()!);
        this.renderer.addGameObject(this.player);
        
        // Remove all enemies
        for (const enemy of this.enemies) {
            this.physics.removeBody(enemy.getBody()!);
            this.renderer.removeGameObject(enemy);
        }
        this.enemies = [];
        this.ships = [];
        
        this.spawnBrigantine(centerX, centerY); // Add a new brigantine for testing
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
    }
}
