// filepath: c:\Users\kevin\Documents\Projects\pirate-game-2\src\engine\physics.ts
import * as Matter from 'matter-js';
import { Color, CollisionCategories } from '../utils/color';
import { Camera } from './camera';
import { BaseGameObject } from '../objects/objects';
import { EffectManager } from '../objects/effects/effectManager';
import { SoundManager } from './soundManager';
import { CollisionHelper } from './collisionHelper';

export class Physics {
    private engine: Matter.Engine;
    private world: Matter.World;
    private effectManager: EffectManager | null = null;
    private soundManager: SoundManager | null = null;
    private collisionPoints: { point: Matter.Vector, time: number }[] = [];
    // Keep track of recent collisions between labeled bodies
    private recentCollisions: Map<string, {
        depth: number,
        point: Matter.Vector,
        normal: Matter.Vector,
        time: number
    }> = new Map();
    
    constructor() {
        this.engine = Matter.Engine.create();
        this.world = this.engine.world;
        
        // Configure world for top-down game
        this.world.gravity.y = 0; // No gravity in top-down view
        
        // Initialize world bounds with default values
        this.world.bounds = {
            min: { x: 0, y: 0 },
            max: { x: 5000, y: 5000 }
        };
        
        // Set up collision tracking for debug visualization
        this.setupCollisionTracking();
        
        // Additional collision detection
        Matter.Events.on(this.engine, 'collisionActive', (event) => {
            // Process active collisions
            for (const pair of event.pairs) {
                if ((pair.bodyA.label === 'player' && pair.bodyB.label === 'brigantine') ||
                    (pair.bodyB.label === 'player' && pair.bodyA.label === 'brigantine')) {
                    // Process ongoing collisions between player and brigantine
                    if (BaseGameObject.isDebugMode()) {
                        console.log('Active collision between player and brigantine');
                    }
                    
                    // Determine which body is the player and which is the brigantine
                    const playerBody = pair.bodyA.label === 'player' ? pair.bodyA : pair.bodyB;
                    const brigantineBody = pair.bodyA.label === 'brigantine' ? pair.bodyA : pair.bodyB;
                    
                    // Handle the collision with special physics
                    this.handlePlayerBrigantineCollision(playerBody, brigantineBody, pair);
                }
            }
        });
    }
    
