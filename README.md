# BEASTSIDE Filters WordPress Plugin

Interactive face filter plugin that brings BEASTSIDE game characters to life through real-time 3D face tracking in the browser.

## Features

- 🎭 Real-time 3D character face overlays
- 😊 Expression tracking and mapping
- 📸 Photo capture with download/share
- 🎥 Video recording with audio
- 📱 Mobile-optimized (iOS Safari & Android Chrome)
- ⚡ Client-side processing (no server required)

## Tech Stack

- **3D Rendering**: Three.js
- **Face Tracking**: MediaPipe Face Mesh
- **Build Tool**: Vite
- **WordPress**: Plugin API with shortcode
- **Browser APIs**: MediaDevices, MediaRecorder

## Quick Start

### Prerequisites
- Node.js 18+
- WordPress 6.0+
- PHP 8.0+
- HTTPS-enabled site (required for camera access)

### Installation

1. Clone and install dependencies:
```bash
git clone <repo-url>
cd beastsidebanner
npm install
```

2. Build for production:
```bash
npm run build
```

3. Install in WordPress:
- Copy entire plugin folder to `wp-content/plugins/`
- Activate in WordPress admin

4. Add to homepage:
```php
[beastside_filters]
```

### Development

```bash
npm run dev    # Start dev server with HMR
npm run build  # Production build
```

## Project Structure

```
beastsidebanner/
├── src/
│   ├── js/              # JavaScript modules
│   │   ├── main.js      # Entry point
│   │   ├── camera.js    # Camera handling
│   │   ├── face-tracking.js
│   │   └── renderer.js  # Three.js renderer
│   ├── css/             # Stylesheets
│   ├── components/      # UI components
│   └── utils/           # Helper functions
├── assets/
│   └── models/          # 3D character models (GLB)
├── php/
│   ├── beastside-filters.php  # Main plugin file
│   ├── includes/        # Core functionality
│   ├── admin/           # Admin interface
│   └── public/          # Public-facing code
├── dist/                # Built files (generated)
└── docs/                # Documentation
```

## Performance Targets

- ✅ 30fps minimum on mobile devices
- ✅ <3s time to first interaction
- ✅ <5% error rate
- ✅ <500MB memory usage

## Browser Support

- Chrome 90+
- Safari 14+ (iOS 14+)
- Firefox 88+
- Edge 90+

## License

MIT

## Documentation

See [PRD](/Users/calebsmiler/face-filter-prd.md) for complete product requirements.
