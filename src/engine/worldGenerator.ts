import { Camera } from './camera';
import { Canvas } from '../utils/canvas';
import { Color } from '../utils/color';

/**
 * Represents a background element that moves with parallax effect
 */
interface ParallaxLayer {
    speed: number;       // How fast the layer moves relative to camera (0-1, where 0 is static, 1 is same as camera)
    depth: number;       // Drawing depth/z-order (lower values drawn first)
    objects: WorldObject[]; // Objects in this layer
}

/**
 * Represents a single object in the parallax world
 */
interface WorldObject {
    x: number;
    y: number;
    render: (ctx: CanvasRenderingContext2D, offsetX: number, offsetY: number) => void;
}

/**
 * Generates and manages the parallaxing world background
 */
export class WorldGenerator {
    private camera: Camera;
    private canvas: Canvas;
    private parallaxLayers: ParallaxLayer[];
    private objectDensity: number;  // Objects per 1000x1000 area
    private generationRadius: number; // How far from camera to generate objects
    private cullingRadius: number;    // How far from camera to remove objects
    private animationsEnabled: boolean = true; // Flag to toggle background animations
      constructor(camera: Camera, canvas: Canvas) {
        this.camera = camera;
        this.canvas = canvas;        this.parallaxLayers = [];
        this.objectDensity = 20; // Increased from 5 to 20 for more objects
        this.generationRadius = 4000; // Increased from 2000 to 4000 for a larger world
        this.cullingRadius = 6000; // Increased from 3000 to 6000
        
        // Initialize parallax layers
        this.initializeLayers();
    }
    
    private initializeLayers(): void {
        // Far background layer (slowest moving)
        this.parallaxLayers.push({
            speed: 0.2,
            depth: 0,
            objects: []
        });
        
        // Middle layer
        this.parallaxLayers.push({
            speed: 0.5,
            depth: 1,
            objects: []
        });
        
        // Near layer (fastest moving)
        this.parallaxLayers.push({
            speed: 0.8,
            depth: 2,
            objects: []
        });
        
        // Generate initial objects for each layer
        this.generateInitialObjects();
    }
    
