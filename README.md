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

### Development (Current Phase 1)

```bash
# Install dependencies
npm install

# Start dev server at http://localhost:3000/
npm run dev

# Build for production
npm run build
```

**Testing Phase 1:**
Open http://localhost:3000/ in your browser:
1. Grant camera permission when prompted
2. See your video feed (mirrored selfie mode)
3. See orange rotating cube overlaid on video (placeholder for 3D character)
4. Click Close button to verify UI

**Expected:** Camera displays, Three.js cube rotates smoothly at 30fps+

### WordPress Installation (Phase 7)

1. Build for production: `npm run build`
2. Copy plugin folder to `wp-content/plugins/`
3. Activate in WordPress admin
4. Add shortcode to page: `[beastside_filters]`

*Note: WordPress integration will be completed in Phase 7*

## Project Structure

```
beastsidebanner/
├── src/
│   ├── js/
│   │   ├── main.js              # Entry point ✅
│   │   ├── core/
│   │   │   ├── FilterApp.js     # Main orchestrator ⭐ ✅
│   │   │   ├── CameraManager.js # Camera access ✅
│   │   │   ├── ThreeRenderer.js # Three.js rendering ✅
│   │   │   ├── FaceTracker.js   # MediaPipe (Phase 2)
│   │   │   ├── CharacterManager.js # 3D models (Phase 3)
│   │   │   ├── MediaCapture.js  # Photo/video (Phase 5)
│   │   │   └── UIController.js  # Gestures (Phase 4)
│   │   └── utils/               # Helpers (Phase 2+)
│   └── css/
│       ├── main.css             # Global styles ✅
│       └── components/
│           └── filter-container.css ✅
├── assets/
│   └── models/                  # 3D character models (Phase 3)
├── php/                         # WordPress plugin (Phase 7)
│   └── beastside-filters.php   # Main plugin file
├── dist/                        # Built files (npm run build)
├── docs/
│   └── PROGRESS.md              # Implementation tracking
└── index.html                   # Test page ✅
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

## Implementation Status

**Phase 1: Foundation** ✅ COMPLETE
- Camera feed working
- Three.js rendering pipeline
- Placeholder cube rotating at 30fps+
- Responsive layout (mobile-optimized)
- Dev server: http://localhost:3000/

**Phase 2: Face Tracking** - NEXT
- MediaPipe Face Mesh integration
- Blendshape calculation
- Event system

**Phases 3-8:** Pending (see docs/PROGRESS.md)

**Timeline:** 2-3 weeks for full MVP

## Documentation

- **Implementation Plan:** `/Users/calebsmiler/face-filter-prd.md`
- **Progress Tracking:** `docs/PROGRESS.md`
- **Project Instructions:** `CLAUDE.md`
