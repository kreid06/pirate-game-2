export enum KeyState {
    UP,
    DOWN,
    JUST_PRESSED,
    JUST_RELEASED
}

export class Input {
    private keys: Map<string, KeyState>;
    private previousKeys: Map<string, KeyState>;
    private mouseX: number;
    private mouseY: number;
    private mouseDown: boolean;
    private wheelDelta: number;
    private interactCallback: (() => void) | null = null;
    
    constructor() {
        this.keys = new Map();
        this.previousKeys = new Map();
        this.mouseX = 0;
        this.mouseY = 0;
        this.mouseDown = false;
        this.wheelDelta = 0;
          // Set up event listeners
        window.addEventListener('keydown', (e) => {
            // For important game keys, prevent default browser behavior
            if (e.key.toLowerCase() === 'e' || e.key.toLowerCase() === 't') {
                e.preventDefault();
            }
            
            this.onKeyDown(e);
            // Don't prevent default for other keys to allow browser functionality to work
        });
        window.addEventListener('keyup', (e) => {
            this.onKeyUp(e);
            // Don't prevent default to allow browser functionality to work
        });
        window.addEventListener('mousemove', (e) => this.onMouseMove(e));
        window.addEventListener('mousedown', () => this.onMouseDown());
        window.addEventListener('mouseup', () => this.onMouseUp());
        window.addEventListener('wheel', (e) => this.onWheel(e));
    }
    
    /**
     * Register a callback to be called when the 'E' key is pressed
     * for interaction with highlighted objects
     */
    public setInteractCallback(callback: () => void): void {
        this.interactCallback = callback;
    }
    
    private onKeyDown(e: KeyboardEvent): void {
        const key = e.key.toLowerCase();
        
        // Special handling for E key (for boarding interactions)
        if (key === 'e') {
            // Stop propagation to ensure no other elements capture this event
            e.stopPropagation();
            
            // Ensure we set it to JUST_PRESSED regardless of current state
            this.keys.set(key, KeyState.JUST_PRESSED);
            
            // Directly trigger the interact callback when E is pressed
            if (this.interactCallback) {
                this.interactCallback();
            }
            
            return;
        }
        
        // Stop propagation for test key too
        if (key === 't') {
            e.stopPropagation();
            
            // Make T key behave like E and other toggle keys
            this.keys.set(key, KeyState.JUST_PRESSED);
            return;
        }
        
        // Special handling for P and L keys for debug purposes
        if (key === 'p' || key === 'l') {
            this.keys.set(key, KeyState.JUST_PRESSED);
            return;
        }
        
        // Standard key handling for all other keys
        // If the key was up previously or not yet registered, mark it as JUST_PRESSED
        const currentState = this.keys.get(key);
        if (currentState !== KeyState.DOWN && currentState !== KeyState.JUST_PRESSED) {
            this.keys.set(key, KeyState.JUST_PRESSED);
        }
    }
    
    private onKeyUp(e: KeyboardEvent): void {
        const key = e.key.toLowerCase();
        
        // Special handling for P and L keys
        if (key === 'p' || key === 'l') {
            // console.log(`DEBUG KEY RELEASED: ${key.toUpperCase()}`);
            // FIXED: Set to UP state immediately to allow the key to be pressed again
            this.keys.set(key, KeyState.UP);
            return;
        }
        
        // Mark the key as JUST_RELEASED
        this.keys.set(key, KeyState.JUST_RELEASED);
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
        const lowercaseKey = key.toLowerCase();
        const state = this.keys.get(lowercaseKey);
        const result = state === KeyState.DOWN || state === KeyState.JUST_PRESSED;
        
        // For movement keys, log the state to help debug
        // if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(lowercaseKey)) {
        //     console.log(`isKeyDown(${lowercaseKey}): ${result} (state: ${state !== undefined ? KeyState[state] : 'undefined'})`);
        // }
        
        return result;
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
    }    /**
     * Update input state - should be called once per frame
     */
    public update(): void {
        // Store previous key states
        this.previousKeys = new Map(this.keys);
        
        // Process key states that changed this frame
        for (const [key, state] of this.keys.entries()) {
            if (state === KeyState.JUST_PRESSED) {
                // Special keys (E, T, P, L) are treated differently
                if (key === 'e' || key === 't' || key === 'p' || key === 'l') {
                    // Leave these keys in JUST_PRESSED state 
                    // They will be reset to UP after being handled
                    // This is to ensure they work as toggle switches
                } else {
                    // For normal keys, move from JUST_PRESSED to DOWN state
                    this.keys.set(key, KeyState.DOWN);
                }
            } else if (state === KeyState.JUST_RELEASED) {
                // Move from JUST_RELEASED to UP state
                this.keys.set(key, KeyState.UP);
            }
        }
    }    /**
     * Check if a key was just pressed this frame
     */
    public wasKeyJustPressed(key: string): boolean {
        const lowercaseKey = key.toLowerCase();
        const currentState = this.keys.get(lowercaseKey);
        const isPressed = currentState === KeyState.JUST_PRESSED;
        
        // After checking E or T key, set it to UP so it can be pressed again
        if ((lowercaseKey === 'e' || lowercaseKey === 't' || lowercaseKey === 'p' || lowercaseKey === 'l') && isPressed) {
            this.keys.set(lowercaseKey, KeyState.UP);
        }
        
        return isPressed;
    }
    
    /**
     * Check if a key was just released this frame
     */
    public wasKeyJustReleased(key: string): boolean {
        return this.keys.get(key.toLowerCase()) === KeyState.JUST_RELEASED;
    }    /**
     * Simulate a key press - for testing purposes
     */
    public simulateKeyPress(key: string): void {
        const lowercaseKey = key.toLowerCase();
        // console.log(`Simulating key press for: ${lowercaseKey}`);
        
        // For P and L keys, make sure they get set to JUST_PRESSED regardless of current state
        // This ensures they work as toggle switches
        if (lowercaseKey === 'p' || lowercaseKey === 'l') {
            // console.log(`DEBUG: Simulating ${lowercaseKey.toUpperCase()} key press - setting to JUST_PRESSED`);
            this.keys.set(lowercaseKey, KeyState.JUST_PRESSED);
            return;
        }
        
        // For other keys, follow normal key state transition logic
        const currentState = this.keys.get(lowercaseKey);
        if (currentState !== KeyState.DOWN && currentState !== KeyState.JUST_PRESSED) {
            this.keys.set(lowercaseKey, KeyState.JUST_PRESSED);
        }
    }    /**
     * Called after all game logic updates to finalize the key state transitions
     * This should be called at the end of the game update cycle
     */
    public finalizeUpdate(): void {
        // Reset toggle keys that were JUST_PRESSED
        for (const [key, state] of this.keys.entries()) {
            if ((key === 'e' || key === 't' || key === 'p' || key === 'l') && state === KeyState.JUST_PRESSED) {
                this.keys.set(key, KeyState.UP);
            }
        }
    }
    
    /**
     * Clear a key from the pressed keys list
     * @param key The key to clear
     */
    public clearKey(key: string): void {
        this.keys.delete(key.toLowerCase());
    }
}
