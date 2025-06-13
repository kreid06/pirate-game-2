import { VisualEffect } from './visualEffect';

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
