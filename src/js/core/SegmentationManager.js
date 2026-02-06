/**
 * SegmentationManager - Handles person segmentation for virtual backgrounds
 *
 * Uses MediaPipe Selfie Segmentation to separate person from background
 */

class SegmentationManager {
    constructor(videoElement, events) {
        this.video = videoElement;
        this.events = events;
        this.segmentation = null;
        this.isRunning = false;
        this.isProcessing = false;
        this.hasMask = false;
        this.maskCanvas = null;
        this.maskCtx = null;
        this.currentBackground = null;
        this.backgroundImage = null;
        this.enabled = false;

        // Reusable canvases for performance
        this.tempCanvas = null;
        this.tempCtx = null;
        this.blurredMaskCanvas = null;
        this.blurredMaskCtx = null;

        // Frame skipping for segmentation (run every N frames, reuse mask between)
        this.frameCount = 0;
        this.segmentEveryN = 2;

        // Background video element (for video backgrounds)
        this.backgroundVideo = null;

        // Available backgrounds
        this.backgrounds = [
            { id: 'none', name: 'None', icon: 'circle-off', src: null },
            { id: 'subway', name: 'Subway', icon: 'train', src: '/assets/backgrounds/Subway_Website.webm', type: 'video' }
        ];
    }

    /**
     * Initialize the segmentation model
     */
    async initialize() {
        console.log('SegmentationManager: Initializing...');

        // Create mask canvas for segmentation output
        this.maskCanvas = document.createElement('canvas');
        this.maskCtx = this.maskCanvas.getContext('2d', { willReadFrequently: true });

        // Check if SelfieSegmentation is available
        if (typeof SelfieSegmentation === 'undefined') {
            console.warn('SegmentationManager: SelfieSegmentation not available');
            return false;
        }

        try {
            this.segmentation = new SelfieSegmentation({
                locateFile: (file) => {
                    return `https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation/${file}`;
                }
            });

            this.segmentation.setOptions({
                modelSelection: 1, // 0 = general, 1 = landscape (faster)
                selfieMode: true
            });

            this.segmentation.onResults((results) => this.onResults(results));

            // Initialize the model
            await this.segmentation.initialize();

            // Generate thumbnails for video backgrounds
            await this.generateThumbnails();

            console.log('SegmentationManager: Initialized successfully');
            return true;
        } catch (error) {
            console.error('SegmentationManager: Failed to initialize', error);
            return false;
        }
    }

    /**
     * Start segmentation processing
     */
    async start() {
        if (!this.segmentation || this.isRunning) return;

        this.isRunning = true;
        this.processFrame();
    }

    /**
     * Stop segmentation processing
     */
    stop() {
        this.isRunning = false;
    }

    /**
     * Process a single frame (internal loop)
     */
    async processFrame() {
        if (!this.isRunning || !this.enabled) {
            // If not enabled, still schedule next frame to check
            if (this.isRunning) {
                requestAnimationFrame(() => this.processFrame());
            }
            return;
        }

        if (this.video.readyState >= 2) {
            try {
                await this.segmentation.send({ image: this.video });
            } catch (error) {
                console.error('SegmentationManager: Frame processing error', error);
            }
        }

        requestAnimationFrame(() => this.processFrame());
    }

    /**
     * Process current frame (fire and forget)
     * Called from the render loop - results update mask asynchronously
     */
    processCurrentFrame() {
        if (!this.segmentation || !this.enabled || this.video.readyState < 2) {
            return;
        }

        // Skip frames — reuse the last mask between segmentation runs
        this.frameCount++;
        if (this.frameCount % this.segmentEveryN !== 0) {
            return;
        }

        // Don't send if already processing
        if (this.isProcessing) {
            return;
        }

        this.isProcessing = true;

        this.segmentation.send({ image: this.video }).then(() => {
            this.isProcessing = false;
        }).catch((error) => {
            console.error('SegmentationManager: Frame processing error', error);
            this.isProcessing = false;
        });
    }

