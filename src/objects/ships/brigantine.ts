import { Ships } from './ships';
import { Color, CollisionCategories } from '../../utils/color';
import * as Matter from 'matter-js';

export class Brigantine extends Ships {
    private sailSize: number;
    path: Path2D | null = null;
    // Add boarding ladder properties
    private ladderRect: { x: number, y: number, width: number, height: number };
    private playerInLadderArea: boolean = false;
    private playerIsHovering: boolean = false;
    private playerIsBoarded: boolean = false;
    
    constructor(x: number, y: number) {
        // Brigantine is a medium-sized ship
        super(x, y, 80, 30, 100);
        this.sailSize = 40;
        
        // Initialize ladder rectangle (will be positioned correctly in update)
        this.ladderRect = { x: 0, y: 0, width: 60, height: 30 };
        
        // Create custom physics body
        this.createPhysicsBody();
    }    protected override createPhysicsBody(): void {
        // Create a physics body that matches the hull shape with quadratic curves
        const scaleFactor = 1.0; // Doubled scale factor to better match visual representation
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
            x: p.sternBottom.x * scaleFactor * 1.05, 
            y: p.sternBottom.y * scaleFactor * 1.05
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
            if (len > 0.01) {                // Expand vertex slightly outward (5% expansion)
                const expansionFactor = 1.05;
                vertices[i].x *= expansionFactor;
                vertices[i].y *= expansionFactor;
            }
        }

