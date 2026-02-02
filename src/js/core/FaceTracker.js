/**
 * FaceTracker - MediaPipe Face Mesh integration
 *
 * Processes video frames to detect face landmarks and calculate blendshapes.
 * Emits events with face tracking data for other modules to consume.
 */

import { FaceMesh } from '@mediapipe/face_mesh';
import BlendshapeMapper from '../utils/BlendshapeMapper.js';

class FaceTracker {
    constructor(videoElement, eventEmitter) {
        this.videoElement = videoElement;
        this.eventEmitter = eventEmitter;

        this.faceMesh = null;
        this.blendshapeMapper = new BlendshapeMapper();
        this.isInitialized = false;
        this.isTracking = false;

        // Performance tracking
        this.lastFrameTime = 0;
        this.frameCount = 0;
        this.fps = 0;

        // Face tracking state
        this.faceDetected = false;
        this.currentLandmarks = null;
        this.currentBlendshapes = null;
    }

    /**
     * Initialize MediaPipe Face Mesh
     */
    async initialize() {
        try {
            console.log('FaceTracker: Initializing MediaPipe Face Mesh...');

            this.faceMesh = new FaceMesh({
                locateFile: (file) => {
                    return `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`;
                }
            });

            // Configure Face Mesh
            this.faceMesh.setOptions({
                maxNumFaces: 1,              // Track single face for performance
                refineLandmarks: true,       // Better accuracy for eyes and lips
                minDetectionConfidence: 0.5, // Balance accuracy and performance
                minTrackingConfidence: 0.5
            });

            // Set up result callback
            this.faceMesh.onResults(this.onResults.bind(this));

            this.isInitialized = true;
            console.log('FaceTracker: Initialized successfully');
        } catch (error) {
            console.error('FaceTracker: Initialization failed', error);
            throw error;
        }
    }

    /**
     * Start face tracking
     */
    async start() {
        if (!this.isInitialized) {
            await this.initialize();
        }

        console.log('FaceTracker: Starting tracking...');
        this.isTracking = true;
        this.processFrame();
    }

    /**
     * Stop face tracking
     */
    stop() {
        console.log('FaceTracker: Stopping tracking...');
        this.isTracking = false;
    }

    /**
     * Process video frame for face detection
     */
    async processFrame() {
        if (!this.isTracking || !this.videoElement.readyState >= 2) {
            return;
        }

        try {
            // Send frame to MediaPipe
            await this.faceMesh.send({ image: this.videoElement });

            // Continue processing next frame
            if (this.isTracking) {
                requestAnimationFrame(() => this.processFrame());
            }
        } catch (error) {
            console.error('FaceTracker: Frame processing error', error);
        }
    }

    /**
     * Handle MediaPipe results
     */
    onResults(results) {
        // Update FPS tracking
        this.updateFPS();

        if (results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0) {
            // Face detected
            if (!this.faceDetected) {
                this.faceDetected = true;
                this.eventEmitter.emit('faceDetected', { detected: true });
                console.log('FaceTracker: Face detected');
            }

            // Get landmarks (468 points)
            this.currentLandmarks = results.multiFaceLandmarks[0];

            // Calculate blendshapes
            this.currentBlendshapes = this.blendshapeMapper.calculateBlendshapes(this.currentLandmarks);

            // Calculate face position and rotation
            const faceTransform = this.calculateFaceTransform(this.currentLandmarks);

            // Emit tracking data
            this.eventEmitter.emit('faceTracked', {
                landmarks: this.currentLandmarks,
                blendshapes: this.currentBlendshapes,
                transform: faceTransform,
                fps: this.fps
            });
        } else {
            // No face detected
            if (this.faceDetected) {
                this.faceDetected = false;
                this.eventEmitter.emit('faceDetected', { detected: false });
                console.log('FaceTracker: Face lost');
            }
        }
    }

    /**
     * Calculate face position and rotation from landmarks
     */
    calculateFaceTransform(landmarks) {
        // Use key landmarks for face center and orientation
        const noseTip = landmarks[1];        // Center point
        const leftEye = landmarks[33];       // Left eye outer corner
        const rightEye = landmarks[263];     // Right eye outer corner
        const jawBottom = landmarks[152];    // Chin

        // Calculate face center (normalized -1 to 1)
        const faceCenter = {
            x: (noseTip.x - 0.5) * 2,      // Convert 0-1 to -1 to 1
            y: -(noseTip.y - 0.5) * 2,     // Invert Y and convert
            z: noseTip.z || 0               // Z depth (if available)
        };

        // Calculate face rotation
        const eyeDistance = Math.sqrt(
            Math.pow(rightEye.x - leftEye.x, 2) +
            Math.pow(rightEye.y - leftEye.y, 2)
        );

        // Roll (head tilt)
        const roll = Math.atan2(rightEye.y - leftEye.y, rightEye.x - leftEye.x);

        // Yaw (left-right turn) - estimated from eye position
        const eyeCenter = {
            x: (leftEye.x + rightEye.x) / 2,
            y: (leftEye.y + rightEye.y) / 2
        };
        const yaw = (eyeCenter.x - 0.5) * Math.PI * 0.5; // Rough estimate

        // Pitch (up-down tilt) - estimated from nose-to-jaw ratio
        const faceHeight = Math.abs(jawBottom.y - eyeCenter.y);
        const pitch = (faceHeight - 0.25) * Math.PI; // Rough estimate

        // Face scale (distance from camera)
        const scale = eyeDistance * 10; // Normalize to reasonable range

        return {
            position: faceCenter,
            rotation: { pitch, yaw, roll },
            scale
        };
    }

    /**
     * Update FPS calculation
     */
    updateFPS() {
        const now = performance.now();
        this.frameCount++;

        if (this.lastFrameTime === 0) {
            this.lastFrameTime = now;
            return;
        }

        const elapsed = now - this.lastFrameTime;

        // Update FPS every second
        if (elapsed >= 1000) {
            this.fps = Math.round((this.frameCount * 1000) / elapsed);
            this.frameCount = 0;
            this.lastFrameTime = now;

            // Emit FPS update
            this.eventEmitter.emit('fpsUpdate', { fps: this.fps });
        }
    }

    /**
     * Get current tracking state
     */
    getTrackingState() {
        return {
            isTracking: this.isTracking,
            faceDetected: this.faceDetected,
            fps: this.fps,
            landmarks: this.currentLandmarks,
            blendshapes: this.currentBlendshapes
        };
    }

    /**
     * Reset tracking baseline (useful when switching users)
     */
    reset() {
        this.blendshapeMapper.resetBaseline();
        this.faceDetected = false;
        this.currentLandmarks = null;
        this.currentBlendshapes = null;
        console.log('FaceTracker: Reset');
    }
}

export default FaceTracker;
