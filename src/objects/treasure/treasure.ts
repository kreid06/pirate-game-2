import * as Matter from 'matter-js';
import { BaseGameObject } from '../objects';
import { Color } from '../../utils/color';

export enum TreasureType {
    COIN = 'coin',
    GEMS = 'gems',
    CHEST = 'chest'
}

export class Treasure extends BaseGameObject {
    private type: TreasureType;
    private radius: number;
    private value: number;
    private bobAmount: number = 0;
    private bobSpeed: number = 2;
    private bobPhase: number = 0;
    private rotationSpeed: number = 0.2;
    private collected: boolean = false;
    
    constructor(x: number, y: number, type: TreasureType) {
        super(x, y);
        this.type = type;
        
        // Set properties based on treasure type
        switch (type) {
            case TreasureType.COIN:
                this.radius = 5;
                this.value = 10;
                break;
            case TreasureType.GEMS:
                this.radius = 7;
                this.value = 50;
                this.bobSpeed = 1.5;
                break;
            case TreasureType.CHEST:
                this.radius = 12;
                this.value = 200;
                this.bobSpeed = 1;
                break;
        }
        
        // Create a circular sensor body
        this.body = Matter.Bodies.circle(x, y, this.radius * 1.5, {
            isSensor: true,
            isStatic: false,
            friction: 0,
            frictionAir: 0.02,
            restitution: 0.3,
            density: 0.01,
            label: 'treasure'
        });
        
        // Initialize random bob phase
        this.bobPhase = Math.random() * Math.PI * 2;
    }
    
    public update(delta: number): void {
        if (this.collected) return;
        
        // Update base object
        super.update(delta);
        
        // Update bobbing animation
        this.bobPhase += this.bobSpeed * delta;
        this.bobAmount = Math.sin(this.bobPhase) * 2;
        
        // Apply slow rotation
        if (this.body) {
            Matter.Body.setAngularVelocity(this.body, this.rotationSpeed * (Math.random() * 0.2 - 0.1));
        }
    }
    
    public render(ctx: CanvasRenderingContext2D): void {
        if (this.collected) return;
        
        ctx.save();
        
        // Translate to treasure position with bobbing effect
        ctx.translate(this.position.x, this.position.y + this.bobAmount);
        ctx.rotate(this.rotation);
        
        // Draw the treasure based on type
        switch (this.type) {
            case TreasureType.COIN:
                this.renderCoin(ctx);
                break;
            case TreasureType.GEMS:
                this.renderGems(ctx);
                break;
            case TreasureType.CHEST:
                this.renderChest(ctx);
                break;
        }
        
        // Render debug visualization if enabled
        if (BaseGameObject.isDebugMode()) {
            this.renderDebug(ctx);
        }
        
        ctx.restore();
    }
    
    private renderCoin(ctx: CanvasRenderingContext2D): void {
        // Draw gold coin
        ctx.beginPath();
        ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = Color.GOLD;
        ctx.fill();
        
        // Draw inner detail
        ctx.beginPath();
        ctx.arc(0, 0, this.radius * 0.7, 0, Math.PI * 2);
        ctx.strokeStyle = '#886600';
        ctx.lineWidth = 1;
        ctx.stroke();
        
        // Draw shine
        ctx.beginPath();
        ctx.arc(-this.radius * 0.3, -this.radius * 0.3, this.radius * 0.2, 0, Math.PI * 2);
        ctx.fillStyle = '#FFEE88';
        ctx.fill();
    }
    
    private renderGems(ctx: CanvasRenderingContext2D): void {
        // Draw gem shape (diamond)
        ctx.beginPath();
        ctx.moveTo(0, -this.radius);
        ctx.lineTo(this.radius, 0);
        ctx.lineTo(0, this.radius);
        ctx.lineTo(-this.radius, 0);
        ctx.closePath();
        ctx.fillStyle = '#4466FF';
        ctx.fill();
        
        // Draw shine
        ctx.beginPath();
        ctx.moveTo(-this.radius * 0.3, -this.radius * 0.3);
        ctx.lineTo(this.radius * 0.1, -this.radius * 0.5);
        ctx.lineTo(this.radius * 0.3, -this.radius * 0.2);
        ctx.closePath();
        ctx.fillStyle = '#AACCFF';
        ctx.fill();
    }
    
    private renderChest(ctx: CanvasRenderingContext2D): void {
        // Draw chest body
        ctx.fillStyle = '#884400';
        ctx.fillRect(-this.radius, -this.radius * 0.7, this.radius * 2, this.radius * 1.4);
        
        // Draw chest lid
        ctx.fillStyle = '#663300';
        ctx.fillRect(-this.radius, -this.radius * 0.7, this.radius * 2, this.radius * 0.4);
        
        // Draw chest lock
        ctx.fillStyle = Color.GOLD;
        ctx.fillRect(-this.radius * 0.2, -this.radius * 0.3, this.radius * 0.4, this.radius * 0.3);
        
        // Draw metal bands
        ctx.fillStyle = '#555555';
        ctx.fillRect(-this.radius, -this.radius * 0.4, this.radius * 2, this.radius * 0.2);
        ctx.fillRect(-this.radius, this.radius * 0.3, this.radius * 2, this.radius * 0.2);
    }
    
    /**
     * Render debug visualization of the treasure's physics body
     */
    protected override renderPhysicsBody(ctx: CanvasRenderingContext2D): void {
        if (!this.body) return;
        
        // Draw the circular physics body
        ctx.beginPath();
        ctx.arc(this.position.x, this.position.y, this.radius * 1.5, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(255, 215, 0, 0.8)'; // Gold color for treasure physics
        ctx.lineWidth = 2;
        ctx.stroke();
        
        // Draw value indicator (larger treasures have higher values)
        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.font = '10px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(this.value.toString(), this.position.x, this.position.y);
        
        // Draw sensor indicator
        ctx.beginPath();
        ctx.arc(this.position.x, this.position.y, this.radius * 2, 0, Math.PI * 2);
        ctx.setLineDash([3, 3]); // Dashed line for sensor
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.setLineDash([]); // Reset to solid line
    }
    
    public collect(): void {
        this.collected = true;
    }
    
    public isCollected(): boolean {
        return this.collected;
    }
    
    public getValue(): number {
        return this.value;
    }
    
    public getType(): TreasureType {
        return this.type;
    }
}
