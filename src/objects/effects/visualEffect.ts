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
