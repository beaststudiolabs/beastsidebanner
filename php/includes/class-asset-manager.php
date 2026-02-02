<?php
/**
 * Asset Manager Class
 *
 * Handles enqueuing of scripts and styles
 */

if (!defined('ABSPATH')) {
    exit;
}

class Beastside_Filters_Asset_Manager {

    /**
     * Initialize asset manager
     */
    public function __construct() {
        add_action('wp_enqueue_scripts', array($this, 'enqueue_assets'));
    }

    /**
     * Enqueue all plugin assets
     */
    public function enqueue_assets() {
        global $post;

        // Only load on pages/posts with the shortcode
        if (!is_a($post, 'WP_Post') || !has_shortcode($post->post_content, 'beastside_filters')) {
            return;
        }

        // Enqueue main JavaScript bundle (Vite build)
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

        // Pass configuration to JavaScript
        wp_localize_script('beastside-filters-main', 'beastsideFiltersConfig', array(
            'ajaxUrl' => admin_url('admin-ajax.php'),
            'nonce' => wp_create_nonce('beastside_filters_nonce'),
            'pluginUrl' => BEASTSIDE_FILTERS_PLUGIN_URL,
            'modelsPath' => BEASTSIDE_FILTERS_PLUGIN_URL . '../assets/models/',
            'version' => BEASTSIDE_FILTERS_VERSION,
            'deviceType' => Beastside_Filters_Browser_Detection::get_device_type(),
            'isDesktop' => Beastside_Filters_Browser_Detection::is_desktop(),
            'isMobile' => Beastside_Filters_Browser_Detection::is_mobile(),
            'currentUrl' => Beastside_Filters_Browser_Detection::get_current_url(),
        ));
    }

    /**
     * Get asset URL
     */
    public static function get_asset_url($path) {
        return BEASTSIDE_FILTERS_PLUGIN_URL . $path;
    }

    /**
     * Get dist asset URL (built files)
     */
    public static function get_dist_url($path) {
        return BEASTSIDE_FILTERS_PLUGIN_URL . '../dist/' . $path;
    }
}
