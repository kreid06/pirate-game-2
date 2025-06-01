export enum KeyState {
    UP,
    DOWN
}

export class Input {
    private keys: Map<string, KeyState>;
    private mouseX: number;
    private mouseY: number;
    private mouseDown: boolean;
    private wheelDelta: number;
    
    constructor() {
        this.keys = new Map();
        this.mouseX = 0;
        this.mouseY = 0;
        this.mouseDown = false;
        this.wheelDelta = 0;
        
        // Set up event listeners
        window.addEventListener('keydown', (e) => this.onKeyDown(e));
        window.addEventListener('keyup', (e) => this.onKeyUp(e));
        window.addEventListener('mousemove', (e) => this.onMouseMove(e));
        window.addEventListener('mousedown', () => this.onMouseDown());
        window.addEventListener('mouseup', () => this.onMouseUp());
        window.addEventListener('wheel', (e) => this.onWheel(e));
    }
    
    private onKeyDown(e: KeyboardEvent): void {
        this.keys.set(e.key.toLowerCase(), KeyState.DOWN);
    }
    
    private onKeyUp(e: KeyboardEvent): void {
        this.keys.set(e.key.toLowerCase(), KeyState.UP);
    }
    
    private onMouseMove(e: MouseEvent): void {
        this.mouseX = e.clientX;
        this.mouseY = e.clientY;
    }
    
    private onMouseDown(): void {
        this.mouseDown = true;
    }
      private onMouseUp(): void {
        this.mouseDown = false;
    }
    
    private onWheel(e: WheelEvent): void {
        // Positive delta means wheel scrolled down (zoom out)
        // Negative delta means wheel scrolled up (zoom in)
        this.wheelDelta = e.deltaY;
        
        // Prevent default scrolling behavior
        e.preventDefault();
    }
    
    public isKeyDown(key: string): boolean {
        return this.keys.get(key.toLowerCase()) === KeyState.DOWN;
    }
      public getMousePosition(): { x: number, y: number } {
        return { x: this.mouseX, y: this.mouseY };
    }
    
    public isMouseDown(): boolean {
        return this.mouseDown;
    }
    
    public getWheelDelta(): number {
        const delta = this.wheelDelta;
        // Reset wheel delta after reading it
        this.wheelDelta = 0;
        return delta;
    }
}
