// WheelModule.ts - Specialized class for ship steering wheel
import { BaseModule, ModuleTooltipInfo } from './BaseModule';
import Matter from 'matter-js';
import { getModuleBodyProperties } from '../../utils/modulePhysics';
import { Color } from '../../utils/color';

export class WheelModule extends BaseModule {
    wheelAngle: number = 0; // Current rotation of the wheel (-30 to +30 degrees)
    isPlayerControlling: boolean = false; // Whether a player is at the wheel
    
    constructor(position: { x: number; y: number }) {
        super('wheel', position, 0);
        
        // Set wheel-specific tooltip info
        this.name = "Steering Wheel";
        this.description = "Controls ship direction and turning speed";
        this.health = 100;
        this.maxHealth = 100;
        this.quality = "Standard";
        this.effectiveness = 1.0;
        this.useInstruction = "Press E to take control";
    }
    
    // Set the wheel angle
    setWheelAngle(degrees: number): void {
        // Limit the wheel angle to -30 to +30 degrees
        this.wheelAngle = Math.max(-30, Math.min(30, degrees));
        
        // Update effectiveness based on wheel angle (full effectiveness at max angle)
        this.effectiveness = Math.abs(this.wheelAngle) / 30;
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
        
        // Update effectiveness
        this.effectiveness = Math.abs(this.wheelAngle) / 30;
    }
    
