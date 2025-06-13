import * as Matter from 'matter-js';
import { EffectManager } from '../objects/effects/effectManager';
import { SoundManager } from './soundManager';
import { Camera } from './camera';

export declare class Physics {
    constructor();
    getEngine(): Matter.Engine;
    getWorld(): Matter.World;
    setEffectManager(effectManager: EffectManager): void;
    setSoundManager(soundManager: SoundManager): void;
    getWorldBounds(): Matter.Bounds;
    setWorldBounds(bounds: Matter.Bounds): void;
    update(deltaTime: number): void;
    renderAllBodies(ctx: CanvasRenderingContext2D, camera: Camera): void;
    renderDebugOverlay(ctx: CanvasRenderingContext2D): void;
    getCollisionPointsCount(): number;
    hasRecentCollision(label1: string, label2: string): boolean;
    getLastCollisionData(label1: string, label2: string): {
        depth: number,
        point: Matter.Vector,
        normal: Matter.Vector,
        time: number
    } | null;
    handlePlayerBrigantineCollision(playerBody: Matter.Body, brigantineBody: Matter.Body, pair: Matter.Pair): void;
    checkCollisionFiltering(bodyA: Matter.Body, bodyB: Matter.Body): boolean;
    manualCollisionCheck(): void;
    addBody(body: Matter.Body): void;
    removeBody(body: Matter.Body): void;
}
