/**
 * ThreeRenderer - Three.js rendering engine
 *
 * Manages Three.js scene, camera, renderer, and animation loop.
 * Initially renders a placeholder cube, will later render 3D character models.
 */

import * as THREE from 'three';
import { performanceConfig } from '../config/performance-config.js';

class ThreeRenderer {
    constructor(canvasElement, eventEmitter) {
        this.canvas = canvasElement;
        this.events = eventEmitter;
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.animationId = null;
        this.isRunning = false;

        // Get performance settings
        this.perfSettings = performanceConfig.getSettings();

        this.initialize();
    }

    /**
     * Initialize Three.js scene
     */
    initialize() {
        console.log('ThreeRenderer: Initializing...');

        // Create scene
        this.scene = new THREE.Scene();

        // Get actual canvas container size
        const container = this.canvas.parentElement;
        const width = container?.clientWidth || window.innerWidth;
        const height = container?.clientHeight || window.innerHeight;

        // Set up camera (perspective for realistic depth)
        const aspect = width / height;
        this.camera = new THREE.PerspectiveCamera(
            50,      // Field of view (degrees)
            aspect,  // Aspect ratio
            0.1,     // Near clipping plane
            1000     // Far clipping plane
        );
        this.camera.position.z = 3;  // Camera distance from origin

        // Create renderer with transparency (using performance settings)
        this.renderer = new THREE.WebGLRenderer({
            canvas: this.canvas,
            alpha: true,
            antialias: this.perfSettings.antialiasing,
            preserveDrawingBuffer: true  // Required for capturing canvas content
        });
        this.renderer.setSize(width, height);
        this.renderer.setPixelRatio(this.perfSettings.pixelRatio); // Use performance config
        this.renderer.setClearColor(0x000000, 0); // Transparent background

        // === COLOR & TONE MAPPING (fixes desaturated colors) ===
        this.renderer.outputColorSpace = THREE.SRGBColorSpace;  // Proper color output
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping; // Cinematic look
        this.renderer.toneMappingExposure = 0.7;  // Brightness (1.0 = default, higher = brighter)

        // === ENABLE SHADOWS ===
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap; // Soft shadows

        console.log(`ThreeRenderer: Pixel ratio set to ${this.perfSettings.pixelRatio}`);

        // Set up lighting
        this.setupLighting();

        // Set up environment for better material rendering
        this.setupEnvironment();

        // Handle window resize
        window.addEventListener('resize', this.onWindowResize.bind(this));

        console.log('ThreeRenderer: Initialized');
    }

    /**
     * Set up scene lighting with shadows
     * Tweak these values to adjust the look of your character
     */
    setupLighting() {
        // === LIGHTING CONFIG (tweak these!) ===
        // All values are intensity multipliers
        this.lightingConfig = {
            ambient: 0.4,           // Base ambient light (prevents pure black shadows)
            hemisphere: 0.3,        // Sky/ground gradient light
            keyLight: 1.5,          // Main directional light (casts shadows)
            fillLight: 0.5,         // Softens shadows from opposite side
            rimLight: 0.4,          // Edge/back light for depth
            faceLight: 0.4          // Front point light for face
        };

        // Ambient light (overall base illumination - no shadows)
        const ambientLight = new THREE.AmbientLight(0xffffff, this.lightingConfig.ambient);
        this.scene.add(ambientLight);

        // Hemisphere light (sky/ground gradient - adds natural feel)
        const hemisphereLight = new THREE.HemisphereLight(
            0xffeedd,  // Sky color (warm white)
            0x080820,  // Ground color (dark blue)
            this.lightingConfig.hemisphere
        );
        this.scene.add(hemisphereLight);

        // === KEY LIGHT (main light with shadows) ===
        const keyLight = new THREE.DirectionalLight(0xffffff, this.lightingConfig.keyLight);
        keyLight.position.set(2, 3, 4);  // Front-right, above
        keyLight.castShadow = true;
        // Shadow quality settings
        keyLight.shadow.mapSize.width = 1024;
        keyLight.shadow.mapSize.height = 1024;
        keyLight.shadow.camera.near = 0.1;
        keyLight.shadow.camera.far = 20;
        keyLight.shadow.camera.left = -5;
        keyLight.shadow.camera.right = 5;
        keyLight.shadow.camera.top = 5;
        keyLight.shadow.camera.bottom = -5;
        keyLight.shadow.bias = -0.001;  // Reduces shadow acne
        keyLight.shadow.radius = 4;     // Soft shadow edges
        this.scene.add(keyLight);

        // Fill light (soften shadows - from opposite side, no shadow casting)
        const fillLight = new THREE.DirectionalLight(0xaaccff, this.lightingConfig.fillLight);
        fillLight.position.set(-2, 1, 2);  // Front-left
        this.scene.add(fillLight);

        // Rim/back light (creates edge highlights - from behind)
        const rimLight = new THREE.DirectionalLight(0xffffee, this.lightingConfig.rimLight);
        rimLight.position.set(0, 2, -3);  // Behind and above
        this.scene.add(rimLight);

        // Front face light (ensures face is well-lit)
        const faceLight = new THREE.PointLight(0xfff8f0, this.lightingConfig.faceLight, 15);
        faceLight.position.set(0, 0, 4);  // Directly in front
        this.scene.add(faceLight);

        // Store lights for runtime adjustment
        this.lights = {
            ambient: ambientLight,
            hemisphere: hemisphereLight,
            key: keyLight,
            fill: fillLight,
            rim: rimLight,
            face: faceLight
        };

        console.log('ThreeRenderer: Lighting with shadows setup complete');
    }

