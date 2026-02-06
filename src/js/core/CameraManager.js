/**
 * CameraManager - Handles camera access and video stream
 *
 * Manages getUserMedia camera access, permissions, and stream lifecycle.
 */

import { performanceConfig } from '../config/performance-config.js';

class CameraManager {
    constructor(videoElement) {
        this.videoElement = videoElement;
        this.stream = null;
        this.isActive = false;
        this.facingMode = 'user'; // 'user' = front camera, 'environment' = back camera

        // Get performance settings
        this.perfSettings = performanceConfig.getSettings();
    }

    /**
     * Start camera and attach stream to video element
     * @param {string} facingMode - 'user' for front camera, 'environment' for back camera
     */
    async start(facingMode = this.facingMode) {
        try {
            console.log(`CameraManager: Requesting camera access (${facingMode})...`);

            // Store current facing mode
            this.facingMode = facingMode;

            // Request camera with optimal constraints for face tracking
            // Use performance settings for resolution
            const { width, height } = this.perfSettings.videoResolution;
            const constraints = {
                video: {
                    facingMode: facingMode,
                    width: { ideal: width },
                    height: { ideal: height },
                    frameRate: { ideal: 30, max: 60 }
                },
                audio: false // No audio needed for now
            };

            console.log(`CameraManager: Requesting ${width}x${height} resolution`);

            this.stream = await navigator.mediaDevices.getUserMedia(constraints);

            // Attach stream to video element
            this.videoElement.srcObject = this.stream;

            // Wait for video to be ready
            await this.waitForVideoReady();

            this.isActive = true;
            console.log('CameraManager: Camera started successfully');

            // Log actual video dimensions
            console.log(`Video dimensions: ${this.videoElement.videoWidth}x${this.videoElement.videoHeight}`);

            return { facingMode: this.facingMode };
        } catch (error) {
            console.error('CameraManager: Failed to start camera', error);
            throw error;
        }
    }

    /**
     * Wait for video element to be ready
     */
    waitForVideoReady() {
        return new Promise((resolve, reject) => {
            if (this.videoElement.readyState >= 2) {
                resolve();
                return;
            }

            const onLoadedData = () => {
                this.videoElement.removeEventListener('loadeddata', onLoadedData);
                resolve();
            };

            const onError = (error) => {
                this.videoElement.removeEventListener('error', onError);
                reject(error);
            };

            this.videoElement.addEventListener('loadeddata', onLoadedData);
            this.videoElement.addEventListener('error', onError);
        });
    }

    /**
     * Stop camera and release stream
     */
    stop() {
        if (this.stream) {
            console.log('CameraManager: Stopping camera...');

            this.stream.getTracks().forEach(track => {
                track.stop();
            });

            this.videoElement.srcObject = null;
            this.stream = null;
            this.isActive = false;

            console.log('CameraManager: Camera stopped');
        }
    }

    /**
     * Pause camera stream
     */
    pause() {
        if (this.stream) {
            this.stream.getTracks().forEach(track => {
                track.enabled = false;
            });
        }
    }

    /**
     * Resume camera stream
     */
    resume() {
        if (this.stream) {
            this.stream.getTracks().forEach(track => {
                track.enabled = true;
            });
        }
    }

    /**
     * Get video dimensions
     */
    getVideoDimensions() {
        return {
            width: this.videoElement.videoWidth,
            height: this.videoElement.videoHeight
        };
    }

    /**
     * Flip between front and back camera
     * @returns {Promise<{facingMode: string}>} New facing mode
     */
    async flipCamera() {
        const newFacingMode = this.facingMode === 'user' ? 'environment' : 'user';
        console.log(`CameraManager: Flipping camera to ${newFacingMode}`);

        // Stop current stream
        this.stop();

        // Start with new facing mode
        return await this.start(newFacingMode);
    }

    /**
     * Get current facing mode
     * @returns {string} Current facing mode ('user' or 'environment')
     */
    getFacingMode() {
        return this.facingMode;
    }

    /**
     * Check if device has multiple cameras
     * @returns {Promise<boolean>}
     */
    async hasMultipleCameras() {
        try {
            const devices = await navigator.mediaDevices.enumerateDevices();
            const videoInputs = devices.filter(device => device.kind === 'videoinput');
            return videoInputs.length > 1;
        } catch (error) {
            console.warn('CameraManager: Could not enumerate devices', error);
            return false;
        }
    }
}

export default CameraManager;
