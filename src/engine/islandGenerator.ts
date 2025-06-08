import { Camera } from './camera';
import { Canvas } from '../utils/canvas';
import { Color } from '../utils/color';
import * as Matter from 'matter-js';
import { Physics } from './physics';
import { Treasure, TreasureType } from '../objects/treasure/treasure';
import { PowerUp, PowerUpType } from '../objects/powerup/powerup';

/**
 * Represents an island in the game world
 */
export interface Island {
    x: number;
    y: number;
    radius: number;
    body: Matter.Body;
    treasures: Treasure[];
    powerUps: PowerUp[];
    render: (ctx: CanvasRenderingContext2D) => void;
}

/**
 * Generates and manages islands in the game world
 */
export class IslandGenerator {
    private camera: Camera;
    private canvas: Canvas;
    private physics: Physics;
    private islands: Island[];
    private islandDensity: number;      // Islands per 10000x10000 area
    private generationRadius: number;   // How far from camera to generate islands
    private cullingRadius: number;      // How far from camera to remove islands
    
    constructor(camera: Camera, canvas: Canvas, physics: Physics) {
        this.camera = camera;
        this.canvas = canvas;
        this.physics = physics;
        this.islands = [];
        this.islandDensity = 5;        // Relatively sparse islands
        this.generationRadius = 5000;  // Generate islands quite far out
        this.cullingRadius = 7000;     // Remove islands when very far from player
        
        // Generate initial islands
        this.generateInitialIslands();
    }
    
    private generateInitialIslands(): void {
        const cameraPos = this.camera.getPosition();
        
        // Calculate how many islands to generate in the initial area
        const area = Math.PI * this.generationRadius * this.generationRadius;
        const islandCount = Math.floor(this.islandDensity * area / 100000000);
        
        console.log(`Generating ${islandCount} initial islands`);
        
        for (let i = 0; i < islandCount; i++) {
            // Generate random position within generation radius
            const angle = Math.random() * Math.PI * 2;
            const distance = Math.random() * this.generationRadius;
            const x = cameraPos.x + Math.cos(angle) * distance;
            const y = cameraPos.y + Math.sin(angle) * distance;
            
            // Generate island radius (vary the size)
            const radius = 100 + Math.random() * 200;
            
            // Create and add the island
            const island = this.createIsland(x, y, radius);
            this.islands.push(island);
            
            // Add island to physics world
            this.physics.addBody(island.body);
        }
    }
    