    /**
     * Update a specific light's intensity
     * @param {string} name - Light name: 'ambient', 'hemisphere', 'key', 'fill', 'rim', 'face'
     * @param {number} intensity - New intensity value
     */
    updateLight(name, intensity) {
        if (this.lights && this.lights[name]) {
            this.lights[name].intensity = intensity;
            this.lightingConfig[name === 'key' ? 'keyLight' : name === 'face' ? 'faceLight' : name] = intensity;
        }
    }

    /**
     * Update all lighting at once
     * @param {Object} config - { ambient, hemisphere, keyLight, fillLight, rimLight, faceLight }
     */
    updateAllLighting(config) {
        if (config.ambient !== undefined) this.lights.ambient.intensity = config.ambient;
        if (config.hemisphere !== undefined) this.lights.hemisphere.intensity = config.hemisphere;
        if (config.keyLight !== undefined) this.lights.key.intensity = config.keyLight;
        if (config.fillLight !== undefined) this.lights.fill.intensity = config.fillLight;
        if (config.rimLight !== undefined) this.lights.rim.intensity = config.rimLight;
        if (config.faceLight !== undefined) this.lights.face.intensity = config.faceLight;
        Object.assign(this.lightingConfig, config);
        console.log('ThreeRenderer: Lighting updated', this.lightingConfig);
    }

    /**
     * Set up environment for PBR materials
     * Creates a simple gradient environment for reflections
     */
    setupEnvironment() {
        // Create a simple procedural environment map
        // This helps PBR materials look better without loading an HDR file
        const pmremGenerator = new THREE.PMREMGenerator(this.renderer);
        pmremGenerator.compileEquirectangularShader();

        // Create a simple gradient scene for the environment
        const envScene = new THREE.Scene();

        // Gradient background colors (soft studio lighting feel)
        const topColor = new THREE.Color(0xffffff);    // White/bright top
        const bottomColor = new THREE.Color(0x888899); // Soft blue-gray bottom

        // Create gradient using a large sphere with gradient material
        const gradientMaterial = new THREE.ShaderMaterial({
            uniforms: {
                topColor: { value: topColor },
                bottomColor: { value: bottomColor }
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
            new THREE.SphereGeometry(100, 32, 32),
            gradientMaterial
        );
        envScene.add(envSphere);

        // Generate environment map
        const envMap = pmremGenerator.fromScene(envScene, 0.04).texture;
        this.scene.environment = envMap;

        // Clean up
        pmremGenerator.dispose();
        envSphere.geometry.dispose();
        gradientMaterial.dispose();

        console.log('ThreeRenderer: Environment map created');
    }

    /**
     * Adjust lighting at runtime
     * @param {string} lightName - 'ambient', 'key', 'fill', 'rim', 'face'
     * @param {number} intensity - Light intensity
     */
    setLightIntensity(lightName, intensity) {
        if (this.lights[lightName]) {
            this.lights[lightName].intensity = intensity;
            console.log(`ThreeRenderer: ${lightName} light intensity set to ${intensity}`);
        }
    }

    /**
     * Set overall exposure
     */
    setExposure(value) {
        this.renderer.toneMappingExposure = value;
        console.log(`ThreeRenderer: Exposure set to ${value}`);
    }

    /**
     * Start rendering loop
     */
    start() {
        if (this.isRunning) return;

        console.log('ThreeRenderer: Starting render loop...');
        this.isRunning = true;
        this.animate();
    }

    /**
     * Stop rendering loop
     */
    stop() {
        if (!this.isRunning) return;

        console.log('ThreeRenderer: Stopping render loop...');
        this.isRunning = false;

        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
    }

    /**
     * Animation loop
     */
    animate() {
        if (!this.isRunning) return;

        this.animationId = requestAnimationFrame(this.animate.bind(this));

        // Render scene (CharacterManager handles all objects in scene)
        this.renderer.render(this.scene, this.camera);
    }

    /**
     * Handle window resize
     */
    onWindowResize() {
        // Use container size, not window size
        const container = this.canvas.parentElement;
        const width = container?.clientWidth || window.innerWidth;
        const height = container?.clientHeight || window.innerHeight;

        // Update camera aspect ratio
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();

        // Update renderer
        this.renderer.setSize(width, height);

        console.log(`ThreeRenderer: Resized to ${width}x${height}`);
    }

    /**
     * Clean up resources
     */
    dispose() {
        this.stop();

        // Dispose renderer
        if (this.renderer) {
            this.renderer.dispose();
        }

        window.removeEventListener('resize', this.onWindowResize.bind(this));

        console.log('ThreeRenderer: Disposed');
    }
}

export default ThreeRenderer;
