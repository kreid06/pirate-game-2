import { VisualEffect } from './visualEffect';
import { Color } from '../../utils/color';

/**
 * Visual effect for collision impacts between objects
 */
export class CollisionImpact extends VisualEffect {
    private rings: {
        radius: number;
        alpha: number;
        width: number;
    }[];
    
    constructor(x: number, y: number, size: number = 20) {
        // Ensure size is always positive
        const safeSize = Math.max(5, size);
        super(x, y, safeSize, 0.5);  // 0.5 second duration
        
        // Create concentric rings for impact effect
        this.rings = [];
        const ringCount = 3;
        
        for (let i = 0; i < ringCount; i++) {
            this.rings.push({
                radius: 1, // Start with small positive radius
                alpha: 0.8 - (i * 0.2),
                width: Math.max(1, 3 - (i * 0.5)) // Ensure width is at least 1px
            });
        }
    }
      public update(delta: number): void {
        super.update(delta);
        
        if (this.finished) return;
          // Update ring sizes
        for (let i = 0; i < this.rings.length; i++) {
            const ring = this.rings[i];
            // Each ring expands at a different rate
            const maxRadius = Math.max(1, this.size * (0.5 + (i * 0.5)));
            // Ensure radius is always positive
            ring.radius = Math.max(1, maxRadius * this.getProgress());
            // Fade out as they expand
            ring.alpha = Math.max(0, (1 - this.getProgress()) * (0.8 - (i * 0.2)));
        }
    }
      public render(ctx: CanvasRenderingContext2D): void {
        if (this.finished) return;
        
        // Save context
        ctx.save();
        
        // Translate to effect position
        ctx.translate(this.position.x, this.position.y);
          // Draw each ring
        for (const ring of this.rings) {
            // Skip rendering if radius is invalid
            if (ring.radius <= 0) continue;
            
            // Draw outer ring with safety check
            ctx.beginPath();
            ctx.arc(0, 0, Math.max(1, ring.radius), 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(255, 255, 255, ${ring.alpha})`;
            ctx.lineWidth = Math.max(0.5, ring.width);
            ctx.stroke();
            
            // Add a colored inner stroke for contrast
            // Ensure inner radius is always positive and less than outer radius
            const innerRadius = Math.max(0.5, ring.radius - ring.width/2);
            ctx.beginPath();
            ctx.arc(0, 0, innerRadius, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(255, 100, 50, ${ring.alpha * 0.7})`;
            ctx.lineWidth = Math.max(0.5, ring.width / 2);
            ctx.stroke();
        }
          // Add a center flash that fades quickly
        const centerAlpha = Math.max(0, 0.9 - (this.getProgress() * 3));
        if (centerAlpha > 0) {
            const flashRadius = Math.max(1, this.size * 0.4);
            const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, flashRadius);
            gradient.addColorStop(0, `rgba(255, 200, 50, ${centerAlpha})`);
            gradient.addColorStop(1, `rgba(255, 100, 50, 0)`);
            
            ctx.beginPath();
            ctx.arc(0, 0, flashRadius, 0, Math.PI * 2);
            ctx.fillStyle = gradient;
            ctx.fill();
            
            // Add an extra bright center point
            if (centerAlpha > 0.3) {
                ctx.beginPath();
                ctx.arc(0, 0, Math.max(0.5, this.size * 0.1), 0, Math.PI * 2);
                ctx.fillStyle = `rgba(255, 255, 255, ${centerAlpha})`;
                ctx.fill();
            }
        }
        
        // Restore context
        ctx.restore();
    }
}
