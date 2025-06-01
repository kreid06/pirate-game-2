import * as Matter from 'matter-js';

export interface GameObject {
    update(delta: number): void;
    render(ctx: CanvasRenderingContext2D): void;
    getBody(): Matter.Body | null;
    getPosition(): { x: number, y: number };
    getRotation(): number;
    getSpeed?(): number;  // Optional method to get object speed
    getVelocity?(): { x: number, y: number };  // Optional method to get velocity vector
}

export abstract class BaseGameObject implements GameObject {
    protected position: { x: number, y: number };
    protected rotation: number;
    protected body: Matter.Body | null;
    
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
}
