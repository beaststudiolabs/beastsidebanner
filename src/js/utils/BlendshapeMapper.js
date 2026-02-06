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
            eyeBlinkLeft: 1.5,       // Left eye blink sensitivity (needs >1.0 to reach full closure)
            eyeBlinkRight: 1.5,      // Right eye blink sensitivity (needs >1.0 to reach full closure)
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
            jawShift: 20,            // Jaw left/right shift

            // Cheeks / Nose
            cheekPuff: 12,           // Cheek puff from width change (higher = more sensitive)
            cheekPuffFromSmile: 0.7, // How much smile contributes to cheek puff (0-1)
            cheekPuffBaseline: 3.6,  // Resting cheek/nose width ratio (tune per face, higher = less puff at rest)
            cheekSquint: 15,         // Cheek squint sensitivity
            noseSneer: 15            // Nose sneer sensitivity
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

        // Extended blendshapes (cheek, nose, detailed mouth)
        Object.assign(blendshapes, this.calculateExtendedBlendshapes(landmarks, blendshapes));

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
     * Calculate extended blendshapes: cheeks, nose, detailed mouth, tongue
     * Uses existing blendshape values where they can be derived
     */
    calculateExtendedBlendshapes(landmarks, existing) {
        const noseBottom = landmarks[2];

        // --- Eye squint (driven by blink values + smile) ---
        const eyeSquintLeft = this.clamp(
            existing.eyeBlinkLeft * 0.5 + existing.mouthSmileLeft * 0.5, 0, 1
        );
        const eyeSquintRight = this.clamp(
            existing.eyeBlinkRight * 0.5 + existing.mouthSmileRight * 0.5, 0, 1
        );

        // --- Cheek squint (subtle, only from actual eye narrowing, not smile) ---
        // Measured from lower eyelid to cheek rising — not from smile to avoid
        // fighting with cheekPuff which also fires on smile
        const leftLowerLid = landmarks[145];
        const leftUpperCheek = landmarks[117];
        const rightLowerLid = landmarks[374];
        const rightUpperCheek = landmarks[346];
        const cheekSquintLeft = this.clamp(
            (leftLowerLid.y - leftUpperCheek.y) * this.sensitivity.cheekSquint, 0, 1
        );
        const cheekSquintRight = this.clamp(
            (rightLowerLid.y - rightUpperCheek.y) * this.sensitivity.cheekSquint, 0, 1
        );

        // --- Cheek puff (cheeks push outward — from air puffing OR smiling) ---
        // sensitivity.cheekPuffBaseline = resting cheek/nose ratio (tune this if puff triggers at rest)
        const leftCheek = landmarks[123];
        const rightCheek = landmarks[352];
        const noseLeft = landmarks[98];
        const noseRight = landmarks[327];
        const cheekWidth = Math.abs(leftCheek.x - rightCheek.x);
        const noseWidth = Math.abs(noseLeft.x - noseRight.x);
        const rawRatio = noseWidth > 0 ? cheekWidth / noseWidth : 0;
        const puffDelta = rawRatio - this.sensitivity.cheekPuffBaseline;
        const puffFromWidth = this.clamp(puffDelta * this.sensitivity.cheekPuff, 0, 1);
        const avgSmile = (existing.mouthSmileLeft + existing.mouthSmileRight) / 2;
        // Subtract brow influence — raised brows shift cheek landmarks and cause false puff
        const browCompensation = existing.browInnerUp;
        const cheekPuff = this.clamp(puffFromWidth + avgSmile * this.sensitivity.cheekPuffFromSmile - browCompensation, 0, 1);

        // --- Nose sneer (upper lip area lifts near nose) ---
        // Measure elevation of upper lip landmarks near nose relative to nose bottom
        const upperLipLeft = landmarks[39];
        const upperLipRight = landmarks[269];
        const noseSneerLeft = this.clamp((noseBottom.y - upperLipLeft.y) * this.sensitivity.noseSneer, 0, 1);
        const noseSneerRight = this.clamp((noseBottom.y - upperLipRight.y) * this.sensitivity.noseSneer, 0, 1);

        // --- Mouth funnel (lips in O shape: narrow + open) ---
        const mouthFunnel = this.clamp(
            existing.mouthPucker * 0.6 + existing.jawOpen * 0.4, 0, 1
        );

        // --- Mouth dimple (corner pulls inward, like a contained smile) ---
        const mouthDimpleLeft = this.clamp(existing.mouthSmileLeft * 0.4, 0, 1);
        const mouthDimpleRight = this.clamp(existing.mouthSmileRight * 0.4, 0, 1);

        // --- Upper lip raise (each side) ---
        // Distance from upper outer lip to upper inner lip
        const upperOuterCenter = landmarks[0];   // Upper lip outer center
        const upperInnerCenter = landmarks[13];   // Upper lip inner center
        const upperLipHeight = Math.abs(upperOuterCenter.y - upperInnerCenter.y);
        const upperLipUp = this.clamp((upperLipHeight - 0.005) * 30, 0, 1);

        const upperLipLeftPt = landmarks[40];
        const upperInnerLeft = landmarks[80];
        const mouthUpperUpLeft = this.clamp(
            Math.abs(upperLipLeftPt.y - upperInnerLeft.y) * 25, 0, 1
        );
        const upperLipRightPt = landmarks[270];
        const upperInnerRight = landmarks[310];
        const mouthUpperUpRight = this.clamp(
            Math.abs(upperLipRightPt.y - upperInnerRight.y) * 25, 0, 1
        );

        // --- Lower lip drop (each side) ---
        const lowerOuterCenter = landmarks[17];   // Lower lip outer center
        const lowerInnerCenter = landmarks[14];   // Lower lip inner center
        const lowerLipLeftPt = landmarks[91];
        const lowerInnerLeft = landmarks[88];
        const mouthLowerDownLeft = this.clamp(
            Math.abs(lowerLipLeftPt.y - lowerInnerLeft.y) * 25, 0, 1
        );
        const lowerLipRightPt = landmarks[321];
        const lowerInnerRightPt = landmarks[318];
        const mouthLowerDownRight = this.clamp(
            Math.abs(lowerLipRightPt.y - lowerInnerRightPt.y) * 25, 0, 1
        );

        // --- Lip roll (lips tuck inward, reducing visible lip height) ---
        const upperLipThickness = Math.abs(upperOuterCenter.y - upperInnerCenter.y);
        const lowerLipThickness = Math.abs(lowerOuterCenter.y - lowerInnerCenter.y);
        const mouthRollUpper = this.clamp((0.008 - upperLipThickness) * 80, 0, 1);
        const mouthRollLower = this.clamp((0.008 - lowerLipThickness) * 80, 0, 1);

        // --- Lip shrug (lip pushes up/down slightly) ---
        const mouthShrugUpper = this.clamp(upperLipUp * 0.6, 0, 1);
        const mouthShrugLower = this.clamp(existing.jawOpen * 0.3, 0, 1);

        // --- Lip press (lips compressed together, reduced height between them) ---
        const innerMouthHeight = Math.abs(upperInnerCenter.y - lowerInnerCenter.y);
        const mouthPress = this.clamp((0.005 - innerMouthHeight) * 100, 0, 1);
        const mouthPressLeft = this.clamp(mouthPress * 0.8, 0, 1);
        const mouthPressRight = this.clamp(mouthPress * 0.8, 0, 1);

        // --- Tongue out (approximate from jaw open + mouth shape) ---
        // Hard to detect from landmarks alone, approximate from wide open + specific shape
        const tongueOut = this.clamp(
            (existing.jawOpen > 0.6 ? (existing.jawOpen - 0.6) * 2 : 0) *
            (1 - existing.mouthPucker), 0, 1
        );

        return {
            eyeSquintLeft,
            eyeSquintRight,
            cheekSquintLeft,
            cheekSquintRight,
            cheekPuff,
            noseSneerLeft,
            noseSneerRight,
            mouthFunnel,
            mouthDimpleLeft,
            mouthDimpleRight,
            mouthUpperUpLeft,
            mouthUpperUpRight,
            mouthLowerDownLeft,
            mouthLowerDownRight,
            mouthRollUpper,
            mouthRollLower,
            mouthShrugUpper,
            mouthShrugLower,
            mouthPressLeft,
            mouthPressRight,
            tongueOut
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
            eyeSquintLeft: 0,
            eyeSquintRight: 0,

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
            mouthFunnel: 0,
            mouthDimpleLeft: 0,
            mouthDimpleRight: 0,
            mouthUpperUpLeft: 0,
            mouthUpperUpRight: 0,
            mouthLowerDownLeft: 0,
            mouthLowerDownRight: 0,
            mouthRollUpper: 0,
            mouthRollLower: 0,
            mouthShrugUpper: 0,
            mouthShrugLower: 0,
            mouthPressLeft: 0,
            mouthPressRight: 0,

            // Jaw
            jawLeft: 0,
            jawRight: 0,
            jawForward: 0,

            // Brows
            browInnerUp: 0,
            browOuterUpLeft: 0,
            browOuterUpRight: 0,
            browDownLeft: 0,
            browDownRight: 0,

            // Cheeks
            cheekPuff: 0,
            cheekSquintLeft: 0,
            cheekSquintRight: 0,

            // Nose
            noseSneerLeft: 0,
            noseSneerRight: 0,

            // Tongue
            tongueOut: 0
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
