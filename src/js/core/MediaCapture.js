/**
 * MediaCapture - Handles photo and video capture
 *
 * Captures from canvas (with character overlay) and includes audio from microphone.
 * Provides download and native share functionality.
 */

import BackgroundEffects from '../effects/BackgroundEffects.js';
import PhotoFilters from '../effects/PhotoFilters.js';

class MediaCapture {
    constructor(canvasElement, videoElement, eventEmitter) {
        this.canvas = canvasElement;
        this.video = videoElement;
        this.events = eventEmitter;

        // Recording state
        this.isRecording = false;
        this.mediaRecorder = null;
        this.recordedChunks = [];
        this.recordingStartTime = 0;
        this.maxRecordingDuration = 30000; // 30 seconds max

        // Captured media
        this.lastCapturedPhoto = null;
        this.lastCapturedVideo = null;

        // Audio stream
        this.audioStream = null;

        // Composite canvas for combining video + 3D overlay
        this.compositeCanvas = null;
        this.compositeCtx = null;
        this.compositeAnimationId = null;

        // Effects and filters
        this.backgroundEffects = new BackgroundEffects();
        this.photoFilters = new PhotoFilters();

        // Segmentation manager (for virtual backgrounds)
        this.segmentationManager = null;
    }

    /**
     * Set the segmentation manager for virtual backgrounds
     */
    setSegmentationManager(segmentationManager) {
        this.segmentationManager = segmentationManager;
    }

    /**
     * Initialize media capture
     */
    async initialize() {
        console.log('MediaCapture: Initializing...');

        // Create composite canvas for combining video + 3D overlay
        this.compositeCanvas = document.createElement('canvas');
        this.compositeCtx = this.compositeCanvas.getContext('2d');

        try {
            // Request audio permission for video recording
            this.audioStream = await navigator.mediaDevices.getUserMedia({
                audio: true,
                video: false
            });

            console.log('MediaCapture: Audio access granted');
        } catch (error) {
            console.warn('MediaCapture: Audio access denied - videos will have no sound', error);
            // Continue without audio (photos still work)
        }

        console.log('MediaCapture: Initialized');
    }

    /**
     * Draw composite frame (video + 3D overlay)
     * @param {boolean} applyEffects - Whether to apply background effects (default: true)
     */
    drawCompositeFrame(applyEffects = true) {
        // Use the 3D canvas dimensions (matches the live viewport) so the
        // character overlay aligns exactly with what the user sees on screen.
        const width = this.canvas.width || this.video.videoWidth || 640;
        const height = this.canvas.height || this.video.videoHeight || 480;

        // Ensure composite canvas is sized correctly
        if (this.compositeCanvas.width !== width || this.compositeCanvas.height !== height) {
            this.compositeCanvas.width = width;
            this.compositeCanvas.height = height;
            console.log(`MediaCapture: Composite canvas sized to ${width}x${height}`);
        }

        // Clear the canvas first
        this.compositeCtx.clearRect(0, 0, width, height);

        // Check if virtual background is enabled
        const useVirtualBg = this.segmentationManager && this.segmentationManager.isEnabled();

        if (useVirtualBg) {
            // compositeFrame already handles mirroring internally — no extra mirror here
            const composited = this.segmentationManager.compositeFrame(
                this.compositeCtx, this.video, width, height
            );

            if (!composited) {
                // Fallback to regular mirrored video with cover-fit
                this.drawVideoCoverFit(this.compositeCtx, width, height, true);
            }
        } else {
            // Apply pre-effect (like blur) if enabled
            if (applyEffects && this.backgroundEffects.hasPreEffect()) {
                this.backgroundEffects.applyPreEffect(this.compositeCtx);
            }

            // Draw video (cover-fit + mirrored to match CSS object-fit: cover + scaleX(-1))
            if (this.video.readyState >= 2) {
                this.drawVideoCoverFit(this.compositeCtx, width, height, true);
            }

            // Reset pre-effect filter before drawing overlay
            if (applyEffects && this.backgroundEffects.hasPreEffect()) {
                this.backgroundEffects.resetPreEffect(this.compositeCtx);
            }

            // Apply post-effects (overlays like vignette, tints)
            if (applyEffects) {
                this.backgroundEffects.applyPostEffect(this.compositeCtx, width, height);
            }
        }

        // Draw 3D canvas overlay on top — composite canvas is the same
        // size as the 3D canvas, so draw it 1:1 with no scaling
        this.compositeCtx.drawImage(this.canvas, 0, 0, width, height);
    }