        // Create the physics body from the vertices
        this.body = Matter.Bodies.fromVertices(
            this.position.x,
            this.position.y,
            [vertices],
            {                inertia: Infinity, // We'll control rotation manually
                friction: 0.01,
                frictionAir: 0.05,
                restitution: 0.4, // Slightly lower restitution for more natural collisions
                density: 0.015, // Reduced density to compensate for doubled size
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
            simpleVertices.push({ x: p.bow.x * scaleFactor * 1.08, y: p.bow.y * scaleFactor * 1.08 }); // Top bow point
            simpleVertices.push({ x: p.bowTip.x * scaleFactor * 1.08, y: p.bowTip.y * scaleFactor }); // Bow tip
            simpleVertices.push({ x: p.bow.x * scaleFactor * 1.08, y: p.bowBottom.y * scaleFactor * 1.08 }); // Bottom bow point
            
            // Stern section points
            simpleVertices.push({ x: p.sternBottom.x * scaleFactor * 1.08, y: p.sternBottom.y * scaleFactor * 1.08 }); // Bottom stern
            simpleVertices.push({ x: p.sternTip.x * scaleFactor * 1.08, y: p.sternTip.y * scaleFactor }); // Stern tip
            simpleVertices.push({ x: p.stern.x * scaleFactor * 1.08, y: p.stern.y * scaleFactor * 1.08 }); // Top stern
            
            this.body = Matter.Bodies.fromVertices(
                this.position.x,
                this.position.y,
                [simpleVertices],
                {
                    inertia: Infinity,                    friction: 0.01,
                    frictionAir: 0.05,
                    restitution: 0.4, // Slightly lower restitution
                    density: 0.015, // Reduced density to compensate for doubled size
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
                        inertia: Infinity,                        friction: 0.01,
                        frictionAir: 0.05,
                        restitution: 0.4, // Slightly lower restitution for more natural collisions
                        density: 0.015, // Reduced density to compensate for doubled size
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
    };    public render(ctx: CanvasRenderingContext2D): void {
        // Call base class render to draw ship body and health bar
        super.render(ctx);
        
        // Save context
        ctx.save();
        
        // Translate and rotate around ship center - using position from physics body
        ctx.translate(this.position.x, this.position.y);
        ctx.rotate(this.rotation); // Always use rotation from the base class, which is synced with the physics body
        
        // Draw ship hull using Path2D
        if (!this.path) {
            this.path = Brigantine.createHullPath();
        }
        ctx.fillStyle = '#D2B48C'; // Saddle brown for wooden hull        ctx.fill(this.path!);
        ctx.strokeStyle = '#654321'; // Darker brown for outline
        ctx.lineWidth = 10;
        ctx.stroke(this.path!);
        
        // Draw boarding ladder at the stern (rear) of the ship
        this.drawBoardingLadder(ctx);
        
        // Restore context
        ctx.restore();
    }/**
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
        
        // Draw boarding ladder in debug mode too
        this.drawBoardingLadder(ctx);
            // Draw hull points for reference
        const p = Brigantine.HULL_POINTS;
        const points = [p.bow, p.bowTip, p.bowBottom, p.sternBottom, p.sternTip, p.stern];
        
        for (const point of points) {
            ctx.fillStyle = Color.DEBUG_PHYSICS;
            ctx.beginPath();
            ctx.arc(point.x, point.y, 3, 0, Math.PI * 2);
            ctx.fill();
        }
        
        // Draw ladder rectangle (precise hover area)
        ctx.strokeStyle = this.playerIsHovering ? 'rgba(0, 255, 0, 0.8)' : 'rgba(255, 255, 0, 0.5)';
        ctx.fillStyle = this.playerIsHovering ? 'rgba(0, 255, 0, 0.3)' : 'rgba(255, 255, 0, 0.2)';
        ctx.lineWidth = 2;
        ctx.fillRect(this.ladderRect.x, this.ladderRect.y, this.ladderRect.width, this.ladderRect.height);
        ctx.strokeRect(this.ladderRect.x, this.ladderRect.y, this.ladderRect.width, this.ladderRect.height);
        
        // Draw ladder detection distance circle (70 units)
        const ladderPos = { 
            x: this.ladderRect.x + this.ladderRect.width / 2, 
            y: this.ladderRect.y + this.ladderRect.height / 2 
        };
        
        ctx.beginPath();
        ctx.arc(ladderPos.x, ladderPos.y, 70, 0, Math.PI * 2);
        ctx.strokeStyle = this.playerInLadderArea ? 'rgba(0, 255, 0, 0.5)' : 'rgba(255, 165, 0, 0.3)';
        ctx.setLineDash([5, 5]);
        ctx.stroke();
        ctx.setLineDash([]);
        
        // Add a small dot at the ladder center
        ctx.beginPath();
        ctx.arc(ladderPos.x, ladderPos.y, 3, 0, Math.PI * 2);
        ctx.fillStyle = 'red';
        ctx.fill();
        
        // Draw text indication for ladder state
        ctx.fillStyle = 'white';
        ctx.font = '10px Arial';
        ctx.textAlign = 'center';
        if (this.playerInLadderArea && this.playerIsHovering) {
            ctx.fillText('Press E to Board (In Range & Hovering)', this.ladderRect.x + this.ladderRect.width/2, this.ladderRect.y - 5);
        } else if (this.playerInLadderArea) {
            ctx.fillText('In Range (Hover to Board)', this.ladderRect.x + this.ladderRect.width/2, this.ladderRect.y - 5);
        } else {
            ctx.fillText('Ladder - Get Closer & Hover', this.ladderRect.x + this.ladderRect.width/2, this.ladderRect.y - 5);
        }
        
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
    }    /**
     * Explicitly synchronize visual coordinates with physics body
     * This method forces the visual position and rotation to match the physics body,
     * useful as a last resort if they get out of sync
     */
    public syncWithPhysics(): void {
        if (!this.body) return;
        
        // Update position and rotation directly from physics body
        this.position.x = this.body.position.x;
        this.position.y = this.body.position.y;
        this.rotation = this.body.angle;
        
        console.log(`Brigantine force-synced with physics body:
            Position: (${this.position.x.toFixed(2)}, ${this.position.y.toFixed(2)})
            Rotation: ${this.rotation.toFixed(4)} rad
        `);
    }    /**
     * Draw a boarding ladder at the stern (rear) of the ship
     * @param ctx The canvas rendering context
     */
    private drawBoardingLadder(ctx: CanvasRenderingContext2D): void {
        const p = Brigantine.HULL_POINTS;
        
        // Position the ladder at the stern of the ship
        // Calculate the ladder position - centered at the stern
        const ladderWidth = 30;
        const ladderLength = 60;
        const ladderX = p.sternTip.x + 30; // Position it a bit forward from the very tip
        const ladderY = 0; // Center it vertically
        
        // Store the ladder rectangle in local coordinates for collision detection
        this.ladderRect = {
            x: ladderX,
            y: ladderY - ladderWidth/2,
            width: ladderLength,
            height: ladderWidth
        };
        
        // Change color if player is hovering over the ladder
        let baseFillColor = '#8B4513'; // Default saddle brown
        let highlightFillColor = '#A0522D'; // Default sienna
        
        if (this.playerIsHovering && this.playerInLadderArea) {
            // Highlight colors when player is hovering
            baseFillColor = '#B25D25'; // Lighter brown
            highlightFillColor = '#CD853F'; // Peru - even lighter brown
            
            // Draw interaction prompt if player is hovering
            const promptY = ladderY - ladderWidth/2 - 15;
            ctx.fillStyle = 'white';
            ctx.font = '12px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('Press E to board', ladderX + ladderLength/2, promptY);
        }
          // Create a gradient for 3D effect
        const gradient = ctx.createLinearGradient(
            ladderX, ladderY,
            ladderX + ladderLength, ladderY
        );
        gradient.addColorStop(0, baseFillColor);
        gradient.addColorStop(0.5, highlightFillColor);
        gradient.addColorStop(1, baseFillColor);
        
        // Draw the ladder base (plank) with gradient
        ctx.fillStyle = gradient;
        ctx.fillRect(ladderX, ladderY - ladderWidth/2, ladderLength, ladderWidth);
        
        // Add a border to the ladder
        ctx.strokeStyle = '#654321'; // Darker brown
        ctx.lineWidth = 2;
        ctx.strokeRect(ladderX, ladderY - ladderWidth/2, ladderLength, ladderWidth);
        
        // Draw interaction prompt if player is close enough and hovering
        if (this.playerInLadderArea && this.playerIsHovering) {
            const promptY = ladderY - ladderWidth/2 - 15;
            ctx.fillStyle = 'white';
            ctx.font = '12px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('Press E to board', ladderX + ladderLength/2, promptY);
            
            // Add a subtle highlight/glow effect
            ctx.strokeStyle = 'rgba(255, 255, 200, 0.5)';
            ctx.lineWidth = 3;
            ctx.strokeRect(ladderX - 2, ladderY - ladderWidth/2 - 2, ladderLength + 4, ladderWidth + 4);
        }
        
        // Draw ladder rungs
        ctx.strokeStyle = '#654321'; // Darker brown
        ctx.lineWidth = 3;
        
        const rungCount = 5;
        const rungSpacing = ladderLength / (rungCount + 1);
        
        for (let i = 1; i <= rungCount; i++) {
            const rungX = ladderX + i * rungSpacing;
            
            // Draw a rung
            ctx.beginPath();
            ctx.moveTo(rungX, ladderY - ladderWidth/2 + 3);
            ctx.lineTo(rungX, ladderY + ladderWidth/2 - 3);
            ctx.stroke();
        }
        
        // Add some shadow for depth
        ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
        ctx.fillRect(ladderX, ladderY - ladderWidth/2, ladderLength, 5);
        
        // Add some ropes attaching the ladder to the ship
        ctx.strokeStyle = '#5E2605'; // Dark brown for ropes
        ctx.lineWidth = 2;
        
        // Left rope
        ctx.beginPath();
        ctx.moveTo(ladderX, ladderY - ladderWidth/2);
        ctx.lineTo(ladderX - 15, ladderY - ladderWidth/2 - 10);
        ctx.stroke();
        
        // Right rope
        ctx.beginPath();
        ctx.moveTo(ladderX, ladderY + ladderWidth/2);
        ctx.lineTo(ladderX - 15, ladderY + ladderWidth/2 + 10);
        ctx.stroke();
    }    /**
     * Get the ladder position in world coordinates
     */
    public getLadderWorldPosition(): { x: number, y: number } {
        if (!this.body) return { x: 0, y: 0 };
        
        // Get the ladder center in local coordinates
        const ladderCenterLocalX = this.ladderRect.x + this.ladderRect.width / 2;
        const ladderCenterLocalY = this.ladderRect.y + this.ladderRect.height / 2;
        
        // Transform to world coordinates
        const cos = Math.cos(this.rotation);
        const sin = Math.sin(this.rotation);
        const worldX = this.position.x + (ladderCenterLocalX * cos - ladderCenterLocalY * sin);
        const worldY = this.position.y + (ladderCenterLocalX * sin + ladderCenterLocalY * cos);
        
        return { x: worldX, y: worldY };
    }
    
    /**
     * Check if a point in world coordinates is close enough to the ladder
     */
    public isPointInLadderArea(worldX: number, worldY: number, maxDistance: number = 50): boolean {
        if (!this.body) return false;
        
        // Get ladder position in world coordinates
        const ladderPos = this.getLadderWorldPosition();
        
        // Calculate distance from point to ladder center
        const dx = worldX - ladderPos.x;
        const dy = worldY - ladderPos.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // Check if the distance is within the interaction range
        return distance <= maxDistance;
    }
    
    /**
     * Check if a point in world coordinates is hovering over the ladder
     */
    public isPointHoveringLadder(worldX: number, worldY: number): boolean {
        if (!this.body) return false;
        
        // Transform the world coordinates to ship's local coordinates
        // First, translate to be relative to ship center
        const relX = worldX - this.position.x;
        const relY = worldY - this.position.y;
        
        // Then rotate to align with ship's local coordinate system
        const cos = Math.cos(-this.rotation);
        const sin = Math.sin(-this.rotation);
        const localX = relX * cos - relY * sin;
        const localY = relX * sin + relY * cos;
        
        // Check if the transformed point is inside the ladder rectangle
        return (
            localX >= this.ladderRect.x && 
            localX <= this.ladderRect.x + this.ladderRect.width &&
            localY >= this.ladderRect.y && 
            localY <= this.ladderRect.y + this.ladderRect.height
        );
    }
    
    /**
     * Check if the player is hovering over the ladder
     */
    public setPlayerHovering(isHovering: boolean): void {
        this.playerIsHovering = isHovering;
    }
    
    /**
     * Set whether the player is in the ladder area
     */
    public setPlayerInLadderArea(inArea: boolean): void {
        this.playerInLadderArea = inArea;
    }
    
    /**
     * Check if the player can board the ship
     */
    public canPlayerBoard(): boolean {
        return this.playerInLadderArea && this.playerIsHovering;
    }
    
    /**
     * Set whether the player is boarded
     */
    public setPlayerBoarded(boarded: boolean): void {
        this.playerIsBoarded = boarded;
    }
    
    /**
     * Check if the player is currently boarded
     */
    public isPlayerBoarded(): boolean {
        return this.playerIsBoarded;
    }
    
    /**
     * Render additional UI elements when player is boarded
     * @param ctx The canvas rendering context
     */
    public renderBoardedUI(ctx: CanvasRenderingContext2D): void {
        if (!this.playerIsBoarded) return;
        
        // Save context for transformations
        ctx.save();
        
        // Draw a "Press E to Unboard" message at the top of the screen
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(0, 0, ctx.canvas.width, 30);
        
        ctx.fillStyle = 'white';
        ctx.font = '16px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Press E to Unboard', ctx.canvas.width / 2, 20);
        
        // Restore context
        ctx.restore();
    }
}
