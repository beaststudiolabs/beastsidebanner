# BEASTSIDE Filters - Production Checklist

## Pre-Launch Checklist

### 1. Build & Assets ✅

- [x] Run production build: `npm run build`
- [x] Verify dist/ folder created
- [x] Check bundle sizes (JS: ~665KB, CSS: ~8KB)
- [x] Test gzipped sizes (JS: ~172KB, CSS: ~2KB)
- [ ] Add character models to `assets/models/`
  - [ ] boy1.glb (max 3MB)
  - [ ] girl1.glb (max 3MB)
  - [ ] boy2.glb (max 3MB)
  - [ ] girl2.glb (max 3MB)
  - [ ] girl3.glb (max 3MB)
- [ ] Verify models have correct morph targets
- [ ] Test models load correctly

### 2. WordPress Setup ✅

- [ ] Copy plugin to WordPress: `wp-content/plugins/beastside-filters/`
- [ ] Activate plugin in WordPress admin
- [ ] Verify no PHP errors
- [ ] Check HTTPS enabled (required!)
- [ ] Test shortcode: `[beastside_filters]`
- [ ] Verify assets load on page
- [ ] Check browser console for errors

### 3. Device Testing 📱

#### Desktop
- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)
- [ ] Verify QR code displays
- [ ] Test QR code scanning

#### Mobile
- [ ] iOS Safari (iPhone 12+, iOS 14+)
  - [ ] Camera permission
  - [ ] Face tracking works
  - [ ] Character switching (swipe)
  - [ ] Photo capture
  - [ ] Video recording
  - [ ] Share functionality
- [ ] Android Chrome (Pixel 5+, Galaxy S21+)
  - [ ] Camera permission
  - [ ] Face tracking works
  - [ ] Character switching (swipe)
  - [ ] Photo capture
  - [ ] Video recording
  - [ ] Share functionality

#### Tablet
- [ ] iPad (iOS 14+)
- [ ] Android tablet

### 4. Performance Testing ⚡

- [ ] FPS ≥30 on mobile
- [ ] Load time <3 seconds
- [ ] Memory usage <500MB
- [ ] No memory leaks (test 5+ minutes)
- [ ] Test on low-end devices
  - [ ] Performance degradation works
  - [ ] Lower resolution on low-end
  - [ ] FPS warnings show
- [ ] Test character switching speed (<500ms)

### 5. Feature Testing ✨

#### Face Tracking
- [ ] Face detected successfully
- [ ] Tracking follows movement
- [ ] Expression mapping works
  - [ ] Eye blink
  - [ ] Mouth open/close
  - [ ] Smile
- [ ] "Face lost" message shows when leaving frame
- [ ] Face re-detection works

#### Character Switching
- [ ] Swipe left → Next character
- [ ] Swipe right → Previous character
- [ ] Arrow keys work (desktop)
- [ ] Number keys work (1-5)
- [ ] Click dots work
- [ ] Character name updates
- [ ] Active dot highlights
- [ ] All 5 characters load

#### Media Capture
- [ ] Photo capture works
  - [ ] Preview shows
  - [ ] Download works
  - [ ] Share works (mobile)
  - [ ] Image quality good
- [ ] Video recording works
  - [ ] Recording starts
  - [ ] Timer shows
  - [ ] Recording stops
  - [ ] Preview shows with playback
  - [ ] Download works
  - [ ] Share works (mobile)
  - [ ] Audio included (if permission granted)
  - [ ] 30-second limit works

#### Error Handling
- [ ] Camera permission denied → Error message
- [ ] Camera in use → Error message
- [ ] No camera → Error message
- [ ] Retry button works
- [ ] HTTPS warning (if not HTTPS)
- [ ] Performance warnings (low FPS)
- [ ] Browser unsupported → Error message

### 6. UI/UX Testing 🎨

