<?php
/**
 * Browser Detection Class
 *
 * Detects device type and browser capabilities
 */

if (!defined('ABSPATH')) {
    exit;
}

class Beastside_Filters_Browser_Detection {

    /**
     * Check if current device is mobile
     */
    public static function is_mobile() {
        // Check for mobile user agents
        $user_agent = isset($_SERVER['HTTP_USER_AGENT']) ? $_SERVER['HTTP_USER_AGENT'] : '';

        $mobile_agents = array(
            'Android',
            'iPhone',
            'iPad',
            'iPod',
            'BlackBerry',
            'Windows Phone',
            'Mobile',
            'webOS'
        );

        foreach ($mobile_agents as $agent) {
            if (stripos($user_agent, $agent) !== false) {
                return true;
            }
        }

        return false;
    }

    /**
     * Check if current device is tablet
     */
    public static function is_tablet() {
        $user_agent = isset($_SERVER['HTTP_USER_AGENT']) ? $_SERVER['HTTP_USER_AGENT'] : '';

        $tablet_agents = array('iPad', 'Android');

        foreach ($tablet_agents as $agent) {
            if (stripos($user_agent, $agent) !== false) {
                // Android tablets vs phones
                if ($agent === 'Android' && stripos($user_agent, 'Mobile') === false) {
                    return true;
                }
                // iPads
                if ($agent === 'iPad') {
                    return true;
                }
            }
        }

        return false;
    }

    /**
     * Check if current device is desktop
     */
    public static function is_desktop() {
        return !self::is_mobile() && !self::is_tablet();
    }

    /**
     * Get device type
     */
    public static function get_device_type() {
        if (self::is_tablet()) {
            return 'tablet';
        }
        if (self::is_mobile()) {
            return 'mobile';
        }
        return 'desktop';
    }

    /**
     * Get browser name
     */
    public static function get_browser() {
        $user_agent = isset($_SERVER['HTTP_USER_AGENT']) ? $_SERVER['HTTP_USER_AGENT'] : '';

        if (stripos($user_agent, 'Firefox') !== false) {
            return 'firefox';
        }
        if (stripos($user_agent, 'Edg') !== false) {
            return 'edge';
        }
        if (stripos($user_agent, 'Chrome') !== false) {
            return 'chrome';
        }
        if (stripos($user_agent, 'Safari') !== false) {
            return 'safari';
        }
        if (stripos($user_agent, 'Opera') !== false || stripos($user_agent, 'OPR') !== false) {
            return 'opera';
        }

        return 'unknown';
    }

    /**
     * Check if browser is supported
     */
    public static function is_browser_supported() {
        $browser = self::get_browser();
        $supported = array('chrome', 'firefox', 'safari', 'edge');

        return in_array($browser, $supported);
    }

    /**
     * Get current page URL
     */
    public static function get_current_url() {
        $protocol = isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on' ? 'https' : 'http';
        $host = isset($_SERVER['HTTP_HOST']) ? $_SERVER['HTTP_HOST'] : '';
        $uri = isset($_SERVER['REQUEST_URI']) ? $_SERVER['REQUEST_URI'] : '';

        return $protocol . '://' . $host . $uri;
    }

    /**
     * Check if site is using HTTPS
     */
    public static function is_https() {
        return is_ssl();
    }
}
