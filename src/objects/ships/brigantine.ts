import { Ships } from './ships';
import { Color, CollisionCategories } from '../../utils/color';
import * as Matter from 'matter-js';
import { Physics } from '../../engine/physics';
import { BaseGameObject } from '../objects';
import { createCompleteHullSegments, PlankSegment, getQuadraticPoint } from './plankUtils';

export class Brigantine extends Ships {
    private sailSize: number;
    path: Path2D | null = null;
    // Add boarding ladder properties
    private ladderRect: { x: number, y: number, width: number, height: number };
    private playerInLadderArea: boolean = false;
    private playerIsHovering: boolean = false;
    private playerIsBoarded: boolean = false;
      // Properties for ship planks (hull segments)
    private plankBodies: Matter.Body[] = [];
    private plankSegments: { 
        start: {x: number, y: number}, 
        end: {x: number, y: number}, 
        thickness: number,
        sectionName: string,
        index: number 
    }[] = [];
    
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
        ctx.fillStyle = '#D2B48C'; // Saddle brown for wooden hull        
        ctx.fill(this.path!);
        
        // Draw the planks (instead of a simple stroke)
        this.drawPlanks(ctx);
        
        // Draw masts
        this.drawMasts(ctx);
        
        // Draw wheel
        this.drawWheel(ctx);
        
        // Draw boarding ladder at the stern (rear) of the ship
        this.drawBoardingLadder(ctx);        // Restore context
        ctx.restore();
        
        // If player is boarded, show walkable area in debug mode
        if (this.playerIsBoarded && Ships.isDebugMode()) {
            this.testWalkableArea(ctx, 20);
        }
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
     */    public syncWithPhysics(): void {
        if (!this.body) return;
        
        // Update position and rotation directly from physics body
        this.position.x = this.body.position.x;
        this.position.y = this.body.position.y;
        this.rotation = this.body.angle;
        
        console.log(`Brigantine force-synced with physics body:
            Position: (${this.position.x.toFixed(2)}, ${this.position.y.toFixed(2)})
            Rotation: ${this.rotation.toFixed(4)} rad
        `);
    }
    
    /**
     * Override the base update method to also update plank bodies
     */
    public override update(delta: number): void {
        // Call the base class update to sync position and rotation with physics body
        super.update(delta);
        
        // Update the plank bodies to match the ship's position and rotation
        if (this.plankBodies.length > 0) {
            this.updatePlankBodies();
        }
    }
    
