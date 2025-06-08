import * as Matter from 'matter-js';
import { BaseGameObject } from '../objects';
import { Color } from '../../utils/color';

export class Cannonball extends BaseGameObject {
    private radius: number;
    private damage: number;
    private lifetime: number;
    private maxLifetime: number;
    private initialPosition: { x: number, y: number };
    private distanceTraveled: number;
    
    constructor(x: number, y: number, direction: { x: number, y: number }, damage: number) {
        super(x, y);
        this.radius = 5;
        this.damage = damage;
        this.lifetime = 0;
        this.maxLifetime = 2; // 2 seconds until despawn
        this.initialPosition = { x, y };
        this.distanceTraveled = 0;
        
        // Create physics body for cannonball
        this.body = Matter.Bodies.circle(x, y, this.radius, {
            friction: 0,
            frictionAir: 0,
            restitution: 0.8,
            // Make cannonballs collide but not affect other bodies too much
            density: 0.1,
            label: 'cannonball'
        });
        
        // Normalize direction and apply velocity
        const length = Math.sqrt(direction.x * direction.x + direction.y * direction.y);
        if (length > 0) {
            direction.x /= length;
            direction.y /= length;
        }
        
        // Set velocity (with damage affecting speed)
        const speed = 10 + damage * 0.5; // Base speed + bonus from damage
        
        if (this.body) {
            Matter.Body.setVelocity(this.body, {
                x: direction.x * speed,
                y: direction.y * speed
            });
        }
    }
    
    public update(delta: number): void {
        super.update(delta);
        
        // Update lifetime
        this.lifetime += delta;
        
        // Calculate distance traveled
        const dx = this.position.x - this.initialPosition.x;
        const dy = this.position.y - this.initialPosition.y;
        this.distanceTraveled = Math.sqrt(dx * dx + dy * dy);
    }
    
    /**
     * Get the distance traveled by the cannonball
     */
    public getDistanceTraveled(): number {
        return this.distanceTraveled;
    }
    
    public render(ctx: CanvasRenderingContext2D): void {
        // Draw the cannonball as a black circle
        ctx.beginPath();
        ctx.arc(this.position.x, this.position.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = Color.BLACK;
        ctx.fill();
        ctx.closePath();
        
        // Render debug visualization if debug mode is enabled
        if (BaseGameObject.isDebugMode()) {
            this.renderDebug(ctx);
        }
    }
    
    /**
     * Render debug visualization of the cannonball's physics body
     */
    protected renderPhysicsBody(ctx: CanvasRenderingContext2D): void {
        if (!this.body) return;
        
        // Draw the circular physics body
        ctx.beginPath();
        ctx.arc(this.position.x, this.position.y, this.radius, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(255, 0, 255, 0.7)'; // Magenta for projectile physics
        ctx.lineWidth = 2;
        ctx.stroke();
        
        // Draw lifetime indicator (shrinking circle that shows remaining lifetime)
        const lifetimeRadius = this.radius * 2 * (1 - (this.lifetime / this.maxLifetime));
        if (lifetimeRadius > 0) {
            ctx.beginPath();
            ctx.arc(this.position.x, this.position.y, lifetimeRadius, 0, Math.PI * 2);
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
            ctx.lineWidth = 1;
            ctx.stroke();
        }
    }
    
    public getDamage(): number {
        return this.damage;
    }
    
    public shouldDestroy(): boolean {
        return this.lifetime >= this.maxLifetime;
    }
}
