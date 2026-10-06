# 고고고! 사진퍼즐

**찍고, 자르고, 붙이고. 고고고!** Camera/gallery → crop → puzzle. Phone layouts show six large pieces at a time with previous/next controls, advance when a tray is completed, and open the correct tray for a hint. The editor keeps a large start button at the bottom of the phone screen, with difficulty chosen before starting. Touch controls are at least 44px where practical.

Korean, mobile-first photo puzzles for young children. Built with Next.js App Router, TypeScript, React and browser APIs. The deployed app is static HTML/CSS/JavaScript; there is no API, backend, authentication, analytics or cloud storage.

## Develop and build

Use Node.js 22 or newer.

```sh
npm install
npm run dev
```

Open http://localhost:3000. Development uses `/` and does not register a service worker.

```sh
npm run typecheck
npm test
npm run build
npm run preview
```

`npm run build` exports `out/` and then generates the offline worker from **the actual exported files**. Preview serves only these files at http://127.0.0.1:4173/gogogo/, including real 404 responses. It does not run Next.js or provide any app backend.

Production defaults to `/gogogo`. For another repository or a custom domain, set `NEXT_PUBLIC_BASE_PATH` consistently at build and preview time; use an empty string for a root-domain site. `basePath` also prefixes Next's static assets, so a second `assetPrefix` is unnecessary. Asset links share `src/lib/paths.ts`. Manifest URLs are relative to the manifest, making its start URL, scope and icons safe at either path. The post-build script also adds dotted aliases for any nested Next.js segment-data files, so static hosting serves route prefetch requests without rewrites or 404s.

## GitHub Pages deployment

1. Put this project in your `gogogo` GitHub repository. If the folder has no repository yet, run `git init -b main` and `git remote add origin https://github.com/neegiman/gogogo.git`.
2. In the repository, open **Settings → Pages → Build and deployment → Source → GitHub Actions**. Ensure Actions is enabled.
3. Push to `main`:

```sh
git add .
git commit -m "Add photo puzzle app"
git push -u origin main
```

`.github/workflows/deploy.yml` runs `npm ci`, TypeScript checks, rule tests and `npm run build`, uploads `out/` using `actions/upload-pages-artifact`, and publishes with `actions/deploy-pages`. No manual copying is needed. The deployment job links to the final Pages URL, such as https://neegiman.github.io/gogogo/.

If your default branch is not `main`, update the workflow trigger. If your repository is not `gogogo`, update `NEXT_PUBLIC_BASE_PATH` in the workflow. `.nojekyll` is included for compatibility. The lockfile pins the verified dependency versions.

## Project structure

```text
.github/workflows/deploy.yml       Pages build and deployment
public/                           Bundled sample, icons, manifest, local sounds
scripts/
  prepare-public.mjs              Generates PNG icons, WAV chimes and manifest
  build-offline.mjs               Versioned worker based on exported resources
  preview.mjs                     Static-only repository-path preview
src/
  app/                           Static layouts and /, /puzzle/, /records/ routes
  components/                    Photo selector, editor, puzzle, rewards, records, PWA
  hooks/                         Image gestures, pointer dragging, game and timer
  lib/                           Image normalization, puzzle rules, storage, audio, paths
  types/                         Difficulty, normalized pieces and record models
tests/                           Rule tests and production browser scenarios
```

## Implementation

- **Photos:** camera/gallery file inputs; MIME validation; 50MB limit; native EXIF-aware decoding; one normalized working Canvas with a maximum side of 2048px. The source bitmap is released, and fallback Object URLs are revoked. Unsupported HEIC/HEIF or damaged images get Korean guidance.
- **Editor:** square crop, pan, two-finger pinch, zoom slider/buttons, 90° rotation and reset. Cover bounds prevent empty crop edges. The final 1024×1024 cropped Canvas is used by the game.
- **Puzzles:** 12 (3 columns × 4 rows), 16 (4×4), 20 (4×5), 24 (4×6). Pieces reference normalized source rectangles, keeping the model independent of rendering and adaptable to future shapes. Fisher–Yates shuffling avoids the unchanged order. All pieces stay accessible in a responsive tray.
- **Interaction:** Pointer Events and pointer capture; a fixed drag overlay updated with refs and requestAnimationFrame. Drops use piece-relative snap distance, and only the piece's own target can lock. Incorrect/canceled drops return to the tray. Tap a piece then its target as an alternative, or use keyboard Tab/Enter. Viewport changes cancel active drags safely.
- **Rendering:** source sections are drawn into small Canvases. ResizeObserver applies devicePixelRatio (capped at 3 for memory). No permanent piece images, base64 gameplay assets or pointer-move updates to app-wide React state.
- **Feedback:** optional guide at 25% opacity; a repeating sequence of original preview, piece highlight, then matching target highlight. Hints never solve a piece. A `performance.now()` elapsed timer starts on play and stops once. Every completion earns 1–3 stars; time does not reduce rewards.
- **Sound:** original, locally generated WAV chimes (rather than MP3) need no codec or remote service. Playback starts after a gesture; autoplay or audio failure is caught. Sound preference uses localStorage. Vibration is optional and guarded.
- **Records:** IndexedDB stores only small result metadata. No original photos or thumbnails are persisted. Total completions, per-difficulty bests and 30 recent records are shown. Clear requires a confirmation dialog. Storage/quota errors do not prevent completing or replaying a puzzle. Completion IDs prevent duplicate writes.
- **Privacy:** selected files, normalized Canvases and crops remain in memory. They are never uploaded or added to Cache Storage. Leaving the session or reloading releases them; reload safely asks for a new photo. `fetch` is used only in the generated service worker for same-origin **GET** application assets. There is no XMLHttpRequest, FormData, photo upload, analytics, remote font or image API. Next.js makes read-only GET/HEAD requests for static route data.
- **PWA:** relative manifest paths, maskable PNG icons, standalone display and a content-hashed `photo-puzzle-v1-*` cache. Initial installation precaches every exported page, route-data file, JS, CSS, sound and icon. The footer says when offline is ready. Cache upgrades remove previous app caches and activate after existing tabs close, preserving a puzzle already in progress.

