import * as Matter from 'matter-js';
import { Color } from '../utils/color';
import { Camera } from './camera';
import { BaseGameObject } from '../objects/objects';

export class Physics {
    private engine: Matter.Engine;
    private world: Matter.World;
    
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
    }
    
    private collisionPoints: { point: Matter.Vector, time: number }[] = [];
    
    /**
     * Set up event handlers to track collisions for debug visualization
     */
    private setupCollisionTracking(): void {
        // Track collisions for debug visualization
        Matter.Events.on(this.engine, 'collisionStart', (event) => {
            if (!BaseGameObject.isDebugMode()) return;
            
            const pairs = event.pairs;
              for (const pair of pairs) {
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
    
    public update(delta: number): void {
        Matter.Engine.update(this.engine, delta);
    }
    
    public addBody(body: Matter.Body): void {
        Matter.Composite.add(this.world, body);
    }
    
    public removeBody(body: Matter.Body): void {
        Matter.Composite.remove(this.world, body);    }
    
    /**
     * Render all physics bodies in the world that are visible in the camera view
     * This is used for debug visualization
     * @param ctx The canvas rendering context
     * @param camera The camera to determine visible bodies
     */
    public renderAllBodies(ctx: CanvasRenderingContext2D, camera: Camera): void {
        // Get all bodies in the world
        const bodies = this.world.bodies;
        
        // Get viewport dimensions
        const viewportSize = {
            width: ctx.canvas.width / camera.getZoom(),
            height: ctx.canvas.height / camera.getZoom()
        };
        
        // Get camera position
        const cameraPos = camera.getPosition();
        
        // Calculate viewport bounds
        const bounds = {
            min: {
                x: cameraPos.x - viewportSize.width / 2,
                y: cameraPos.y - viewportSize.height / 2
            },
            max: {
                x: cameraPos.x + viewportSize.width / 2,
                y: cameraPos.y + viewportSize.height / 2
            }
        };
        
        // Add a buffer to ensure we catch bodies that are partially visible
        const buffer = 100;
        bounds.min.x -= buffer;
        bounds.min.y -= buffer;
        bounds.max.x += buffer;
        bounds.max.y += buffer;
        
        // Find bodies in the viewport using Matter.js Query
        const visibleBodies = Matter.Query.region(bodies, bounds);
          // Group by types for better visualization
        const staticBodies: Matter.Body[] = [];
        const dynamicBodies: Matter.Body[] = [];
        const sensorBodies: Matter.Body[] = [];
        
        // Categorize bodies
        for (const body of visibleBodies) {
            if (body.isSensor) {
                sensorBodies.push(body);
            } else if (body.isStatic) {
                staticBodies.push(body);
            } else {
                dynamicBodies.push(body);
            }
        }
        
        // Clear any existing transformations to ensure proper rendering
        ctx.save();
        
        // Draw static bodies first (background layer)
        this.renderBodiesByType(ctx, staticBodies, Color.DEBUG_STATIC, 2, false);
        
        // Draw sensor bodies (middle layer)
        this.renderBodiesByType(ctx, sensorBodies, Color.DEBUG_SENSOR_BODY, 2, true);
        
        // Draw dynamic bodies last (foreground layer)
        this.renderBodiesByType(ctx, dynamicBodies, Color.DEBUG_DYNAMIC, 3, false);
        
        // Draw velocity vectors for dynamic bodies
        for (const body of dynamicBodies) {
            if (body.speed > 0.1) {
                this.renderVelocityVector(ctx, body);
            }
        }
        
        // Restore context
        ctx.restore();
        
        // Draw world query bounds for debugging
        ctx.strokeStyle = 'rgba(255, 0, 0, 0.2)';
        ctx.lineWidth = 1;
        ctx.setLineDash([5, 5]);
        
        // Check if bounds are properly initialized before using them
        if (bounds && bounds.min && bounds.max) {
            ctx.strokeRect(bounds.min.x, bounds.min.y, bounds.max.x - bounds.min.x, bounds.max.y - bounds.min.y);
        }
        
        ctx.setLineDash([]);        
        // Draw world bounds
        this.renderWorldBounds(ctx);
        
        // Draw recent collision points
        this.renderCollisionPoints(ctx);
    }
    
    /**
     * Render the physics world bounds
     * @param ctx The canvas rendering context
     */
    private renderWorldBounds(ctx: CanvasRenderingContext2D): void {
        // Always ensure world bounds are properly initialized
        if (!this.world.bounds || !this.world.bounds.max || !this.world.bounds.min) {
            // Set default bounds if not defined
            this.world.bounds = {
                min: { x: 0, y: 0 },
                max: { x: 5000, y: 5000 }
            };
            console.warn('World bounds not properly initialized. Using default values: 5000x5000');
        }
        
        // Save context for consistent rendering
        ctx.save();
        
        // Use a try-catch block to handle any potential issues
        try {
            const bounds = this.world.bounds;
            const width = bounds.max.x - bounds.min.x;
            const height = bounds.max.y - bounds.min.y;
            
            // Draw world bounds with a gradient border
            const gradient = ctx.createLinearGradient(
                bounds.min.x, bounds.min.y, 
                bounds.max.x, bounds.max.y
            );
            gradient.addColorStop(0, 'rgba(0, 150, 255, 0.8)');
            gradient.addColorStop(0.5, 'rgba(0, 50, 255, 0.8)');
            gradient.addColorStop(1, 'rgba(0, 150, 255, 0.8)');
            
            ctx.strokeStyle = gradient;
            ctx.lineWidth = 4;
            ctx.setLineDash([15, 10]);
            ctx.strokeRect(
                bounds.min.x, 
                bounds.min.y, 
                width, 
                height
            );
            ctx.setLineDash([]);
            
            // Draw world dimensions
            ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
            ctx.font = 'bold 12px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            
            // Center text showing dimensions
            ctx.fillText(
                `World Size: ${Math.round(width)} x ${Math.round(height)}`,
                bounds.min.x + width / 2,
                bounds.min.y + height / 2
            );
            
            // Min X,Y label
            ctx.font = '11px Arial';
            ctx.fillText(
                `(${Math.round(bounds.min.x)}, ${Math.round(bounds.min.y)})`,
                bounds.min.x + 80, 
                bounds.min.y + 20
            );
            
            // Max X,Y label
            ctx.fillText(
                `(${Math.round(bounds.max.x)}, ${Math.round(bounds.max.y)})`,
                bounds.max.x - 80, 
                bounds.max.y - 20
            );
            
            // Corner markers with enhanced visibility
            const cornerSize = 15;
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
            ctx.lineWidth = 2.5;
            
            // Top-left corner
            ctx.beginPath();
            ctx.moveTo(bounds.min.x, bounds.min.y + cornerSize);
            ctx.lineTo(bounds.min.x, bounds.min.y);
            ctx.lineTo(bounds.min.x + cornerSize, bounds.min.y);
            ctx.stroke();
            
            // Top-right corner
            ctx.beginPath();
            ctx.moveTo(bounds.max.x - cornerSize, bounds.min.y);
            ctx.lineTo(bounds.max.x, bounds.min.y);
            ctx.lineTo(bounds.max.x, bounds.min.y + cornerSize);
            ctx.stroke();
            
            // Bottom-left corner
            ctx.beginPath();
            ctx.moveTo(bounds.min.x, bounds.max.y - cornerSize);
            ctx.lineTo(bounds.min.x, bounds.max.y);
            ctx.lineTo(bounds.min.x + cornerSize, bounds.max.y);
            ctx.stroke();
            
            // Bottom-right corner
            ctx.beginPath();
            ctx.moveTo(bounds.max.x - cornerSize, bounds.max.y);
            ctx.lineTo(bounds.max.x, bounds.max.y);
            ctx.lineTo(bounds.max.x, bounds.max.y - cornerSize);
            ctx.stroke();
        } catch (error) {
            console.error('Error rendering world bounds:', error);
            
            // Draw fallback world bounds in case of error
            ctx.strokeStyle = 'rgba(255, 0, 0, 0.8)';
            ctx.lineWidth = 3;
            ctx.setLineDash([10, 10]);
            ctx.strokeRect(0, 0, 5000, 5000);
            ctx.setLineDash([]);
            
            // Draw error message
            ctx.fillStyle = 'rgba(255, 0, 0, 0.9)';            ctx.font = 'bold 16px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('Error rendering world bounds', 2500, 2500);
        }
        
        // Restore context
        ctx.restore();
    }
    /**
     * Render a specific type of physics bodies
     * @param ctx The canvas rendering context
     * @param bodies The bodies to render
     * @param strokeStyle The stroke style to use
     * @param lineWidth The line width to use
     * @param dashed Whether to use dashed lines
     */
    private renderBodiesByType(
        ctx: CanvasRenderingContext2D, 
        bodies: Matter.Body[],
        strokeStyle: string,
        lineWidth: number,
        dashed: boolean
    ): void {
        // Set common styles
        ctx.strokeStyle = strokeStyle;
        ctx.lineWidth = lineWidth;
        
        if (dashed) {
            ctx.setLineDash([5, 5]);
        } else {
            ctx.setLineDash([]);
        }
        
        // Render each body
        for (const body of bodies) {
            this.renderSingleBody(ctx, body);        }
        
        // Reset dash
        ctx.setLineDash([]);
    }
    /**
     * Render a single physics body with its velocity vector
     * @param ctx The canvas rendering context
     * @param body The physics body to render
     */
    private renderSingleBody(ctx: CanvasRenderingContext2D, body: Matter.Body): void {
        if (!body.vertices || body.vertices.length === 0) return;
        
        // Draw body outline with semi-transparent fill
        ctx.beginPath();
        ctx.moveTo(body.vertices[0].x, body.vertices[0].y);
        
        for (let i = 1; i < body.vertices.length; i++) {
            ctx.lineTo(body.vertices[i].x, body.vertices[i].y);
        }
        
        ctx.closePath();
        
        // Fill with semi-transparent color based on body type
        if (body.isStatic) {
            ctx.fillStyle = 'rgba(128, 128, 128, 0.2)'; // Gray for static bodies
        } else if (body.isSensor) {
            ctx.fillStyle = 'rgba(255, 255, 0, 0.15)'; // Yellow for sensor bodies
        } else {
            ctx.fillStyle = 'rgba(0, 255, 0, 0.2)'; // Green for dynamic bodies
        }
        ctx.fill();
        ctx.stroke();
        
        // Draw vertices as small circles
        for (let i = 0; i < body.vertices.length; i++) {
            ctx.beginPath();
            ctx.arc(body.vertices[i].x, body.vertices[i].y, 3, 0, Math.PI * 2);
            ctx.fillStyle = Color.DEBUG_VERTEX;
            ctx.fill();
        }
        
        // Draw center of mass
        ctx.beginPath();
        ctx.arc(body.position.x, body.position.y, 4, 0, Math.PI * 2);
        ctx.fillStyle = Color.DEBUG_CENTER;
        ctx.fill();
        
        // Draw rotation indicator (forward vector)
        const headingX = body.position.x + Math.cos(body.angle) * 20;
        const headingY = body.position.y + Math.sin(body.angle) * 20;
        
        ctx.beginPath();
        ctx.moveTo(body.position.x, body.position.y);
        ctx.lineTo(headingX, headingY);
        ctx.strokeStyle = Color.DEBUG_ROTATION;
        ctx.lineWidth = 2;
        ctx.stroke();
        
        // Draw arrowhead for rotation
        const arrowSize = 6;
        const angle = body.angle;
        
        ctx.beginPath();
        ctx.moveTo(headingX, headingY);
        ctx.lineTo(
            headingX - arrowSize * Math.cos(angle - Math.PI/6),
            headingY - arrowSize * Math.sin(angle - Math.PI/6)
        );
        ctx.lineTo(
            headingX - arrowSize * Math.cos(angle + Math.PI/6),
            headingY - arrowSize * Math.sin(angle + Math.PI/6)
        );
        ctx.closePath();
        ctx.fillStyle = Color.DEBUG_ROTATION;
        ctx.fill();
        
        // Draw body label if it exists and isn't the default "Body"
        if (body.label && body.label !== 'Body') {
            ctx.fillStyle = 'white';
            ctx.font = '10px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(body.label, body.position.x, body.position.y - 15);
        }
          // Draw velocity vector for dynamic bodies
        if (!body.isStatic) {
            const speed = Math.sqrt(body.velocity.x * body.velocity.x + body.velocity.y * body.velocity.y);
            
            // Only draw if the body is moving
            if (speed > 0.05) {
                const velocityScale = 15; // Increased scale factor to make velocity more visible
                
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
                
                // Draw speed value
                ctx.fillStyle = 'rgba(255, 255, 0, 0.8)';
                ctx.font = '10px Arial';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(
                    speed.toFixed(2), 
                    body.position.x + (body.velocity.x * velocityScale * 0.5),
                    body.position.y + (body.velocity.y * velocityScale * 0.5) - 8
                );
            }
        }
          // Draw physics properties for non-standard bodies
        if (body.friction !== 0.1 || body.restitution !== 0 || body.density !== 0.001) {
            // Draw a background box for better readability
            const boxWidth = 70;
            const boxHeight = (body.friction !== 0.1 ? 10 : 0) + 
                             (body.restitution !== 0 ? 10 : 0) + 
                             (body.density !== 0.001 ? 10 : 0);
            
            if (boxHeight > 0) {
                ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
                ctx.fillRect(body.position.x + 10, body.position.y + 15, boxWidth, boxHeight);
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
                ctx.strokeRect(body.position.x + 10, body.position.y + 15, boxWidth, boxHeight);
            }
            
            ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
            ctx.font = '9px Arial';
            ctx.textAlign = 'left';
            ctx.textBaseline = 'middle';
            
            let yOffset = body.position.y + 20;
            
            if (body.friction !== 0.1) {
                ctx.fillText(`Friction: ${body.friction.toFixed(2)}`, body.position.x + 15, yOffset);
                yOffset += 10;
            }
              if (body.restitution !== 0) {
                ctx.fillText(`Restitution: ${body.restitution.toFixed(2)}`, body.position.x + 15, yOffset);
                yOffset += 10;
            }
            
            if (body.density !== 0.001) {
                ctx.fillText(`Density: ${body.density.toFixed(3)}`, body.position.x + 15, yOffset);
            }
        }
    }
    
    /**
     * Render recent collision points
     * @param ctx The canvas rendering context
     */
    private renderCollisionPoints(ctx: CanvasRenderingContext2D): void {
        const now = Date.now();
        
        // Clean up old collision points first
        this.cleanupCollisionPoints();
        
        // Save context for collision point rendering
        ctx.save();
          // Ensure collision points are drawn on top
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
            ctx.stroke();        }
        
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
        ctx.fillText(`Sensor Bodies: ${sensorCount}`, 20, 100);
        ctx.fillText(`Collision Points: ${this.collisionPoints.length}`, 20, 120);
        
        // Color legend with larger color boxes
        const legendX = 160;
        const boxSize = 12;
        
        // Static bodies color
        ctx.fillStyle = Color.DEBUG_STATIC;
        ctx.fillRect(legendX, 60, boxSize, boxSize);
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 0.5;
        ctx.strokeRect(legendX, 60, boxSize, boxSize);
        
        // Dynamic bodies color
        ctx.fillStyle = Color.DEBUG_DYNAMIC;
        ctx.fillRect(legendX, 80, boxSize, boxSize);
        ctx.strokeRect(legendX, 80, boxSize, boxSize);
        
        // Sensor bodies color
        ctx.fillStyle = Color.DEBUG_SENSOR_BODY;
        ctx.fillRect(legendX, 100, boxSize, boxSize);
        ctx.strokeRect(legendX, 100, boxSize, boxSize);
        
        // Collision points color
        ctx.fillStyle = Color.DEBUG_COLLISION;
        ctx.fillRect(legendX, 120, boxSize, boxSize);
        ctx.strokeRect(legendX, 120, boxSize, boxSize);
        
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
}
