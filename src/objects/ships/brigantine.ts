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
        // Create a physics body that matches the hull shape with quadratic curves
        const scaleFactor = 0.2; // Scale down the hull points for physics
        const p = Brigantine.HULL_POINTS;
        
        // Create vertices for a polygon body that approximates the hull shape
        // We'll sample points along the quadratic curves to create a more accurate polygon
        const vertices = [];
        
        // Number of points to sample along each curved edge
        const curveSamples = 8;
        
        // Sample points along the bow curve (from bow to bowBottom through bowTip)
        for (let i = 0; i <= curveSamples; i++) {
            const t = i / curveSamples;
            // Quadratic Bezier formula: (1-t)²P₀ + 2(1-t)tP₁ + t²P₂
            const x = Math.pow(1-t, 2) * p.bow.x + 2 * (1-t) * t * p.bowTip.x + Math.pow(t, 2) * p.bow.x;
            const y = Math.pow(1-t, 2) * p.bow.y + 2 * (1-t) * t * p.bowTip.y + Math.pow(t, 2) * p.bowBottom.y;
            vertices.push({ x: x * scaleFactor, y: y * scaleFactor });
        }
        
        // Add stern bottom point
        vertices.push({ 
            x: p.sternBottom.x * scaleFactor, 
            y: p.sternBottom.y * scaleFactor 
        });
        
        // Sample points along the stern curve (from sternBottom to stern through sternTip)
        for (let i = 0; i <= curveSamples; i++) {
            const t = i / curveSamples;
            // Quadratic Bezier formula: (1-t)²P₀ + 2(1-t)tP₁ + t²P₂
            const x = Math.pow(1-t, 2) * p.sternBottom.x + 2 * (1-t) * t * p.sternTip.x + Math.pow(t, 2) * p.stern.x;
            const y = Math.pow(1-t, 2) * p.sternBottom.y + 2 * (1-t) * t * p.sternTip.y + Math.pow(t, 2) * p.stern.y;
            vertices.push({ x: x * scaleFactor, y: y * scaleFactor });
        }
        
        // Create the physics body from the vertices
        this.body = Matter.Bodies.fromVertices(
            this.position.x,
            this.position.y,
            [vertices],
            {
                inertia: Infinity, // We'll control rotation manually
                friction: 0.01,
                frictionAir: 0.05,
                restitution: 0.5,
                label: 'brigantine'
            }
        );
        
        // If body creation fails (which can happen with complex shapes),
        // fall back to a simpler approximation
        if (!this.body) {
            console.warn('Failed to create complex hull shape for brigantine, falling back to simpler shape');
            
            // Calculate dimensions for the fallback physics body
            const bodyLength = (p.bowTip.x - p.sternTip.x) * scaleFactor;
            const bodyWidth = (p.bow.y - p.bowBottom.y) * scaleFactor;
            
            // Create a polygon with 8 points that approximates the ship's shape
            const simpleVertices = [];
            
            // Bow curved section (simplified with 3 points)
            simpleVertices.push({ x: p.bow.x * scaleFactor, y: p.bow.y * scaleFactor }); // Top bow point
            simpleVertices.push({ x: p.bowTip.x * scaleFactor, y: p.bowTip.y * scaleFactor }); // Bow tip
            simpleVertices.push({ x: p.bow.x * scaleFactor, y: p.bowBottom.y * scaleFactor }); // Bottom bow point
            
            // Stern section points
            simpleVertices.push({ x: p.sternBottom.x * scaleFactor, y: p.sternBottom.y * scaleFactor }); // Bottom stern
            simpleVertices.push({ x: p.sternTip.x * scaleFactor, y: p.sternTip.y * scaleFactor }); // Stern tip
            simpleVertices.push({ x: p.stern.x * scaleFactor, y: p.stern.y * scaleFactor }); // Top stern
            
            this.body = Matter.Bodies.fromVertices(
                this.position.x,
                this.position.y,
                [simpleVertices],
                {
                    inertia: Infinity,
                    friction: 0.01,
                    frictionAir: 0.05,
                    restitution: 0.5,
                    label: 'brigantine'
                }
            );
            
            // If even that fails, fall back to a rectangle with chamfered corners
            if (!this.body) {
                this.body = Matter.Bodies.rectangle(
                    this.position.x, 
                    this.position.y, 
                    bodyLength, 
                    bodyWidth, 
                    {
                        inertia: Infinity,
                        friction: 0.01,
                        frictionAir: 0.05,
                        restitution: 0.5,
                        chamfer: { radius: bodyWidth / 3 },
                        label: 'brigantine'
                    }
                );
            }
        }
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
     */    protected override renderPhysicsBody(ctx: CanvasRenderingContext2D): void {
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
        
        // Draw visual hull outline
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
        
        // Add text to indicate this is the visual shape
        ctx.fillStyle = 'white';
        ctx.font = '10px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Visual Hull Shape', 0, 0);
        
        // Draw physics body vertices
        if (this.body.vertices && this.body.vertices.length > 0) {
            // Transform back to world space for physics body
            ctx.restore();
            ctx.save();
            
            // Draw physics body vertices
            ctx.strokeStyle = Color.DEBUG_PHYSICS;
            ctx.lineWidth = 2;
            ctx.beginPath();
            
            // Apply inverse rotation to get vertices in local space
            const cos = Math.cos(-this.rotation);
            const sin = Math.sin(-this.rotation);
            
            // Draw the outline of physics body vertices in local space for comparison
            for (let i = 0; i < this.body.vertices.length; i++) {
                const vertex = this.body.vertices[i];
                // Transform to local space for comparison with visual hull
                const dx = vertex.x - this.position.x;
                const dy = vertex.y - this.position.y;
                const localX = dx * cos - dy * sin;
                const localY = dx * sin + dy * cos;
                
                if (i === 0) {
                    ctx.moveTo(this.position.x + localX, this.position.y + localY);
                } else {
                    ctx.lineTo(this.position.x + localX, this.position.y + localY);
                }
            }
            
            // Close the path
            if (this.body.vertices.length > 0) {
                const vertex = this.body.vertices[0];
                const dx = vertex.x - this.position.x;
                const dy = vertex.y - this.position.y;
                const localX = dx * cos - dy * sin;
                const localY = dx * sin + dy * cos;
                ctx.lineTo(this.position.x + localX, this.position.y + localY);
            }
            
            ctx.stroke();
            
            // Add label for physics body outline
            ctx.fillStyle = Color.DEBUG_PHYSICS;
            ctx.font = '10px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('Physics Body Shape', this.position.x, this.position.y + 15);
        } else {
            ctx.restore();
        }
    }
}
