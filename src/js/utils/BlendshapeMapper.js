/**
 * BlendshapeMapper - Converts MediaPipe landmarks to ARKit blendshapes
 *
 * MediaPipe Face Mesh provides 468 3D landmarks.
 * This mapper calculates 52 ARKit-compatible blendshapes for character animation.
 *
 * Key blendshapes:
 * - Eye: eyeBlinkLeft, eyeBlinkRight, eyeWideLeft, eyeWideRight
 * - Jaw: jawOpen, jawLeft, jawRight, jawForward
 * - Mouth: mouthSmileLeft, mouthSmileRight, mouthFrownLeft, mouthFrownRight
 * - Brow: browInnerUp, browOuterUpLeft, browOuterUpRight
 */

class BlendshapeMapper {
    constructor() {
        // Landmark indices (MediaPipe Face Mesh standard)
        this.landmarks = {
            // Left eye
            leftEyeUpper: [159, 145, 158],
            leftEyeLower: [145, 133, 173],
            leftEyeLeft: 33,
            leftEyeRight: 133,

            // Right eye
            rightEyeUpper: [386, 374, 385],
            rightEyeLower: [374, 362, 398],
            rightEyeLeft: 362,
            rightEyeRight: 263,

            // Mouth
            mouthUpperInner: [13, 312, 311, 310, 415, 308, 324, 318, 14],
            mouthLowerInner: [13, 82, 81, 80, 191, 78, 95, 88, 14],
            mouthLeft: 61,
            mouthRight: 291,

            // Jaw
            jawBottom: 152,
            jawLeft: 234,
            jawRight: 454,

            // Eyebrows
            browInnerLeft: 107,
            browInnerRight: 336,
            browOuterLeft: 70,
            browOuterRight: 300,
            browMidLeft: 105,
            browMidRight: 334,

            // Nose
            noseTip: 1,
            noseBottom: 168
        };

        // Store baseline measurements (calculated on first frame)
        this.baseline = null;
    }

    /**
     * Calculate all blendshapes from face landmarks
     * @param {Array} landmarks - Array of 468 landmarks from MediaPipe
     * @returns {Object} Blendshape values (0-1 range)
     */
    calculateBlendshapes(landmarks) {
        if (!landmarks || landmarks.length < 468) {
            return this.getDefaultBlendshapes();
        }

        // Calculate baseline on first frame
        if (!this.baseline) {
            this.baseline = this.calculateBaseline(landmarks);
        }

        const blendshapes = {};

        // Eye blendshapes
        Object.assign(blendshapes, this.calculateEyeBlendshapes(landmarks));

        // Mouth blendshapes
        Object.assign(blendshapes, this.calculateMouthBlendshapes(landmarks));

        // Jaw blendshapes
        Object.assign(blendshapes, this.calculateJawBlendshapes(landmarks));

        // Brow blendshapes
        Object.assign(blendshapes, this.calculateBrowBlendshapes(landmarks));

        return blendshapes;
    }

    /**
     * Calculate baseline measurements from neutral face
     */
    calculateBaseline(landmarks) {
        return {
            leftEyeHeight: this.getVerticalDistance(landmarks, 159, 145),
            rightEyeHeight: this.getVerticalDistance(landmarks, 386, 374),
            mouthHeight: this.getVerticalDistance(landmarks, 13, 14),
            mouthWidth: this.getHorizontalDistance(landmarks, 61, 291),
            faceHeight: this.getVerticalDistance(landmarks, 10, 152)
        };
    }

    /**
     * Calculate eye-related blendshapes
     */
    calculateEyeBlendshapes(landmarks) {
        const leftEyeHeight = this.getVerticalDistance(landmarks, 159, 145);
        const rightEyeHeight = this.getVerticalDistance(landmarks, 386, 374);

        // Eye blink: 1 = closed, 0 = open
        const eyeBlinkLeft = 1 - Math.min(leftEyeHeight / this.baseline.leftEyeHeight, 1);
        const eyeBlinkRight = 1 - Math.min(rightEyeHeight / this.baseline.rightEyeHeight, 1);

        // Eye wide: 1 = wide open, 0 = normal
        const eyeWideLeft = Math.max((leftEyeHeight / this.baseline.leftEyeHeight) - 1, 0);
        const eyeWideRight = Math.max((rightEyeHeight / this.baseline.rightEyeHeight) - 1, 0);

        return {
            eyeBlinkLeft: this.clamp(eyeBlinkLeft, 0, 1),
            eyeBlinkRight: this.clamp(eyeBlinkRight, 0, 1),
            eyeWideLeft: this.clamp(eyeWideLeft, 0, 1),
            eyeWideRight: this.clamp(eyeWideRight, 0, 1),
            eyeLookUpLeft: 0, // TODO: Calculate from eye gaze
            eyeLookUpRight: 0,
            eyeLookDownLeft: 0,
            eyeLookDownRight: 0
        };
    }

