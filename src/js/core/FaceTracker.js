/**
 * FaceTracker - MediaPipe Face Mesh integration
 *
 * Processes video frames to detect face landmarks and calculate blendshapes.
 * Emits events with face tracking data for other modules to consume.
 *
 * Note: MediaPipe is loaded from CDN in index.html and adds FaceMesh to window
 */

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

            // Use window.FaceMesh since MediaPipe adds it to global scope
            const FaceMeshClass = window.FaceMesh;
            if (!FaceMeshClass) {
                throw new Error('FaceMesh not found. MediaPipe library may not have loaded.');
            }

            this.faceMesh = new FaceMeshClass({
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
     * Uses proper 3D head pose estimation from multiple landmark points
     */
    calculateFaceTransform(landmarks) {
        // Key landmarks for head pose estimation
        const noseTip = landmarks[1];           // Nose tip
        const noseBridge = landmarks[6];        // Between eyes
        const chin = landmarks[152];            // Bottom of chin
        const leftEyeOuter = landmarks[33];     // Left eye outer corner
        const rightEyeOuter = landmarks[263];   // Right eye outer corner
        const leftEyeInner = landmarks[133];    // Left eye inner corner
        const rightEyeInner = landmarks[362];   // Right eye inner corner
        const leftMouth = landmarks[61];        // Left mouth corner
        const rightMouth = landmarks[291];      // Right mouth corner
        const forehead = landmarks[10];         // Top of forehead

        // === FACE SCALE ===
        // Based on distance between eyes (more stable than single measurement)
        // This also indicates camera distance - larger = closer to camera
        const eyeDistance = Math.sqrt(
            Math.pow(rightEyeOuter.x - leftEyeOuter.x, 2) +
            Math.pow(rightEyeOuter.y - leftEyeOuter.y, 2) +
            Math.pow((rightEyeOuter.z || 0) - (leftEyeOuter.z || 0), 2)
        );
        const scale = eyeDistance * 10;

        // === FACE CENTER (position) ===
        // Use nose bridge as the center point
        // Z position derived from face scale (bigger face = closer to camera)
        // Baseline ~0.2 eye distance at normal viewing distance
        const baselineEyeDistance = 0.18;
        const zFromScale = (eyeDistance - baselineEyeDistance) * 10; // Positive = closer

        const faceCenter = {
            x: (noseBridge.x - 0.5) * 2,      // Convert 0-1 to -1 to 1
            y: -(noseBridge.y - 0.5) * 2,     // Invert Y and convert
            z: zFromScale                      // Z from face scale (closer = positive)
        };

        // === HEAD ROTATION ===

        // YAW (left-right head turn)
        // Calculate from the difference in Z depth between left and right side of face
        const leftZ = (leftEyeOuter.z + leftEyeInner.z + leftMouth.z) / 3;
        const rightZ = (rightEyeOuter.z + rightEyeInner.z + rightMouth.z) / 3;
        const zDiff = leftZ - rightZ;
        // Also use X position difference of nose relative to eye center
        const eyeCenterX = (leftEyeOuter.x + rightEyeOuter.x) / 2;
        const noseOffsetX = noseTip.x - eyeCenterX;
        // Combine both signals for more accurate yaw (INVERTED for correct direction)
        const yaw = -((zDiff * 4) + (noseOffsetX * 3));

        // PITCH (up-down head tilt)
        // Calculate from vertical relationship between forehead, nose, and chin
        const foreheadToNoseY = noseBridge.y - forehead.y;
        const noseToChinY = chin.y - noseBridge.y;
        const verticalRatio = foreheadToNoseY / (noseToChinY + 0.001);
        // Also use Z depth difference between nose tip and nose bridge
        const noseZDiff = (noseTip.z || 0) - (noseBridge.z || 0);
        // Combine signals (INVERTED for correct direction)
        const pitch = -(((verticalRatio - 0.8) * 2) + (noseZDiff * 5));

        // ROLL (head tilt - ear to shoulder)
        // Calculate from angle of line between eyes
        const rollAngle = Math.atan2(
            rightEyeOuter.y - leftEyeOuter.y,
            rightEyeOuter.x - leftEyeOuter.x
        );
        const roll = rollAngle;

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