    /**
     * Handle segmentation results
     */
    onResults(results) {
        if (!results.segmentationMask) {
            if (this.pendingResolve) {
                this.pendingResolve();
                this.pendingResolve = null;
            }
            return;
        }

        // Update mask canvas size if needed
        if (this.maskCanvas.width !== this.video.videoWidth ||
            this.maskCanvas.height !== this.video.videoHeight) {
            this.maskCanvas.width = this.video.videoWidth;
            this.maskCanvas.height = this.video.videoHeight;
        }

        // Clear and draw the segmentation mask (scaled to fill canvas)
        this.maskCtx.clearRect(0, 0, this.maskCanvas.width, this.maskCanvas.height);
        this.maskCtx.drawImage(
            results.segmentationMask,
            0, 0,
            this.maskCanvas.width,
            this.maskCanvas.height
        );

        // Mark that we have a valid mask
        this.hasMask = true;

        // Resolve pending promise if waiting
        if (this.pendingResolve) {
            this.pendingResolve();
            this.pendingResolve = null;
        }

        // Emit event with mask data
        this.events.emit('segmentationUpdate', {
            mask: this.maskCanvas,
            width: this.maskCanvas.width,
            height: this.maskCanvas.height
        });
    }

    /**
     * Set the virtual background
     * @param {string} backgroundId - ID of the background to use
     */
    async setBackground(backgroundId) {
        const background = this.backgrounds.find(b => b.id === backgroundId);

        if (!background) {
            console.warn('SegmentationManager: Unknown background', backgroundId);
            return;
        }

        this.currentBackground = backgroundId;

        if (backgroundId === 'none' || !background.src) {
            this.enabled = false;
            this.backgroundImage = null;
            this.stopBackgroundVideo();
            this.hasMask = false;
            this.events.emit('backgroundChanged', { id: 'none', enabled: false });
            return;
        }

        // Load background (image or video)
        try {
            this.stopBackgroundVideo();

            if (background.type === 'video') {
                this.backgroundVideo = await this.loadVideo(background.src);
                this.backgroundImage = this.backgroundVideo;
            } else {
                this.backgroundImage = await this.loadImage(background.src);
            }

            this.enabled = true;
            this.hasMask = false;
            this.isProcessing = false;
            this.events.emit('backgroundChanged', {
                id: backgroundId,
                enabled: true,
                image: this.backgroundImage
            });
            console.log('SegmentationManager: Background set to', backgroundId);
        } catch (error) {
            console.error('SegmentationManager: Failed to load background', error);
            this.enabled = false;
        }
    }

