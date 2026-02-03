<?php
/**
 * Template Loader Class
 *
 * Handles loading of template files with theme override support
 */

if (!defined('ABSPATH')) {
    exit;
}

class Beastside_Filters_Template_Loader {

    /**
     * Load a template file
     *
     * Checks theme folder first, then plugin folder
     */
    public static function load_template($template_name, $args = array(), $template_path = '', $default_path = '') {
        // Extract args to variables
        if ($args && is_array($args)) {
            extract($args);
        }

        // Look in theme folder first
        $template = self::locate_template($template_name, $template_path, $default_path);

        // Include the template
        if ($template) {
            include $template;
        }
    }

    /**
     * Locate a template file
     */
    public static function locate_template($template_name, $template_path = '', $default_path = '') {
        // Set default paths
        if (!$template_path) {
            $template_path = 'beastside-filters/';
        }

        if (!$default_path) {
            $default_path = BEASTSIDE_FILTERS_PLUGIN_DIR . 'public/templates/';
        }

        // Look in theme folder first
        $template = locate_template(array(
            trailingslashit($template_path) . $template_name,
            $template_name
        ));

        // Get default template
        if (!$template) {
            $template = $default_path . $template_name;
        }

        // Return template path
        return apply_filters('beastside_filters_locate_template', $template, $template_name, $template_path);
    }

    /**
     * Get template HTML
     */
    public static function get_template_html($template_name, $args = array()) {
        ob_start();
        self::load_template($template_name, $args);
        return ob_get_clean();
    }
}