    /**
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
     * Draw the ship's masts
     * @param ctx Canvas context
     */
    private drawMasts(ctx: CanvasRenderingContext2D): void {
        // Draw masts
        for (const mast of Brigantine.MASTS) {
            // Draw mast base
            ctx.fillStyle = '#8B4513'; // Saddle brown
            ctx.beginPath();
            ctx.arc(mast.x, mast.y, mast.r, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#654321'; // Darker brown
            ctx.lineWidth = 2;
            ctx.stroke();
            
            // Draw sail (simple rectangle for now)
            ctx.fillStyle = '#F0F0F0'; // Off-white for sail
            const sailWidth = mast.r * 2;
            const sailHeight = mast.r * 8;
            ctx.fillRect(mast.x - sailWidth/2, mast.y - sailHeight/2, sailWidth, sailHeight);
            ctx.strokeStyle = '#CCCCCC';
            ctx.lineWidth = 1;
            ctx.strokeRect(mast.x - sailWidth/2, mast.y - sailHeight/2, sailWidth, sailHeight);
        }
    }
    
    /**
     * Draw the ship's wheel
     * @param ctx Canvas context
     */
    private drawWheel(ctx: CanvasRenderingContext2D): void {
        const wheel = Brigantine.WHEEL;
        
        // Draw wheel base
        ctx.fillStyle = '#8B4513'; // Saddle brown
        ctx.beginPath();
        ctx.ellipse(wheel.x, wheel.y, wheel.w/2, wheel.h/2, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#654321'; // Darker brown
        ctx.lineWidth = 2;
        ctx.stroke();
        
        // Draw wheel spokes
        ctx.strokeStyle = '#654321';
        ctx.lineWidth = 3;
        const spokes = 8;
        const radius = wheel.w / 2 - 5;
        for (let i = 0; i < spokes; i++) {
            const angle = (i / spokes) * Math.PI * 2;
            ctx.beginPath();
            ctx.moveTo(wheel.x, wheel.y);
            ctx.lineTo(
                wheel.x + Math.cos(angle) * radius,
                wheel.y + Math.sin(angle) * radius
            );
            ctx.stroke();
        }
        
        // Draw wheel center
        ctx.fillStyle = '#654321';
        ctx.beginPath();
        ctx.arc(wheel.x, wheel.y, 5, 0, Math.PI * 2);
        ctx.fill();
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
    
    // Define mast positions and radius for walkable area calculations
    private static readonly MASTS = [
        { x: 100, y: 0, r: 15 },   // Main mast
        { x: -100, y: 0, r: 12 }   // Secondary mast
    ];
    
    // Define wheel position and dimensions
    private static readonly WHEEL = {
        x: -200, y: 0, w: 40, h: 40
    };
    
    /**
     * Checks if a world position is on the ship's deck and walkable
     * @param worldX The x coordinate in world space
     * @param worldY The y coordinate in world space
     * @param ctx Canvas context for checking if point is in the hull path
     * @returns True if the position is on deck and walkable, false otherwise
     */
    public isPositionOnDeck(worldX: number, worldY: number, ctx: CanvasRenderingContext2D): boolean {
        // Transform world coordinates to ship's local space
        const localX = worldX - this.position.x;
        const localY = worldY - this.position.y;
        const cosA = Math.cos(-this.rotation);
        const sinA = Math.sin(-this.rotation);
        const rotatedX = localX * cosA - localY * sinA;
        const rotatedY = localX * sinA + localY * cosA;

        // Check if point is within ship hull boundary
        if (!this.path || !ctx.isPointInPath(this.path, rotatedX, rotatedY)) {
            return false;
        }

        // Check if point is too close to any masts (obstacles)
        for (const mast of Brigantine.MASTS) {
            const dx = rotatedX - mast.x;
            const dy = rotatedY - mast.y;
            // Check if point is within mast radius (plus a small buffer)
            if (dx * dx + dy * dy < Math.pow(mast.r + 10, 2)) {
                return false;
            }
        }

        // Check if point is too close to the wheel
        const wheelDx = rotatedX - Brigantine.WHEEL.x;
        const wheelDy = rotatedY - Brigantine.WHEEL.y;
        // Check if point is within wheel bounds (plus a small buffer)
        if (Math.abs(wheelDx) < Brigantine.WHEEL.w/2 + 10 && Math.abs(wheelDy) < Brigantine.WHEEL.h/2 + 10) {
            return false;
        }

        return true;
    }
    
    /**
     * Transform local ship coordinates to world coordinates
     * @param localX The x coordinate in ship's local space
     * @param localY The y coordinate in ship's local space
     * @returns The coordinates in world space
     */
    public localToWorldCoordinates(localX: number, localY: number): { x: number, y: number } {
        const cosA = Math.cos(this.rotation);
        const sinA = Math.sin(this.rotation);
        return {
            x: this.position.x + (localX * cosA - localY * sinA),
            y: this.position.y + (localX * sinA + localY * cosA)
        };
    }
    
    /**
     * Transform world coordinates to local ship coordinates
     * @param worldX The x coordinate in world space
     * @param worldY The y coordinate in world space
     * @returns The coordinates in ship's local space
     */
    public worldToLocalCoordinates(worldX: number, worldY: number): { x: number, y: number } {
        const localX = worldX - this.position.x;
        const localY = worldY - this.position.y;
        const cosA = Math.cos(-this.rotation);
        const sinA = Math.sin(-this.rotation);
        return {
            x: localX * cosA - localY * sinA,
            y: localX * sinA + localY * cosA
        };
    }
      /**
     * Visualize the walkable area on the ship's deck
     * @param ctx Canvas context for drawing
     * @param gridSize The size of the test grid
     */
    public testWalkableArea(ctx: CanvasRenderingContext2D, gridSize: number = 20): void {
        const width = 500;  // Approximate width of the ship
        const height = 200; // Approximate height of the ship

        // Test a grid of points
        for (let x = -width/2; x <= width/2; x += gridSize) {
            for (let y = -height/2; y <= height/2; y += gridSize) {
                const worldCoords = this.localToWorldCoordinates(x, y);
                const walkable = this.isPositionOnDeck(worldCoords.x, worldCoords.y, ctx);

                // Draw test point
                ctx.beginPath();
                ctx.arc(worldCoords.x, worldCoords.y, 2, 0, Math.PI * 2);
                ctx.fillStyle = walkable ? 'rgba(0, 255, 0, 0.5)' : 'rgba(255, 0, 0, 0.2)';
                ctx.fill();
                
                // For selected points, visualize the force vectors
                if (x % (gridSize * 3) === 0 && y % (gridSize * 3) === 0) {
                    // Try different force directions
                    const testForces = [
                        { x: 0.001, y: 0 },     // Right
                        { x: 0, y: 0.001 },     // Down
                        { x: -0.001, y: 0 },    // Left
                        { x: 0, y: -0.001 }     // Up
                    ];
                    
                    for (const testForce of testForces) {
                        // Calculate adjusted force
                        const adjustedForce = this.calculateDeckMovementForce(
                            worldCoords.x, worldCoords.y,
                            testForce.x, testForce.y,
                            ctx
                        );
                        
                        // Draw force vector
                        const scaleFactor = 2000;  // Scale up the tiny force for visibility
                        ctx.beginPath();
                        ctx.moveTo(worldCoords.x, worldCoords.y);
                        ctx.lineTo(
                            worldCoords.x + adjustedForce.x * scaleFactor,
                            worldCoords.y + adjustedForce.y * scaleFactor
                        );
                        ctx.strokeStyle = 'rgba(0, 100, 255, 0.7)';
                        ctx.lineWidth = 1;
                        ctx.stroke();
                        
                        // Draw arrowhead
                        const arrowSize = 4;
                        const angle = Math.atan2(adjustedForce.y, adjustedForce.x);
                        ctx.beginPath();
                        ctx.moveTo(
                            worldCoords.x + adjustedForce.x * scaleFactor,
                            worldCoords.y + adjustedForce.y * scaleFactor
                        );
                        ctx.lineTo(
                            worldCoords.x + adjustedForce.x * scaleFactor - arrowSize * Math.cos(angle - Math.PI/6),
                            worldCoords.y + adjustedForce.y * scaleFactor - arrowSize * Math.sin(angle - Math.PI/6)
                        );
                        ctx.lineTo(
                            worldCoords.x + adjustedForce.x * scaleFactor - arrowSize * Math.cos(angle + Math.PI/6),
                            worldCoords.y + adjustedForce.y * scaleFactor - arrowSize * Math.sin(angle + Math.PI/6)
                        );
                        ctx.closePath();
                        ctx.fillStyle = 'rgba(0, 100, 255, 0.7)';
                        ctx.fill();
                    }
                }
            }
        }
    }
    
    /**
     * Get a safe position on the ship's deck for teleporting the player when boarding
     * @param ctx Canvas context for checking walkable areas
     * @returns World coordinates for a safe position on deck
     */
    public getDeckPosition(ctx: CanvasRenderingContext2D): { x: number, y: number } {
        // Define a set of potential boarding positions to try
        const potentialPositions = [
            // Near the ladder (back of the ship)
            { x: -220, y: 0 },
            // Middle-back of the ship (between stern and secondary mast)
            { x: -150, y: 0 },
            // Middle of the ship (between masts)
            { x: 0, y: 0 },
            // Port side middle
            { x: 0, y: 50 },
            // Starboard side middle
            { x: 0, y: -50 }
        ];
        
        // Try each position in order until we find one that's walkable
        for (const localPos of potentialPositions) {
            // Convert to world coordinates
            const worldPos = this.localToWorldCoordinates(localPos.x, localPos.y);
            
            // Check if this position is walkable
            if (this.isPositionOnDeck(worldPos.x, worldPos.y, ctx)) {
                return worldPos;
            }
        }
        
        // If all else fails, just return the ship's position (center)
        // This isn't ideal but prevents getting stuck
        return { x: this.position.x, y: this.position.y };
    }
    
    /**
     * Calculate a corrective force for force-based movement on the deck
     * @param worldX Current X position in world coordinates
     * @param worldY Current Y position in world coordinates
     * @param forceX Proposed force X component
     * @param forceY Proposed force Y component
     * @param ctx Canvas context for path checking
     * @returns Modified force that respects deck boundaries
     */
    public calculateDeckMovementForce(
        worldX: number, worldY: number, 
        forceX: number, forceY: number, 
        ctx: CanvasRenderingContext2D
    ): { x: number, y: number } {
        // If no force is applied, just return zero force
        if (forceX === 0 && forceY === 0) {
            return { x: 0, y: 0 };
        }
        
        // Transform position to ship's local space
        const localX = worldX - this.position.x;
        const localY = worldY - this.position.y;
        const cosA = Math.cos(-this.rotation);
        const sinA = Math.sin(-this.rotation);
        const rotatedX = localX * cosA - localY * sinA;
        const rotatedY = localX * sinA + localY * cosA;

        // Transform force to ship's local space
        const localForceX = forceX * cosA - forceY * sinA;
        const localForceY = forceX * sinA + forceY * cosA;
        
        // Boundary check parameters
        const checkDistance = 25; // How far ahead to check
        const edgeRepulsionFactor = 1.5; // How strongly to push away from edges
        let resultForceX = localForceX;
        let resultForceY = localForceY;
        
        // Project the position forward based on the force to check for collisions
        const projectedX = rotatedX + localForceX * checkDistance;
        const projectedY = rotatedY + localForceY * checkDistance;
        
        // Check if the projected position is on the deck
        const onDeck = this.isPointInLocalPath(projectedX, projectedY, ctx);
        
        // Check obstacles (masts)
        let tooCloseToMast = false;
        let closestMast = { x: 0, y: 0, r: 0, dist: Number.MAX_VALUE };
        
        for (const mast of Brigantine.MASTS) {
            const dx = projectedX - mast.x;
            const dy = projectedY - mast.y;
            const distSq = dx * dx + dy * dy;
            const minDistSq = Math.pow(mast.r + 15, 2); // Slightly larger boundary than visual
            
            if (distSq < minDistSq && distSq < closestMast.dist) {
                tooCloseToMast = true;
                closestMast = { ...mast, dist: distSq };
            }
        }
        
        // Check wheel obstacle
        const wheelDx = projectedX - Brigantine.WHEEL.x;
        const wheelDy = projectedY - Brigantine.WHEEL.y;
        const tooCloseToWheel = Math.abs(wheelDx) < Brigantine.WHEEL.w/2 + 15 && 
                               Math.abs(wheelDy) < Brigantine.WHEEL.h/2 + 15;
        
        // Apply corrective forces
        if (!onDeck) {
            // Find the closest edge and apply a repulsive force
            const edgePoints = this.findClosestEdgePoint(rotatedX, rotatedY);
            if (edgePoints) {
                const edgeDx = rotatedX - edgePoints.x;
                const edgeDy = rotatedY - edgePoints.y;
                const edgeDist = Math.sqrt(edgeDx * edgeDx + edgeDy * edgeDy);
                
                if (edgeDist > 0) {
                    // Normalize and apply repulsion
                    resultForceX += (edgeDx / edgeDist) * edgeRepulsionFactor;
                    resultForceY += (edgeDy / edgeDist) * edgeRepulsionFactor;
                }
            }
        }
        
        if (tooCloseToMast) {
            // Apply repulsive force away from mast
            const mastDx = rotatedX - closestMast.x;
            const mastDy = rotatedY - closestMast.y;
            const mastDist = Math.sqrt(mastDx * mastDx + mastDy * mastDy);
            
            if (mastDist > 0) {
                resultForceX += (mastDx / mastDist) * edgeRepulsionFactor;
                resultForceY += (mastDy / mastDist) * edgeRepulsionFactor;
            }
        }
        
        if (tooCloseToWheel) {
            // Apply repulsive force away from wheel
            const wheelDx = rotatedX - Brigantine.WHEEL.x;
            const wheelDy = rotatedY - Brigantine.WHEEL.y;
            const wheelDist = Math.sqrt(wheelDx * wheelDx + wheelDy * wheelDy);
            
            if (wheelDist > 0) {
                resultForceX += (wheelDx / wheelDist) * edgeRepulsionFactor;
                resultForceY += (wheelDy / wheelDist) * edgeRepulsionFactor;
            }
        }
        
        // Normalize the resulting force to maintain consistent force magnitude
        const resultMag = Math.sqrt(resultForceX * resultForceX + resultForceY * resultForceY);
        const originalMag = Math.sqrt(localForceX * localForceX + localForceY * localForceY);
        
        if (resultMag > 0 && originalMag > 0) {
            resultForceX = (resultForceX / resultMag) * originalMag;
            resultForceY = (resultForceY / resultMag) * originalMag;
        }
        
        // Transform force back to world space
        const worldForceX = resultForceX * Math.cos(this.rotation) - resultForceY * Math.sin(this.rotation);
        const worldForceY = resultForceX * Math.sin(this.rotation) + resultForceY * Math.cos(this.rotation);
        
        return { x: worldForceX, y: worldForceY };
    }
    
    /**
     * Check if a point in local ship coordinates is within the hull path
     * @param localX X coordinate in local ship space
     * @param localY Y coordinate in local ship space
     * @param ctx Canvas context for path checking
     * @returns True if the point is within the hull path
     */
    private isPointInLocalPath(localX: number, localY: number, ctx: CanvasRenderingContext2D): boolean {
        if (!this.path) return false;
        return ctx.isPointInPath(this.path, localX, localY);
    }
    
    /**
     * Find the closest point on the hull edge to the given position
     * @param localX X coordinate in local ship space
     * @param localY Y coordinate in local ship space
     * @returns The closest point on the hull edge or null if not found
     */
    private findClosestEdgePoint(localX: number, localY: number): { x: number, y: number } | null {
        // Simplified approach: check in 8 directions from the current position
        // and find the first point that's outside the hull
        const directions = [
            { x: 1, y: 0 },   // right
            { x: 1, y: 1 },   // down-right
            { x: 0, y: 1 },   // down
            { x: -1, y: 1 },  // down-left
            { x: -1, y: 0 },  // left
            { x: -1, y: -1 }, // up-left
            { x: 0, y: -1 },  // up
            { x: 1, y: -1 }   // up-right
        ];
        
        // Use a binary search-like approach to find the edge
        for (const dir of directions) {
            let min = 0;
            let max = 300; // Max search distance
            let edgePoint = null;
            
            // Get canvas for path checking
            const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
            if (!canvas) continue;
            
            const ctx = canvas.getContext('2d');
            if (!ctx || !this.path) continue;
            
            // Binary search to find edge point
            while (max - min > 1) {
                const mid = (min + max) / 2;
                const testX = localX + dir.x * mid;
                const testY = localY + dir.y * mid;
                
                if (ctx.isPointInPath(this.path, testX, testY)) {
                    min = mid;
                } else {
                    max = mid;
                    edgePoint = { x: testX, y: testY };
                }
            }
            
            if (edgePoint) return edgePoint;
        }
        
        return null;
    }
      /**
     * When the player is on board, update their position based on ship movement
     * @param playerBody The player's physics body
     * @param delta Time since last update
     */
    public updateBoardedPlayer(playerBody: Matter.Body, delta: number): void {
        if (!this.body || !this.playerIsBoarded) return;
        
        // Get ship's velocity and angular velocity
        const shipVelocity = this.body.velocity;
        const shipAngularVelocity = this.body.angularVelocity;
        
        // Calculate how much the ship has moved since the last frame
        const shipDeltaX = shipVelocity.x * delta;
        const shipDeltaY = shipVelocity.y * delta;
        
        // Calculate the rotation around the ship's center
        const shipDeltaRotation = shipAngularVelocity * delta;
        
        // Calculate the player's position relative to the ship's center
        const relativeX = playerBody.position.x - this.position.x;
        const relativeY = playerBody.position.y - this.position.y;
        
        // Calculate the new relative position after rotation
        const cosRot = Math.cos(shipDeltaRotation);
        const sinRot = Math.sin(shipDeltaRotation);
        const rotatedRelativeX = relativeX * cosRot - relativeY * sinRot;
        const rotatedRelativeY = relativeX * sinRot + relativeY * cosRot;
        
        // Calculate the player's new position in world space
        const newPlayerX = this.position.x + rotatedRelativeX + shipDeltaX;
        const newPlayerY = this.position.y + rotatedRelativeY + shipDeltaY;
        
        // Update the player's position
        Matter.Body.setPosition(playerBody, { x: newPlayerX, y: newPlayerY });
        
        // We don't update the player's angle as they should still be able to look around freely        // Apply a portion of the ship's velocity to the player to keep them moving with the ship
        // but allow them to still control their own movement
        const playerVelocity = playerBody.velocity;
        const blendFactor = 0.3; // Further reduced to give more control with 10x increased force
        
        const blendedVelocityX = playerVelocity.x * (1 - blendFactor) + shipVelocity.x * blendFactor;
        const blendedVelocityY = playerVelocity.y * (1 - blendFactor) + shipVelocity.y * blendFactor;
        
        Matter.Body.setVelocity(playerBody, { x: blendedVelocityX, y: blendedVelocityY });
    }
      /**
     * Get a vector that applies corrective force to keep the player on the deck
     * @param playerPos Player's current position
     * @param ctx Canvas context for checking boundaries
     * @returns A correction vector to apply as a force
     */
    public getDeckConstraintForce(playerPos: { x: number, y: number }, ctx: CanvasRenderingContext2D): { x: number, y: number } {
        // Transform player position to local ship coordinates
        const localX = playerPos.x - this.position.x;
        const localY = playerPos.y - this.position.y;
        const cosA = Math.cos(-this.rotation);
        const sinA = Math.sin(-this.rotation);
        const rotatedX = localX * cosA - localY * sinA;
        const rotatedY = localX * sinA + localY * cosA;        // Initialize correction vector
        let correctionX = 0;
        let correctionY = 0;
        
        // Base constraint strength - higher values create stronger boundaries
        // Increased by 10x to match the player's increased movement force
        const strengthBase = 0.01;
        
        // Dynamic strength modifier based on ship speed
        const shipSpeedFactor = this.body ? Math.min(1 + this.body.speed * 0.05, 2.0) : 1.0;
        
        // Check if player is on the deck
        const onDeck = this.isPointInLocalPath(rotatedX, rotatedY, ctx);
        if (!onDeck) {
            // Find the closest point on the hull
            const closestPoint = this.findClosestHullPoint(rotatedX, rotatedY, ctx);
            if (closestPoint) {
                // Calculate vector from player to closest point on hull
                const dx = closestPoint.x - rotatedX;
                const dy = closestPoint.y - rotatedY;
                const dist = Math.sqrt(dx * dx + dy * dy);
                
                if (dist > 0) {                // Calculate correction force - stronger when further from deck
                    const strength = strengthBase * shipSpeedFactor * (1 + dist * 0.2);
                    correctionX = (dx / dist) * strength;
                    correctionY = (dy / dist) * strength;
                }
            }
        }
        
        // Check for obstacle collisions (masts, wheel)
        // Check masts
        for (const mast of Brigantine.MASTS) {
            const dx = rotatedX - mast.x;
            const dy = rotatedY - mast.y;
            const distSq = dx * dx + dy * dy;
            const minDistSq = Math.pow(mast.r + 15, 2);
            
            if (distSq < minDistSq) {
                // Player is too close to mast, add repulsive force
                const dist = Math.sqrt(distSq);
                if (dist > 0) {                    // Force gets stronger as player gets closer to mast
                    const strength = strengthBase * shipSpeedFactor * (1 - dist / (mast.r + 15)) * 2.0;
                    correctionX += (dx / dist) * strength;
                    correctionY += (dy / dist) * strength;
                }
            }
        }
        
        // Check wheel
        const wheelDx = rotatedX - Brigantine.WHEEL.x;
        const wheelDy = rotatedY - Brigantine.WHEEL.y;
        const wheelDistSq = wheelDx * wheelDx + wheelDy * wheelDy;
        const minWheelDistSq = Math.pow((Brigantine.WHEEL.w + Brigantine.WHEEL.h) / 4 + 15, 2);
        
        if (wheelDistSq < minWheelDistSq) {
            // Player is too close to wheel, add repulsive force
            const wheelDist = Math.sqrt(wheelDistSq);
            if (wheelDist > 0) {                const strength = strengthBase * shipSpeedFactor * 
                    (1 - wheelDist / ((Brigantine.WHEEL.w + Brigantine.WHEEL.h) / 4 + 15)) * 2.0;
                correctionX += (wheelDx / wheelDist) * strength;
                correctionY += (wheelDy / wheelDist) * strength;
            }
        }
        
        // Convert correction vector back to world space
        const worldCorrectionX = correctionX * Math.cos(this.rotation) - correctionY * Math.sin(this.rotation);
        const worldCorrectionY = correctionX * Math.sin(this.rotation) + correctionY * Math.cos(this.rotation);
        
        return { x: worldCorrectionX, y: worldCorrectionY };
    }
    
    /**
     * Find the closest point on the hull to the given local position
     * @param localX X-coordinate in local ship space
     * @param localY Y-coordinate in local ship space
     * @param ctx Canvas context for path checking
     * @returns The closest point on the hull or null if none found
     */
    private findClosestHullPoint(localX: number, localY: number, ctx: CanvasRenderingContext2D): { x: number, y: number } | null {
        if (!this.path) return null;
        
        // Find closest point by checking in 16 directions (more precise than before)
        const directions = [];
        for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 8) {
            directions.push({ x: Math.cos(angle), y: Math.sin(angle) });
        }
        
        let closestPoint = null;
        let minDistance = Number.MAX_VALUE;
        
        // Search in each direction
        for (const dir of directions) {
            // Start from the point and move outward
            let insidePoint = { x: localX, y: localY };
            let outsidePoint = { 
                x: localX + dir.x * 500, // Far enough to be outside
                y: localY + dir.y * 500
            };
            
            // Binary search to find the edge point
            for (let i = 0; i < 10; i++) { // 10 iterations for precision
                const midPoint = {
                    x: (insidePoint.x + outsidePoint.x) / 2,
                    y: (insidePoint.y + outsidePoint.y) / 2
                };
                
                if (ctx.isPointInPath(this.path, midPoint.x, midPoint.y)) {
                    insidePoint = midPoint;
                } else {
                    outsidePoint = midPoint;
                }
            }
            
            // Calculate distance to the found point
            const dx = insidePoint.x - localX;
            const dy = insidePoint.y - localY;
            const distance = dx * dx + dy * dy;
            
            // Update closest point if this one is closer
            if (distance < minDistance) {
                minDistance = distance;
                closestPoint = insidePoint;
            }
        }
        
        return closestPoint;
    }    /**
     * Create physics bodies for the ship's planks (hull sections)
     * @param physics The physics engine instance
     */    
    public createPlankBodies(physics: Physics): void {
        console.log("Creating plank bodies for brigantine...");
        
        // Clear any existing plank bodies
        if (this.plankBodies.length > 0) {
            console.log(`Removing ${this.plankBodies.length} existing plank bodies`);
            for (const body of this.plankBodies) {
                Matter.World.remove(physics.getWorld(), body);
            }
            this.plankBodies = [];
        }
        
        // Clear segments
        this.plankSegments = [];
        
        // Create plank segments using the utility function
        const plankThickness = 10;
        this.plankSegments = createCompleteHullSegments(plankThickness);
        
        console.log(`Created ${this.plankSegments.length} plank segments`);
        
        // Create physics bodies for each segment
        for (const segment of this.plankSegments) {
            try {
                // Calculate segment properties
                const midX = (segment.start.x + segment.end.x) / 2;
                const midY = (segment.start.y + segment.end.y) / 2;
                
                // Calculate segment length
                const dx = segment.end.x - segment.start.x;
                const dy = segment.end.y - segment.start.y;
                const length = Math.sqrt(dx * dx + dy * dy);
                
                // Calculate segment angle
                const angle = Math.atan2(dy, dx);
                
                // Create a rectangle body for the segment
                const body = Matter.Bodies.rectangle(
                    this.position.x + midX,
                    this.position.y + midY,                    length,
                    segment.thickness,
                    {
                        angle: angle,
                        isStatic: false, // Make planks part of the physics simulation
                        collisionFilter: {
                            category: CollisionCategories.SHIP,
                            mask: CollisionCategories.PLAYER | CollisionCategories.PROJECTILE | 
                                  CollisionCategories.ISLAND,
                            group: -1 // Negative group means bodies in this group never collide with each other
                        },
                        render: {
                            visible: false // We'll render these manually
                        },                        friction: 0.05,
                        frictionAir: 0.01,
                        restitution: 0.2,
                        density: 0.01, // Lower density than the main ship body
                        label: `brigantine_plank_${segment.sectionName}_${segment.index}`
                    }
                );
                
                // Set the body to be a solid physics body, not a sensor
                body.isSensor = false;
                
                // Add the body to the world
                Matter.World.add(physics.getWorld(), body);
                  // Create a constraint to attach the plank to the ship body
                if (this.body) {
                    const constraint = Matter.Constraint.create({
                        bodyA: this.body,
                        bodyB: body,
                        stiffness: 1.0, // Maximum stiffness to keep planks firmly attached
                        length: 0,      // Zero length to prevent any stretching
                        damping: 0.1    // Small amount of damping to prevent vibration
                    });
                    Matter.World.add(physics.getWorld(), constraint);
                }
                
                // Store the body for later reference
                this.plankBodies.push(body);
            } catch (error) {
                console.error("Error creating plank body:", error);
            }
        }
        
        console.log(`Created ${this.plankBodies.length} plank bodies for brigantine`);
    }
      /**
     * Update the physics bodies for the planks based on ship position and rotation
     */
    public updatePlankBodies(): void {
        if (this.plankBodies.length !== this.plankSegments.length) {
            if (BaseGameObject.isDebugMode()) {
                console.warn(`Mismatch between plank bodies (${this.plankBodies.length}) and segments (${this.plankSegments.length})`);
            }
            return;
        }
        
        try {
            for (let i = 0; i < this.plankBodies.length; i++) {
                const segment = this.plankSegments[i];
                const body = this.plankBodies[i];
                
                // Calculate segment properties in world space
                const midX = (segment.start.x + segment.end.x) / 2;
                const midY = (segment.start.y + segment.end.y) / 2;
                
                // Calculate world position based on ship position and rotation
                const cosRot = Math.cos(this.rotation);
                const sinRot = Math.sin(this.rotation);
                const worldX = this.position.x + midX * cosRot - midY * sinRot;
                const worldY = this.position.y + midX * sinRot + midY * cosRot;
                
                // Update body position and rotation
                Matter.Body.setPosition(body, { x: worldX, y: worldY });
                Matter.Body.setAngle(body, this.rotation + Math.atan2(
                    segment.end.y - segment.start.y,
                    segment.end.x - segment.start.x
                ));
            }
        } catch (error) {
            console.error("Error updating plank bodies:", error);
        }
    }
      /**
     * Draw the ship's planks (hull sections)
     * @param ctx The canvas rendering context
     */
    private drawPlanks(ctx: CanvasRenderingContext2D): void {
        // Set plank styling
        ctx.lineWidth = 10;
        ctx.strokeStyle = '#8B4513'; // Darker brown for planks
        
        // Draw each plank segment
        for (const segment of this.plankSegments) {
            // Draw the main plank
            ctx.beginPath();
            ctx.moveTo(segment.start.x, segment.start.y);
            ctx.lineTo(segment.end.x, segment.end.y);
            ctx.stroke();
            
            // Add wood grain texture effect
            ctx.save();
            ctx.lineWidth = 1;
            ctx.strokeStyle = 'rgba(139, 69, 19, 0.5)'; // Transparent darker brown for grain
            
            // Calculate perpendicular direction for grain lines
            const dx = segment.end.x - segment.start.x;
            const dy = segment.end.y - segment.start.y;
            const length = Math.sqrt(dx * dx + dy * dy);
            
            // Normalized perpendicular vector
            const perpX = -dy / length;
            const perpY = dx / length;
            
            // Draw grain lines
            const grainCount = Math.floor(length / 15); // One grain line every ~15 pixels
            for (let i = 0; i <= grainCount; i++) {
                const t = i / grainCount;
                const grainX = segment.start.x + dx * t;
                const grainY = segment.start.y + dy * t;
                
                // Draw a short grain line
                ctx.beginPath();
                ctx.moveTo(grainX - perpX * 3, grainY - perpY * 3);
                ctx.lineTo(grainX + perpX * 3, grainY + perpY * 3);
                ctx.stroke();
            }
            ctx.restore();
            
            // Add some nails/joints
            const numNails = Math.floor(length / 30) + 1; // One nail every ~30 pixels
            
            // Draw nails along the plank
            ctx.fillStyle = '#696969'; // Dark gray for nails
            for (let i = 0; i < numNails; i++) {
                const t = (i + 0.5) / numNails; // Position nails evenly, starting from middle of first segment
                const nailX = segment.start.x + dx * t;
                const nailY = segment.start.y + dy * t;
                
                // Draw a small circle for each nail
                ctx.beginPath();
                ctx.arc(nailX, nailY, 2, 0, Math.PI * 2);
                ctx.fill();
            }        }        // Draw debug visualization of plank bodies if in debug mode
        if (BaseGameObject.isDebugMode() && this.plankBodies.length > 0) {
            // Save the current transform
            ctx.save();
            
            // Draw each plank body
            for (let i = 0; i < this.plankBodies.length; i++) {
                const body = this.plankBodies[i];
                
                // Get the section name from the body label
                const label = body.label as string;
                const section = label.split('_').slice(2).join('_');
                
                // Set different colors based on section for better visualization
                let color = 'rgba(255, 100, 0, 0.8)'; // Default: orange
                
                if (label.includes('port_bow') || label.includes('port_stern')) {
                    color = 'rgba(255, 0, 0, 0.8)'; // Red for port curves
                } else if (label.includes('starboard_bow') || label.includes('starboard_stern')) {
                    color = 'rgba(0, 255, 0, 0.8)'; // Green for starboard curves
                } else if (label.includes('port_side')) {
                    color = 'rgba(255, 100, 100, 0.8)'; // Light red for port side
                } else if (label.includes('starboard_side')) {
                    color = 'rgba(100, 255, 100, 0.8)'; // Light green for starboard side
                }
                
                // Draw body outline with the selected color
                ctx.strokeStyle = color;
                ctx.lineWidth = 2; // Thicker lines
                ctx.setLineDash([]); // Solid lines for plank physics bodies
                
                ctx.beginPath();
                // Apply inverse rotation to get vertices in local space
                const cos = Math.cos(-this.rotation);
                const sin = Math.sin(-this.rotation);
                
                for (let j = 0; j < body.vertices.length; j++) {
                    const vertex = body.vertices[j];
                    // Transform to local space for comparison with visual hull
                    const dx = vertex.x - this.position.x;
                    const dy = vertex.y - this.position.y;
                    const localX = dx * cos - dy * sin;
                    const localY = dx * sin + dy * cos;
                    
                    if (j === 0) {
                        ctx.moveTo(localX, localY);
                    } else {
                        ctx.lineTo(localX, localY);
                    }
                }
                
                // Close the path
                if (body.vertices.length > 0) {
                    const vertex = body.vertices[0];
                    const dx = vertex.x - this.position.x;
                    const dy = vertex.y - this.position.y;
                    const localX = dx * cos - dy * sin;
                    const localY = dx * sin + dy * cos;
                    ctx.lineTo(localX, localY);
                }                
                ctx.stroke();
                ctx.setLineDash([]);
                
                // Add index number to each plank for easier identification
                ctx.fillStyle = 'white';
                ctx.font = '10px Arial';
                
                // Calculate center position of the body
                let centerX = 0;
                let centerY = 0;
                
                for (let j = 0; j < body.vertices.length; j++) {
                    const vertex = body.vertices[j];
                    const dx = vertex.x - this.position.x;
                    const dy = vertex.y - this.position.y;
                    const localX = dx * cos - dy * sin;
                    const localY = dx * sin + dy * cos;
                    
                    centerX += localX;
                    centerY += localY;
                }
                
                if (body.vertices.length > 0) {
                    centerX /= body.vertices.length;
                    centerY /= body.vertices.length;
                    
                    // Draw the index number
                    ctx.fillText(`${i}`, centerX, centerY);
                }
                
                // Draw segment name if in debug mode
                if (i < this.plankSegments.length) {
                    const segment = this.plankSegments[i];
                    const name = `${segment.sectionName}_${segment.index}`;
                    
                    // Get local coordinates of body center
                    const centerX = body.position.x - this.position.x;
                    const centerY = body.position.y - this.position.y;
                    
                    // Transform to local coordinates
                    const localX = centerX * cos - centerY * sin;
                    const localY = centerX * sin + centerY * cos;
                    
                    // Draw label
                    ctx.font = '8px Arial';
                    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
                    ctx.fillText(name, localX, localY);
                }
            }
            
            // Add debug information about planks
            if (BaseGameObject.isDebugMode()) {
                ctx.font = '12px Arial';
                ctx.fillStyle = 'yellow';
                ctx.fillText(`Plank bodies: ${this.plankBodies.length}`, -this.width/2, -this.height/2 - 30);
                ctx.fillText(`Plank segments: ${this.plankSegments.length}`, -this.width/2, -this.height/2 - 15);
            }
            
            // Restore the original transform
            ctx.restore();
        }
    }
    
    /**
     * Override renderDebug to customize the debug visualization
     */
    public override renderDebug(ctx: CanvasRenderingContext2D): void {
        // Call the base implementation first
        super.renderDebug(ctx);
        
        // Only proceed if in debug mode and we have a body
        if (!BaseGameObject.isDebugMode() || !this.body) return;
        
        // Add custom debug visualization for the hull outline with dashed lines
        ctx.save();
        
        // Draw the hull outline with dashed lines

        ctx.strokeStyle = 'rgba(0, 255, 255, 0.7)'; // Cyan color for hull outline
        ctx.lineWidth = 2;
        ctx.setLineDash([8, 4]); // Dashed line pattern
        
        ctx.translate(this.position.x, this.position.y);
        ctx.rotate(this.rotation);
        
        if (this.path) {
            ctx.stroke(this.path);
        }
        
        ctx.restore();
    }
}
