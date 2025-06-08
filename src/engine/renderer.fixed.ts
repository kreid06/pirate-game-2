import { Canvas } from '../utils/canvas';
import { GameObject, BaseGameObject } from '../objects/objects';
import { Camera } from './camera';
import { WorldGenerator } from './worldGenerator';
import { Color } from '../utils/color';
import { Physics } from './physics';

export class Renderer {
    private canvas: Canvas;
    private gameObjects: GameObject[];
    private camera: Camera | null;
    private worldGenerator: WorldGenerator | null;
    private physics: Physics | null;
    private showPhysicsWorld: boolean = false; 
    private showDebugHUD: boolean = false; // Flag to toggle debug HUD visibility
    
    constructor(canvas: Canvas) {
        this.canvas = canvas;
        this.gameObjects = [];
        this.camera = null;
        this.worldGenerator = null;
        this.physics = null;
    }
    
    public setCamera(camera: Camera): void {
        this.camera = camera;
    }
    
    public getCamera(): Camera | null {
        return this.camera;
    }
    
    public setWorldGenerator(worldGenerator: WorldGenerator): void {
        this.worldGenerator = worldGenerator;
    }
    
    public getWorldGenerator(): WorldGenerator | null {
        return this.worldGenerator;
    }
    
    public setPhysics(physics: Physics): void {
        this.physics = physics;
    }
    
    public getPhysics(): Physics | null {
        return this.physics;
    }
    
    /**
     * Set whether to show the physics world (separate from debug mode)
     */
    public setShowPhysicsWorld(show: boolean): void {
        this.showPhysicsWorld = show;
        
        // When enabling physics visualization, also disable background animations
        if (this.worldGenerator && show) {
            this.worldGenerator.setAnimationsEnabled(false);
        } else if (this.worldGenerator) {
            this.worldGenerator.setAnimationsEnabled(true);
        }
    }
    
    public isShowingPhysicsWorld(): boolean {
        return this.showPhysicsWorld;
    }
    
    /**
     * Set whether to show the debug HUD
     */
    public setShowDebugHUD(show: boolean): void {
        this.showDebugHUD = show;
    }
    
    /**
     * Check if the debug HUD is visible
     */
    public isShowingDebugHUD(): boolean {
        return this.showDebugHUD;
    }
    
    public addGameObject(gameObject: GameObject): void {
        this.gameObjects.push(gameObject);
    }
    
    public removeGameObject(gameObject: GameObject): void {
        const index = this.gameObjects.indexOf(gameObject);
        if (index !== -1) {
            this.gameObjects.splice(index, 1);
        }
    }
    
