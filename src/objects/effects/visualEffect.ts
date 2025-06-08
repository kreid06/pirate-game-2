import { BaseGameObject } from '../objects';

/**
 * Base class for temporary visual effects like explosions, splashes, etc.
 */
export class VisualEffect extends BaseGameObject {
    protected duration: number;    // Effect duration in seconds
    protected elapsed: number;     // Elapsed time in seconds
    protected size: number;        // Effect size
    protected finished: boolean;   // Whether the effect has finished
    
    constructor(x: number, y: number, size: number, duration: number) {
        super(x, y);
        this.size = size;
        this.duration = duration;
        this.elapsed = 0;
        this.finished = false;
        
        // Visual effects don't have physics bodies by default
        this.body = null;
    }
    
    public update(delta: number): void {
        if (this.finished) return;
        
        // Update elapsed time
        this.elapsed += delta;
        
        // Check if the effect has finished
        if (this.elapsed >= this.duration) {
            this.finished = true;
        }
    }
    
    public isFinished(): boolean {
        return this.finished;
    }
    
    public getProgress(): number {
        return Math.min(1, this.elapsed / this.duration);
    }
    
    public render(ctx: CanvasRenderingContext2D): void {
        // Base VisualEffect doesn't render anything
        // This is implemented by child classes
    }
}

/**
 * Water splash effect
 */
export class WaterSplash extends VisualEffect {
    private particles: Array<{
        x: number;
        y: number;
        size: number;
        speed: number;
        angle: number;
        alpha: number;
    }>;
    
    constructor(x: number, y: number, size: number = 30) {
        super(x, y, size, 1.0);  // 1 second duration
        
        // Create splash particles
        this.particles = [];
        const particleCount = Math.floor(size / 3);
        
        for (let i = 0; i < particleCount; i++) {
            this.particles.push({
                x: 0,
                y: 0,
                size: 1 + Math.random() * 3,
                speed: (1 + Math.random() * 2) * size / 20,
                angle: Math.random() * Math.PI * 2,
                alpha: 0.7 + Math.random() * 0.3
            });
        }
    }
    
    public update(delta: number): void {
        super.update(delta);
        
        if (this.finished) return;
        
        // Update particle positions
        for (const particle of this.particles) {
            const distance = particle.speed * this.getProgress();
            particle.x = Math.cos(particle.angle) * distance;
            particle.y = Math.sin(particle.angle) * distance;
            
            // Particles fall back down with gravity
            particle.y += 10 * Math.pow(this.getProgress(), 2);
            
            // Fade out particles
            particle.alpha = 0.7 * (1 - this.getProgress());
        }
    }
    
    public render(ctx: CanvasRenderingContext2D): void {
        if (this.finished) return;
        
        ctx.save();
        ctx.translate(this.position.x, this.position.y);
        
        // Draw splash circle at the base
        const baseRadius = this.size * (0.3 + 0.7 * this.getProgress());
        ctx.beginPath();
        ctx.arc(0, 0, baseRadius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${0.5 * (1 - this.getProgress())})`;
        ctx.fill();
        
        // Draw particles
        for (const particle of this.particles) {
            ctx.beginPath();
            ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(255, 255, 255, ${particle.alpha})`;
            ctx.fill();
        }
        
        ctx.restore();
    }
}

/**
 * Explosion effect
 */
export class Explosion extends VisualEffect {
    private particles: Array<{
        x: number;
        y: number;
        size: number;
        speed: number;
        angle: number;
        color: string;
    }>;
    
    constructor(x: number, y: number, size: number = 50) {
        super(x, y, size, 1.5);  // 1.5 seconds duration
        
        // Create explosion particles
        this.particles = [];
        const particleCount = Math.floor(size / 2);
        
        // Colors for explosion (reds, oranges, yellows)
        const colors = ['#FF4400', '#FF7700', '#FFAA00', '#FFDD00'];
        
        for (let i = 0; i < particleCount; i++) {
            this.particles.push({
                x: 0,
                y: 0,
                size: 2 + Math.random() * 4,
                speed: (1 + Math.random() * 3) * size / 15,
                angle: Math.random() * Math.PI * 2,
                color: colors[Math.floor(Math.random() * colors.length)]
            });
        }
    }
    
