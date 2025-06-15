// SailModule.ts - Specialized class for ship sails
import { BaseModule } from './BaseModule';
import Matter from 'matter-js';
import { getModuleBodyProperties } from '../../utils/modulePhysics';
import { CollisionCategories } from '../../utils/color';

export class SailModule extends BaseModule {
    openness: number = 0; // How open the sail is (0-100%)
    angle: number = 0;    // Angle of the sail relative to the mast (-75 to +75 degrees)
    
    private mastBody: Matter.Body | null = null;
    private sailBody: Matter.Body | null = null;
    
    constructor(position: { x: number; y: number }) {
        super('sail', position, 0); // Sails don't have a rotation property in the same way as cannons
    }
    
    // Set the sail openness
    setOpenness(percent: number): void {
        // Ensure the value is between 0 and 100
        this.openness = Math.max(0, Math.min(100, percent));
    }
    
    // Gradually open the sail by an increment
    open(increment: number = 10): void {
        this.setOpenness(this.openness + increment);
    }
    
    // Gradually close the sail by an increment
    close(increment: number = 10): void {
        this.setOpenness(this.openness - increment);
    }
    
    // Rotate the sail by a certain amount
    rotate(degrees: number): void {
        // Limit the sail angle to -75 to +75 degrees
        this.angle = Math.max(-75, Math.min(75, this.angle + degrees));
    }
    
    // Center the sail angle (move towards 0 degrees)
    centerAngle(increment: number = 1.25): void {
        if (this.angle > 0) {
            this.angle = Math.max(0, this.angle - increment);
        } else if (this.angle < 0) {
            this.angle = Math.min(0, this.angle + increment);
        }
    }
    
    // Calculate sail efficiency based on wind angle (would be called by Ship)
    calculateEfficiency(windDirection: number, shipAngle: number): number {
        // Calculate the sail's normal vector (perpendicular to sail face)
        const sailAngleRad = this.angle * Math.PI / 180;
        const sailNormalAngle = shipAngle + sailAngleRad + Math.PI/2; // Add 90 degrees to get normal
        
        // Calculate sail direction vector components (normal to sail face)
        const sailNormalX = Math.cos(sailNormalAngle);
        const sailNormalY = Math.sin(sailNormalAngle);
        
        // Calculate wind direction vector components (where the wind is going)
        const windDirX = Math.cos(windDirection);
        const windDirY = Math.sin(windDirection);
        
        // Calculate dot product between wind direction and sail normal
        const dotProduct = windDirX * sailNormalX + windDirY * sailNormalY;
        
        // Calculate angle between wind direction and sail normal vector
        let windSailAngleDiff = Math.acos(Math.min(1, Math.max(-1, dotProduct)));
        
        // Convert angle to degrees
        const angleDiffDegrees = windSailAngleDiff * 180 / Math.PI;
        
        let efficiency = 0;
        
        // Calculate efficiency based on angle difference
        if (angleDiffDegrees <= 90) {
            // Linear interpolation from 1.0 (direct) to 0.35 (90 degrees off)
            efficiency = 1.0 - (0.65 * angleDiffDegrees / 90);
        } else {
            // Default to 35% efficiency when outside the optimal range
            efficiency = 0.35;
        }
        
        // Scale by sail openness
        const sailOpenness = this.openness / 100;
        
        // Scale efficiency from 0-1 range
        efficiency = Math.min(1, Math.max(0.35, efficiency)) * sailOpenness;
        
        return efficiency;
    }
    
    override update(): void {
        // Update physics body (from parent)
        super.update();
        
        // If the sail position or openness changed, update the physics body
        if (this.parentShipBody && this.world) {
            // Update the physics body size/shape based on openness
            if (this.openness > 0 && !this.sailBody) {
                // Create sail fiber body if it doesn't exist and sail is open
                this.createSailFiberBody();
            } else if (this.openness === 0 && this.sailBody) {
                // Remove the sail fiber body if the sail is fully closed
                this.removeSailFiberBody();
            }
            
            // Update the sail fiber body size based on openness if it exists
            if (this.sailBody && this.openness > 0) {
                this.updateSailBodySize();
            }
        }
    }
    
