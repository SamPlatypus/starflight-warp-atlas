# Starflight Atlas

A warp-speed 3D flight through real stars, built for phones and fully offline.

## Features
- ~109,000 real stars in true 3D positions, from the Yale Bright Star Catalogue merged with the HYG database (Hipparcos distances).
- Real star colours (B-V index) and magnitude-based brightness.
- Drag to steer, tap to centre, hold **Boost** for a warp burst with streaking stars.
- Speed and star-density sliders; controls fade out to keep the view clear.
- Works offline and installs to your home screen via the in-app **Install App** button.
- Android APK built automatically with Capacitor and Gradle.

## Run locally
```sh
npm install
npm run dev
```

## Builds
| Command | Output |
| --- | --- |
| `npm run build:mobile` | Static site in `dist-mobile/` (used for GitHub Pages and the APK) |
| `npm test` | Flight-sim tests |

## GitHub Pages
`.github/workflows/pages.yml` builds the static site and deploys it on every push to `main`.
One-time setup: **Settings → Pages → Build and deployment → Source: GitHub Actions**.

## Android APK
`.github/workflows/android.yml` builds a debug APK on every push to `main`.
Download it from the **Actions** tab (artifact `starflight-atlas-apk`) and sideload it.

## Star data
`scripts/build-stars.py` downloads the catalogues, cross-matches them and writes `public/stars.bin`. The app needs no network at runtime.