    public update(delta: number): void {
        super.update(delta);
        
        if (this.finished) return;
        
        // Update particle positions
        for (const particle of this.particles) {
            // Particles move outward with decreasing speed
            const progress = this.getProgress();
            const speedFactor = 1 - Math.pow(progress, 2);
            const distance = particle.speed * progress * speedFactor * 2;
            
            particle.x = Math.cos(particle.angle) * distance;
            particle.y = Math.sin(particle.angle) * distance;
        }
    }
    
    public render(ctx: CanvasRenderingContext2D): void {
        if (this.finished) return;
        
        ctx.save();
        ctx.translate(this.position.x, this.position.y);
        
        // Draw explosion center
        const centerRadius = this.size * 0.5 * (1 - Math.pow(this.getProgress(), 2));
        if (centerRadius > 0) {
            const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, centerRadius);
            gradient.addColorStop(0, 'rgba(255, 255, 200, 1)');
            gradient.addColorStop(0.7, 'rgba(255, 100, 0, 0.8)');
            gradient.addColorStop(1, 'rgba(255, 50, 0, 0)');
            
            ctx.beginPath();
            ctx.arc(0, 0, centerRadius, 0, Math.PI * 2);
            ctx.fillStyle = gradient;
            ctx.fill();
        }
        
        // Draw particles
        for (const particle of this.particles) {
            const alpha = 1 - this.getProgress();
            ctx.beginPath();
            ctx.arc(particle.x, particle.y, particle.size * (1 - this.getProgress() * 0.5), 0, Math.PI * 2);
            
            // Parse the color to extract RGB components
            const color = particle.color;
            const r = parseInt(color.slice(1, 3), 16);
            const g = parseInt(color.slice(3, 5), 16);
            const b = parseInt(color.slice(5, 7), 16);
            
            ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`;
            ctx.fill();
        }
        
        // Draw smoke (appears as explosion progresses)
        if (this.getProgress() > 0.3) {
            const smokeProgress = (this.getProgress() - 0.3) / 0.7;
            const smokeRadius = this.size * 0.8 * smokeProgress;
            const smokeAlpha = 0.4 * (1 - smokeProgress);
            
            ctx.beginPath();
            ctx.arc(0, 0, smokeRadius, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(100, 100, 100, ${smokeAlpha})`;
            ctx.fill();
        }
        
        ctx.restore();
    }
}

/**
 * Global screen flash effect for visual feedback
 */
export class GlobalFlash extends VisualEffect {
    private color: string;
    
    constructor(x: number, y: number, color: string = 'rgba(255, 255, 255, 0.3)', duration: number = 0.3) {
        // Position doesn't matter for global effects
        super(x, y, 0, duration);
        this.color = color;
    }
    
    public update(delta: number): void {
        super.update(delta);
    }
    
    public render(ctx: CanvasRenderingContext2D): void {
        if (this.finished) return;
        
        // Save the current transformation matrix and other context settings
        ctx.save();
        
        // Reset transformations to draw in screen space
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        
        // Calculate alpha based on progress
        const alpha = 1 - this.getProgress();
        
        // Get the canvas dimensions
        const width = ctx.canvas.width;
        const height = ctx.canvas.height;
        
        // Create a color with adjusted alpha
        const baseColor = this.color.replace(/rgba?\(/, '').replace(/\)/, '').split(',');
        let flashColor;
        
        if (this.color.startsWith('rgba')) {
            // RGBA format
            const r = baseColor[0].trim();
            const g = baseColor[1].trim();
            const b = baseColor[2].trim();
            const originalAlpha = parseFloat(baseColor[3].trim());
            flashColor = `rgba(${r}, ${g}, ${b}, ${originalAlpha * alpha})`;
        } else {
            // RGB format
            const r = baseColor[0].trim();
            const g = baseColor[1].trim();
            const b = baseColor[2].trim();
            flashColor = `rgba(${r}, ${g}, ${b}, ${alpha})`;
        }
        
        // Fill the entire screen with the flash color
        ctx.fillStyle = flashColor;
        ctx.fillRect(0, 0, width, height);
        
        // Restore the context to its original state
        ctx.restore();
    }
}

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
