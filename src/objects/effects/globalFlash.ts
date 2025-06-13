import { VisualEffect } from './visualEffect';

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
