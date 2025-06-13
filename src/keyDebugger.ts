/**
 * This module adds a direct key event listener to help debug key press issues
 */

import { Game } from './game';

export class KeyDebugger {
    private static isInitialized = false;
    private static domElement: HTMLDivElement | null = null;
    private static gameInstance: Game | null = null;
    
    public static initialize(): void {
        if (this.isInitialized) return;
        
        // Create a DOM element to show key press status
        this.createDebugDisplay();
        
        // Add global key event listeners to log all key events directly
        window.addEventListener('keydown', (e) => {
            const key = e.key.toLowerCase();
            // console.log(`Direct keydown event detected: ${key} (code: ${e.code})`);
            
            // Update the DOM display
            this.updateKeyDisplay(key, true);
            
            // Specifically handle P and L keys for quick testing
            if (key === 'p') {
                // console.log('P key pressed directly - should toggle physics world');
            } else if (key === 'l') {
                // console.log('L key pressed directly - should toggle debug mode');
            }
        });
        
        window.addEventListener('keyup', (e) => {
            const key = e.key.toLowerCase();
            // console.log(`Direct keyup event detected: ${key} (code: ${e.code})`);
            
            // Update the DOM display
            this.updateKeyDisplay(key, false);
        });
        
        // console.log('KeyDebugger initialized - direct key event listeners added');
        this.isInitialized = true;    }
    
    // Set the game instance to interact with it directly
    public static setGameInstance(game: Game): void {
        this.gameInstance = game;
        // console.log('Game instance set in KeyDebugger');
        
        // Add buttons to the debug display for direct control
        if (this.domElement) {
            const buttonContainer = document.createElement('div');
            buttonContainer.style.marginTop = '10px';
            buttonContainer.style.pointerEvents = 'auto'; // Enable mouse events for buttons
            
            // Simulate P key button
            const pButton = document.createElement('button');
            pButton.innerText = 'Simulate P Key';
            pButton.style.marginRight = '5px';
            pButton.onclick = () => this.simulatePKeyPress();
            
            // Simulate L key button
            const lButton = document.createElement('button');
            lButton.innerText = 'Simulate L Key';
            lButton.style.marginRight = '5px';
            lButton.onclick = () => this.simulateLKeyPress();
            
            // Toggle physics button
            const physicsButton = document.createElement('button');
            physicsButton.innerText = 'Toggle Physics';
            physicsButton.style.marginRight = '5px';
            physicsButton.onclick = () => this.togglePhysicsWorld();
              // Toggle debug button
            const debugButton = document.createElement('button');
            debugButton.innerText = 'Toggle Debug';
            debugButton.style.marginRight = '5px';
            debugButton.onclick = () => this.toggleDebugMode();
              // Log keys button
            const logKeysButton = document.createElement('button');
            logKeysButton.innerText = 'Log Keys';
            logKeysButton.style.marginRight = '5px';
            logKeysButton.onclick = () => this.logKeyStates();
            
            // Test collision button
            const collisionButton = document.createElement('button');
            collisionButton.innerText = 'Test Collision';
            collisionButton.style.marginRight = '5px';
            collisionButton.onclick = () => this.spawnBrigantineForCollision();
              // Sync brigantine button
            const syncButton = document.createElement('button');
            syncButton.innerText = 'Sync Brigantine';
            syncButton.onclick = () => this.syncBrigantine();
              // Add buttons to container
            buttonContainer.appendChild(pButton);
            buttonContainer.appendChild(lButton);
            buttonContainer.appendChild(physicsButton);
            buttonContainer.appendChild(debugButton);
            buttonContainer.appendChild(logKeysButton);
            buttonContainer.appendChild(collisionButton);
            buttonContainer.appendChild(syncButton);
            buttonContainer.appendChild(syncButton);
            
            // Add container to debug display
            this.domElement.appendChild(buttonContainer);
        }
    }
    
    // Simulate pressing the P key
    public static simulatePKeyPress(): void {
        if (!this.gameInstance) {
            console.error('Game instance not set in KeyDebugger');
            return;
        }
        
        console.log('Simulating P key press');
        this.gameInstance.getInput().simulateKeyPress('p');
    }
    
