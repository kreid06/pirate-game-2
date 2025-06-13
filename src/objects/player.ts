import * as Matter from 'matter-js';
import { BaseGameObject } from './objects';
import { Input } from '../engine/input';
import { Color, CollisionCategories } from '../utils/color';
import { Camera } from '../engine/camera';
import { Brigantine } from './ships/brigantine';

export class Player extends BaseGameObject {
    private radius: number;
    private speed: number;
    private input: Input;
    private camera: Camera | null;
    private health: number = 100; // Default health
    private isBoarded: boolean = false;
    private boardedShip: Brigantine | null = null;
    
    constructor(x: number, y: number, radius: number, input: Input) {
        super(x, y);
        this.radius = radius;
        this.speed = 0.002; // Doubled speed for better movement in an infinite world
        this.input = input;
        this.camera = null;
        
        // Create the physics body when player is initialized
        this.createPhysicsBody();
    }
    
     public isDead(): boolean {
        return this.health <= 0;
    }    public heal(amount: number): void {
        this.health += amount;
    }
    
    public setCamera(camera: Camera): void {
        this.camera = camera;
    }    protected override createPhysicsBody(): void {
        // Create physics body for player (circular)
        this.body = Matter.Bodies.circle(this.position.x, this.position.y, this.radius, {
            inertia: Infinity, // Prevents rotation from collisions
            friction: 0.01, // Slightly higher friction for better control during collisions
            frictionAir: 0.01, // Reduced air friction for longer movement
            restitution: 0.6, // Increased bounciness for better collision response
            collisionFilter: {
                category: CollisionCategories.PLAYER,
                mask: CollisionCategories.SHIP | CollisionCategories.ENEMY | CollisionCategories.POWERUP | 
                      CollisionCategories.TREASURE | CollisionCategories.ISLAND,
                group: 0
            },
            density: 0.02, // Increased density for more impactful ship-player collisions
            label: 'player'
        });
          // Make sure the physics body is correctly initialized
        if (this.body) {
            console.log("Player physics body created successfully");
            console.log(`Player position: (${this.position.x}, ${this.position.y})`);
            console.log(`Player collision category: ${this.body.collisionFilter.category}`);
            console.log(`Player collision mask: ${this.body.collisionFilter.mask}`);
            console.log(`Player isSleeping: ${this.body.isSleeping}`);
            console.log(`Player isStatic: ${this.body.isStatic}`);
        }
    }    public update(delta: number): void {
        // NOTE: Boarding/unboarding is now handled by Game.handleInteraction via Input system
        
        // Get mouse position in world coordinates
        const mouseScreenPos = this.input.getMousePosition();
        let mouseWorldPos = mouseScreenPos;
        
        // Convert screen coordinates to world coordinates if camera is available
        if (this.camera) {
            mouseWorldPos = this.camera.screenToWorld(mouseScreenPos.x, mouseScreenPos.y);
        }
        
        // Calculate direction to mouse
        const directionToMouse = {
            x: mouseWorldPos.x - this.position.x,
            y: mouseWorldPos.y - this.position.y
        };
        
        // Calculate distance to mouse
        const distanceToMouse = Math.sqrt(
            directionToMouse.x * directionToMouse.x + 
            directionToMouse.y * directionToMouse.y
        );
        
        // Normalize direction if distance is not zero
        if (distanceToMouse > 0) {
            directionToMouse.x /= distanceToMouse;
            directionToMouse.y /= distanceToMouse;
            
            // Update player rotation to face mouse
            this.rotation = Math.atan2(directionToMouse.y, directionToMouse.x);
            
            // If we have a physics body, update its angle
            if (this.body) {
                Matter.Body.setAngle(this.body, this.rotation);
            }
        }
        
        // Initialize force vector
        const force = { x: 0, y: 0 };
        
        // Handle key inputs
        if (this.input.isKeyDown('w') || this.input.isKeyDown('arrowup')) {
            // Move forward in the direction the player is facing
            force.x = directionToMouse.x * this.speed;
            force.y = directionToMouse.y * this.speed;
        }
        
        if (this.input.isKeyDown('s') || this.input.isKeyDown('arrowdown')) {
            // Move backward from the direction the player is facing
            force.x = -directionToMouse.x * this.speed;
            force.y = -directionToMouse.y * this.speed;
        }
        
        if (this.input.isKeyDown('a') || this.input.isKeyDown('arrowleft')) {
            // Strafe left (perpendicular to forward direction)
            force.x += -directionToMouse.y * this.speed;
            force.y += directionToMouse.x * this.speed;
        }
        
        if (this.input.isKeyDown('d') || this.input.isKeyDown('arrowright')) {
            // Strafe right (perpendicular to forward direction)
            force.x += directionToMouse.y * this.speed;
            force.y += -directionToMouse.x * this.speed;
        }
        
        // Apply force if there is any and we have a physics body
        if (this.body && (force.x !== 0 || force.y !== 0)) {
            Matter.Body.applyForce(this.body, this.body.position, force);
        }
        
        // Update position from physics body
        super.update(delta);
    }
      public render(ctx: CanvasRenderingContext2D): void {
        // Draw the player as a red circle
        ctx.beginPath();
        ctx.arc(this.position.x, this.position.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = Color.RED;
        ctx.fill();
        ctx.closePath();
        
        // Draw a direction indicator
        const dirX = this.position.x + Math.cos(this.rotation) * this.radius;
        const dirY = this.position.y + Math.sin(this.rotation) * this.radius;
        
        ctx.beginPath();
        ctx.moveTo(this.position.x, this.position.y);
        ctx.lineTo(dirX, dirY);
        ctx.strokeStyle = Color.WHITE;
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.closePath();
        
        // Render debug visualization if debug mode is enabled
        if (BaseGameObject.isDebugMode()) {
            this.renderDebug(ctx);
        }
    }
    
    /**
     * Get the current velocity magnitude (speed)
     */
    public getSpeed(): number {
        if (!this.body) return 0;
        
        const velocity = this.body.velocity;
        return Math.sqrt(velocity.x * velocity.x + velocity.y * velocity.y);
    }
    
    /**
     * Get the current velocity vector
     */
    public getVelocity(): { x: number, y: number } {
        if (!this.body) return { x: 0, y: 0 };
        return { x: this.body.velocity.x, y: this.body.velocity.y };
    }
      /**
     * Render debug visualization of the player's physics body
     */
    protected override renderPhysicsBody(ctx: CanvasRenderingContext2D): void {
        if (!this.body) return;
        
        // Draw the circular physics body
        ctx.beginPath();
        ctx.arc(this.position.x, this.position.y, this.radius, 0, Math.PI * 2);
        ctx.strokeStyle = Color.DEBUG_PHYSICS;
        ctx.lineWidth = 2;
        ctx.stroke();
        
        // Draw the rotation indicator
        const dirX = this.position.x + Math.cos(this.rotation) * this.radius;
        const dirY = this.position.y + Math.sin(this.rotation) * this.radius;
        
        ctx.beginPath();
        ctx.moveTo(this.position.x, this.position.y);
        ctx.lineTo(dirX, dirY);
        ctx.strokeStyle = Color.DEBUG_ROTATION;
        ctx.lineWidth = 2;
        ctx.stroke();
    }    /**
     * Board a ship - changes collision filter to avoid colliding with the ship
     */
    public boardShip(ship: Brigantine): void {
        if (!this.body || this.isBoarded) {
            console.log(`❌ BOARDING FAILED: ${this.isBoarded ? 'Player is already on a ship' : 'Player body not initialized'}`);
            return;
        }
        
        // Store reference to boarded ship
        this.boardedShip = ship;
        this.isBoarded = true;
        
        // Update ship's boarding state
        ship.setPlayerBoarded(true);
          // Update collision filter to ignore collisions with ships while boarded
        const currentFilter = this.body.collisionFilter;
        const newMask = (currentFilter.mask !== undefined) 
            ? currentFilter.mask & ~CollisionCategories.SHIP 
            : ~CollisionCategories.SHIP;
          // Set new collision filter
        this.body.collisionFilter = {
            category: currentFilter.category,
            mask: newMask,
            group: currentFilter.group
        };
        
        console.log(`✅ BOARDING SUCCESSFUL: Player is now onboard ship`);
    }    /**
     * Unboard a ship - restores normal collision filtering
     */
    public unboardShip(): void {
        if (!this.body || !this.isBoarded || !this.boardedShip) {
            console.log(`❌ UNBOARDING FAILED: ${!this.isBoarded ? 'Player is not on a ship' : 'Missing references'}`);
            return;
        }
        
        // Update ship's boarding state
        this.boardedShip.setPlayerBoarded(false);
        
        // Reset boarding state
        this.boardedShip = null;
        this.isBoarded = false;
          // Restore normal collision filtering
        const currentFilter = this.body.collisionFilter;
        const newMask = (currentFilter.mask !== undefined)
            ? currentFilter.mask | CollisionCategories.SHIP
            : CollisionCategories.SHIP | CollisionCategories.ENEMY | CollisionCategories.POWERUP | 
              CollisionCategories.TREASURE | CollisionCategories.ISLAND;
              
        // Set new collision filter        
        this.body.collisionFilter = {
            category: currentFilter.category,
            mask: newMask,
            group: currentFilter.group
        };
        
        console.log(`✅ UNBOARDING SUCCESSFUL: Player has disembarked from the ship`);
    }
    
    /**
     * Check if player is currently boarded on a ship
     */
    public isOnBoard(): boolean {
        return this.isBoarded;
    }
    
    /**
     * Get the ship the player is currently on, if any
     */
    public getBoardedShip(): Brigantine | null {
        return this.boardedShip;
    }
}