    private createIsland(x: number, y: number, radius: number): Island {
        // Create physics body for island (static circular body)
        const body = Matter.Bodies.circle(x, y, radius, {
            isStatic: true,
            friction: 0.5,
            restitution: 0.2,
            label: 'island'
        });
        
        // Generate random features for the island
        const treeDensity = Math.random() * 0.8 + 0.2;    // 0.2 to 1.0
        const beachWidth = radius * 0.2;                  // Beach is 20% of radius
        const hasVillage = Math.random() > 0.7;           // 30% chance of village
        const hasTreasure = Math.random() > 0.5;          // 50% chance of treasure
        const hasPowerUp = Math.random() > 0.8;           // 20% chance of power-up
        
        // Generate treasures if the island has them
        const treasures: Treasure[] = [];
        
        if (hasTreasure) {
            // Determine number of treasure items
            const treasureCount = 1 + Math.floor(Math.random() * 3); // 1-3 treasures
            
            for (let i = 0; i < treasureCount; i++) {
                // Random position within island radius (biased towards center)
                const treasureRadius = radius * (0.3 + Math.random() * 0.4); // 30-70% of island radius
                const angle = Math.random() * Math.PI * 2;
                const treasureX = x + Math.cos(angle) * treasureRadius;
                const treasureY = y + Math.sin(angle) * treasureRadius;
                
                // Random treasure type with weighted probabilities
                const typeRoll = Math.random();
                let treasureType = TreasureType.COIN; // Default
                
                if (typeRoll > 0.9) {
                    treasureType = TreasureType.CHEST; // 10% chance for chest
                } else if (typeRoll > 0.6) {
                    treasureType = TreasureType.GEMS; // 30% chance for gems
                }
                
                // Create treasure
                const treasure = new Treasure(treasureX, treasureY, treasureType);
                treasures.push(treasure);
                
                // Add treasure to physics engine
                this.physics.addBody(treasure.getBody()!);
            }
        }
        
        // Generate power-up if the island has one
        const powerUps: PowerUp[] = [];
        
        if (hasPowerUp) {
            // Random position within island radius (biased towards center)
            const powerUpRadius = radius * (0.3 + Math.random() * 0.4); // 30-70% of island radius
            const angle = Math.random() * Math.PI * 2;
            const powerUpX = x + Math.cos(angle) * powerUpRadius;
            const powerUpY = y + Math.sin(angle) * powerUpRadius;
            
            // Random power-up type
            const typeRoll = Math.random();
            let powerUpType = PowerUpType.REPAIR; // Default
            
            if (typeRoll > 0.7) {
                powerUpType = PowerUpType.CANNON_UPGRADE;
            } else if (typeRoll > 0.4) {
                powerUpType = PowerUpType.SPEED_BOOST;
            }
            
            // Create power-up
            const powerUp = new PowerUp(powerUpX, powerUpY, powerUpType);
            powerUps.push(powerUp);
            
            // Add power-up to physics engine
            this.physics.addBody(powerUp.getBody()!);
        }
        
        // Create the island object
        return {
            x,
            y,
            radius,
            body,
            treasures,
            powerUps,
            render: (ctx: CanvasRenderingContext2D) => {
                // Draw beach (outer ring)
                ctx.beginPath();
                ctx.arc(x, y, radius, 0, Math.PI * 2);
                ctx.fillStyle = Color.SAND;
                ctx.fill();
                
                // Draw island interior (grass)
                ctx.beginPath();
                ctx.arc(x, y, radius - beachWidth, 0, Math.PI * 2);
                ctx.fillStyle = Color.ISLAND_GRASS;
                ctx.fill();
                
                // Draw trees (if any)
                if (treeDensity > 0) {
                    this.renderTrees(ctx, x, y, radius - beachWidth, treeDensity);
                }
                
                // Draw village (if any)
                if (hasVillage) {
                    this.renderVillage(ctx, x, y, radius - beachWidth);
                }
            }
        };
    }
    
    private renderTrees(ctx: CanvasRenderingContext2D, x: number, y: number, radius: number, density: number): void {
        const treeCount = Math.floor(radius * density * 0.2);
        const forestRadius = radius * 0.8; // Trees don't go all the way to the edge
        
        for (let i = 0; i < treeCount; i++) {
            // Random position within forest radius
            const angle = Math.random() * Math.PI * 2;
            const distance = Math.random() * forestRadius;
            const treeX = x + Math.cos(angle) * distance;
            const treeY = y + Math.sin(angle) * distance;
            
            // Random tree size
            const treeSize = 5 + Math.random() * 10;
            
            // Draw tree trunk (brown)
            ctx.fillStyle = Color.BROWN;
            ctx.fillRect(treeX - treeSize/4, treeY - treeSize/2, treeSize/2, treeSize);
            
            // Draw tree foliage (green circle)
            ctx.beginPath();
            ctx.arc(treeX, treeY - treeSize/2 - treeSize, treeSize, 0, Math.PI * 2);
            ctx.fillStyle = Color.ISLAND_TREE;
            ctx.fill();
        }
    }
    
    private renderVillage(ctx: CanvasRenderingContext2D, x: number, y: number, radius: number): void {
        const houseCount = 3 + Math.floor(Math.random() * 5); // 3-7 houses
        const villageRadius = radius * 0.6; // Village is centered on the island
        
        for (let i = 0; i < houseCount; i++) {
            // Random position within village radius
            const angle = Math.random() * Math.PI * 2;
            const distance = Math.random() * villageRadius;
            const houseX = x + Math.cos(angle) * distance;
            const houseY = y + Math.sin(angle) * distance;
            
            // Random house size
            const houseWidth = 15 + Math.random() * 10;
            const houseHeight = 10 + Math.random() * 5;
            
            // Draw house
            ctx.fillStyle = Color.HOUSE_WALL;
            ctx.fillRect(houseX - houseWidth/2, houseY - houseHeight/2, houseWidth, houseHeight);
            
            // Draw roof
            ctx.beginPath();
            ctx.moveTo(houseX - houseWidth/2 - 2, houseY - houseHeight/2);
            ctx.lineTo(houseX + houseWidth/2 + 2, houseY - houseHeight/2);
            ctx.lineTo(houseX, houseY - houseHeight/2 - 8);
            ctx.closePath();
            ctx.fillStyle = Color.HOUSE_ROOF;
            ctx.fill();
            
            // Draw door
            ctx.fillStyle = Color.HOUSE_DOOR;
            ctx.fillRect(houseX - 2, houseY + houseHeight/2 - 6, 4, 6);
        }
    }
    