    override use(): void {
        // Toggle sail state (e.g., start opening/closing)
    }
    
    /**
     * Creates physics bodies specific to the sail module: 
     * - Mast body (circle): DECK_ELEMENT category - player can collide with this
     * - Sail fiber body (rectangle): SAIL_FIBER category - only projectiles hit this
     * @override
     */
    override createPhysicsBody(shipBody: Matter.Body, world: Matter.World): void {
        // First call parent method to set up common properties
        super.createPhysicsBody(shipBody, world);
        
        // Remove any existing bodies to prevent duplicates
        this.removePhysicsBody();
        
        // Get sail-specific body properties
        const bodyProps = getModuleBodyProperties('sail');
        
        // Calculate world position based on ship position and module's relative position
        const angle = shipBody.angle;
        const worldX = shipBody.position.x + 
            (this.position.x * Math.cos(angle) - this.position.y * Math.sin(angle));
        const worldY = shipBody.position.y + 
            (this.position.x * Math.sin(angle) + this.position.y * Math.cos(angle));        // Create the mast body - this is a DECK_ELEMENT that the player can collide with
        this.mastBody = Matter.Bodies.circle(
            worldX,
            worldY,
            15, // Reduced to match the radius in Brigantine.MASTS (15) and visual size
            {
                isStatic: true,
                collisionFilter: {
                    category: CollisionCategories.DECK_ELEMENT,
                    mask: CollisionCategories.PLAYER | CollisionCategories.PROJECTILE,
                    group: 0
                },
                render: {
                    visible: true,
                    fillStyle: 'rgba(255, 165, 0, 0.4)', // Orange for deck elements
                    strokeStyle: 'rgba(255, 165, 0, 0.8)',
                    lineWidth: 2
                },
                label: `mast_base_${this.position.x}_${this.position.y}`
            }
        );
        
        // Add the mast body to the world
        if (this.mastBody) {
            Matter.Composite.add(world, this.mastBody);
        }
        
        // Only create the sail fiber body if openness is > 0
        if (this.openness > 0) {
            this.createSailFiberBody();
        }
        
        // Store references
        this.body = this.mastBody; // Set the main body to the mast
        this.parentShipBody = shipBody;
        this.world = world;
    }
    
    /**
     * Creates a sail fiber body that doesn't collide with the player
     */
    private createSailFiberBody(): void {
        if (!this.parentShipBody || !this.world) return;
        
        // Remove existing sail fiber body if it exists
        this.removeSailFiberBody();
        
        // Get sail-specific body properties
        const bodyProps = getModuleBodyProperties('sail');
        
        // Calculate world position
        const angle = this.parentShipBody.angle;
        const worldX = this.parentShipBody.position.x + 
            (this.position.x * Math.cos(angle) - this.position.y * Math.sin(angle));
        const worldY = this.parentShipBody.position.y + 
            (this.position.x * Math.sin(angle) + this.position.y * Math.cos(angle));
        
        // Calculate sail size based on openness
        const sailWidth = bodyProps.width;
        const sailHeight = bodyProps.height * (this.openness / 100); // Scale height by openness
        
        // Create sail fiber body options
        const bodyOptions: Matter.IChamferableBodyDefinition = {
            label: `sail_fiber_${this.position.x}_${this.position.y}`,
            isSensor: true,  // Sail fibers are always sensors (no physical collisions)
            density: bodyProps.density * (this.openness / 100), // Density affected by openness
            friction: 0.01,
            frictionAir: 0.01,
            restitution: 0.05,
            // Explicitly set force to zero to prevent any gravity-like effects
            force: { x: 0, y: 0 },
            // Prevent the module from moving on its own
            inertia: Infinity,
            collisionFilter: {
                category: CollisionCategories.SAIL_FIBER,
                mask: CollisionCategories.PROJECTILE, // Only projectiles hit sail fibers
                group: 0
            },
            render: {
                visible: true,
                fillStyle: 'rgba(173, 216, 230, 0.4)', // Light blue for sail fibers
                strokeStyle: 'rgba(173, 216, 230, 0.8)',
                lineWidth: 2
            }
        };
        
        // Create a rectangle for the sail body
        this.sailBody = Matter.Bodies.rectangle(
            worldX, 
            worldY, 
            sailWidth, 
            sailHeight, 
            bodyOptions
        );
        
        // Apply sail rotation (ship angle + module rotation + sail angle)
        const sailAngleRad = (this.angle * Math.PI) / 180;
        if (this.sailBody) {
            Matter.Body.setAngle(this.sailBody, angle + this.rotation + sailAngleRad);
            
            // Add the sail body to the world
            Matter.Composite.add(this.world, this.sailBody);
        }
    }
    
