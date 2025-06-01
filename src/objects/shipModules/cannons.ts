import { BaseShipModule } from './shipModules';
import { Color } from '../../utils/color';
import { Cannonball } from '../projectiles/cannonball';

export class Cannons extends BaseShipModule {
    private width: number;
    private height: number;
    private cooldown: number;
    private maxCooldown: number;
    private cannonballs: Cannonball[];
    
    constructor(offsetX: number, offsetY: number) {
        super(offsetX, offsetY);
        this.width = 10;
        this.height = 20;
        this.cooldown = 0;
        this.maxCooldown = 1; // 1 second between shots
        this.cannonballs = [];
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
    }
    
    public fire(direction: { x: number, y: number }, speed: number): boolean {
        // Check if cannon is ready to fire
        if (this.cooldown <= 0) {
            // Reset cooldown
            this.cooldown = this.maxCooldown;
            
            // Get cannon position
            const pos = this.getWorldPosition();
            
            // Create a new cannonball
            const cannonball = new Cannonball(pos.x, pos.y, direction, speed);
            this.cannonballs.push(cannonball);
            
            return true;
        }
        
        return false;
    }
    
    public getCannonballs(): Cannonball[] {
        return this.cannonballs;
    }
}