    /**
     * Update islands based on camera position
     */
    public update(): void {
        const cameraPos = this.camera.getPosition();
        
        // Remove islands that are too far from camera
        for (let i = this.islands.length - 1; i >= 0; i--) {
            const island = this.islands[i];
            const dx = island.x - cameraPos.x;
            const dy = island.y - cameraPos.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance > this.cullingRadius) {
                // Remove treasures from physics world
                for (const treasure of island.treasures) {
                    this.physics.removeBody(treasure.getBody()!);
                }
                
                // Remove power-ups from physics world
                for (const powerUp of island.powerUps) {
                    this.physics.removeBody(powerUp.getBody()!);
                }
                
                // Remove island from physics world
                this.physics.removeBody(island.body);
                
                // Remove island from array
                this.islands.splice(i, 1);
            } else {
                // Update treasures and power-ups
                for (const treasure of island.treasures) {
                    treasure.update(1/60); // Use a fixed delta time for simplicity
                }
                
                for (const powerUp of island.powerUps) {
                    powerUp.update(1/60); // Use a fixed delta time for simplicity
                }
            }
        }
        
        // Generate new islands if needed
        this.generateIslandsAroundCamera(cameraPos);
    }
    
    private generateIslandsAroundCamera(cameraPos: { x: number; y: number }): void {
        // Calculate area to check for new islands
        const checkRadius = this.generationRadius * 0.8;
        const checkArea = Math.PI * checkRadius * checkRadius;
        const targetIslandCount = Math.floor(this.islandDensity * checkArea / 100000000);
        
        // Count islands within check radius
        let islandsInRange = 0;
        this.islands.forEach(island => {
            const dx = island.x - cameraPos.x;
            const dy = island.y - cameraPos.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance <= checkRadius) {
                islandsInRange++;
            }
        });
        
        // Generate new islands if needed
        const islandsToGenerate = Math.max(0, targetIslandCount - islandsInRange);
        
        for (let i = 0; i < islandsToGenerate; i++) {
            // Generate at the edge of generation radius
            const angle = Math.random() * Math.PI * 2;
            const distance = this.generationRadius * 0.8 + Math.random() * this.generationRadius * 0.2;
            const x = cameraPos.x + Math.cos(angle) * distance;
            const y = cameraPos.y + Math.sin(angle) * distance;
            
            // Generate island radius (vary the size)
            const radius = 100 + Math.random() * 200;
            
            // Check for collision with existing islands
            if (!this.isColliding(x, y, radius)) {
                // Create and add the island
                const island = this.createIsland(x, y, radius);
                this.islands.push(island);
                
                // Add island to physics world
                this.physics.addBody(island.body);
                
                console.log(`Generated new island at (${Math.round(x)}, ${Math.round(y)})`);
            }
        }
    }
    
    private isColliding(x: number, y: number, radius: number): boolean {
        // Check if a new island would collide with existing islands
        // Add some buffer space between islands
        const buffer = 100;
        
        for (const island of this.islands) {
            const dx = island.x - x;
            const dy = island.y - y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < island.radius + radius + buffer) {
                return true; // Collision detected
            }
        }
        
        return false; // No collision
    }
    
    /**
     * Render all islands
     */
    public render(ctx: CanvasRenderingContext2D): void {
        // Render all islands
        for (const island of this.islands) {
            island.render(ctx);
            
            // Render treasures
            for (const treasure of island.treasures) {
                treasure.render(ctx);
            }
            
            // Render power-ups
            for (const powerUp of island.powerUps) {
                powerUp.render(ctx);
            }
        }
    }
    
    /**
     * Get all islands for collision detection or other purposes
     */
    public getIslands(): Island[] {
        return this.islands;
    }
}
