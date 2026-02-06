/**
 * FilterApp - Main Application Orchestrator
 * Updated: Feb 5, 2026
 *
 * Coordinates all modules and manages application lifecycle.
 * This is the most critical file - it initializes modules in dependency order
 * and wires events between them.
 */

import CameraManager from './CameraManager.js';
import ThreeRenderer from './ThreeRenderer.js';
import FaceTracker from './FaceTracker.js';
import CharacterManager from './CharacterManager.js';
import SegmentationManager from './SegmentationManager.js';
import UIController from './UIController.js';
import MediaCapture from './MediaCapture.js';
import EventEmitter from '../utils/EventEmitter.js';
import ErrorHandler from '../utils/ErrorHandler.js';
import PerformanceMonitor from '../utils/PerformanceMonitor.js';
import SoundManager from '../utils/SoundManager.js';

class FilterApp {
    constructor(rootElement) {
        this.root = rootElement;
        this.state = {
            initialized: false,
            cameraActive: false,
            renderingActive: false,
            faceTracking: false,
            faceDetected: false,
            currentCharacter: 0,
            totalCharacters: 5,
            fps: 0,
            isRecording: false,
            error: null
        };

        // Event emitter for module communication
        this.events = new EventEmitter();

        // Error handling, performance monitoring, and sound
        this.errorHandler = new ErrorHandler(this.events);
        this.performanceMonitor = new PerformanceMonitor(this.events);
        this.soundManager = new SoundManager();

        // Module instances (will be initialized in init())
        this.cameraManager = null;
        this.renderer = null;
        this.faceTracker = null;
        this.characterManager = null;
        this.segmentationManager = null;
        this.uiController = null;
        this.mediaCapture = null;
    }

    /**
     * Initialize the application
     */
    async init() {
        try {
            console.log('BEASTSIDE Filters: Initializing...');

            // Check browser compatibility
            const compatibilityErrors = this.errorHandler.checkBrowserCompatibility();
            if (compatibilityErrors.length > 0) {
                const error = new Error('Browser not supported');
                error.compatibilityErrors = compatibilityErrors;
                throw error;
            }

            // Create container structure
            this.createContainerStructure();

            // Initialize modules in dependency order
            await this.initializeModules();

            // Start the application
            await this.start();

            // Initialize sound manager
            await this.soundManager.initialize();

            // Start performance monitoring
            this.performanceMonitor.start();

            this.state.initialized = true;
            console.log('BEASTSIDE Filters: Initialization complete');
        } catch (error) {
            console.error('BEASTSIDE Filters: Initialization failed', error);
            this.handleError(error, { type: 'initialization' });
        }
    }