    /**
     * Draw video onto a canvas context using cover-fit (crop, no stretch).
     * Replicates CSS object-fit: cover behavior.
     * @param {CanvasRenderingContext2D} ctx - Target context
     * @param {number} destW - Destination width
     * @param {number} destH - Destination height
     * @param {boolean} mirror - Whether to mirror horizontally (selfie mode)
     */
    drawVideoCoverFit(ctx, destW, destH, mirror = false) {
        const srcW = this.video.videoWidth;
        const srcH = this.video.videoHeight;
        if (!srcW || !srcH) return;

        const srcAspect = srcW / srcH;
        const destAspect = destW / destH;

        // Calculate source crop rect (center crop to match destination aspect)
        let sx, sy, sw, sh;
        if (srcAspect > destAspect) {
            // Video is wider — crop sides
            sh = srcH;
            sw = srcH * destAspect;
            sx = (srcW - sw) / 2;
            sy = 0;
        } else {
            // Video is taller — crop top/bottom
            sw = srcW;
            sh = srcW / destAspect;
            sx = 0;
            sy = (srcH - sh) / 2;
        }

        ctx.save();
        if (mirror) {
            ctx.translate(destW, 0);
            ctx.scale(-1, 1);
        }
        ctx.drawImage(this.video, sx, sy, sw, sh, 0, 0, destW, destH);
        ctx.restore();
    }

    /**
     * Start composite rendering loop (for video recording)
     */
    startCompositeLoop() {
        const loop = () => {
            if (!this.isRecording) return;
            this.drawCompositeFrame();
            this.compositeAnimationId = requestAnimationFrame(loop);
        };
        loop();
    }

    /**
     * Stop composite rendering loop
     */
    stopCompositeLoop() {
        if (this.compositeAnimationId) {
            cancelAnimationFrame(this.compositeAnimationId);
            this.compositeAnimationId = null;
        }
    }

    /**
     * Capture photo from composite canvas (video + 3D overlay)
     */
    capturePhoto() {
        console.log('MediaCapture: Capturing photo...');

        try {
            // Draw composite frame first
            this.drawCompositeFrame();

            // Apply photo filter if set
            const filterString = this.photoFilters.getFilterString();
            let captureCanvas = this.compositeCanvas;

            if (filterString !== 'none') {
                // Create a filtered copy
                captureCanvas = this.photoFilters.createFilteredCanvas(this.compositeCanvas);
            }

            // Capture canvas as blob
            captureCanvas.toBlob((blob) => {
                if (!blob) {
                    throw new Error('Failed to capture canvas');
                }

                this.lastCapturedPhoto = {
                    blob,
                    url: URL.createObjectURL(blob),
                    timestamp: Date.now(),
                    filename: `beastside-filter-${Date.now()}.jpg`,
                    filter: this.photoFilters.getFilter(),
                    backgroundEffect: this.backgroundEffects.getEffect()
                };

                console.log('MediaCapture: Photo captured');
                this.events.emit('photoCaptured', this.lastCapturedPhoto);
            }, 'image/jpeg', 0.95); // High quality JPEG
        } catch (error) {
            console.error('MediaCapture: Photo capture failed', error);
            this.events.emit('captureError', { type: 'photo', error });
        }
    }

