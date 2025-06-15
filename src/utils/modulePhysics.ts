import { CollisionCategories } from '../utils/color';

/**
 * Interface defining the properties of a module's physics body
 */
interface ModuleBodyProperties {
    width: number;
    height: number;
    radius?: number;
    density: number;
    isSensor: boolean;
    collisionCategory: number;
    collisionMask: number;
    collisionGroup: number;
}

/**
 * Get the physics body properties for a specific module type
 * @param moduleType The type of module ('cannon', 'sail', 'wheel', etc.)
 * @returns A set of physics body properties for the module
 */
export function getModuleBodyProperties(moduleType: string): ModuleBodyProperties {
    // Default properties
    const defaultProps: ModuleBodyProperties = {
        width: 20,
        height: 20,
        density: 0.001,
        isSensor: false,
        collisionCategory: CollisionCategories.SHIP,
        collisionMask: CollisionCategories.PLAYER | CollisionCategories.PROJECTILE,
        collisionGroup: 0
    };
    
    // Type-specific properties
    switch (moduleType) {
        case 'cannon':
            return {
                ...defaultProps,
                width: 20,
                height: 40,
                density: 0.005,
                isSensor: false
            };
          case 'sail':
            return {
                ...defaultProps,
                width: 10,
                height: 260, // Full height when fully deployed
                density: 0.0005, // Very light
                isSensor: true, // Sails don't physically collide
                collisionCategory: CollisionCategories.SAIL_FIBER, // Use the new sail fiber category
                collisionMask: CollisionCategories.PROJECTILE // Only hit by projectiles
            };
        
        case 'wheel':
            return {
                ...defaultProps,
                width: 30,
                height: 30,
                radius: 15, // Wheels are circular
                density: 0.002,
                isSensor: true, // The wheel is just for control, no physics interactions
                collisionCategory: CollisionCategories.MODULE, // Use the new module category
                collisionMask: CollisionCategories.PLAYER // Only collide with player for interaction
            };
        
        default:
            return defaultProps;
    }
}
