=== BEASTSIDE Filters ===
Contributors: beastsidestudio
Tags: face filter, ar, augmented reality, camera, three.js, webgl
Requires at least: 6.0
Tested up to: 6.4
Requires PHP: 8.0
Stable tag: 1.0.0
License: MIT
License URI: https://opensource.org/licenses/MIT

Interactive face filter experience with BEASTSIDE game characters. Transform into BEASTSIDE characters in real-time using your device camera.

== Description ==

BEASTSIDE Filters brings the characters from the BEASTSIDE game to life through real-time face tracking technology. Visitors can:

* See themselves transformed into BEASTSIDE characters
* Capture photos and videos with character overlays
* Share their creations directly from the browser
* Switch between multiple characters with a simple swipe

**Features:**

* Real-time 3D character face overlay with expression tracking
* Multiple BEASTSIDE characters to choose from
* Photo and video capture with download and native sharing
* Browser-based, no installation required for visitors
* Mobile-optimized for iOS and Android
* Desktop shows QR code to open on mobile

**Requirements:**

* HTTPS is required for camera access
* Works best on modern browsers (Chrome, Safari, Firefox, Edge)
* Optimized for mobile portrait mode

== Installation ==

1. Upload the `beastside-filters` folder to the `/wp-content/plugins/` directory
2. Activate the plugin through the 'Plugins' menu in WordPress
3. Add the shortcode `[beastside_filters]` to any page or post
4. Make sure your site uses HTTPS (required for camera access)

== Frequently Asked Questions ==

= Why does it say HTTPS is required? =

Modern browsers require a secure HTTPS connection to access the camera. Contact your hosting provider to enable SSL.

= Why do I see a QR code instead of the filter? =

On desktop computers, a QR code is shown so you can open the experience on your mobile device, which provides the best experience.

= What browsers are supported? =

Chrome, Safari, Firefox, and Edge are all supported. For best results, use the latest version.

= Can I customize the characters? =

The plugin comes with pre-made BEASTSIDE characters. Custom characters can be added by uploading GLB files to the assets/models folder.

== Screenshots ==

1. Face filter in action on mobile
2. Character selection interface
3. Photo capture preview
4. QR code display on desktop

== Changelog ==

= 1.0.0 =
* Initial release
* Real-time face tracking with MediaPipe
* 3D character rendering with Three.js
* Photo and video capture
* Native sharing support
* Desktop QR code fallback

== Upgrade Notice ==

= 1.0.0 =
Initial release of BEASTSIDE Filters.
