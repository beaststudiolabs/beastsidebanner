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

        // =====================================================
        // BASELINE VALUES - Tweak these to calibrate expressions
        // =====================================================
        // These represent the "neutral" eye height from MediaPipe
        // LOWER = eyes appear MORE OPEN at rest (less blink at neutral)
        // HIGHER = eyes appear MORE CLOSED at rest (more blink at neutral)
        this.baseline = {
            leftEyeHeight: 0.008,    // ← Lowered: eyes now appear more open at rest
            rightEyeHeight: 0.012,   // ← Lowered: eyes now appear more open at rest
            mouthHeight: 0.01,       // Closed mouth height
            mouthWidth: 0.15,        // Neutral mouth width
            faceHeight: 0.35         // Face height reference
        };

        // =====================================================
        // SENSITIVITY MULTIPLIERS - Tweak these for responsiveness
        // =====================================================
        this.sensitivity = {
            // Eye blink (1 = closed, 0 = open) - TUNE EACH EYE SEPARATELY
            eyeBlinkLeft: 0.8,       // Left eye blink sensitivity (↓ = less droopy)
            eyeBlinkRight: 0.8,      // Right eye blink sensitivity (↓ = less droopy)
            eyeWideLeft: 0.5,        // Left eye wide sensitivity (↑ = opens wider)
            eyeWideRight: 1.0,       // Right eye wide sensitivity (↑ = opens wider)

            // Brows
            browInnerUp: 25,         // Inner brow raise sensitivity (higher = more responsive)
            browOuterUp: 25,         // Outer brow raise sensitivity
            browDown: 20,            // Brow furrow/frown sensitivity

            // Mouth
            mouthSmile: 10,          // Smile corner elevation
            mouthFrown: 10,          // Frown corner depression
            mouthStretch: 3,         // Wide mouth stretch
            mouthPucker: 3,          // Lips pushed forward
            mouthShift: 20,          // Mouth left/right shift

            // Jaw
            jawOpen: 3,              // Jaw open multiplier (divides mouth height)
            jawShift: 20             // Jaw left/right shift
        };
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
     * Get fixed baseline values for neutral expression
     * Adjust these if expressions seem too sensitive or not sensitive enough
     */
    getFixedBaseline() {
        return {
            leftEyeHeight: 0.002,    // Eye open height (lower = eyes appear more open at rest)
            rightEyeHeight: 0.012,
            mouthHeight: 0.01,       // Typical closed mouth height
            mouthWidth: 0.15,        // Typical mouth width
            faceHeight: 0.35         // Typical face height
        };
    }

    /**
     * Calculate eye-related blendshapes
     */
    calculateEyeBlendshapes(landmarks) {
        // Use multiple landmarks for more accurate eye height measurement
        // Left eye: average of 3 vertical measurements for stability
        const leftEyeHeight = this.getAverageEyeHeight(landmarks,
            [160, 159, 158],  // Upper lid points (inner to outer)
            [144, 145, 153]   // Lower lid points (inner to outer)
        );

        // Right eye: use symmetric landmarks
        const rightEyeHeight = this.getAverageEyeHeight(landmarks,
            [385, 386, 387],  // Upper lid points (inner to outer)
            [373, 374, 380]   // Lower lid points (inner to outer)
        );

        // Ratio of current eye height to baseline
        const leftRatio = leftEyeHeight / this.baseline.leftEyeHeight;
        const rightRatio = rightEyeHeight / this.baseline.rightEyeHeight;

        // Eye blink: 1 = closed, 0 = open
        // When ratio < 1, eyes are more closed than baseline
        // Each eye has its own sensitivity for fine-tuning
        const eyeBlinkLeft = Math.max(0, (1 - leftRatio) * this.sensitivity.eyeBlinkLeft);
        const eyeBlinkRight = Math.max(0, (1 - rightRatio) * this.sensitivity.eyeBlinkRight);

        // Eye wide: 1 = wide open, 0 = normal
        // When ratio > 1, eyes are wider than baseline
        const eyeWideLeft = Math.max(0, (leftRatio - 1) * this.sensitivity.eyeWideLeft);
        const eyeWideRight = Math.max(0, (rightRatio - 1) * this.sensitivity.eyeWideRight);

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
        const jawOpen = Math.min(mouthHeight / (this.baseline.mouthHeight * this.sensitivity.jawOpen), 1);

        // Mouth smile: detect corner elevation
        const leftCorner = landmarks[61];
        const rightCorner = landmarks[291];
        const mouthCenter = landmarks[13];
        const noseBottom = landmarks[2];

        const leftElevation = mouthCenter.y - leftCorner.y;
        const rightElevation = mouthCenter.y - rightCorner.y;

        const mouthSmileLeft = this.clamp(leftElevation * this.sensitivity.mouthSmile, 0, 1);
        const mouthSmileRight = this.clamp(rightElevation * this.sensitivity.mouthSmile, 0, 1);

        // Mouth frown: opposite of smile
        const mouthFrownLeft = this.clamp(-leftElevation * this.sensitivity.mouthFrown, 0, 1);
        const mouthFrownRight = this.clamp(-rightElevation * this.sensitivity.mouthFrown, 0, 1);

        // Mouth width changes (stretch = wide mouth)
        const widthRatio = mouthWidth / this.baseline.mouthWidth;
        const mouthStretchLeft = this.clamp((widthRatio - 1) * this.sensitivity.mouthStretch, 0, 1);
        const mouthStretchRight = mouthStretchLeft;

        // Mouth pucker (lips pushed forward, mouth narrow)
        const mouthPucker = this.clamp((1 - widthRatio) * this.sensitivity.mouthPucker, 0, 1);

        // Mouth left/right shift
        const mouthCenterX = (leftCorner.x + rightCorner.x) / 2;
        const noseX = noseBottom.x;
        const mouthShift = (mouthCenterX - noseX) * this.sensitivity.mouthShift;
        const mouthLeft = this.clamp(-mouthShift, 0, 1);
        const mouthRight = this.clamp(mouthShift, 0, 1);

        return {
            jawOpen: this.clamp(jawOpen, 0, 1),
            mouthSmileLeft: mouthSmileLeft,
            mouthSmileRight: mouthSmileRight,
            mouthFrownLeft: mouthFrownLeft,
            mouthFrownRight: mouthFrownRight,
            mouthStretchLeft: mouthStretchLeft,
            mouthStretchRight: mouthStretchRight,
            mouthPucker: mouthPucker,
            mouthLeft: mouthLeft,
            mouthRight: mouthRight
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
            jawLeft: this.clamp(-jawOffset * this.sensitivity.jawShift, 0, 1),
            jawRight: this.clamp(jawOffset * this.sensitivity.jawShift, 0, 1),
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
        const noseBridge = landmarks[6];  // Use point between eyes
        const forehead = landmarks[10];

        // Calculate brow height relative to baseline
        // Brows raised = more distance from nose bridge to brow
        const browBaselineY = (forehead.y + noseBridge.y) / 2;

        // Inner brows (for surprise, worry)
        const innerLeftDist = browBaselineY - browInnerLeft.y;
        const innerRightDist = browBaselineY - browInnerRight.y;
        const innerUp = (innerLeftDist + innerRightDist) * this.sensitivity.browInnerUp;

        // Outer brows
        const outerLeftDist = browBaselineY - browOuterLeft.y;
        const outerRightDist = browBaselineY - browOuterRight.y;

        // Brow down (frown) - when brows are lower than baseline
        const browDownLeft = Math.max((browInnerLeft.y - browBaselineY) * this.sensitivity.browDown, 0);
        const browDownRight = Math.max((browInnerRight.y - browBaselineY) * this.sensitivity.browDown, 0);

        return {
            browInnerUp: this.clamp(innerUp, 0, 1),
            browOuterUpLeft: this.clamp(outerLeftDist * this.sensitivity.browOuterUp, 0, 1),
            browOuterUpRight: this.clamp(outerRightDist * this.sensitivity.browOuterUp, 0, 1),
            browDownLeft: this.clamp(browDownLeft, 0, 1),
            browDownRight: this.clamp(browDownRight, 0, 1)
        };
    }

    /**
     * Get average eye height from multiple upper/lower lid landmarks
     * This provides more stable measurements than single-point
     */
    getAverageEyeHeight(landmarks, upperIndices, lowerIndices) {
        let totalHeight = 0;
        const numPairs = Math.min(upperIndices.length, lowerIndices.length);

        for (let i = 0; i < numPairs; i++) {
            const upper = landmarks[upperIndices[i]];
            const lower = landmarks[lowerIndices[i]];
            totalHeight += Math.abs(upper.y - lower.y);
        }

        return totalHeight / numPairs;
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
     * Reset baseline to fixed values
     */
    resetBaseline() {
        this.baseline = this.getFixedBaseline();
    }
}

export default BlendshapeMapper;
