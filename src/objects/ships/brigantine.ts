import { Ships } from './ships';
import { Color, CollisionCategories } from '../../utils/color';
import * as Matter from 'matter-js';
import { Physics } from '../../engine/physics';
import { BaseGameObject } from '../objects';
import { createCompleteHullSegments, PlankSegment, getQuadraticPoint } from './plankUtils';
import { SailModule } from '../shipModules/SailModule';
import { WheelModule } from '../shipModules/WheelModule';
import { BaseModule, ModuleTooltipInfo } from '../shipModules/BaseModule';

export class Brigantine extends Ships {
    private sailSize: number;
    path: Path2D | null = null;
    // Add boarding ladder properties
    private ladderRect: { x: number, y: number, width: number, height: number };    private playerInLadderArea: boolean = false;
    private playerIsHovering: boolean = false;    
    private playerIsBoarded: boolean = false;
    
    // Ship modules collections
    public modules: Map<string, BaseModule> = new Map();
    public sails: Map<string, SailModule> = new Map();
    public wheels: Map<string, WheelModule> = new Map();
    
    // Reference to the physics engine
    private physicsEngine: Physics | null = null;
      // Ship sailing properties
    rudderAngle: number = 0;       // Current rudder angle (-30 to +30 degrees)
    sailsOpenness: number = 0;     // Overall sail openness (0-100%)
    currentWindDirection: number = 0; // Current wind direction
    plankHealth: number = 100;     // Health percentage of ship planks
    currentWindPower: number = 0;    // Current wind power
    
    // Ship physics properties
    forwardForce: number = 0;      // Current forward propulsion force
    turningForce: number = 0;      // Current turning force
    momentum: number = 0;          // Ship's current momentum (affects turning)
    isRotatingSails: boolean = false; // Flag to track when sails are being actively rotated
    sailRotationTimer: number = 0;    // Timer to track how long sails have been rotating
    
    // Properties for ship planks (hull segments)
    private plankBodies: Matter.Body[] = [];
    private plankSegments: { 
        start: {x: number, y: number}, 
        end: {x: number, y: number}, 
        thickness: number,
        sectionName: string,
        index: number 
    }[] = [];    constructor(x: number, y: number) {
        // Brigantine is a medium-sized ship
        super(x, y, 80, 30, 100);
        this.sailSize = 40;
          // Initialize ladder rectangle (will be positioned correctly in update)
        this.ladderRect = { x: 0, y: 0, width: 60, height: 30 };
          // Initialize ship modules using the positions from MASTS and WHEEL constants
        const frontSail = new SailModule({ x: Brigantine.MASTS[0].x, y: Brigantine.MASTS[0].y }); // Front mast (165, 0)
        const middleSail = new SailModule({ x: Brigantine.MASTS[1].x, y: Brigantine.MASTS[1].y }); // Middle mast (-35, 0)
        const backSail = new SailModule({ x: Brigantine.MASTS[2].x, y: Brigantine.MASTS[2].y }); // Back mast (-235, 0)
        const wheel = new WheelModule({ x: Brigantine.WHEEL.x, y: Brigantine.WHEEL.y }); // Steering wheel (-90, 0)
        
        // Add modules to the ship
        this.addModule('front_sail', frontSail);
        this.addModule('middle_sail', middleSail);
        this.addModule('back_sail', backSail);
        this.addModule('wheel', wheel);
        
        // Create custom physics body
        this.createPhysicsBody();
    }
    


    /**
     * Add a module to the ship
     */
    addModule(id: string, module: BaseModule): boolean {
        // Store in the general modules map
        this.modules.set(id, module);
        
        // Also store in the type-specific collection
        if (module instanceof SailModule) {
            this.sails.set(id, module);
        } else if (module instanceof WheelModule) {
            this.wheels.set(id, module);
        }
          // Attach the module to the ship
        module.attachToShip(this);
          // Create physics body for the module if the ship has a body
        if (this.body && module.createPhysicsBody) {
            // Use the real physics world if available
            if (this.physicsEngine) {
                module.createPhysicsBody(this.body, this.physicsEngine.getWorld());
                console.log(`Created physics body for module ${id} of type ${module.type} in game physics world`);
            } else {
                // Fallback to a temporary world if no physics engine is set yet
                module.createPhysicsBody(this.body, Matter.World.create({}));
                console.log(`Created physics body for module ${id} of type ${module.type} in temporary world`);
            }
        }
        
        return true;
    }
    
    /**
     * Remove a module from the ship
     */
    removeModule(id: string): boolean {
        if (!this.modules.has(id)) {
            return false;
        }
        
        // Get the module before deleting it
        const module = this.modules.get(id)!;
        
        // Remove module from type-specific collections
        if (module instanceof SailModule) {
            this.sails.delete(id);
        } else if (module instanceof WheelModule) {
            this.wheels.delete(id);
        }
        
        // Remove physics body
        if (module.removePhysicsBody) {
            module.removePhysicsBody();
        }
        
        // Remove from modules map
        this.modules.delete(id);
        
        return true;
    }
    
