import { BaseShipModule } from './shipModules';
import { Color } from '../../utils/color';
import * as Matter from 'matter-js';

export class SteeringWheel extends BaseShipModule {
    private radius: number;
    private turnSpeed: number;
    private wheelRotation: number;
    
    constructor(offsetX: number, offsetY: number) {
        super(offsetX, offsetY);
        this.radius = 10;
        this.turnSpeed = 0.05; // Radians per second
        this.wheelRotation = 0;
    }
    
    public update(delta: number): void {
        super.update(delta);
    }
    
    public render(ctx: CanvasRenderingContext2D): void {
        if (!this.ship) return;
        
        // Get world position of the steering wheel
        const pos = this.getWorldPosition();
        const shipRotation = this.ship.getRotation();
        
        // Save context
        ctx.save();
        
        // Translate to wheel position
        ctx.translate(pos.x, pos.y);
        
        // Draw steering wheel circle (brown)
        ctx.fillStyle = Color.BROWN;
        ctx.beginPath();
        ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = Color.BLACK;
        ctx.lineWidth = 1;
        ctx.stroke();
        
        // Draw wheel spokes (affected by wheel rotation)
        ctx.rotate(this.wheelRotation);
        ctx.strokeStyle = Color.BLACK;
        ctx.lineWidth = 2;
        
        // Draw 4 spokes
        for (let i = 0; i < 4; i++) {
            const angle = i * Math.PI / 2;
            const x = Math.cos(angle) * this.radius;
            const y = Math.sin(angle) * this.radius;
            
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(x, y);
            ctx.stroke();
        }
        
        // Restore context
        ctx.restore();
        
        // Render debug visualization if enabled
        if (this.ship && this.ship.constructor.name === 'BaseGameObject' && 
            'isDebugMode' in this.ship.constructor && 
            (this.ship.constructor as any).isDebugMode()) {
            this.renderDebug(ctx);
        }
    }
    
    /**
     * Override base renderDebug to add steering-specific debug info
     */
    public override renderDebug(ctx: CanvasRenderingContext2D): void {
        // Call base class debug rendering
        super.renderDebug(ctx);
        
        if (!this.ship) return;
        
        const pos = this.getWorldPosition();
        
        // Draw turn indicator with arrow showing current wheel direction
        const arrowLength = 20;
        const arrowAngle = this.wheelRotation;
        
        ctx.save();
        ctx.translate(pos.x, pos.y);
        
        // Draw turn speed text
        ctx.font = '10px Arial';
        ctx.fillStyle = 'white';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`Turn: ${this.turnSpeed.toFixed(2)}`, 0, -15);
        
        // Draw turn indicator arrow
        ctx.rotate(arrowAngle);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(arrowLength, 0);
        ctx.lineTo(arrowLength - 5, -5);
        ctx.moveTo(arrowLength, 0);
        ctx.lineTo(arrowLength - 5, 5);
        
        ctx.strokeStyle = 'rgba(0, 255, 255, 0.8)';
        ctx.lineWidth = 2;
        ctx.stroke();
        
        ctx.restore();
    }
    
    public turnLeft(delta: number): void {
        if (!this.ship || !this.ship.getBody()) return;
        
        // Update wheel rotation
        this.wheelRotation -= this.turnSpeed * 5;
        
        // Apply rotation to ship
        Matter.Body.rotate(this.ship.getBody()!, -this.turnSpeed * delta);
    }
    
    public turnRight(delta: number): void {
        if (!this.ship || !this.ship.getBody()) return;
        
        // Update wheel rotation
        this.wheelRotation += this.turnSpeed * 5;
        
        // Apply rotation to ship
        Matter.Body.rotate(this.ship.getBody()!, this.turnSpeed * delta);
    }
}
