import Matter from 'matter-js';
import { Ships } from '../ships/ships';
import { CollisionCategories } from '../../utils/color';

export class BaseModule {
    type: string;
    position: { x: number; y: number };
    rotation: number;
    body: Matter.Body | null = null;
    parentShipBody: Matter.Body | null = null;
    world: Matter.World | null = null;
    parentShip: Ships | null = null;
    
    // New properties for module information
    protected name: string = "Module";
    protected description: string = "A ship module";
    protected health: number = 100;
    protected maxHealth: number = 100;
    protected quality: string = "Standard";
    protected effectiveness: number = 1.0;
    protected useInstruction: string = "Press E to use";
    
    // Hover state tracking
    protected isHovered: boolean = false;
    
    constructor(type: string, position: { x: number; y: number }, rotation: number = 0) {
        this.type = type;
        this.position = position;
        this.rotation = rotation;
    }
    
    attachToShip(ship: Ships): void {
        this.parentShip = ship;
        if (ship.getBody()) {
            this.parentShipBody = ship.getBody()!;
        }
    }
    
    update(): void {
        // Base update logic that all modules should inherit
        // Update the position and rotation of the module based on ship movement
        if (this.body && this.parentShipBody) {
            this.updatePositionFromShip();
        }
    }
    
    use(): void {
        // Base use functionality, to be overridden by specific modules
        console.log(`Using ${this.type} module`);
    }
    
    /**
     * Creates a physics body for this module
     */
    createPhysicsBody(shipBody: Matter.Body, world: Matter.World): void {
        this.parentShipBody = shipBody;
        this.world = world;
        
        // Note: Actual physics body creation is handled by subclasses
    }
    
    /**
     * Removes the physics body for this module from the world
     */
    removePhysicsBody(): void {
        if (this.body && this.world) {
            Matter.Composite.remove(this.world, this.body);
            this.body = null;
        }
    }
    
    /**
     * Updates the module's position based on the parent ship's position and rotation
     */
    protected updatePositionFromShip(): void {
        if (!this.parentShipBody) return;
        
        // Get the ship's position and angle
        const shipPos = this.parentShipBody.position;
        const shipAngle = this.parentShipBody.angle;
        
        // Calculate the module's world position based on its offset from the ship's center
        // and the ship's rotation
        const offsetX = this.position.x * Math.cos(shipAngle) - this.position.y * Math.sin(shipAngle);
        const offsetY = this.position.x * Math.sin(shipAngle) + this.position.y * Math.cos(shipAngle);
        
        // Update the module's body position
        if (this.body) {
            Matter.Body.setPosition(this.body, {
                x: shipPos.x + offsetX,
                y: shipPos.y + offsetY
            });
            
            // Update the module's body angle
            Matter.Body.setAngle(this.body, shipAngle + this.rotation);
        }
    }
      /**
     * Check if a point is hovering over this module
     */
    isPointHovering(x: number, y: number): boolean {
        if (!this.body) return false;
        
        // For circular bodies (like mast or wheel)
        if (this.body.label.includes('mast') || this.body.label.includes('wheel')) {
            const dx = this.body.position.x - x;
            const dy = this.body.position.y - y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            // Get the radius of the body
            let radius = 15; // Default radius
            if (this.body.circleRadius) {
                radius = this.body.circleRadius;
            }
            
            const isHovering = distance <= radius;
            if (isHovering) {
                // Debug hover detection
                console.log(`Hovering over ${this.type} module at (${this.position.x}, ${this.position.y})`);
            }
            return isHovering;
        }
        
        // For rectangular bodies (like planks or sail fiber)
        const isHovering = Matter.Bounds.contains(this.body.bounds, { x, y });
        if (isHovering) {
            // Debug hover detection
            console.log(`Hovering over ${this.type} module at (${this.position.x}, ${this.position.y})`);
        }
        return isHovering;
    }
    
    /**
     * Set the hover state of this module
     */
    setHovered(hovered: boolean): void {
        this.isHovered = hovered;
    }
    
    /**
     * Get if this module is currently being hovered over
     */
    getIsHovered(): boolean {
        return this.isHovered;
    }
    
