/**
 * SoundManager - Handles sound effects for the application
 *
 * Manages audio playback with graceful fallback if sounds fail to load.
 */

class SoundManager {
    constructor() {
        this.sounds = {};
        this.muted = false;
        this.loaded = false;
        this.volume = 0.5;

        // Audio context for better mobile support
        this.audioContext = null;
    }

    /**
     * Initialize sound manager and preload sounds
     */
    async initialize() {
        try {
            // Create audio context (needed for iOS)
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();

            // Preload the shutter wav file
            this.shutterBuffer = await this.loadAudioFile('/assets/sounds/CameraShutter_SFXB.4034.wav');

            // Define sounds
            const soundsToLoad = {
                shutter: this.createShutterSound(),
                countdown: this.createCountdownSound()
            };

            // Store sounds
            this.sounds = soundsToLoad;
            this.loaded = true;

            console.log('SoundManager: Initialized' + (this.shutterBuffer ? ' with shutter wav' : ' with fallback'));
        } catch (error) {
            console.warn('SoundManager: Failed to initialize audio context', error);
            this.loaded = false;
        }
    }

    /**
     * Load an audio file and decode it into an AudioBuffer
     */
    async loadAudioFile(url) {
        try {
            const response = await fetch(url);
            const arrayBuffer = await response.arrayBuffer();
            return await this.audioContext.decodeAudioData(arrayBuffer);
        } catch (error) {
            console.warn('SoundManager: Failed to load audio file', url, error);
            return null;
        }
    }

    /**
     * Create shutter sound player using preloaded wav file
     * @returns {Function} Function to play the sound
     */
    createShutterSound() {
        return () => {
            if (!this.audioContext || this.muted) return;

            try {
                if (this.audioContext.state === 'suspended') {
                    this.audioContext.resume();
                }

                if (this.shutterBuffer) {
                    const source = this.audioContext.createBufferSource();
                    const gain = this.audioContext.createGain();
                    source.buffer = this.shutterBuffer;
                    gain.gain.value = this.volume;
                    source.connect(gain);
                    gain.connect(this.audioContext.destination);
                    source.start(0);
                }
            } catch (error) {
                console.warn('SoundManager: Error playing shutter sound', error);
            }
        };
    }

    /**
     * Create a countdown beep sound using Web Audio API
     * @returns {Function} Function to play the sound
     */
    createCountdownSound() {
        return () => {
            if (!this.audioContext || this.muted) return;

            try {
                // Resume audio context if suspended (iOS requirement)
                if (this.audioContext.state === 'suspended') {
                    this.audioContext.resume();
                }

                const now = this.audioContext.currentTime;

                // Create oscillator for beep
                const osc = this.audioContext.createOscillator();
                const gain = this.audioContext.createGain();

                osc.connect(gain);
                gain.connect(this.audioContext.destination);

                // Short beep
                osc.type = 'sine';
                osc.frequency.setValueAtTime(880, now); // A5 note

                gain.gain.setValueAtTime(this.volume * 0.2, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

                osc.start(now);
                osc.stop(now + 0.15);
            } catch (error) {
                console.warn('SoundManager: Error playing countdown sound', error);
            }
        };
    }

    /**
     * Play a sound by name
     * @param {string} soundName - Name of the sound to play
     */
    play(soundName) {
        if (this.muted || !this.loaded) return;

        const sound = this.sounds[soundName];
        if (sound && typeof sound === 'function') {
            sound();
        } else {
            console.warn(`SoundManager: Sound "${soundName}" not found`);
        }
    }

    /**
     * Set muted state
     * @param {boolean} muted - Whether sounds should be muted
     */
    setMuted(muted) {
        this.muted = muted;
        console.log(`SoundManager: ${muted ? 'Muted' : 'Unmuted'}`);
    }

    /**
     * Toggle muted state
     * @returns {boolean} New muted state
     */
    toggleMute() {
        this.muted = !this.muted;
        console.log(`SoundManager: ${this.muted ? 'Muted' : 'Unmuted'}`);
        return this.muted;
    }

    /**
     * Get muted state
     * @returns {boolean} Current muted state
     */
    isMuted() {
        return this.muted;
    }

    /**
     * Set volume
     * @param {number} volume - Volume level (0-1)
     */
    setVolume(volume) {
        this.volume = Math.max(0, Math.min(1, volume));
    }

    /**
     * Resume audio context (call on user interaction for iOS)
     */
    async resumeContext() {
        if (this.audioContext && this.audioContext.state === 'suspended') {
            try {
                await this.audioContext.resume();
                console.log('SoundManager: Audio context resumed');
            } catch (error) {
                console.warn('SoundManager: Failed to resume audio context', error);
            }
        }
    }

    /**
     * Clean up resources
     */
    dispose() {
        if (this.audioContext) {
            this.audioContext.close();
            this.audioContext = null;
        }
        this.sounds = {};
        this.loaded = false;
    }
}

export default SoundManager;
