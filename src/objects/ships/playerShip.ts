import * as Matter from 'matter-js';
import { Ships } from './ships';
import { Input } from '../../engine/input';
import { Camera } from '../../engine/camera';
import { SteeringWheel } from '../shipModules/steeringWheel';
import { Sails } from '../shipModules/sails';
import { Cannons } from '../shipModules/cannons';
import { Color } from '../../utils/color';
import { BaseGameObject } from '../objects';

export class PlayerShip extends Ships {
    private input: Input;
    private camera: Camera | null;
    private speed: number;
    private baseSpeed: number;
    private speedBoostFactor: number;
    private speedBoostTime: number;
    private weaponUpgraded: boolean;
    private weaponUpgradeTime: number;
    public steeringWheel: SteeringWheel;  // Made public for external access
    public sails: Sails;                  // Made public for external access
    public leftCannon: Cannons;           // Made public for external access
    public rightCannon: Cannons;          // Made public for external access
    
    constructor(x: number, y: number, input: Input) {
        // Create a player ship with reasonable dimensions and health
        super(x, y, 70, 25, 150);
        this.input = input;
        this.camera = null;
        this.baseSpeed = 0.0008; // Base speed for the ship
        this.speed = this.baseSpeed;
        this.speedBoostFactor = 1.0;
        this.speedBoostTime = 0;
        this.weaponUpgraded = false;
        this.weaponUpgradeTime = 0;
        
        // Create ship modules
        this.steeringWheel = new SteeringWheel(this.width / 3, 0);
        this.sails = new Sails(0, -this.height / 2);
        this.leftCannon = new Cannons(-this.width / 3, this.height / 4);
        this.rightCannon = new Cannons(this.width / 3, this.height / 4);
        
        // Attach modules to ship
        this.steeringWheel.attachToShip(this);
        this.sails.attachToShip(this);
        this.leftCannon.attachToShip(this);
        this.rightCannon.attachToShip(this);
    }
    
    public setCamera(camera: Camera): void {
        this.camera = camera;
    }
    
    public update(delta: number): void {
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
        }
        
        // Update power-up timers
        this.updatePowerUps(delta);
        
        // Handle module controls
        this.handleShipControls(delta, directionToMouse);
        
        // Update all ship modules
        this.steeringWheel.update(delta);
        this.sails.update(delta);
        this.leftCannon.update(delta);
        this.rightCannon.update(delta);
        
