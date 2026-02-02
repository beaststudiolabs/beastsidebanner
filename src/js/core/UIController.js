/**
 * UIController - Handles user interactions and gestures
 *
 * Manages touch gestures (swipe), keyboard shortcuts, and UI state.
 * Emits events for other modules to respond to user actions.
 */

class UIController {
    constructor(containerElement, eventEmitter) {
        this.container = containerElement;
        this.events = eventEmitter;

        // Touch/swipe state
        this.touchStartX = 0;
        this.touchStartY = 0;
        this.touchEndX = 0;
        this.touchEndY = 0;
        this.isSwiping = false;
        this.swipeThreshold = 50; // Minimum pixels to register as swipe

        // UI state
        this.isUIVisible = true;
        this.isTransitioning = false;

        // Bind methods
        this.handleTouchStart = this.handleTouchStart.bind(this);
        this.handleTouchMove = this.handleTouchMove.bind(this);
        this.handleTouchEnd = this.handleTouchEnd.bind(this);
        this.handleKeyDown = this.handleKeyDown.bind(this);
    }

    /**
     * Initialize UI controller and attach event listeners
     */
    initialize() {
        console.log('UIController: Initializing...');

        // Touch events (mobile)
        this.container.addEventListener('touchstart', this.handleTouchStart, { passive: false });
        this.container.addEventListener('touchmove', this.handleTouchMove, { passive: false });
        this.container.addEventListener('touchend', this.handleTouchEnd, { passive: false });

        // Mouse events (desktop testing)
        this.container.addEventListener('mousedown', this.handleMouseDown.bind(this));
        this.container.addEventListener('mousemove', this.handleMouseMove.bind(this));
        this.container.addEventListener('mouseup', this.handleMouseUp.bind(this));

        // Keyboard shortcuts (desktop testing)
        document.addEventListener('keydown', this.handleKeyDown);

        console.log('UIController: Initialized');
        console.log('Swipe left/right to switch characters (or use arrow keys)');
    }

    /**
     * Handle touch start
     */
    handleTouchStart(event) {
        // Don't interfere with button clicks
        if (event.target.tagName === 'BUTTON') {
            return;
        }

        this.touchStartX = event.touches[0].clientX;
        this.touchStartY = event.touches[0].clientY;
        this.isSwiping = true;
    }

    /**
     * Handle touch move
     */
    handleTouchMove(event) {
        if (!this.isSwiping) return;

        this.touchEndX = event.touches[0].clientX;
        this.touchEndY = event.touches[0].clientY;

        // Prevent default scrolling during swipe
        const deltaX = Math.abs(this.touchEndX - this.touchStartX);
        const deltaY = Math.abs(this.touchEndY - this.touchStartY);

        if (deltaX > deltaY) {
            event.preventDefault();
        }
    }

    /**
     * Handle touch end
     */
    handleTouchEnd(event) {
        if (!this.isSwiping) return;

        this.isSwiping = false;

        const deltaX = this.touchEndX - this.touchStartX;
        const deltaY = this.touchEndY - this.touchStartY;

        // Check if horizontal swipe (not vertical scroll)
        if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > this.swipeThreshold) {
            if (deltaX > 0) {
                // Swipe right → Previous character
                this.handleSwipeRight();
            } else {
                // Swipe left → Next character
                this.handleSwipeLeft();
            }
        }

        // Reset
        this.touchStartX = 0;
        this.touchStartY = 0;
        this.touchEndX = 0;
        this.touchEndY = 0;
    }

    /**
     * Handle mouse down (desktop testing)
     */
    handleMouseDown(event) {
        // Don't interfere with button clicks
        if (event.target.tagName === 'BUTTON') {
            return;
        }

        this.touchStartX = event.clientX;
        this.touchStartY = event.clientY;
        this.isSwiping = true;
    }

    /**
     * Handle mouse move (desktop testing)
     */
    handleMouseMove(event) {
        if (!this.isSwiping) return;

        this.touchEndX = event.clientX;
        this.touchEndY = event.clientY;
    }

    /**
     * Handle mouse up (desktop testing)
     */
    handleMouseUp(event) {
        if (!this.isSwiping) return;

        this.isSwiping = false;

        const deltaX = this.touchEndX - this.touchStartX;
        const deltaY = this.touchEndY - this.touchStartY;

        // Check if horizontal swipe
        if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > this.swipeThreshold) {
            if (deltaX > 0) {
                this.handleSwipeRight();
            } else {
                this.handleSwipeLeft();
            }
        }

        // Reset
        this.touchStartX = 0;
        this.touchStartY = 0;
        this.touchEndX = 0;
        this.touchEndY = 0;
    }

    /**
     * Handle keyboard shortcuts (desktop testing)
     */
    handleKeyDown(event) {
        switch (event.key) {
            case 'ArrowLeft':
                event.preventDefault();
                this.handleSwipeRight(); // Left arrow = previous
                break;
            case 'ArrowRight':
                event.preventDefault();
                this.handleSwipeLeft(); // Right arrow = next
                break;
            case '1':
            case '2':
            case '3':
            case '4':
            case '5':
                // Direct character selection
                const index = parseInt(event.key) - 1;
                this.switchToCharacter(index);
                break;
            case 'h':
                // Toggle UI visibility
                this.toggleUI();
                break;
        }
    }

    /**
     * Handle swipe left (next character)
     */
    handleSwipeLeft() {
        if (this.isTransitioning) return;

        console.log('UIController: Swipe left → Next character');
        this.events.emit('characterNext');
    }

    /**
     * Handle swipe right (previous character)
     */
    handleSwipeRight() {
        if (this.isTransitioning) return;

        console.log('UIController: Swipe right → Previous character');
        this.events.emit('characterPrevious');
    }

    /**
     * Switch to specific character by index
     */
    switchToCharacter(index) {
        if (this.isTransitioning) return;

        console.log(`UIController: Switch to character ${index}`);
        this.events.emit('characterSwitch', { index });
    }

    /**
     * Set transitioning state (prevent rapid swipes)
     */
    setTransitioning(isTransitioning) {
        this.isTransitioning = isTransitioning;
    }

    /**
     * Toggle UI visibility
     */
    toggleUI() {
        this.isUIVisible = !this.isUIVisible;
        this.events.emit('uiToggle', { visible: this.isUIVisible });
        console.log(`UIController: UI ${this.isUIVisible ? 'visible' : 'hidden'}`);
    }

    /**
     * Show message to user (temporary overlay)
     */
    showMessage(message, duration = 2000) {
        // Create message element if doesn't exist
        let messageEl = this.container.querySelector('.ui-message');

        if (!messageEl) {
            messageEl = document.createElement('div');
            messageEl.className = 'ui-message';
            this.container.querySelector('.filter-container').appendChild(messageEl);
        }

        // Show message
        messageEl.textContent = message;
        messageEl.style.display = 'block';

        // Hide after duration
        setTimeout(() => {
            messageEl.style.display = 'none';
        }, duration);
    }

    /**
     * Clean up event listeners
     */
    dispose() {
        this.container.removeEventListener('touchstart', this.handleTouchStart);
        this.container.removeEventListener('touchmove', this.handleTouchMove);
        this.container.removeEventListener('touchend', this.handleTouchEnd);
        document.removeEventListener('keydown', this.handleKeyDown);

        console.log('UIController: Disposed');
    }
}

export default UIController;