    /**
     * Set up event handlers to track collisions for debug visualization
     */
    private setupCollisionTracking(): void {
        // Track collisions for debug visualization
        Matter.Events.on(this.engine, 'collisionStart', (event) => {
            const pairs = event.pairs;
            
            for (const pair of pairs) {
                // Extract the bodies and labels
                const bodyA = pair.bodyA;
                const bodyB = pair.bodyB;
                
                // Debug output for any collision
                console.log(`Collision detected between ${bodyA.label} and ${bodyB.label}`);
                
                // Always log player-brigantine collisions (not just in debug mode)
                if ((bodyA.label === 'player' && bodyB.label === 'brigantine') ||
                    (bodyB.label === 'player' && bodyA.label === 'brigantine')) {
                    console.log(`Collision detected between player and brigantine ship!`);
                    console.log(`Player collision category: ${bodyA.label === 'player' ? bodyA.collisionFilter.category : bodyB.collisionFilter.category}`);
                    console.log(`Player collision mask: ${bodyA.label === 'player' ? bodyA.collisionFilter.mask : bodyB.collisionFilter.mask}`);
                    console.log(`Brigantine collision category: ${bodyA.label === 'brigantine' ? bodyA.collisionFilter.category : bodyB.collisionFilter.category}`);
                    console.log(`Brigantine collision mask: ${bodyA.label === 'brigantine' ? bodyA.collisionFilter.mask : bodyB.collisionFilter.mask}`);
                    
                    // Calculate collision force for sound volume
                    const force = pair.collision ? 
                        Math.min(1.0, pair.collision.depth * 0.01) : 0.5;
                    
                    // Play collision sound with volume based on impact force
                    if (this.soundManager) {
                        this.soundManager.playSound('collision', 0.3 + (force * 0.5));
                    }
                    
                    // Store collision data for debugging and logging
                    if (pair.collision) {
                        // Determine the collision key based on body labels
                        const key = `${bodyA.label}-${bodyB.label}`;
                        
                        // Get collision point (first support point or approximate from position)
                        const point = (pair.collision.supports && pair.collision.supports.length > 0) ? 
                            pair.collision.supports[0] : 
                            { 
                                x: (bodyA.position.x + bodyB.position.x) / 2, 
                                y: (bodyA.position.y + bodyB.position.y) / 2 
                            };
                        
                        // Store collision data
                        this.recentCollisions.set(key, {
                            depth: pair.collision.depth,
                            point: point,
                            normal: pair.collision.normal,
                            time: Date.now()
                        });
                        
                        // Print more detailed collision info in debug mode
                        if (BaseGameObject.isDebugMode()) {
                            console.log(`  Collision depth: ${pair.collision.depth.toFixed(2)}`);
                            console.log(`  Collision point: (${point.x.toFixed(2)}, ${point.y.toFixed(2)})`);
                            console.log(`  Collision normal: (${pair.collision.normal.x.toFixed(2)}, ${pair.collision.normal.y.toFixed(2)})`);
                        }
                    }
                    
                    // Create collision impact effect if effect manager is available
                    if (this.effectManager && pair.collision && pair.collision.supports && pair.collision.supports.length > 0) {
                        // Get the first collision point for the effect
                        const impact = pair.collision.supports[0];
                        
                        // Size of effect based on collision force
                        const impactSize = 15 + (force * 20);
                        
                        // Create the visual impact effect
                        this.effectManager.createCollisionImpact(impact.x, impact.y, impactSize);
                        
                        // Also add a small global flash for emphasis
                        this.effectManager.addGlobalFlash('rgba(255, 100, 50, 0.2)', 0.3);
                    }
                }
                
                // Store collision points and other debug info when in debug mode
                if (BaseGameObject.isDebugMode()) {
                    // Store collision points with a timestamp
                    const { collision } = pair;
                    
                    // Add each collision point to our array
                    if (collision && collision.supports) {
                        for (const support of collision.supports) {
                            // Validate collision point before adding
                            if (support && typeof support.x === 'number' && typeof support.y === 'number') {
                                this.collisionPoints.push({
                                    point: support,
                                    time: Date.now()
                                });
                            }
                        }
                    }
                }
            }
            
            // Keep only recent collisions (last 2 seconds)
            this.cleanupCollisionPoints();
        });
    }
    
    /**
     * Remove old collision points to prevent memory buildup
     */
    private cleanupCollisionPoints(): void {
        const now = Date.now();
        this.collisionPoints = this.collisionPoints.filter(cp => now - cp.time < 2000);
    }
    
    public getEngine(): Matter.Engine {
        return this.engine;
    }
    
    public getWorld(): Matter.World {
        return this.world;
    }
    
    public setEffectManager(effectManager: EffectManager): void {
        this.effectManager = effectManager;
    }
    
    public setSoundManager(soundManager: SoundManager): void {
        this.soundManager = soundManager;
    }
    
    /**
     * Get the bounds of the physics world
     */
    public getWorldBounds(): Matter.Bounds {
        return this.world.bounds;
    }
    
    /**
     * Set the bounds of the physics world
     */
    public setWorldBounds(bounds: Matter.Bounds): void {
        // Validate bounds before setting
        if (!bounds || !bounds.min || !bounds.max) {
            console.warn('Invalid bounds provided to setWorldBounds. Using default bounds instead.');
            bounds = {
                min: { x: 0, y: 0 },
                max: { x: 5000, y: 5000 }
            };
        }
        this.world.bounds = bounds;
    }
    
    private collisionMonitorTimer: number = 0;
      /**
     * Update the physics world
     * This should be called each frame before rendering
     * @param deltaTime Time since last update in milliseconds
     */
    public update(deltaTime: number): void {
        // Update physics simulation with fixed time step
        Matter.Engine.update(this.engine, deltaTime);
        
        // Clean up old collision points to prevent memory buildup
        this.cleanupCollisionPoints();
          
        // Periodic collision monitoring - reduced frequency to only run when really needed
        this.collisionMonitorTimer += deltaTime;
        if (this.collisionMonitorTimer > 2000) { // Check every 2 seconds instead of every second
            this.collisionMonitorTimer = 0;
            // Only perform manual checks in debug mode or if we haven't had a collision recently
            if (BaseGameObject.isDebugMode() || !this.hasRecentCollision('player', 'brigantine')) {
                this.manualCollisionCheck();
            }
        }
    }
    