    private generateInitialObjects(): void {
        const cameraPos = this.camera.getPosition();
        
        // Generate objects for each layer
        this.parallaxLayers.forEach(layer => {
            const layerObjectCount = Math.floor(this.objectDensity * (Math.PI * this.generationRadius * this.generationRadius) / 1000000);
            
            for (let i = 0; i < layerObjectCount; i++) {
                // Generate random position within generation radius
                const angle = Math.random() * Math.PI * 2;
                const distance = Math.random() * this.generationRadius;
                const x = cameraPos.x + Math.cos(angle) * distance;
                const y = cameraPos.y + Math.sin(angle) * distance;
                
                // Add object to layer
                layer.objects.push(this.createRandomObject(x, y, layer.depth));
            }
        });
    }
      private createRandomObject(x: number, y: number, depth: number): WorldObject {
        // Create different objects based on the depth
        if (depth === 0) {
            // Far background - distant islands or deep ocean features
            const objectType = Math.floor(Math.random() * 3);
            
            if (objectType === 0) {
                // Distant island
                return {
                    x,
                    y,
                    render: (ctx, offsetX, offsetY) => {
                        const size = 50 + Math.random() * 150;
                        ctx.fillStyle = Color.SAND;
                        ctx.globalAlpha = 0.3;
                        ctx.beginPath();
                        ctx.arc(x + offsetX, y + offsetY, size, 0, Math.PI * 2);
                        ctx.fill();
                        ctx.globalAlpha = 1;
                    }
                };
            } else if (objectType === 1) {
                // Deep ocean pattern
                return {
                    x,
                    y,
                    render: (ctx, offsetX, offsetY) => {
                        const size = 80 + Math.random() * 120;
                        ctx.fillStyle = Color.OCEAN_DEEP;
                        ctx.globalAlpha = 0.2;
                        ctx.beginPath();
                        ctx.arc(x + offsetX, y + offsetY, size, 0, Math.PI * 2);
                        ctx.fill();
                        ctx.globalAlpha = 1;
                    }
                };
            } else {
                // Light reflection on water
                return {
                    x,
                    y,
                    render: (ctx, offsetX, offsetY) => {
                        const size = 30 + Math.random() * 50;
                        ctx.fillStyle = Color.WHITE;
                        ctx.globalAlpha = 0.05 + Math.random() * 0.05;
                        ctx.beginPath();
                        ctx.arc(x + offsetX, y + offsetY, size, 0, Math.PI * 2);
                        ctx.fill();
                        ctx.globalAlpha = 1;
                    }
                };
            }
        } else if (depth === 1) {
            // Middle layer - seaweed, coral, or rocks
            const objectType = Math.floor(Math.random() * 3);
            
            if (objectType === 0) {
                // Seaweed
                return {
                    x,
                    y,
                    render: (ctx, offsetX, offsetY) => {
                        const height = 40 + Math.random() * 60;
                        const width = 10 + Math.random() * 20;
                        ctx.fillStyle = Color.SEAWEED;
                        ctx.globalAlpha = 0.4;
                        
                        // Draw seaweed stem
                        ctx.beginPath();
                        ctx.moveTo(x + offsetX - width/2, y + offsetY);
                        
                        // Create wavy pattern
                        for (let i = 0; i < height; i += 5) {
                            const waveOffset = Math.sin(i * 0.1) * (width / 2);
                            ctx.lineTo(x + offsetX + waveOffset, y + offsetY - i);
                        }
                        
                        // Complete the shape
                        for (let i = height; i > 0; i -= 5) {
                            const waveOffset = Math.sin(i * 0.1) * (width / 2) + width/2;
                            ctx.lineTo(x + offsetX + waveOffset, y + offsetY - i);
                        }
                        
                        ctx.closePath();
                        ctx.fill();
                        ctx.globalAlpha = 1;
                    }
                };
            } else if (objectType === 1) {
                // Coral
                return {
                    x,
                    y,
                    render: (ctx, offsetX, offsetY) => {
                        const size = 15 + Math.random() * 25;
                        ctx.fillStyle = Color.CORAL;
                        ctx.globalAlpha = 0.5;
                        
                        // Draw coral base
                        ctx.beginPath();
                        ctx.arc(x + offsetX, y + offsetY, size, 0, Math.PI * 2);
                        ctx.fill();
                        
                        // Draw coral branches
                        const branches = 3 + Math.floor(Math.random() * 5);
                        for (let i = 0; i < branches; i++) {
                            const angle = (i / branches) * Math.PI * 2;
                            const length = size * (0.7 + Math.random() * 0.6);
                            
                            ctx.beginPath();
                            ctx.moveTo(x + offsetX, y + offsetY);
                            ctx.lineTo(
                                x + offsetX + Math.cos(angle) * length,
                                y + offsetY + Math.sin(angle) * length
                            );
                            ctx.lineWidth = 3 + Math.random() * 5;
                            ctx.strokeStyle = Color.CORAL;
                            ctx.stroke();
                        }
                        
                        ctx.globalAlpha = 1;
                    }
                };
            } else {
                // Rocks
                return {
                    x,
                    y,
                    render: (ctx, offsetX, offsetY) => {
                        const size = 20 + Math.random() * 30;
                        ctx.fillStyle = '#777777';
                        ctx.globalAlpha = 0.4;
                        
                        ctx.beginPath();
                        ctx.arc(x + offsetX, y + offsetY, size, 0, Math.PI * 2);
                        ctx.fill();
                        
                        // Add some texture to the rock
                        ctx.fillStyle = '#555555';
                        ctx.beginPath();
                        ctx.arc(
                            x + offsetX + size * 0.3, 
                            y + offsetY - size * 0.2, 
                            size * 0.4, 
                            0, Math.PI * 2
                        );
                        ctx.fill();
                        
                        ctx.globalAlpha = 1;
                    }
                };
            }
        } else {
            // Near layer - shallow water patterns or bubbles
            const objectType = Math.floor(Math.random() * 2);
            
            if (objectType === 0) {
                // Shallow water pattern
                return {
                    x,
                    y,
                    render: (ctx, offsetX, offsetY) => {
                        const size = 30 + Math.random() * 50;
                        ctx.fillStyle = Color.OCEAN_SHALLOW;
                        ctx.globalAlpha = 0.15;
                        ctx.beginPath();
                        ctx.arc(x + offsetX, y + offsetY, size, 0, Math.PI * 2);
                        ctx.fill();
                        ctx.globalAlpha = 1;
                    }
                };
            } else {
                // Bubbles
                return {
                    x,
                    y,
                    render: (ctx, offsetX, offsetY) => {
                        const bubbleCount = 3 + Math.floor(Math.random() * 5);
                        ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
                        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
                        ctx.lineWidth = 1;
                        
                        for (let i = 0; i < bubbleCount; i++) {
                            const bubbleSize = 2 + Math.random() * 8;
                            const offsetAngle = Math.random() * Math.PI * 2;
                            const offsetDist = Math.random() * 20;
                            
                            ctx.beginPath();
                            ctx.arc(
                                x + offsetX + Math.cos(offsetAngle) * offsetDist,
                                y + offsetY + Math.sin(offsetAngle) * offsetDist,
                                bubbleSize,
                                0, Math.PI * 2
                            );
                            ctx.fill();
                            ctx.stroke();
                            
                            // Add highlight to bubble
                            ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
                            ctx.beginPath();
                            ctx.arc(
                                x + offsetX + Math.cos(offsetAngle) * offsetDist - bubbleSize * 0.3,
                                y + offsetY + Math.sin(offsetAngle) * offsetDist - bubbleSize * 0.3,
                                bubbleSize * 0.3,
                                0, Math.PI * 2
                            );
                            ctx.fill();
                            ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
                        }
                    }
                };
            }
        }
    }
      /**
     * Toggle background animations on/off
     * @param enabled Whether animations should be enabled
     */
    public setAnimationsEnabled(enabled: boolean): void {
        this.animationsEnabled = enabled;
    }
    