    public render(): void {
        const ctx = this.canvas.getContext();
        
        // Clear the canvas
        this.canvas.clear();
        
        // Apply camera transform if available
        if (this.camera) {
            this.camera.applyTransform(ctx);
            
            // Render world with parallax effect if available
            if (this.worldGenerator) {
                this.worldGenerator.render(ctx);
            }
            
            // Render all game objects with reflections for seamless world wrapping
            this.renderGameObjectsWithReflections(ctx);
            
            // Reset camera transform
            this.camera.resetTransform(ctx);
        } else {
            // Render all game objects without camera transform
            for (const gameObject of this.gameObjects) {
                gameObject.render(ctx);
            }
        }
        
        // Render UI elements (not affected by camera)
        this.renderUI(ctx);
        
        // Apply camera transform again for physics rendering to ensure it's on top
        if (this.camera && (BaseGameObject.isDebugMode() || this.showPhysicsWorld) && this.physics) {
            // Save context before applying camera transform
            ctx.save();
            
            // Ensure we're drawing on top of everything with source-over
            ctx.globalCompositeOperation = 'source-over';
            
            this.camera.applyTransform(ctx);
            
            // Render all physics bodies on top layer
            this.physics.renderAllBodies(ctx, this.camera);
            
            // Reset camera transform and restore context
            this.camera.resetTransform(ctx);
            ctx.restore();
        }
        
        // Render physics debug overlay if in debug mode or physics world is visible
        if ((BaseGameObject.isDebugMode() || this.showPhysicsWorld) && this.physics) {
            // Save context state for debug overlay
            ctx.save();
            
            // Use the physics engine's debug overlay
            this.physics.renderDebugOverlay(ctx);
            
            // Draw a small debug panel in the top-left corner
            ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            ctx.fillRect(10, 10, 240, 160);
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
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
            if (this.physics) {
                const totalBodies = this.physics.getWorld().bodies.length;
                let staticCount = 0;
                let dynamicCount = 0;
                let sensorCount = 0;
                
                for (const body of this.physics.getWorld().bodies) {
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
                
                // Get the actual collision points count from the physics engine
                ctx.fillText(`Collision Points: ${this.physics.getCollisionPointsCount()}`, 20, 120);
            }
            
            // Restore context
            ctx.restore();
        }
        
        // Render debug HUD if enabled
        if (this.showDebugHUD || BaseGameObject.isDebugMode() || this.showPhysicsWorld) {
            this.renderDebugHUD(ctx);
        }
    }
    
    /**
     * Renders game objects with reflections at screen edges
     * to create the illusion of a seamless infinite world
     */
    private renderGameObjectsWithReflections(ctx: CanvasRenderingContext2D): void {
        if (!this.camera) return;
        
        for (const gameObject of this.gameObjects) {
            // Get the object's position
            const pos = gameObject.getPosition();
            const radius = this.getObjectRadius(gameObject);
            
            // Get reflection positions
            const reflectionPositions = this.camera.getReflectedPositions(pos.x, pos.y, radius);
            
            // Render the object at each position
            if (reflectionPositions.length > 1) {
                // First position is the original, render it normally
                gameObject.render(ctx);
                
                // For reflections, we need to manually render them
                for (let i = 1; i < reflectionPositions.length; i++) {
                    // Save context
                    ctx.save();
                    
                    // Translate to the reflection position
                    const offsetX = reflectionPositions[i].x - pos.x;
                    const offsetY = reflectionPositions[i].y - pos.y;
                    ctx.translate(offsetX, offsetY);
                    
                    // Render the object
                    gameObject.render(ctx);
                    
                    // Restore context
                    ctx.restore();
                }
            } else {
                // No reflections needed, render normally
                gameObject.render(ctx);
            }
        }
    }
    
    /**
     * Estimates the radius of a game object for reflection calculations
     */
    private getObjectRadius(gameObject: GameObject): number {
        // Use the physics body if available
        const body = gameObject.getBody();
        if (body) {
            if (body.circleRadius) {
                return body.circleRadius;
            } else if (body.bounds) {
                // For rectangular bodies, use half the diagonal
                const width = body.bounds.max.x - body.bounds.min.x;
                const height = body.bounds.max.y - body.bounds.min.y;
                return Math.sqrt(width * width + height * height) / 2;
            }
        }
        
        // Default radius if we can't determine from the body
        return 30; // Reasonable default for most game objects
    }
    
    /**
     * Renders UI elements in screen space (not affected by camera)
     */
    private renderUI(ctx: CanvasRenderingContext2D): void {
        // Render UI elements like score, health bars, etc.
        // This is drawn after resetting the camera transform, so it's in screen space
        
        if (this.camera) {
            ctx.font = '16px Arial';
            ctx.fillStyle = Color.UI_TEXT;
            
            // Get camera target (if any)
            const target = this.camera.getTarget();
            
            // Draw UI background panel - make it taller if we have a target
            const panelHeight = target ? 175 : 100;
            ctx.fillStyle = Color.UI_BACKGROUND;
            ctx.fillRect(5, 5, 180, panelHeight);
            ctx.strokeStyle = Color.UI_HIGHLIGHT;
            ctx.lineWidth = 1;
            ctx.strokeRect(5, 5, 180, panelHeight);
            
            ctx.fillStyle = Color.UI_TEXT;
            
            // Get the camera position for coordinates display
            const cameraPos = this.camera.getPosition();
            
            // Display zoom level
            ctx.fillText(`Zoom: ${this.camera.getZoom().toFixed(2)}x`, 15, 30);
            
            // Display world coordinates
            ctx.fillText(`X: ${Math.round(cameraPos.x)}`, 15, 55);
            ctx.fillText(`Y: ${Math.round(cameraPos.y)}`, 15, 80);
            
            // Display debug mode status
            if (BaseGameObject.isDebugMode()) {
                ctx.fillStyle = Color.UI_HIGHLIGHT;
                ctx.fillText("[DEBUG MODE]", 85, 30);
                ctx.fillStyle = Color.UI_TEXT;
            }
            
            // Display physics world status if enabled
            if (this.showPhysicsWorld) {
                ctx.fillStyle = Color.DEBUG_COLLISION;
                ctx.fillText("[PHYSICS WORLD]", 75, 55);
                ctx.fillStyle = Color.UI_TEXT;
            }
            
            // Display target information if available
            if (target) {
                // Separator line
                ctx.strokeStyle = Color.UI_HIGHLIGHT;
                ctx.beginPath();
                ctx.moveTo(15, 95);
                ctx.lineTo(175, 95);
                ctx.stroke();
                
                // Display target type
                ctx.fillStyle = Color.UI_HIGHLIGHT;
                ctx.fillText("Target:", 15, 115);
                
                // Get target type (class name)
                const targetType = this.getObjectTypeName(target);
                ctx.fillStyle = Color.UI_TEXT;
                ctx.fillText(targetType, 80, 115);
                
                // Display target position
                const targetPos = target.getPosition();
                ctx.fillText(`Pos: (${Math.round(targetPos.x)}, ${Math.round(targetPos.y)})`, 15, 140);
                
                // Display speed if available
                if (target.getSpeed) {
                    const speed = target.getSpeed();
                    ctx.fillText(`Speed: ${speed.toFixed(1)}`, 15, 165);
                }
            }
            
            // Display a small compass for navigation
            this.renderCompass(ctx);
        }
    }
    
    /**
     * Renders a simple compass to help with navigation
     */
    private renderCompass(ctx: CanvasRenderingContext2D): void {
        const compassX = this.canvas.getWidth() - 70;
        const compassY = 70;
        const radius = 30;
        
        // Draw compass background
        ctx.beginPath();
        ctx.arc(compassX, compassY, radius, 0, Math.PI * 2);
        ctx.fillStyle = Color.UI_BACKGROUND;
        ctx.fill();
        ctx.strokeStyle = Color.UI_HIGHLIGHT;
        ctx.lineWidth = 2;
        ctx.stroke();
        
        // Draw compass directional indicators
        // North
        ctx.beginPath();
        ctx.moveTo(compassX, compassY - radius + 10);
        ctx.lineTo(compassX, compassY - 5);
        ctx.strokeStyle = Color.COMPASS_N; // Red for North
        ctx.stroke();
        ctx.fillStyle = Color.COMPASS_N;
        ctx.fillText('N', compassX - 5, compassY - radius + 5);
        
        // East
        ctx.beginPath();
        ctx.moveTo(compassX + radius - 10, compassY);
        ctx.lineTo(compassX + 5, compassY);
        ctx.strokeStyle = Color.COMPASS_DIRECTION;
        ctx.stroke();
        ctx.fillStyle = Color.COMPASS_DIRECTION;
        ctx.fillText('E', compassX + radius - 5, compassY + 5);
        
        // South
        ctx.beginPath();
        ctx.moveTo(compassX, compassY + radius - 10);
        ctx.lineTo(compassX, compassY + 5);
        ctx.strokeStyle = Color.COMPASS_DIRECTION;
        ctx.stroke();
        ctx.fillStyle = Color.COMPASS_DIRECTION;
        ctx.fillText('S', compassX - 5, compassY + radius + 5);
        
        // West
        ctx.beginPath();
        ctx.moveTo(compassX - radius + 10, compassY);
        ctx.lineTo(compassX - 5, compassY);
        ctx.strokeStyle = Color.COMPASS_DIRECTION;
        ctx.stroke();
        ctx.fillStyle = Color.COMPASS_DIRECTION;
        ctx.fillText('W', compassX - radius - 5, compassY + 5);
    }
    
    /**
     * Gets the class name/type of a game object
     */
    private getObjectTypeName(gameObject: GameObject): string {
        // Try to get the constructor name if available
        const constructorName = gameObject.constructor.name;
        if (constructorName && constructorName !== "Object") {
            return constructorName;
        }
        
        // Fall back to checking common game object types
        if (gameObject.getBody()) {
            // Check if it's a circular body (likely a player or enemy)
            const body = gameObject.getBody()!;
            if (body.circleRadius) {
                return "Player"; // Most likely a player if it has a camera target
            } else {
                return "Ship"; // Most likely a ship if it's not circular
            }
        }
        
        // Default
        return "Game Object";
    }
    
    /**
     * Renders a debug HUD with information about debug state
     */
    private renderDebugHUD(ctx: CanvasRenderingContext2D): void {
        // Save context state
        ctx.save();
        
        // Reset any transforms
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        
        const canvasWidth = this.canvas.getWidth();
        
        // Background for debug indicator
        ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        ctx.fillRect(canvasWidth - 220, 10, 210, 120);
        
        // Border
        ctx.strokeStyle = BaseGameObject.isDebugMode() ? 'rgba(0, 255, 0, 0.7)' : 'rgba(255, 0, 0, 0.7)';
        ctx.lineWidth = 2;
        ctx.strokeRect(canvasWidth - 220, 10, 210, 120);
        
        // Title
        ctx.fillStyle = 'yellow';
        ctx.font = 'bold 16px Arial';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillText('Debug Status', canvasWidth - 210, 20);
        
        // Debug mode indicator
        ctx.font = '14px Arial';
        ctx.fillStyle = BaseGameObject.isDebugMode() ? '#00FF00' : '#FF0000';
        ctx.fillText(`Debug Mode: ${BaseGameObject.isDebugMode() ? 'ON' : 'OFF'}`, canvasWidth - 210, 45);
        
        // Physics world indicator
        ctx.fillStyle = this.showPhysicsWorld ? '#00FF00' : '#FF0000';
        ctx.fillText(`Physics World: ${this.showPhysicsWorld ? 'VISIBLE' : 'HIDDEN'}`, canvasWidth - 210, 70);
        
        // Animation status
        const animationsEnabled = this.worldGenerator ? this.worldGenerator.areAnimationsEnabled() : false;
        ctx.fillStyle = animationsEnabled ? '#00FF00' : '#FF0000';
        ctx.fillText(`Animations: ${animationsEnabled ? 'ENABLED' : 'DISABLED'}`, canvasWidth - 210, 95);
        
        // Controls reminder
        ctx.fillStyle = 'white';
        ctx.font = '12px Arial';
        ctx.fillText('L - Toggle Debug | P - Toggle Physics', canvasWidth - 210, 115);
        
        // Restore context state
        ctx.restore();
    }
}