    /**
     * Set whether the player is boarded
     */    public setPlayerBoarded(boarded: boolean, playerBody?: Matter.Body): void {
        this.playerIsBoarded = boarded;
        
        // If a player body is provided, update its collision filtering
        if (playerBody) {
            if (boarded) {                // When boarded, player should collide with deck elements and modules but not the ship hull or sail fibers
                playerBody.collisionFilter = {
                    category: CollisionCategories.PLAYER,
                    mask: CollisionCategories.DECK_ELEMENT | CollisionCategories.MODULE | 
                          CollisionCategories.ENEMY | CollisionCategories.POWERUP | 
                          CollisionCategories.TREASURE,
                    group: 0
                };
                  // Log that player is now set to collide with deck elements and modules
                console.log("Player boarded ship - Now collides with deck elements and modules");
                console.log(`Collision mask set to: ${playerBody.collisionFilter?.mask?.toString(16) || 'undefined'}`);
                console.log(`MODULE category: ${CollisionCategories.MODULE.toString(16)}`);
                console.log(`DECK_ELEMENT category: ${CollisionCategories.DECK_ELEMENT.toString(16)}`);
                } else {
                // When not boarded, restore normal collision filtering
                playerBody.collisionFilter = {
                    category: CollisionCategories.PLAYER,
                    mask: CollisionCategories.SHIP | CollisionCategories.ENEMY | 
                          CollisionCategories.POWERUP | CollisionCategories.TREASURE | 
                          CollisionCategories.ISLAND,
                    group: 0
                };
                
                // Log that player has normal collision restored
                console.log("Player unboarded ship - Normal collisions restored");
            }
        }
    }
    
    /**
     * Check if the player is currently boarded
     */
    public isPlayerBoarded(): boolean {
        return this.playerIsBoarded;
    }
    
    /**
     * Update boarded player's physics based on ship movement
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
        
        // Update the player's velocity to match the ship's baseline movement
        // This ensures the player moves with the ship but can still be affected by collisions
        const shipVelocityX = shipDeltaX / delta;
        const shipVelocityY = shipDeltaY / delta;
        
        Matter.Body.setVelocity(playerBody, {
            x: playerBody.velocity.x + shipVelocityX,
            y: playerBody.velocity.y + shipVelocityY
        });
        
        // We still need to apply the rotation effect
        Matter.Body.setAngle(playerBody, playerBody.angle + shipDeltaRotation);
    }
    
    /**
     * Remove all constraints connected to plank bodies
     * @param physics The physics engine instance
     */
    private removeAllPlankConstraints(physics: Physics): void {
        if (!this.body) return;
        
        const world = physics.getWorld();
        const allConstraints = Matter.Composite.allConstraints(world);
        
        // Filter constraints connected to this ship's planks
        const plankConstraints = allConstraints.filter(constraint => {
            if (!constraint.bodyA || !constraint.bodyB) return false;
            
            // Check if either body is the ship's body
            const isShipBody = constraint.bodyA === this.body || constraint.bodyB === this.body;
            
            // Check if either body is a plank body
            const isPlankBody = this.plankBodies.includes(constraint.bodyA) || 
                              this.plankBodies.includes(constraint.bodyB);
            
            return isShipBody && isPlankBody;
        });
        
        // Remove each constraint
        if (plankConstraints.length > 0) {
            console.log(`Removing ${plankConstraints.length} plank constraints`);
            for (const constraint of plankConstraints) {
                Matter.World.remove(world, constraint);
            }
        }
    }
    
