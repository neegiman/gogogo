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
  hooks/                         Image gestures, placement, challenges and timer
  lib/                           Image normalization, puzzle rules, storage, audio, paths
  types/                         Difficulty, normalized pieces and record models
tests/                           Rule tests and production browser scenarios
```

## Implementation

- **Photos:** camera/gallery file inputs; MIME validation; 50MB limit; native EXIF-aware decoding; one normalized working Canvas with a maximum side of 2048px. The source bitmap is released, and fallback Object URLs are revoked. Unsupported HEIC/HEIF or damaged images get Korean guidance.
- **Editor:** 12 pieces are selected by default, with a clear selection badge and a crop grid matching the selected columns/rows. Square crop, pan, two-finger pinch, zoom slider/buttons, 90° rotation and reset. Start waits for the first successful preview render, prevents duplicate submission, and shows a Korean message with a retry if cropping fails. The cropped photo starts the game immediately in the current page, without a route fetch that could fail and discard the in-memory photo. Cover bounds prevent empty crop edges. The final 1024×1024 cropped Canvas is used by the game.
- **Puzzles:** 12 (3 columns × 4 rows), 16 (4×4), 20 (4×5), 24 (4×6). Pieces reference normalized source rectangles, keeping the model independent of rendering and adaptable to future shapes. Fisher–Yates shuffling avoids the unchanged order. All pieces stay accessible in a responsive tray.
- **Interaction:** tap a tray piece, then any empty board cell. Placement never checks correctness, locks a piece or gives correctness feedback. After every cell is filled, **도전!** checks the entire arrangement. An unsuccessful attempt keeps all pieces editable and gives only a friendly overall message; **다시 도전!** checks again after changes. Double-click on desktop or two taps on a phone returns any placed piece to its tray page. A single tap selects a placed piece for moving to an empty cell. Keyboard Tab/Enter/Space selects and places; Delete/Backspace returns a placed piece. Native buttons avoid mobile drag/scroll conflicts; Pointer Events remain in the image editor for pan/pinch.
- **Rendering:** source sections are drawn into small Canvases. ResizeObserver applies devicePixelRatio (capped at 3 for memory). On portrait phones the board, tray and tools scroll in normal document order, with no sticky overlays covering pieces. No permanent piece images, base64 gameplay assets or pointer-move updates to app-wide React state.
- **Feedback:** original view opens the full cropped photo in a large dialog, so placed pieces never obscure it. Each of at most three hints per round moves one unfinished piece into its correct cell. A displaced piece swaps into the vacated cell, or returns to the tray if the hinted piece came from the tray. Hints preserve every piece, keep already-correct pieces in place, and never trigger completion automatically. Hinted pieces remain editable; replay restores three hints. Each challenge shows one large centered success/retry message for two seconds, then removes it. Success reveals an inline reward/record card with replay actions. A `performance.now()` timer starts on play and stops once, after a successful challenge. Every completion earns 1–3 stars; time and unsuccessful attempts do not reduce rewards.
- **Sound:** original, locally generated WAV chimes need no codec or remote service. Hints use a small correct-piece chime; successful challenges use the completion chime. Ordinary arrangement and unsuccessful attempts stay neutral. Playback starts after a gesture; autoplay or audio failure is caught. Sound preference uses localStorage. Vibration is optional and guarded.
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

The supplied Playwright configuration uses installed Microsoft Edge for desktop and Android-size touch emulation, plus Playwright WebKit with an iPhone viewport for mobile regressions (`npx playwright install webkit` if needed). On Linux/macOS or CI, remove `channel: 'msedge'` and run `npx playwright install chromium webkit`, or choose an installed Chromium browser. Browser tests cover production paths, all offline assets, default 12-piece photo-to-crop startup, crop failure/retry, rotation/zoom, free tap placement, unchanged incorrect arrangements after challenges, centered messages appearing once then disappearing, full original view, three correcting hints on empty/full boards at all difficulties, hint limits/replay reset, double-tap return, keyboard controls, completion, records/reload/deletion, sound failures, storage failure and offline local-photo play. Mobile regressions also simulate an unavailable puzzle route, verify non-overlapping scroll layout at 320×568, tap between the scrolled tray and board, and check photo gestures/startup in a short viewport. Native touch/pinch uses Chromium DevTools touch input. Generated screenshots are in `test-results/`.

Physical-device checklist (emulation cannot validate the device camera or real home-screen installation):

| Platform | Check |
|---|---|
| iPhone Safari | Camera portrait/landscape and HEIC handling; two-finger crop; rotate; all 4 difficulties; tap piece → tap empty cell; two taps return; no correctness feedback before challenge; retry after an incorrect arrangement; portrait/landscape; Share → Add to Home Screen; airplane-mode local-photo play. |
| Android Chrome | Camera/gallery/cancel; large photo; pinch crop; all difficulties; free placement, two-tap return, challenge/retry and hints; optional completion vibration; mute/reopen; install prompt; airplane-mode reload; saved records. |
| Desktop Chrome/Edge | Click piece → click empty cell; double-click return; keyboard select/place/Delete; four difficulties; incorrect whole-board challenge then correction/retry; guide/hints/replay; records after reload; confirmed deletion; install/offline reload; no 404s or photo upload requests. |

Known limits: some browsers cannot decode HEIC; convert it to JPEG/PNG if needed. The OS may still allocate memory while decoding a very large compressed photo before it can be downscaled. Records belong to a browser/profile and do not sync. Photo editing and in-progress puzzle state intentionally do not survive reload. The camera file-input behavior, install prompt, audio, vibration and storage availability depend on the browser. Real iPhone/Android hardware checks remain necessary.

Verified in this workspace on 2026-10-06: Next.js 16.3.8 production compilation and static export; TypeScript; 10 rule tests; 42 browser scenarios across desktop, Android-size touch and WebKit/iPhone emulation (two phone-only scenarios are skipped in the desktop project). All 51 generated offline resource URLs returned 200 under `/gogogo/`, and navigation produced no 404s. Tests include local-photo startup while puzzle-route requests are deliberately blocked, non-overlapping scroll layout at 320×568, selecting/placing/returning pieces across scroll positions, default 12-piece crop startup, recoverable crop failure, original preview, three correcting hints at every difficulty, hint limits/replay reset, centered success/retry notices, freely placing incorrect pieces, whole-board challenge/retry, double-click/two-tap return, keyboard controls, EXIF orientation, a 4000×3000 photo, native emulated touch/pinch/cancel, 320–430px phone layouts, tray paging, and offline local-file play with persistent records. Development root paths, photo editing → immediate puzzle start → records navigation, and absence of browser errors/404s also passed. The project is connected to https://github.com/neegiman/gogogo, with GitHub Pages configured for GitHub Actions deployment at https://neegiman.github.io/gogogo/.

Configuration follows the official [Next.js static export](https://nextjs.org/docs/app/guides/static-exports), [basePath](https://nextjs.org/docs/app/api-reference/config/next-config-js/basePath), and [GitHub Pages custom workflow](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages) documentation.
