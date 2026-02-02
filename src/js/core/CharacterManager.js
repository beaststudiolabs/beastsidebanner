/**
 * CharacterManager - Manages 3D character models
 *
 * Handles loading GLB character models, applying blendshapes to morph targets,
 * and character switching with lazy loading.
 */

import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

class CharacterManager {
    constructor(scene, eventEmitter) {
        this.scene = scene;
        this.events = eventEmitter;
        this.loader = new GLTFLoader();

        // Character configuration
        this.characters = [
            { id: 'boy1', name: 'Boy #1', path: '/assets/models/boy1.glb', loaded: false },
            { id: 'girl1', name: 'Girl #1', path: '/assets/models/girl1.glb', loaded: false },
            { id: 'boy2', name: 'Boy #2', path: '/assets/models/boy2.glb', loaded: false },
            { id: 'girl2', name: 'Girl #2', path: '/assets/models/girl2.glb', loaded: false },
            { id: 'girl3', name: 'Girl #3', path: '/assets/models/girl3.glb', loaded: false }
        ];

        this.currentCharacterIndex = 0;
        this.currentModel = null;
        this.morphTargetMeshes = []; // Meshes with morph targets

        // Loading state
        this.isLoading = false;
        this.loadingProgress = 0;
    }

    /**
     * Initialize and preload first character
     */
    async initialize() {
        console.log('CharacterManager: Initializing...');

        try {
            // Create placeholder character for now (until real models available)
            this.createPlaceholderCharacter();

            // Attempt to preload first character
            // await this.loadCharacter(0);

            // Set up event listeners
            this.setupEventListeners();

            console.log('CharacterManager: Initialized');
        } catch (error) {
            console.error('CharacterManager: Initialization failed', error);
            // Fall back to placeholder
            this.createPlaceholderCharacter();
        }
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
            const gltf = await this.loadGLTF(character.path);

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
     */
    findMorphTargetMeshes(object) {
        this.morphTargetMeshes = [];

        object.traverse((child) => {
            if (child.isMesh && child.morphTargetDictionary && child.morphTargetInfluences) {
                this.morphTargetMeshes.push(child);
                console.log(`Found morph target mesh: ${child.name}`,
                    Object.keys(child.morphTargetDictionary));
            }
        });

        console.log(`CharacterManager: Found ${this.morphTargetMeshes.length} meshes with morph targets`);
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

        const missingShapes = requiredShapes.filter(shape => !availableShapes.includes(shape));

        if (missingShapes.length > 0) {
            console.warn('CharacterManager: Missing some required morph targets:', missingShapes);
        }

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

        // Add new model to scene
        const character = this.characters[index];
        this.currentModel = character.model;
        this.currentCharacterIndex = index;

        if (this.currentModel) {
            this.scene.add(this.currentModel);
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

        // Update position
        this.currentModel.position.set(position.x, position.y, position.z);

        // Update rotation
        this.currentModel.rotation.set(rotation.pitch, rotation.yaw, rotation.roll);

        // Update scale
        const scaleValue = Math.max(0.5, Math.min(scale, 2));
        this.currentModel.scale.set(scaleValue, scaleValue, scaleValue);
    }

    /**
     * Update morph targets (character expressions)
     */
    updateMorphTargets(blendshapes) {
        if (!blendshapes) return;

        // If using placeholder character, animate it differently
        if (this.currentModel.name === 'PlaceholderCharacter') {
            this.animatePlaceholder(blendshapes);
            return;
        }

        // Apply blendshapes to morph target meshes
        this.morphTargetMeshes.forEach(mesh => {
            const morphDict = mesh.morphTargetDictionary;
            const influences = mesh.morphTargetInfluences;

            // Map each blendshape to morph target
            Object.keys(blendshapes).forEach(shapeName => {
                const shapeValue = blendshapes[shapeName];
                const morphIndex = morphDict[shapeName];

                if (morphIndex !== undefined && influences[morphIndex] !== undefined) {
                    // Apply blendshape value (0-1 range)
                    influences[morphIndex] = shapeValue;
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

        console.log('CharacterManager: Disposed');
    }
}

export default CharacterManager;
