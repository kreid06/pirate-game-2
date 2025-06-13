// This file contains a custom collision handler for the pirate game
// to ensure reliable detection of player-ship collisions

import * as Matter from 'matter-js';
import { BaseGameObject } from '../objects/objects';

export class CollisionHelper {    /**
     * Applies special collision detection for player and ships
     * This should be called after physics updates but before rendering
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

        // First check: Use Matter.js built-in collision detection
        const colliding = Matter.Query.collides(playerBody, [shipBody]);
        if (colliding.length > 0) {
            // Physics engine detected collision, no need for manual intervention
            if (BaseGameObject.isDebugMode()) {
                console.log(`Matter.js detected collision between ${playerBody.label} and ${shipBody.label}`);
            }
            return true;
        }

        // Second check: Perform SAT-based collision detection using ray casting
        // This is a more reliable method than simple bounds checks
        const result = this.performSATCollisionCheck(playerBody, shipBody);
        if (result.colliding) {
            if (BaseGameObject.isDebugMode()) {
                console.log(`SAT detected collision between ${playerBody.label} and ${shipBody.label}`);
                console.log(`  Overlap depth: ${result.depth.toFixed(4)}`);
            }
            
            // Create synthetic collision with the detected information
            this.createSyntheticCollision(playerBody, shipBody, engine, result);
            return true;
        }

        // Third check: Perform bounds overlap test with a buffer
        const bounds = {
            player: playerBody.bounds,
            ship: shipBody.bounds
        };

        // Add a buffer to the bounds for more reliable detection
        const buffer = 8; // Increased buffer size
        const playerBoundsExpanded = {
            min: { x: bounds.player.min.x - buffer, y: bounds.player.min.y - buffer },
            max: { x: bounds.player.max.x + buffer, y: bounds.player.max.y + buffer }
        };

        // Check if bounds are overlapping with buffer
        const boundsOverlap = 
            playerBoundsExpanded.min.x <= bounds.ship.max.x &&
            playerBoundsExpanded.max.x >= bounds.ship.min.x &&
            playerBoundsExpanded.min.y <= bounds.ship.max.y &&
            playerBoundsExpanded.max.y >= bounds.ship.min.y;

        if (!boundsOverlap) {
            // No overlap in bounds, no collision possible
            return false;
        }

        // Fourth check: Distance-based collision detection with directional scaling
        const dx = playerBody.position.x - shipBody.position.x;
        const dy = playerBody.position.y - shipBody.position.y;
        const distanceSquared = dx * dx + dy * dy;
        const distance = Math.sqrt(distanceSquared);

        // Calculate an appropriate collision threshold based on the bodies' sizes
        // Get the actual size of the player body from its vertices
        const playerRadius = (playerBody.bounds.max.x - playerBody.bounds.min.x + 
                           playerBody.bounds.max.y - playerBody.bounds.min.y) / 4;
        
        // For the ship, we need to account for its potentially rectangular shape
        const shipWidth = (shipBody.bounds.max.x - shipBody.bounds.min.x) / 2;
        const shipHeight = (shipBody.bounds.max.y - shipBody.bounds.min.y) / 2;
        
        // Use the direction-specific ship dimension based on approach angle
        const absNormalX = Math.abs(dx / (distance || 1));
        const absNormalY = Math.abs(dy / (distance || 1));
        
        // Calculate ship size based on approach angle (directional weighting)
        const shipSize = (shipWidth * absNormalX) + (shipHeight * absNormalY);
        
        // Add a small buffer to improve collision detection reliability
        const collisionThreshold = (playerRadius + shipSize) * 1.1; // 10% buffer
        
        // Check if they should be colliding based on distance
        if (distance < collisionThreshold) {
            // Bodies should be colliding, but physics engine didn't detect it
            // Create a synthetic collision
            
            // Create a collision normal pointing from ship to player
            const normal = {
                x: dx / (distance || 1),
                y: dy / (distance || 1)
            };

            // Estimate collision depth - use a proportional value for smoother collision response
            const depth = Math.min(collisionThreshold - distance, collisionThreshold * 0.3);
            
            // Find the best collision point - try multiple approaches
            const collisionPoint = this.findBestCollisionPoint(playerBody, shipBody, normal);

            // Create synthetic collision
            const collisionData = {
                normal: normal,
                depth: depth,
                point: collisionPoint
            };
            
            this.createSyntheticCollision(playerBody, shipBody, engine, collisionData);
            
            if (BaseGameObject.isDebugMode()) {
                console.log(`Distance-based collision detected between ${playerBody.label} and ${shipBody.label}`);
                console.log(`  Distance: ${distance.toFixed(2)}, Threshold: ${collisionThreshold.toFixed(2)}`);
                console.log(`  Collision depth: ${depth.toFixed(4)}`);
            }

            return true;
        }
        
        return false;
    }
    
    /**
     * Performs Separating Axis Theorem (SAT) based collision detection
     * This is more accurate than bounding box checks for complex shapes
     */
    private static performSATCollisionCheck(bodyA: Matter.Body, bodyB: Matter.Body): {
        colliding: boolean,
        depth: number,
        normal: Matter.Vector,
        point: Matter.Vector
    } {
        // Default result with no collision
        const result = {
            colliding: false,
            depth: 0,
            normal: { x: 0, y: 0 },
            point: { x: 0, y: 0 }
        };
        
        // Get vertices
        const verticesA = bodyA.vertices;
        const verticesB = bodyB.vertices;
        
        // Early exit if either body has no vertices
        if (!verticesA || !verticesB || verticesA.length < 3 || verticesB.length < 3) {
            return result;
        }
        
        // Calculate center-to-center vector
        const dx = bodyB.position.x - bodyA.position.x;
        const dy = bodyB.position.y - bodyA.position.y;
        
        // Use SAT algorithm
        let minOverlap = Infinity;
        
        // Test all edges of both bodies as potential separating axes
        for (let i = 0; i < verticesA.length; i++) {
            const j = (i + 1) % verticesA.length;
            const edge = {
                x: verticesA[j].x - verticesA[i].x,
                y: verticesA[j].y - verticesA[i].y
            };
            
            // Calculate perpendicular axis
            const axis = { x: -edge.y, y: edge.x };
            const axisLength = Math.sqrt(axis.x * axis.x + axis.y * axis.y);
            
            // Normalize the axis
            if (axisLength > 0) {
                axis.x /= axisLength;
                axis.y /= axisLength;
                
                // Project vertices onto the axis
                const { overlap, valid } = this.checkAxisSeparation(axis, verticesA, verticesB);
                
                // If there's no overlap, the bodies are not colliding
                if (!valid) return result;
                
                // Track the minimum overlap (for collision depth)
                if (overlap < minOverlap) {
                    minOverlap = overlap;
                    // Store collision normal (opposite to minimizing axis)
                    result.normal.x = -axis.x;
                    result.normal.y = -axis.y;
                }
            }
        }
        
        // Test all edges of body B
        for (let i = 0; i < verticesB.length; i++) {
            const j = (i + 1) % verticesB.length;
            const edge = {
                x: verticesB[j].x - verticesB[i].x,
                y: verticesB[j].y - verticesB[i].y
            };
            
            // Calculate perpendicular axis
            const axis = { x: -edge.y, y: edge.x };
            const axisLength = Math.sqrt(axis.x * axis.x + axis.y * axis.y);
            
            // Normalize the axis
            if (axisLength > 0) {
                axis.x /= axisLength;
                axis.y /= axisLength;
                
                // Project vertices onto the axis
                const { overlap, valid } = this.checkAxisSeparation(axis, verticesA, verticesB);
                
                // If there's no overlap, the bodies are not colliding
                if (!valid) return result;
                
                // Track the minimum overlap
                if (overlap < minOverlap) {
                    minOverlap = overlap;
                    // Adjust normal direction based on center-to-center vector
                    const dot = dx * axis.x + dy * axis.y;
                    const sign = Math.sign(dot);
                    
                    // Store collision normal
                    result.normal.x = axis.x * sign;
                    result.normal.y = axis.y * sign;
                }
            }
        }
        
        // If we got here, the bodies are colliding
        if (minOverlap < Infinity) {
            result.colliding = true;
            result.depth = minOverlap;
            
            // Find a good collision point
            result.point = this.findBestCollisionPoint(bodyA, bodyB, result.normal);
        }
        
        return result;
    }
    
