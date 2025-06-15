// SailModule.ts - Specialized class for ship sails
import { BaseModule } from './BaseModule';
import Matter from 'matter-js';
import { getModuleBodyProperties } from '../../utils/modulePhysics';

export class SailModule extends BaseModule {
    openness: number = 0; // How open the sail is (0-100%)
    angle: number = 0;    // Angle of the sail relative to the mast (-75 to +75 degrees)
    
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
        if (this.body && this.parentShipBody && this.world) {
            // Update the physics body size/shape based on openness
            // In a real implementation, you might replace the body or scale it
            if (this.openness > 0) {
                // Only create a body if the sail is at least partly open
                this.createPhysicsBody(this.parentShipBody, this.world);
            } else if (this.openness === 0 && this.body) {
                // Remove the body if the sail is fully closed
                this.removePhysicsBody();
            }
        }
    }
    
    override use(): void {
        // Toggle sail state (e.g., start opening/closing)
    }
    /**
     * Creates a physics body specific to the sail module
     * @override
     */
    override createPhysicsBody(shipBody: Matter.Body, world: Matter.World): void {
        // First call parent method to set up common properties
        super.createPhysicsBody(shipBody, world);
        
        // If a body was already created, remove it
        if (this.body) {
            Matter.Composite.remove(world, this.body);
        }
        
        // Get sail-specific body properties
        const bodyProps = getModuleBodyProperties('sail');
        
        // Calculate world position based on ship position and module's relative position
        const angle = shipBody.angle;
        const worldX = shipBody.position.x + 
            (this.position.x * Math.cos(angle) - this.position.y * Math.sin(angle));
        const worldY = shipBody.position.y + 
            (this.position.x * Math.sin(angle) + this.position.y * Math.cos(angle));
        
        // Create a sail-specific body - using the openness to adjust the size
        const sailWidth = bodyProps.width;
        const sailHeight = bodyProps.height * (this.openness / 100); // Scale height by openness
          const bodyOptions: Matter.IChamferableBodyDefinition = {
            label: `module_sail_${this.position.x}_${this.position.y}`,
            isSensor: true,  // Sails are always sensors (no physical collisions)
            density: bodyProps.density * (this.openness / 100), // Density affected by openness
            friction: 0.01,
            frictionAir: 0.01,
            restitution: 0.05,
            // Explicitly set force to zero to prevent any gravity-like effects
            force: { x: 0, y: 0 },
            // Prevent the module from moving on its own
            inertia: Infinity,
            collisionFilter: {
                category: bodyProps.collisionCategory,
                mask: bodyProps.collisionMask,
                group: bodyProps.collisionGroup
            }
        };
        
        // Create a rectangle for the sail body
        this.body = Matter.Bodies.rectangle(
            worldX, 
            worldY, 
            sailWidth, 
            sailHeight, 
            bodyOptions
        );
        
        // Apply sail rotation (ship angle + module rotation + sail angle)
        // Convert sail angle from degrees to radians
        const sailAngleRad = (this.angle * Math.PI) / 180;
        Matter.Body.setAngle(this.body, angle + this.rotation + sailAngleRad);
        
        // Add the body to the world
        Matter.Composite.add(world, this.body);
        
        // Store references
        this.parentShipBody = shipBody;
        this.world = world;
    }
    draw(ctx: CanvasRenderingContext2D): void {
        ctx.save();
        ctx.translate(this.position.x, this.position.y);
        // Draw mast
        ctx.beginPath();
        ctx.arc(0, 0, 15, 0, Math.PI * 2);
        ctx.fillStyle = '#D2B48C';
        ctx.strokeStyle = '#8B4513';
        ctx.lineWidth = 4;
        ctx.fill();
        ctx.stroke();
        // Draw sail only if open
        if (this.openness > 0) {
            ctx.save();
            ctx.rotate(this.angle * Math.PI / 180);
            ctx.beginPath();
            ctx.moveTo(0, 130);
            const curveAmount = 10 + this.openness * 0.9;
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
