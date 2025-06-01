import * as Matter from 'matter-js';

export class Physics {
    private engine: Matter.Engine;
    private world: Matter.World;
    
    constructor() {
        this.engine = Matter.Engine.create();
        this.world = this.engine.world;
        
        // Configure world for top-down game
        this.world.gravity.y = 0; // No gravity in top-down view
    }
    
    public getEngine(): Matter.Engine {
        return this.engine;
    }
    
    public getWorld(): Matter.World {
        return this.world;
    }
    
    public update(delta: number): void {
        Matter.Engine.update(this.engine, delta);
    }
    
    public addBody(body: Matter.Body): void {
        Matter.Composite.add(this.world, body);
    }
    
    public removeBody(body: Matter.Body): void {
        Matter.Composite.remove(this.world, body);
    }
}
