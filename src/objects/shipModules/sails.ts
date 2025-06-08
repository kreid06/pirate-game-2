import { BaseShipModule } from './shipModules';
import { Color } from '../../utils/color';
import * as Matter from 'matter-js';

export class Sails extends BaseShipModule {
    private width: number;
    private height: number;
    private speedBoost: number;
    private deployed: boolean;
    
    constructor(offsetX: number, offsetY: number) {
        super(offsetX, offsetY);
        this.width = 40;
        this.height = 60;
        this.speedBoost = 2.0; // Multiplier for ship speed when sails are deployed
        this.deployed = true;
    }
      public update(delta: number): void {
        super.update(delta);
        
        // Apply speed boost to ship if deployed
        if (this.ship && this.deployed && this.ship.getBody()) {
            // Get current velocity
            const velocity = this.ship.getBody()!.velocity;
            
            // Apply additional force in the direction of movement
            const force = {
                x: velocity.x * 0.01 * (this.deployed ? this.speedBoost : 0),
                y: velocity.y * 0.01 * (this.deployed ? this.speedBoost : 0)
            };
            
            // Apply force to ship body
            if (Math.abs(velocity.x) > 0.1 || Math.abs(velocity.y) > 0.1) {
                // Only apply additional force if the ship is already moving
                // to prevent it from drifting when stationary
                const body = this.ship.getBody()!;
                Matter.Body.applyForce(body, body.position, force);
            }
        }
    }
    
    public render(ctx: CanvasRenderingContext2D): void {
        if (!this.ship) return;
        
        // Only render if deployed
        if (!this.deployed) return;
        
        // Get world position of the sail
        const pos = this.getWorldPosition();
        const rotation = this.ship.getRotation();
        
        // Save context
        ctx.save();
        
        // Translate and rotate around sail center
        ctx.translate(pos.x, pos.y);
        ctx.rotate(rotation);
        
        // Draw sail (white rectangle with slight transparency)
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.fillRect(-this.width / 2, -this.height / 2, this.width, this.height);
        
        // Draw sail lines
        ctx.strokeStyle = Color.BLACK;
        ctx.lineWidth = 1;
        
        // Horizontal lines
        for (let i = 1; i < 3; i++) {
            const y = -this.height / 2 + (this.height * i / 3);
            ctx.beginPath();
            ctx.moveTo(-this.width / 2, y);
            ctx.lineTo(this.width / 2, y);
            ctx.stroke();
        }
        
        // Vertical line
        ctx.beginPath();
        ctx.moveTo(0, -this.height / 2);
        ctx.lineTo(0, this.height / 2);
        ctx.stroke();
        
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
     * Override base renderDebug to add sail-specific debug info
     */
    public override renderDebug(ctx: CanvasRenderingContext2D): void {
        // Call base class debug rendering
        super.renderDebug(ctx);
        
        if (!this.ship) return;
        
        const pos = this.getWorldPosition();
        const rotation = this.ship.getRotation();
        
        // Draw deployed/furled indicator
        ctx.save();
        ctx.translate(pos.x, pos.y);
        
        // Draw speed boost text
        ctx.font = '10px Arial';
        ctx.fillStyle = 'white';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        // Counter-rotate to keep text upright
        ctx.rotate(-rotation);
        
        if (this.deployed) {
            ctx.fillText(`Boost: ${this.speedBoost.toFixed(1)}x`, 0, 0);
            
            // Draw wind effect when deployed
            ctx.beginPath();
            ctx.setLineDash([3, 3]);
            ctx.strokeStyle = 'rgba(0, 200, 255, 0.6)';
            
            // Wind flow lines
            for (let i = -2; i <= 2; i++) {
                const y = i * 10;
                ctx.moveTo(-30, y);
                ctx.lineTo(30, y);
            }
            
            ctx.stroke();
            ctx.setLineDash([]);
        } else {
            ctx.fillStyle = 'rgba(255, 0, 0, 0.7)';
            ctx.fillText('Furled', 0, 0);
        }
        
        ctx.restore();
    }
    
    public toggleDeployed(): void {
        this.deployed = !this.deployed;
    }
    
    public isDeployed(): boolean {
        return this.deployed;
    }
    
    public getSpeedBoost(): number {
        return this.deployed ? this.speedBoost : 1.0;
    }
}
