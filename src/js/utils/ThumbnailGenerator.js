/**
 * ThumbnailGenerator - Renders GLB character models as thumbnail images
 *
 * Creates small preview images of 3D characters for the character selector UI.
 * Uses an offscreen Three.js renderer to capture head shots.
 */

import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

class ThumbnailGenerator {
    constructor() {
        this.size = 128; // Thumbnail size (will be displayed at 64px, 2x for retina)
        this.loader = new GLTFLoader();
        this.cache = new Map(); // Cache generated thumbnails by path

        // Create offscreen renderer
        this.renderer = new THREE.WebGLRenderer({
            antialias: true,
            alpha: true,
            preserveDrawingBuffer: true
        });
        this.renderer.setSize(this.size, this.size);
        this.renderer.setPixelRatio(2); // High quality for retina
        this.renderer.setClearColor(0x000000, 0); // Transparent background
        this.renderer.outputColorSpace = THREE.SRGBColorSpace;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.2;

        // Create scene
        this.scene = new THREE.Scene();

        // Create camera - orthographic for consistent sizing
        this.camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
        this.camera.position.set(0, 0.1, 2);
        this.camera.lookAt(0, 0, 0);

        // Set up lighting for attractive thumbnail
        this.setupLighting();
    }

    /**
     * Set up lighting optimized for portrait/headshot thumbnails
     */
    setupLighting() {
        // Soft ambient light
        const ambient = new THREE.AmbientLight(0xffffff, 0.6);
        this.scene.add(ambient);

        // Main key light (front-right, above)
        const keyLight = new THREE.DirectionalLight(0xffffff, 1.5);
        keyLight.position.set(1, 2, 3);
        this.scene.add(keyLight);

        // Fill light (front-left)
        const fillLight = new THREE.DirectionalLight(0xaaccff, 0.6);
        fillLight.position.set(-1, 0.5, 2);
        this.scene.add(fillLight);

        // Rim light (behind)
        const rimLight = new THREE.DirectionalLight(0xffffee, 0.4);
        rimLight.position.set(0, 1, -2);
        this.scene.add(rimLight);

        // Add soft gradient background sphere for reflections
        const envScene = new THREE.Scene();
        const gradientMaterial = new THREE.ShaderMaterial({
            uniforms: {
                topColor: { value: new THREE.Color(0xffffff) },
                bottomColor: { value: new THREE.Color(0x888899) }
            },
            vertexShader: `
                varying vec3 vWorldPosition;
                void main() {
                    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
                    vWorldPosition = worldPosition.xyz;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                uniform vec3 topColor;
                uniform vec3 bottomColor;
                varying vec3 vWorldPosition;
                void main() {
                    float h = normalize(vWorldPosition).y * 0.5 + 0.5;
                    gl_FragColor = vec4(mix(bottomColor, topColor, h), 1.0);
                }
            `,
            side: THREE.BackSide
        });

        const envSphere = new THREE.Mesh(
            new THREE.SphereGeometry(50, 32, 32),
            gradientMaterial
        );
        envScene.add(envSphere);

        const pmremGenerator = new THREE.PMREMGenerator(this.renderer);
        pmremGenerator.compileEquirectangularShader();
        const envMap = pmremGenerator.fromScene(envScene, 0.04).texture;
        this.scene.environment = envMap;

        pmremGenerator.dispose();
        envSphere.geometry.dispose();
        gradientMaterial.dispose();
    }

    /**
     * Generate thumbnail for a character model
     * @param {string} modelPath - Path to GLB file
     * @returns {Promise<string>} - Data URL of the thumbnail image
     */
    async generateThumbnail(modelPath) {
        // Check cache first
        if (this.cache.has(modelPath)) {
            return this.cache.get(modelPath);
        }

        console.log(`ThumbnailGenerator: Generating thumbnail for ${modelPath}`);

        try {
            // Load the model
            const gltf = await this.loadModel(modelPath);
            const model = gltf.scene;

            // Clear any previous model from scene
            this.clearScene();

            // Calculate bounding box to center and scale model
            const box = new THREE.Box3().setFromObject(model);
            const center = box.getCenter(new THREE.Vector3());
            const size = box.getSize(new THREE.Vector3());

            // Position model - center it and move up to show head
            // Most character models have head at top, so we offset up
            model.position.x = -center.x;
            model.position.y = -center.y + size.y * 0.15; // Offset to focus on upper body/head
            model.position.z = -center.z;

            // Scale to fit in view
            const maxDim = Math.max(size.x, size.y * 0.5, size.z); // Prioritize width for head focus
            const scale = 1.2 / maxDim;
            model.scale.setScalar(scale);

            // Rotate model to face camera (180° around Y)
            model.rotation.y = Math.PI;

            // Add to scene
            this.scene.add(model);

            // Render
            this.renderer.render(this.scene, this.camera);

            // Get data URL
            const dataUrl = this.renderer.domElement.toDataURL('image/png');

            // Cache it
            this.cache.set(modelPath, dataUrl);

            // Clean up model from scene
            this.scene.remove(model);
            this.disposeModel(model);

            console.log(`ThumbnailGenerator: Thumbnail generated for ${modelPath}`);
            return dataUrl;

        } catch (error) {
            console.error(`ThumbnailGenerator: Failed to generate thumbnail for ${modelPath}`, error);
            return null;
        }
    }

    /**
     * Load GLB model
     */
    loadModel(path) {
        return new Promise((resolve, reject) => {
            this.loader.load(
                path,
                (gltf) => resolve(gltf),
                undefined,
                (error) => reject(error)
            );
        });
    }

    /**
     * Clear all objects from the thumbnail scene (except lights)
     */
    clearScene() {
        const objectsToRemove = [];
        this.scene.traverse((child) => {
            if (child.isMesh || child.isGroup) {
                // Don't remove lights
                if (!child.isLight) {
                    objectsToRemove.push(child);
                }
            }
        });

        objectsToRemove.forEach(obj => {
            if (obj.parent === this.scene) {
                this.scene.remove(obj);
            }
        });
    }

    /**
     * Dispose of a loaded model to free memory
     */
    disposeModel(model) {
        model.traverse((child) => {
            if (child.isMesh) {
                if (child.geometry) {
                    child.geometry.dispose();
                }
                if (child.material) {
                    if (Array.isArray(child.material)) {
                        child.material.forEach(mat => mat.dispose());
                    } else {
                        child.material.dispose();
                    }
                }
            }
        });
    }

    /**
     * Pre-generate thumbnails for multiple characters
     * @param {Array} characters - Array of character objects with 'path' property
     * @returns {Promise<Map>} - Map of path -> dataUrl
     */
    async generateAllThumbnails(characters) {
        const results = new Map();

        for (const character of characters) {
            const thumbnail = await this.generateThumbnail(character.path);
            if (thumbnail) {
                results.set(character.path, thumbnail);
            }
        }

        return results;
    }

    /**
     * Clean up resources
     */
    dispose() {
        this.clearScene();
        this.renderer.dispose();
        this.cache.clear();
    }
}

export default ThumbnailGenerator;
