/**
 * EventEmitter - Simple pub/sub pattern for module communication
 *
 * Allows modules to communicate without tight coupling.
 * Example: FaceTracker emits 'faceDetected' → ThreeRenderer subscribes and updates
 */

class EventEmitter {
    constructor() {
        this.events = {};
    }

    /**
     * Subscribe to an event
     * @param {string} event - Event name
     * @param {Function} callback - Function to call when event is emitted
     * @returns {Function} Unsubscribe function
     */
    on(event, callback) {
        if (!this.events[event]) {
            this.events[event] = [];
        }

        this.events[event].push(callback);

        // Return unsubscribe function
        return () => {
            this.off(event, callback);
        };
    }

    /**
     * Unsubscribe from an event
     * @param {string} event - Event name
     * @param {Function} callback - Callback to remove
     */
    off(event, callback) {
        if (!this.events[event]) return;

        this.events[event] = this.events[event].filter(cb => cb !== callback);
    }

    /**
     * Emit an event with data
     * @param {string} event - Event name
     * @param {*} data - Data to pass to callbacks
     */
    emit(event, data) {
        if (!this.events[event]) return;

        this.events[event].forEach(callback => {
            try {
                callback(data);
            } catch (error) {
                console.error(`EventEmitter: Error in ${event} callback:`, error);
            }
        });
    }

    /**
     * Subscribe to an event once (auto-unsubscribe after first call)
     * @param {string} event - Event name
     * @param {Function} callback - Function to call once
     */
    once(event, callback) {
        const onceCallback = (data) => {
            callback(data);
            this.off(event, onceCallback);
        };

        this.on(event, onceCallback);
    }

    /**
     * Remove all listeners for an event (or all events if no event specified)
     * @param {string} [event] - Optional event name
     */
    clear(event) {
        if (event) {
            delete this.events[event];
        } else {
            this.events = {};
        }
    }

    /**
     * Get listener count for an event
     * @param {string} event - Event name
     * @returns {number} Number of listeners
     */
    listenerCount(event) {
        return this.events[event]?.length || 0;
    }
}

export default EventEmitter;
