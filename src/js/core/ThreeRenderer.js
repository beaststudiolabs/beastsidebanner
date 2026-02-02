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

        // Set up camera (orthographic for face overlay)
        const aspect = window.innerWidth / window.innerHeight;
        this.camera = new THREE.OrthographicCamera(
            -1, 1,  // left, right
            1, -1,  // top, bottom
            0.1, 1000 // near, far
        );
        this.camera.position.z = 5;

        // Create renderer with transparency (using performance settings)
        this.renderer = new THREE.WebGLRenderer({
            canvas: this.canvas,
            alpha: true,
            antialias: this.perfSettings.antialiasing
        });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(this.perfSettings.pixelRatio); // Use performance config
        this.renderer.setClearColor(0x000000, 0); // Transparent background

        console.log(`ThreeRenderer: Pixel ratio set to ${this.perfSettings.pixelRatio}`);

        // Set up lighting
        this.setupLighting();

        // Handle window resize
        window.addEventListener('resize', this.onWindowResize.bind(this));

        console.log('ThreeRenderer: Initialized');
    }

    /**
     * Set up scene lighting
     */
    setupLighting() {
        // Hemisphere light (ambient)
        const hemisphereLight = new THREE.HemisphereLight(0xffffff, 0x444444, 0.6);
        this.scene.add(hemisphereLight);

        // Directional light (key light)
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(1, 1, 1);
        this.scene.add(directionalLight);

        // Point light (fill light)
        const pointLight = new THREE.PointLight(0xffffff, 0.4);
        pointLight.position.set(-1, 0, 2);
        this.scene.add(pointLight);
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
        const width = window.innerWidth;
        const height = window.innerHeight;

        // Update camera
        const aspect = width / height;
        this.camera.left = -1;
        this.camera.right = 1;
        this.camera.top = 1;
        this.camera.bottom = -1;
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