    /**
     * Start video recording
     */
    async startRecording() {
        if (this.isRecording) {
            console.warn('MediaCapture: Already recording');
            return;
        }

        console.log('MediaCapture: Starting video recording...');

        try {
            // Initialize composite canvas size
            this.drawCompositeFrame();

            // Start composite rendering loop
            this.isRecording = true;
            this.startCompositeLoop();

            // Create stream from composite canvas (video + 3D overlay)
            const canvasStream = this.compositeCanvas.captureStream(30); // 30 FPS

            // Combine canvas video with audio
            let combinedStream;
            if (this.audioStream) {
                const audioTracks = this.audioStream.getAudioTracks();
                const videoTracks = canvasStream.getVideoTracks();
                combinedStream = new MediaStream([...videoTracks, ...audioTracks]);
            } else {
                // Video only (no audio)
                combinedStream = canvasStream;
            }

            // Determine best codec
            const mimeType = this.getBestMimeType();
            console.log(`MediaCapture: Using codec: ${mimeType}`);

            // Create MediaRecorder
            this.mediaRecorder = new MediaRecorder(combinedStream, {
                mimeType,
                videoBitsPerSecond: 2500000 // 2.5 Mbps
            });

            // Handle data available
            this.mediaRecorder.ondataavailable = (event) => {
                if (event.data && event.data.size > 0) {
                    this.recordedChunks.push(event.data);
                }
            };

            // Handle recording stop
            this.mediaRecorder.onstop = () => {
                this.handleRecordingStop();
            };

            // Handle errors
            this.mediaRecorder.onerror = (error) => {
                console.error('MediaCapture: Recording error', error);
                this.stopRecording();
                this.events.emit('captureError', { type: 'video', error });
            };

            // Start recording
            this.recordedChunks = [];
            this.mediaRecorder.start(100); // Collect data every 100ms
            this.recordingStartTime = Date.now();

            // Auto-stop after max duration
            setTimeout(() => {
                if (this.isRecording) {
                    console.log('MediaCapture: Max recording duration reached');
                    this.stopRecording();
                }
            }, this.maxRecordingDuration);

            console.log('MediaCapture: Recording started');
            this.events.emit('recordingStarted');

        } catch (error) {
            console.error('MediaCapture: Failed to start recording', error);
            this.events.emit('captureError', { type: 'video', error });
        }
    }

    /**
     * Stop video recording
     */
    stopRecording() {
        if (!this.isRecording || !this.mediaRecorder) {
            console.warn('MediaCapture: Not currently recording');
            return;
        }

        console.log('MediaCapture: Stopping recording...');

        try {
            this.mediaRecorder.stop();
            this.isRecording = false;
            this.stopCompositeLoop();
        } catch (error) {
            console.error('MediaCapture: Error stopping recording', error);
        }
    }

    /**
     * Handle recording stop event
     */
    handleRecordingStop() {
        console.log('MediaCapture: Processing recorded video...');

        try {
            // Combine chunks into blob
            const mimeType = this.mediaRecorder.mimeType;
            const blob = new Blob(this.recordedChunks, { type: mimeType });

            const duration = Date.now() - this.recordingStartTime;
            const extension = this.getFileExtension(mimeType);

            this.lastCapturedVideo = {
                blob,
                url: URL.createObjectURL(blob),
                timestamp: Date.now(),
                duration,
                filename: `beastside-filter-${Date.now()}.${extension}`,
                format: extension.toUpperCase()
            };

            console.log(`MediaCapture: Video recorded as ${extension.toUpperCase()} (${(duration / 1000).toFixed(1)}s, ${(blob.size / 1024 / 1024).toFixed(2)}MB)`);
            this.events.emit('videoRecorded', this.lastCapturedVideo);

            // Clean up
            this.recordedChunks = [];
            this.mediaRecorder = null;

        } catch (error) {
            console.error('MediaCapture: Error processing video', error);
            this.events.emit('captureError', { type: 'video', error });
        }
    }

