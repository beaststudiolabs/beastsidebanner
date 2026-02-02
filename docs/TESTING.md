# BEASTSIDE Filters - Testing Guide

## Phase 1: Foundation Testing

### Prerequisites
- Modern browser (Chrome 90+, Safari 14+, Firefox 88+)
- Camera access enabled
- Dev server running at http://localhost:3000/

### Test Procedure

#### 1. Start Development Server
```bash
cd /Users/calebsmiler/Documents/GitHub/beastsidestudio/beastsidebanner
npm run dev
```

Server should start at http://localhost:3000/

#### 2. Open in Browser
Navigate to http://localhost:3000/

**Note:** Camera API may require HTTPS. If you get permission errors on HTTP:
- Chrome: May work on localhost (security exception)
- Safari: Likely requires HTTPS
- Firefox: May work on localhost

#### 3. Test Checklist

**Camera Permission:**
- [ ] Browser prompts for camera permission
- [ ] Clicking "Allow" grants access
- [ ] Clicking "Block" shows error message

**Video Display:**
- [ ] Video feed appears full-screen
- [ ] Video is mirrored (selfie mode)
- [ ] Video maintains aspect ratio
- [ ] Video fills viewport on mobile

**Three.js Rendering:**
- [ ] Orange cube appears on screen
- [ ] Cube rotates continuously
- [ ] Cube renders on top of video (transparent background)
- [ ] Animation is smooth (30fps+)

**UI Controls:**
- [ ] Close button visible in top-right
- [ ] Close button has proper styling (semi-transparent background)
- [ ] Close button hover effect works

**Error Handling:**
- [ ] Camera denied → Error message displays
- [ ] Camera not found → Error message displays
- [ ] Camera in use → Error message displays

**Responsive Behavior:**
- [ ] Portrait mode: Full-screen display
- [ ] Landscape mode (mobile): Rotate message appears
- [ ] Window resize: Canvas adjusts properly

#### 4. Browser Console Checks

Open browser console (F12) and verify:

**Initialization logs:**
```
BEASTSIDE Filters: Initializing...
Initializing modules...
Modules initialized
Starting application...
CameraManager: Requesting camera access...
CameraManager: Camera started successfully
Video dimensions: 1280x720
ThreeRenderer: Initializing...
ThreeRenderer: Placeholder cube created
ThreeRenderer: Starting render loop...
Application started
BEASTSIDE Filters: Initialization complete
```

**No errors** should appear unless camera permission denied (expected).

#### 5. Performance Checks

**Frame Rate:**
- Check animation smoothness visually
- Use browser DevTools Performance tab
- Target: 30fps minimum (cube rotation)

**Memory Usage:**
- Open DevTools Memory profiler
- Take snapshot after 30 seconds
- Should be <100MB (just camera + cube)

**Load Time:**
- Clear cache and reload
- Measure time from page load to cube visible
- Target: <2 seconds

### Expected Results

**Pass Criteria:**
✅ Camera permission prompt appears
✅ Video displays in selfie mode
✅ Orange cube rotates smoothly
✅ Close button renders and responds
✅ Console shows no errors
✅ 30fps+ animation

**Known Issues:**
- HTTP (non-HTTPS) may block camera on some browsers
- Safari may require explicit HTTPS
- First load may be slower (asset loading)

### Troubleshooting

**"Camera permission denied"**
- Check browser settings → Privacy → Camera
- Ensure site is allowed to access camera
- Try in incognito/private mode

**"Camera already in use"**
- Close other apps using camera (Zoom, FaceTime, etc.)
- Close other browser tabs accessing camera
- Restart browser

**"No camera found"**
- Check physical camera connection
- Check system camera privacy settings
- Try external webcam if built-in fails

**Cube not visible**
- Check console for Three.js errors
- Verify WebGL support: chrome://gpu
- Try different browser

**Performance issues**
- Close other browser tabs
- Check GPU acceleration enabled
- Lower screen resolution if needed
- Check browser DevTools Performance tab

### Next Phase Testing

Once Phase 1 passes all tests, proceed to Phase 2 (Face Tracking):
- See docs/PROGRESS.md for Phase 2 implementation
- Face tracking will replace rotating cube
- MediaPipe Face Mesh will be integrated

---

**Test Date:** _____________________
**Tester:** _____________________
**Browser:** _____________________
**Result:** ☐ Pass  ☐ Fail  ☐ Needs Fixes
