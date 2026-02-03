/**
 * FilterApp - Main Application Orchestrator
 *
 * Coordinates all modules and manages application lifecycle.
 * This is the most critical file - it initializes modules in dependency order
 * and wires events between them.
 */

import CameraManager from './CameraManager.js';
import ThreeRenderer from './ThreeRenderer.js';
import FaceTracker from './FaceTracker.js';
import CharacterManager from './CharacterManager.js';
import UIController from './UIController.js';
import MediaCapture from './MediaCapture.js';
import EventEmitter from '../utils/EventEmitter.js';
import ErrorHandler from '../utils/ErrorHandler.js';
import PerformanceMonitor from '../utils/PerformanceMonitor.js';

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

        // Error handling and performance monitoring
        this.errorHandler = new ErrorHandler(this.events);
        this.performanceMonitor = new PerformanceMonitor(this.events);

        // Module instances (will be initialized in init())
        this.cameraManager = null;
        this.renderer = null;
        this.faceTracker = null;
        this.characterManager = null;
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
                        <div class="loading-spinner"></div>
                        <div class="loading-text">Initializing camera...</div>
                        <div class="loading-subtext">Please allow camera access when prompted</div>
                    </div>
                </div>
                <div class="video-container">
                    <video id="camera-video" autoplay playsinline></video>
                    <canvas id="filter-canvas"></canvas>
                </div>
                <div class="controls">
                    <button id="close-btn" class="btn-close" aria-label="Close filter">
                        <i data-lucide="x"></i>
                    </button>
                </div>
                <div class="capture-controls">
                    <button id="photo-btn" class="btn-capture btn-photo" title="Take Photo" aria-label="Take photo">
                        <i data-lucide="camera"></i>
                    </button>
                    <button id="video-btn" class="btn-capture btn-video" title="Record Video" aria-label="Record video">
                        <i data-lucide="video"></i>
                    </button>
                    <button id="stop-btn" class="btn-capture btn-stop" style="display: none;" title="Stop Recording" aria-label="Stop recording">
                        <i data-lucide="square"></i>
                    </button>
                    <div class="recording-timer" style="display: none;" aria-live="polite" aria-atomic="true">00:00</div>
                </div>
                <div class="debug-info">
                    <div id="fps-counter">FPS: --</div>
                    <div id="face-status">Face: Searching...</div>
                </div>
                <div class="character-indicator" role="navigation" aria-label="Character selection">
                    <div class="character-dots" role="tablist" aria-label="Characters">
                        <!-- Dots generated dynamically based on available characters -->
                    </div>
                    <div class="character-name" aria-live="polite"></div>
                    <div class="swipe-hint" aria-hidden="true">← Swipe to switch →</div>
                </div>
                <div class="skin-color-picker">
                    <button class="skin-picker-toggle" title="Change Skin Color" aria-label="Change skin color" aria-expanded="false" aria-controls="skin-picker-panel">
                        <i data-lucide="palette"></i>
                    </button>
                    <div id="skin-picker-panel" class="skin-picker-panel" style="display: none;" role="dialog" aria-label="Skin color picker">
                        <div class="skin-picker-header">
                            <span id="skin-picker-title">Skin Tone</span>
                            <button class="skin-reset-btn" title="Reset to Original" aria-label="Reset skin color to original">
                                <i data-lucide="undo-2"></i>
                            </button>
                        </div>
                        <div class="skin-tones" role="group" aria-labelledby="skin-picker-title"></div>
                    </div>
                </div>
                <div class="error-message" style="display: none;"></div>
                <div class="preview-modal" style="display: none;" role="dialog" aria-label="Media preview" aria-modal="true">
                    <div class="preview-content">
                        <button class="preview-close" aria-label="Close preview"><i data-lucide="x"></i></button>
                        <img class="preview-image" style="display: none;" alt="Captured photo preview" />
                        <video class="preview-video" style="display: none;" controls autoplay loop muted aria-label="Captured video preview"></video>
                        <div class="preview-actions">
                            <button class="btn-preview btn-download" aria-label="Download media"><i data-lucide="download"></i> Download</button>
                            <button class="btn-preview btn-share" aria-label="Share media"><i data-lucide="share-2"></i> Share</button>
                            <button class="btn-preview btn-retake" aria-label="Close and retake"><i data-lucide="refresh-cw"></i> Retake</button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Store references to key elements
        this.videoElement = this.root.querySelector('#camera-video');
        this.canvasElement = this.root.querySelector('#filter-canvas');
        this.errorElement = this.root.querySelector('.error-message');
        this.fpsCounter = this.root.querySelector('#fps-counter');
        this.faceStatus = this.root.querySelector('#face-status');
        this.characterDotsContainer = this.root.querySelector('.character-dots');
        this.characterDots = []; // Will be populated dynamically
        this.characterName = this.root.querySelector('.character-name');

        // Loading overlay elements
        this.loadingOverlay = this.root.querySelector('#loading-overlay');
        this.loadingText = this.root.querySelector('.loading-text');
        this.loadingSubtext = this.root.querySelector('.loading-subtext');

        // Capture controls
        this.photoBtn = this.root.querySelector('#photo-btn');
        this.videoBtn = this.root.querySelector('#video-btn');
        this.stopBtn = this.root.querySelector('#stop-btn');
        this.recordingTimer = this.root.querySelector('.recording-timer');

        // Preview modal
        this.previewModal = this.root.querySelector('.preview-modal');
        this.previewImage = this.root.querySelector('.preview-image');
        this.previewVideo = this.root.querySelector('.preview-video');
        this.previewClose = this.root.querySelector('.preview-close');
        this.downloadBtn = this.root.querySelector('.btn-download');
        this.shareBtn = this.root.querySelector('.btn-share');
        this.retakeBtn = this.root.querySelector('.btn-retake');

        // Skin color picker elements
        this.skinPickerToggle = this.root.querySelector('.skin-picker-toggle');
        this.skinPickerPanel = this.root.querySelector('.skin-picker-panel');
        this.skinTonesContainer = this.root.querySelector('.skin-tones');
        this.skinResetBtn = this.root.querySelector('.skin-reset-btn');

        // Skin picker toggle
        this.skinPickerToggle.addEventListener('click', () => {
            this.toggleSkinPicker();
        });

        // Skin reset button
        this.skinResetBtn.addEventListener('click', () => {
            this.characterManager?.resetSkinColor();
            this.updateSkinToneSelection(null);
        });

        // Close skin picker when clicking outside
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.skin-color-picker')) {
                this.skinPickerPanel.style.display = 'none';
                this.skinPickerToggle.setAttribute('aria-expanded', 'false');
            }
        });

        // Add click handlers to capture buttons
        this.photoBtn.addEventListener('click', () => this.handlePhotoCapture());
        this.videoBtn.addEventListener('click', () => this.handleVideoStart());
        this.stopBtn.addEventListener('click', () => this.handleVideoStop());

        // Add click handlers to preview modal
        this.previewClose.addEventListener('click', () => this.closePreview());
        this.retakeBtn.addEventListener('click', () => this.closePreview());
        this.downloadBtn.addEventListener('click', () => this.handleDownload());
        this.shareBtn.addEventListener('click', () => this.handleShare());

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

        // 1. Camera Manager (no dependencies)
        this.updateLoadingText('Setting up camera...', 'Please allow camera access when prompted');
        this.cameraManager = new CameraManager(this.videoElement);

        // 2. Three.js Renderer (needs canvas element)
        this.updateLoadingText('Initializing 3D engine...', '');
        this.renderer = new ThreeRenderer(this.canvasElement, this.events);

        // 3. Character Manager (needs Three.js scene)
        this.updateLoadingText('Loading character...', 'This may take a moment');
        this.characterManager = new CharacterManager(this.renderer.scene, this.events);
        await this.characterManager.initialize();

        // Populate character selector after characters are loaded
        this.populateCharacterDots();

        // Set up thumbnail event handler immediately (before thumbnails finish generating)
        this.events.on('thumbnailGenerated', (data) => {
            this.updateCharacterDotThumbnail(data.index, data.thumbnail);
        });

        // 4. Face Tracker (needs video element and event emitter)
        this.updateLoadingText('Starting face tracking...', 'Almost ready!');
        this.faceTracker = new FaceTracker(this.videoElement, this.events);

        // 5. UI Controller (needs container element)
        this.uiController = new UIController(this.root, this.events);
        this.uiController.initialize();

        // 6. Media Capture (needs canvas and video elements)
        this.mediaCapture = new MediaCapture(this.canvasElement, this.videoElement, this.events);
        await this.mediaCapture.initialize();

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

            // Update character name display
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
        this.updateLoadingText('Starting camera...', '');
        await this.cameraManager.start();
        this.state.cameraActive = true;

        // Start renderer
        this.renderer.start();
        this.state.renderingActive = true;

        // Start face tracking (after camera is ready)
        this.updateLoadingText('Starting face tracking...', 'Look at the camera');
        await this.faceTracker.start();
        this.state.faceTracking = true;

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

        // Build error HTML
        const html = `
            <div class="error-content">
                <div class="error-icon"><i data-lucide="alert-triangle"></i></div>
                <h3 class="error-title">${errorInfo.title}</h3>
                <p class="error-message">${errorInfo.message}</p>
                ${errorInfo.retryable && errorInfo.canRetry !== false ?
                    '<button class="error-retry-btn"><i data-lucide="refresh-cw"></i> Retry</button>' :
                    '<button class="error-close-btn"><i data-lucide="x"></i> Close</button>'}
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
     */
    handlePhotoCapture() {
        if (this.state.isRecording) {
            console.warn('Cannot take photo while recording');
            return;
        }

        this.mediaCapture.capturePhoto();
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
     * Update recording UI (buttons, timer)
     */
    updateRecordingUI(isRecording) {
        if (isRecording) {
            this.videoBtn.style.display = 'none';
            this.stopBtn.style.display = 'block';
            this.recordingTimer.style.display = 'block';
            this.photoBtn.disabled = true;
            this.photoBtn.style.opacity = '0.5';
        } else {
            this.videoBtn.style.display = 'block';
            this.stopBtn.style.display = 'none';
            this.recordingTimer.style.display = 'none';
            this.photoBtn.disabled = false;
            this.photoBtn.style.opacity = '1';
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
            this.recordingTimer.textContent = `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
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
        this.recordingTimer.textContent = '00:00';
    }

    /**
     * Show preview modal
     */
    showPreview(type, media) {
        this.currentPreviewType = type;
        this.currentPreviewMedia = media;

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
        if (this.currentPreviewType === 'photo') {
            await this.mediaCapture.sharePhoto(this.currentPreviewMedia);
        } else {
            await this.mediaCapture.shareVideo(this.currentPreviewMedia);
        }
        // Don't close preview automatically (user might want to share again)
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

        // Set initial character name
        if (characters.length > 0) {
            this.characterName.textContent = characters[0].name;
        }

        // Hide dots container if only one character
        if (characters.length <= 1) {
            this.characterDotsContainer.style.display = 'none';
            this.root.querySelector('.swipe-hint').style.display = 'none';
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
    updateLoadingText(text, subtext = '') {
        if (this.loadingText) {
            this.loadingText.textContent = text;
        }
        if (this.loadingSubtext) {
            this.loadingSubtext.textContent = subtext;
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
     * Show loading overlay
     */
    showLoading(text = 'Loading...', subtext = '') {
        if (this.loadingOverlay) {
            this.loadingOverlay.classList.remove('hidden');
            this.updateLoadingText(text, subtext);
        }
    }

    /**
     * Toggle skin color picker panel
     */
    toggleSkinPicker() {
        const isVisible = this.skinPickerPanel.style.display !== 'none';
        this.skinPickerPanel.style.display = isVisible ? 'none' : 'block';

        // Update ARIA expanded state
        this.skinPickerToggle.setAttribute('aria-expanded', !isVisible);

        // Populate skin tones if not already done
        if (!isVisible && this.skinTonesContainer.children.length === 0) {
            this.populateSkinTones();
        }
    }

    /**
     * Populate skin tone swatches
     */
    populateSkinTones() {
        if (!this.characterManager) return;

        const skinTones = this.characterManager.getSkinTones();
        this.skinTonesContainer.innerHTML = '';

        skinTones.forEach(tone => {
            const swatch = document.createElement('button');
            swatch.className = 'skin-swatch';
            swatch.style.backgroundColor = tone.color;
            swatch.title = tone.name;
            swatch.dataset.color = tone.color;

            swatch.addEventListener('click', () => {
                this.characterManager.setSkinColor(tone.color);
                this.updateSkinToneSelection(tone.color);
            });

            this.skinTonesContainer.appendChild(swatch);
        });

        // Add custom color input
        const customLabel = document.createElement('label');
        customLabel.className = 'skin-custom';
        customLabel.innerHTML = `
            <input type="color" class="skin-custom-input" value="#EAC086" title="Custom Color">
            <span class="skin-custom-icon"><i data-lucide="pipette"></i></span>
        `;
        this.skinTonesContainer.appendChild(customLabel);

        // Handle custom color input
        const customInput = customLabel.querySelector('.skin-custom-input');
        customInput.addEventListener('input', (e) => {
            this.characterManager.setSkinColor(e.target.value);
            this.updateSkinToneSelection(e.target.value);
        });

        // Re-initialize lucide icons
        if (window.lucide) {
            window.lucide.createIcons();
        }
    }

    /**
     * Update which skin tone swatch is selected
     */
    updateSkinToneSelection(selectedColor) {
        const swatches = this.skinTonesContainer.querySelectorAll('.skin-swatch');
        swatches.forEach(swatch => {
            if (swatch.dataset.color === selectedColor) {
                swatch.classList.add('selected');
            } else {
                swatch.classList.remove('selected');
            }
        });
    }

    /**
     * Clean up resources
     */
    destroy() {
        // Stop performance monitoring
        if (this.performanceMonitor) {
            this.performanceMonitor.stop();
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