    /**
     * Check if background animations are enabled
     */
    public areAnimationsEnabled(): boolean {
        return this.animationsEnabled;
    }
    
    /**
     * Update the world based on camera position
     */    public update(): void {
        // Skip update if animations are disabled
        if (!this.animationsEnabled) return;
        
        const cameraPos = this.camera.getPosition();
        
        // Update each layer
        this.parallaxLayers.forEach(layer => {
            // Remove objects that are too far from camera
            layer.objects = layer.objects.filter(obj => {
                const dx = obj.x - cameraPos.x;
                const dy = obj.y - cameraPos.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                return distance <= this.cullingRadius;
            });
            
            // Generate new objects if needed
            this.generateObjectsForLayer(layer, cameraPos);
        });
    }
    
    private generateObjectsForLayer(layer: ParallaxLayer, cameraPos: { x: number; y: number }): void {
        // Calculate area to check for new objects
        const checkRadius = this.generationRadius * 0.8;
        const checkArea = Math.PI * checkRadius * checkRadius;
        const targetObjectCount = Math.floor(this.objectDensity * checkArea / 1000000);
        
        // Count objects within check radius
        let objectsInRange = 0;
        layer.objects.forEach(obj => {
            const dx = obj.x - cameraPos.x;
            const dy = obj.y - cameraPos.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            if (distance <= checkRadius) {
                objectsInRange++;
            }
        });
        
        // Generate new objects if needed
        const objectsToGenerate = Math.max(0, targetObjectCount - objectsInRange);
        
        for (let i = 0; i < objectsToGenerate; i++) {
            // Generate at the edge of generation radius
            const angle = Math.random() * Math.PI * 2;
            const distance = this.generationRadius * 0.8 + Math.random() * this.generationRadius * 0.2;
            const x = cameraPos.x + Math.cos(angle) * distance;
            const y = cameraPos.y + Math.sin(angle) * distance;
            
            // Add object to layer
            layer.objects.push(this.createRandomObject(x, y, layer.depth));
        }
    }
      /**
     * Render the world with parallax effect
     */
    public render(ctx: CanvasRenderingContext2D): void {
        const cameraPos = this.camera.getPosition();
        const viewportSize = this.getViewportSize();
        
        // Draw ocean background - use the viewport size instead of fixed coordinates
        ctx.fillStyle = Color.OCEAN;
        ctx.fillRect(
            cameraPos.x - viewportSize.width, 
            cameraPos.y - viewportSize.height, 
            viewportSize.width * 2, 
            viewportSize.height * 2
        );
        
        // Render parallax layers from back to front
        this.parallaxLayers
            .sort((a, b) => a.depth - b.depth)
            .forEach(layer => {
                // Calculate parallax offset
                const offsetX = -cameraPos.x * (1 - layer.speed);
                const offsetY = -cameraPos.y * (1 - layer.speed);
                
                // Render objects in this layer
                layer.objects.forEach(obj => {
                    obj.render(ctx, offsetX, offsetY);
                });
            });
    }
    
    /**
     * Get the size of the viewport in world coordinates
     */
    private getViewportSize(): { width: number; height: number } {
        const zoom = this.camera.getZoom();
        return {
            width: this.canvas.getWidth() / zoom,
            height: this.canvas.getHeight() / zoom
        };
    }
}