## Install and offline use

Visit once with a network connection and wait for **오프라인에서도 놀 수 있어요**. Chromium browsers show **홈 화면에 추가** when they emit `beforeinstallprompt`; their own install menu also works. iPhone Safari shows the unobtrusive guide **공유 버튼 → 홈 화면에 추가**. The app works without installation too.

After offline preparation, reload or launch without a network connection, select a local photo, edit it, play and read/write records. Only app files are cached, not user photos. Browser cache eviction, clearing website data, private browsing or disabling service workers can remove or prevent offline availability. GitHub Pages HTTPS supports service workers; local testing uses localhost.

## Browser testing

```sh
npm run build
npm run test:e2e
npm run verify:dev
```

The supplied Playwright configuration uses installed Microsoft Edge for desktop and Android-size touch emulation. On Linux/macOS or CI, remove `channel: 'msedge'` and run `npx playwright install chromium`, or choose an installed Chromium browser. Browser tests cover production paths, all offline assets, local photo processing, rotation/zoom, drag/tap snapping, wrong targets, hints, all difficulties, completion, records/reload/deletion, sound failures, storage failure and offline local-photo play. Native touch/pinch uses Chromium DevTools touch input. Generated screenshots are in `test-results/`.

Physical-device checklist (emulation cannot validate the device camera or real home-screen installation):

| Platform | Check |
|---|---|
| iPhone Safari | Camera portrait/landscape and HEIC handling; two-finger crop; rotate; all 4 difficulties; touch drag and interrupted touch; portrait/landscape; Share → Add to Home Screen; airplane-mode relaunch and local-photo play. |
| Android Chrome | Camera/gallery/cancel; a large photo; pinch crop; all difficulties; drag/snap and hints; optional vibration; mute/reopen; install prompt; airplane-mode reload; completion and saved records. |
| Desktop Chrome/Edge | Mouse drag including incorrect drops; keyboard/tap alternative; four difficulties; guide/hints/replay; records after reload; cancel and confirm deletion; install/offline reload; Network panel has no 404s and no photo upload requests. |

Known limits: some browsers cannot decode HEIC; convert it to JPEG/PNG if needed. The OS may still allocate memory while decoding a very large compressed photo before it can be downscaled. Records belong to a browser/profile and do not sync. Photo editing and in-progress puzzle state intentionally do not survive reload. The camera file-input behavior, install prompt, audio, vibration and storage availability depend on the browser. Real iPhone/Android hardware checks remain necessary.

Verified in this workspace on 2026-10-06: Next.js 16.3.8 production compilation and static export; TypeScript; 6 rule tests; 20 browser scenarios passed (two phone-specific scenarios are intentionally skipped in the desktop project). All 50 generated offline resource URLs returned 200 under `/gogogo/`, and navigation produced no 404s. Tests include EXIF orientation, a 4000×3000 photo, real emulated touch/pinch/cancel input, 320–430px phone viewports, six-piece tray paging/automatic advancement, reachable editor actions, and offline local-file gameplay with persistent records. Development root paths, editor → puzzle → records navigation, and absence of browser errors/404s also passed. The project is connected to https://github.com/neegiman/gogogo, with GitHub Pages configured for GitHub Actions deployment at https://neegiman.github.io/gogogo/.

Configuration follows the official [Next.js static export](https://nextjs.org/docs/app/guides/static-exports), [basePath](https://nextjs.org/docs/app/api-reference/config/next-config-js/basePath), and [GitHub Pages custom workflow](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages) documentation.