    /**
     * Get best supported MIME type for recording
     * Prioritizes MP4 for better compatibility, falls back to WebM
     */
    getBestMimeType() {
        // Prioritize MP4 (better compatibility for sharing)
        const mp4Types = [
            'video/mp4;codecs=h264,aac',
            'video/mp4;codecs=avc1',
            'video/mp4'
        ];

        // Fallback to WebM (Chrome/Firefox)
        const webmTypes = [
            'video/webm;codecs=vp9,opus',
            'video/webm;codecs=vp8,opus',
            'video/webm;codecs=h264,opus',
            'video/webm'
        ];

        // Try MP4 first
        for (const type of mp4Types) {
            if (MediaRecorder.isTypeSupported(type)) {
                console.log('MediaCapture: MP4 supported - great for sharing!');
                return type;
            }
        }

        // Fall back to WebM
        for (const type of webmTypes) {
            if (MediaRecorder.isTypeSupported(type)) {
                console.log('MediaCapture: Using WebM (MP4 not supported by this browser)');
                return type;
            }
        }

        return ''; // Browser default
    }

    /**
     * Get file extension based on MIME type
     */
    getFileExtension(mimeType) {
        if (mimeType.startsWith('video/mp4')) {
            return 'mp4';
        }
        return 'webm';
    }

    /**
     * Download captured photo
     */
    downloadPhoto(photo = this.lastCapturedPhoto) {
        if (!photo) {
            console.warn('MediaCapture: No photo to download');
            return;
        }

        console.log('MediaCapture: Downloading photo...');

        const link = document.createElement('a');
        link.href = photo.url;
        link.download = photo.filename;
        link.click();

        this.events.emit('photoDownloaded', photo);
    }

    /**
     * Download captured video
     */
    downloadVideo(video = this.lastCapturedVideo) {
        if (!video) {
            console.warn('MediaCapture: No video to download');
            return;
        }

        console.log('MediaCapture: Downloading video...');

        const link = document.createElement('a');
        link.href = video.url;
        link.download = video.filename;
        link.click();

        this.events.emit('videoDownloaded', video);
    }

    /**
     * Share photo using native share API
     * @param {Object} photo - Photo object to share
     * @returns {Promise<{success: boolean, method: string}>}
     */
    async sharePhoto(photo = this.lastCapturedPhoto) {
        if (!photo) {
            console.warn('MediaCapture: No photo to share');
            return { success: false, method: 'none' };
        }

        console.log('MediaCapture: Sharing photo...');

        // Check if Web Share API with files is available
        if (navigator.share && navigator.canShare) {
            try {
                const file = new File([photo.blob], photo.filename, { type: 'image/jpeg' });
                const shareData = {
                    title: 'BEASTSIDE Filter',
                    text: 'Check out my BEASTSIDE character! #BEASTSIDE',
                    files: [file]
                };

                if (navigator.canShare(shareData)) {
                    await navigator.share(shareData);
                    console.log('MediaCapture: Photo shared via Web Share API');
                    this.events.emit('photoShared', { ...photo, method: 'native' });
                    return { success: true, method: 'native' };
                }
            } catch (error) {
                if (error.name === 'AbortError') {
                    console.log('MediaCapture: Share cancelled by user');
                    return { success: false, method: 'cancelled' };
                }
                console.warn('MediaCapture: Native share failed, trying fallback', error);
            }
        }

        // Fallback: Try to copy image to clipboard
        try {
            const copyResult = await this.copyImageToClipboard(photo.blob);
            if (copyResult) {
                console.log('MediaCapture: Photo copied to clipboard');
                this.events.emit('photoShared', { ...photo, method: 'clipboard' });
                return { success: true, method: 'clipboard' };
            }
        } catch (error) {
            console.warn('MediaCapture: Clipboard copy failed', error);
        }

        // Final fallback: Download
        console.log('MediaCapture: Falling back to download');
        this.downloadPhoto(photo);
        return { success: true, method: 'download' };
    }

