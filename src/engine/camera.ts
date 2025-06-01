import { GameObject } from '../objects/objects';
import { Canvas } from '../utils/canvas';

export class Camera {
    private position: { x: number, y: number };
    private target: GameObject | null;
    private zoom: number;
    private canvas: Canvas;
    
    constructor(canvas: Canvas) {
        this.position = { x: 0, y: 0 };
        this.target = null;
        this.zoom = 1.0;
        this.canvas = canvas;
    }
      public setTarget(target: GameObject): void {
        this.target = target;
    }
    
    public getTarget(): GameObject | null {
        return this.target;
    }
    
    public clearTarget(): void {
        this.target = null;
    }
      public setPosition(x: number, y: number): void {
        this.position.x = x;
        this.position.y = y;
    }
    
    public getPosition(): { x: number, y: number } {
        return { x: this.position.x, y: this.position.y };
    }
    
    public setZoom(zoom: number): void {
        // Clamp zoom between 0.1 and 3.0
        this.zoom = Math.max(0.1, Math.min(zoom, 3.0));
    }
    
    public getZoom(): number {
        return this.zoom;
    }
    
    public zoomIn(amount: number = 0.1): void {
        this.setZoom(this.zoom + amount);
    }
    
    public zoomOut(amount: number = 0.1): void {
        this.setZoom(this.zoom - amount);
    }
      public update(): void {
        // If there's a target, follow it
        if (this.target) {
            const targetPos = this.target.getPosition();
            this.position.x = targetPos.x;
            this.position.y = targetPos.y;
        }
    }
      // No longer need to constrain the camera to world boundaries for an infinite world
    
    /**
     * Apply camera transformation to the context before rendering
     * Call this before rendering objects
     */
    public applyTransform(ctx: CanvasRenderingContext2D): void {
        const canvasWidth = this.canvas.getWidth();
        const canvasHeight = this.canvas.getHeight();
        
        // Reset any previous transforms
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        
        // Translate to center of canvas
        ctx.translate(canvasWidth / 2, canvasHeight / 2);
        
        // Apply zoom
        ctx.scale(this.zoom, this.zoom);
        
        // Translate to negative camera position
        ctx.translate(-this.position.x, -this.position.y);
    }
    
    /**
     * Reset the transform
     * Call this after rendering objects
     */
    public resetTransform(ctx: CanvasRenderingContext2D): void {
        ctx.setTransform(1, 0, 0, 1, 0, 0);
    }
    
    /**
     * Convert screen coordinates to world coordinates
     */
    public screenToWorld(screenX: number, screenY: number): { x: number, y: number } {
        const canvasWidth = this.canvas.getWidth();
        const canvasHeight = this.canvas.getHeight();
        
        return {
            x: (screenX - canvasWidth / 2) / this.zoom + this.position.x,
            y: (screenY - canvasHeight / 2) / this.zoom + this.position.y
        };
    }
    
    /**
     * Convert world coordinates to screen coordinates
     */
    public worldToScreen(worldX: number, worldY: number): { x: number, y: number } {
        const canvasWidth = this.canvas.getWidth();
        const canvasHeight = this.canvas.getHeight();
        
        return {
            x: (worldX - this.position.x) * this.zoom + canvasWidth / 2,
            y: (worldY - this.position.y) * this.zoom + canvasHeight / 2
        };
    }
    
    /**
     * Get an array of positions for reflecting an object on screen edges
     * This creates the illusion of a seamless infinite world by allowing objects
     * to appear on opposite edges when they're near the viewport boundaries
     * 
     * @param worldX - World X coordinate of the object
     * @param worldY - World Y coordinate of the object
     * @param objectRadius - Radius or half-width of the object for visibility checking
     * @returns Array of world positions to render the object at
     */
    public getReflectedPositions(worldX: number, worldY: number, objectRadius: number = 0): Array<{x: number, y: number}> {
        const positions: Array<{x: number, y: number}> = [];
        
        // Always include the original position
        positions.push({ x: worldX, y: worldY });
        
        // Get viewport dimensions in world coordinates
        const viewportSize = this.getViewportSize();
        const viewWidth = viewportSize.width;
        const viewHeight = viewportSize.height;
        
        // Check if object is near viewport edges
        const distanceFromLeft = Math.abs((this.position.x - viewWidth/2) - worldX);
        const distanceFromRight = Math.abs((this.position.x + viewWidth/2) - worldX);
        const distanceFromTop = Math.abs((this.position.y - viewHeight/2) - worldY);
        const distanceFromBottom = Math.abs((this.position.y + viewHeight/2) - worldY);
        
        // Thresholds for reflection (object radius + some buffer)
        const threshold = objectRadius + 50;
        
        // Add reflected positions if object is near edges
        // Horizontal reflections
        if (distanceFromLeft < threshold) {
            // Add reflection on right side
            positions.push({ x: worldX + viewWidth, y: worldY });
        }
        if (distanceFromRight < threshold) {
            // Add reflection on left side
            positions.push({ x: worldX - viewWidth, y: worldY });
        }
        
        // Vertical reflections
        if (distanceFromTop < threshold) {
            // Add reflection on bottom side
            positions.push({ x: worldX, y: worldY + viewHeight });
        }
        if (distanceFromBottom < threshold) {
            // Add reflection on top side
            positions.push({ x: worldX, y: worldY - viewHeight });
        }
        
        // Corner reflections
        if (distanceFromLeft < threshold && distanceFromTop < threshold) {
            // Top-left to bottom-right
            positions.push({ x: worldX + viewWidth, y: worldY + viewHeight });
        }
        if (distanceFromRight < threshold && distanceFromTop < threshold) {
            // Top-right to bottom-left
            positions.push({ x: worldX - viewWidth, y: worldY + viewHeight });
        }
        if (distanceFromLeft < threshold && distanceFromBottom < threshold) {
            // Bottom-left to top-right
            positions.push({ x: worldX + viewWidth, y: worldY - viewHeight });
        }
        if (distanceFromRight < threshold && distanceFromBottom < threshold) {
            // Bottom-right to top-left
            positions.push({ x: worldX - viewWidth, y: worldY - viewHeight });
        }
        
        return positions;
    }
    
    /**
     * Get the viewport size in world coordinates
     */
    private getViewportSize(): { width: number; height: number } {
        return {
            width: this.canvas.getWidth() / this.zoom,
            height: this.canvas.getHeight() / this.zoom
        };
    }
}
