import { VisualEffect } from './visualEffect';
import { WaterSplash } from './waterSplash';
import { Explosion } from './explosion';
import { GlobalFlash } from './globalFlash';
import { CollisionImpact } from './collisionImpact';

/**
 * Manages visual effects
 */
export class EffectManager {
    private effects: VisualEffect[];
    
    constructor() {
        this.effects = [];
    }
    
    public addEffect(effect: VisualEffect): void {
        this.effects.push(effect);
    }
    
    public update(delta: number): void {
        // Update all effects
        for (let i = this.effects.length - 1; i >= 0; i--) {
            const effect = this.effects[i];
            effect.update(delta);
            
            // Remove finished effects
            if (effect.isFinished()) {
                this.effects.splice(i, 1);
            }
        }
    }
    
    public render(ctx: CanvasRenderingContext2D): void {
        // Render all effects
        for (const effect of this.effects) {
            effect.render(ctx);
        }
    }
      
    public createWaterSplash(x: number, y: number, size: number = 30): WaterSplash {
        const splash = new WaterSplash(x, y, size);
        this.addEffect(splash);
        return splash;
    }
    
    public createExplosion(x: number, y: number, size: number = 50): Explosion {
        const explosion = new Explosion(x, y, size);
        this.addEffect(explosion);
        return explosion;
    }
    
    public createCollisionImpact(x: number, y: number, size: number = 20): CollisionImpact {
        const impact = new CollisionImpact(x, y, size);
        this.addEffect(impact);
        return impact;
    }
    
    public createGlobalFlash(x: number, y: number, color: string = 'rgba(255, 255, 255, 0.3)', duration: number = 0.3): GlobalFlash {
        const flash = new GlobalFlash(x, y, color, duration);
        this.addEffect(flash);
        return flash;
    }
    
    public addGlobalFlash(color: string = 'rgba(255, 255, 255, 0.3)', duration: number = 0.3): GlobalFlash {
        // Position doesn't matter for global flash, so we use 0,0
        return this.createGlobalFlash(0, 0, color, duration);
    }
}
