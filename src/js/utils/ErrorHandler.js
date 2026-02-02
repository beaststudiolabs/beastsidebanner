/**
 * ErrorHandler - Centralized error handling
 *
 * Handles all application errors with user-friendly messages and retry logic.
 * Categorizes errors and provides appropriate recovery actions.
 */

class ErrorHandler {
    constructor(eventEmitter) {
        this.events = eventEmitter;

        // Error categories
        this.ERROR_TYPES = {
            CAMERA_PERMISSION: 'camera_permission',
            CAMERA_IN_USE: 'camera_in_use',
            CAMERA_NOT_FOUND: 'camera_not_found',
            BROWSER_UNSUPPORTED: 'browser_unsupported',
            WEBGL_UNSUPPORTED: 'webgl_unsupported',
            FACE_TRACKING_FAILED: 'face_tracking_failed',
            MODEL_LOAD_FAILED: 'model_load_failed',
            CAPTURE_FAILED: 'capture_failed',
            NETWORK_ERROR: 'network_error',
            STORAGE_FULL: 'storage_full',
            PERFORMANCE_CRITICAL: 'performance_critical',
            UNKNOWN: 'unknown'
        };

        // Error messages
        this.ERROR_MESSAGES = {
            [this.ERROR_TYPES.CAMERA_PERMISSION]: {
                title: 'Camera Access Required',
                message: 'Please enable camera access in your browser settings to use BEASTSIDE Filters.',
                action: 'Open Settings',
                retryable: false
            },
            [this.ERROR_TYPES.CAMERA_IN_USE]: {
                title: 'Camera In Use',
                message: 'Your camera is being used by another application. Please close other apps and try again.',
                action: 'Retry',
                retryable: true
            },
            [this.ERROR_TYPES.CAMERA_NOT_FOUND]: {
                title: 'No Camera Found',
                message: 'No camera detected on your device. Please connect a camera and try again.',
                action: 'Retry',
                retryable: true
            },
            [this.ERROR_TYPES.BROWSER_UNSUPPORTED]: {
                title: 'Browser Not Supported',
                message: 'Your browser doesn\'t support this feature. Please use the latest Chrome, Safari, or Firefox.',
                action: 'Learn More',
                retryable: false
            },
            [this.ERROR_TYPES.WEBGL_UNSUPPORTED]: {
                title: 'WebGL Not Available',
                message: '3D graphics are not supported on your device or browser. Please try a different browser.',
                action: 'Learn More',
                retryable: false
            },
            [this.ERROR_TYPES.FACE_TRACKING_FAILED]: {
                title: 'Face Tracking Failed',
                message: 'Unable to track your face. Make sure your face is visible and well-lit.',
                action: 'Retry',
                retryable: true
            },
            [this.ERROR_TYPES.MODEL_LOAD_FAILED]: {
                title: 'Character Load Failed',
                message: 'Failed to load character model. Please check your connection and try again.',
                action: 'Retry',
                retryable: true
            },
            [this.ERROR_TYPES.CAPTURE_FAILED]: {
                title: 'Capture Failed',
                message: 'Failed to capture photo/video. Please try again.',
                action: 'Retry',
                retryable: true
            },
            [this.ERROR_TYPES.NETWORK_ERROR]: {
                title: 'Connection Error',
                message: 'Unable to connect to the server. Please check your internet connection.',
                action: 'Retry',
                retryable: true
            },
            [this.ERROR_TYPES.STORAGE_FULL]: {
                title: 'Storage Full',
                message: 'Your device storage is full. Please free up space and try again.',
                action: 'OK',
                retryable: false
            },
            [this.ERROR_TYPES.PERFORMANCE_CRITICAL]: {
                title: 'Low Performance',
                message: 'Performance is too low for smooth operation. Try closing other apps or using a more powerful device.',
                action: 'Continue Anyway',
                retryable: false
            },
            [this.ERROR_TYPES.UNKNOWN]: {
                title: 'Something Went Wrong',
                message: 'An unexpected error occurred. Please try again.',
                action: 'Retry',
                retryable: true
            }
        };

        // Retry tracking
        this.retryCount = {};
        this.maxRetries = 3;
    }

