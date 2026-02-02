<?php
/**
 * Plugin Name: BEASTSIDE Filters
 * Plugin URI: https://beastside.studio/filters
 * Description: Interactive face filter experience with BEASTSIDE game characters
 * Version: 1.0.0
 * Author: BEASTSIDE Studio
 * Author URI: https://beastside.studio
 * License: MIT
 * Text Domain: beastside-filters
 * Requires at least: 6.0
 * Requires PHP: 8.0
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

// Plugin constants
define('BEASTSIDE_FILTERS_VERSION', '1.0.0');
define('BEASTSIDE_FILTERS_PLUGIN_DIR', plugin_dir_path(__FILE__));
define('BEASTSIDE_FILTERS_PLUGIN_URL', plugin_dir_url(__FILE__));

/**
 * Main plugin class
 */
class Beastside_Filters {

    /**
     * Initialize the plugin
     */
    public function __construct() {
        add_action('wp_enqueue_scripts', array($this, 'enqueue_scripts'));
        add_shortcode('beastside_filters', array($this, 'render_shortcode'));
        add_action('init', array($this, 'check_https'));
    }

    /**
     * Enqueue plugin scripts and styles
     */
    public function enqueue_scripts() {
        // Only load on pages with the shortcode
        if (!is_singular() && !has_shortcode(get_post()->post_content, 'beastside_filters')) {
            return;
        }

        // Enqueue main JavaScript (built by Vite)
        wp_enqueue_script(
            'beastside-filters-main',
            BEASTSIDE_FILTERS_PLUGIN_URL . '../dist/js/main.js',
            array(),
            BEASTSIDE_FILTERS_VERSION,
            true
        );

        // Enqueue main stylesheet
        wp_enqueue_style(
            'beastside-filters-style',
            BEASTSIDE_FILTERS_PLUGIN_URL . '../dist/css/main.css',
            array(),
            BEASTSIDE_FILTERS_VERSION
        );

        // Pass PHP variables to JavaScript
        wp_localize_script('beastside-filters-main', 'beastsideFilters', array(
            'ajaxUrl' => admin_url('admin-ajax.php'),
            'nonce' => wp_create_nonce('beastside_filters_nonce'),
            'modelsPath' => BEASTSIDE_FILTERS_PLUGIN_URL . '../assets/models/',
        ));
    }

    /**
     * Render the shortcode
     */
    public function render_shortcode($atts) {
        $atts = shortcode_atts(array(
            'mode' => 'full', // full or preview
        ), $atts);

        ob_start();
        include BEASTSIDE_FILTERS_PLUGIN_DIR . 'public/templates/filter-container.php';
        return ob_get_clean();
    }

    /**
     * Check if HTTPS is enabled (required for camera access)
     */
    public function check_https() {
        if (!is_ssl() && !is_admin()) {
            add_action('wp_footer', function() {
                echo '<div class="beastside-filters-https-warning" style="display:none;">
                    HTTPS is required for camera access. Please enable SSL on your site.
                </div>';
            });
        }
    }
}

// Initialize the plugin
new Beastside_Filters();