    /**
     * Checks if two bodies are separated along a given axis
     * Returns the overlap depth if they're not separated
     */
    private static checkAxisSeparation(
        axis: Matter.Vector,
        verticesA: Matter.Vector[],
        verticesB: Matter.Vector[]
    ): { overlap: number, valid: boolean } {
        // Project vertices of body A onto the axis
        let minA = Infinity;
        let maxA = -Infinity;
        
        for (const vertex of verticesA) {
            const projection = axis.x * vertex.x + axis.y * vertex.y;
            minA = Math.min(minA, projection);
            maxA = Math.max(maxA, projection);
        }
        
        // Project vertices of body B onto the axis
        let minB = Infinity;
        let maxB = -Infinity;
        
        for (const vertex of verticesB) {
            const projection = axis.x * vertex.x + axis.y * vertex.y;
            minB = Math.min(minB, projection);
            maxB = Math.max(maxB, projection);
        }
        
        // Check for separation
        if (maxA < minB || maxB < minA) {
            // The bodies are separated along this axis
            return { overlap: 0, valid: false };
        }
        
        // Calculate overlap
        const overlap = Math.min(maxA - minB, maxB - minA);
        return { overlap, valid: true };
    }
    
    /**
     * Finds the best collision point between two bodies
     */
    private static findBestCollisionPoint(
        bodyA: Matter.Body,
        bodyB: Matter.Body,
        normal: Matter.Vector
    ): Matter.Vector {
        // Start with position along the collision normal as a fallback
        const collisionPoint = {
            x: bodyB.position.x - normal.x * ((bodyB.bounds.max.x - bodyB.bounds.min.x) / 2),
            y: bodyB.position.y - normal.y * ((bodyB.bounds.max.y - bodyB.bounds.min.y) / 2)
        };
        
        // If bodies have vertices, try to find a better collision point
        if (bodyA.vertices && bodyA.vertices.length > 0 && 
            bodyB.vertices && bodyB.vertices.length > 0) {
            
            // Find vertices most in the direction of the normal
            let maxDotA = -Infinity;
            let bestVertexA: Matter.Vector | null = null;
            
            for (const vertex of bodyA.vertices) {
                // Project vertex direction from center onto normal
                const dx = vertex.x - bodyA.position.x;
                const dy = vertex.y - bodyA.position.y;
                const dot = dx * normal.x + dy * normal.y;
                
                if (dot > maxDotA) {
                    maxDotA = dot;
                    bestVertexA = vertex;
                }
            }
            
            // Find vertices most in the opposite direction of the normal
            let maxDotB = -Infinity;
            let bestVertexB: Matter.Vector | null = null;
            
            for (const vertex of bodyB.vertices) {
                // Project vertex direction from center onto inverse normal
                const dx = vertex.x - bodyB.position.x;
                const dy = vertex.y - bodyB.position.y;
                const dot = dx * -normal.x + dy * -normal.y;
                
                if (dot > maxDotB) {
                    maxDotB = dot;
                    bestVertexB = vertex;
                }
            }
            
            // If we found suitable vertices, use their midpoint
            if (bestVertexA && bestVertexB) {
                collisionPoint.x = (bestVertexA.x + bestVertexB.x) / 2;
                collisionPoint.y = (bestVertexA.y + bestVertexB.y) / 2;
            }
        }
        
        return collisionPoint;
    }
    
