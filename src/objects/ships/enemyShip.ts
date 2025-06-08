import * as Matter from 'matter-js';
import { Ships } from './ships';
import { Color } from '../../utils/color';
import { BaseGameObject } from '../objects';
import { Cannons } from '../shipModules/cannons';

export class EnemyShip extends Ships {
    private target: BaseGameObject | null;
    private speed: number;
    private detectionRange: number;
    public leftCannon: Cannons;          // Made public for external access
    public rightCannon: Cannons;         // Made public for external access
    private fireTimer: number;
    private fireRate: number;
    
    constructor(x: number, y: number) {
        // Create an enemy ship with reasonable dimensions and health
        super(x, y, 60, 20, 100);
        this.target = null;
        this.speed = 0.0005; // Slightly slower than player
        this.detectionRange = 500; // How far the enemy can detect the player
        this.fireTimer = 0;
        this.fireRate = 3; // Fire every 3 seconds
        
        // Create cannons for the enemy ship
        this.leftCannon = new Cannons(-this.width / 3, this.height / 4);
        this.rightCannon = new Cannons(this.width / 3, this.height / 4);
        
        // Attach modules to ship
        this.leftCannon.attachToShip(this);
        this.rightCannon.attachToShip(this);
    }
    
    public setTarget(target: BaseGameObject): void {
        this.target = target;
    }
    
    public update(delta: number): void {
        // Chase target if one exists and is within detection range
        if (this.target && this.body) {
            const targetPos = this.target.getPosition();
            
            // Calculate distance to target
            const distanceToTarget = Math.sqrt(
                Math.pow(targetPos.x - this.position.x, 2) + 
                Math.pow(targetPos.y - this.position.y, 2)
            );
            
            // Only chase if within detection range
            if (distanceToTarget <= this.detectionRange) {
                // Calculate direction to target
                const directionToTarget = {
                    x: targetPos.x - this.position.x,
                    y: targetPos.y - this.position.y
                };
                
                // Normalize direction
                if (distanceToTarget > 0) {
                    directionToTarget.x /= distanceToTarget;
                    directionToTarget.y /= distanceToTarget;
                    
                    // Calculate target angle
                    const targetAngle = Math.atan2(directionToTarget.y, directionToTarget.x);
                    
                    // Gradually rotate towards target
                    let angleDiff = targetAngle - this.rotation;
                    
                    // Normalize angle difference to -PI to PI
                    while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
                    while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
                    
                    // Apply rotation to the body
                    const rotationSpeed = 0.03 * delta;
                    const rotation = Math.sign(angleDiff) * Math.min(Math.abs(angleDiff), rotationSpeed);
                    Matter.Body.rotate(this.body, rotation);
                    
                    // Only move forward if generally facing the target
                    if (Math.abs(angleDiff) < Math.PI / 4) {
                        // Apply force in the direction the ship is facing
                        const forceVector = {
                            x: Math.cos(this.rotation) * this.speed,
                            y: Math.sin(this.rotation) * this.speed
                        };
                        
                        Matter.Body.applyForce(this.body, this.body.position, forceVector);
                    }
                    
                    // Try to fire at the target if within range and timer allows
                    this.fireTimer -= delta;
                    
                    if (this.fireTimer <= 0 && distanceToTarget < 300) {
                        this.fireAtTarget();
                        this.fireTimer = this.fireRate;
                    }
                }
            }
        }
        
        // Update ship modules
        this.leftCannon.update(delta);
        this.rightCannon.update(delta);
        
        // Update ship physics
        super.update(delta);
    }
    
    private fireAtTarget(): void {
        if (!this.target) return;
        
        // Calculate direction to target
        const targetPos = this.target.getPosition();
        const directionToTarget = {
            x: targetPos.x - this.position.x,
            y: targetPos.y - this.position.y
        };
        
        // Normalize direction
        const distance = Math.sqrt(
            directionToTarget.x * directionToTarget.x + 
            directionToTarget.y * directionToTarget.y
        );
        
        if (distance > 0) {
            directionToTarget.x /= distance;
            directionToTarget.y /= distance;
            
            // Calculate ship's orientation
            const shipDirection = {
                x: Math.cos(this.rotation),
                y: Math.sin(this.rotation)
            };
            
            // Calculate dot product to see which side the target is on
            const dotProduct = shipDirection.x * directionToTarget.x + shipDirection.y * directionToTarget.y;
            const crossProduct = shipDirection.x * directionToTarget.y - shipDirection.y * directionToTarget.x;
            
            // If target is to the left side of the ship
            if (crossProduct > 0) {
                const leftDirection = {
                    x: -shipDirection.y,
                    y: shipDirection.x
                };
                this.leftCannon.fire(leftDirection, 8);
            }
            
            // If target is to the right side of the ship
            if (crossProduct < 0) {
                const rightDirection = {
                    x: shipDirection.y,
                    y: -shipDirection.x
                };
                this.rightCannon.fire(rightDirection, 8);
            }
            
            // If target is somewhat in front of the ship
            if (dotProduct > 0.5) {
                // Fire both cannons with some spread
                const leftDirection = {
                    x: shipDirection.x * 0.8 - shipDirection.y * 0.6,
                    y: shipDirection.y * 0.8 + shipDirection.x * 0.6
                };
                
                const rightDirection = {
                    x: shipDirection.x * 0.8 + shipDirection.y * 0.6,
                    y: shipDirection.y * 0.8 - shipDirection.x * 0.6
                };
                
                this.leftCannon.fire(leftDirection, 8);
                this.rightCannon.fire(rightDirection, 8);
            }
        }
    }
    