- [ ] All buttons respond to clicks
- [ ] Loading states show
- [ ] Debug info shows (FPS, face status)
- [ ] Character indicator animates
- [ ] Swipe hint appears
- [ ] Error messages readable
- [ ] Preview modal works
- [ ] Close buttons work
- [ ] Responsive on all screen sizes
- [ ] Portrait mode works
- [ ] Landscape warning shows (if needed)

### 7. Integration Testing 🔗

- [ ] WordPress shortcode works
- [ ] Multiple shortcodes on page (if needed)
- [ ] Works with different themes
- [ ] No conflicts with other plugins
- [ ] Admin notice for HTTPS shows (if no HTTPS)
- [ ] QR code generates correctly
- [ ] Mobile redirect works from QR code

### 8. Security & Privacy 🔒

- [ ] HTTPS enforced
- [ ] Camera permission requested properly
- [ ] No sensitive data logged
- [ ] Console logs removed in production
- [ ] No XSS vulnerabilities
- [ ] File upload restrictions (if any)
- [ ] CORS configured correctly (if needed)

### 9. Analytics Setup 📊

- [ ] Track engagement metrics
  - [ ] Filter opens
  - [ ] Character switches
  - [ ] Photo captures
  - [ ] Video recordings
  - [ ] Shares
  - [ ] Error rates
  - [ ] Average session time
- [ ] Track performance metrics
  - [ ] Average FPS
  - [ ] Load times
  - [ ] Device types
  - [ ] Browser types

### 10. Documentation 📚

- [x] README.md complete
- [x] Installation instructions
- [x] Troubleshooting guide
- [ ] User guide for end-users
- [ ] Video tutorial (optional)
- [ ] FAQ section
- [ ] Browser compatibility list

### 11. Optimization ⚡

- [x] Code splitting (vendor chunks)
- [x] Minification (terser)
- [x] Console logs removed
- [x] Sourcemaps disabled
- [x] Performance config for device detection
- [x] Dynamic resolution based on device
- [x] Pixel ratio optimization
- [ ] Image optimization (if any images)
- [ ] Font subsetting (if custom fonts)
- [ ] CDN setup (optional)

### 12. Backup & Recovery 💾

- [ ] Code repository up to date
- [ ] Tagged release version
- [ ] Backup of WordPress site
- [ ] Backup of database
- [ ] Rollback plan documented

## Launch Day 🚀

1. **Pre-Launch (1 hour before)**
   - [ ] Final build: `npm run build`
   - [ ] Upload to production server
   - [ ] Verify all files uploaded
   - [ ] Test on production URL
   - [ ] Clear all caches

2. **Launch**
   - [ ] Publish page with shortcode
   - [ ] Test immediately on desktop
   - [ ] Test immediately on mobile
   - [ ] Monitor browser console for errors
   - [ ] Monitor WordPress error logs

3. **Post-Launch (First Hour)**
   - [ ] Monitor performance
   - [ ] Check error rates
   - [ ] Respond to any issues quickly
   - [ ] Test with real users
   - [ ] Monitor analytics

4. **Post-Launch (First Day)**
   - [ ] Review analytics data
   - [ ] Check engagement metrics
   - [ ] Collect user feedback
   - [ ] Fix any critical issues
   - [ ] Document any issues found

## Success Metrics (From PRD)

Track these metrics after launch:

- [ ] ≥20% homepage visitor engagement
- [ ] ≥50 social shares in first week
- [ ] <5% error rate
- [ ] Average time on site increases by 30 seconds
- [ ] 30fps average performance
- [ ] <3s average load time

## Known Limitations

Document any known issues:
- Placeholder character (until real models added)
- iOS Safari may require explicit HTTPS
- Some blendshapes not fully implemented (eye gaze, mouth pucker)
- QR code library loaded from CDN (could be bundled)

## Emergency Contacts

- Developer: [Your contact]
- WordPress Admin: [Contact]
- Hosting Support: [Contact]
- Domain/SSL: [Contact]

---

**Remember:** Test thoroughly before launch! Better to delay than launch with critical bugs.

**Good luck! 🎉**