    // Simulate pressing the L key
    public static simulateLKeyPress(): void {
        if (!this.gameInstance) {
            console.error('Game instance not set in KeyDebugger');
            return;
        }
        
        console.log('Simulating L key press');
        this.gameInstance.getInput().simulateKeyPress('l');
    }
    
    // Directly toggle physics world visibility
    public static togglePhysicsWorld(): void {
        if (!this.gameInstance) {
            console.error('Game instance not set in KeyDebugger');
            return;
        }
        
        console.log('Directly toggling physics world');
        this.gameInstance.togglePhysicsWorld();
    }
      // Directly toggle debug mode
    public static toggleDebugMode(): void {
        if (!this.gameInstance) {
            console.error('Game instance not set in KeyDebugger');
            return;
        }
        
        console.log('Directly toggling debug mode');
        this.gameInstance.toggleDebugMode();
    }
    
    // Log the current state of keys in the input manager
    public static logKeyStates(): void {
        if (!this.gameInstance) {
            console.error('Game instance not set in KeyDebugger');
            return;
        }
        
        // console.log('Logging key states:');
        // console.log('P key is down:', this.gameInstance.getInput().isKeyDown('p'));
        // console.log('L key is down:', this.gameInstance.getInput().isKeyDown('l'));
        // console.log('P key was just pressed:', this.gameInstance.getInput().wasKeyJustPressed('p'));
        // console.log('L key was just pressed:', this.gameInstance.getInput().wasKeyJustPressed('l'));
    }
    
    // Spawn a brigantine ship close to the player for collision testing
    public static spawnBrigantineForCollision(): void {
        if (!this.gameInstance) {
            console.error('Game instance not set in KeyDebugger');
            return;
        }
        
        console.log('Spawning brigantine for collision testing');
        this.gameInstance.spawnBrigantineNearPlayer();
    }
    
    // Sync the brigantine's visual and physics coordinates
    public static syncBrigantine(): void {
        if (!this.gameInstance) {
            console.error('Game instance not set in KeyDebugger');
            return;
        }
        
        console.log('Manually syncing brigantine visual coordinates with physics body');
        this.gameInstance.syncBrigantineWithPhysics();
    }
    
    private static createDebugDisplay(): void {
        // Create a floating div to show key presses
        const debugDiv = document.createElement('div');
        debugDiv.style.position = 'fixed';
        debugDiv.style.bottom = '10px';
        debugDiv.style.right = '10px';
        debugDiv.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
        debugDiv.style.padding = '10px';
        debugDiv.style.color = 'white';
        debugDiv.style.fontFamily = 'monospace';
        debugDiv.style.fontSize = '14px';
        debugDiv.style.zIndex = '9999';
        debugDiv.style.borderRadius = '5px';
        debugDiv.style.pointerEvents = 'none'; // Don't interfere with mouse events
        
        // Add initial content
        debugDiv.innerHTML = '<div>Key Debug Display</div>' +
                             '<div id="key-p">P: ❌</div>' + 
                             '<div id="key-l">L: ❌</div>';
        
        // Add to document
        document.body.appendChild(debugDiv);
        this.domElement = debugDiv;
    }
    
    private static updateKeyDisplay(key: string, isDown: boolean): void {
        if (!this.domElement) return;
        
        // Only update for P and L keys
        if (key === 'p' || key === 'l') {
            const keyElement = document.getElementById(`key-${key}`);
            if (keyElement) {
                keyElement.innerHTML = `${key.toUpperCase()}: ${isDown ? '✅' : '❌'}`;
                
                // Add highlight animation
                keyElement.style.transition = 'background-color 0.3s';
                keyElement.style.backgroundColor = isDown ? 'rgba(0, 255, 0, 0.3)' : 'transparent';
                
                // Clear highlight after a moment
                if (!isDown) {
                    setTimeout(() => {
                        if (keyElement) keyElement.style.backgroundColor = 'transparent';
                    }, 300);
                }
            }        }
    }
}

// Add KeyDebugger to global scope for console access
(window as any).KeyDebugger = KeyDebugger;
console.log('KeyDebugger added to global scope. Access it via window.KeyDebugger in the console.');
