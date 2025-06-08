import { BaseShipModule } from './shipModules';
import { Color } from '../../utils/color';
import { Cannonball } from '../projectiles/cannonball';
import { SoundManager } from '../../engine/soundManager';
import { Physics } from '../../engine/physics';

export class Cannons extends BaseShipModule {
    private width: number;
    private height: number;
    private cooldown: number;
    private maxCooldown: number;
    private cannonballs: Cannonball[];
    private static soundManager: SoundManager | null = null;
    private static physics: Physics | null = null;
    
    constructor(offsetX: number, offsetY: number) {
        super(offsetX, offsetY);
        this.width = 10;
        this.height = 20;
        this.cooldown = 0;
        this.maxCooldown = 1; // 1 second between shots
        this.cannonballs = [];
    }
    
    /**
     * Set a global sound manager for all cannons to use
     */
    public static setSoundManager(soundManager: SoundManager): void {
        Cannons.soundManager = soundManager;
    }
    
    /**
     * Set a global physics engine for all cannons to use
     */
    public static setPhysics(physics: Physics): void {
        Cannons.physics = physics;
    }
      public update(delta: number): void {
        super.update(delta);
        
        // Update cooldown
        if (this.cooldown > 0) {
            this.cooldown -= delta;
        }
        
        // Update cannonballs
        for (let i = this.cannonballs.length - 1; i >= 0; i--) {
            const cannonball = this.cannonballs[i];
            cannonball.update(delta);
            
            // Remove cannonballs that should be destroyed
            if (cannonball.shouldDestroy()) {
                // Remove from physics engine if available
                if (Cannons.physics && cannonball.getBody()) {
                    Cannons.physics.removeBody(cannonball.getBody()!);
                }
                
                // Remove from cannonballs array
                this.cannonballs.splice(i, 1);
            }
        }
    }
    
    public render(ctx: CanvasRenderingContext2D): void {
        if (!this.ship) return;
        
        // Get world position of the cannon
        const pos = this.getWorldPosition();
        const rotation = this.ship.getRotation();
        
        // Save context
        ctx.save();
        
        // Translate and rotate around cannon center
        ctx.translate(pos.x, pos.y);
        ctx.rotate(rotation);
        
        // Draw cannon (black rectangle)
        ctx.fillStyle = Color.BLACK;
        ctx.fillRect(-this.width / 2, -this.height / 2, this.width, this.height);
        
        // Restore context
        ctx.restore();
        
        // Render cannonballs
        for (const cannonball of this.cannonballs) {
            cannonball.render(ctx);
        }
        
        // Render debug visualization if enabled
        if (this.ship && this.ship.constructor.name === 'BaseGameObject' && 
            'isDebugMode' in this.ship.constructor && 
            (this.ship.constructor as any).isDebugMode()) {
            this.renderDebug(ctx);
        }
    }
      /**
     * Override base renderDebug to add cannon-specific debug info
     */
    public override renderDebug(ctx: CanvasRenderingContext2D): void {
        // Call base class debug rendering
        super.renderDebug(ctx);
        
        if (!this.ship) return;
        
        const pos = this.getWorldPosition();
        
        // Draw cooldown indicator
        const cooldownRatio = this.cooldown / this.maxCooldown;
        if (cooldownRatio > 0) {
            ctx.beginPath();
            ctx.arc(pos.x, pos.y, 15, 0, Math.PI * 2 * cooldownRatio);
            ctx.strokeStyle = 'rgba(255, 0, 0, 0.8)';
            ctx.lineWidth = 3;
            ctx.stroke();
        }
        
        // Draw effective range
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, 200, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(255, 255, 0, 0.2)';
        ctx.setLineDash([5, 5]);
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.setLineDash([]);
    }
    
    public fire(direction: { x: number, y: number }, damage: number): boolean {
        // Check if cannon is ready to fire
        if (this.cooldown <= 0) {
            // Reset cooldown
            this.cooldown = this.maxCooldown;
            
            // Get cannon position
            const pos = this.getWorldPosition();
            
            // Create a new cannonball
            const cannonball = new Cannonball(pos.x, pos.y, direction, damage);
            this.cannonballs.push(cannonball);
            
            // Add cannonball to physics engine if available
            if (Cannons.physics && cannonball.getBody()) {
                Cannons.physics.addBody(cannonball.getBody()!);
            }
            
            // Play cannon fire sound
            if (Cannons.soundManager) {
                Cannons.soundManager.playSound('cannon', 0.3 + Math.random() * 0.2);
            }
            
            return true;
        }
        
        return false;
    }
    
    public getCannonballs(): Cannonball[] {
        return this.cannonballs;
    }
}