    /**
     * Render all physics bodies to the canvas for debugging
     * This should be called after the regular game rendering
     * @param ctx The canvas rendering context
     * @param camera The camera instance for viewport transformations
     */
    public renderAllBodies(ctx: CanvasRenderingContext2D, camera: Camera): void {
        ctx.save();
        
        // Apply camera transformation
        camera.applyTransform(ctx);
        
        // Get all bodies
        const bodies = Matter.Composite.allBodies(this.world);
        
        // Setup rendering options
        ctx.lineWidth = 1;
        ctx.strokeStyle = '#fff';
        ctx.fillStyle = 'rgba(0,255,255,0.2)';
        
        // Draw each body
        for (let i = 0; i < bodies.length; i++) {
            const body = bodies[i];
            
            // Skip rendering if hidden flag is set
            if ((body as any).render && (body as any).render.visible === false) continue;
            
            // Choose debug color based on body properties
            if (body.isSensor) {
                // Sensor bodies in translucent cyan
                ctx.fillStyle = Color.DEBUG_SENSOR_BODY;
                ctx.strokeStyle = Color.DEBUG_OUTLINE;
            } else if (body.isStatic) {
                // Static bodies in translucent gray
                ctx.fillStyle = Color.DEBUG_STATIC;
                ctx.strokeStyle = Color.DEBUG_OUTLINE;
            } else {
                // Dynamic bodies in translucent yellow
                ctx.fillStyle = Color.DEBUG_DYNAMIC;
                ctx.strokeStyle = Color.DEBUG_OUTLINE;
            }
            
            // Special highlight for player body
            if (body.label === 'player') {
                ctx.fillStyle = Color.DEBUG_PHYSICS;
                ctx.strokeStyle = Color.DEBUG_OUTLINE;
            }
              // Special highlight for ship bodies
            if (body.label.includes('ship') || body.label === 'brigantine') {
                ctx.fillStyle = Color.DEBUG_PHYSICS;
                ctx.strokeStyle = Color.DEBUG_OUTLINE;
            }
            
            // Draw the body
            this.drawBody(ctx, body);
            
            // Draw velocity vector for dynamic bodies
            if (!body.isStatic && body.speed > 0.1) {
                this.renderVelocityVector(ctx, body);
            }
            
            // Draw label above the body
            if (body.label) {
                ctx.fillStyle = 'white';
                ctx.font = '10px Arial';
                ctx.textAlign = 'center';
                ctx.fillText(body.label, body.position.x, body.position.y - 15);
            }
        }
        
        // Restore context
        ctx.restore();
        
        // Draw collision points
        this.renderCollisionPoints(ctx, camera);
    }
    
