/**
 * CharacterManager - Manages 3D character models
 *
 * Handles loading GLB character models, applying blendshapes to morph targets,
 * and character switching with lazy loading.
 */

import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import ThumbnailGenerator from '../utils/ThumbnailGenerator.js';

class CharacterManager {
    constructor(scene, eventEmitter, camera) {
        this.scene = scene;
        this.events = eventEmitter;
        this.camera = camera;
        this.loader = new GLTFLoader();

        // Thumbnail generator for character selector
        this.thumbnailGenerator = new ThumbnailGenerator();

        // Get base path for models (WordPress or local dev)
        this.modelsBasePath = this.getModelsBasePath();

        // Character configuration (paths are relative to modelsBasePath)
        this.characters = [
            { id: 'rafsby', name: 'Rafsby', path: '1.glb', loaded: false, thumbnail: null },
            // Other characters commented out for now:
            // { id: 'boy1', name: 'Boy #1', path: 'boy1.glb', loaded: false },
            // { id: 'girl1', name: 'Girl #1', path: 'girl1.glb', loaded: false },
            // { id: 'boy2', name: 'Boy #2', path: 'boy2.glb', loaded: false },
            // { id: 'girl2', name: 'Girl #2', path: 'girl2.glb', loaded: false },
            // { id: 'girl3', name: 'Girl #3', path: 'girl3.glb', loaded: false }
        ];

        this.currentCharacterIndex = 0;
        this.currentModel = null;
        this.morphTargetMeshes = []; // Meshes with morph targets

        // Loading state
        this.isLoading = false;
        this.loadingProgress = 0;

        // Blendshape name mapping (our names -> GLB model names)
        // Add mappings here if your GLB uses different naming conventions
        // Example: { 'eyeBlinkLeft': 'EyeBlink_L', 'jawOpen': 'Jaw_Open' }
        this.blendshapeNameMap = {
        };

        // Model adjustments (tweak these to fit your GLB)
        this.modelConfig = {
            // === SCALE ===
            // Scale is now normalized: 1.0 = face at reference distance
            scaleBase: 28.0,          // Base scale when face is at reference distance (scale=1.0)
            scaleMultiplier: 1.0,    // How much face distance affects scale
            scaleMin: 0.1,           // Minimum allowed scale
            scaleMax: 50.0,          // Maximum allowed scale (increase for bigger)
            scaleX: 1.0,             // Width scale multiplier (increase if too narrow)
            scaleY: 1.0,             // Height scale multiplier (increase if too short)
            scaleZ: 1.0,             // Depth scale multiplier

            // === POSITION ===
            positionScale: 2.0,      // Overall position sensitivity
            positionScaleX: 2.0,     // Horizontal movement multiplier
            positionScaleY: 2.0,     // Vertical movement multiplier
            positionScaleZ: 2.0,     // Depth movement multiplier (forward/backward)
            positionOffsetX: 0.0,    // Horizontal offset (positive = right)
            positionOffsetY: 0.0,    // Vertical offset (positive = up)
            positionOffsetZ: -10.0,    // Depth offset (positive = forward)
            mirrorX: true,           // Mirror X axis for selfie-camera

            // === ROTATION ===
            baseRotationX: -0.8,        // Base X rotation in radians (tilt forward/back on load)
            baseRotationY: Math.PI,  // Base Y rotation in radians (180° = face camera)
            baseRotationZ: 0,        // Base Z rotation in radians (tilt sideways on load)
            rotationScale: 1.0,      // Overall rotation sensitivity
            pitchScale: 1.0,         // Up/down head tilt multiplier
            yawScale: 8.0,          // Left/right head turn multiplier (high for full range of motion)
            rollScale: -1.2,         // Head tilt (ear to shoulder) multiplier (negative = mirror for selfie)
            pitchOffset: 0.0,        // Pitch offset in radians
            yawOffset: 0.0,          // Yaw offset in radians
            rollOffset: 0.0,         // Roll offset in radians

            // === SMOOTHING ===
            // Higher values = smoother but more lag (0-0.95 range)
            smoothing: 0.7,          // Overall smoothing (0 = none, higher = smoother but laggy)
            positionSmoothing: 0.5,  // Position-specific smoothing
            rotationSmoothing: 0.7,  // Rotation-specific smoothing
            scaleSmoothing: 0.9,     // Scale-specific smoothing
            blendshapeSmoothing: 0.9, // Blendshape/expression smoothing (higher = less jitter)
            eyeSmoothing: 0.6,       // Lower = faster blink response (was 0.9, too laggy for blinks)

            // === DEADZONES (ignore small movements to reduce jitter) ===
            // Higher values = less jitter but less responsive to small movements
            positionDeadzone: 0.01,  // Ignore position changes smaller than this
            rotationDeadzone: 0.1,  // Ignore rotation changes smaller than this
            blendshapeDeadzone: 0.1, // Ignore blendshape changes smaller than this
            eyeDeadzone: 0.04       // Lowered so blinks can reach full closure (was 0.1)
        };

        // Smoothed transform values (for lerping to reduce jitter)
        this.smoothedTransform = {
            position: { x: 0, y: 0, z: 0 },
            rotation: { pitch: 0, yaw: 0, roll: 0 },
            scale: 1
        };

        // Smoothed blendshape values (for lerping facial expressions)
        this.smoothedBlendshapes = {};

        // Hide model until first tracking frame so it doesn't flash at center
        this.firstTrackingFrame = true;
        this.modelVisible = false;

        // Skin color customization
        this.skinMaterials = [];
        this.currentSkinColor = null;

        // Predefined skin tone palette
        this.skinTones = [
            { name: 'Light', color: '#FFE0BD' },
            { name: 'Fair', color: '#FFCD94' },
            { name: 'Medium', color: '#EAC086' },
            { name: 'Olive', color: '#C68642' },
            { name: 'Tan', color: '#8D5524' },
            { name: 'Brown', color: '#6B4423' },
            { name: 'Dark', color: '#3C241A' },
            { name: 'Deep', color: '#2C1810' }
        ];
    }