    /**
     * Share video using native share API
     * @param {Object} video - Video object to share
     * @returns {Promise<{success: boolean, method: string}>}
     */
    async shareVideo(video = this.lastCapturedVideo) {
        if (!video) {
            console.warn('MediaCapture: No video to share');
            return { success: false, method: 'none' };
        }

        console.log('MediaCapture: Sharing video...');

        // Check if Web Share API with files is available
        if (navigator.share && navigator.canShare) {
            try {
                const mimeType = video.format === 'MP4' ? 'video/mp4' : (video.blob.type || 'video/webm');
                const file = new File([video.blob], video.filename, { type: mimeType });
                const shareData = {
                    title: 'BEASTSIDE Filter',
                    text: 'Check out my BEASTSIDE character! #BEASTSIDE',
                    files: [file]
                };

                if (navigator.canShare(shareData)) {
                    await navigator.share(shareData);
                    console.log(`MediaCapture: Video shared via Web Share API as ${video.format}`);
                    this.events.emit('videoShared', { ...video, method: 'native' });
                    return { success: true, method: 'native' };
                }
            } catch (error) {
                if (error.name === 'AbortError') {
                    console.log('MediaCapture: Share cancelled by user');
                    return { success: false, method: 'cancelled' };
                }
                console.warn('MediaCapture: Native share failed, trying fallback', error);
            }
        }

        // Videos can't be copied to clipboard, so fallback to download
        console.log('MediaCapture: Falling back to download for video');
        this.downloadVideo(video);
        return { success: true, method: 'download' };
    }

    /**
     * Copy image to clipboard
     * @param {Blob} blob - Image blob to copy
     * @returns {Promise<boolean>} True if successful
     */
    async copyImageToClipboard(blob) {
        if (!navigator.clipboard || !navigator.clipboard.write) {
            return false;
        }

        try {
            // Convert to PNG for clipboard (more widely supported)
            const pngBlob = await this.convertToPng(blob);
            const clipboardItem = new ClipboardItem({
                'image/png': pngBlob
            });
            await navigator.clipboard.write([clipboardItem]);
            return true;
        } catch (error) {
            console.warn('MediaCapture: Clipboard write failed', error);
            return false;
        }
    }

    /**
     * Convert image blob to PNG format
     * @param {Blob} blob - Source image blob
     * @returns {Promise<Blob>} PNG blob
     */
    async convertToPng(blob) {
        return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0);
                canvas.toBlob((pngBlob) => {
                    URL.revokeObjectURL(img.src);
                    resolve(pngBlob);
                }, 'image/png');
            };
            img.src = URL.createObjectURL(blob);
        });
    }

    /**
     * Check if native share is available
     * @returns {boolean}
     */
    canShare() {
        return !!(navigator.share && navigator.canShare);
    }

    /**
     * Check if clipboard write is available
     * @returns {boolean}
     */
    canCopyToClipboard() {
        return !!(navigator.clipboard && navigator.clipboard.write);
    }

    /**
     * Get recording duration (while recording)
     */
    getRecordingDuration() {
        if (!this.isRecording) return 0;
        return Date.now() - this.recordingStartTime;
    }

    /**
     * Check if currently recording
     */
    getIsRecording() {
        return this.isRecording;
    }

    /**
     * Get background effects instance
     * @returns {BackgroundEffects}
     */
    getBackgroundEffects() {
        return this.backgroundEffects;
    }

    /**
     * Get photo filters instance
     * @returns {PhotoFilters}
     */
    getPhotoFilters() {
        return this.photoFilters;
    }

    /**
     * Set background effect
     * @param {string} effectId - Effect identifier
     */
    setBackgroundEffect(effectId) {
        this.backgroundEffects.setEffect(effectId);
    }

    /**
     * Set photo filter
     * @param {string} filterId - Filter identifier
     */
    setPhotoFilter(filterId) {
        this.photoFilters.setFilter(filterId);
    }

    /**
     * Clean up resources
     */
    dispose() {
        // Stop recording if active
        if (this.isRecording) {
            this.stopRecording();
        }

        // Stop audio stream
        if (this.audioStream) {
            this.audioStream.getTracks().forEach(track => track.stop());
            this.audioStream = null;
        }

        // Revoke object URLs
        if (this.lastCapturedPhoto) {
            URL.revokeObjectURL(this.lastCapturedPhoto.url);
        }
        if (this.lastCapturedVideo) {
            URL.revokeObjectURL(this.lastCapturedVideo.url);
        }

        console.log('MediaCapture: Disposed');
    }
}

export default MediaCapture;