    /**
     * Draw a single physics body for debugging
     * @param ctx The canvas rendering context
     * @param body The physics body to draw
     */    private drawBody(ctx: CanvasRenderingContext2D, body: Matter.Body): void {
        // Set fill color based on body type with higher opacity for better visibility
        if (body.isSensor) {
            ctx.fillStyle = 'rgba(255, 255, 0, 0.4)'; // Yellow for sensors
            ctx.strokeStyle = 'rgba(255, 255, 0, 0.8)';
        } else if (body.isStatic) {
            ctx.fillStyle = 'rgba(128, 128, 128, 0.4)'; // Gray for static bodies
            ctx.strokeStyle = 'rgba(200, 200, 200, 0.8)';
        } else {
            ctx.fillStyle = 'rgba(0, 255, 0, 0.4)'; // Green for dynamic bodies
            ctx.strokeStyle = 'rgba(0, 255, 0, 0.8)';
        }
        
        // Check for collision category-specific colors
        if (body.collisionFilter && body.collisionFilter.category) {
            switch (body.collisionFilter.category) {
                case 0x0001: // PLAYER
                    ctx.fillStyle = 'rgba(255, 0, 255, 0.4)'; // Magenta for player
                    ctx.strokeStyle = 'rgba(255, 0, 255, 0.8)';
                    break;
                case 0x0002: // SHIP
                    ctx.fillStyle = 'rgba(165, 42, 42, 0.4)'; // Brown for ship
                    ctx.strokeStyle = 'rgba(165, 42, 42, 0.8)';
                    break;
                case 0x0080: // DECK_ELEMENT
                    ctx.fillStyle = 'rgba(255, 165, 0, 0.4)'; // Orange for deck elements
                    ctx.strokeStyle = 'rgba(255, 165, 0, 0.8)';
                    break;
                case 0x0100: // MODULE
                    ctx.fillStyle = 'rgba(0, 0, 255, 0.4)'; // Blue for modules
                    ctx.strokeStyle = 'rgba(0, 0, 255, 0.8)';
                    break;
                case 0x0200: // SAIL_FIBER
                    ctx.fillStyle = 'rgba(173, 216, 230, 0.4)'; // Light blue for sail fibers
                    ctx.strokeStyle = 'rgba(173, 216, 230, 0.8)';
                    break;
            }
        }
        
        // Set line width for better visibility
        ctx.lineWidth = 2;

        if (body.parts.length === 1) {
            // Draw a simple body
            const part = body.parts[0];
            ctx.beginPath();
            
            // Draw each vertex
            const vertices = part.vertices;
            ctx.moveTo(vertices[0].x, vertices[0].y);
            for (let j = 1; j < vertices.length; j++) {
                ctx.lineTo(vertices[j].x, vertices[j].y);
            }
            ctx.lineTo(vertices[0].x, vertices[0].y);
            
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
        } else {
            // Draw a compound body
            for (let i = 1; i < body.parts.length; i++) {
                const part = body.parts[i];
                
                ctx.beginPath();
                
                // Draw each vertex
                const vertices = part.vertices;
                ctx.moveTo(vertices[0].x, vertices[0].y);
                for (let j = 1; j < vertices.length; j++) {
                    ctx.lineTo(vertices[j].x, vertices[j].y);
                }
                ctx.lineTo(vertices[0].x, vertices[0].y);
                
                ctx.closePath();
                ctx.fill();
                ctx.stroke();
            }
        }
        
        // Draw center of mass
        ctx.beginPath();
        ctx.arc(body.position.x, body.position.y, 3, 0, 2 * Math.PI);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.fill();
        
        // Draw body label if it exists
        if (body.label && body.label !== 'Body') {
            ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
            ctx.font = '10px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(body.label, body.position.x, body.position.y - 15);
        }
        
        // Draw collision category if it exists
        if (body.collisionFilter && body.collisionFilter.category) {
            ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
            ctx.font = '8px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(`0x${body.collisionFilter.category.toString(16).padStart(4, '0')}`, 
                         body.position.x, body.position.y + 15);
        }
    }
    
    /**
     * Render all collision points for debugging
     * @param ctx The canvas rendering context
     * @param camera The camera instance for viewport transformations
     */
    private renderCollisionPoints(ctx: CanvasRenderingContext2D, camera: Camera): void {
        // Save context
        ctx.save();
        
        // Apply camera transformation
        camera.applyTransform(ctx);
        
        // Current time for fade out effect
        const now = Date.now();
        
        // Enable blend mode for nicer rendering
        ctx.globalCompositeOperation = 'source-over';
        
        // Draw each collision point
        for (const cp of this.collisionPoints) {
            // Skip invalid collision points
            if (!cp || !cp.point) continue;
            
            // Calculate opacity based on age (fade out over 2 seconds)
            const age = now - cp.time;
            const opacity = Math.max(0, 1 - (age / 2000));
            
            // Draw collision point with ripple effect
            const rippleSize = 5 + (age / 100);
            
            // Outer ripple
            ctx.beginPath();
            ctx.arc(cp.point.x, cp.point.y, rippleSize, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(255, 50, 50, ${opacity * 0.8})`;
            ctx.lineWidth = 2;
            ctx.stroke();
            
            // Inner collision point
            ctx.beginPath();
            ctx.arc(cp.point.x, cp.point.y, 3, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(255, 50, 50, ${opacity})`;
            ctx.fill();
            
            // Draw small cross
            ctx.beginPath();
            ctx.moveTo(cp.point.x - 5, cp.point.y);
            ctx.lineTo(cp.point.x + 5, cp.point.y);
            ctx.moveTo(cp.point.x, cp.point.y - 5);
            ctx.lineTo(cp.point.x, cp.point.y + 5);
            ctx.strokeStyle = `rgba(255, 255, 255, ${opacity})`;
            ctx.lineWidth = 1.5;
            ctx.stroke();
        }
        
        // Restore context
        ctx.restore();
    }
    
    /**
     * Render a debug overlay with physics world statistics
     * @param ctx The canvas rendering context
     */
    public renderDebugOverlay(ctx: CanvasRenderingContext2D): void {
        // Save context state
        ctx.save();
        
        // Reset any transforms
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        
        // Background
        ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
        ctx.fillRect(10, 10, 240, 160);
        
        // Border
        ctx.strokeStyle = 'rgba(0, 200, 255, 0.8)';
        ctx.lineWidth = 2;
        ctx.strokeRect(10, 10, 240, 160);
        
        // Title
        ctx.fillStyle = Color.DEBUG_TEXT;
        ctx.font = 'bold 14px Arial';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillText('Physics World Debug', 20, 15);
        
        // Controls info with highlighting
        ctx.fillStyle = 'rgba(255, 255, 0, 0.9)';
        ctx.font = 'bold 11px Arial';
        ctx.fillText('L - Toggle Debug Mode', 20, 135);
        ctx.fillText('P - Toggle Physics Visibility', 20, 150);
        
        // Body counts
        const totalBodies = this.world.bodies.length;
        let staticCount = 0;
        let dynamicCount = 0;
        let sensorCount = 0;
        
        for (const body of this.world.bodies) {
            if (body.isSensor) sensorCount++;
            else if (body.isStatic) staticCount++;
            else dynamicCount++;
        }
        
        // Stats text
        ctx.fillStyle = 'white';
        ctx.font = '12px Arial';
        ctx.fillText(`Total Physics Bodies: ${totalBodies}`, 20, 40);
        ctx.fillText(`Static Bodies: ${staticCount}`, 20, 60);
        ctx.fillText(`Dynamic Bodies: ${dynamicCount}`, 20, 80);
        ctx.fillText(`Sensor Bodies: ${sensorCount}`, 20, 100);        ctx.fillText(`Collision Points: ${this.collisionPoints.length}`, 20, 120);
        
        // Update color legend with collision categories
        const legendX = 160;
        const boxSize = 12;
        
        // Static bodies color
        ctx.fillStyle = 'rgba(128, 128, 128, 0.4)'; // Gray for static bodies
        ctx.fillRect(legendX, 40, boxSize, boxSize);
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 0.5;
        ctx.strokeRect(legendX, 40, boxSize, boxSize);
        
        // Dynamic bodies color
        ctx.fillStyle = 'rgba(0, 255, 0, 0.4)'; // Green for dynamic bodies
        ctx.fillRect(legendX, 60, boxSize, boxSize);
        ctx.strokeRect(legendX, 60, boxSize, boxSize);
        
        // Sensor bodies color
        ctx.fillStyle = 'rgba(255, 255, 0, 0.4)'; // Yellow for sensors
        ctx.fillRect(legendX, 80, boxSize, boxSize);
        ctx.strokeRect(legendX, 80, boxSize, boxSize);
        
        // Player category
        ctx.fillStyle = 'rgba(255, 0, 255, 0.4)'; // Magenta for player
        ctx.fillRect(legendX, 100, boxSize, boxSize);
        ctx.strokeRect(legendX, 100, boxSize, boxSize);
        
        // Ship category
        ctx.fillStyle = 'rgba(165, 42, 42, 0.4)'; // Brown for ship
        ctx.fillRect(legendX, 120, boxSize, boxSize);
        ctx.strokeRect(legendX, 120, boxSize, boxSize);
        
        // Deck element category
        ctx.fillStyle = 'rgba(255, 165, 0, 0.4)'; // Orange for deck elements
        ctx.fillRect(legendX, 140, boxSize, boxSize);
        ctx.strokeRect(legendX, 140, boxSize, boxSize);
        
        // Module category
        ctx.fillStyle = 'rgba(0, 0, 255, 0.4)'; // Blue for modules
        ctx.fillRect(legendX + 60, 40, boxSize, boxSize);
        ctx.strokeRect(legendX + 60, 40, boxSize, boxSize);
        
        // Sail fiber category
        ctx.fillStyle = 'rgba(173, 216, 230, 0.4)'; // Light blue for sail fibers
        ctx.fillRect(legendX + 60, 60, boxSize, boxSize);
        ctx.strokeRect(legendX + 60, 60, boxSize, boxSize);
        
        // Collision points color
        ctx.fillStyle = 'rgba(255, 0, 0, 0.4)';
        ctx.fillRect(legendX + 60, 80, boxSize, boxSize);
        ctx.strokeRect(legendX + 60, 80, boxSize, boxSize);
        
        // Add labels
        ctx.fillStyle = 'white';
        ctx.font = '10px Arial';
        ctx.textAlign = 'left';
        ctx.fillText('Static', legendX + boxSize + 5, 50);
        ctx.fillText('Dynamic', legendX + boxSize + 5, 70);
        ctx.fillText('Sensor', legendX + boxSize + 5, 90);
        ctx.fillText('Player', legendX + boxSize + 5, 110);
        ctx.fillText('Ship', legendX + boxSize + 5, 130);
        ctx.fillText('Deck', legendX + boxSize + 5, 150);
        
        ctx.fillText('Module', legendX + boxSize + 65, 50);
        ctx.fillText('Sail Fiber', legendX + boxSize + 65, 70);
        ctx.fillText('Collision', legendX + boxSize + 65, 90);
        
        ctx.fillStyle = 'white';
        ctx.font = '11px Arial';
        ctx.textAlign = 'left';
        ctx.fillText('Static', legendX + boxSize + 5, 68);
        ctx.fillText('Dynamic', legendX + boxSize + 5, 88);
        ctx.fillText('Sensor', legendX + boxSize + 5, 108);
        ctx.fillText('Collision', legendX + boxSize + 5, 128);
        
        // Restore context state
        ctx.restore();
    }
    
    /**
     * Render velocity vector for a physics body
     * @param ctx The canvas rendering context
     * @param body The body to render velocity for
     */
    private renderVelocityVector(ctx: CanvasRenderingContext2D, body: Matter.Body): void {
        if (body.speed < 0.1) return; // Don't render if barely moving
        
        const velocityScale = 15; // Scale factor to make velocity visible
        
        // Draw velocity line
        ctx.beginPath();
        ctx.moveTo(body.position.x, body.position.y);
        ctx.lineTo(
            body.position.x + body.velocity.x * velocityScale,
            body.position.y + body.velocity.y * velocityScale
        );
        ctx.strokeStyle = Color.DEBUG_VELOCITY;
        ctx.lineWidth = 2;
        ctx.stroke();
        
        // Draw arrowhead
        const angle = Math.atan2(body.velocity.y, body.velocity.x);
        const arrowSize = 8;
        const endX = body.position.x + body.velocity.x * velocityScale;
        const endY = body.position.y + body.velocity.y * velocityScale;
        
        ctx.beginPath();
        ctx.moveTo(endX, endY);
        ctx.lineTo(
            endX - arrowSize * Math.cos(angle - Math.PI / 6),
            endY - arrowSize * Math.sin(angle - Math.PI / 6)
        );
        ctx.lineTo(
            endX - arrowSize * Math.cos(angle + Math.PI / 6),
            endY - arrowSize * Math.sin(angle + Math.PI / 6)
        );
        ctx.closePath();
        ctx.fillStyle = Color.DEBUG_VELOCITY;
        ctx.fill();
        
        // Draw speed text
        ctx.fillStyle = 'white';
        ctx.font = '10px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(
            `${body.speed.toFixed(1)}`,
            body.position.x + (body.velocity.x * velocityScale * 0.5),
            body.position.y + (body.velocity.y * velocityScale * 0.5) - 8
        );
    }
    
    /**
     * Get the current collision points count
     * Used for debug visualization
     */
    public getCollisionPointsCount(): number {
        return this.collisionPoints.length;
    }
    
    /**
     * Check if there was a recent collision between objects with the given labels
     * @param label1 First object's label
     * @param label2 Second object's label
     * @returns True if there was a collision within the last 2 seconds
     */
    public hasRecentCollision(label1: string, label2: string): boolean {
        const key1 = `${label1}-${label2}`;
        const key2 = `${label2}-${label1}`;
        
        const collision1 = this.recentCollisions.get(key1);
        const collision2 = this.recentCollisions.get(key2);
        
        if (collision1) {
            // Check if collision is recent (within the last 2 seconds)
            return (Date.now() - collision1.time) < 2000;
        }
        
        if (collision2) {
            // Check if collision is recent (within the last 2 seconds)
            return (Date.now() - collision2.time) < 2000;
        }
        
        return false;
    }
    
    /**
     * Get the most recent collision data between objects with the given labels
     * @param label1 First object's label
     * @param label2 Second object's label
     * @returns Collision data or null if no recent collision
     */
    public getLastCollisionData(label1: string, label2: string): {
        depth: number,
        point: Matter.Vector,
        normal: Matter.Vector,
        time: number
    } | null {
        const key1 = `${label1}-${label2}`;
        const key2 = `${label2}-${label1}`;
        
        const collision1 = this.recentCollisions.get(key1);
        const collision2 = this.recentCollisions.get(key2);
        
        // Return the most recent collision
        if (collision1 && collision2) {
            return collision1.time > collision2.time ? collision1 : collision2;
        }
        
        return collision1 || collision2 || null;
    }
    
    /**
     * Check collision between player and brigantine ship
     * This method provides special handling for player-brigantine collisions
     * It runs in the active collision event for continuous monitoring
     * 
     * @param playerBody The player's physics body
     * @param brigantineBody The brigantine's physics body
     * @param pair The collision pair from Matter.js
     */
    public handlePlayerBrigantineCollision(playerBody: Matter.Body, brigantineBody: Matter.Body, pair: Matter.Pair): void {
        if (!playerBody || !brigantineBody || !pair.collision) {
            console.log("Missing required collision data!");
            return;
        }

        // Log basic collision information
        if (BaseGameObject.isDebugMode()) {
            console.log(`Player-Brigantine collision handling:
                Player position: (${playerBody.position.x.toFixed(2)}, ${playerBody.position.y.toFixed(2)})
                Brigantine position: (${brigantineBody.position.x.toFixed(2)}, ${brigantineBody.position.y.toFixed(2)})
                Collision depth: ${pair.collision.depth.toFixed(4)}
                Collision normal: (${pair.collision.normal.x.toFixed(4)}, ${pair.collision.normal.y.toFixed(4)})
            `);
        }

        // Only visual and audio feedback, no extra forces/impulses
        const force = Math.min(1.0, Math.pow(pair.collision.depth * 0.02, 0.75));
        if (force > 0.3) {
            // Get collision point
            const collisionPoint = pair.collision.supports && pair.collision.supports.length > 0 ? 
                pair.collision.supports[0] : playerBody.position;
            // Size of effect based on collision force
            const impactSize = 15 + (force * 30);
            // Create visual impact effect
            if (this.effectManager) {
                this.effectManager.createCollisionImpact(collisionPoint.x, collisionPoint.y, impactSize);
                // Add global flash for emphasis on strong collisions
                if (force > 0.7) {
                    this.effectManager.addGlobalFlash('rgba(255, 100, 50, 0.25)', 0.4);
                }
            }
            // Play collision sound with volume based on impact force
            if (this.soundManager) {
                this.soundManager.playSound('collision', 0.3 + (force * 0.5));
            }
        }
        // Debug info
        if (BaseGameObject.isDebugMode()) {
            console.log(`Collision response handled by Matter.js. No extra forces applied.`);
        }
    }
    
    /**
     * Add a physics body to the world
     * @param body The physics body to add
     */
    public addBody(body: Matter.Body): void {
        if (!body) {
            console.warn('Attempted to add a null or undefined body to the physics world');
            return;
        }
        
        // Add the body to the world
        Matter.World.add(this.world, body);
        
        // Debug output
        if (BaseGameObject.isDebugMode()) {
            console.log(`Added body to physics world: ${body.label || 'unnamed body'}`);
        }
    }
    
    /**
     * Remove a physics body from the world
     * @param body The physics body to remove
     */
    public removeBody(body: Matter.Body): void {
        if (!body) {
            console.warn('Attempted to remove a null or undefined body from the physics world');
            return;
        }
        
        // Remove the body from the world
        Matter.World.remove(this.world, body);
        
        // Debug output
        if (BaseGameObject.isDebugMode()) {
            console.log(`Removed body from physics world: ${body.label || 'unnamed body'}`);
        }
    }
    
    /**
     * Check if the collision filtering between two bodies would allow them to collide
     * This is useful for debugging collision issues
     */
    public checkCollisionFiltering(bodyA: Matter.Body, bodyB: Matter.Body): boolean {
        // Get collision filters
        const filterA = bodyA.collisionFilter;
        const filterB = bodyB.collisionFilter;
        
        // Check if categories and masks allow collision
        const categoryA = filterA.category || 0x0001; // Default category
        const maskA = filterA.mask || 0xFFFFFFFF; // Default mask (collide with all)
        const categoryB = filterB.category || 0x0001;
        const maskB = filterB.mask || 0xFFFFFFFF;
        
        const canCollideAtoB = (categoryA & maskB) !== 0;
        const canCollideBtoA = (categoryB & maskA) !== 0;
        
        // Both conditions must be true for collision to occur
        const canCollide = canCollideAtoB && canCollideBtoA;
        
        // Log details
        console.log(`Collision check between ${bodyA.label} and ${bodyB.label}:`);
        console.log(`  ${bodyA.label} category: ${categoryA}, mask: ${maskA}`);
        console.log(`  ${bodyB.label} category: ${categoryB}, mask: ${maskB}`);
        console.log(`  ${bodyA.label} can collide with ${bodyB.label}: ${canCollideAtoB}`);
        console.log(`  ${bodyB.label} can collide with ${bodyA.label}: ${canCollideBtoA}`);
        console.log(`  Overall collision possible: ${canCollide}`);
        
        return canCollide;
    }
      /**
     * Check for a simple distance-based collision between a player and a ship
     * This is a backup detection method that doesn't depend on the physics engine
     */
    public manualCollisionCheck(): void {
        // Find player and brigantine bodies
        let playerBody: Matter.Body | null = null;
        let brigantineBody: Matter.Body | null = null;
        
        // Loop through all bodies in the physics world
        const bodies = Matter.Composite.allBodies(this.world);
        for (const body of bodies) {
            if (body.label === 'player') {
                playerBody = body;
            } else if (body.label === 'brigantine') {
                brigantineBody = body;
            }
        }
        
        // If we found both bodies, check for collision
        if (playerBody && brigantineBody) {
            console.log("Manual collision check: Found player and brigantine bodies");
            
            // Verify collision filtering is correct before attempting collision detection            // Verify collision filtering is correct before attempting collision detection
            const canCollide = this.checkCollisionFiltering(playerBody, brigantineBody);
            
            if (canCollide) {
                // Calculate distance between the bodies
                const dx = playerBody.position.x - brigantineBody.position.x;
                const dy = playerBody.position.y - brigantineBody.position.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                // Get player radius (assuming circular body)
                const playerRadius = (playerBody.bounds.max.x - playerBody.bounds.min.x) / 2;
                
                // Get brigantine dimensions
                const brigantineWidth = (brigantineBody.bounds.max.x - brigantineBody.bounds.min.x) / 2;
                const brigantineHeight = (brigantineBody.bounds.max.y - brigantineBody.bounds.min.y) / 2;                const brigantineSize = Math.max(brigantineWidth, brigantineHeight);
                
                // Combined collision threshold with a small buffer for more reliable detection
                const collisionThreshold = (playerRadius + brigantineSize) * 1.02; // Reduced buffer as ship body is now larger
            // Check if they should be colliding based on proximity
                if (distance < collisionThreshold) {
                    console.log("Manual collision check: Objects are close enough to collide");
                    
                    // Let Matter.js handle collision detection and response
                    // The collision response is handled entirely in handlePlayerBrigantineCollision
                    // if the physics engine detects the collision
                }
            } else {
                console.log("Collision filtering prevents collision between player and brigantine");
            }
        } else {
            console.log("Could not find player or brigantine bodies for manual collision check.");
        }
    }
}