    /**
     * Removes the sail fiber body if it exists
     */
    private removeSailFiberBody(): void {
        if (this.sailBody && this.world) {
            Matter.Composite.remove(this.world, this.sailBody);
            this.sailBody = null;
        }
    }
    
    /**
     * Updates the sail body size based on openness
     */
    private updateSailBodySize(): void {
        // This would need to recreate the sail body with the new size
        // For simplicity, we'll just remove and recreate the sail body
        if (this.openness > 0) {
            this.createSailFiberBody();
        }
    }
    
    /**
     * Updates the module's position based on the parent ship's position and rotation
     * @override
     */
    override updatePositionFromShip(): void {
        if (!this.parentShipBody) return;
        
        // Get the ship's position and angle
        const shipPos = this.parentShipBody.position;
        const shipAngle = this.parentShipBody.angle;
        
        // Calculate the module's world position based on its offset from the ship's center
        // and the ship's rotation
        const offsetX = this.position.x * Math.cos(shipAngle) - this.position.y * Math.sin(shipAngle);
        const offsetY = this.position.x * Math.sin(shipAngle) + this.position.y * Math.cos(shipAngle);
        
        // Update the mast body position
        if (this.mastBody) {
            Matter.Body.setPosition(this.mastBody, {
                x: shipPos.x + offsetX,
                y: shipPos.y + offsetY
            });
            
            // Update the mast body angle
            Matter.Body.setAngle(this.mastBody, shipAngle + this.rotation);
        }
        
        // Update the sail body position and angle if it exists
        if (this.sailBody) {
            Matter.Body.setPosition(this.sailBody, {
                x: shipPos.x + offsetX,
                y: shipPos.y + offsetY
            });
            
            // Apply sail rotation (ship angle + module rotation + sail angle)
            const sailAngleRad = (this.angle * Math.PI) / 180;
            Matter.Body.setAngle(this.sailBody, shipAngle + this.rotation + sailAngleRad);
        }
    }
    
    /**
     * Remove the physics bodies for this module
     * @override
     */
    override removePhysicsBody(): void {
        if (this.mastBody && this.world) {
            Matter.Composite.remove(this.world, this.mastBody);
            this.mastBody = null;
        }
        
        if (this.sailBody && this.world) {
            Matter.Composite.remove(this.world, this.sailBody);
            this.sailBody = null;
        }
        
        this.body = null;
    }
    
    /**
     * Draw the sail at its position
     */
    draw(ctx: CanvasRenderingContext2D): void {
        ctx.save();
        ctx.translate(this.position.x, this.position.y);        // Draw mast
        ctx.beginPath();
        ctx.arc(0, 0, 15, 0, Math.PI * 2); // Reduced visual size to 15 (half of physics body size)
        ctx.fillStyle = '#D2B48C';
        ctx.strokeStyle = '#8B4513';
        ctx.lineWidth = 4;
        ctx.fill();
        ctx.stroke();
        
        // Draw sail only if open
        if (this.openness > 0) {
            ctx.save();
            ctx.rotate(this.angle * Math.PI / 180);
            
            // Draw the sail as a curved shape
            ctx.beginPath();
            ctx.moveTo(0, 130);
            const curveAmount = 10 + this.openness * 0.9; // Curve amount based on openness
            ctx.quadraticCurveTo(curveAmount, 0, 0, -130);
            ctx.closePath();
            ctx.fillStyle = 'rgba(255,255,255,0.8)';
            ctx.strokeStyle = '#000000';
            ctx.lineWidth = 2;
            ctx.fill();
            ctx.stroke();
            ctx.restore();
        }
        
        ctx.restore();
    }
}
