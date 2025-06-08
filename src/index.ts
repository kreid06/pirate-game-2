import { Game } from './game';
import { KeyDebugger } from './keyDebugger';

// Wait for DOM to load before starting the game
window.addEventListener('DOMContentLoaded', () => {
    // Initialize key debugger
    KeyDebugger.initialize();
    
    const game = new Game();
    
    // Connect key debugger to game instance
    KeyDebugger.setGameInstance(game);
    
    // Add game instance to window for console debugging
    (window as any).game = game;
    
    game.start();
    
    console.log('Pirate Game 2 started!');
});
