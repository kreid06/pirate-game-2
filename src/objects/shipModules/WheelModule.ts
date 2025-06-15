// WheelModule.ts - Specialized class for ship steering wheel
import { BaseModule } from './BaseModule';
import Matter from 'matter-js';
import { getModuleBodyProperties } from '../../utils/modulePhysics';

export class WheelModule extends BaseModule {
    wheelAngle: number = 0; // Current rotation of the wheel (-30 to +30 degrees)
    isPlayerControlling: boolean = false; // Whether a player is at the wheel
    
    constructor(position: { x: number; y: number }) {
        super('wheel', position, 0);
    }
    
    // Set the wheel angle
    setWheelAngle(degrees: number): void {
        // Limit the wheel angle to -30 to +30 degrees
        this.wheelAngle = Math.max(-30, Math.min(30, degrees));
    }
    
    // Turn the wheel left by an increment
    turnLeft(increment: number = 0.5): void {
        this.setWheelAngle(this.wheelAngle - increment);
    }
    
    // Turn the wheel right by an increment
    turnRight(increment: number = 0.5): void {
        this.setWheelAngle(this.wheelAngle + increment);
    }
    
    // Center the wheel (move towards 0 degrees)
    centerWheel(increment: number = 0.5): void {
        if (this.wheelAngle > 0) {
            this.wheelAngle = Math.max(0, this.wheelAngle - increment);
        } else if (this.wheelAngle < 0) {
            this.wheelAngle = Math.min(0, this.wheelAngle + increment);
        }
    }
    
    // Set player controlling state
    setPlayerControlling(isControlling: boolean): void {
        this.isPlayerControlling = isControlling;
    }
    
    // Draw the wheel at its position
    draw(ctx: CanvasRenderingContext2D): void {
        ctx.save();
        ctx.translate(this.position.x, this.position.y);
        // Draw wheel base
        const wheelPath = new Path2D();
        wheelPath.moveTo(-10, -20);
        wheelPath.lineTo(10, -20);
        wheelPath.lineTo(10, 20);
        wheelPath.lineTo(-10, 20);
        wheelPath.closePath();
        ctx.fillStyle = '#8B4513';
        ctx.fill(wheelPath);
        // Draw wheel
        ctx.beginPath();
        ctx.arc(0, 0, 15, 0, Math.PI * 2);
        ctx.fillStyle = '#654321';
        ctx.fill();
        ctx.restore();
    }
      override update(): void {
        // Update physics body first (calls parent method)
        super.update();
        
        // If the wheel angle changed, update the physics body rotation
        if (this.body && this.parentShipBody) {
            // Apply wheel's rotation (ship angle + module rotation + wheel angle)
            // Convert wheel angle from degrees to radians
            const wheelAngleRad = (this.wheelAngle * Math.PI) / 180;
            Matter.Body.setAngle(this.body, this.parentShipBody.angle + this.rotation + wheelAngleRad);
        }
    }
    
    override use(): void {
        // Toggle interaction with the wheel
    }
    
    /**
     * Creates a physics body specific to the wheel module
     * @override
     */
    override createPhysicsBody(shipBody: Matter.Body, world: Matter.World): void {
        // First call parent method to set up common properties
        super.createPhysicsBody(shipBody, world);
        
        // If a body was already created, remove it
        if (this.body) {
            Matter.Composite.remove(world, this.body);
        }
        
        // Get wheel-specific body properties
        const bodyProps = getModuleBodyProperties('wheel');
        
        // Calculate world position based on ship position and module's relative position
        const angle = shipBody.angle;
        const worldX = shipBody.position.x + 
            (this.position.x * Math.cos(angle) - this.position.y * Math.sin(angle));
        const worldY = shipBody.position.y + 
            (this.position.x * Math.sin(angle) + this.position.y * Math.cos(angle));
          // Create wheel-specific body options
        const bodyOptions: Matter.IChamferableBodyDefinition = {
            label: `module_wheel_${this.position.x}_${this.position.y}`,
            isSensor: bodyProps.isSensor,
            density: bodyProps.density,
            friction: 0.1,
            frictionAir: 0.01,
            restitution: 0.3,
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
        
        // Create a circle for the wheel body (since wheels are circular)
        if (bodyProps.radius) {
            this.body = Matter.Bodies.circle(
                worldX, 
                worldY, 
                bodyProps.radius, 
                bodyOptions
            );
        } else {
            // Fallback to rectangle if radius is not provided
            this.body = Matter.Bodies.rectangle(
                worldX, 
                worldY, 
                bodyProps.width, 
                bodyProps.height, 
                bodyOptions
            );
        }
        
        // Apply wheel's rotation (ship angle + module rotation + wheel angle)
        // Convert wheel angle from degrees to radians
        const wheelAngleRad = (this.wheelAngle * Math.PI) / 180;
        Matter.Body.setAngle(this.body, angle + this.rotation + wheelAngleRad);
        
        // Add the body to the world
        Matter.Composite.add(world, this.body);
        
        // Store references
        this.parentShipBody = shipBody;
        this.world = world;
    }
}