    /**
     * Calculate mouth-related blendshapes
     */
    calculateMouthBlendshapes(landmarks) {
        const mouthHeight = this.getVerticalDistance(landmarks, 13, 14);
        const mouthWidth = this.getHorizontalDistance(landmarks, 61, 291);

        // Jaw open: 1 = fully open, 0 = closed
        const jawOpen = Math.min(mouthHeight / (this.baseline.mouthHeight * 3), 1);

        // Mouth smile: detect corner elevation
        const leftCorner = landmarks[61];
        const rightCorner = landmarks[291];
        const mouthCenter = landmarks[13];

        const leftElevation = mouthCenter.y - leftCorner.y;
        const rightElevation = mouthCenter.y - rightCorner.y;

        const mouthSmileLeft = this.clamp(leftElevation * 10, 0, 1);
        const mouthSmileRight = this.clamp(rightElevation * 10, 0, 1);

        // Mouth frown: opposite of smile
        const mouthFrownLeft = this.clamp(-leftElevation * 10, 0, 1);
        const mouthFrownRight = this.clamp(-rightElevation * 10, 0, 1);

        // Mouth width changes
        const mouthStretchLeft = this.clamp((mouthWidth / this.baseline.mouthWidth) - 1, 0, 1);
        const mouthStretchRight = mouthStretchLeft;

        return {
            jawOpen: this.clamp(jawOpen, 0, 1),
            mouthSmileLeft: mouthSmileLeft,
            mouthSmileRight: mouthSmileRight,
            mouthFrownLeft: mouthFrownLeft,
            mouthFrownRight: mouthFrownRight,
            mouthStretchLeft: mouthStretchLeft,
            mouthStretchRight: mouthStretchRight,
            mouthPucker: 0, // TODO: Calculate from lip distance
            mouthLeft: 0,
            mouthRight: 0
        };
    }

    /**
     * Calculate jaw-related blendshapes
     */
    calculateJawBlendshapes(landmarks) {
        // Jaw lateral movement
        const jawBottom = landmarks[152];
        const noseBottom = landmarks[168];

        const jawOffset = jawBottom.x - noseBottom.x;

        return {
            jawLeft: this.clamp(-jawOffset * 20, 0, 1),
            jawRight: this.clamp(jawOffset * 20, 0, 1),
            jawForward: 0 // TODO: Calculate from z-depth
        };
    }

    /**
     * Calculate brow-related blendshapes
     */
    calculateBrowBlendshapes(landmarks) {
        const browInnerLeft = landmarks[107];
        const browInnerRight = landmarks[336];
        const browOuterLeft = landmarks[70];
        const browOuterRight = landmarks[300];
        const noseBridge = landmarks[168];

        // Calculate vertical displacement from nose bridge
        const innerLeftUp = Math.max((noseBridge.y - browInnerLeft.y) * 5 - 0.5, 0);
        const innerRightUp = Math.max((noseBridge.y - browInnerRight.y) * 5 - 0.5, 0);
        const outerLeftUp = Math.max((noseBridge.y - browOuterLeft.y) * 5 - 0.5, 0);
        const outerRightUp = Math.max((noseBridge.y - browOuterRight.y) * 5 - 0.5, 0);

        return {
            browInnerUp: this.clamp((innerLeftUp + innerRightUp) / 2, 0, 1),
            browOuterUpLeft: this.clamp(outerLeftUp, 0, 1),
            browOuterUpRight: this.clamp(outerRightUp, 0, 1),
            browDownLeft: 0,
            browDownRight: 0
        };
    }

    /**
     * Get vertical distance between two landmarks
     */
    getVerticalDistance(landmarks, index1, index2) {
        const p1 = landmarks[index1];
        const p2 = landmarks[index2];
        return Math.abs(p1.y - p2.y);
    }

    /**
     * Get horizontal distance between two landmarks
     */
    getHorizontalDistance(landmarks, index1, index2) {
        const p1 = landmarks[index1];
        const p2 = landmarks[index2];
        return Math.abs(p1.x - p2.x);
    }

    /**
     * Clamp value between min and max
     */
    clamp(value, min, max) {
        return Math.min(Math.max(value, min), max);
    }

    /**
     * Get default blendshapes (neutral face)
     */
    getDefaultBlendshapes() {
        return {
            // Eyes
            eyeBlinkLeft: 0,
            eyeBlinkRight: 0,
            eyeWideLeft: 0,
            eyeWideRight: 0,
            eyeLookUpLeft: 0,
            eyeLookUpRight: 0,
            eyeLookDownLeft: 0,
            eyeLookDownRight: 0,

            // Mouth
            jawOpen: 0,
            mouthSmileLeft: 0,
            mouthSmileRight: 0,
            mouthFrownLeft: 0,
            mouthFrownRight: 0,
            mouthStretchLeft: 0,
            mouthStretchRight: 0,
            mouthPucker: 0,
            mouthLeft: 0,
            mouthRight: 0,

            // Jaw
            jawLeft: 0,
            jawRight: 0,
            jawForward: 0,

            // Brows
            browInnerUp: 0,
            browOuterUpLeft: 0,
            browOuterUpRight: 0,
            browDownLeft: 0,
            browDownRight: 0
        };
    }

    /**
     * Reset baseline (useful when switching users)
     */
    resetBaseline() {
        this.baseline = null;
    }
}

export default BlendshapeMapper;
