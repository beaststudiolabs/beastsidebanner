/**
 * Performance Configuration
 *
 * Detects device capabilities and adjusts settings for optimal performance
 */

export class PerformanceConfig {
    constructor() {
        this.deviceTier = null;
        this.settings = null;
        this.detect();
    }

    /**
     * Detect device capabilities
     */
    detect() {
        const tier = this.detectDeviceTier();
        this.deviceTier = tier;
        this.settings = this.getSettingsForTier(tier);

        console.log(`PerformanceConfig: Device tier detected: ${tier}`);
        console.log('Performance settings:', this.settings);
    }

    /**
     * Detect device tier (high, medium, low)
     */
    detectDeviceTier() {
        // Check hardware concurrency (CPU cores)
        const cores = navigator.hardwareConcurrency || 2;

        // Check device memory (if available)
        const memory = navigator.deviceMemory || 4; // GB

        // Check if mobile
        const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

        // Check screen size
        const screenSize = window.screen.width * window.screen.height;
        const isSmallScreen = screenSize < 1920 * 1080;

        // Scoring system
        let score = 0;

        // CPU score
        if (cores >= 8) score += 3;
        else if (cores >= 4) score += 2;
        else score += 1;

        // Memory score
        if (memory >= 8) score += 3;
        else if (memory >= 4) score += 2;
        else score += 1;

        // Device type penalty
        if (isMobile) score -= 1;

        // Screen size
        if (isSmallScreen) score += 1; // Smaller screen = less pixels to render

        // Determine tier
        if (score >= 6) return 'high';
        if (score >= 4) return 'medium';
        return 'low';
    }

    /**
     * Get performance settings for device tier
     */
    getSettingsForTier(tier) {
        const settings = {
            high: {
                // High-end device settings
                pixelRatio: Math.min(window.devicePixelRatio, 2),
                targetFPS: 60,
                shadowsEnabled: false, // Not used yet
                antialiasing: true,
                faceMeshDetail: 'high',
                videoResolution: { width: 1280, height: 720 },
                recordingQuality: 'high',
                preloadAllCharacters: true,
                enableBloom: false, // Not implemented
            },
            medium: {
                // Mid-range device settings
                pixelRatio: 1.5,
                targetFPS: 30,
                shadowsEnabled: false,
                antialiasing: true,
                faceMeshDetail: 'medium',
                videoResolution: { width: 1280, height: 720 },
                recordingQuality: 'medium',
                preloadAllCharacters: false,
                enableBloom: false,
            },
            low: {
                // Low-end device settings
                pixelRatio: 1,
                targetFPS: 30,
                shadowsEnabled: false,
                antialiasing: false,
                faceMeshDetail: 'low',
                videoResolution: { width: 640, height: 480 },
                recordingQuality: 'low',
                preloadAllCharacters: false,
                enableBloom: false,
            }
        };

        return settings[tier];
    }

    /**
     * Get current settings
     */
    getSettings() {
        return this.settings;
    }

    /**
     * Get device tier
     */
    getDeviceTier() {
        return this.deviceTier;
    }

    /**
     * Check if device is low-end
     */
    isLowEnd() {
        return this.deviceTier === 'low';
    }

    /**
     * Check if device is high-end
     */
    isHighEnd() {
        return this.deviceTier === 'high';
    }

    /**
     * Get recommended pixel ratio
     */
    getPixelRatio() {
        return this.settings.pixelRatio;
    }

    /**
     * Get target FPS
     */
    getTargetFPS() {
        return this.settings.targetFPS;
    }

    /**
     * Get video resolution
     */
    getVideoResolution() {
        return this.settings.videoResolution;
    }

    /**
     * Should preload all characters?
     */
    shouldPreloadAllCharacters() {
        return this.settings.preloadAllCharacters;
    }
}

// Create singleton instance
export const performanceConfig = new PerformanceConfig();
