import * as Matter from 'matter-js';
import { Color } from '../utils/color';

export interface GameObject {
    update(delta: number): void;
    render(ctx: CanvasRenderingContext2D): void;
    getBody(): Matter.Body | null;
    getPosition(): { x: number, y: number };
    getRotation(): number;
    getZIndex(): number; // Added method to get rendering order
    setZIndex(zIndex: number): void; // Added method to set rendering order
    getSpeed?(): number;  // Optional method to get object speed
    getVelocity?(): { x: number, y: number };  // Optional method to get velocity vector
    renderDebug?(ctx: CanvasRenderingContext2D): void; // Debug rendering for physics bodies
}

export abstract class BaseGameObject implements GameObject {
    protected position: { x: number, y: number };
    protected rotation: number;
    protected body: Matter.Body | null;
    protected static debugMode: boolean = false; // Global debug mode flag
    protected zIndex: number = 0; // Default z-index for rendering order
    
    constructor(x: number, y: number) {
        this.position = { x, y };
        this.rotation = 0;
        this.body = null;
    }
    
    public update(delta: number): void {
        // Update position and rotation from physics body if it exists
        if (this.body) {
            this.position.x = this.body.position.x;
            this.position.y = this.body.position.y;
            this.rotation = this.body.angle;
        }
    }
    
    public abstract render(ctx: CanvasRenderingContext2D): void;
    
    /**
     * Create a physics body for this game object
     * This method should be overridden by derived classes
     */
    protected createPhysicsBody(): void {
        // To be implemented by derived classes
    }
    
    /**
     * Reset the physics body for this game object
     * Useful when the object's properties change
     */
    public resetPhysicsBody(): void {
        // Remove the old body if it exists
        if (this.body) {
            this.body = null;
        }
        
        // Create a new physics body
        this.createPhysicsBody();
    }
    
    public getBody(): Matter.Body | null {
        return this.body;
    }
    
    public getPosition(): { x: number, y: number } {
        return this.position;
    }
    
    public getRotation(): number {
        return this.rotation;
    }
    
    public getSpeed(): number {
        if (!this.body) return 0;
        
        const velocity = this.body.velocity;
        return Math.sqrt(velocity.x * velocity.x + velocity.y * velocity.y);
    }
    
    public getVelocity(): { x: number, y: number } {
        if (!this.body) return { x: 0, y: 0 };
        return { x: this.body.velocity.x, y: this.body.velocity.y };
    }
    
    public getZIndex(): number {
        return this.zIndex;
    }
    
    public setZIndex(zIndex: number): void {
        this.zIndex = zIndex;
    }
    
    /**
     * Toggles debug rendering mode for all game objects
     */
    public static setDebugMode(enabled: boolean): void {
        BaseGameObject.debugMode = enabled;
    }
    
    /**
     * Returns the current debug mode state
     */
    public static isDebugMode(): boolean {
        return BaseGameObject.debugMode;
    }
      /**
     * Render debug visualization for physics bodies
     * This is a base implementation that should be called by derived classes
     */    public renderDebug(ctx: CanvasRenderingContext2D): void {
        if (!BaseGameObject.debugMode || !this.body) return;
        
        // Draw object bounds
        const bounds = this.body.bounds;
        const width = bounds.max.x - bounds.min.x;
        const height = bounds.max.y - bounds.min.y;
        
        ctx.strokeStyle = 'rgba(100, 200, 255, 0.4)';
        ctx.setLineDash([4, 2]);
        ctx.lineWidth = 1;
        ctx.strokeRect(bounds.min.x, bounds.min.y, width, height);
        ctx.setLineDash([]);
        
        // Draw velocity vector
        const velocityScale = 15; // Increased scale factor to make velocity visible
        const speed = Math.sqrt(
            this.body.velocity.x * this.body.velocity.x + 
            this.body.velocity.y * this.body.velocity.y
        );
        
        // Only draw if the body is moving
        if (speed > 0.05) {
            ctx.beginPath();
            ctx.moveTo(this.position.x, this.position.y);
            ctx.lineTo(
                this.position.x + this.body.velocity.x * velocityScale,
                this.position.y + this.body.velocity.y * velocityScale
            );
            ctx.strokeStyle = Color.DEBUG_VELOCITY;
            ctx.lineWidth = 2;
            ctx.stroke();
            
            // Draw arrowhead
            const angle = Math.atan2(this.body.velocity.y, this.body.velocity.x);
            const arrowSize = 8;
            const endX = this.position.x + this.body.velocity.x * velocityScale;
            const endY = this.position.y + this.body.velocity.y * velocityScale;
            
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
            ctx.fillStyle = 'white';
            ctx.font = '10px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(
                `${speed.toFixed(1)} px/s`,
                this.position.x + (this.body.velocity.x * velocityScale * 0.5),
                this.position.y + (this.body.velocity.y * velocityScale * 0.5) - 8
            );
        }
        
        // Draw center point
        ctx.beginPath();
        ctx.arc(this.position.x, this.position.y, 3, 0, Math.PI * 2);
        ctx.fillStyle = Color.DEBUG_CENTER;
        ctx.fill();
        
        // Draw object type and ID
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.font = '10px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.fillText(
            this.constructor.name,
            this.position.x,
            this.position.y - 10
        );
        
        // Each derived class should implement specific physics body visualization
        this.renderPhysicsBody(ctx);
    }
      /**
     * Render the specific physics body shape
     * This should be implemented by derived classes based on their specific body type
     */
    protected renderPhysicsBody(ctx: CanvasRenderingContext2D): void {
        // Base implementation - can be overridden by derived classes
        if (!this.body) return;
        
        // Default implementation for when specific rendering is not provided
        // Just draws the bounding box
        const bounds = this.body.bounds;
        ctx.strokeStyle = Color.DEBUG_PHYSICS;
        ctx.lineWidth = 1;
        ctx.strokeRect(
            bounds.min.x,
            bounds.min.y,
            bounds.max.x - bounds.min.x,
            bounds.max.y - bounds.min.y
        );
    }
}