    // Set player controlling state
    setPlayerControlling(isControlling: boolean): void {
        this.isPlayerControlling = isControlling;
        if (isControlling) {
            this.useInstruction = "Press E to release control";
        } else {
            this.useInstruction = "Press E to take control";
        }
    }
      // Override getTooltipInfo to include wheel-specific info
    override getTooltipInfo(): ModuleTooltipInfo {
        const info = super.getTooltipInfo();
        const turnDirection = this.wheelAngle > 0 ? "Right" : this.wheelAngle < 0 ? "Left" : "Center";
        const turnStrength = Math.abs(this.wheelAngle) / 30 * 100;
        
        return {
            ...info,
            description: `${info.description}\nCurrent direction: ${turnDirection} (${Math.round(turnStrength)}% strength)`,
            effectiveness: this.effectiveness
        };
    }    // Draw the wheel at its position
    draw(ctx: CanvasRenderingContext2D): void {
        ctx.save();
        ctx.translate(this.position.x, this.position.y);
        
        // Draw wheel base (stand)
        // Create a gradient for the base
        const baseGradient = ctx.createLinearGradient(-12, -25, 12, 25);
        
        if (this.isHovered) {
            // Highlight gradient for base when hovered
            baseGradient.addColorStop(0, '#8B4513'); // Brown
            baseGradient.addColorStop(0.5, '#CD853F'); // Peru (lighter brown)
            baseGradient.addColorStop(1, '#8B4513'); // Brown
        } else {
            // Normal gradient for base
            baseGradient.addColorStop(0, '#8B4513'); // Brown
            baseGradient.addColorStop(0.5, '#A0522D'); // Sienna (slightly lighter)
            baseGradient.addColorStop(1, '#8B4513'); // Brown
        }
        
        ctx.beginPath();
        ctx.rect(-12, -25, 24, 50);
        ctx.fillStyle = baseGradient;
        ctx.fill();
        ctx.strokeStyle = this.isHovered ? '#FFD700' : '#654321'; // Gold for hover, dark brown normally
        ctx.lineWidth = this.isHovered ? 3 : 2;
        ctx.stroke();
        
        // Draw wheel with rotation
        ctx.save();
        ctx.rotate(this.wheelAngle * Math.PI / 180); // Apply the wheel's angle
        
        // Outer wheel circle with radial gradient
        const outerWheelGradient = ctx.createRadialGradient(0, 0, 0, 0, 0, 20);
        
        if (this.isHovered) {
            // Highlight gradient for outer wheel when hovered
            outerWheelGradient.addColorStop(0, '#8B4513'); // Brown
            outerWheelGradient.addColorStop(0.7, '#CD853F'); // Peru (lighter)
            outerWheelGradient.addColorStop(1, '#DEB887'); // Burlywood (even lighter)
        } else {
            // Normal gradient for outer wheel
            outerWheelGradient.addColorStop(0, '#654321'); // Dark brown
            outerWheelGradient.addColorStop(1, '#5D4037'); // Even darker brown
        }
        
        ctx.beginPath();
        ctx.arc(0, 0, 20, 0, Math.PI * 2);
        ctx.fillStyle = outerWheelGradient;
        ctx.strokeStyle = this.isHovered ? '#FFD700' : '#3E2723'; // Gold for hover, very dark brown normally
        ctx.lineWidth = this.isHovered ? 3 : 2;
        ctx.fill();
        ctx.stroke();
        
        // Inner wheel circle with radial gradient
        const innerWheelGradient = ctx.createRadialGradient(0, 0, 0, 0, 0, 15);
        
        if (this.isHovered) {
            // Highlight gradient for inner wheel when hovered
            innerWheelGradient.addColorStop(0, '#CD853F'); // Peru (lighter brown)
            innerWheelGradient.addColorStop(1, '#A0522D'); // Sienna
        } else {
            // Normal gradient for inner wheel
            innerWheelGradient.addColorStop(0, '#8B4513'); // Brown
            innerWheelGradient.addColorStop(1, '#654321'); // Darker brown
        }
        
        ctx.beginPath();
        ctx.arc(0, 0, 15, 0, Math.PI * 2);
        ctx.fillStyle = innerWheelGradient;
        ctx.fill();
        
        // Draw wheel spokes
        ctx.strokeStyle = this.isHovered ? '#FFD700' : '#3E2723'; // Gold for hover, dark brown normally
        ctx.lineWidth = this.isHovered ? 4 : 3;
        
        for (let i = 0; i < 8; i++) {
            ctx.beginPath();
            ctx.moveTo(0, 0);
            const angle = (i * Math.PI) / 4;
            ctx.lineTo(Math.cos(angle) * 18, Math.sin(angle) * 18);
            ctx.stroke();
        }
        
        // If hovered, add a faint glow effect
        if (this.isHovered) {
            ctx.shadowColor = 'rgba(255, 215, 0, 0.6)'; // Gold glow
            ctx.shadowBlur = 8;
            ctx.lineWidth = 1;
            ctx.strokeStyle = 'rgba(255, 215, 0, 0.4)';
            ctx.beginPath();
            ctx.arc(0, 0, 22, 0, Math.PI * 2); // Slightly larger than the wheel
            ctx.stroke();
            ctx.shadowBlur = 0; // Reset shadow
        }
        
        ctx.restore(); // Restore from rotation
        
        // Debug: Draw physics body outline if it exists
        if (this.body && this.body.bounds) {
            const bounds = this.body.bounds;
            const dx = bounds.max.x - bounds.min.x;
            const dy = bounds.max.y - bounds.min.y;
            
            // Convert world coords to local
            const localX = 0;
            const localY = 0;
            const radius = Math.max(dx, dy) / 2;
            
            ctx.beginPath();
            ctx.arc(localX, localY, radius, 0, Math.PI * 2);
            ctx.strokeStyle = 'rgba(255, 0, 0, 0.5)'; // Red for debug
            ctx.lineWidth = 1;
            ctx.stroke();
        }
        
        ctx.restore(); // Restore original context
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
        };        // Create a circle for the wheel body (since wheels are circular)
        if (bodyProps.radius) {
            this.body = Matter.Bodies.circle(
                worldX, 
                worldY, 
                bodyProps.radius, 
                {
                    ...bodyOptions,
                    isSensor: false, // Explicitly make it not a sensor for physical collision
                    render: {
                        visible: true, // Make it visible for debugging
                        fillStyle: 'rgba(0, 0, 255, 0.4)', // Blue transparent fill
                        strokeStyle: 'rgba(0, 0, 255, 0.8)', // Blue border
                        lineWidth: 2
                    },
                    label: `wheel_module_${this.position.x}_${this.position.y}` // More specific label
                }
            );
            
            // Log wheel body creation
            console.log(`Created wheel physics body at (${worldX}, ${worldY}) with radius ${bodyProps.radius}`);
            console.log(`Wheel collision category: ${bodyProps.collisionCategory}, mask: ${bodyProps.collisionMask}`);
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
