import { Ships } from './ships';
import { Color, CollisionCategories } from '../../utils/color';
import * as Matter from 'matter-js';

export class Brigantine extends Ships {
    private sailSize: number;
    path: Path2D | null = null;    constructor(x: number, y: number) {
        // Brigantine is a medium-sized ship
        super(x, y, 80, 30, 100);
        this.sailSize = 40;
        
        // Create custom physics body
        this.createPhysicsBody();
    }    protected override createPhysicsBody(): void {
        // Create a physics body that matches the hull shape with quadratic curves
        const scaleFactor = 0.3; // Increased scale factor for better collision detection
        const p = Brigantine.HULL_POINTS;
        
        // Create vertices for a polygon body that approximates the hull shape
        // We'll use a simpler, more reliable shape for physics
        const vertices = [];
        
        // Number of points to sample along each curved edge
        const curveSamples = 5; // Reduced sample count for more stable physics
        
        // For better collision detection, add more points at the bow and stern
        
        // Sample points along the bow curve (from bow to bowBottom through bowTip)
        for (let i = 0; i <= curveSamples; i++) {
            const t = i / curveSamples;
            // Quadratic Bezier formula: (1-t)²P₀ + 2(1-t)tP₁ + t²P₂
            const x = Math.pow(1-t, 2) * p.bow.x + 2 * (1-t) * t * p.bowTip.x + Math.pow(t, 2) * p.bow.x;
            const y = Math.pow(1-t, 2) * p.bow.y + 2 * (1-t) * t * p.bowTip.y + Math.pow(t, 2) * p.bowBottom.y;
            vertices.push({ x: x * scaleFactor, y: y * scaleFactor });
        }
        
        // Add stern bottom point (with a slight outward adjustment for better collision)
        vertices.push({ 
            x: p.sternBottom.x * scaleFactor * 1.02, 
            y: p.sternBottom.y * scaleFactor * 1.02
        });
        
        // Sample points along the stern curve (from sternBottom to stern through sternTip)
        for (let i = 0; i <= curveSamples; i++) {
            const t = i / curveSamples;
            // Quadratic Bezier formula: (1-t)²P₀ + 2(1-t)tP₁ + t²P₂
            const x = Math.pow(1-t, 2) * p.sternBottom.x + 2 * (1-t) * t * p.sternTip.x + Math.pow(t, 2) * p.stern.x;
            const y = Math.pow(1-t, 2) * p.sternBottom.y + 2 * (1-t) * t * p.sternTip.y + Math.pow(t, 2) * p.stern.y;
            vertices.push({ x: x * scaleFactor, y: y * scaleFactor });
        }
        
        // Add a slight hull expansion for more reliable collision detection
        for (let i = 0; i < vertices.length; i++) {
            // Calculate direction from center to vertex
            const dx = vertices[i].x;
            const dy = vertices[i].y;
            const len = Math.sqrt(dx*dx + dy*dy);
            if (len > 0.01) {
                // Expand vertex slightly outward (2% expansion)
                const expansionFactor = 1.02;
                vertices[i].x *= expansionFactor;
                vertices[i].y *= expansionFactor;
            }
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
                restitution: 0.4, // Slightly lower restitution for more natural collisions
                density: 0.03, // Increased density for better collision response
                collisionFilter: {
                    category: CollisionCategories.SHIP,
                    mask: CollisionCategories.PLAYER | CollisionCategories.PROJECTILE | 
                          CollisionCategories.SHIP | CollisionCategories.ISLAND,
                    group: 0
                },
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
            
            // Create a convex hull with 8 points that approximates the ship's shape
            const simpleVertices = [];
            
            // Create simplified ship shape with deliberately expanded collision area
            simpleVertices.push({ x: p.bow.x * scaleFactor * 1.05, y: p.bow.y * scaleFactor * 1.05 }); // Top bow point
            simpleVertices.push({ x: p.bowTip.x * scaleFactor * 1.05, y: p.bowTip.y * scaleFactor }); // Bow tip
            simpleVertices.push({ x: p.bow.x * scaleFactor * 1.05, y: p.bowBottom.y * scaleFactor * 1.05 }); // Bottom bow point
            
            // Stern section points
            simpleVertices.push({ x: p.sternBottom.x * scaleFactor * 1.05, y: p.sternBottom.y * scaleFactor * 1.05 }); // Bottom stern
            simpleVertices.push({ x: p.sternTip.x * scaleFactor * 1.05, y: p.sternTip.y * scaleFactor }); // Stern tip
            simpleVertices.push({ x: p.stern.x * scaleFactor * 1.05, y: p.stern.y * scaleFactor * 1.05 }); // Top stern
            
            this.body = Matter.Bodies.fromVertices(
                this.position.x,
                this.position.y,
                [simpleVertices],
                {
                    inertia: Infinity,
                    friction: 0.01,
                    frictionAir: 0.05,
                    restitution: 0.4, // Slightly lower restitution
                    density: 0.03, // Increased density for better collision response
                    collisionFilter: {
                        category: CollisionCategories.SHIP,
                        mask: CollisionCategories.PLAYER | CollisionCategories.PROJECTILE | 
                              CollisionCategories.SHIP | CollisionCategories.ISLAND,
                        group: 0
                    },
                    label: 'brigantine'
                }
            );
            
            // If even that fails, fall back to a rectangle with chamfered corners
            if (!this.body) {
                console.warn('Failed to create simplified hull shape for brigantine, falling back to rectangular shape');
                this.body = Matter.Bodies.rectangle(
                    this.position.x, 
                    this.position.y, 
                    bodyLength * 1.1, // Slightly larger for better collision
                    bodyWidth * 1.1, 
                    {
                        inertia: Infinity,
                        friction: 0.01,
                        frictionAir: 0.05,
                        restitution: 0.4, // Slightly lower restitution for more natural collisions
                        density: 0.03, // Increased density for better collision response
                        chamfer: { radius: bodyWidth / 3 },
                        collisionFilter: {
                            category: CollisionCategories.SHIP,
                            mask: CollisionCategories.PLAYER | CollisionCategories.PROJECTILE | 
                                  CollisionCategories.SHIP | CollisionCategories.ISLAND,
                            group: 0
                        },
                        label: 'brigantine'
                    }
                );
            }
        }
        
        // Debug log the created body
        if (this.body) {
            console.log(`Created brigantine physics body with ${this.body.vertices.length} vertices`);
            console.log(`Brigantine body bounds: ${JSON.stringify(this.body.bounds)}`);
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
        ctx.fillStyle = '#D2B48C'; // Saddle brown for wooden hull        ctx.fill(this.path!);
        ctx.strokeStyle = '#654321'; // Darker brown for outline
        ctx.lineWidth = 10;
        ctx.stroke(this.path!);
        
        // Restore context
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
