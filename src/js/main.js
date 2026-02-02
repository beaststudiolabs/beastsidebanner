/**
 * BEASTSIDE Filters - Main Entry Point
 *
 * Initializes the filter application and coordinates module loading.
 */

import FilterApp from './core/FilterApp.js';
import '../css/main.css';

/**
 * Initialize the application when DOM is ready
 */
document.addEventListener('DOMContentLoaded', () => {
    const rootElement = document.getElementById('beastside-filters-root');

    if (!rootElement) {
        console.error('BEASTSIDE Filters: Root element #beastside-filters-root not found');
        return;
    }

    // Create and initialize the filter app
    const app = new FilterApp(rootElement);
    app.init();

    // Expose app instance for debugging in development
    if (import.meta.env.DEV) {
        window.beastsideFilters = app;
    }
});
