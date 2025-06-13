// This file contains a custom collision handler for the pirate game
// to ensure reliable detection of player-ship collisions

import * as Matter from 'matter-js';
import { BaseGameObject } from '../objects/objects';

export class CollisionHelper {
    /**
     * Checks for collision between player and ships using Matter.js
     * This should be called after physics updates but before rendering
     * Returns true if Matter.js detected a collision, false otherwise
     */
    public static enforceCollision(
        playerBody: Matter.Body, 
        shipBody: Matter.Body, 
        engine: Matter.Engine
    ): boolean {
        // Skip if either body doesn't exist
        if (!playerBody || !shipBody) {
            return false;
        }

        // Use Matter.js built-in collision detection
        const colliding = Matter.Query.collides(playerBody, [shipBody]);
        if (colliding.length > 0) {
            // Physics engine detected collision
            if (BaseGameObject.isDebugMode()) {
                console.log(`Matter.js detected collision between ${playerBody.label} and ${shipBody.label}`);
            }
            return true;
        }
        
        return false;
    }

    /**
     * Creates a consistent separation force between bodies that are colliding
     * This enhances the built-in collision response from Matter.js
     */
    public static applySeparationForce(
        playerBody: Matter.Body,
        shipBody: Matter.Body,
        depth: number
    ): void {
        // Calculate vector from ship to player
        const dx = playerBody.position.x - shipBody.position.x;
        const dy = playerBody.position.y - shipBody.position.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // Skip if bodies are too far apart or too close (avoid division by zero)
        if (distance < 0.1) return;
        
        // Create normalized direction vector
        const nx = dx / distance;
        const ny = dy / distance;
        
        // Calculate relative velocity
        const relVelX = playerBody.velocity.x - shipBody.velocity.x;
        const relVelY = playerBody.velocity.y - shipBody.velocity.y;
        
        // Project relative velocity onto collision normal
        const relVelAlongNormal = (relVelX * nx) + (relVelY * ny);
        
        // Only enhance separation if objects are moving toward each other
        if (relVelAlongNormal < 0) {
            // Apply a stronger response for high-speed collisions
            const impactFactor = Math.min(2.0, 1.0 + Math.abs(relVelAlongNormal) * 0.2);
            
            // Calculate separation force based on overlap depth and ship mass
            // Use a non-linear scale for more responsive collision at shallow depths
            const forceMagnitude = Math.min(0.10, Math.pow(depth * 0.2, 1.5)) * shipBody.mass * impactFactor;
            
            // Apply a stronger force to the player (lighter object)
            Matter.Body.applyForce(playerBody, playerBody.position, {
                x: nx * forceMagnitude * 2.5, // Reduced force for larger ship
                y: ny * forceMagnitude * 2.5
            });
            
            // Apply a weaker opposite force to the ship (heavier object)
            Matter.Body.applyForce(shipBody, shipBody.position, {
                x: -nx * forceMagnitude * 0.4, // Reduced further for greater ship mass feeling
                y: -ny * forceMagnitude * 0.4
            });
            
            // Apply an immediate velocity change to prevent sticking
            if (depth > 0.5) {
                const playerEscapeVel = 0.8 * depth; // Slightly reduced escape velocity
                Matter.Body.setVelocity(playerBody, {
                    x: playerBody.velocity.x + (nx * playerEscapeVel),
                    y: playerBody.velocity.y + (ny * playerEscapeVel)
                });
                
                // Apply a subtle angular velocity for more natural response
                const currentAngVel = playerBody.angularVelocity || 0;
                const angularImpulse = (nx * relVelY - ny * relVelX) * 0.012;
                Matter.Body.setAngularVelocity(playerBody, currentAngVel + angularImpulse);
            }
        } else {
            // Objects are already separating, apply minimal stabilizing force
            const stabilizingForce = Math.min(0.03, depth * 0.10) * shipBody.mass;
            
            Matter.Body.applyForce(playerBody, playerBody.position, {
                x: nx * stabilizingForce * 1.6,
                y: ny * stabilizingForce * 1.6
            });
        }
    }
}
