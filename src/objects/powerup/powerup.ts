import * as Matter from 'matter-js';
import { BaseGameObject } from '../objects';
import { Color } from '../../utils/color';

export enum PowerUpType {
    REPAIR = 'repair',
    SPEED_BOOST = 'speed',
    CANNON_UPGRADE = 'cannon',
    HEAL = 'heal'
}

export class PowerUp extends BaseGameObject {
    private type: PowerUpType;
    private radius: number;
    private duration!: number; // Duration in seconds, 0 for instant effects like repair
    private active: boolean = false;
    private collected: boolean = false;
    private glowAmount: number = 0;
    private glowSpeed: number = 3;
    private glowPhase: number = 0;
    private rotationSpeed: number = 0.5;
    
    constructor(x: number, y: number, type: PowerUpType) {
        super(x, y);
        this.type = type;
        this.radius = 15;
        
        // Set duration based on power-up type
        switch (type) {
            case PowerUpType.REPAIR:
                this.duration = 0; // Instant effect
                break;
            case PowerUpType.SPEED_BOOST:
                this.duration = 10; // 10 seconds
                break;
            case PowerUpType.CANNON_UPGRADE:
                this.duration = 15; // 15 seconds
                break;
            case PowerUpType.HEAL:
                this.duration = 0; // Instant effect
                break;
        }
        
        // Create a circular sensor body
        this.body = Matter.Bodies.circle(x, y, this.radius, {
            isSensor: true,
            isStatic: false,
            friction: 0,
            frictionAir: 0.01,
            restitution: 0.5,
            density: 0.01,
            label: 'powerup'
        });
        
        // Initialize random glow phase
        this.glowPhase = Math.random() * Math.PI * 2;
    }
    
    public update(delta: number): void {
        if (this.collected) return;
        
        // Update base object
        super.update(delta);
        
        // Update glowing animation
        this.glowPhase += this.glowSpeed * delta;
        this.glowAmount = (Math.sin(this.glowPhase) * 0.3) + 0.7; // 0.4 to 1.0 range
        
        // Apply slow rotation
        if (this.body) {
            Matter.Body.setAngularVelocity(this.body, this.rotationSpeed * 0.2);
        }
    }
    
    public render(ctx: CanvasRenderingContext2D): void {
        if (this.collected) return;
        
        ctx.save();
        
        // Translate to power-up position
        ctx.translate(this.position.x, this.position.y);
        ctx.rotate(this.rotation);
        
        // Draw outer glow
        const glowRadius = this.radius * (1 + this.glowAmount * 0.3);
        ctx.beginPath();
        ctx.arc(0, 0, glowRadius, 0, Math.PI * 2);
        
        // Set glow color based on type
        let glowColor = '';
        switch (this.type) {
            case PowerUpType.REPAIR:
                glowColor = `rgba(0, 255, 0, ${this.glowAmount * 0.5})`;
                break;
            case PowerUpType.SPEED_BOOST:
                glowColor = `rgba(0, 150, 255, ${this.glowAmount * 0.5})`;
                break;
            case PowerUpType.CANNON_UPGRADE:
                glowColor = `rgba(255, 50, 0, ${this.glowAmount * 0.5})`;
                break;
        }
        
        ctx.fillStyle = glowColor;
        ctx.fill();
        
        // Draw the power-up based on type
        switch (this.type) {
            case PowerUpType.REPAIR:
                this.renderRepair(ctx);
                break;
            case PowerUpType.SPEED_BOOST:
                this.renderSpeedBoost(ctx);
                break;
            case PowerUpType.CANNON_UPGRADE:
                this.renderCannonUpgrade(ctx);
                break;
        }
        
        // Render debug visualization if enabled
        if (BaseGameObject.isDebugMode()) {
            this.renderDebug(ctx);
        }
        
        ctx.restore();
    }
    
    private renderRepair(ctx: CanvasRenderingContext2D): void {
        // Draw circle
        ctx.beginPath();
        ctx.arc(0, 0, this.radius * 0.8, 0, Math.PI * 2);
        ctx.fillStyle = '#FFFFFF';
        ctx.fill();
        
        // Draw plus symbol (medical cross)
        ctx.fillStyle = '#00AA00';
        ctx.fillRect(-this.radius * 0.5, -this.radius * 0.15, this.radius, this.radius * 0.3);
        ctx.fillRect(-this.radius * 0.15, -this.radius * 0.5, this.radius * 0.3, this.radius);
    }
    
    private renderSpeedBoost(ctx: CanvasRenderingContext2D): void {
        // Draw circle
        ctx.beginPath();
        ctx.arc(0, 0, this.radius * 0.8, 0, Math.PI * 2);
        ctx.fillStyle = '#FFFFFF';
        ctx.fill();
        
        // Draw lightning bolt
        ctx.beginPath();
        ctx.moveTo(-this.radius * 0.2, -this.radius * 0.5);
        ctx.lineTo(this.radius * 0.2, 0);
        ctx.lineTo(-this.radius * 0.1, 0);
        ctx.lineTo(this.radius * 0.3, this.radius * 0.5);
        ctx.lineTo(this.radius * 0.1, 0.1);
        ctx.lineTo(this.radius * 0.4, 0.1);
        ctx.lineTo(0, -this.radius * 0.5);
        ctx.closePath();
        ctx.fillStyle = '#0088FF';
        ctx.fill();
    }
    
    private renderCannonUpgrade(ctx: CanvasRenderingContext2D): void {
        // Draw circle
        ctx.beginPath();
        ctx.arc(0, 0, this.radius * 0.8, 0, Math.PI * 2);
        ctx.fillStyle = '#FFFFFF';
        ctx.fill();
        
        // Draw cannon icon
        ctx.fillStyle = '#FF3300';
        ctx.fillRect(-this.radius * 0.5, -this.radius * 0.2, this.radius, this.radius * 0.4);
        
        // Draw cannon balls
        ctx.beginPath();
        ctx.arc(this.radius * 0.3, 0, this.radius * 0.2, 0, Math.PI * 2);
        ctx.fillStyle = '#333333';
        ctx.fill();
        
        ctx.beginPath();
        ctx.arc(this.radius * 0.6, this.radius * 0.1, this.radius * 0.15, 0, Math.PI * 2);
        ctx.fillStyle = '#333333';
        ctx.fill();
    }
    
    public collect(): void {
        this.collected = true;
        this.active = true;
    }
    
    public isCollected(): boolean {
        return this.collected;
    }
    
    public isActive(): boolean {
        return this.active;
    }
    
    public deactivate(): void {
        this.active = false;
    }
    
    /**
     * Render debug visualization of the power-up's physics body
     */
    protected override renderPhysicsBody(ctx: CanvasRenderingContext2D): void {
        if (!this.body) return;
        
        // Draw the circular physics body
        ctx.beginPath();
        ctx.arc(this.position.x, this.position.y, this.radius, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(0, 150, 255, 0.8)'; // Blue for power-up physics
        ctx.lineWidth = 2;
        ctx.stroke();
        
        // Draw sensor indicator
        const indicatorRadius = this.radius * 1.2;
        ctx.beginPath();
        ctx.arc(this.position.x, this.position.y, indicatorRadius, 0, Math.PI * 2);
        ctx.setLineDash([3, 3]); // Dashed line for sensor
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)'; // White for sensor area
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.setLineDash([]); // Reset to solid line
    }
    
    public getType(): PowerUpType {
        return this.type;
    }
    
    public getDuration(): number {
        return this.duration;
    }
}
