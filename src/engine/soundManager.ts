/**
 * Manages all game sounds and music
 */
export class SoundManager {
    private sounds: Map<string, HTMLAudioElement>;
    private music: HTMLAudioElement | null;
    private isMuted: boolean;
    private musicVolume: number;
    private soundVolume: number;
    private currentMusic: string | null;
    
    constructor() {
        this.sounds = new Map<string, HTMLAudioElement>();
        this.music = null;
        this.isMuted = false;
        this.musicVolume = 0.3;
        this.soundVolume = 0.5;
        this.currentMusic = null;
        
        // Load sounds
        this.loadSounds();
    }
      private loadSounds(): void {
        // Load all game sounds
        this.loadSound('cannon', 'sounds/cannon.mp3');
        this.loadSound('splash', 'sounds/splash.mp3');
        this.loadSound('explosion', 'sounds/explosion.mp3');
        this.loadSound('coin', 'sounds/coin.mp3');
        this.loadSound('powerup', 'sounds/powerup.mp3');
        this.loadSound('damage', 'sounds/damage.mp3');
        this.loadSound('sinking', 'sounds/sinking.mp3');
        this.loadSound('wave', 'sounds/wave.mp3');
        this.loadSound('collision', 'sounds/damage.mp3'); // Reuse damage sound for ship collisions
        
        // Load music
        this.loadMusic('background', 'music/sea_shanty.mp3');
        this.loadMusic('battle', 'music/battle.mp3');
        this.loadMusic('gameover', 'music/gameover.mp3');
    }
    
    private loadSound(name: string, url: string): void {
        const audio = new Audio();
        audio.src = url;
        audio.preload = 'auto';
        audio.volume = this.soundVolume;
        
        // Handle loading errors
        audio.onerror = () => {
            console.warn(`Failed to load sound: ${name} (${url})`);
        };
        
        this.sounds.set(name, audio);
    }
    
    private loadMusic(name: string, url: string): void {
        const audio = new Audio();
        audio.src = url;
        audio.preload = 'auto';
        audio.loop = true;
        audio.volume = this.musicVolume;
        
        // Handle loading errors
        audio.onerror = () => {
            console.warn(`Failed to load music: ${name} (${url})`);
        };
        
        this.sounds.set(`music_${name}`, audio);
    }
    
    /**
     * Play a sound effect
     * @param name Name of the sound to play
     * @param volume Optional volume override (0.0 to 1.0)
     */
    public playSound(name: string, volume?: number): void {
        if (this.isMuted) return;
        
        const sound = this.sounds.get(name);
        if (sound) {
            // Create a clone of the audio element to allow overlapping sounds
            const soundClone = sound.cloneNode(true) as HTMLAudioElement;
            
            // Set volume if provided, otherwise use default
            if (volume !== undefined) {
                soundClone.volume = volume * this.soundVolume;
            } else {
                soundClone.volume = this.soundVolume;
            }
            
            // Play the sound
            soundClone.play().catch(error => {
                console.warn(`Error playing sound '${name}': ${error}`);
            });
        } else {
            console.warn(`Sound not found: ${name}`);
        }
    }
    
    /**
     * Play background music
     * @param name Name of the music track
     * @param fadeIn Whether to fade in the music
     */
    public playMusic(name: string, fadeIn: boolean = false): void {
        if (this.currentMusic === name) return;
        
        // Stop current music if playing
        this.stopMusic();
        
        const music = this.sounds.get(`music_${name}`);
        if (music) {
            this.music = music;
            this.currentMusic = name;
            
            if (!this.isMuted) {
                if (fadeIn) {
                    // Start with volume 0 and fade in
                    this.music.volume = 0;
                    this.music.play().catch(error => {
                        console.warn(`Error playing music '${name}': ${error}`);
                    });
                    
                    // Fade in over 2 seconds
                    let volume = 0;
                    const fadeInterval = setInterval(() => {
                        volume += 0.05;
                        if (volume >= this.musicVolume) {
                            volume = this.musicVolume;
                            clearInterval(fadeInterval);
                        }
                        if (this.music) {
                            this.music.volume = volume;
                        }
                    }, 100);
                } else {
                    // Play at normal volume
                    this.music.volume = this.musicVolume;
                    this.music.play().catch(error => {
                        console.warn(`Error playing music '${name}': ${error}`);
                    });
                }
            }
        } else {
            console.warn(`Music not found: ${name}`);
        }
    }
    
    /**
     * Stop the currently playing music
     * @param fadeOut Whether to fade out the music
     */
    public stopMusic(fadeOut: boolean = false): void {
        if (!this.music) return;
        
        if (fadeOut) {
            // Fade out over 1 second
            const originalVolume = this.music.volume;
            let volume = originalVolume;
            const fadeInterval = setInterval(() => {
                volume -= 0.05;
                if (volume <= 0) {
                    volume = 0;
                    clearInterval(fadeInterval);
                    this.music!.pause();
                    this.music!.currentTime = 0;
                }
                this.music!.volume = volume;
            }, 50);
        } else {
            // Stop immediately
            this.music.pause();
            this.music.currentTime = 0;
        }
        
        this.currentMusic = null;
    }
      /**
     * Mute or unmute all sounds and music
     */
    public toggleMute(): boolean {
        this.isMuted = !this.isMuted;
        
        if (this.isMuted) {
            // Mute music if playing
            if (this.music) {
                this.music.volume = 0;
            }
        } else {
            // Restore music volume if playing
            if (this.music) {
                this.music.volume = this.musicVolume;
            }
        }
        
        return this.isMuted;
    }
    
    /**
     * Set the volume for all sound effects
     * @param volume Volume level (0.0 to 1.0)
     */
    public setSoundVolume(volume: number): void {
        this.soundVolume = Math.max(0, Math.min(1, volume));
    }
    
    /**
     * Set the volume for music
     * @param volume Volume level (0.0 to 1.0)
     */
    public setMusicVolume(volume: number): void {
        this.musicVolume = Math.max(0, Math.min(1, volume));
        
        // Update current music volume if playing
        if (this.music && !this.isMuted) {
            this.music.volume = this.musicVolume;
        }
    }
    
    /**
     * Check if audio is muted
     */
    public isMutedState(): boolean {
        return this.isMuted;
    }
    
    /**
     * Get the current music track name
     */
    public getCurrentMusic(): string | null {
        return this.currentMusic;
    }
}
