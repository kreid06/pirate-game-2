import * as Matter from 'matter-js';
import { BaseGameObject } from '../objects';
import { Color } from '../../utils/color';

export abstract class Ship extends BaseGameObject {
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
        
        // Draw ship body (brown rectangle)
        ctx.fillStyle = Color.SHIP_BODY;
        ctx.fillRect(-this.width / 2, -this.height / 2, this.width, this.height);
        
        // Restore context
        ctx.restore();
        
        // Draw health bar above ship
        this.renderHealthBar(ctx);
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
    }
}
