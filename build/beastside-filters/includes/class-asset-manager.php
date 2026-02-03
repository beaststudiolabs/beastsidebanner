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

        // Enqueue main stylesheet
        wp_enqueue_style(
            'beastside-filters-style',
            BEASTSIDE_FILTERS_PLUGIN_URL . 'assets/css/main.css',
            array(),
            BEASTSIDE_FILTERS_VERSION
        );

        // Enqueue Three.js vendor bundle
        wp_enqueue_script(
            'beastside-three-vendor',
            BEASTSIDE_FILTERS_PLUGIN_URL . 'assets/js/three-vendor.js',
            array(),
            BEASTSIDE_FILTERS_VERSION,
            true
        );

        // Enqueue MediaPipe vendor bundle
        wp_enqueue_script(
            'beastside-mediapipe-vendor',
            BEASTSIDE_FILTERS_PLUGIN_URL . 'assets/js/mediapipe-vendor.js',
            array(),
            BEASTSIDE_FILTERS_VERSION,
            true
        );

        // Enqueue main JavaScript bundle
        wp_enqueue_script(
            'beastside-filters-main',
            BEASTSIDE_FILTERS_PLUGIN_URL . 'assets/js/main.js',
            array('beastside-three-vendor', 'beastside-mediapipe-vendor'),
            BEASTSIDE_FILTERS_VERSION,
            true
        );

        // Add module type to script tags
        add_filter('script_loader_tag', array($this, 'add_module_type'), 10, 3);

        // Pass configuration to JavaScript
        wp_localize_script('beastside-filters-main', 'beastsideFiltersConfig', array(
            'ajaxUrl' => admin_url('admin-ajax.php'),
            'nonce' => wp_create_nonce('beastside_filters_nonce'),
            'pluginUrl' => BEASTSIDE_FILTERS_PLUGIN_URL,
            'assetsUrl' => BEASTSIDE_FILTERS_PLUGIN_URL . 'assets/',
            'modelsPath' => BEASTSIDE_FILTERS_PLUGIN_URL . 'assets/models/',
            'version' => BEASTSIDE_FILTERS_VERSION,
            'deviceType' => Beastside_Filters_Browser_Detection::get_device_type(),
            'isDesktop' => Beastside_Filters_Browser_Detection::is_desktop(),
            'isMobile' => Beastside_Filters_Browser_Detection::is_mobile(),
            'currentUrl' => Beastside_Filters_Browser_Detection::get_current_url(),
        ));
    }

    /**
     * Add type="module" to our scripts
     */
    public function add_module_type($tag, $handle, $src) {
        $module_handles = array(
            'beastside-filters-main',
            'beastside-three-vendor',
            'beastside-mediapipe-vendor'
        );

        if (in_array($handle, $module_handles)) {
            $tag = str_replace(' src=', ' type="module" src=', $tag);
        }

        return $tag;
    }

    /**
     * Get asset URL
     */
    public static function get_asset_url($path) {
        return BEASTSIDE_FILTERS_PLUGIN_URL . 'assets/' . $path;
    }

    /**
     * Get models URL
     */
    public static function get_models_url($path = '') {
        return BEASTSIDE_FILTERS_PLUGIN_URL . 'assets/models/' . $path;
    }
}