    /**
     * Handle an error
     */
    handle(error, context = {}) {
        const errorType = this.categorizeError(error, context);
        const errorInfo = this.ERROR_MESSAGES[errorType];

        console.error(`ErrorHandler: ${errorType}`, error, context);

        // Emit error event
        this.events.emit('error', {
            type: errorType,
            error,
            context,
            info: errorInfo,
            canRetry: errorInfo.retryable && this.canRetry(errorType)
        });

        return {
            type: errorType,
            ...errorInfo
        };
    }

    /**
     * Categorize error based on error object and context
     */
    categorizeError(error, context) {
        // Camera errors
        if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
            return this.ERROR_TYPES.CAMERA_PERMISSION;
        }
        if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
            return this.ERROR_TYPES.CAMERA_IN_USE;
        }
        if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
            return this.ERROR_TYPES.CAMERA_NOT_FOUND;
        }

        // Browser support errors
        if (context.type === 'webgl') {
            return this.ERROR_TYPES.WEBGL_UNSUPPORTED;
        }
        if (context.type === 'browser') {
            return this.ERROR_TYPES.BROWSER_UNSUPPORTED;
        }

        // Face tracking errors
        if (context.type === 'face_tracking') {
            return this.ERROR_TYPES.FACE_TRACKING_FAILED;
        }

        // Model loading errors
        if (context.type === 'model_load') {
            return this.ERROR_TYPES.MODEL_LOAD_FAILED;
        }

        // Capture errors
        if (context.type === 'capture' || context.type === 'photo' || context.type === 'video') {
            return this.ERROR_TYPES.CAPTURE_FAILED;
        }

        // Network errors
        if (error.name === 'NetworkError' || !navigator.onLine) {
            return this.ERROR_TYPES.NETWORK_ERROR;
        }

        // Storage errors
        if (error.name === 'QuotaExceededError') {
            return this.ERROR_TYPES.STORAGE_FULL;
        }

        // Performance errors
        if (context.type === 'performance') {
            return this.ERROR_TYPES.PERFORMANCE_CRITICAL;
        }

        return this.ERROR_TYPES.UNKNOWN;
    }

    /**
     * Check if error can be retried
     */
    canRetry(errorType) {
        const count = this.retryCount[errorType] || 0;
        return count < this.maxRetries;
    }

    /**
     * Increment retry count for error type
     */
    incrementRetry(errorType) {
        this.retryCount[errorType] = (this.retryCount[errorType] || 0) + 1;
    }

    /**
     * Reset retry count for error type
     */
    resetRetry(errorType) {
        this.retryCount[errorType] = 0;
    }

    /**
     * Get retry count for error type
     */
    getRetryCount(errorType) {
        return this.retryCount[errorType] || 0;
    }

    /**
     * Check browser compatibility
     */
    checkBrowserCompatibility() {
        const errors = [];

        // Check getUserMedia
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            errors.push({
                type: this.ERROR_TYPES.BROWSER_UNSUPPORTED,
                feature: 'getUserMedia',
                message: 'Camera access not supported'
            });
        }

        // Check WebGL
        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
        if (!gl) {
            errors.push({
                type: this.ERROR_TYPES.WEBGL_UNSUPPORTED,
                feature: 'WebGL',
                message: '3D graphics not supported'
            });
        }

        // Check MediaRecorder (for video)
        if (typeof MediaRecorder === 'undefined') {
            errors.push({
                type: this.ERROR_TYPES.BROWSER_UNSUPPORTED,
                feature: 'MediaRecorder',
                message: 'Video recording not supported'
            });
        }

        return errors;
    }

    /**
     * Check if browser is supported
     */
    isBrowserSupported() {
        const errors = this.checkBrowserCompatibility();
        return errors.length === 0;
    }

    /**
     * Get user-friendly error message
     */
    getErrorMessage(error, context = {}) {
        const errorType = this.categorizeError(error, context);
        return this.ERROR_MESSAGES[errorType];
    }

    /**
     * Log error for analytics/debugging
     */
    logError(error, context = {}) {
        const errorType = this.categorizeError(error, context);

        // In production, send to analytics service
        console.error('[ErrorHandler]', {
            type: errorType,
            message: error.message,
            stack: error.stack,
            context,
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent
        });
    }
}

export default ErrorHandler;