    /**
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
        
        // Remove any existing constraints
        this.removeAllPlankConstraints(physics);
        
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
                
                // Calculate world position based on ship position and rotation
                const cosRot = Math.cos(this.rotation);
                const sinRot = Math.sin(this.rotation);
                const worldX = this.position.x + midX * cosRot - midY * sinRot;
                const worldY = this.position.y + midX * sinRot + midY * cosRot;
                
                // Create a rectangle body for the segment
                const body = Matter.Bodies.rectangle(
                    worldX,
                    worldY,
                    length,
                    segment.thickness,
                    {
                        angle: this.rotation + angle,
                        isStatic: true, // Make planks static - they won't be affected by physics
                        collisionFilter: {
                            category: CollisionCategories.DECK_ELEMENT,
                            mask: CollisionCategories.PLAYER | CollisionCategories.PROJECTILE,
                            group: 0 // Zero group means normal collision filtering applies
                        },
                        render: {
                            visible: false // We'll render these manually
                        },
                        label: `brigantine_plank_${segment.sectionName}_${segment.index}`
                    }
                );
                
                // Set the body to be a solid physics body, not a sensor
                body.isSensor = false;
                
                // Add the body to the world
                Matter.World.add(physics.getWorld(), body);
                
                // Store the body for later reference
                this.plankBodies.push(body);
            } catch (error) {
                console.error("Error creating plank body:", error);
            }
        }
        
        console.log(`Created ${this.plankBodies.length} plank bodies for brigantine`);    }
    
    /**
     * Create physics bodies for the masts
     * Note: This is now only used for masts that don't have a SailModule
     * SailModule creates its own physics bodies
     * @param physics Physics engine instance
     */
    public createMastBodies(physics: Physics): void {
        console.log("Skipping direct mast body creation as SailModule handles this now");
        // The ship modules (SailModule) now handle their own physics bodies
        // This method is kept for backward compatibility and future non-module masts
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
                
                // Calculate segment properties in local space
                const midX = (segment.start.x + segment.end.x) / 2;
                const midY = (segment.start.y + segment.end.y) / 2;
                
                // Calculate segment angle in local space
                const segmentAngle = Math.atan2(
                    segment.end.y - segment.start.y,
                    segment.end.x - segment.start.x
                );
                
                // Calculate world position based on ship position and rotation
                const cosRot = Math.cos(this.rotation);
                const sinRot = Math.sin(this.rotation);
                const worldX = this.position.x + midX * cosRot - midY * sinRot;
                const worldY = this.position.y + midX * sinRot + midY * cosRot;
                
                // Directly set position and rotation without using physics forces
                // This ensures planks move exactly with the ship without constraints
                Matter.Body.setPosition(body, { x: worldX, y: worldY });
                Matter.Body.setAngle(body, this.rotation + segmentAngle);
                
                // Reset velocities to match the ship's velocity to ensure consistent movement
                if (this.body) {
                    Matter.Body.setVelocity(body, this.body.velocity);
                    Matter.Body.setAngularVelocity(body, 0);
                }
            }
        } catch (error) {
            console.error("Error updating plank bodies:", error);
        }
    }
    
    /**
     * Override the base update method to also update plank bodies
     */    public override update(delta: number): void {
        // Call the base class update to sync position and rotation with physics body
        super.update(delta);
        
        // Update the plank bodies to match the ship's position and rotation
        if (this.plankBodies.length > 0) {
            this.updatePlankBodies();
        }
        
        // Update ship modules
        if (this.sails) this.sails.forEach(sail => sail.update());
        if (this.wheels) this.wheels.forEach(wheel => wheel.update());
        
        // Update sail rotation timer
        if (this.sailRotationTimer > 0) {
            this.sailRotationTimer -= delta;
            if (this.sailRotationTimer <= 0) {
                this.isRotatingSails = false;
            }
        }
    }
    
    /**
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
    }
    
    /**
     * Create a physics body that represents the hull shape of the brigantine
     */
    protected override createPhysicsBody(): void {
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
            if (len > 0.01) {
                // Expand vertex slightly outward (5% expansion)
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
            {
                inertia: Infinity, // We'll control rotation manually
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
                    inertia: Infinity,
                    friction: 0.01,
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
                        inertia: Infinity,
                        friction: 0.01,
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
    
    /**
     * Get the bounds of the ship for testing walkable area
     */
    private getBounds(): { min: { x: number, y: number }, max: { x: number, y: number }, width: number, height: number } {
        const p = Brigantine.HULL_POINTS;
        
        // Find min and max coordinates from hull points
        const allPoints = [
            p.bow, p.bowTip, p.bowBottom, 
            p.sternBottom, p.sternTip, p.stern
        ];
        
        let minX = Number.MAX_VALUE;
        let minY = Number.MAX_VALUE;
        let maxX = Number.MIN_VALUE;
        let maxY = Number.MIN_VALUE;
        
        for (const point of allPoints) {
            minX = Math.min(minX, point.x);
            minY = Math.min(minY, point.y);
            maxX = Math.max(maxX, point.x);
            maxY = Math.max(maxY, point.y);
        }
        
        return {
            min: { x: minX, y: minY },
            max: { x: maxX, y: maxY },
            width: maxX - minX,
            height: maxY - minY
        };
    }
    
    /**
     * Draw hull-specific shape for the brigantine
     */
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
            // Check if this segment corresponds to a hovered plank
            let isHovered = false;
            
            if (this.hoveredPlankBody) {
                // Calculate center point of this segment
                const centerX = (segment.start.x + segment.end.x) / 2;
                const centerY = (segment.start.y + segment.end.y) / 2;
                
                // Convert to world coordinates
                const worldCenterX = this.position.x + centerX * Math.cos(this.rotation) - centerY * Math.sin(this.rotation);
                const worldCenterY = this.position.y + centerX * Math.sin(this.rotation) + centerY * Math.cos(this.rotation);
                
                // Check if this point is close to the hovered plank body's center
                const hoveredBodyX = this.hoveredPlankBody.position.x;
                const hoveredBodyY = this.hoveredPlankBody.position.y;
                
                // Calculate distance
                const dx = worldCenterX - hoveredBodyX;
                const dy = worldCenterY - hoveredBodyY;
                const distance = Math.sqrt(dx*dx + dy*dy);
                
                // If close enough, consider it hovered
                isHovered = distance < 20; // Adjusted threshold for better matching
            }
            
            // Draw the main plank with highlight if hovered
            ctx.beginPath();
            ctx.moveTo(segment.start.x, segment.start.y);
            ctx.lineTo(segment.end.x, segment.end.y);
            
            // Adjust line width and color if hovered
            if (isHovered) {
                // Save original context
                ctx.save();
                
                // Draw highlighted plank
                ctx.lineWidth = 12; // Slightly thicker for highlight
                ctx.strokeStyle = '#CD853F'; // Lighter brown for highlight
                ctx.stroke();
                
                // Draw yellow glow around the plank
                ctx.lineWidth = 14;
                ctx.strokeStyle = 'rgba(255, 255, 0, 0.5)'; // Semi-transparent yellow
                ctx.stroke();
                
                // Restore original context
                ctx.restore();
            } else {
                // Regular plank drawing
                ctx.stroke();
            }
            
            // Add wood grain texture effect
            ctx.save();
            ctx.lineWidth = 1;
            ctx.strokeStyle = isHovered ? 'rgba(205, 133, 63, 0.6)' : 'rgba(139, 69, 19, 0.5)'; // Lighter for hovered planks
            
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
            
            // Show different prompt based on if player is already boarded
            if (this.playerIsBoarded) {
                ctx.fillText('Press E to disembark', ladderX + ladderLength/2, promptY);
            } else {
                ctx.fillText('Press E to board', ladderX + ladderLength/2, promptY);
            }
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
    }    /**
     * Define the mast positions for the ship
     */    private static readonly MASTS = [
        { x: 165, y: 0, r: 15 },   // Front mast
        { x: -35, y: 0, r: 15 },   // Middle mast
        { x: -235, y: 0, r: 15 },  // Back mast
    ];
    
    /**
     * Define the wheel position and shape
     */
    private static readonly WHEEL = { x: -90, y: 0, w: 20, h: 40 };/**
     * Draw the ship's masts
     * Note: This only draws mast bases. The SailModule handles drawing the mast posts and sails.
     */    private drawMasts(ctx: CanvasRenderingContext2D): void {
        // No longer draw mast bases here as the SailModule handles all mast drawing
        // This method is kept for backward compatibility but doesn't draw anything
        // The visual mast appearance is now fully managed by the SailModule
    }
    
    /**
     * Set whether the player is in range of the ladder area
     */
    public setPlayerInLadderArea(inArea: boolean): void {
        this.playerInLadderArea = inArea;
    }
    
    /**
     * Set whether the player's cursor is hovering over the ladder
     */
    public setPlayerHovering(hovering: boolean): void {
        this.playerIsHovering = hovering;
    }
    
    /**
     * Check if a point is within the ladder area plus some margin
     */
    public isPointInLadderArea(x: number, y: number, margin: number): boolean {
        if (!this.body) return false;
        
        // Convert world coordinates to local ship coordinates
        const localPos = this.worldToLocalCoordinates(x, y);
        
        // Calculate ladder center in local coordinates
        const ladderCenterX = this.ladderRect.x + this.ladderRect.width / 2;
        const ladderCenterY = this.ladderRect.y + this.ladderRect.height / 2;
        
        // Calculate distance to ladder center
        const dx = localPos.x - ladderCenterX;
        const dy = localPos.y - ladderCenterY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // Return true if point is within specified margin of ladder center
        return distance <= margin;
    }
    
    /**
     * Check if a point is directly over the ladder for hovering/interaction
     */
    public isPointHoveringLadder(x: number, y: number): boolean {
        if (!this.body) return false;
        
        // Convert world coordinates to local ship coordinates
        const localPos = this.worldToLocalCoordinates(x, y);
        
        // Check if point is within ladder rectangle
        return (
            localPos.x >= this.ladderRect.x &&
            localPos.x <= this.ladderRect.x + this.ladderRect.width &&
            localPos.y >= this.ladderRect.y &&
            localPos.y <= this.ladderRect.y + this.ladderRect.height
        );
    }
    
    /**
     * Convert world coordinates to local ship coordinates
     */
    private worldToLocalCoordinates(worldX: number, worldY: number): { x: number, y: number } {
        if (!this.body) {
            return { x: 0, y: 0 };
        }
        
        // Translate by ship position
        const dx = worldX - this.position.x;
        const dy = worldY - this.position.y;
        
        // Rotate by ship rotation (counter-clockwise)
        const cos = Math.cos(-this.rotation);
        const sin = Math.sin(-this.rotation);
        
        // Apply rotation transform
        return {
            x: dx * cos - dy * sin,
            y: dx * sin + dy * cos
        };
    }
    
    /**
     * Render UI elements for when the player is boarded
     */
    public renderBoardedUI(ctx: CanvasRenderingContext2D): void {
        if (!this.playerIsBoarded) return;
        
        // Save context
        ctx.save();
        
        // Add a small indicator that the player is on the ship
        ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.font = '14px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Onboard Ship - Press E to disembark', ctx.canvas.width / 2, 40);
        
        // Restore context
        ctx.restore();
    }
      /**
     * Test and visualize the walkable area on the ship deck for debugging
     */
    private testWalkableArea(ctx: CanvasRenderingContext2D, pointCount: number): void {
        if (!this.path) return;
        
        // Save context
        ctx.save();
        
        // Create a grid of test points covering the ship's area
        const bounds = this.getBounds();
        const stepX = bounds.width / pointCount;
        const stepY = bounds.height / pointCount;
        
        // Transform to ship's local coordinates
        ctx.translate(this.position.x, this.position.y);
        ctx.rotate(this.rotation);
        
        // Test each point to see if it's inside the ship's hull
        for (let x = bounds.min.x; x <= bounds.max.x; x += stepX) {
            for (let y = bounds.min.y; y <= bounds.max.y; y += stepY) {
                // Local coordinates for the test point
                const localX = x - this.position.x;
                const localY = y - this.position.y;
                
                // Transform back to world for rendering
                const cos = Math.cos(-this.rotation);
                const sin = Math.sin(-this.rotation);
                const rotatedX = localX * cos - localY * sin;
                const rotatedY = localX * sin + localY * cos;
                
                // Check if point is inside the hull path
                if (ctx.isPointInPath(this.path, rotatedX, rotatedY)) {
                    // Draw a dot at the walkable point
                    ctx.fillStyle = 'rgba(0, 255, 0, 0.3)'; // Green for walkable
                    ctx.beginPath();
                    ctx.arc(rotatedX, rotatedY, 5, 0, Math.PI * 2);
                    ctx.fill();
                }
            }
        }
        
        // Restore context
        ctx.restore();
    }
    
    /**
     * Get the ideal boarding position in local ship coordinates
     * Returns a position just inside the ship from the ladder
     */    public getBoardingPosition(): { x: number, y: number } {
        // Calculate a position inside the ship from the ladder
        // The ladder is at the stern, so move a bit forward from it
        const boardingX = this.ladderRect.x + this.ladderRect.width + 10; // Just inside the ship from the ladder
        const boardingY = 0; // Centered vertically
        
        return { x: boardingX, y: boardingY };
    }
    
    /**
     * Apply rudder control to turn the ship
     */
    applyRudder(direction: 'left' | 'right' | 'center'): void {
        // Make rudder change rate more gradual
        const baseRudderChangeRate = 0.5; // Base rate for rudder change
        
        // Calculate current ship speed
        const currentSpeed = Math.sqrt(
            this.body!.velocity.x ** 2 + 
            this.body!.velocity.y ** 2
        );
        
        // Update the ship's momentum value (used for turning calculations)
        // Momentum builds up more at higher speeds, making turning harder
        this.momentum = Math.min(1.0, this.momentum * 0.95 + currentSpeed * 0.01);

        // Adjust rudder change rate based on current ship speed
        // For visual feedback, we actually want faster rudder movement at higher speeds
        // This gives a value between 0.5 and 1.2 times the base rate
        const visualSpeedFactor = 0.5 + Math.min(0.7, currentSpeed / 3);
        const rudderChangeRate = baseRudderChangeRate * visualSpeedFactor;
        
        // Adjust rudder angle based on input with the dynamic change rate
        switch (direction) {
            case 'left':
                this.rudderAngle = Math.max(-30, this.rudderAngle - rudderChangeRate);
                break;
            case 'right':
                this.rudderAngle = Math.min(30, this.rudderAngle + rudderChangeRate);
                break;
            case 'center':
                // Return rudder to center position
                if (this.rudderAngle > 0) {
                    this.rudderAngle = Math.max(0, this.rudderAngle - rudderChangeRate);
                } else if (this.rudderAngle < 0) {
                    this.rudderAngle = Math.min(0, this.rudderAngle + rudderChangeRate);
                }
                break;
        }
        
        // Update wheel angle to match rudder angle (if we have wheels)
        if (this.wheels.size > 0) {
            // Get the first wheel (typically there's only one)
            const wheel = this.wheels.values().next().value;
            if (wheel) {
                wheel.setWheelAngle(this.rudderAngle);
            }
        }
        
        // Calculate sail power to correlate turning with wind force
        let sailPower = 0;
        let sailCount = 0;
        
        // Calculate average sail openness and efficiency using the typed collection
        this.sails.forEach(sail => {
            if (sail.openness > 0) {
                sailPower += sail.openness;
                sailCount += 1;
            }
        });
        
        // Get average sail power as a factor between 0 and 1
        const avgSailPower = sailCount > 0 ? sailPower / (sailCount * 100) : 0;
        
        // Calculate base turning force with improved speed-based mechanics
        const baseTurningPower = 0.000015; // Base turning power constant
        
        // IMPROVED TURNING LOGIC: Base turning on ship speed
        // At very low speeds: difficult to turn (0.3 effectiveness)
        // At medium speeds: optimal turning (1.0 effectiveness)
        // At high speeds: harder to turn due to momentum (0.5 effectiveness)
        
        // Calculate speed factor - optimal turning at medium speeds
        // This creates a bell curve with max turning at moderate speeds
        const optimalSpeed = 2.0; // Speed at which turning is most effective
        const speedDiff = Math.abs(currentSpeed - optimalSpeed);
        
        // Create a more pronounced bell curve for speed-based turning
        // This makes the difference between low, medium and high speeds more noticeable
        const speedFactor = Math.max(0.25, Math.min(1.0, 1.0 - Math.pow(speedDiff / 3.0, 2)));
        
        // Calculate momentum resistance - faster ships are harder to turn
        // More progressive resistance as momentum builds up
        const momentumResistance = Math.max(0.4, 1.0 - (this.momentum * 0.6));
        
        // Combine factors for final turn effectiveness
        const turnEffectiveness = speedFactor * momentumResistance;
        
        // Apply sail power as a factor (no sails = reduced turning)
        // Increased minimum turning capability even with closed sails
        // Make turning more directly dependent on sail openness
        const minTurnFactor = 0.35; // Minimum turning factor with no sails (increased from 0.3)
        const maxTurnFactor = 1.0;  // Maximum turning factor with full sails
        const sailFactor = minTurnFactor + ((maxTurnFactor - minTurnFactor) * avgSailPower);
        
        // Calculate final turning force
        this.turningForce = this.rudderAngle * baseTurningPower * turnEffectiveness * sailFactor;
        
        // Apply the turning force as a torque
        // We now apply force even when the ship is stationary (as long as sails are open)
        // This allows the ship to start turning from a standstill
        if (currentSpeed > 0.05 || avgSailPower > 0) {
            Matter.Body.setAngularVelocity(this.body!, this.body!.angularVelocity + this.turningForce);
        }
    }
    
    /**
     * Calculate the efficiency of the sails based on their angle relative to the wind
     */
    calculateSailEfficiency(): number {
        // Get sail angles across all sails
        let totalEfficiency = 0;
        let sailCount = 0;
        
        // Use the typed sails collection
        this.sails.forEach(sailModule => {
            if (sailModule.openness > 0) {
                const sailAngle = sailModule.angle;
                
                // Calculate angle between wind and sail
                // We need to account for:
                // 1. The ship's orientation (body.angle)
                // 2. The sail's rotation relative to the ship (sailAngle)
                // 3. The wind direction
                
                // Convert sail angle from degrees to radians
                const sailAngleRad = sailAngle * Math.PI / 180;
                
                // Calculate the sail's normal vector (perpendicular to sail face)
                // The sail normal is perpendicular to its face and indicates which way it's pointing
                const sailNormalAngle = this.body!.angle + sailAngleRad + Math.PI/2; // Add 90 degrees to get normal
                
                // Calculate sail direction vector components (normal to sail face)
                const sailNormalX = Math.cos(sailNormalAngle);
                const sailNormalY = Math.sin(sailNormalAngle);
                
                // Use the wind direction from the ship's current wind direction
                const physicsWindDirection = this.currentWindDirection;
                
                // Calculate wind direction vector components (where the wind is going)
                const windDirX = Math.cos(physicsWindDirection);
                const windDirY = Math.sin(physicsWindDirection);
                
                // Calculate dot product between wind direction and sail normal
                // Positive dot product: wind hits sail from front
                // Negative dot product: wind hits sail from behind
                const dotProduct = windDirX * sailNormalX + windDirY * sailNormalY;
                
                // Calculate angle between wind direction and sail normal vector
                let windSailAngleDiff = Math.acos(Math.min(1, Math.max(-1, dotProduct)));
                
                // Convert angle to degrees
                const angleDiffDegrees = windSailAngleDiff * 180 / Math.PI;
                
                let efficiency = 0;
                
                // Only consider angles within +/- 90 degrees of the wind direction for optimal efficiency
                if (angleDiffDegrees <= 90) {
                    // Linear interpolation from 1.0 (direct) to 0.35 (90 degrees off)
                    // When angleDiffDegrees = 0: efficiency = 1.0
                    // When angleDiffDegrees = 90: efficiency = 0.35
                    efficiency = 1.0 - (0.65 * angleDiffDegrees / 90);
                } else {
                    // Default to 35% efficiency when outside the optimal range
                    efficiency = 0.35;
                }
                
                // Scale efficiency from 0-1 range
                efficiency = Math.min(1, Math.max(0.35, efficiency));
                
                // Scale by sail openness
                const sailOpenness = sailModule.openness / 100;
                
                // Only add angle bonus if we already have some efficiency
                let angleBonus = 0;
                if (efficiency > 0) {
                    // Add a bonus for angled sails - this rewards using the wider range
                    // Sails angled more dramatically catch more wind when appropriate
                    angleBonus = Math.min(0.2, Math.abs(sailAngle) / 75 * 0.2);
                }
                
                // Apply sail openness as a direct multiplier to efficiency
                // This ensures that sail openness directly affects how much power the sail generates
                totalEfficiency += (efficiency + angleBonus) * sailOpenness;
                sailCount++;
            }
        });
        
        // Always provide at least some minimal efficiency when sails are open
        // Return a value between 0 and 1.5 (capped at 150% efficiency)
        if (sailCount > 0) {
            // Base efficiency is the average across all sails
            const baseEfficiency = Math.min(1.5, totalEfficiency / sailCount);
            
            // Ensure there's always a minimum efficiency of 0.2 (20%) when any sails are open
            // This provides a more consistent sailing experience
            return Math.max(0.2, baseEfficiency);
        }
        
        return 0; // No sails open = no efficiency
    }
    
    /**
     * Apply wind force to the ship based on sail efficiency
     */
    applyWindForce(windDirection: number, windPower: number): void {
        // Store current wind values for sail efficiency calculations
        this.currentWindDirection = windDirection;
        this.currentWindPower = windPower;

        // Only apply force if we have open sails
        if (this.sails.size === 0) {
            return;
        }

        // Calculate sail efficiency
        const efficiency = this.calculateSailEfficiency();
        
        // Calculate base force magnitude based on wind power and sail efficiency
        const forceMagnitude = 0.01 * windPower * efficiency;

        // Force is always applied in the direction the ship is facing
        // This simulates the ship's ability to harness wind from various directions
        const forceX = Math.cos(this.body!.angle + Math.PI/2) * forceMagnitude;
        const forceY = Math.sin(this.body!.angle + Math.PI/2) * forceMagnitude;

        // Apply the force at the ship's center of mass
        Matter.Body.applyForce(this.body!, this.body!.position, {
            x: forceX,
            y: forceY
        });

        // Store the forward force for momentum calculations
        this.forwardForce = forceMagnitude;
    }
    
    /**
     * Rotate all sails by a certain angle
     */
    rotateSails(direction: 'left' | 'right' | 'center'): void {
        const rotationRate = 1.25; // Degrees per call
        
        // Store current velocity before rotation
        const currentVelocity = {
            x: this.body!.velocity.x,
            y: this.body!.velocity.y
        };
        
        // Set flag to indicate sails are being rotated (just for animation purposes)
        this.isRotatingSails = true;
        this.sailRotationTimer = 10; // Set timer for how long sails are considered rotating
        
        // Use the typed sails collection
        this.sails.forEach(sail => {
            // Adjust angle based on direction
            switch (direction) {
                case 'left':
                    sail.rotate(-rotationRate); // Use SailModule's rotate method
                    break;
                case 'right':
                    sail.rotate(rotationRate);
                    break;
                case 'center':
                    // Return sails to center position
                    sail.centerAngle(rotationRate);
                    break;
            }
        });
        
        // Restore exact velocity from before rotation to prevent cumulative speed increases
        Matter.Body.setVelocity(this.body!, currentVelocity);
    }
    
    /**
     * Open all sails
     */
    openSails(): void {
        this.sails.forEach((sail) => {
            sail.open();
        });
    }
    
    /**
     * Close all sails
     */
    closeSails(): void {
        this.sails.forEach((sail) => {
            sail.close();
        });
    }
    
    /**
     * Set the physics engine to use for module bodies
     * @param physics The physics engine instance
     */
    public setPhysicsEngine(physics: Physics): void {        this.physicsEngine = physics;
        
        // Recreate module physics bodies if they already exist
        this.modules.forEach((module: BaseModule) => {
            if (this.body && module.createPhysicsBody) {
                // Remove old body first
                module.removePhysicsBody();
                
                // Create new body in the right world
                module.createPhysicsBody(this.body, physics.getWorld());
                console.log(`Recreated physics body for module ${module.type}`);
            }
        });
    }
    
    /**
     * Check if a point is hovering over any module on the ship
     * Returns the module being hovered over, or null if none
     */
    public getModuleAtPoint(x: number, y: number): BaseModule | null {
        // First check all masts/sails
        for (const [id, module] of this.sails) {
            if (module.isPointHovering(x, y)) {
                return module;
            }
        }
        
        // Then check all wheels
        for (const [id, module] of this.wheels) {
            if (module.isPointHovering(x, y)) {
                return module;
            }
        }        // Check if it's hovering over a plank
        if (this.isPointHoveringPlank(x, y)) {            // Create a specialized PlankModule class that extends BaseModule
            class PlankModule extends BaseModule {
                private mouseX: number;
                private mouseY: number;
                private ship: Brigantine;
                
                constructor(ship: Brigantine, mouseX: number, mouseY: number) {
                    super('plank', { x: 0, y: 0 });
                    this.attachToShip(ship);
                    this.ship = ship;
                    this.mouseX = mouseX;
                    this.mouseY = mouseY;
                    
                    // Set plank-specific tooltip info
                    this.name = "Ship Plank";
                    this.description = "Structural component of the ship's hull";
                    this.health = ship.plankHealth;
                    this.maxHealth = 100;
                    this.quality = "Standard";
                    this.effectiveness = ship.plankHealth / 100;
                    this.useInstruction = "Repair with wood resources";
                    
                    // Set hovered state to true immediately
                    this.setHovered(true);
                }
                
                // Override getWorldPosition to return mouse position
                override getWorldPosition(): { x: number, y: number } {
                    return { x: this.mouseX, y: this.mouseY };
                }
                
                // Properly override the getTooltipInfo method
                override getTooltipInfo(): ModuleTooltipInfo {
                    return {
                        name: this.name,
                        description: this.description,
                        health: this.health,
                        maxHealth: this.maxHealth,
                        quality: this.quality,
                        effectiveness: this.effectiveness,
                        useInstruction: this.useInstruction
                    };
                }
            }
            
            // Create a new instance of the PlankModule class with mouse position
            return new PlankModule(this, x, y);
        }
        
        return null;
    }    /**
     * Check if a point is hovering over any ship plank
     */
    private isPointHoveringPlank(x: number, y: number): boolean {
        if (!this.plankBodies || this.plankBodies.length === 0) {
            console.log("No plank bodies found for hover check");
            this.hoveredPlankBody = null;
            return false;
        }
        
        // Use Matter.js Query.point to check if the point is inside any plank body
        const world = this.physicsEngine ? this.physicsEngine.getWorld() : null;
        if (!world) {
            console.warn("Physics world not available for plank hover check");
            this.hoveredPlankBody = null;
            return false;
        }
        
        // First check using Matter.js Query for more accurate collision detection
        const bodiesAtPoint = Matter.Query.point(this.plankBodies, { x, y });
        
        if (bodiesAtPoint.length > 0) {
            console.log(`Hovering over plank with health: ${this.plankHealth}% (Query.point)`);
            this.hoveredPlankBody = bodiesAtPoint[0];
            return true;
        }
        
        // As a fallback, check each plank body's bounds
        for (const plank of this.plankBodies) {
            // Get plank bounds
            const bounds = plank.bounds;
            
            // For debugging, log some plank bodies' positions and bounds
            if (Math.random() < 0.01) { // Only log occasionally to avoid console spam
                console.log(`Plank body position: (${plank.position.x}, ${plank.position.y}), ` +
                            `bounds: (${bounds.min.x}, ${bounds.min.y}) to (${bounds.max.x}, ${bounds.max.y}), ` +
                            `mouse at: (${x}, ${y})`);
            }
            
            // Simple bounds check
            if (x >= bounds.min.x && x <= bounds.max.x && 
                y >= bounds.min.y && y <= bounds.max.y) {
                
                // More precise check for rotated rectangles
                // Convert point to local coordinates relative to plank
                const cosA = Math.cos(-plank.angle);
                const sinA = Math.sin(-plank.angle);
                const dx = x - plank.position.x;
                const dy = y - plank.position.y;
                const localX = dx * cosA - dy * sinA;
                const localY = dx * sinA + dy * cosA;
                
                // Get half width and height of plank
                const halfWidth = (bounds.max.x - bounds.min.x) / 2;
                const halfHeight = (bounds.max.y - bounds.min.y) / 2;
                
                // Check if point is within the rectangle in local coordinates
                if (Math.abs(localX) <= halfWidth && Math.abs(localY) <= halfHeight) {
                    console.log(`Hovering over plank with health: ${this.plankHealth}% (precise check)`);
                    this.hoveredPlankBody = plank;
                    return true;
                }
            }
        }
        
        this.hoveredPlankBody = null;
        return false;
    }
    
    /**
     * Set the health of ship's planks (0-100%)
     */
    public setPlankHealth(health: number): void {
        this.plankHealth = Math.max(0, Math.min(100, health));
    }
    
    /**
     * Get the current health of ship's planks
     */
    public getPlankHealth(): number {
        return this.plankHealth;
    }
    
    /**
     * Damage the ship's planks
     * @param amount Amount of damage to apply (0-100)
     */
    public damagePlanks(amount: number): void {
        this.plankHealth = Math.max(0, this.plankHealth - amount);
        
        // If plank health is critical, apply visual effects
        if (this.plankHealth < 30) {
            // TODO: Add visual indicators of ship damage
            console.log(`Ship planks critically damaged: ${this.plankHealth}% health remaining`);
        }
    }
    
    /**
     * Repair the ship's planks
     * @param amount Amount of health to restore (0-100)
     */
    public repairPlanks(amount: number): void {
        this.plankHealth = Math.min(100, this.plankHealth + amount);
    }
    
    /**
     * Draw the ship
     */
    public render(ctx: CanvasRenderingContext2D): void {
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
          // Draw the boarding ladder
        this.drawBoardingLadder(ctx);
        
        // No longer call drawMasts since SailModule handles all mast drawing        // Draw ship modules
        this.modules.forEach((module: BaseModule) => {
            if (module instanceof SailModule) {
                module.draw(ctx);
            } else if (module instanceof WheelModule) {
                module.draw(ctx);
            }
        });
        
        // Restore context
        ctx.restore();
        
        // Add debug visualization for plank bodies when debug mode is on
        if (BaseGameObject.isDebugMode()) {
            this.renderPlankBodyDebug(ctx);
        }
    }
    
    /**
     * Draw debug outlines for plank bodies to help with hover detection debugging
     */
    private renderPlankBodyDebug(ctx: CanvasRenderingContext2D): void {
        if (!this.plankBodies || this.plankBodies.length === 0) return;
        
        ctx.save();
        
        // Draw outlines for each plank body
        for (const plank of this.plankBodies) {
            const bounds = plank.bounds;
            
            // Draw bounds as a rectangle
            ctx.strokeStyle = 'rgba(255, 0, 255, 0.5)'; // Magenta for bounds
            ctx.lineWidth = 1;
            ctx.strokeRect(
                bounds.min.x, 
                bounds.min.y,
                bounds.max.x - bounds.min.x,
                bounds.max.y - bounds.min.y
            );
            
            // Draw the actual rotated rectangle shape
            ctx.save();
            ctx.translate(plank.position.x, plank.position.y);
            ctx.rotate(plank.angle);
            
            // Calculate half width and height
            const halfWidth = (bounds.max.x - bounds.min.x) / 2;
            const halfHeight = (bounds.max.y - bounds.min.y) / 2;
            
            // Draw rectangle centered at origin (0,0)
            ctx.strokeStyle = 'rgba(0, 255, 255, 0.7)'; // Cyan for actual shape
            ctx.lineWidth = 2;
            ctx.strokeRect(-halfWidth, -halfHeight, halfWidth * 2, halfHeight * 2);
            
            ctx.restore();
        }
        
        ctx.restore();
    }
    
    /**
     * Test if mouse hover detection is working by force-checking at the current mouse position
     * This is a debugging method to be called from the console
     */
    public testPlankHover(mouseX: number, mouseY: number): void {
        console.log(`Testing plank hover at (${mouseX}, ${mouseY})`);
        console.log(`Plank bodies count: ${this.plankBodies ? this.plankBodies.length : 0}`);
        
        // Test if the point is hovering over any plank
        const isHovering = this.isPointHoveringPlank(mouseX, mouseY);
        console.log(`Is hovering over plank: ${isHovering}`);
        
        // Log some sample plank bodies for debugging
        if (this.plankBodies && this.plankBodies.length > 0) {
            console.log("Sample plank bodies:");
            for (let i = 0; i < Math.min(3, this.plankBodies.length); i++) {
                const plank = this.plankBodies[i];
                console.log(`Plank ${i}: position=(${plank.position.x}, ${plank.position.y}), ` +
                            `angle=${plank.angle}, ` +
                            `bounds=((${plank.bounds.min.x}, ${plank.bounds.min.y}), (${plank.bounds.max.x}, ${plank.bounds.max.y}))`);
            }
        }
    }
  

    // Track the currently hovered plank body
    private hoveredPlankBody: Matter.Body | null = null;
}
