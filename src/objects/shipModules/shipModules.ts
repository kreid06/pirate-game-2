import { Ships } from '../ships/ships';
import { Color } from '../../utils/color';

export interface ShipModule {
    update(delta: number): void;
    render(ctx: CanvasRenderingContext2D): void;
    attachToShip(ship: Ships): void;
    renderDebug?(ctx: CanvasRenderingContext2D): void; // Add debug rendering
}

export abstract class BaseShipModule implements ShipModule {
    protected ship: Ships | null;
    protected offsetX: number;
    protected offsetY: number;
    
    constructor(offsetX: number, offsetY: number) {
        this.ship = null;
        this.offsetX = offsetX;
        this.offsetY = offsetY;
    }
    
    public attachToShip(ship: Ships): void {
        this.ship = ship;
    }
    
    public update(delta: number): void {
        // Base update logic
    }
    
    public abstract render(ctx: CanvasRenderingContext2D): void;
    
    /**
     * Render debug visualization for the ship module
     */
    public renderDebug(ctx: CanvasRenderingContext2D): void {
        const pos = this.getWorldPosition();
        
        // Draw module connection point
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, 5, 0, Math.PI * 2);
        ctx.fillStyle = Color.DEBUG_CONTACT;
        ctx.fill();
        
        // Draw connection line to ship
        if (this.ship) {
            const shipPos = this.ship.getPosition();
            ctx.beginPath();
            ctx.moveTo(shipPos.x, shipPos.y);
            ctx.lineTo(pos.x, pos.y);
            ctx.strokeStyle = 'rgba(255, 255, 0, 0.4)'; // Yellow for connection lines
            ctx.setLineDash([3, 3]);
            ctx.lineWidth = 1;
            ctx.stroke();
            ctx.setLineDash([]);
        }
    }
    
    protected getWorldPosition(): { x: number, y: number } {
        if (!this.ship) {
            return { x: 0, y: 0 };
        }
        
        const shipPos = this.ship.getPosition();
        const shipRotation = this.ship.getRotation();
        
        // Calculate position relative to ship based on rotation
        const cos = Math.cos(shipRotation);
        const sin = Math.sin(shipRotation);
        
        return {
            x: shipPos.x + (this.offsetX * cos - this.offsetY * sin),
            y: shipPos.y + (this.offsetX * sin + this.offsetY * cos)
        };
    }
}
