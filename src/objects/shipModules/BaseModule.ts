import Matter from 'matter-js';
import { Ships } from '../ships/ships';
import { CollisionCategories } from '../../utils/color';

export class BaseModule {
    type: string;
    position: { x: number; y: number };
    rotation: number;
    body: Matter.Body | null = null;
    parentShipBody: Matter.Body | null = null;
    world: Matter.World | null = null;
    parentShip: Ships | null = null;
    
    constructor(type: string, position: { x: number; y: number }, rotation: number = 0) {
        this.type = type;
        this.position = position;
        this.rotation = rotation;
    }
    
    attachToShip(ship: Ships): void {
        this.parentShip = ship;
        if (ship.getBody()) {
            this.parentShipBody = ship.getBody()!;
        }
    }
    
    update(): void {
        // Base update logic that all modules should inherit
        // Update the position and rotation of the module based on ship movement
        if (this.body && this.parentShipBody) {
            this.updatePositionFromShip();
        }
    }
    
    use(): void {
        // Base use functionality, to be overridden by specific modules
        console.log(`Using ${this.type} module`);
    }
    
    /**
     * Creates a physics body for this module
     */
    createPhysicsBody(shipBody: Matter.Body, world: Matter.World): void {
        this.parentShipBody = shipBody;
        this.world = world;
        
        // Note: Actual physics body creation is handled by subclasses
    }
    
    /**
     * Removes the physics body for this module from the world
     */
    removePhysicsBody(): void {
        if (this.body && this.world) {
            Matter.Composite.remove(this.world, this.body);
            this.body = null;
        }
    }
    
    /**
     * Updates the module's position based on the parent ship's position and rotation
     */
    protected updatePositionFromShip(): void {
        if (!this.parentShipBody) return;
        
        // Get the ship's position and angle
        const shipPos = this.parentShipBody.position;
        const shipAngle = this.parentShipBody.angle;
        
        // Calculate the module's world position based on its offset from the ship's center
        // and the ship's rotation
        const offsetX = this.position.x * Math.cos(shipAngle) - this.position.y * Math.sin(shipAngle);
        const offsetY = this.position.x * Math.sin(shipAngle) + this.position.y * Math.cos(shipAngle);
        
        // Update the module's body position
        if (this.body) {
            Matter.Body.setPosition(this.body, {
                x: shipPos.x + offsetX,
                y: shipPos.y + offsetY
            });
            
            // Update the module's body angle
            Matter.Body.setAngle(this.body, shipAngle + this.rotation);
        }
    }
}
