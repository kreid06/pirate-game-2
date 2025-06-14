/**
 * Utility functions for creating plank bodies for ship hulls
 */

import Matter from 'matter-js';

/**
 * Point in 2D space
 */
export interface PlankPoint {
    x: number;
    y: number;
}

/**
 * Plank segment definition
 */
export interface PlankSegment {
    start: PlankPoint;
    end: PlankPoint;
    thickness: number;
    sectionName: string;
    index: number;
}

/**
 * Hull points that match Brigantine.HULL_POINTS
 */
export const HULL_POINTS = {
    bow: { x: 190, y: 90 },
    bowTip: { x: 415, y: 0 },
    bowBottom: { x: 190, y: -90 },
    sternBottom: { x: -260, y: -90 },
    sternTip: { x: -345, y: 0 },
    stern: { x: -260, y: 90 }
};

/**
 * Get a point on a quadratic bezier curve
 */
export function getQuadraticPoint(
    p0: PlankPoint, 
    p1: PlankPoint, 
    p2: PlankPoint, 
    t: number
): PlankPoint {
    const x = Math.pow(1-t, 2) * p0.x + 2 * (1-t) * t * p1.x + Math.pow(t, 2) * p2.x;
    const y = Math.pow(1-t, 2) * p0.y + 2 * (1-t) * t * p1.y + Math.pow(t, 2) * p2.y;
    return { x, y };
}

/**
 * Create segments for a curved section of the hull
 */
export function createCurvedSegments(
    start: PlankPoint, 
    control: PlankPoint, 
    end: PlankPoint, 
    segmentCount: number, 
    sectionName: string,
    plankThickness: number
): PlankSegment[] {
    const segments: PlankSegment[] = [];
    
    for (let i = 0; i < segmentCount; i++) {
        const t1 = i / segmentCount;
        const t2 = (i + 1) / segmentCount;
        const segStart = getQuadraticPoint(start, control, end, t1);
        const segEnd = getQuadraticPoint(start, control, end, t2);
        
        segments.push({
            start: segStart,
            end: segEnd,
            thickness: plankThickness,
            sectionName: sectionName,
            index: i
        });
    }
    
    return segments;
}

/**
 * Create segments for a straight section of the hull
 */
export function createStraightSegments(
    start: PlankPoint, 
    end: PlankPoint, 
    segmentCount: number, 
    sectionName: string,
    plankThickness: number
): PlankSegment[] {
    const segments: PlankSegment[] = [];
    
    for (let i = 0; i < segmentCount; i++) {
        const t1 = i / segmentCount;
        const t2 = (i + 1) / segmentCount;
        
        // Linear interpolation for straight segments
        const segStart = {
            x: start.x + t1 * (end.x - start.x),
            y: start.y + t1 * (end.y - start.y)
        };
        const segEnd = {
            x: start.x + t2 * (end.x - start.x),
            y: start.y + t2 * (end.y - start.y)
        };
        
        segments.push({
            start: segStart,
            end: segEnd,
            thickness: plankThickness,
            sectionName: sectionName,
            index: i
        });
    }
    
    return segments;
}

/**
 * Create all plank segments for a complete ship hull
 */
export function createCompleteHullSegments(plankThickness: number = 10): PlankSegment[] {
    const p = HULL_POINTS;
    const segments: PlankSegment[] = [];
    
    // Add bow curves (3 segments each)
    segments.push(...createCurvedSegments(p.bow, p.bowTip, p.bowBottom, 3, "port_bow", plankThickness));
    segments.push(...createCurvedSegments(p.bowBottom, p.bowTip, p.bow, 3, "starboard_bow", plankThickness));
    
    // Add stern curves (3 segments each)
    segments.push(...createCurvedSegments(p.stern, p.sternTip, p.sternBottom, 3, "port_stern", plankThickness));
    segments.push(...createCurvedSegments(p.sternBottom, p.sternTip, p.stern, 3, "starboard_stern", plankThickness));
    
    // Add straight sides (6 segments each)
    segments.push(...createStraightSegments(p.bowBottom, p.sternBottom, 6, "starboard_side", plankThickness));
    segments.push(...createStraightSegments(p.stern, p.bow, 6, "port_side", plankThickness));
    
    return segments;
}
