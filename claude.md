# BEASTSIDE Filters - WordPress Plugin

## Project Overview

**BEASTSIDE Filters** is a WordPress plugin that brings interactive face filter technology to the BEASTSIDE game website. Visitors can experience BEASTSIDE characters in real-time through their device camera.

### Key Features
- Real-time 3D character face overlay with expression tracking
- 5 BEASTSIDE characters (2 boys, 3 girls)
- Photo and video capture with download and native sharing
- Browser-based, no installation required
- Mobile-optimized for iOS and Android

### Technology Stack
- **3D Rendering**: Three.js (via CDN)
- **Face Tracking**: MediaPipe Face Mesh (primary candidate)
- **Build Tool**: Vite (modern, fast bundling)
- **WordPress**: Plugin architecture with shortcode/widget
- **Camera API**: MediaDevices/getUserMedia
- **Video Recording**: MediaRecorder API

### Project Structure
```
beastsidebanner/
├── src/
│   ├── js/              # JavaScript modules
│   ├── css/             # Stylesheets
│   ├── components/      # UI components
│   └── utils/           # Helper functions
├── assets/
│   └── models/          # 3D character models (GLB format)
├── dist/                # Built files for production
├── php/                 # WordPress plugin PHP files
└── docs/
    └── plans/           # Design documents
```

### Development Priorities
1. **Performance**: 30fps minimum on mobile devices
2. **Browser Compatibility**: Latest Chrome, Safari, Firefox
3. **User Experience**: Smooth, intuitive, no friction
4. **Client-Side Only**: No server processing required

### Launch Timeline
Target: Next week (aggressive timeline)

### Success Metrics
- ≥20% homepage visitor engagement with filter
- ≥50 social shares in first week
- <5% error rate
- Average time on site increases by 30 seconds

### Technical Constraints
- All processing happens client-side (browser)
- HTTPS required for camera access
- Portrait mode optimized
- Character models: max 3MB each (~15MB total)
- First character preloaded, remaining 4 lazy-loaded

### Current Status
Initial setup phase - establishing project structure and technology choices.

### Reference Documents
- PRD: `/Users/calebsmiler/face-filter-prd.md`