    /**
     * Load an image
     */
    loadImage(src) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => resolve(img);
            img.onerror = reject;
            img.src = src;
        });
    }

    /**
     * Load a video for use as background
     */
    loadVideo(src) {
        return new Promise((resolve, reject) => {
            const video = document.createElement('video');
            video.crossOrigin = 'anonymous';
            video.loop = true;
            video.muted = true;
            video.playsInline = true;
            video.src = src;

            video.onloadeddata = () => {
                video.play().then(() => resolve(video)).catch(reject);
            };
            video.onerror = reject;
        });
    }

    /**
     * Generate thumbnail images from the first frame of video backgrounds
     */
    async generateThumbnails() {
        for (const bg of this.backgrounds) {
            if (bg.type !== 'video' || !bg.src) continue;

            try {
                const thumbnail = await this.extractFirstFrame(bg.src);
                bg.thumbnail = thumbnail;
            } catch (error) {
                console.warn('SegmentationManager: Failed to generate thumbnail for', bg.id, error);
            }
        }
    }

    /**
     * Extract the first frame of a video as a data URL
     */
    extractFirstFrame(src) {
        return new Promise((resolve, reject) => {
            const video = document.createElement('video');
            video.crossOrigin = 'anonymous';
            video.muted = true;
            video.playsInline = true;
            video.preload = 'auto';
            video.src = src;

            video.onloadeddata = () => {
                // Seek to first frame
                video.currentTime = 0.1;
            };

            video.onseeked = () => {
                const canvas = document.createElement('canvas');
                canvas.width = 120;
                canvas.height = 80;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                const dataUrl = canvas.toDataURL('image/jpeg', 0.7);

                // Clean up
                video.src = '';
                resolve(dataUrl);
            };

            video.onerror = reject;
        });
    }

    /**
     * Stop and clean up background video
     */
    stopBackgroundVideo() {
        if (this.backgroundVideo) {
            this.backgroundVideo.pause();
            this.backgroundVideo.src = '';
            this.backgroundVideo = null;
        }
    }

    /**
     * Get available backgrounds
     */
    getBackgrounds() {
        return this.backgrounds;
    }

    /**
     * Get current background ID
     */
    getCurrentBackground() {
        return this.currentBackground || 'none';
    }

    /**
     * Check if segmentation is enabled
     */
    isEnabled() {
        return this.enabled;
    }

    /**
     * Get the current background image
     */
    getBackgroundImage() {
        return this.backgroundImage;
    }

    /**
     * Get the current mask canvas
     */
    getMaskCanvas() {
        return this.maskCanvas;
    }

    /**
     * Composite person over background using GPU-accelerated canvas compositing.
     * No pixel loops — uses globalCompositeOperation + canvas filter blur.
     */
    compositeFrame(ctx, video, width, height) {
        if (!this.enabled || !this.backgroundImage || !this.maskCanvas || !this.hasMask) {
            return false;
        }

        // Ensure temp canvases exist at the right size
        if (!this.tempCanvas || this.tempCanvas.width !== width || this.tempCanvas.height !== height) {
            this.tempCanvas = document.createElement('canvas');
            this.tempCanvas.width = width;
            this.tempCanvas.height = height;
            this.tempCtx = this.tempCanvas.getContext('2d');

            this.blurredMaskCanvas = document.createElement('canvas');
            this.blurredMaskCanvas.width = width;
            this.blurredMaskCanvas.height = height;
            this.blurredMaskCtx = this.blurredMaskCanvas.getContext('2d');
        }

        // --- Step 1: Create blurred mask (GPU-accelerated blur) ---
        this.blurredMaskCtx.clearRect(0, 0, width, height);
        this.blurredMaskCtx.filter = 'blur(4px)';
        this.blurredMaskCtx.drawImage(this.maskCanvas, 0, 0, width, height);
        this.blurredMaskCtx.filter = 'none';

        // --- Step 2: Draw mirrored video onto temp canvas ---
        this.tempCtx.save();
        this.tempCtx.translate(width, 0);
        this.tempCtx.scale(-1, 1);
        this.tempCtx.drawImage(video, 0, 0, width, height);
        this.tempCtx.restore();

        // --- Step 3: Use mask to cut out person (destination-in) ---
        this.tempCtx.globalCompositeOperation = 'destination-in';
        this.tempCtx.drawImage(this.blurredMaskCanvas, 0, 0);
        this.tempCtx.globalCompositeOperation = 'source-over';

        // --- Step 4: Draw background, then masked person on top ---
        ctx.save();

        // Background (cover fit, not mirrored)
        const bgW = this.backgroundImage.videoWidth || this.backgroundImage.width;
        const bgH = this.backgroundImage.videoHeight || this.backgroundImage.height;
        const bgAspect = bgW / bgH;
        const canvasAspect = width / height;

        let drawWidth, drawHeight, drawX, drawY;
        if (bgAspect > canvasAspect) {
            drawHeight = height;
            drawWidth = height * bgAspect;
            drawX = (width - drawWidth) / 2;
            drawY = 0;
        } else {
            drawWidth = width;
            drawHeight = width / bgAspect;
            drawX = 0;
            drawY = (height - drawHeight) / 2;
        }

        ctx.drawImage(this.backgroundImage, drawX, drawY, drawWidth, drawHeight);

        // Person cutout on top
        ctx.drawImage(this.tempCanvas, 0, 0);

        ctx.restore();

        return true;
    }

    /**
     * Dispose resources
     */
    dispose() {
        this.stop();
        if (this.segmentation) {
            this.segmentation.close();
            this.segmentation = null;
        }
        this.maskCanvas = null;
        this.backgroundImage = null;
        this.stopBackgroundVideo();
    }
}

export default SegmentationManager;
