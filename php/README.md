# BEASTSIDE Filters - WordPress Plugin

Interactive face filter plugin for WordPress with BEASTSIDE characters.

## Installation

### 1. Build the Assets

```bash
cd /path/to/beastsidebanner
npm run build
```

This creates the `dist/` folder with compiled JavaScript and CSS.

### 2. Copy to WordPress

Copy the entire plugin to your WordPress plugins directory:

```bash
# Option A: Copy entire folder
cp -r . /path/to/wordpress/wp-content/plugins/beastside-filters/

# Option B: Use symlink (development)
ln -s /path/to/beastsidebanner /path/to/wordpress/wp-content/plugins/beastside-filters
```

### 3. Activate Plugin

1. Log in to WordPress admin
2. Go to Plugins → Installed Plugins
3. Find "BEASTSIDE Filters"
4. Click "Activate"

### 4. Add Shortcode

Add the shortcode to any page or post:

```
[beastside_filters]
```

## Features

### Desktop Experience
- Shows QR code modal
- Users scan with mobile device
- Redirects to same page on mobile

### Mobile Experience
- Full filter interface
- Real-time face tracking
- Character switching (5 characters)
- Photo/video capture
- Download and share

## Requirements

- **WordPress:** 6.0+
- **PHP:** 8.0+
- **HTTPS:** Required for camera access
- **Modern Browser:** Chrome, Safari, Firefox, Edge

## Plugin Structure

```
beastsidebanner/
├── php/
│   ├── beastside-filters.php       # Main plugin file
│   ├── includes/
│   │   ├── class-asset-manager.php
│   │   ├── class-browser-detection.php
│   │   └── class-template-loader.php
│   └── public/
│       └── templates/
│           └── filter-container.php
├── dist/                           # Built assets (from npm run build)
│   ├── js/
│   │   └── main.js
│   └── css/
│       └── main.css
└── assets/
    └── models/                     # 3D character models (GLB)
```

## Usage

### Basic Shortcode

```
[beastside_filters]
```

### With Attributes

```
[beastside_filters mode="full"]
```

## Browser Detection

The plugin automatically detects:
- **Desktop** → Shows QR code
- **Mobile** → Shows filter interface
- **Tablet** → Shows filter interface
- **HTTPS** → Required for camera access

## Shortcode Attributes

| Attribute | Default | Options | Description |
|-----------|---------|---------|-------------|
| `mode` | `full` | `full`, `preview` | Display mode |

## Template Overrides

You can override plugin templates in your theme:

1. Create folder: `wp-content/themes/your-theme/beastside-filters/`
2. Copy template: `filter-container.php`
3. Customize as needed

The plugin will use your theme template instead of the plugin template.

## HTTPS Requirement

Camera access requires HTTPS. The plugin will:
- Show admin warning if HTTPS not enabled
- Show user warning on mobile if HTTPS not available
- Prevent filter activation without HTTPS

**To enable HTTPS:**
- Use a hosting provider with free SSL (most modern hosts)
- Install Let's Encrypt certificate
- Use a plugin like Really Simple SSL

## Development

### Local Development

1. Use Local by Flywheel, MAMP, or similar
2. Install WordPress
3. Symlink plugin folder
4. Run `npm run dev` for hot reload
5. Test on http://localhost:3000/

### Building for Production

```bash
npm run build
```

### Testing

1. **Desktop:** Visit page with shortcode → See QR code
2. **Mobile:** Scan QR code → See filter interface
3. **HTTPS:** Ensure SSL enabled → Camera works
4. **Errors:** Test error scenarios → See error messages

## Troubleshooting

### Camera Not Working

1. Check HTTPS is enabled
2. Check browser permissions
3. Check camera not in use by other app
4. Try different browser

### QR Code Not Showing

1. Check you're on desktop device
2. Check JavaScript loaded (view source)
3. Check browser console for errors

### Shortcode Not Working

1. Check plugin is activated
2. Check shortcode spelling: `[beastside_filters]`
3. Check page is published
4. Clear cache if using caching plugin

### Assets Not Loading

1. Check `dist/` folder exists
2. Run `npm run build`
3. Check file permissions
4. Clear WordPress cache

## Support

For issues:
1. Check browser console for errors
2. Check WordPress debug log
3. Test with default WordPress theme
4. Disable other plugins to test conflicts

## License

MIT License - See LICENSE file

## Credits

- **3D Rendering:** Three.js
- **Face Tracking:** MediaPipe Face Mesh
- **Build Tool:** Vite
- **QR Code:** QRCode.js
