/**
 * PerformanceMonitor - Tracks FPS and performance metrics
 *
 * Monitors frame rate, memory usage, and detects performance issues.
 * Emits warnings when performance degrades below acceptable thresholds.
 */

class PerformanceMonitor {
    constructor(eventEmitter) {
        this.events = eventEmitter;

        // Performance thresholds
        this.targetFPS = 30;
        this.warningFPS = 20;
        this.criticalFPS = 15;

        // FPS tracking
        this.frameCount = 0;
        this.lastTime = performance.now();
        this.currentFPS = 0;
        this.fpsHistory = [];
        this.maxHistoryLength = 60; // Keep 60 samples

        // Performance state
        this.isMonitoring = false;
        this.performanceLevel = 'good'; // good, warning, critical
        this.consecutiveLowFPS = 0;
        this.lowFPSThreshold = 3; // 3 consecutive low readings = warning

        // Memory tracking (if available)
        this.memorySupported = performance.memory !== undefined;
        this.lastMemoryCheck = 0;
        this.memoryCheckInterval = 5000; // Check every 5s

        // Animation frame
        this.rafId = null;
    }

    /**
     * Start monitoring performance
     */
    start() {
        if (this.isMonitoring) return;

        console.log('PerformanceMonitor: Starting...');
        this.isMonitoring = true;
        this.lastTime = performance.now();
        this.frameCount = 0;
        this.monitorFrame();
    }

    /**
     * Stop monitoring performance
     */
    stop() {
        if (!this.isMonitoring) return;

        console.log('PerformanceMonitor: Stopping...');
        this.isMonitoring = false;

        if (this.rafId) {
            cancelAnimationFrame(this.rafId);
            this.rafId = null;
        }
    }

    /**
     * Monitor frame (called every frame)
     */
    monitorFrame() {
        if (!this.isMonitoring) return;

        this.frameCount++;
        const currentTime = performance.now();
        const elapsed = currentTime - this.lastTime;

        // Calculate FPS every second
        if (elapsed >= 1000) {
            this.currentFPS = Math.round((this.frameCount * 1000) / elapsed);

            // Update history
            this.fpsHistory.push(this.currentFPS);
            if (this.fpsHistory.length > this.maxHistoryLength) {
                this.fpsHistory.shift();
            }

            // Check performance level
            this.checkPerformance();

            // Emit FPS update
            this.events.emit('performanceUpdate', {
                fps: this.currentFPS,
                level: this.performanceLevel,
                avgFPS: this.getAverageFPS()
            });

            // Reset counters
            this.frameCount = 0;
            this.lastTime = currentTime;
        }

        // Check memory periodically
        if (this.memorySupported && currentTime - this.lastMemoryCheck > this.memoryCheckInterval) {
            this.checkMemory();
            this.lastMemoryCheck = currentTime;
        }

        // Continue monitoring
        this.rafId = requestAnimationFrame(() => this.monitorFrame());
    }

    /**
     * Check performance level and emit warnings
     */
    checkPerformance() {
        const previousLevel = this.performanceLevel;

        if (this.currentFPS >= this.targetFPS) {
            // Good performance
            this.performanceLevel = 'good';
            this.consecutiveLowFPS = 0;
        } else if (this.currentFPS >= this.warningFPS) {
            // Warning level
            this.performanceLevel = 'warning';
            this.consecutiveLowFPS++;
        } else {
            // Critical level
            this.performanceLevel = 'critical';
            this.consecutiveLowFPS++;
        }

        // Emit warning if performance degrades
        if (previousLevel !== this.performanceLevel) {
            this.events.emit('performanceLevelChange', {
                level: this.performanceLevel,
                fps: this.currentFPS,
                threshold: this.getThresholdForLevel(this.performanceLevel)
            });

            console.warn(`PerformanceMonitor: Performance level changed to ${this.performanceLevel} (${this.currentFPS} FPS)`);
        }

        // Emit critical warning after consecutive low FPS
        if (this.consecutiveLowFPS >= this.lowFPSThreshold && this.performanceLevel === 'critical') {
            this.events.emit('performanceCritical', {
                fps: this.currentFPS,
                avgFPS: this.getAverageFPS(),
                consecutiveCount: this.consecutiveLowFPS
            });

            console.error(`PerformanceMonitor: Critical performance - ${this.consecutiveLowFPS} consecutive low FPS readings`);
        }
    }

    /**
     * Check memory usage
     */
    checkMemory() {
        if (!this.memorySupported) return;

        const memory = performance.memory;
        const usedMB = memory.usedJSHeapSize / 1024 / 1024;
        const limitMB = memory.jsHeapSizeLimit / 1024 / 1024;
        const percentage = (usedMB / limitMB) * 100;

        // Warn if using >80% of available memory
        if (percentage > 80) {
            this.events.emit('memoryWarning', {
                usedMB: Math.round(usedMB),
                limitMB: Math.round(limitMB),
                percentage: Math.round(percentage)
            });

            console.warn(`PerformanceMonitor: High memory usage - ${Math.round(usedMB)}MB / ${Math.round(limitMB)}MB (${Math.round(percentage)}%)`);
        }
    }

    /**
     * Get average FPS from history
     */
    getAverageFPS() {
        if (this.fpsHistory.length === 0) return 0;

        const sum = this.fpsHistory.reduce((a, b) => a + b, 0);
        return Math.round(sum / this.fpsHistory.length);
    }

    /**
     * Get minimum FPS from history
     */
    getMinFPS() {
        if (this.fpsHistory.length === 0) return 0;
        return Math.min(...this.fpsHistory);
    }

    /**
     * Get maximum FPS from history
     */
    getMaxFPS() {
        if (this.fpsHistory.length === 0) return 0;
        return Math.max(...this.fpsHistory);
    }

    /**
     * Get threshold FPS for a performance level
     */
    getThresholdForLevel(level) {
        switch (level) {
            case 'good':
                return this.targetFPS;
            case 'warning':
                return this.warningFPS;
            case 'critical':
                return this.criticalFPS;
            default:
                return this.targetFPS;
        }
    }

    /**
     * Get current performance stats
     */
    getStats() {
        return {
            fps: this.currentFPS,
            avgFPS: this.getAverageFPS(),
            minFPS: this.getMinFPS(),
            maxFPS: this.getMaxFPS(),
            level: this.performanceLevel,
            history: [...this.fpsHistory]
        };
    }

    /**
     * Check if performance is acceptable
     */
    isPerformanceAcceptable() {
        return this.performanceLevel !== 'critical' && this.currentFPS >= this.warningFPS;
    }

    /**
     * Reset performance history
     */
    reset() {
        this.fpsHistory = [];
        this.consecutiveLowFPS = 0;
        this.performanceLevel = 'good';
        console.log('PerformanceMonitor: Reset');
    }
}

export default PerformanceMonitor;
