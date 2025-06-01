import { Canvas } from './utils/canvas';
import { Physics } from './engine/physics';
import { Renderer } from './engine/renderer';
import { Input } from './engine/input';
import { Camera } from './engine/camera';
import { WorldGenerator } from './engine/worldGenerator';
import { Player } from './objects/player';

export class Game {
    private canvas: Canvas;
    private physics: Physics;
    private renderer: Renderer;
    private input: Input;
    private camera: Camera;
    private worldGenerator: WorldGenerator;
    private player: Player;
    private lastTime: number;
    private running: boolean;
      constructor() {
        this.canvas = new Canvas('game-canvas');
        this.physics = new Physics();
        this.renderer = new Renderer(this.canvas);
        this.input = new Input();
          // Create camera with reference to canvas
        this.camera = new Camera(this.canvas);
        
        // Set camera on renderer
        this.renderer.setCamera(this.camera);
          // Create world generator
        this.worldGenerator = new WorldGenerator(this.camera, this.canvas);
        
        // Set world generator on renderer
        this.renderer.setWorldGenerator(this.worldGenerator);
        
        // Create player in the center of the screen
        const centerX = this.canvas.getWidth() / 2;
        const centerY = this.canvas.getHeight() / 2;
        this.player = new Player(centerX, centerY, 20, this.input);
        
        // Set camera on player and set player as camera target
        this.player.setCamera(this.camera);
        this.camera.setTarget(this.player);
        
        // Add player to physics engine and renderer
        this.physics.addBody(this.player.getBody()!);
        this.renderer.addGameObject(this.player);
        
        this.lastTime = 0;
        this.running = false;
    }
    
    public start(): void {
        this.running = true;
        this.lastTime = performance.now();
        requestAnimationFrame(this.gameLoop.bind(this));
    }
    
    private gameLoop(timestamp: number): void {
        // Calculate delta time in seconds
        const deltaTime = (timestamp - this.lastTime) / 1000;
        this.lastTime = timestamp;
        
        // Update physics
        this.physics.update(deltaTime * 1000); // Matter.js expects delta in ms
        
        // Update game objects
        this.update(deltaTime);
        
        // Render game objects
        this.renderer.render();
        
        // Continue the game loop
        if (this.running) {
            requestAnimationFrame(this.gameLoop.bind(this));
        }
    }    private update(delta: number): void {
        // Update player
        this.player.update(delta);
        
        // Update camera
        this.camera.update();
        
        // Update world generator for parallax effect
        this.worldGenerator.update();
        
        // Handle camera zoom controls with keyboard
        if (this.input.isKeyDown('q')) {
            this.camera.zoomOut(0.02); // Zoom out slowly
        }
        if (this.input.isKeyDown('e')) {
            this.camera.zoomIn(0.02); // Zoom in slowly
        }
        
        // Handle camera zoom with mouse wheel
        const wheelDelta = this.input.getWheelDelta();
        if (wheelDelta !== 0) {
            // Normalize the wheel delta (it can be quite large)
            const zoomAmount = wheelDelta * 0.0005;
            if (zoomAmount > 0) {
                this.camera.zoomOut(zoomAmount);
            } else {
                this.camera.zoomIn(-zoomAmount);
            }
        }
        
        // Add more game logic here as needed
    }
}
