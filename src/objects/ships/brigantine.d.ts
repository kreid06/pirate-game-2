import { Ships } from './ships';
import { Physics } from '../../engine/physics';
import * as Matter from 'matter-js';

export class Brigantine extends Ships {
    // Explicitly declare the method that's causing issues
    createPlankBodies(physics: Physics): void;
    updatePlankBodies(): void;
    
    // Other methods and properties...
}
