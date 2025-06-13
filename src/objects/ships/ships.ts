import * as Matter from 'matter-js';
import { BaseGameObject } from '../objects';
import { Color, CollisionCategories } from '../../utils/color';

export abstract class Ships extends BaseGameObject {
    protected width: number;
    protected height: number;
    protected health: number;
    protected maxHealth: number;
    
    constructor(x: number, y: number, width: number, height: number, health: number) {
        super(x, y);
        this.width = width;
        this.height = height;
        this.health = health;
        this.maxHealth = health;
          // Create ship physics body (rectangle)
        this.body = Matter.Bodies.rectangle(x, y, width, height, {
            inertia: Infinity, // We'll control rotation manually
            friction: 0.01,
            frictionAir: 0.05,
            restitution: 0.5,
            collisionFilter: {
                category: CollisionCategories.SHIP,
                mask: CollisionCategories.PLAYER | CollisionCategories.PROJECTILE | 
                      CollisionCategories.SHIP | CollisionCategories.ISLAND,
                group: 0
            },
        });
    }
    
    public takeDamage(amount: number): void {
        this.health -= amount;
        if (this.health < 0) {
            this.health = 0;
        }
    }
    
    public heal(amount: number): void {
        this.health += amount;
        if (this.health > this.maxHealth) {
            this.health = this.maxHealth;
        }
    }
    
    public isDead(): boolean {
        return this.health <= 0;
    }
      public render(ctx: CanvasRenderingContext2D): void {
        // Save context to restore later
        ctx.save();
        
        // Translate and rotate around ship center
        ctx.translate(this.position.x, this.position.y);
        ctx.rotate(this.rotation);
        
        // // Draw ship body (brown rectangle)
        // ctx.fillStyle = Color.SHIP_BODY;
        // ctx.fillRect(-this.width / 2, -this.height / 2, this.width, this.height);
        
        // Restore context
        ctx.restore();
        
        // Draw health bar above ship
        this.renderHealthBar(ctx);
        
        // Render debug visualization if debug mode is enabled
        if (BaseGameObject.isDebugMode()) {
            this.renderDebug(ctx);
        }
    }
    
    private renderHealthBar(ctx: CanvasRenderingContext2D): void {
        const barWidth = this.width;
        const barHeight = 5;
        const x = this.position.x - barWidth / 2;
        const y = this.position.y - this.height / 2 - 10;
        
        // Background (empty health)
        ctx.fillStyle = '#FF0000';
        ctx.fillRect(x, y, barWidth, barHeight);
        
        // Foreground (current health)
        const healthWidth = (this.health / this.maxHealth) * barWidth;
        ctx.fillStyle = '#00FF00';
        ctx.fillRect(x, y, healthWidth, barHeight);
    }    /**
     * Render debug visualization of the ship
     * This should NOT render the physics body as that's handled by the physics engine
     */
    protected renderPhysicsBody(ctx: CanvasRenderingContext2D): void {
        if (!this.body) return;
        
        // Draw just helpful information about the ship, not the physics body itself
        // as the physics engine already renders that
        
        // Add debug text for ship info
        ctx.fillStyle = 'white';
        ctx.font = '12px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(
            `${this.constructor.name} (${Math.round(this.health)}/${this.maxHealth})`,
            this.position.x,
            this.position.y - 20
        );
        
        // Display velocity
        if (this.body.speed > 0.1) {
            ctx.fillText(
                `Speed: ${this.body.speed.toFixed(1)} px/s`,
                this.position.x,
                this.position.y - 5
            );
        }
    }
}