    /**
     * Get base path for model files
     * Uses WordPress config if available, otherwise uses relative path for local dev
     */
    getModelsBasePath() {
        // Check for WordPress configuration
        if (typeof window !== 'undefined' && window.beastsideFiltersConfig && window.beastsideFiltersConfig.modelsPath) {
            console.log('CharacterManager: Using WordPress models path:', window.beastsideFiltersConfig.modelsPath);
            return window.beastsideFiltersConfig.modelsPath;
        }
        // Local development fallback
        console.log('CharacterManager: Using local development path');
        return '/assets/models/';
    }

    /**
     * Get full path for a model file
     */
    getModelPath(relativePath) {
        return this.modelsBasePath + relativePath;
    }

    /**
     * Linear interpolation helper
     */
    lerp(current, target, factor) {
        return current + (target - current) * (1 - factor);
    }

    /**
     * Apply deadzone - ignore changes smaller than threshold
     */
    applyDeadzone(current, target, deadzone) {
        const diff = Math.abs(target - current);
        if (diff < deadzone) {
            return current; // No change if within deadzone
        }
        return target;
    }

    /**
     * Initialize and preload first character
     */
    async initialize() {
        console.log('CharacterManager: Initializing...');

        try {
            // Attempt to preload first character
            await this.loadCharacter(0);

            // Set up event listeners
            this.setupEventListeners();

            // Generate thumbnails for character selector (non-blocking)
            this.generateAllThumbnails();

            console.log('CharacterManager: Initialized');
        } catch (error) {
            console.error('CharacterManager: Initialization failed, falling back to placeholder', error);
            this.createPlaceholderCharacter();
        }
    }

    /**
     * Generate thumbnails for all characters (for the character selector)
     * Runs in background, emits event when each thumbnail is ready
     */
    async generateAllThumbnails() {
        console.log('CharacterManager: Generating thumbnails...');

        for (let i = 0; i < this.characters.length; i++) {
            const character = this.characters[i];

            // Skip if thumbnail already generated
            if (character.thumbnail) continue;

            try {
                const fullPath = this.getModelPath(character.path);
                const thumbnail = await this.thumbnailGenerator.generateThumbnail(fullPath);
                if (thumbnail) {
                    character.thumbnail = thumbnail;
                    this.events.emit('thumbnailGenerated', { index: i, character, thumbnail });
                    console.log(`CharacterManager: Thumbnail ready for ${character.name}`);
                }
            } catch (error) {
                console.warn(`CharacterManager: Failed to generate thumbnail for ${character.name}`, error);
            }
        }

        this.events.emit('allThumbnailsGenerated', { characters: this.characters });
        console.log('CharacterManager: All thumbnails generated');
    }

