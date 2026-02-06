/**
 * BackgroundEffects - Apply visual effects to background video
 *
 * Effects are applied during composite frame rendering for captures.
 */

class BackgroundEffects {
    constructor() {
        this.currentEffect = 'none';

        // Available effects
        this.effects = {
            none: {
                name: 'None',
                icon: 'circle-off',
                apply: (ctx, width, height) => {
                    // No effect
                }
            },
            blur: {
                name: 'Blur',
                icon: 'blur',
                apply: (ctx, width, height) => {
                    // Apply blur using CSS filter on the context
                    ctx.filter = 'blur(8px)';
                }
            },
            warmTint: {
                name: 'Warm',
                icon: 'sun',
                apply: (ctx, width, height) => {
                    // Apply warm orange overlay
                    ctx.fillStyle = 'rgba(255, 200, 150, 0.15)';
                    ctx.fillRect(0, 0, width, height);
                }
            },
            coolTint: {
                name: 'Cool',
                icon: 'snowflake',
                apply: (ctx, width, height) => {
                    // Apply cool blue overlay
                    ctx.fillStyle = 'rgba(150, 200, 255, 0.15)';
                    ctx.fillRect(0, 0, width, height);
                }
            },
            vignette: {
                name: 'Vignette',
                icon: 'aperture',
                apply: (ctx, width, height) => {
                    // Create radial gradient for vignette
                    const centerX = width / 2;
                    const centerY = height / 2;
                    const radius = Math.max(width, height) * 0.7;

                    const gradient = ctx.createRadialGradient(
                        centerX, centerY, radius * 0.3,
                        centerX, centerY, radius
                    );
                    gradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
                    gradient.addColorStop(0.5, 'rgba(0, 0, 0, 0.1)');
                    gradient.addColorStop(1, 'rgba(0, 0, 0, 0.5)');

                    ctx.fillStyle = gradient;
                    ctx.fillRect(0, 0, width, height);
                }
            },
            dramatic: {
                name: 'Dramatic',
                icon: 'contrast',
                apply: (ctx, width, height) => {
                    // Combine vignette with slight desaturation
                    const centerX = width / 2;
                    const centerY = height / 2;
                    const radius = Math.max(width, height) * 0.6;

                    const gradient = ctx.createRadialGradient(
                        centerX, centerY, radius * 0.2,
                        centerX, centerY, radius
                    );
                    gradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
                    gradient.addColorStop(0.6, 'rgba(0, 0, 0, 0.2)');
                    gradient.addColorStop(1, 'rgba(0, 0, 0, 0.6)');

                    ctx.fillStyle = gradient;
                    ctx.fillRect(0, 0, width, height);
                }
            }
        };
    }

    /**
     * Get all available effects
     * @returns {Array} Array of effect objects with id, name, and icon
     */
    getEffects() {
        return Object.entries(this.effects).map(([id, effect]) => ({
            id,
            name: effect.name,
            icon: effect.icon
        }));
    }

    /**
     * Set current effect
     * @param {string} effectId - Effect identifier
     */
    setEffect(effectId) {
        if (this.effects[effectId]) {
            this.currentEffect = effectId;
            console.log(`BackgroundEffects: Set effect to ${effectId}`);
        } else {
            console.warn(`BackgroundEffects: Unknown effect ${effectId}`);
        }
    }

    /**
     * Get current effect
     * @returns {string} Current effect identifier
     */
    getEffect() {
        return this.currentEffect;
    }

    /**
     * Apply pre-draw effect (like blur) - call before drawing video
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     */
    applyPreEffect(ctx) {
        if (this.currentEffect === 'blur') {
            ctx.filter = 'blur(8px)';
        } else {
            ctx.filter = 'none';
        }
    }

    /**
     * Reset context filter after pre-effect
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     */
    resetPreEffect(ctx) {
        ctx.filter = 'none';
    }

    /**
     * Apply post-draw effect (overlays) - call after drawing video
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {number} width - Canvas width
     * @param {number} height - Canvas height
     */
    applyPostEffect(ctx, width, height) {
        const effect = this.effects[this.currentEffect];
        if (effect && this.currentEffect !== 'none' && this.currentEffect !== 'blur') {
            effect.apply(ctx, width, height);
        }
    }

    /**
     * Check if current effect requires pre-draw filter
     * @returns {boolean}
     */
    hasPreEffect() {
        return this.currentEffect === 'blur';
    }
}

export default BackgroundEffects;
