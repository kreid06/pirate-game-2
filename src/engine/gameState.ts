/**
 * Enum for different game states
 */
export enum GameState {
    PLAYING,
    GAME_OVER
}

/**
 * Manages game state, score, and other game-wide properties
 */
export class GameStateManager {
    private state: GameState;
    private score: number;
    private highScore: number;
    private shipsDestroyed: number;
    private gameOverCallback: (() => void) | null;
    
    constructor() {
        this.state = GameState.PLAYING;
        this.score = 0;
        this.highScore = this.loadHighScore();
        this.shipsDestroyed = 0;
        this.gameOverCallback = null;
    }
    
    /**
     * Load high score from local storage
     */
    private loadHighScore(): number {
        const storedHighScore = localStorage.getItem('pirateGameHighScore');
        return storedHighScore ? parseInt(storedHighScore, 10) : 0;
    }
    
    /**
     * Save high score to local storage
     */
    private saveHighScore(): void {
        localStorage.setItem('pirateGameHighScore', this.highScore.toString());
    }
    
    /**
     * Add points to the score
     */
    public addScore(points: number): void {
        this.score += points;
        
        // Update high score if needed
        if (this.score > this.highScore) {
            this.highScore = this.score;
            this.saveHighScore();
        }
    }
    
    /**
     * Add to ships destroyed count and increase score
     */
    public addShipDestroyed(): void {
        this.shipsDestroyed++;
        
        // Add score based on ships destroyed
        this.addScore(100); // Base score for destroying a ship
    }
    
    /**
     * Set game state to GAME_OVER
     */
    public setGameOver(): void {
        if (this.state !== GameState.GAME_OVER) {
            this.state = GameState.GAME_OVER;
            
            // Call the game over callback if one is set
            if (this.gameOverCallback) {
                this.gameOverCallback();
            }
        }
    }
    
    /**
     * Reset the game state for a new game
     */
    public resetGame(): void {
        this.state = GameState.PLAYING;
        this.score = 0;
        this.shipsDestroyed = 0;
    }
    
    /**
     * Set a callback function to be called when the game ends
     */
    public setGameOverCallback(callback: () => void): void {
        this.gameOverCallback = callback;
    }
    
    /**
     * Get the current game state
     */
    public getState(): GameState {
        return this.state;
    }
    
    /**
     * Get the current score
     */
    public getScore(): number {
        return this.score;
    }
    
    /**
     * Get the high score
     */
    public getHighScore(): number {
        return this.highScore;
    }
    
    /**
     * Get the number of ships destroyed
     */
    public getShipsDestroyed(): number {
        return this.shipsDestroyed;
    }
    
    /**
     * Check if the game is over
     */
    public isGameOver(): boolean {
        return this.state === GameState.GAME_OVER;
    }
}
