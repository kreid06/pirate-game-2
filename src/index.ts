import { Game } from './game';

// Wait for DOM to load before starting the game
window.addEventListener('DOMContentLoaded', () => {
    const game = new Game();
    game.start();
    
    console.log('Pirate Game 2 started!');
});
