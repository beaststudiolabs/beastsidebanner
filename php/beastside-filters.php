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

// Load required classes
require_once BEASTSIDE_FILTERS_PLUGIN_DIR . 'includes/class-browser-detection.php';
require_once BEASTSIDE_FILTERS_PLUGIN_DIR . 'includes/class-asset-manager.php';
require_once BEASTSIDE_FILTERS_PLUGIN_DIR . 'includes/class-template-loader.php';

/**
 * Main plugin class
 */
class Beastside_Filters {

    /**
     * Single instance
     */
    private static $instance = null;

    /**
     * Asset Manager instance
     */
    private $asset_manager;

    /**
     * Get singleton instance
     */
    public static function get_instance() {
        if (self::$instance === null) {
            self::$instance = new self();
        }
        return self::$instance;
    }

    /**
     * Initialize the plugin
     */
    private function __construct() {
        $this->asset_manager = new Beastside_Filters_Asset_Manager();

        // Register shortcode
        add_shortcode('beastside_filters', array($this, 'render_shortcode'));

        // Add admin notices
        add_action('admin_notices', array($this, 'admin_notices'));
    }

    /**
     * Render the shortcode
     */
    public function render_shortcode($atts) {
        $atts = shortcode_atts(array(
            'mode' => 'full', // full or preview
        ), $atts);

        // Use Template Loader
        return Beastside_Filters_Template_Loader::get_template_html('filter-container.php', $atts);
    }

    /**
     * Show admin notices
     */
    public function admin_notices() {
        // Check if HTTPS is enabled
        if (!is_ssl()) {
            ?>
            <div class="notice notice-warning">
                <p>
                    <strong>BEASTSIDE Filters:</strong>
                    HTTPS is required for camera access. Please enable SSL on your site.
                    <a href="https://wordpress.org/support/article/https-for-wordpress/" target="_blank">Learn more</a>
                </p>
            </div>
            <?php
        }
    }

    /**
     * Plugin activation hook
     */
    public static function activate() {
        // Flush rewrite rules
        flush_rewrite_rules();
    }

    /**
     * Plugin deactivation hook
     */
    public static function deactivate() {
        // Flush rewrite rules
        flush_rewrite_rules();
    }
}

// Register activation/deactivation hooks
register_activation_hook(__FILE__, array('Beastside_Filters', 'activate'));
register_deactivation_hook(__FILE__, array('Beastside_Filters', 'deactivate'));

// Initialize the plugin
Beastside_Filters::get_instance();
