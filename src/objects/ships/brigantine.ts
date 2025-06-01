import { Ship } from './ships';
import { Color } from '../../utils/color';

export class Brigantine extends Ship {
    private sailSize: number;
    
    constructor(x: number, y: number) {
        // Brigantine is a medium-sized ship
        super(x, y, 80, 30, 100);
        this.sailSize = 40;
    }
    
    public render(ctx: CanvasRenderingContext2D): void {
        // Call base class render to draw ship body and health bar
        super.render(ctx);
        
        // Save context
        ctx.save();
        
        // Translate and rotate around ship center
        ctx.translate(this.position.x, this.position.y);
        ctx.rotate(this.rotation);
        
        // Draw sails (white triangles)
        ctx.fillStyle = Color.SAIL;
        
        // Main sail
        ctx.beginPath();
        ctx.moveTo(0, -this.height / 2);
        ctx.lineTo(this.sailSize / 2, -this.height / 2);
        ctx.lineTo(0, -this.height / 2 - this.sailSize);
        ctx.closePath();
        ctx.fill();
        
        // Secondary sail
        ctx.beginPath();
        ctx.moveTo(-this.width / 4, -this.height / 2);
        ctx.lineTo(this.width / 4, -this.height / 2);
        ctx.lineTo(0, -this.height / 2 - this.sailSize / 1.5);
        ctx.closePath();
        ctx.fill();
        
        // Restore context
        ctx.restore();
    }
}
