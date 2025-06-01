import { Canvas } from '../utils/canvas';
import { GameObject } from '../objects/objects';
import { Camera } from './camera';
import { WorldGenerator } from './worldGenerator';
import { Color } from '../utils/color';

export class Renderer {
    private canvas: Canvas;
    private gameObjects: GameObject[];
    private camera: Camera | null;
    private worldGenerator: WorldGenerator | null;
    
    constructor(canvas: Canvas) {
        this.canvas = canvas;
        this.gameObjects = [];
        this.camera = null;
        this.worldGenerator = null;
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
    
    public addGameObject(gameObject: GameObject): void {
        this.gameObjects.push(gameObject);
    }
    
    public removeGameObject(gameObject: GameObject): void {
        const index = this.gameObjects.indexOf(gameObject);
        if (index !== -1) {
            this.gameObjects.splice(index, 1);
        }
    }    public render(): void {
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
    }    private renderUI(ctx: CanvasRenderingContext2D): void {
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
}
