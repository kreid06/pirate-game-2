import { VisualEffect } from './visualEffect';

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