    /**
     * Get the world position of this module for tooltip placement
     */
    getWorldPosition(): { x: number, y: number } {
        if (this.body) {
            return { x: this.body.position.x, y: this.body.position.y };
        }
        
        // If no body, calculate position based on ship position and module offset
        if (this.parentShipBody) {
            const shipPos = this.parentShipBody.position;
            const shipAngle = this.parentShipBody.angle;
            
            const offsetX = this.position.x * Math.cos(shipAngle) - this.position.y * Math.sin(shipAngle);
            const offsetY = this.position.x * Math.sin(shipAngle) + this.position.y * Math.cos(shipAngle);
            
            return { x: shipPos.x + offsetX, y: shipPos.y + offsetY };
        }
        
        return { x: 0, y: 0 };
    }
    
    /**
     * Get tooltip information for this module
     */
    getTooltipInfo(): ModuleTooltipInfo {
        return {
            name: this.name,
            description: this.description,
            health: this.health,
            maxHealth: this.maxHealth,
            quality: this.quality,
            effectiveness: this.effectiveness,
            useInstruction: this.useInstruction
        };
    }
      /**
     * Render the tooltip for this module
     */
    renderTooltip(ctx: CanvasRenderingContext2D): void {
        if (!this.isHovered) return;
        
        const tooltipInfo = this.getTooltipInfo();
        const pos = this.getWorldPosition();
        
        // Tooltip box dimensions
        const padding = 10;
        const lineHeight = 20;
        const tooltipWidth = 200;
        const tooltipHeight = 8 * lineHeight + padding * 2;
        
        // Draw tooltip background
        ctx.save();
        ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.lineWidth = 2;
        
        // Position tooltip near the module/mouse position
        // For planks (which use mouse position), offset a bit to not cover the cursor
        const isPlank = this.type === 'plank';
        const tooltipX = pos.x - tooltipWidth / 2 + (isPlank ? 20 : 0);
        const tooltipY = pos.y - tooltipHeight - (isPlank ? 10 : 30); // Less offset for planks
        
        // Draw the tooltip pointer if it's a plank
        if (isPlank) {
            // Draw a pointer triangle from tooltip to mouse
            ctx.beginPath();
            ctx.moveTo(pos.x, pos.y);
            ctx.lineTo(tooltipX + 10, tooltipY + tooltipHeight);
            ctx.lineTo(tooltipX + 30, tooltipY + tooltipHeight);
            ctx.closePath();
            ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
            ctx.fill();
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
            ctx.stroke();
        }
        
        // Draw rounded rectangle
        ctx.beginPath();
        ctx.roundRect(tooltipX, tooltipY, tooltipWidth, tooltipHeight, 5);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
        ctx.fill();
        ctx.stroke();
        
        // Draw tooltip content
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.font = 'bold 14px Arial';
        ctx.textAlign = 'left';
        
        // Draw module name
        ctx.fillText(tooltipInfo.name, tooltipX + padding, tooltipY + padding + lineHeight);
        
        // Draw dividing line
        ctx.beginPath();
        ctx.moveTo(tooltipX + padding, tooltipY + padding + lineHeight + 5);
        ctx.lineTo(tooltipX + tooltipWidth - padding, tooltipY + padding + lineHeight + 5);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.stroke();
        
        // Draw details with smaller font
        ctx.font = '12px Arial';
        
        // Draw description
        ctx.fillText(tooltipInfo.description, tooltipX + padding, tooltipY + padding + lineHeight * 2 + 5);
        
        // Draw health
        const healthPercent = (tooltipInfo.health / tooltipInfo.maxHealth) * 100;
        ctx.fillText(`Health: ${Math.round(healthPercent)}%`, tooltipX + padding, tooltipY + padding + lineHeight * 3 + 5);
        
        // Draw quality
        ctx.fillText(`Quality: ${tooltipInfo.quality}`, tooltipX + padding, tooltipY + padding + lineHeight * 4 + 5);
        
        // Draw effectiveness
        ctx.fillText(`Effectiveness: ${Math.round(tooltipInfo.effectiveness * 100)}%`, tooltipX + padding, tooltipY + padding + lineHeight * 5 + 5);
        
        // Draw use instruction
        ctx.fillStyle = 'rgba(255, 255, 0, 0.9)';
        ctx.fillText(tooltipInfo.useInstruction, tooltipX + padding, tooltipY + padding + lineHeight * 6 + 5);
        
        ctx.restore();
    }
}

/**
 * Interface for module tooltip information
 */
export interface ModuleTooltipInfo {
    name: string;
    description: string;
    health: number;
    maxHealth: number;
    quality: string;
    effectiveness: number;
    useInstruction: string;
}
