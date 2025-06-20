import * as Matter from 'matter-js';
import { BaseGameObject } from '../objects';
import { Color } from '../../utils/color';

export class Enemy extends BaseGameObject {
    private radius: number;
    private speed: number;
    private target: BaseGameObject | null;
    
    constructor(x: number, y: number, radius: number) {
        super(x, y);
        this.radius = radius;
        this.speed = 2;
        this.target = null;
        
        // Create physics body for enemy (circular)
        this.body = Matter.Bodies.circle(x, y, radius, {
            inertia: Infinity, // Prevents rotation from collisions
            friction: 0.01,
            frictionAir: 0.05,
            restitution: 0.8, // Bouncy
        });
    }
    
    public setTarget(target: BaseGameObject): void {
        this.target = target;
    }
    
    public update(delta: number): void {
        // Move towards target if one exists
        if (this.target && this.body) {
            const targetPos = this.target.getPosition();
            const direction = {
                x: targetPos.x - this.position.x,
                y: targetPos.y - this.position.y
            };
            
            // Normalize direction
            const length = Math.sqrt(direction.x * direction.x + direction.y * direction.y);
            if (length > 0) {
                direction.x /= length;
                direction.y /= length;
            }
            
            // Apply force towards target
            const force = {
                x: direction.x * this.speed,
                y: direction.y * this.speed
            };
            
            Matter.Body.applyForce(this.body, this.body.position, force);
        }
        
        // Update position from physics body
        super.update(delta);
    }
      public render(ctx: CanvasRenderingContext2D): void {
        // Draw the enemy as a green circle
        ctx.beginPath();
        ctx.arc(this.position.x, this.position.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = Color.GREEN;
        ctx.fill();
        ctx.closePath();
        
        // Render debug visualization if debug mode is enabled
        if (BaseGameObject.isDebugMode()) {
            this.renderDebug(ctx);
        }
    }
    
    /**
     * Render debug visualization of the enemy's physics body
     */
    protected renderPhysicsBody(ctx: CanvasRenderingContext2D): void {
        if (!this.body) return;
        
        // Draw the circular physics body
        ctx.beginPath();
        ctx.arc(this.position.x, this.position.y, this.radius, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(255, 165, 0, 0.7)'; // Orange for enemy physics body
        ctx.lineWidth = 2;
        ctx.stroke();
        
        // If enemy has a target, draw a line to it
        if (this.target) {
            const targetPos = this.target.getPosition();
            ctx.beginPath();
            ctx.moveTo(this.position.x, this.position.y);
            ctx.lineTo(targetPos.x, targetPos.y);
            ctx.strokeStyle = 'rgba(255, 0, 0, 0.3)'; // Red for target line
            ctx.lineWidth = 1;
            ctx.setLineDash([5, 5]); // Dashed line
            ctx.stroke();
            ctx.setLineDash([]); // Reset to solid line
        }
    }
}