    /**
     * Get thumbnail for a specific character by index
     */
    getThumbnail(index) {
        if (index >= 0 && index < this.characters.length) {
            return this.characters[index].thumbnail;
        }
        return null;
    }

    /**
     * Create placeholder character (until real models available)
     * This is a more complex placeholder than just a cube - a simple head shape
     */
    createPlaceholderCharacter() {
        console.log('CharacterManager: Creating placeholder character...');

        // Create a simple head shape using multiple primitives
        const headGroup = new THREE.Group();
        headGroup.name = 'PlaceholderCharacter';

        // Head (sphere)
        const headGeometry = new THREE.SphereGeometry(0.5, 32, 32);
        const headMaterial = new THREE.MeshStandardMaterial({
            color: 0xffdbac, // Skin tone
            roughness: 0.7,
            metalness: 0.1
        });
        const head = new THREE.Mesh(headGeometry, headMaterial);
        headGroup.add(head);

        // Left eye
        const eyeGeometry = new THREE.SphereGeometry(0.08, 16, 16);
        const eyeMaterial = new THREE.MeshStandardMaterial({ color: 0x000000 });

        const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
        leftEye.position.set(-0.15, 0.1, 0.4);
        headGroup.add(leftEye);

        // Right eye
        const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial.clone());
        rightEye.position.set(0.15, 0.1, 0.4);
        headGroup.add(rightEye);

        // Mouth (torus for simple smile)
        const mouthGeometry = new THREE.TorusGeometry(0.15, 0.03, 16, 32, Math.PI);
        const mouthMaterial = new THREE.MeshStandardMaterial({ color: 0x8b0000 });
        const mouth = new THREE.Mesh(mouthGeometry, mouthMaterial);
        mouth.position.set(0, -0.15, 0.4);
        mouth.rotation.x = Math.PI;
        headGroup.add(mouth);

        // Store references for animation
        this.placeholderParts = {
            head,
            leftEye,
            rightEye,
            mouth
        };

        this.currentModel = headGroup;
        this.scene.add(headGroup);

