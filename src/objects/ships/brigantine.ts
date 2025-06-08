import { Ships } from './ships';
import { Color } from '../../utils/color';
import * as Matter from 'matter-js';

export class Brigantine extends Ships {
    private sailSize: number;
    path: Path2D | null = null;    constructor(x: number, y: number) {
        // Brigantine is a medium-sized ship
        super(x, y, 80, 30, 100);
        this.sailSize = 40;
        
        // Create custom physics body
        this.createPhysicsBody();
    }
      protected override createPhysicsBody(): void {
        // Since complex hull shapes may require additional plugins,
        // we'll use a combination of simple shapes to approximate the hull
        
        // Scale down the hull points for physics
        const scaleFactor = 0.2;
        const p = Brigantine.HULL_POINTS;
        
        // Calculate dimensions for the physics body
        const bodyLength = (p.bowTip.x - p.sternTip.x) * scaleFactor;
        const bodyWidth = (p.bow.y - p.bowBottom.y) * scaleFactor;
        
        // Create a main rectangular body that represents the ship
        this.body = Matter.Bodies.rectangle(
            this.position.x, 
            this.position.y, 
            bodyLength, 
            bodyWidth, 
            {
                inertia: Infinity, // We'll control rotation manually
                friction: 0.01,
                frictionAir: 0.05,
                restitution: 0.5,
                chamfer: { radius: bodyWidth / 3 }, // Round the corners
                label: 'brigantine'
            }
        );
    }
    
    private static readonly HULL_POINTS = {
        bow: { x: 190, y: 90 },
        bowTip: { x: 415, y: 0 },
        bowBottom: { x: 190, y: -90 },
        sternBottom: { x: -260, y: -90 },
        sternTip: { x: -345, y: 0 },
        stern: { x: -260, y: 90 }
    };

    private static createHullPath(): Path2D {
        const p = Brigantine.HULL_POINTS;
        const path = new Path2D();
        path.moveTo(p.bow.x, p.bow.y);
        path.quadraticCurveTo(p.bowTip.x, p.bowTip.y, p.bow.x, p.bowBottom.y);
        path.lineTo(p.sternBottom.x, p.sternBottom.y);
        path.quadraticCurveTo(p.sternTip.x, p.sternTip.y, p.stern.x, p.stern.y);
        path.closePath();
        return path;
    };

    public render(ctx: CanvasRenderingContext2D): void {
        // Call base class render to draw ship body and health bar
        super.render(ctx);
        
        // Save context
        ctx.save();
        
        // Translate and rotate around ship center
        ctx.translate(this.position.x, this.position.y);
        if (this.body) {
            ctx.rotate(this.body.angle);
        }
        
        // Draw ship hull using Path2D
        if (!this.path) {
            this.path = Brigantine.createHullPath();
        }
        ctx.fillStyle = '#D2B48C'; // Saddle brown for wooden hull
        ctx.fill(this.path!);
        ctx.strokeStyle = '#654321'; // Darker brown for outline
        ctx.lineWidth = 10;
        ctx.stroke(this.path!);        // Restore context
        ctx.restore();
    }    /**
     * Render debug visualization specific to Brigantine
     * Focuses on showing the visual hull shape rather than physics body
     */
    protected override renderPhysicsBody(ctx: CanvasRenderingContext2D): void {
        // Call the base implementation first for the ship info text
        super.renderPhysicsBody(ctx);
        
        if (!this.body) return;
        
        // Add Brigantine-specific debug visualizations that don't duplicate physics rendering
        
        // Draw hull shape outline for comparison with physics body
        ctx.save();
        ctx.translate(this.position.x, this.position.y);
        ctx.rotate(this.rotation);
        
        if (!this.path) {
            this.path = Brigantine.createHullPath();
        }
        
        // Draw visual hull outline (but not the physics body - that's handled by the physics engine)
        ctx.strokeStyle = Color.DEBUG_WARNING; // Orange for visual hull
        ctx.lineWidth = 1;
        ctx.setLineDash([5, 5]);
        ctx.stroke(this.path!);
        ctx.setLineDash([]);
        
        // Draw hull points for reference
        const p = Brigantine.HULL_POINTS;
        const points = [p.bow, p.bowTip, p.bowBottom, p.sternBottom, p.sternTip, p.stern];
        
        for (const point of points) {
            ctx.beginPath();
            ctx.arc(point.x, point.y, 4, 0, Math.PI * 2);
            ctx.fillStyle = Color.DEBUG_VERTEX;
            ctx.fill();
        }
        
        // Add text to indicate this is the visual shape, not physics body
        ctx.fillStyle = 'white';
        ctx.font = '10px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Visual Hull Shape', 0, 0);
        
        ctx.restore();
    }
}
