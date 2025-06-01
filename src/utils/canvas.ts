export class Canvas {
    private canvas: HTMLCanvasElement;
    private context: CanvasRenderingContext2D;
    
    constructor(canvasId: string) {
        this.canvas = document.getElementById(canvasId) as HTMLCanvasElement;
        if (!this.canvas) {
            throw new Error(`Canvas element with ID ${canvasId} not found`);
        }
        
        const context = this.canvas.getContext('2d');
        if (!context) {
            throw new Error('Failed to get 2D context from canvas');
        }
        this.context = context;
        
        // Set canvas to full window size
        this.resizeCanvas();
        window.addEventListener('resize', () => this.resizeCanvas());
    }
    
    private resizeCanvas(): void {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }
    
    public getCanvas(): HTMLCanvasElement {
        return this.canvas;
    }
    
    public getContext(): CanvasRenderingContext2D {
        return this.context;
    }
    
    public getWidth(): number {
        return this.canvas.width;
    }
    
    public getHeight(): number {
        return this.canvas.height;
    }
    
    public clear(color: string = '#1e90ff'): void {
        this.context.fillStyle = color;
        this.context.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }
}
