import { Ship } from '../ships/ships';

export interface ShipModule {
    update(delta: number): void;
    render(ctx: CanvasRenderingContext2D): void;
    attachToShip(ship: Ship): void;
}

export abstract class BaseShipModule implements ShipModule {
    protected ship: Ship | null;
    protected offsetX: number;
    protected offsetY: number;
    
    constructor(offsetX: number, offsetY: number) {
        this.ship = null;
        this.offsetX = offsetX;
        this.offsetY = offsetY;
    }
    
    public attachToShip(ship: Ship): void {
        this.ship = ship;
    }
    
    public update(delta: number): void {
        // Base update logic
    }
    
    public abstract render(ctx: CanvasRenderingContext2D): void;
    
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
