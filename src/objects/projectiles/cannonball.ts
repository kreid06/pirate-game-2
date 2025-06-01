import * as Matter from 'matter-js';
import { BaseGameObject } from '../objects';
import { Color } from '../../utils/color';

export class Cannonball extends BaseGameObject {
    private radius: number;
    private damage: number;
    private lifetime: number;
    private maxLifetime: number;
    
    constructor(x: number, y: number, direction: { x: number, y: number }, speed: number) {
        super(x, y);
        this.radius = 5;
        this.damage = 10;
        this.lifetime = 0;
        this.maxLifetime = 2; // 2 seconds until despawn
        
        // Create physics body for cannonball
        this.body = Matter.Bodies.circle(x, y, this.radius, {
            friction: 0,
            frictionAir: 0,
            restitution: 0.8,
            // Make cannonballs collide but not affect other bodies too much
            density: 0.1
        });
        
        // Normalize direction and apply velocity
        const length = Math.sqrt(direction.x * direction.x + direction.y * direction.y);
        if (length > 0) {
            direction.x /= length;
            direction.y /= length;
        }
        
        // Set velocity
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
    }
    
    public render(ctx: CanvasRenderingContext2D): void {
        // Draw the cannonball as a black circle
        ctx.beginPath();
        ctx.arc(this.position.x, this.position.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = Color.BLACK;
        ctx.fill();
        ctx.closePath();
    }
    
    public getDamage(): number {
        return this.damage;
    }
    
    public shouldDestroy(): boolean {
        return this.lifetime >= this.maxLifetime;
    }
}
