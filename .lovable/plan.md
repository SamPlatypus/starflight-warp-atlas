# Warp-Speed Real Starfield (offline, mobile, APK)

## What you get
- A full-screen 3D flight through real stars. Positions, brightness and colours come from real catalogues.
- Steer by dragging. Tap to centre. Hold the boost button for a warp burst with stars streaking.
- Small controls that fade out: speed slider, star-density slider, boost button, settings gear. Tap the screen to bring them back.
- Works offline once opened. An "Install App" button adds it to the home screen.
- A GitHub workflow builds an Android APK you can download and sideload.

## Star data
- Yale Bright Star Catalogue (about 9,100 naked-eye stars): names, magnitude and colour index.
- The Yale catalogue has no distances, so it gets merged with the HYG database (Hipparcos-based, about 120k stars, with real distances). Nearby stars sit where they really are in 3D.
- Pre-processed once into a compact binary file (position xyz, magnitude, colour) shipped inside the app. No network needed.
- The density slider shows the brightest N stars, from about 5k up to the full 120k.
- Past the real stars, a procedural "far field" fills in, so warp travel never runs out of stars.

## Look and feel
- Stars drawn as GPU points with true B-V colour (blue-white to orange-red) and magnitude-based size.
- Streaks: each star stretches along its motion direction based on speed. Boost adds stronger streaking, a slight field-of-view kick and a soft trail fade for subtle motion blur.
- Smooth steering with inertia. Speed eases in and out.
- Aimed at 60fps: one draw call for all stars, all motion in the shader, and an adaptive pixel ratio on weaker phones.

## Install and offline
- An offline cache (service worker) plus app manifest and icons.
- The in-app "Install App" button uses the browser's install prompt. On iOS, where that prompt isn't available, it shows "Share, then Add to Home Screen" instructions. Inside the APK it hides itself.

## Android APK
- The Capacitor Android project gets added to the repo.
- A GitHub Actions workflow runs on every push: installs dependencies, builds the web app, syncs Capacitor, runs Gradle `assembleDebug`, and uploads the APK as a downloadable artifact. A signed release build is optional later, using keystore secrets.
- You connect GitHub from Project settings, then Git. I can't connect it for you, and I can't run Gradle here: the APK is built by GitHub.

## Technical details
- three.js + React Three Fiber on an `ssr: false` route. The flight sim lives in plain TS modules. A single `useFrame` stepper keeps state in refs.
- A custom ShaderMaterial on `THREE.Points`. Stars wrap and recycle in a camera-relative volume for endless travel. Streak length comes from per-vertex velocity times speed.
- A data script in `scripts/` downloads the catalogues, cross-matches the Yale catalogue with HYG by HR/HD number, and writes a `public/stars.bin` Float32 buffer.
- Capacitor needs static files, so the app gets a client-only static build (SPA output) as `webDir`. Wrapping the native app needs no server.
- Pointer-events touch controls, with `touch-action: none` to stop page scrolling. The screen stays awake during flight.
- Verification: screenshot checks in the sandbox. Real 60fps, feel and APK install can only be checked on your phone.