    public render(ctx: CanvasRenderingContext2D): void {
        // Render the base ship first
        super.render(ctx);
        
        // Then render cannons
        this.leftCannon.render(ctx);
        this.rightCannon.render(ctx);
        
        // Draw enemy flag
        this.renderEnemyFlag(ctx);
        
        // Draw detection range in debug mode
        if (BaseGameObject.isDebugMode()) {
            this.renderDebug(ctx);
            this.renderDetectionRange(ctx);
        }
    }
    
    /**
     * Render debug visualization of the enemy ship's physics body
     */
    protected override renderPhysicsBody(ctx: CanvasRenderingContext2D): void {
        // First, call the base class implementation to draw the basic ship body
        super.renderPhysicsBody(ctx);
        
        if (!this.body) return;
        
        // Draw firing range (different from detection range)
        ctx.beginPath();
        ctx.arc(this.position.x, this.position.y, 300, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(255, 100, 0, 0.5)'; // Orange for firing range
        ctx.setLineDash([8, 4]);
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.setLineDash([]);
        
        // Draw targeting sectors for cannons
        ctx.save();
        ctx.translate(this.position.x, this.position.y);
        ctx.rotate(this.rotation);
        
        // Left cannon arc
        ctx.beginPath();
        ctx.arc(0, 0, 150, Math.PI/2, Math.PI, false);
        ctx.lineTo(0, 0);
        ctx.closePath();
        ctx.fillStyle = 'rgba(255, 0, 0, 0.1)';
        ctx.fill();
        ctx.strokeStyle = 'rgba(255, 0, 0, 0.3)';
        ctx.lineWidth = 1;
        ctx.stroke();
        
        // Right cannon arc
        ctx.beginPath();
        ctx.arc(0, 0, 150, 0, Math.PI/2, false);
        ctx.lineTo(0, 0);
        ctx.closePath();
        ctx.fillStyle = 'rgba(255, 0, 0, 0.1)';
        ctx.fill();
        ctx.strokeStyle = 'rgba(255, 0, 0, 0.3)';
        ctx.lineWidth = 1;
        ctx.stroke();
        
        ctx.restore();
    }
    
    private renderEnemyFlag(ctx: CanvasRenderingContext2D): void {
        // Draw a small black pirate flag at the top of the ship
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
        
        // Draw rectangular flag
        ctx.fillStyle = Color.BLACK; // Pirate flag is black
        ctx.fillRect(0, -this.height / 2 - 20, 15, 10);
        
        // Draw crude skull and crossbones (just a white X)
        ctx.beginPath();
        ctx.moveTo(2, -this.height / 2 - 18);
        ctx.lineTo(13, -this.height / 2 - 12);
        ctx.moveTo(13, -this.height / 2 - 18);
        ctx.lineTo(2, -this.height / 2 - 12);
        ctx.strokeStyle = Color.WHITE;
        ctx.lineWidth = 1;
        ctx.stroke();
        
        ctx.restore();
    }
    
    private renderDetectionRange(ctx: CanvasRenderingContext2D): void {
        if (!this.target) return;
        
        // Draw detection radius
        ctx.beginPath();
        ctx.arc(this.position.x, this.position.y, this.detectionRange, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(255, 0, 0, 0.2)';
        ctx.setLineDash([5, 5]);
        ctx.stroke();
        ctx.setLineDash([]);
        
        // Draw line to target if within range
        const targetPos = this.target.getPosition();
        const distanceToTarget = Math.sqrt(
            Math.pow(targetPos.x - this.position.x, 2) + 
            Math.pow(targetPos.y - this.position.y, 2)
        );
        
        if (distanceToTarget <= this.detectionRange) {
            ctx.beginPath();
            ctx.moveTo(this.position.x, this.position.y);
            ctx.lineTo(targetPos.x, targetPos.y);
            ctx.strokeStyle = 'rgba(255, 0, 0, 0.5)';
            ctx.stroke();
        }
    }
}
