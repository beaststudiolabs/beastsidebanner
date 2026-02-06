/**
 * PhotoFilters - Apply color filters to captured photos
 *
 * Filters are applied using canvas 2D filter property before blob creation.
 */

class PhotoFilters {
    constructor() {
        this.currentFilter = 'none';

        // Available filters using CSS filter syntax
        this.filters = {
            none: {
                name: 'Normal',
                icon: 'image',
                filter: 'none'
            },
            vintage: {
                name: 'Vintage',
                icon: 'film',
                filter: 'sepia(0.3) contrast(1.1) brightness(0.95)'
            },
            bw: {
                name: 'B&W',
                icon: 'circle-half',
                filter: 'grayscale(1) contrast(1.2)'
            },
            highContrast: {
                name: 'Vivid',
                icon: 'zap',
                filter: 'contrast(1.4) saturate(1.2)'
            },
            warm: {
                name: 'Warm',
                icon: 'sun',
                filter: 'sepia(0.1) saturate(1.2) brightness(1.05)'
            },
            cool: {
                name: 'Cool',
                icon: 'snowflake',
                filter: 'saturate(0.9) brightness(1.05) hue-rotate(10deg)'
            },
            fade: {
                name: 'Fade',
                icon: 'sunset',
                filter: 'contrast(0.9) brightness(1.1) saturate(0.8)'
            },
            drama: {
                name: 'Drama',
                icon: 'flame',
                filter: 'contrast(1.3) brightness(0.95) saturate(1.1)'
            }
        };
    }

    /**
     * Get all available filters
     * @returns {Array} Array of filter objects with id, name, and icon
     */
    getFilters() {
        return Object.entries(this.filters).map(([id, filter]) => ({
            id,
            name: filter.name,
            icon: filter.icon
        }));
    }

    /**
     * Set current filter
     * @param {string} filterId - Filter identifier
     */
    setFilter(filterId) {
        if (this.filters[filterId]) {
            this.currentFilter = filterId;
            console.log(`PhotoFilters: Set filter to ${filterId}`);
        } else {
            console.warn(`PhotoFilters: Unknown filter ${filterId}`);
        }
    }

    /**
     * Get current filter
     * @returns {string} Current filter identifier
     */
    getFilter() {
        return this.currentFilter;
    }

    /**
     * Get CSS filter string for current filter
     * @returns {string} CSS filter string
     */
    getFilterString() {
        return this.filters[this.currentFilter]?.filter || 'none';
    }

    /**
     * Apply filter to a canvas context
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     */
    applyFilter(ctx) {
        ctx.filter = this.getFilterString();
    }

    /**
     * Reset context filter
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     */
    resetFilter(ctx) {
        ctx.filter = 'none';
    }

    /**
     * Create a filtered version of an image/canvas
     * @param {HTMLCanvasElement|HTMLImageElement} source - Source image or canvas
     * @returns {HTMLCanvasElement} New canvas with filter applied
     */
    createFilteredCanvas(source) {
        const canvas = document.createElement('canvas');
        canvas.width = source.width;
        canvas.height = source.height;
        const ctx = canvas.getContext('2d');

        // Apply filter
        ctx.filter = this.getFilterString();
        ctx.drawImage(source, 0, 0);
        ctx.filter = 'none';

        return canvas;
    }
}

export default PhotoFilters;
