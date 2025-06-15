export class Color {
    static readonly RED: string = '#FF0000';
    static readonly GREEN: string = '#00FF00';
    static readonly BLUE: string = '#0000FF';
    static readonly BLACK: string = '#000000';
    static readonly WHITE: string = '#FFFFFF';
    static readonly YELLOW: string = '#FFFF00';
    static readonly BROWN: string = '#8B4513';
    
    // Ship colors
    static readonly SHIP_BODY: string = '#8B4513'; // Brown for wooden ships
    static readonly SAIL: string = '#FFFFFF'; // White for sails
    
    // Ocean colors
    static readonly OCEAN: string = '#1e90ff';
    static readonly OCEAN_DEEP: string = '#0047AB';
    static readonly OCEAN_SHALLOW: string = '#4682B4';
    static readonly SEAWEED: string = '#2E8B57';
    static readonly CORAL: string = '#FF7F50';
    static readonly SAND: string = '#F4A460';
    
    // Island colors
    static readonly ISLAND_GRASS: string = '#4CA64C'; // Green grass
    static readonly ISLAND_TREE: string = '#228B22'; // Forest green
    static readonly HOUSE_WALL: string = '#D2B48C'; // Tan for house walls
    static readonly HOUSE_ROOF: string = '#8B0000'; // Dark red for roofs
    static readonly HOUSE_DOOR: string = '#4B2F0A'; // Dark brown for doors
      // UI colors
    static readonly UI_BACKGROUND: string = 'rgba(0, 0, 0, 0.7)';
    static readonly UI_TEXT: string = '#FFFFFF';
    static readonly UI_HIGHLIGHT: string = '#FFD700'; // Gold
    static readonly COMPASS_N: string = '#FF0000'; // Red for North
    static readonly COMPASS_DIRECTION: string = '#FFFFFF';
      // Debug colors
    static readonly DEBUG_PHYSICS: string = 'rgba(0, 255, 0, 0.5)'; // Green for physics bodies
    static readonly DEBUG_VELOCITY: string = 'rgba(255, 255, 0, 0.7)'; // Yellow for velocity vectors
    static readonly DEBUG_CENTER: string = 'rgba(255, 0, 0, 0.7)'; // Red for center points
    static readonly DEBUG_ROTATION: string = 'rgba(0, 0, 255, 0.7)'; // Blue for rotation indicators
    static readonly DEBUG_CONTACT: string = 'rgba(255, 0, 255, 0.7)'; // Magenta for contact points
    static readonly DEBUG_SENSOR: string = 'rgba(0, 255, 255, 0.5)'; // Cyan for sensor areas
    static readonly DEBUG_RANGE: string = 'rgba(255, 165, 0, 0.3)'; // Orange for range indicators
    static readonly DEBUG_MODULE: string = 'rgba(255, 255, 255, 0.6)'; // White for module connections
    static readonly DEBUG_STATIC: string = 'rgba(128, 128, 128, 0.5)'; // Gray for static bodies
    static readonly DEBUG_DYNAMIC: string = 'rgba(0, 255, 0, 0.5)'; // Green for dynamic bodies
    static readonly DEBUG_SENSOR_BODY: string = 'rgba(255, 255, 0, 0.3)'; // Yellow for sensor bodies
    static readonly DEBUG_COLLISION: string = 'rgba(255, 0, 0, 0.5)'; // Red for collision points
    static readonly DEBUG_TEXT: string = 'rgba(255, 255, 255, 0.8)'; // White for debug text
    static readonly DEBUG_BOUNDS: string = 'rgba(100, 200, 255, 0.4)'; // Light blue for bounds
    static readonly DEBUG_OUTLINE: string = 'rgba(0, 255, 255, 0.6)'; // Cyan for outlines
    static readonly DEBUG_VERTEX: string = 'rgba(255, 255, 0, 0.8)'; // Yellow for vertices
    static readonly DEBUG_WARNING: string = 'rgba(255, 165, 0, 0.7)'; // Orange for warnings
    static readonly DEBUG_SUCCESS: string = 'rgba(0, 255, 0, 0.7)'; // Green for success
    static readonly DEBUG_ERROR: string = 'rgba(255, 0, 0, 0.7)'; // Red for errors
    
    // Treasure colors
    static readonly GOLD: string = '#FFD700';
    static readonly SILVER: string = '#C0C0C0';
    static readonly GEMS: string = '#4B0082'; // Indigo for gems
    
    // Effect colors
    static readonly EXPLOSION_CENTER: string = '#FFFF99';
    static readonly EXPLOSION_MID: string = '#FF6600';
    static readonly EXPLOSION_OUTER: string = '#CC3300';
    static readonly WATER_SPLASH: string = '#AADDFF';
    static readonly SMOKE: string = '#555555';
    
    // Power-up colors
    static readonly POWERUP_HEAL: string = '#00CC00';
    static readonly POWERUP_SPEED: string = '#00AAFF';
    static readonly POWERUP_CANNON: string = '#FF5500';
}

// Collision categories
export const CollisionCategories = {
    PLAYER: 0x0001,
    SHIP: 0x0002,
    ENEMY: 0x0004,
    PROJECTILE: 0x0008,
    POWERUP: 0x0010,
    TREASURE: 0x0020,
    ISLAND: 0x0040,
    DECK_ELEMENT: 0x0080, // New category for masts, planks, etc. on deck
    ALL: 0xFFFFFFFF
};