        // Update ship physics
        super.update(delta);
    }
    
    /**
     * Update power-up effects and timers
     */
    private updatePowerUps(delta: number): void {
        // Update speed boost
        if (this.speedBoostTime > 0) {
            this.speedBoostTime -= delta;
            
            if (this.speedBoostTime <= 0) {
                // Reset speed to normal
                this.speedBoostFactor = 1.0;
                this.speedBoostTime = 0;
                console.log("Speed boost expired");
            }
        }
        
        // Update weapon upgrade
        if (this.weaponUpgradeTime > 0) {
            this.weaponUpgradeTime -= delta;
            
            if (this.weaponUpgradeTime <= 0) {
                // Reset weapons to normal
                this.weaponUpgraded = false;
                this.weaponUpgradeTime = 0;
                console.log("Weapon upgrade expired");
            }
        }
        
        // Apply current speed factor
        this.speed = this.baseSpeed * this.speedBoostFactor;
    }
    
    /**
     * Apply a temporary speed boost
     * @param duration Duration of the boost in seconds
     */
    public applySpeedBoost(duration: number): void {
        this.speedBoostFactor = 2.0; // Double speed
        this.speedBoostTime = duration;
        console.log(`Speed boost activated for ${duration} seconds`);
    }
    
    /**
     * Apply a temporary weapon upgrade
     * @param duration Duration of the upgrade in seconds
     */
    public upgradeWeapons(duration: number): void {
        this.weaponUpgraded = true;
        this.weaponUpgradeTime = duration;
        console.log(`Weapons upgraded for ${duration} seconds`);
    }
    
    /**
     * Check if weapons are currently upgraded
     */
    public hasUpgradedWeapons(): boolean {
        return this.weaponUpgraded;
    }
    
    private handleShipControls(delta: number, directionToMouse: { x: number, y: number }): void {
        if (!this.body) return;
        
        // Toggle sails with 'space' key
        if (this.input.wasKeyJustPressed(' ')) {
            this.sails.toggleDeployed();
        }
        
        // Fire cannons with mouse clicks
        if (this.input.isMouseDown()) {
            // Calculate firing direction (perpendicular to ship direction)
            const shipDirection = {
                x: Math.cos(this.rotation),
                y: Math.sin(this.rotation)
            };
            
            // Left cannon fires to port side (left)
            const leftDirection = {
                x: -shipDirection.y,
                y: shipDirection.x
            };
            
            // Right cannon fires to starboard side (right)
            const rightDirection = {
                x: shipDirection.y,
                y: -shipDirection.x
            };
            
            // Fire both cannons
            const cannonballDamage = this.weaponUpgraded ? 15 : 10; // More damage when upgraded
            this.leftCannon.fire(leftDirection, cannonballDamage);
            this.rightCannon.fire(rightDirection, cannonballDamage);
        }
        
        // Handle steering
        if (this.input.isKeyDown('a') || this.input.isKeyDown('arrowleft')) {
            this.steeringWheel.turnLeft(delta);
        }
        
        if (this.input.isKeyDown('d') || this.input.isKeyDown('arrowright')) {
            this.steeringWheel.turnRight(delta);
        }
        
        // Handle forward/backward movement
        let forwardForce = 0;
        if (this.input.isKeyDown('w') || this.input.isKeyDown('arrowup')) {
            forwardForce = this.speed * (this.sails.isDeployed() ? this.sails.getSpeedBoost() : 1);
        }
        
        if (this.input.isKeyDown('s') || this.input.isKeyDown('arrowdown')) {
            forwardForce = -this.speed * 0.5; // Backward movement is slower
        }
        
        // Apply force in the direction the ship is facing
        if (forwardForce !== 0) {
            const forceVector = {
                x: Math.cos(this.rotation) * forwardForce,
                y: Math.sin(this.rotation) * forwardForce
            };
            
            Matter.Body.applyForce(this.body, this.body.position, forceVector);
        }
    }
    
    public render(ctx: CanvasRenderingContext2D): void {
        // Render the base ship first
        super.render(ctx);
        
        // Then render all ship modules
        this.sails.render(ctx);
        this.steeringWheel.render(ctx);
        this.leftCannon.render(ctx);
        this.rightCannon.render(ctx);
        
        // Draw player indicator (small flag or marker)
        this.renderPlayerIndicator(ctx);
        
        // Draw power-up effects
        if (this.speedBoostTime > 0 || this.weaponUpgradeTime > 0) {
            this.renderPowerUpEffects(ctx);
        }
        
        // Render debug visualization if enabled
        if (BaseGameObject.isDebugMode()) {
            this.renderDebug(ctx);
        }
    }
    
    /**
     * Render debug visualization of the player ship's physics body
     */
    protected override renderPhysicsBody(ctx: CanvasRenderingContext2D): void {
        // First, call the base class implementation to draw the basic ship body
        super.renderPhysicsBody(ctx);
        
        if (!this.body) return;
        
        // Draw special player ship debug info
        ctx.save();
        ctx.translate(this.position.x, this.position.y);
        ctx.rotate(this.rotation);
        
        // Draw cannon firing lines
        ctx.beginPath();
        // Left cannon line
        ctx.moveTo(-this.width / 3, this.height / 4);
        ctx.lineTo(-this.width / 3 - 30, this.height / 4);
        // Right cannon line
        ctx.moveTo(this.width / 3, this.height / 4);
        ctx.lineTo(this.width / 3 + 30, this.height / 4);
        
        ctx.strokeStyle = 'rgba(255, 0, 0, 0.6)'; // Red for cannon lines
        ctx.lineWidth = 1;
        ctx.stroke();
        
        // Draw speed boost indicator if active
        if (this.speedBoostTime > 0) {
            ctx.beginPath();
            
            // Draw trail behind the ship
            ctx.moveTo(-this.width / 2, 0);
            ctx.lineTo(-this.width / 2 - 20, -10);
            ctx.lineTo(-this.width / 2 - 30, 0);
            ctx.lineTo(-this.width / 2 - 20, 10);
            ctx.closePath();
            
            ctx.fillStyle = 'rgba(0, 150, 255, 0.6)'; // Blue for speed boost
            ctx.fill();
            
            // Draw timer text
            ctx.save();
            ctx.rotate(-this.rotation); // Counter-rotate to keep text upright
            ctx.font = '10px Arial';
            ctx.fillStyle = 'white';
            ctx.textAlign = 'center';
            ctx.fillText(`${this.speedBoostTime.toFixed(1)}s`, 0, -this.height - 10);
            ctx.restore();
        }
        
        // Draw weapon upgrade indicator if active
        if (this.weaponUpgradeTime > 0) {
            // Draw cannon upgrade indicators
            ctx.beginPath();
            ctx.arc(-this.width / 3, this.height / 4, 8, 0, Math.PI * 2);
            ctx.arc(this.width / 3, this.height / 4, 8, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(255, 100, 0, 0.6)'; // Orange for weapon upgrade
            ctx.fill();
            
            // Draw timer text
            ctx.save();
            ctx.rotate(-this.rotation); // Counter-rotate to keep text upright
            ctx.font = '10px Arial';
            ctx.fillStyle = 'white';
            ctx.textAlign = 'center';
            ctx.fillText(`${this.weaponUpgradeTime.toFixed(1)}s`, 0, -this.height - 20);
            ctx.restore();
        }
        
        ctx.restore();
    }
    
    private renderPlayerIndicator(ctx: CanvasRenderingContext2D): void {
        // Draw a small player flag at the top of the ship
        ctx.save();
        
        // Translate to ship position
        ctx.translate(this.position.x, this.position.y);
        ctx.rotate(this.rotation);
        
        // Draw flag pole
        ctx.beginPath();
        ctx.moveTo(0, -this.height / 2 - 5);
        ctx.lineTo(0, -this.height / 2 - 20);
        ctx.strokeStyle = Color.BLACK;
        ctx.lineWidth = 1;
        ctx.stroke();
        
        // Draw triangular flag
        ctx.beginPath();
        ctx.moveTo(0, -this.height / 2 - 20);
        ctx.lineTo(15, -this.height / 2 - 15);
        ctx.lineTo(0, -this.height / 2 - 10);
        ctx.closePath();
        ctx.fillStyle = Color.RED; // Player flag is red
        ctx.fill();
        
        ctx.restore();
    }
    
    private renderPowerUpEffects(ctx: CanvasRenderingContext2D): void {
        ctx.save();
        
        // Translate to ship position
        ctx.translate(this.position.x, this.position.y);
        
        // Draw speed boost effect (blue trail)
        if (this.speedBoostTime > 0) {
            const glowOpacity = 0.3 + 0.2 * Math.sin(performance.now() / 200);
            
            // Draw speed lines behind the ship
            ctx.beginPath();
            ctx.moveTo(-this.width / 2, -this.height / 3);
            ctx.lineTo(-this.width / 2 - 20, -this.height / 3 - 5);
            ctx.lineTo(-this.width / 2 - 20, this.height / 3 + 5);
            ctx.lineTo(-this.width / 2, this.height / 3);
            ctx.closePath();
            
            const speedGradient = ctx.createLinearGradient(
                -this.width / 2, 0, 
                -this.width / 2 - 20, 0
            );
            speedGradient.addColorStop(0, `rgba(0, 150, 255, ${glowOpacity})`);
            speedGradient.addColorStop(1, 'rgba(0, 150, 255, 0)');
            
            ctx.fillStyle = speedGradient;
            ctx.fill();
        }
        
        // Draw weapon upgrade effect (red glow around cannons)
        if (this.weaponUpgraded) {
            const pulseSize = 1 + 0.2 * Math.sin(performance.now() / 150);
            const glowOpacity = 0.4 + 0.2 * Math.sin(performance.now() / 150);
            
            // Left cannon glow
            ctx.beginPath();
            ctx.arc(
                -this.width / 3, this.height / 4, 
                12 * pulseSize, 0, Math.PI * 2
            );
            ctx.fillStyle = `rgba(255, 50, 0, ${glowOpacity})`;
            ctx.fill();
            
            // Right cannon glow
            ctx.beginPath();
            ctx.arc(
                this.width / 3, this.height / 4, 
                12 * pulseSize, 0, Math.PI * 2
            );
            ctx.fillStyle = `rgba(255, 50, 0, ${glowOpacity})`;
            ctx.fill();
        }
        
        ctx.restore();
    }
}