    /**
     * Create HTML container structure
     */
    createContainerStructure() {
        this.root.innerHTML = `
            <div class="filter-container">
                <div class="loading-overlay" id="loading-overlay">
                    <div class="loading-content">
                        <dotlottie-player
                            src="https://assets-v2.lottiefiles.com/a/a9900a38-111d-11ef-9a11-2763059a69de/ItnWBz23D6.lottie"
                            background="transparent"
                            speed="1"
                            style="width: 80px; height: 80px; filter: invert(1); margin: 0 auto;"
                            loop
                            autoplay>
                        </dotlottie-player>
                        <div class="loading-text">Initializing camera...</div>
                        <div class="loading-progress">
                            <div class="loading-progress-bar" id="loading-progress-bar"></div>
                        </div>
                    </div>
                </div>
                <div class="video-container">
                    <canvas id="background-canvas"></canvas>
                    <video id="camera-video" autoplay playsinline></video>
                    <canvas id="filter-canvas"></canvas>
                </div>

                <!-- Top Controls -->
                <div class="top-controls">
                    <button id="effects-btn" class="top-btn" aria-label="Toggle effects" aria-expanded="false">
                        <i data-lucide="sparkles"></i>
                    </button>
                    <button id="settings-btn" class="top-btn" aria-label="Open settings">
                        <i data-lucide="sliders-horizontal"></i>
                    </button>
                </div>

                <!-- Effects Dropdown -->
                <div class="effects-dropdown" id="effects-dropdown">
                    <div class="effects-section">
                        <div class="effects-section-title">Virtual Background</div>
                        <div class="effects-grid" id="virtual-backgrounds-list"></div>
                    </div>
                    <div class="effects-section">
                        <div class="effects-section-title">Effects</div>
                        <div class="effects-grid" id="background-effects-list"></div>
                    </div>
                    <div class="effects-section">
                        <div class="effects-section-title">Filter</div>
                        <div class="effects-grid" id="photo-filters-list"></div>
                    </div>
                </div>

                <!-- Settings Dropdown -->
                <div class="effects-dropdown" id="settings-dropdown" style="left: auto; right: calc(20px + env(safe-area-inset-right, 0px));">
                    <div class="effects-section">
                        <div class="effects-section-title">Options</div>
                        <div class="effects-grid">
                            <button id="fullscreen-btn" class="effect-item" title="Fullscreen" aria-label="Toggle fullscreen">
                                <i data-lucide="maximize"></i>
                            </button>
                            <button id="mute-btn" class="effect-item" title="Sound" aria-label="Toggle sound">
                                <i data-lucide="volume-2"></i>
                            </button>
                            <button id="timer-toggle-btn" class="effect-item" title="Timer" aria-label="Toggle countdown timer">
                                <i data-lucide="timer"></i>
                            </button>
                            <button id="resync-btn" class="effect-item" title="Resync" aria-label="Resync face tracking">
                                <i data-lucide="refresh-cw"></i>
                            </button>
                            <button id="close-btn" class="effect-item" title="Close" aria-label="Close filter">
                                <i data-lucide="x"></i>
                            </button>
                        </div>
                    </div>
                    <div class="effects-section">
                        <div class="effects-section-title">Skin Tone</div>
                        <div class="effects-grid" id="skin-tones-grid"></div>
                    </div>
                </div>

                <!-- Character Selector (above island) -->
                <div class="character-selector" id="character-selector">
                    <div class="character-selector-name" id="character-name">RAFSBY</div>
                    <div class="character-selector-dot"></div>
                </div>

                <!-- Recording Indicator -->
                <div class="recording-indicator" id="recording-indicator">
                    <div class="recording-dot"></div>
                    <div class="recording-time" id="recording-time">00:00</div>
                </div>

                <!-- Bottom Island Control Bar -->
                <div class="bottom-island">
                    <button class="island-thumbnail" id="thumbnail-btn" aria-label="View last capture">
                        <i data-lucide="image"></i>
                    </button>
                    <button class="capture-btn" id="capture-btn" aria-label="Take photo or start recording"></button>
                    <button class="island-mode" id="mode-btn" aria-label="Toggle photo/video mode">
                        <i data-lucide="camera"></i>
                    </button>
                </div>

                <!-- Character Picker Dropdown -->
                <div class="character-picker" id="character-picker">
                    <div class="character-picker-title">Characters</div>
                    <div class="character-dots" role="tablist" aria-label="Characters"></div>
                    <div class="character-name" aria-live="polite"></div>
                </div>

                <!-- Countdown Overlay -->
                <div class="countdown-overlay" id="countdown-overlay">
                    <div class="countdown-number" id="countdown-number">3</div>
                </div>

                <!-- Debug Info -->
                <div class="debug-info">
                    <div id="fps-counter">FPS: --</div>
                    <div id="face-status">Face: Searching...</div>
                </div>

                <!-- Error Message -->
                <div class="error-message" style="display: none;"></div>

                <!-- Preview Modal -->
                <div class="preview-modal" role="dialog" aria-label="Media preview" aria-modal="true">
                    <div class="preview-content">
                        <button class="preview-close" aria-label="Close preview"><i data-lucide="x"></i></button>
                        <img class="preview-image" style="display: none;" alt="Captured photo preview" />
                        <video class="preview-video" style="display: none;" autoplay loop muted playsinline aria-label="Captured video preview"></video>
                        <div class="preview-actions">
                            <button class="btn-preview btn-download" title="Save to device" aria-label="Download media"><i data-lucide="download"></i></button>
                            <button class="btn-preview btn-share" title="Share" aria-label="Share media"><i data-lucide="share-2"></i></button>
                            <button class="btn-preview btn-retake" title="Retake" aria-label="Close and retake"><i data-lucide="refresh-cw"></i></button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Store references to key elements
        this.videoElement = this.root.querySelector('#camera-video');
        this.canvasElement = this.root.querySelector('#filter-canvas');
        this.backgroundCanvas = this.root.querySelector('#background-canvas');
        this.backgroundCtx = this.backgroundCanvas.getContext('2d');
        this.errorElement = this.root.querySelector('.error-message');
        this.fpsCounter = this.root.querySelector('#fps-counter');
        this.faceStatus = this.root.querySelector('#face-status');
        this.characterDotsContainer = this.root.querySelector('.character-dots');
        this.characterDots = []; // Will be populated dynamically
        this.characterName = this.root.querySelector('.character-name');

        // Loading overlay elements
        this.loadingOverlay = this.root.querySelector('#loading-overlay');
        this.loadingText = this.root.querySelector('.loading-text');
        this.loadingProgressBar = this.root.querySelector('#loading-progress-bar');

        // New UI elements
        this.captureBtn = this.root.querySelector('#capture-btn');
        this.thumbnailBtn = this.root.querySelector('#thumbnail-btn');
        this.modeBtn = this.root.querySelector('#mode-btn');
        this.effectsBtn = this.root.querySelector('#effects-btn');
        this.settingsBtn = this.root.querySelector('#settings-btn');
        this.effectsDropdown = this.root.querySelector('#effects-dropdown');
        this.settingsDropdown = this.root.querySelector('#settings-dropdown');
        this.characterSelector = this.root.querySelector('#character-selector');
        this.characterSelectorName = this.root.querySelector('#character-name');
        this.recordingIndicator = this.root.querySelector('#recording-indicator');
        this.recordingTime = this.root.querySelector('#recording-time');

        // Preview modal
        this.previewModal = this.root.querySelector('.preview-modal');
        this.previewImage = this.root.querySelector('.preview-image');
        this.previewVideo = this.root.querySelector('.preview-video');
        this.previewClose = this.root.querySelector('.preview-close');
        this.downloadBtn = this.root.querySelector('.btn-download');
        this.shareBtn = this.root.querySelector('.btn-share');
        this.retakeBtn = this.root.querySelector('.btn-retake');

        // Utility controls
        this.fullscreenBtn = this.root.querySelector('#fullscreen-btn');
        this.muteBtn = this.root.querySelector('#mute-btn');
        this.timerToggleBtn = this.root.querySelector('#timer-toggle-btn');
        this.resyncBtn = this.root.querySelector('#resync-btn');
        this.closeBtn = this.root.querySelector('#close-btn');

        // Effects lists
        this.virtualBackgroundsList = this.root.querySelector('#virtual-backgrounds-list');
        this.backgroundEffectsList = this.root.querySelector('#background-effects-list');
        this.photoFiltersList = this.root.querySelector('#photo-filters-list');
        this.skinTonesGrid = this.root.querySelector('#skin-tones-grid');

        // Countdown overlay
        this.countdownOverlay = this.root.querySelector('#countdown-overlay');
        this.countdownNumber = this.root.querySelector('#countdown-number');

        // State
        this.currentMode = 'photo'; // 'photo' or 'video'
        this.useCountdown = false;
        this.lastCapture = null;

        // Main capture button
        this.captureBtn.addEventListener('click', () => this.handleCapture());

        // Thumbnail button - open last capture or preview
        this.thumbnailBtn.addEventListener('click', () => {
            if (this.lastCapture) {
                this.showPreview(this.lastCapture.type, this.lastCapture.media);
            }
        });

        // Character picker
        this.characterPicker = this.root.querySelector('#character-picker');

        // Character selector - toggle character picker
        this.characterSelector.addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggleCharacterPicker();
        });

        // Close character picker when clicking outside
        document.addEventListener('click', (e) => {
            if (!e.target.closest('#character-picker') && !e.target.closest('#character-selector')) {
                this.characterPicker?.classList.remove('visible');
            }
        });

        // Mode button - toggle between photo/video
        this.modeBtn.addEventListener('click', () => {
            const newMode = this.currentMode === 'photo' ? 'video' : 'photo';
            this.setMode(newMode);
        });

        // Effects button toggle
        this.effectsBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggleDropdown('effects');
        });

        // Settings button toggle
        this.settingsBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggleDropdown('settings');
        });

        // Close dropdowns when clicking outside
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.effects-dropdown') && !e.target.closest('.top-btn')) {
                this.closeAllDropdowns();
            }
        });

        // Add click handlers to preview modal
        this.previewClose.addEventListener('click', () => this.closePreview());
        this.retakeBtn.addEventListener('click', () => this.closePreview());
        this.downloadBtn.addEventListener('click', () => this.handleDownload());
        this.shareBtn.addEventListener('click', () => this.handleShare());

        // Utility controls
        this.fullscreenBtn.addEventListener('click', () => this.toggleFullscreen());
        this.muteBtn.addEventListener('click', () => this.toggleMute());
        this.timerToggleBtn.addEventListener('click', () => this.toggleCountdownTimer());
        this.resyncBtn.addEventListener('click', () => {
            if (this.characterManager) {
                this.characterManager.resync();
            }
        });
        this.closeBtn.addEventListener('click', () => {
            // Close/exit the filter experience
            this.destroy();
            this.root.innerHTML = '';
        });

        // Listen for fullscreen changes
        document.addEventListener('fullscreenchange', () => this.updateFullscreenIcon());
        document.addEventListener('webkitfullscreenchange', () => this.updateFullscreenIcon());

        // Resume audio context on any user interaction (required for mobile browsers)
        const resumeAudio = () => {
            if (this.soundManager) {
                this.soundManager.resumeContext();
            }
        };
        document.addEventListener('click', resumeAudio, { once: true });
        document.addEventListener('touchstart', resumeAudio, { once: true });

        // Set up keyboard shortcuts
        this.setupKeyboardShortcuts();

        // Initialize Lucide icons
        if (window.lucide) {
            window.lucide.createIcons();
        }

        // Debug info toggle (press 'D' key or add ?debug to URL)
        this.debugInfo = this.root.querySelector('.debug-info');
        if (window.location.search.includes('debug')) {
            this.debugInfo.classList.add('visible');
        }

        document.addEventListener('keydown', (e) => {
            if (e.key.toLowerCase() === 'd' && !e.target.matches('input, textarea')) {
                this.debugInfo.classList.toggle('visible');
            }
        });
    }

    /**
     * Initialize all modules in dependency order
     */
    async initializeModules() {
        console.log('Initializing modules...');

        // 1. Camera Manager (no dependencies) - 0-20%
        this.updateLoadingText('Setting up camera...');
        this.updateLoadingProgress(5);
        this.cameraManager = new CameraManager(this.videoElement);
        this.updateLoadingProgress(20);

        // 2. Three.js Renderer (needs canvas element) - 20-40%
        this.updateLoadingText('Initializing 3D engine...');
        this.updateLoadingProgress(25);
        this.renderer = new ThreeRenderer(this.canvasElement, this.events);
        this.updateLoadingProgress(40);

        // 3. Character Manager (needs Three.js scene) - 40-80%
        this.updateLoadingText('Loading character...');
        this.updateLoadingProgress(45);
        this.characterManager = new CharacterManager(this.renderer.scene, this.events, this.renderer.camera);
        await this.characterManager.initialize();
        this.updateLoadingProgress(80);

        // Populate character selector after characters are loaded
        this.populateCharacterDots();

        // Set up thumbnail event handler immediately (before thumbnails finish generating)
        this.events.on('thumbnailGenerated', (data) => {
            this.updateCharacterDotThumbnail(data.index, data.thumbnail);
        });

        // 4. Face Tracker (needs video element and event emitter) - 80-90%
        this.updateLoadingText('Starting face tracking...');
        this.updateLoadingProgress(85);
        this.faceTracker = new FaceTracker(this.videoElement, this.events);

        // 5. UI Controller (needs container element)
        this.uiController = new UIController(this.root, this.events);
        this.uiController.initialize();
        this.updateLoadingProgress(90);

        // 6. Media Capture (needs canvas and video elements)
        this.mediaCapture = new MediaCapture(this.canvasElement, this.videoElement, this.events);
        await this.mediaCapture.initialize();
        this.updateLoadingProgress(92);

        // 7. Segmentation Manager (for virtual backgrounds)
        this.segmentationManager = new SegmentationManager(this.videoElement, this.events);
        await this.segmentationManager.initialize();
        this.mediaCapture.setSegmentationManager(this.segmentationManager);
        this.updateLoadingProgress(95);

        // Wire up events
        this.setupEventHandlers();

        console.log('Modules initialized');
    }

    /**
     * Set up event handlers for module communication
     */
    setupEventHandlers() {
        // Face detection events
        this.events.on('faceDetected', (data) => {
            this.state.faceDetected = data.detected;
            console.log(`Face ${data.detected ? 'detected' : 'lost'}`);

            // Update UI
            if (this.faceStatus) {
                this.faceStatus.textContent = data.detected ? 'Face: ✓ Tracking' : 'Face: Searching...';
                this.faceStatus.style.color = data.detected ? '#4ade80' : '#fbbf24';
            }
        });

        // Face tracking data (landmarks, blendshapes, transform)
        this.events.on('faceTracked', (data) => {
            // Renderer will handle this directly
            // Update state for debugging
            this.state.faceTracking = true;
        });

        // FPS updates
        this.events.on('fpsUpdate', (data) => {
            this.state.fps = data.fps;

            // Update UI
            if (this.fpsCounter) {
                this.fpsCounter.textContent = `FPS: ${data.fps}`;

                // Color code based on performance
                if (data.fps >= 30) {
                    this.fpsCounter.style.color = '#4ade80'; // Green
                } else if (data.fps >= 20) {
                    this.fpsCounter.style.color = '#fbbf24'; // Yellow
                } else {
                    this.fpsCounter.style.color = '#ef4444'; // Red
                }
            }

            // Log FPS periodically
            if (data.fps < 25) {
                console.warn(`Low FPS: ${data.fps} (target: 30+)`);
            }
        });

        // Character switching events
        this.events.on('characterNext', async () => {
            this.uiController.setTransitioning(true);
            await this.characterManager.nextCharacter();
            this.uiController.setTransitioning(false);
        });

        this.events.on('characterPrevious', async () => {
            this.uiController.setTransitioning(true);
            await this.characterManager.previousCharacter();
            this.uiController.setTransitioning(false);
        });

        this.events.on('characterSwitch', async (data) => {
            this.uiController.setTransitioning(true);
            await this.characterManager.switchToCharacterByIndex(data.index);
            this.uiController.setTransitioning(false);
        });

        // Character switched successfully
        this.events.on('characterSwitched', (data) => {
            this.state.currentCharacter = data.index;
            this.updateCharacterIndicator(data.index);

            // Update character name in selector (above island)
            if (this.characterSelectorName) {
                this.characterSelectorName.textContent = data.character.name;
            }

            // Update character name in picker dropdown
            if (this.characterName) {
                this.characterName.textContent = data.character.name;
            }
        });

        // Character switching/loading
        this.events.on('characterSwitching', (data) => {
            console.log(`Switching from character ${data.from} to ${data.to}...`);
        });

        // Note: thumbnailGenerated handler is set up earlier in initializeModules()

        // Media capture events
        this.events.on('photoCaptured', (photo) => {
            console.log('Photo captured');
            this.soundManager.play('shutter');
            this.showPreview('photo', photo);
        });

        this.events.on('videoRecorded', (video) => {
            console.log('Video recorded');
            this.showPreview('video', video);
        });

        this.events.on('recordingStarted', () => {
            this.state.isRecording = true;
            this.updateRecordingUI(true);
            this.startRecordingTimer();
        });

        this.events.on('captureError', (data) => {
            console.error('Capture error:', data.error);
            this.handleError(data.error, { type: data.type });
        });

        // Performance monitoring events
        this.events.on('performanceUpdate', (data) => {
            // Update FPS display (already handled by fpsUpdate event)
            this.state.fps = data.fps;
        });

        this.events.on('performanceLevelChange', (data) => {
            console.warn(`Performance level: ${data.level} (${data.fps} FPS)`);

            // Update FPS counter color based on level
            if (this.fpsCounter) {
                if (data.level === 'good') {
                    this.fpsCounter.style.color = '#4ade80'; // Green
                } else if (data.level === 'warning') {
                    this.fpsCounter.style.color = '#fbbf24'; // Yellow
                } else {
                    this.fpsCounter.style.color = '#ef4444'; // Red
                }
            }
        });

        this.events.on('performanceCritical', (data) => {
            console.error('Critical performance:', data);

            // Show performance warning (non-blocking)
            if (this.uiController) {
                this.uiController.showMessage(
                    `⚠️ Low performance detected (${data.fps} FPS). Try closing other apps.`,
                    5000
                );
            }
        });

        this.events.on('memoryWarning', (data) => {
            console.warn(`High memory usage: ${data.usedMB}MB / ${data.limitMB}MB (${data.percentage}%)`);
        });

        // Virtual background changed
        this.events.on('backgroundChanged', (data) => {
            console.log('Background changed:', data);
            if (data.enabled) {
                // Start live background rendering
                this.startVirtualBackgroundRender();
                this.videoElement.style.opacity = '0';
                this.backgroundCanvas.style.display = 'block';
            } else {
                // Stop live background rendering
                this.stopVirtualBackgroundRender();
                this.videoElement.style.opacity = '1';
                this.backgroundCanvas.style.display = 'none';
            }
        });

        // Error event (centralized)
        this.events.on('error', (data) => {
            console.error('Application error:', data);
            // Error already handled by ErrorHandler.handle()
        });
    }

    /**
     * Update character indicator UI
     */
    updateCharacterIndicator(activeIndex) {
        if (!this.characterDots) return;

        this.characterDots.forEach((dot, index) => {
            if (index === activeIndex) {
                dot.classList.add('active');
                dot.setAttribute('aria-selected', 'true');
            } else {
                dot.classList.remove('active');
                dot.setAttribute('aria-selected', 'false');
            }
        });
    }

    /**
     * Start the application
     */
    async start() {
        console.log('Starting application...');

        // Start camera
        this.updateLoadingText('Starting camera...');
        this.updateLoadingProgress(96);
        await this.cameraManager.start();
        this.state.cameraActive = true;
        this.updateLoadingProgress(97);

        // Start renderer
        this.renderer.start();
        this.state.renderingActive = true;
        this.updateLoadingProgress(98);

        // Start face tracking (after camera is ready)
        this.updateLoadingText('Starting face tracking...');
        await this.faceTracker.start();
        this.state.faceTracking = true;
        this.updateLoadingProgress(99);

        // Segmentation will be started on-demand when virtual background is enabled
        // (we don't call start() here - the render loop will drive processCurrentFrame)
        this.updateLoadingProgress(100);

        // Hide loading overlay - we're ready!
        this.hideLoading();

        console.log('Application started');
    }

    /**
     * Handle errors
     */
    handleError(error, context = {}) {
        this.state.error = error;

        // Use ErrorHandler to categorize and get message
        const errorInfo = this.errorHandler.handle(error, context);

        // Show error UI
        this.showError(errorInfo);

        // Log error
        this.errorHandler.logError(error, context);
    }

    /**
     * Show error message with retry option
     */
    showError(errorInfo) {
        if (!this.errorElement) return;

        // Build suggestions HTML
        let suggestionsHtml = '';
        if (errorInfo.suggestions && errorInfo.suggestions.length > 0) {
            suggestionsHtml = `
                <ul class="error-suggestions">
                    ${errorInfo.suggestions.map(s => `<li>${s}</li>`).join('')}
                </ul>
            `;
        }

        // Build help link HTML
        let helpLinkHtml = '';
        if (errorInfo.helpUrl) {
            helpLinkHtml = `
                <a href="${errorInfo.helpUrl}" target="_blank" rel="noopener noreferrer" class="error-help-link">
                    <i data-lucide="external-link"></i> Learn more
                </a>
            `;
        }

        // Use specific icon or fallback to alert-triangle
        const iconName = errorInfo.icon || 'alert-triangle';

        // Build error HTML
        const html = `
            <div class="error-content">
                <div class="error-icon"><i data-lucide="${iconName}"></i></div>
                <h3 class="error-title">${errorInfo.title}</h3>
                <p class="error-description">${errorInfo.message}</p>
                ${suggestionsHtml}
                <div class="error-actions">
                    ${errorInfo.retryable && errorInfo.canRetry !== false ?
                        '<button class="error-retry-btn"><i data-lucide="refresh-cw"></i> Retry</button>' :
                        '<button class="error-close-btn"><i data-lucide="x"></i> Close</button>'}
                    ${helpLinkHtml}
                </div>
            </div>
        `;

        this.errorElement.innerHTML = html;
        this.errorElement.style.display = 'flex';

        // Initialize Lucide icons in error message
        if (window.lucide) {
            window.lucide.createIcons({ attrs: { class: 'lucide-icon' } });
        }

        // Add click handler for retry button
        const retryBtn = this.errorElement.querySelector('.error-retry-btn');
        if (retryBtn) {
            retryBtn.addEventListener('click', async () => {
                this.hideError();
                this.errorHandler.incrementRetry(errorInfo.type);

                // Attempt to reinitialize based on error type
                try {
                    if (errorInfo.type.includes('camera')) {
                        await this.cameraManager.start();
                    } else {
                        await this.init();
                    }
                } catch (error) {
                    this.handleError(error, { type: 'retry' });
                }
            });
        }

        // Add click handler for close button
        const closeBtn = this.errorElement.querySelector('.error-close-btn');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                this.hideError();
            });
        }
    }

    /**
     * Hide error message
     */
    hideError() {
        if (this.errorElement) {
            this.errorElement.style.display = 'none';
            this.errorElement.innerHTML = '';
        }
    }

    /**
     * Handle photo capture
     * @param {boolean} useCountdown - Whether to use countdown before capture
     */
    handlePhotoCapture(useCountdown = false) {
        if (this.state.isRecording) {
            console.warn('Cannot take photo while recording');
            return;
        }

        if (useCountdown) {
            this.startCountdown(() => {
                this.mediaCapture.capturePhoto();
            });
        } else {
            this.mediaCapture.capturePhoto();
        }
    }

    /**
     * Handle video recording start
     */
    async handleVideoStart() {
        await this.mediaCapture.startRecording();
    }

    /**
     * Handle video recording stop
     */
    handleVideoStop() {
        this.mediaCapture.stopRecording();
        this.state.isRecording = false;
        this.updateRecordingUI(false);
        this.stopRecordingTimer();
    }

    /**
     * Update recording UI (capture button, indicator)
     */
    updateRecordingUI(isRecording) {
        // Update capture button state
        this.captureBtn.classList.toggle('recording', isRecording);

        // Show/hide recording indicator
        this.recordingIndicator.classList.toggle('visible', isRecording);

        // Disable mode switching while recording
        if (this.modeBtn) {
            this.modeBtn.disabled = isRecording;
            this.modeBtn.style.opacity = isRecording ? '0.5' : '1';
        }
    }

    /**
     * Start recording timer
     */
    startRecordingTimer() {
        this.recordingTimerInterval = setInterval(() => {
            const duration = this.mediaCapture.getRecordingDuration();
            const seconds = Math.floor(duration / 1000);
            const minutes = Math.floor(seconds / 60);
            const secs = seconds % 60;
            this.recordingTime.textContent = `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
        }, 100);
    }

    /**
     * Stop recording timer
     */
    stopRecordingTimer() {
        if (this.recordingTimerInterval) {
            clearInterval(this.recordingTimerInterval);
            this.recordingTimerInterval = null;
        }
        this.recordingTime.textContent = '00:00';
    }

    /**
     * Show preview modal
     */
    showPreview(type, media) {
        this.currentPreviewType = type;
        this.currentPreviewMedia = media;

        // Save as last capture for thumbnail
        this.lastCapture = { type, media };

        // Update thumbnail button with preview
        if (type === 'photo' && media.url) {
            this.thumbnailBtn.innerHTML = `<img src="${media.url}" alt="Last capture" />`;
        } else if (type === 'video' && media.url) {
            // Generate video thumbnail from first frame
            this.generateVideoThumbnail(media.url);
        }

        if (type === 'photo') {
            this.previewImage.src = media.url;
            this.previewImage.style.display = 'block';
            this.previewVideo.style.display = 'none';
        } else {
            this.previewVideo.src = media.url;
            this.previewVideo.style.display = 'block';
            this.previewImage.style.display = 'none';
        }

        this.previewModal.style.display = 'flex';
    }

    /**
     * Generate thumbnail from video first frame
     */
    generateVideoThumbnail(videoUrl) {
        const tempVideo = document.createElement('video');
        tempVideo.src = videoUrl;
        tempVideo.muted = true;
        tempVideo.playsInline = true;

        tempVideo.addEventListener('loadeddata', () => {
            // Seek to first frame
            tempVideo.currentTime = 0.1;
        });

        tempVideo.addEventListener('seeked', () => {
            // Create thumbnail
            const canvas = document.createElement('canvas');
            canvas.width = 100;
            canvas.height = 100;
            const ctx = canvas.getContext('2d');

            // Calculate crop for square thumbnail
            const size = Math.min(tempVideo.videoWidth, tempVideo.videoHeight);
            const offsetX = (tempVideo.videoWidth - size) / 2;
            const offsetY = (tempVideo.videoHeight - size) / 2;

            ctx.drawImage(tempVideo, offsetX, offsetY, size, size, 0, 0, 100, 100);

            // Update thumbnail button
            this.thumbnailBtn.innerHTML = `<img src="${canvas.toDataURL('image/jpeg', 0.8)}" alt="Last capture" />`;
        });

        tempVideo.load();
    }

    /**
     * Close preview modal
     */
    closePreview() {
        this.previewModal.style.display = 'none';
        this.previewImage.src = '';
        this.previewVideo.src = '';
        this.currentPreviewType = null;
        this.currentPreviewMedia = null;
    }

    /**
     * Handle download from preview
     */
    handleDownload() {
        if (this.currentPreviewType === 'photo') {
            this.mediaCapture.downloadPhoto(this.currentPreviewMedia);
        } else {
            this.mediaCapture.downloadVideo(this.currentPreviewMedia);
        }
        this.closePreview();
    }

    /**
     * Handle share from preview
     */
    async handleShare() {
        let result;
        if (this.currentPreviewType === 'photo') {
            result = await this.mediaCapture.sharePhoto(this.currentPreviewMedia);
        } else {
            result = await this.mediaCapture.shareVideo(this.currentPreviewMedia);
        }

        // Show feedback based on share method
        if (result.success) {
            if (result.method === 'clipboard') {
                this.showShareFeedback('Copied to clipboard!');
            } else if (result.method === 'download') {
                this.showShareFeedback('Downloaded!');
            }
            // Native share shows its own UI, no feedback needed
        }
        // Don't close preview automatically (user might want to share again)
    }

    /**
     * Show share feedback toast
     */
    showShareFeedback(message) {
        // Create or reuse toast element
        let toast = this.root.querySelector('.share-toast');
        if (!toast) {
            toast = document.createElement('div');
            toast.className = 'share-toast';
            this.previewModal.querySelector('.preview-content').appendChild(toast);
        }

        toast.textContent = message;
        toast.classList.add('visible');

        // Hide after 2 seconds
        setTimeout(() => {
            toast.classList.remove('visible');
        }, 2000);
    }

    /**
     * Populate character selector dots based on available characters
     */
    populateCharacterDots() {
        if (!this.characterManager || !this.characterDotsContainer) return;

        const characters = this.characterManager.getAllCharacters();
        this.characterDotsContainer.innerHTML = '';

        characters.forEach((character, index) => {
            const dot = document.createElement('button');
            dot.className = 'dot' + (index === 0 ? ' active' : '');
            dot.dataset.index = index;
            dot.dataset.name = character.name;
            dot.setAttribute('role', 'tab');
            dot.setAttribute('aria-selected', index === 0 ? 'true' : 'false');
            dot.setAttribute('aria-label', character.name);

            // Check if thumbnail is already available
            if (character.thumbnail) {
                // Use thumbnail image
                const img = document.createElement('img');
                img.src = character.thumbnail;
                img.alt = character.name;
                img.draggable = false;
                dot.appendChild(img);
            } else {
                // Fallback to initials until thumbnail is ready
                const initials = this.getCharacterInitials(character.name);
                dot.textContent = initials;
            }

            // Add click handler
            dot.addEventListener('click', () => {
                this.events.emit('characterSwitch', { index });
            });

            this.characterDotsContainer.appendChild(dot);
        });

        // Update reference to dots
        this.characterDots = this.characterDotsContainer.querySelectorAll('.dot');

        // Set initial character name in both selector and picker
        if (characters.length > 0) {
            if (this.characterSelectorName) {
                this.characterSelectorName.textContent = characters[0].name;
            }
            if (this.characterName) {
                this.characterName.textContent = characters[0].name;
            }
        }

        // If only one character, don't allow clicking to open picker
        if (characters.length <= 1 && this.characterSelector) {
            this.characterSelector.style.cursor = 'default';
            this.characterSelector.removeAttribute('title');
        }
    }

    /**
     * Update a character dot with its thumbnail when generated
     */
    updateCharacterDotThumbnail(index, thumbnail) {
        if (!this.characterDots || index >= this.characterDots.length) return;

        const dot = this.characterDots[index];
        if (dot && thumbnail) {
            // Clear existing content (initials)
            dot.textContent = '';

            // Add thumbnail image
            const img = document.createElement('img');
            img.src = thumbnail;
            img.alt = dot.dataset.name || `Character ${index + 1}`;
            img.draggable = false;
            dot.appendChild(img);
        }
    }

    /**
     * Get initials from character name
     * e.g., "Boy #1" -> "B1", "Girl #2" -> "G2", "Character #1" -> "C1"
     */
    getCharacterInitials(name) {
        // Extract first letter and any number
        const firstLetter = name.charAt(0).toUpperCase();
        const numberMatch = name.match(/\d+/);
        const number = numberMatch ? numberMatch[0] : '';
        return firstLetter + number;
    }

    /**
     * Update loading overlay text
     */
    updateLoadingText(text) {
        if (this.loadingText) {
            this.loadingText.textContent = text;
        }
    }

    /**
     * Update loading progress bar
     * @param {number} percent - Progress percentage (0-100)
     */
    updateLoadingProgress(percent) {
        if (this.loadingProgressBar) {
            this.loadingProgressBar.style.width = `${percent}%`;
        }
    }

    /**
     * Hide loading overlay
     */
    hideLoading() {
        if (this.loadingOverlay) {
            this.loadingOverlay.classList.add('hidden');
        }
    }

    /**
     * Start virtual background live rendering
     */
    startVirtualBackgroundRender() {
        if (this.virtualBgRenderLoop) return;

        const render = () => {
            if (!this.segmentationManager || !this.segmentationManager.isEnabled()) {
                this.virtualBgRenderLoop = requestAnimationFrame(render);
                return;
            }

            // Size canvas to match video
            const width = this.videoElement.videoWidth || 640;
            const height = this.videoElement.videoHeight || 480;

            if (this.backgroundCanvas.width !== width || this.backgroundCanvas.height !== height) {
                this.backgroundCanvas.width = width;
                this.backgroundCanvas.height = height;
            }

            // Trigger segmentation processing (async, don't wait)
            this.segmentationManager.processCurrentFrame();

            // Clear canvas
            this.backgroundCtx.clearRect(0, 0, width, height);

            // Composite person over background (compositeFrame handles mirroring internally)
            const composited = this.segmentationManager.compositeFrame(
                this.backgroundCtx,
                this.videoElement,
                width,
                height
            );

            if (!composited) {
                // Fallback to regular video mirrored (e.g., while waiting for first mask)
                this.backgroundCtx.save();
                this.backgroundCtx.translate(width, 0);
                this.backgroundCtx.scale(-1, 1);
                this.backgroundCtx.drawImage(this.videoElement, 0, 0, width, height);
                this.backgroundCtx.restore();
            }

            this.virtualBgRenderLoop = requestAnimationFrame(render);
        };

        this.virtualBgRenderLoop = requestAnimationFrame(render);
    }

    /**
     * Stop virtual background live rendering
     */
    stopVirtualBackgroundRender() {
        if (this.virtualBgRenderLoop) {
            cancelAnimationFrame(this.virtualBgRenderLoop);
            this.virtualBgRenderLoop = null;
        }
    }

    /**
     * Show loading overlay
     */
    showLoading(text = 'Loading...') {
        if (this.loadingOverlay) {
            this.loadingOverlay.classList.remove('hidden');
            this.updateLoadingText(text);
        }
    }

    /**
     * Update which skin tone swatch is selected
     */
    updateSkinToneSelection(selectedColor) {
        const swatches = this.skinTonesGrid.querySelectorAll('.effect-item');
        swatches.forEach(swatch => {
            if (swatch.dataset.color === selectedColor) {
                swatch.classList.add('active');
            } else {
                swatch.classList.remove('active');
            }
        });
    }

    /**
     * Handle main capture button press
     */
    handleCapture() {
        if (this.currentMode === 'photo') {
            this.handlePhotoCapture(this.useCountdown);
        } else {
            // Video mode - toggle recording
            if (this.state.isRecording) {
                this.handleVideoStop();
            } else {
                this.handleVideoStart();
            }
        }
    }

    /**
     * Set capture mode (photo/video)
     */
    setMode(mode) {
        this.currentMode = mode;

        // Update mode button icon to show CURRENT mode
        if (this.modeBtn) {
            const iconName = mode === 'photo' ? 'camera' : 'video';
            // Replace the entire icon (Lucide converts <i> to <svg>)
            this.modeBtn.innerHTML = `<i data-lucide="${iconName}"></i>`;
            if (window.lucide) {
                window.lucide.createIcons();
            }
            this.modeBtn.setAttribute('aria-label', mode === 'photo' ? 'Photo mode' : 'Video mode');
        }

        // Update capture button appearance
        this.captureBtn.classList.toggle('video-mode', mode === 'video');
    }

    /**
     * Toggle dropdown (effects or settings)
     */
    toggleDropdown(type) {
        const dropdown = type === 'effects' ? this.effectsDropdown : this.settingsDropdown;
        const btn = type === 'effects' ? this.effectsBtn : this.settingsBtn;
        const otherDropdown = type === 'effects' ? this.settingsDropdown : this.effectsDropdown;
        const otherBtn = type === 'effects' ? this.settingsBtn : this.effectsBtn;

        // Close other dropdown
        otherDropdown.classList.remove('visible');
        otherBtn.setAttribute('aria-expanded', 'false');

        // Toggle this dropdown
        const isVisible = dropdown.classList.toggle('visible');
        btn.setAttribute('aria-expanded', isVisible);

        // Populate effects if opening for first time
        if (isVisible && type === 'effects' && this.backgroundEffectsList.children.length === 0) {
            this.populateEffects();
        }

        // Populate skin tones if opening settings
        if (isVisible && type === 'settings' && this.skinTonesGrid.children.length === 0) {
            this.populateSkinTonesGrid();
        }
    }

    /**
     * Close all dropdowns
     */
    closeAllDropdowns() {
        this.effectsDropdown.classList.remove('visible');
        this.settingsDropdown.classList.remove('visible');
        this.effectsBtn.setAttribute('aria-expanded', 'false');
        this.settingsBtn.setAttribute('aria-expanded', 'false');
    }

    /**
     * Toggle countdown timer for photo capture
     */
    toggleCountdownTimer() {
        this.useCountdown = !this.useCountdown;
        this.timerToggleBtn.classList.toggle('active', this.useCountdown);
    }

    /**
     * Toggle character picker dropdown
     */
    toggleCharacterPicker() {
        const isVisible = this.characterPicker.classList.toggle('visible');

        // Close other dropdowns
        this.closeAllDropdowns();

        // Populate character dots if needed
        if (isVisible && this.characterDotsContainer.children.length === 0) {
            this.populateCharacterDots();
        }
    }

    /**
     * Populate skin tones grid in settings dropdown
     */
    populateSkinTonesGrid() {
        if (!this.characterManager) return;

        const skinTones = this.characterManager.getSkinTones();
        this.skinTonesGrid.innerHTML = '';

        skinTones.forEach(tone => {
            const swatch = document.createElement('button');
            swatch.className = 'effect-item';
            swatch.style.background = tone.color;
            swatch.title = tone.name;
            swatch.dataset.color = tone.color;

            swatch.addEventListener('click', () => {
                this.characterManager.setSkinColor(tone.color);
                this.updateSkinToneSelection(tone.color);
            });

            this.skinTonesGrid.appendChild(swatch);
        });
    }

    /**
     * Set up keyboard shortcuts
     */
    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Ignore if typing in input
            if (e.target.matches('input, textarea')) return;

            // Ignore if modal is open
            if (this.previewModal.style.display === 'flex') {
                // Escape to close preview
                if (e.key === 'Escape') {
                    this.closePreview();
                }
                // S to share
                if (e.key.toLowerCase() === 's') {
                    this.handleShare();
                }
                // D to download
                if (e.key.toLowerCase() === 'd') {
                    this.handleDownload();
                }
                return;
            }

            switch (e.key) {
                case ' ': // Spacebar - capture
                    e.preventDefault();
                    this.handleCapture();
                    break;
                case 'p': // P - photo mode
                    this.setMode('photo');
                    break;
                case 'v': // V - video mode
                    this.setMode('video');
                    break;
                case 't': // T - toggle timer
                    this.toggleCountdownTimer();
                    break;
                case 'f': // F - fullscreen
                    this.toggleFullscreen();
                    break;
                case 'm': // M - mute/unmute
                    this.toggleMute();
                    break;
                case 'e': // E - effects panel
                    this.toggleDropdown('effects');
                    break;
                case 'Escape': // Escape - close dropdowns
                    this.closeAllDropdowns();
                    break;
            }
        });
    }

    /**
     * Toggle fullscreen mode
     */
    async toggleFullscreen() {
        const container = this.root.querySelector('.filter-container');

        try {
            if (!document.fullscreenElement && !document.webkitFullscreenElement) {
                // Enter fullscreen
                if (container.requestFullscreen) {
                    await container.requestFullscreen();
                } else if (container.webkitRequestFullscreen) {
                    await container.webkitRequestFullscreen();
                }
            } else {
                // Exit fullscreen
                if (document.exitFullscreen) {
                    await document.exitFullscreen();
                } else if (document.webkitExitFullscreen) {
                    await document.webkitExitFullscreen();
                }
            }
        } catch (error) {
            console.error('Fullscreen error:', error);
        }
    }

    /**
     * Update fullscreen button icon
     */
    updateFullscreenIcon() {
        const isFullscreen = document.fullscreenElement || document.webkitFullscreenElement;
        const icon = this.fullscreenBtn.querySelector('i');

        if (icon) {
            icon.setAttribute('data-lucide', isFullscreen ? 'minimize' : 'maximize');
            // Re-render the icon
            if (window.lucide) {
                window.lucide.createIcons();
            }
        }

        this.fullscreenBtn.setAttribute('aria-label', isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen');
    }


    /**
     * Populate effects and filters lists
     */
    populateEffects() {
        if (!this.mediaCapture) return;

        // Populate virtual backgrounds
        if (this.segmentationManager && this.virtualBackgroundsList) {
            const backgrounds = this.segmentationManager.getBackgrounds();
            this.virtualBackgroundsList.innerHTML = '';

            backgrounds.forEach(bg => {
                const btn = document.createElement('button');
                btn.className = 'effect-item' + (bg.id === 'none' ? ' active' : '');
                btn.dataset.backgroundId = bg.id;
                btn.title = bg.name;

                if (bg.thumbnail || (bg.src && bg.type !== 'video')) {
                    // Show thumbnail preview (use generated thumbnail for videos, src for images)
                    const thumbSrc = bg.thumbnail || bg.src;
                    btn.innerHTML = `<img src="${thumbSrc}" alt="${bg.name}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 8px;" />`;
                } else {
                    btn.innerHTML = `<i data-lucide="${bg.icon}"></i>`;
                }

                btn.addEventListener('click', () => {
                    this.selectVirtualBackground(bg.id);
                });

                this.virtualBackgroundsList.appendChild(btn);
            });
        }

        // Populate background effects
        const bgEffects = this.mediaCapture.getBackgroundEffects();
        const effects = bgEffects.getEffects();

        this.backgroundEffectsList.innerHTML = '';
        effects.forEach(effect => {
            const btn = document.createElement('button');
            btn.className = 'effect-item' + (effect.id === 'none' ? ' active' : '');
            btn.dataset.effectId = effect.id;
            btn.title = effect.name;
            btn.innerHTML = `<i data-lucide="${effect.icon}"></i>`;

            btn.addEventListener('click', () => {
                this.selectBackgroundEffect(effect.id);
            });

            this.backgroundEffectsList.appendChild(btn);
        });

        // Populate photo filters
        const photoFilters = this.mediaCapture.getPhotoFilters();
        const filters = photoFilters.getFilters();

        this.photoFiltersList.innerHTML = '';
        filters.forEach(filter => {
            const btn = document.createElement('button');
            btn.className = 'effect-item' + (filter.id === 'none' ? ' active' : '');
            btn.dataset.filterId = filter.id;
            btn.title = filter.name;
            btn.innerHTML = `<i data-lucide="${filter.icon}"></i>`;

            btn.addEventListener('click', () => {
                this.selectPhotoFilter(filter.id);
            });

            this.photoFiltersList.appendChild(btn);
        });

        // Re-initialize Lucide icons
        if (window.lucide) {
            window.lucide.createIcons();
        }
    }

    /**
     * Select a virtual background
     */
    selectVirtualBackground(backgroundId) {
        if (!this.segmentationManager) return;

        this.segmentationManager.setBackground(backgroundId);

        // Update UI buttons
        const buttons = this.virtualBackgroundsList.querySelectorAll('.effect-item');
        buttons.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.backgroundId === backgroundId);
        });

        // If selecting a virtual background, disable other background effects
        if (backgroundId !== 'none') {
            this.selectBackgroundEffect('none');
        }
    }

    /**
     * Select a background effect
     */
    selectBackgroundEffect(effectId) {
        this.mediaCapture.setBackgroundEffect(effectId);

        // Update UI buttons
        const buttons = this.backgroundEffectsList.querySelectorAll('.effect-item');
        buttons.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.effectId === effectId);
        });

        // Apply to live video feed
        this.applyLiveBackgroundEffect(effectId);

        // If selecting a background effect, disable virtual background
        if (effectId !== 'none' && this.segmentationManager) {
            this.selectVirtualBackground('none');
        }
    }

    /**
     * Select a photo filter
     */
    selectPhotoFilter(filterId) {
        this.mediaCapture.setPhotoFilter(filterId);

        // Update UI buttons
        const buttons = this.photoFiltersList.querySelectorAll('.effect-item');
        buttons.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.filterId === filterId);
        });

        // Apply to live video feed
        this.applyLivePhotoFilter(filterId);
    }

    /**
     * Apply background effect to live video feed
     */
    applyLiveBackgroundEffect(effectId) {
        // Get or create overlay element for effects like vignette
        let overlay = this.root.querySelector('.live-effect-overlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.className = 'live-effect-overlay';
            this.root.querySelector('.video-container').appendChild(overlay);
        }

        // Reset overlay
        overlay.style.background = 'none';
        overlay.style.backdropFilter = 'none';

        // Apply blur to video element
        if (effectId === 'blur') {
            this.videoElement.style.filter = 'blur(8px)';
        } else {
            // Reset video filter (photo filter may override this)
            const currentPhotoFilter = this.mediaCapture.getPhotoFilters().getFilter();
            this.applyLivePhotoFilter(currentPhotoFilter);
        }

        // Apply overlay effects
        switch (effectId) {
            case 'warmTint':
                overlay.style.background = 'rgba(255, 200, 150, 0.15)';
                break;
            case 'coolTint':
                overlay.style.background = 'rgba(150, 200, 255, 0.15)';
                break;
            case 'vignette':
                overlay.style.background = 'radial-gradient(circle, transparent 30%, rgba(0,0,0,0.5) 100%)';
                break;
            case 'dramatic':
                overlay.style.background = 'radial-gradient(circle, transparent 20%, rgba(0,0,0,0.6) 100%)';
                break;
        }
    }

    /**
     * Apply photo filter to live video feed
     */
    applyLivePhotoFilter(filterId) {
        const filterStrings = {
            none: 'none',
            vintage: 'sepia(0.3) contrast(1.1) brightness(0.95)',
            bw: 'grayscale(1) contrast(1.2)',
            highContrast: 'contrast(1.4) saturate(1.2)',
            warm: 'sepia(0.1) saturate(1.2) brightness(1.05)',
            cool: 'saturate(0.9) brightness(1.05) hue-rotate(10deg)',
            fade: 'contrast(0.9) brightness(1.1) saturate(0.8)',
            drama: 'contrast(1.3) brightness(0.95) saturate(1.1)'
        };

        // Check if blur effect is active
        const currentBgEffect = this.mediaCapture.getBackgroundEffects().getEffect();
        if (currentBgEffect === 'blur') {
            // Combine blur with photo filter
            this.videoElement.style.filter = `blur(8px) ${filterStrings[filterId] || 'none'}`;
        } else {
            this.videoElement.style.filter = filterStrings[filterId] || 'none';
        }
    }

    /**
     * Start countdown before capture
     * @param {Function} callback - Function to call after countdown
     * @param {number} seconds - Countdown duration (default: 3)
     */
    startCountdown(callback, seconds = 3) {
        if (this.countdownActive) return;

        this.countdownActive = true;
        this.countdownOverlay.style.display = 'flex';
        let count = seconds;

        const tick = () => {
            if (count <= 0) {
                this.countdownOverlay.style.display = 'none';
                this.countdownActive = false;
                callback();
                return;
            }

            this.countdownNumber.textContent = count;
            this.countdownNumber.classList.remove('pulse');
            // Trigger reflow to restart animation
            void this.countdownNumber.offsetWidth;
            this.countdownNumber.classList.add('pulse');

            // Play countdown beep
            this.soundManager.play('countdown');

            count--;
            setTimeout(tick, 1000);
        };

        tick();
    }

    /**
     * Toggle sound mute
     */
    toggleMute() {
        const isMuted = this.soundManager.toggleMute();
        this.updateMuteIcon(isMuted);
    }

    /**
     * Update mute button icon
     */
    updateMuteIcon(isMuted) {
        const icon = this.muteBtn.querySelector('i');
        if (icon) {
            icon.setAttribute('data-lucide', isMuted ? 'volume-x' : 'volume-2');
            if (window.lucide) {
                window.lucide.createIcons();
            }
        }
        this.muteBtn.setAttribute('aria-label', isMuted ? 'Enable sound effects' : 'Disable sound effects');
    }

    /**
     * Clean up resources
     */
    destroy() {
        // Stop performance monitoring
        if (this.performanceMonitor) {
            this.performanceMonitor.stop();
        }

        // Dispose sound manager
        if (this.soundManager) {
            this.soundManager.dispose();
        }

        if (this.mediaCapture) {
            this.mediaCapture.dispose();
        }

        if (this.uiController) {
            this.uiController.dispose();
        }

        if (this.faceTracker) {
            this.faceTracker.stop();
        }

        if (this.segmentationManager) {
            this.segmentationManager.dispose();
        }

        if (this.characterManager) {
            this.characterManager.dispose();
        }

        if (this.cameraManager) {
            this.cameraManager.stop();
        }

        if (this.renderer) {
            this.renderer.stop();
        }

        // Stop recording timer if active
        this.stopRecordingTimer();

        // Clear all event listeners
        this.events.clear();

        this.state.initialized = false;
    }
}

export default FilterApp;