        console.log('CharacterManager: Placeholder character created');
    }

    /**
     * Load a character model by index
     */
    async loadCharacter(index) {
        if (index < 0 || index >= this.characters.length) {
            throw new Error(`Invalid character index: ${index}`);
        }

        const character = this.characters[index];

        if (character.loaded && character.model) {
            // Already loaded, just switch to it
            this.switchToCharacter(index);
            return;
        }

        console.log(`CharacterManager: Loading ${character.name}...`);
        this.isLoading = true;
        this.loadingProgress = 0;

        try {
            const fullPath = this.getModelPath(character.path);
            const gltf = await this.loadGLTF(fullPath);

            // Store the loaded model
            character.model = gltf.scene;
            character.loaded = true;

            // Find meshes with morph targets
            this.findMorphTargetMeshes(gltf.scene);

            // Validate morph targets
            this.validateMorphTargets();

            // Add to scene and switch to it
            this.switchToCharacter(index);

            console.log(`CharacterManager: ${character.name} loaded successfully`);
            this.events.emit('characterLoaded', { index, character });

        } catch (error) {
            console.error(`CharacterManager: Failed to load ${character.name}`, error);
            throw error;
        } finally {
            this.isLoading = false;
            this.loadingProgress = 100;
        }
    }

    /**
     * Load GLB file with progress tracking
     */
    loadGLTF(path) {
        return new Promise((resolve, reject) => {
            this.loader.load(
                path,
                (gltf) => resolve(gltf),
                (progress) => {
                    if (progress.lengthComputable) {
                        this.loadingProgress = (progress.loaded / progress.total) * 100;
                        console.log(`Loading: ${this.loadingProgress.toFixed(0)}%`);
                    }
                },
                (error) => reject(error)
            );
        });
    }

    /**
     * Find all meshes with morph targets in the loaded model
     * Also enables shadows on all meshes
     */
    findMorphTargetMeshes(object) {
        this.morphTargetMeshes = [];

        object.traverse((child) => {
            // Enable shadows on all meshes for realistic lighting
            if (child.isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;
            }

            if (child.isMesh && child.morphTargetDictionary && child.morphTargetInfluences) {
                this.morphTargetMeshes.push(child);
                console.log(`Found morph target mesh: ${child.name}`,
                    Object.keys(child.morphTargetDictionary));
            }
        });

        console.log(`CharacterManager: Found ${this.morphTargetMeshes.length} meshes with morph targets`);

        // Also find skin materials for color customization
        this.findSkinMaterials(object);
    }

    /**
     * Find all materials that appear to be skin
     * Looks for meshes with names containing 'skin', 'body', 'face', 'head', etc.
     */
    findSkinMaterials(object) {
        this.skinMaterials = [];
        const skinKeywords = ['skin', 'body', 'face', 'head', 'arm', 'hand', 'leg', 'neck', 'torso', 'flesh'];

        object.traverse((child) => {
            if (child.isMesh && child.material) {
                const meshName = (child.name || '').toLowerCase();
                const materialName = (child.material.name || '').toLowerCase();

                // Check if mesh or material name contains skin-related keywords
                const isSkin = skinKeywords.some(keyword =>
                    meshName.includes(keyword) || materialName.includes(keyword)
                );

                if (isSkin) {
                    // Handle both single materials and material arrays
                    const materials = Array.isArray(child.material) ? child.material : [child.material];

                    materials.forEach(mat => {
                        if (mat && !this.skinMaterials.includes(mat)) {
                            this.skinMaterials.push(mat);
                            // Store original color for potential reset
                            mat.userData.originalColor = mat.color ? mat.color.clone() : null;
                            console.log(`CharacterManager: Found skin material: ${mat.name || 'unnamed'} on mesh: ${child.name}`);
                        }
                    });
                }
            }
        });

        // If no skin materials found by name, try to detect by color (common skin tones)
        if (this.skinMaterials.length === 0) {
            console.log('CharacterManager: No skin materials found by name, detecting by color...');
            this.findSkinMaterialsByColor(object);
        }

        console.log(`CharacterManager: Found ${this.skinMaterials.length} skin materials`);
    }

    /**
     * Fallback: Find skin materials by detecting skin-tone colors
     */
    findSkinMaterialsByColor(object) {
        object.traverse((child) => {
            if (child.isMesh && child.material) {
                const materials = Array.isArray(child.material) ? child.material : [child.material];

                materials.forEach(mat => {
                    if (mat && mat.color && !this.skinMaterials.includes(mat)) {
                        // Check if color is in skin-tone range (rough heuristic)
                        const r = mat.color.r;
                        const g = mat.color.g;
                        const b = mat.color.b;

                        // Skin tones typically have: R > G > B, with R being dominant
                        const isSkinTone = (
                            r > 0.5 && r > g && g > b &&
                            (r - b) > 0.1 && // Has warm undertone
                            g > 0.3 // Not too dark
                        );

                        if (isSkinTone) {
                            this.skinMaterials.push(mat);
                            mat.userData.originalColor = mat.color.clone();
                            console.log(`CharacterManager: Detected skin material by color: ${mat.name || 'unnamed'} on mesh: ${child.name}`);
                        }
                    }
                });
            }
        });
    }

    /**
     * Set skin color for the current character
     * @param {string} hexColor - Hex color code (e.g., '#FFE0BD')
     */
    setSkinColor(hexColor) {
        if (this.skinMaterials.length === 0) {
            console.warn('CharacterManager: No skin materials available to change');
            return false;
        }

        const color = new THREE.Color(hexColor);
        this.currentSkinColor = hexColor;

        this.skinMaterials.forEach(mat => {
            if (mat.color) {
                mat.color.copy(color);
                mat.needsUpdate = true;
            }
        });

        console.log(`CharacterManager: Skin color changed to ${hexColor}`);
        this.events.emit('skinColorChanged', { color: hexColor });
        return true;
    }

    /**
     * Reset skin color to original
     */
    resetSkinColor() {
        this.skinMaterials.forEach(mat => {
            if (mat.userData.originalColor && mat.color) {
                mat.color.copy(mat.userData.originalColor);
                mat.needsUpdate = true;
            }
        });

        this.currentSkinColor = null;
        console.log('CharacterManager: Skin color reset to original');
        this.events.emit('skinColorChanged', { color: null });
    }

    /**
     * Get available skin tones
     */
    getSkinTones() {
        return this.skinTones;
    }

    /**
     * Get current skin color
     */
    getCurrentSkinColor() {
        return this.currentSkinColor;
    }

    /**
     * Validate that character has required morph targets
     */
    validateMorphTargets() {
        if (this.morphTargetMeshes.length === 0) {
            console.warn('CharacterManager: No morph targets found - expressions will not work');
            return false;
        }

        // Check for common ARKit blendshapes
        const requiredShapes = ['eyeBlinkLeft', 'eyeBlinkRight', 'jawOpen', 'mouthSmileLeft'];
        const firstMesh = this.morphTargetMeshes[0];
        const availableShapes = Object.keys(firstMesh.morphTargetDictionary);

        // Log ALL available morph targets for debugging
        console.log('=== GLB MODEL MORPH TARGETS ===');
        console.log('Available morph targets in model:', availableShapes);
        console.log('Total count:', availableShapes.length);
        console.log('================================');

        const missingShapes = requiredShapes.filter(shape => !availableShapes.includes(shape));

        if (missingShapes.length > 0) {
            console.warn('CharacterManager: Missing some required morph targets:', missingShapes);
        }

        // Store available shapes for mapping
        this.availableMorphTargets = availableShapes;

        return missingShapes.length === 0;
    }

    /**
     * Switch to a different character
     */
    switchToCharacter(index) {
        // Remove current model from scene
        if (this.currentModel) {
            this.scene.remove(this.currentModel);
        }

        // Store current skin color to re-apply after switch
        const previousSkinColor = this.currentSkinColor;

        // Add new model to scene
        const character = this.characters[index];
        this.currentModel = character.model;
        this.currentCharacterIndex = index;

        if (this.currentModel) {
            // Apply base rotation so model faces camera
            this.currentModel.rotation.y = this.modelConfig.baseRotationY;

            // Hide until first tracking frame so it doesn't flash at center
            this.currentModel.visible = false;
            this.modelVisible = false;
            this.firstTrackingFrame = true;

            this.scene.add(this.currentModel);

            // Re-find skin materials for the new character
            this.findSkinMaterials(this.currentModel);

            // Re-apply previous skin color if one was set
            if (previousSkinColor) {
                this.setSkinColor(previousSkinColor);
            }

            console.log(`CharacterManager: Switched to ${character.name}`);
        }
    }

    /**
     * Set up event listeners
     */
    setupEventListeners() {
        // Listen for face tracking updates
        this.events.on('faceTracked', (data) => {
            this.updateCharacter(data.blendshapes, data.transform);
        });
    }

    /**
     * Update character with blendshapes and transform
     */
    updateCharacter(blendshapes, transform) {
        if (!this.currentModel) return;

        // Update position and rotation
        this.updateTransform(transform);

        // Update morph targets (expressions)
        this.updateMorphTargets(blendshapes);
    }

    /**
     * Update character position and rotation
     */
    updateTransform(transform) {
        if (!this.currentModel || !transform) return;

        const { position, rotation, scale } = transform;
        const cfg = this.modelConfig;

        // === CALCULATE TARGET POSITION ===
        // Compute visible area at model's Z depth for correct screen-space mapping
        const modelZ = cfg.positionOffsetZ + (position.z * cfg.positionScale * cfg.positionScaleZ);
        const cameraZ = this.camera ? this.camera.position.z : 3;
        const distance = Math.abs(cameraZ - modelZ);
        const fov = this.camera ? this.camera.fov : 50;
        const halfHeight = distance * Math.tan((fov / 2) * Math.PI / 180);
        const aspect = this.camera ? this.camera.aspect : 1;
        const halfWidth = halfHeight * aspect;

        // Map face NDC position (-1 to 1) directly to world position at model depth
        // Mirror X position if needed (selfie camera is mirrored)
        const rawX = cfg.mirrorX ? -position.x : position.x;
        const targetX = (rawX * halfWidth) + cfg.positionOffsetX;
        const targetY = (position.y * halfHeight) + cfg.positionOffsetY;
        const targetZ = modelZ;

        // === CALCULATE TARGET ROTATION ===
        // Mirror yaw if X is mirrored
        const rawYaw = cfg.mirrorX ? -rotation.yaw : rotation.yaw;
        const targetPitch = (rotation.pitch * cfg.rotationScale * cfg.pitchScale) + cfg.pitchOffset;
        const targetYaw = (rawYaw * cfg.rotationScale * cfg.yawScale) + cfg.yawOffset;
        const targetRoll = (rotation.roll * cfg.rotationScale * cfg.rollScale) + cfg.rollOffset;

        // === CALCULATE TARGET SCALE ===
        // Scale is now purely based on face distance, no viewport dependency
        const baseScale = cfg.scaleBase + (scale * cfg.scaleMultiplier);
        const minScale = cfg.scaleMin || 0.1;
        const maxScale = cfg.scaleMax || 50.0;
        const targetScaleVal = Math.max(minScale, Math.min(baseScale, maxScale));

        // === APPLY DEADZONES (ignore tiny movements) ===
        const posDead = cfg.positionDeadzone || 0.01;
        const rotDead = cfg.rotationDeadzone || 0.02;

        const finalTargetX = this.applyDeadzone(this.smoothedTransform.position.x, targetX, posDead);
        const finalTargetY = this.applyDeadzone(this.smoothedTransform.position.y, targetY, posDead);
        const finalTargetZ = this.applyDeadzone(this.smoothedTransform.position.z, targetZ, posDead);

        const finalTargetPitch = this.applyDeadzone(this.smoothedTransform.rotation.pitch, targetPitch, rotDead);
        const finalTargetYaw = this.applyDeadzone(this.smoothedTransform.rotation.yaw, targetYaw, rotDead);
        const finalTargetRoll = this.applyDeadzone(this.smoothedTransform.rotation.roll, targetRoll, rotDead);

        // === APPLY SMOOTHING (lerp toward target values) ===
        // On first frame, snap directly to face position (no lerp from center)
        if (this.firstTrackingFrame) {
            this.firstTrackingFrame = false;
            this.smoothedTransform.position.x = finalTargetX;
            this.smoothedTransform.position.y = finalTargetY;
            this.smoothedTransform.position.z = finalTargetZ;
            this.smoothedTransform.rotation.pitch = finalTargetPitch;
            this.smoothedTransform.rotation.yaw = finalTargetYaw;
            this.smoothedTransform.rotation.roll = finalTargetRoll;
            this.smoothedTransform.scale = targetScaleVal;

            // Now show the model — it's at the correct face position
            if (this.currentModel && !this.modelVisible) {
                this.currentModel.visible = true;
                this.modelVisible = true;
            }
        } else {
            const posSmooth = cfg.positionSmoothing;
            const rotSmooth = cfg.rotationSmoothing;
            const scaleSmooth = cfg.scaleSmoothing;

            this.smoothedTransform.position.x = this.lerp(this.smoothedTransform.position.x, finalTargetX, posSmooth);
            this.smoothedTransform.position.y = this.lerp(this.smoothedTransform.position.y, finalTargetY, posSmooth);
            this.smoothedTransform.position.z = this.lerp(this.smoothedTransform.position.z, finalTargetZ, posSmooth);

            this.smoothedTransform.rotation.pitch = this.lerp(this.smoothedTransform.rotation.pitch, finalTargetPitch, rotSmooth);
            this.smoothedTransform.rotation.yaw = this.lerp(this.smoothedTransform.rotation.yaw, finalTargetYaw, rotSmooth);
            this.smoothedTransform.rotation.roll = this.lerp(this.smoothedTransform.rotation.roll, finalTargetRoll, rotSmooth);

            this.smoothedTransform.scale = this.lerp(this.smoothedTransform.scale, targetScaleVal, scaleSmooth);
        }

        // === APPLY POSITION ===
        this.currentModel.position.set(
            this.smoothedTransform.position.x,
            this.smoothedTransform.position.y,
            this.smoothedTransform.position.z
        );

        // === APPLY ROTATION ===
        // Set rotation order for proper head rotation (Yaw first, then Pitch, then Roll)
        this.currentModel.rotation.order = 'YXZ';
        this.currentModel.rotation.set(
            cfg.baseRotationX + this.smoothedTransform.rotation.pitch,
            cfg.baseRotationY + this.smoothedTransform.rotation.yaw,
            cfg.baseRotationZ + this.smoothedTransform.rotation.roll
        );

        // === APPLY SCALE (with separate X/Y/Z multipliers) ===
        const s = this.smoothedTransform.scale;
        this.currentModel.scale.set(
            s * cfg.scaleX,
            s * cfg.scaleY,
            s * cfg.scaleZ
        );
    }

    /**
     * Update morph targets (character expressions) with smoothing and deadzones
     */
    updateMorphTargets(blendshapes) {
        if (!blendshapes) return;

        // If using placeholder character, animate it differently
        if (this.currentModel.name === 'PlaceholderCharacter') {
            this.animatePlaceholder(blendshapes);
            return;
        }

        // One-time debug: log what we're sending vs what the model has
        if (!this._blendshapeDebugLogged) {
            this._blendshapeDebugLogged = true;
            const sending = Object.keys(blendshapes);
            console.log('=== BLENDSHAPE MAPPING DEBUG ===');
            console.log('BlendshapeMapper is sending:', sending);

            if (this.morphTargetMeshes.length > 0) {
                const modelHas = Object.keys(this.morphTargetMeshes[0].morphTargetDictionary);

                // Find matches
                const matches = sending.filter(s => modelHas.includes(s));
                const notInModel = sending.filter(s => !modelHas.includes(s));
                const notBeingSent = modelHas.filter(m => !sending.includes(m));

                console.log('✓ MATCHED (will animate):', matches);
                console.log('✗ SENDING but NOT in model:', notInModel);
                console.log('⚠ IN MODEL but NOT sending:', notBeingSent);
            }
            console.log('================================');
        }

        const defaultSmooth = this.modelConfig.blendshapeSmoothing;
        const eyeSmooth = this.modelConfig.eyeSmoothing || defaultSmooth;
        const defaultDeadzone = this.modelConfig.blendshapeDeadzone || 0.03;
        const eyeDeadzone = this.modelConfig.eyeDeadzone || 0.06;

        // Apply blendshapes to morph target meshes with smoothing
        this.morphTargetMeshes.forEach(mesh => {
            const morphDict = mesh.morphTargetDictionary;
            const influences = mesh.morphTargetInfluences;

            // Map each blendshape to morph target
            Object.keys(blendshapes).forEach(shapeName => {
                const targetValue = blendshapes[shapeName];

                // Check for mapped name first, then fall back to original name
                const mappedName = this.blendshapeNameMap[shapeName] || shapeName;
                const morphIndex = morphDict[mappedName];

                if (morphIndex !== undefined && influences[morphIndex] !== undefined) {
                    // Use eye-specific settings for eye blendshapes
                    const isEyeBlendshape = shapeName.toLowerCase().includes('eye') ||
                                            shapeName.toLowerCase().includes('blink');
                    const smoothFactor = isEyeBlendshape ? eyeSmooth : defaultSmooth;
                    const deadzone = isEyeBlendshape ? eyeDeadzone : defaultDeadzone;

                    // Initialize smoothed value if not exists
                    if (this.smoothedBlendshapes[shapeName] === undefined) {
                        this.smoothedBlendshapes[shapeName] = 0;
                    }

                    // Apply deadzone - ignore tiny changes
                    const currentValue = this.smoothedBlendshapes[shapeName];
                    const finalTarget = this.applyDeadzone(currentValue, targetValue, deadzone);

                    // Lerp toward target value for smooth transitions
                    this.smoothedBlendshapes[shapeName] = this.lerp(
                        currentValue,
                        finalTarget,
                        smoothFactor
                    );

                    // Apply smoothed blendshape value (0-1 range)
                    influences[morphIndex] = this.smoothedBlendshapes[shapeName];
                }
            });
        });
    }

    /**
     * Animate placeholder character based on blendshapes
     */
    animatePlaceholder(blendshapes) {
        if (!this.placeholderParts) return;

        const { leftEye, rightEye, mouth } = this.placeholderParts;

        // Animate eyes (blink)
        const leftBlink = blendshapes.eyeBlinkLeft || 0;
        const rightBlink = blendshapes.eyeBlinkRight || 0;

        leftEye.scale.y = 1 - leftBlink * 0.8;
        rightEye.scale.y = 1 - rightBlink * 0.8;

        // Animate mouth (smile and jaw open)
        const smile = (blendshapes.mouthSmileLeft + blendshapes.mouthSmileRight) / 2 || 0;
        const jawOpen = blendshapes.jawOpen || 0;

        mouth.scale.set(1 + smile * 0.5, 1 + jawOpen * 2, 1);
        mouth.position.y = -0.15 + smile * 0.05 - jawOpen * 0.1;
    }

    /**
     * Preload all characters in background
     */
    async preloadAllCharacters() {
        console.log('CharacterManager: Preloading all characters...');

        for (let i = 0; i < this.characters.length; i++) {
            if (!this.characters[i].loaded) {
                try {
                    await this.loadCharacter(i);
                } catch (error) {
                    console.error(`Failed to preload character ${i}:`, error);
                }
            }
        }

        console.log('CharacterManager: All characters preloaded');
    }

    /**
     * Get current character info
     */
    getCurrentCharacter() {
        return this.characters[this.currentCharacterIndex];
    }

    /**
     * Get all characters info
     */
    getAllCharacters() {
        return this.characters;
    }

    /**
     * Switch to next character
     */
    async nextCharacter() {
        const nextIndex = (this.currentCharacterIndex + 1) % this.characters.length;
        await this.switchToCharacterByIndex(nextIndex);
    }

    /**
     * Switch to previous character
     */
    async previousCharacter() {
        const prevIndex = (this.currentCharacterIndex - 1 + this.characters.length) % this.characters.length;
        await this.switchToCharacterByIndex(prevIndex);
    }

    /**
     * Switch to character by index (with loading if needed)
     */
    async switchToCharacterByIndex(index) {
        if (index < 0 || index >= this.characters.length) {
            console.warn(`CharacterManager: Invalid character index ${index}`);
            return;
        }

        if (index === this.currentCharacterIndex) {
            console.log('CharacterManager: Already on this character');
            return;
        }

        console.log(`CharacterManager: Switching to character ${index}...`);
        this.events.emit('characterSwitching', { from: this.currentCharacterIndex, to: index });

        try {
            // Load character if not already loaded
            if (!this.characters[index].loaded) {
                await this.loadCharacter(index);
            } else {
                // Just switch to it
                this.switchToCharacter(index);
            }

            this.events.emit('characterSwitched', { index, character: this.characters[index] });
            console.log(`CharacterManager: Switched to ${this.characters[index].name}`);
        } catch (error) {
            console.error('CharacterManager: Failed to switch character', error);
            this.events.emit('characterSwitchError', { index, error });
        }
    }

    /**
     * Dispose of all resources
     */
    dispose() {
        // Remove current model from scene
        if (this.currentModel) {
            this.scene.remove(this.currentModel);
        }

        // Dispose of loaded models
        this.characters.forEach(character => {
            if (character.model) {
                character.model.traverse((child) => {
                    if (child.isMesh) {
                        child.geometry.dispose();
                        if (child.material.dispose) {
                            child.material.dispose();
                        }
                    }
                });
            }
        });

        // Dispose of thumbnail generator
        if (this.thumbnailGenerator) {
            this.thumbnailGenerator.dispose();
        }

        console.log('CharacterManager: Disposed');
    }
}

export default CharacterManager;