    /**
     * Creates a synthetic collision event for the Matter.js engine
     */
    private static createSyntheticCollision(
        bodyA: Matter.Body,
        bodyB: Matter.Body,
        engine: Matter.Engine,
        collisionData: {
            normal: Matter.Vector,
            depth: number,
            point: Matter.Vector
        }
    ): void {
        // Create pair object with bodies and collision data
        const pair: any = {
            bodyA: bodyA,
            bodyB: bodyB,
            collision: {
                depth: collisionData.depth,
                normal: collisionData.normal,
                supports: [collisionData.point],
                parentA: bodyA,
                parentB: bodyB
            }
        };

        // Trigger collision events if engine has pairs
        if (engine.pairs) {
            // Create a pairs object for the event
            const pairs = { pairs: [pair] };
            
            // Trigger collision events
            Matter.Events.trigger(engine, 'collisionStart', pairs);
            Matter.Events.trigger(engine, 'collisionActive', pairs);
            
            if (BaseGameObject.isDebugMode()) {
                console.log(`Created synthetic collision between ${bodyA.label} and ${bodyB.label}`);
                console.log(`  Collision depth: ${collisionData.depth.toFixed(4)}`);
                console.log(`  Collision normal: (${collisionData.normal.x.toFixed(4)}, ${collisionData.normal.y.toFixed(4)})`);
            }
        }
    }

    /**
     * Creates a consistent separation force between bodies that should be colliding
     * This is a more direct approach to prevent bodies from passing through each other
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
            const forceMagnitude = Math.min(0.15, Math.pow(depth * 0.25, 1.5)) * shipBody.mass * impactFactor;
            
            // Apply a stronger force to the player (lighter object)
            Matter.Body.applyForce(playerBody, playerBody.position, {
                x: nx * forceMagnitude * 3.5,
                y: ny * forceMagnitude * 3.5
            });
            
            // Apply a weaker opposite force to the ship (heavier object)
            Matter.Body.applyForce(shipBody, shipBody.position, {
                x: -nx * forceMagnitude * 0.8,
                y: -ny * forceMagnitude * 0.8
            });
            
            // Apply an immediate velocity change to prevent sticking
            if (depth > 0.5) {
                const playerEscapeVel = 0.8 * depth;
                Matter.Body.setVelocity(playerBody, {
                    x: playerBody.velocity.x + (nx * playerEscapeVel),
                    y: playerBody.velocity.y + (ny * playerEscapeVel)
                });
                
                // Apply a subtle angular velocity for more natural response
                const currentAngVel = playerBody.angularVelocity || 0;
                const angularImpulse = (nx * relVelY - ny * relVelX) * 0.01;
                Matter.Body.setAngularVelocity(playerBody, currentAngVel + angularImpulse);
            }
        } else {
            // Objects are already separating, apply minimal stabilizing force
            const stabilizingForce = Math.min(0.03, depth * 0.1) * shipBody.mass;
            
            Matter.Body.applyForce(playerBody, playerBody.position, {
                x: nx * stabilizingForce * 1.5,
                y: ny * stabilizingForce * 1.5
            });
        }
    }
}
