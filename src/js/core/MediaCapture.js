/**
 * MediaCapture - Handles photo and video capture
 *
 * Captures from canvas (with character overlay) and includes audio from microphone.
 * Provides download and native share functionality.
 */

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
    }

    /**
     * Initialize media capture
     */
    async initialize() {
        console.log('MediaCapture: Initializing...');

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
     * Capture photo from canvas
     */
    capturePhoto() {
        console.log('MediaCapture: Capturing photo...');

        try {
            // Capture canvas as blob
            this.canvas.toBlob((blob) => {
                if (!blob) {
                    throw new Error('Failed to capture canvas');
                }

                this.lastCapturedPhoto = {
                    blob,
                    url: URL.createObjectURL(blob),
                    timestamp: Date.now(),
                    filename: `beastside-filter-${Date.now()}.jpg`
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
            // Create stream from canvas
            const canvasStream = this.canvas.captureStream(30); // 30 FPS

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
            this.isRecording = true;
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

            this.lastCapturedVideo = {
                blob,
                url: URL.createObjectURL(blob),
                timestamp: Date.now(),
                duration,
                filename: `beastside-filter-${Date.now()}.webm`
            };

            console.log(`MediaCapture: Video recorded (${(duration / 1000).toFixed(1)}s, ${(blob.size / 1024 / 1024).toFixed(2)}MB)`);
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
     */
    getBestMimeType() {
        const types = [
            'video/webm;codecs=vp9,opus',
            'video/webm;codecs=vp8,opus',
            'video/webm;codecs=h264,opus',
            'video/webm',
            'video/mp4'
        ];

        for (const type of types) {
            if (MediaRecorder.isTypeSupported(type)) {
                return type;
            }
        }

        return ''; // Browser default
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
     */
    async sharePhoto(photo = this.lastCapturedPhoto) {
        if (!photo) {
            console.warn('MediaCapture: No photo to share');
            return;
        }

        // Check if share API is available
        if (!navigator.share) {
            console.warn('MediaCapture: Share API not available - falling back to download');
            this.downloadPhoto(photo);
            return;
        }

        console.log('MediaCapture: Sharing photo...');

        try {
            const file = new File([photo.blob], photo.filename, { type: 'image/jpeg' });

            await navigator.share({
                title: 'BEASTSIDE Filter',
                text: 'Check out my BEASTSIDE character!',
                files: [file]
            });

            console.log('MediaCapture: Photo shared');
            this.events.emit('photoShared', photo);

        } catch (error) {
            if (error.name === 'AbortError') {
                console.log('MediaCapture: Share cancelled by user');
            } else {
                console.error('MediaCapture: Share failed', error);
                // Fallback to download
                this.downloadPhoto(photo);
            }
        }
    }

    /**
     * Share video using native share API
     */
    async shareVideo(video = this.lastCapturedVideo) {
        if (!video) {
            console.warn('MediaCapture: No video to share');
            return;
        }

        // Check if share API is available
        if (!navigator.share) {
            console.warn('MediaCapture: Share API not available - falling back to download');
            this.downloadVideo(video);
            return;
        }

        console.log('MediaCapture: Sharing video...');

        try {
            const file = new File([video.blob], video.filename, { type: video.blob.type });

            await navigator.share({
                title: 'BEASTSIDE Filter',
                text: 'Check out my BEASTSIDE character!',
                files: [file]
            });

            console.log('MediaCapture: Video shared');
            this.events.emit('videoShared', video);

        } catch (error) {
            if (error.name === 'AbortError') {
                console.log('MediaCapture: Share cancelled by user');
            } else {
                console.error('MediaCapture: Share failed', error);
                // Fallback to download
                this.downloadVideo(video);
            }
        }
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
