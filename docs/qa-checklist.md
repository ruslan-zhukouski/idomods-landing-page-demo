# Implementation verification

## Phase 2 — passed

- [x] Complete semantic page and Polish content are available without JavaScript.
- [x] Original artwork, masks, logos, fonts, and footer marks appear locally.
- [x] Desktop card widths match 648/936 px and the reversed second row.
- [x] Static shader fallback uses real HTML copy and a procedural background.
- [x] No horizontal overflow at 320, 375, 768, 1280, 1600, or 1920 px.
- [x] All page images load; no failed HTTP requests, duplicate IDs, nested actions, or dead anchors.
- [x] Search serializes the correct query; native cookie disclosure opens by keyboard.
- [x] Desktop/mobile visual captures inspected.
- [x] Unknown destinations and later-phase interactions are documented.

Evidence: [Phase 2 report](phase-2-report.md) and [browser measurements](phase-2-browser-report.json).

## Phase 3 — passed

- [x] Compact menu, visible search and utility controls, and expanded no-JavaScript fallback.
- [x] Keyboard activation, Escape/focus restoration, outside pointer, tab exit, and breakpoint focus recovery.
- [x] Seventeen viewport widths from 320 to 1920 px with scripts enabled and disabled.
- [x] Continuous resize in 16 px steps, including open navigation, without overflow or text/media overlap.
- [x] Crop-aligned lamp geometry prepared without exposing inactive controls.
- [x] Original card media preserved with protected copy space on smaller screens.

Evidence: [Phase 3 report](phase-3-report.md).

## Phase 4 — motion and carousel

- [x] Single-clock 3000 ms carousel, 600 ms fades, 800 ms incoming scale, and linear progress.
- [x] Hover/focus, explicit pause, hidden-document handler, and offscreen pause; no background catch-up.
- [x] Explicit resume works with pointer/focus retained on the button, advances slides, and preserves environment guards; renewed hover/focus pauses work.
- [x] Rapid input settles to one image; second-image failure keeps usable first-slide content.
- [x] Keyboard lamp activation, mobile pointer/touch operation, and reset/exclusion on inactive slides.
- [x] Each supplied lamp cutout grows smoothly to 1.1 on fine-pointer hover, returns on leave, and carries its lit glow; reduced motion and failed-cutout fallback retain the original size.
- [x] Header opacity faces and isolated card media/button effects.
- [x] Live and initial reduced-motion preference; instant manual slide changes.
- [x] Twenty responsive widths, overlaid mobile search/controls, crop-aware lamp targets, and no-JavaScript fallback.
- [x] Both images fill the entire viewport-height carousel at 20 additional width/height combinations, including the 1114 px boundary, short landscape screens, and resizing without reload.

Evidence and limits: [Phase 4 report](phase-4-report.md), [browser results](phase-4-browser-report.json).

## Phase 5 — WebGL shader

- [x] Procedural black/gold WebGL waves behind singular, stationary HTML content.
- [x] Exact GPU pixel repetition at 0/25/50 seconds and matching frames on both sides of consecutive boundaries; continuous boundary motion.
- [x] Two uninterrupted real-time cycles with bounded phase steps, stationary content, and a maximum 30 fps draw cadence.
- [x] Keyboard pause/resume retains focus and active phase; offscreen and hidden-document pauses avoid catch-up.
- [x] Initial/live reduced motion keeps a stable composition; user pause persists across preference changes.
- [x] Seven desktop/mobile/DPR combinations preserve canvas coverage, readable layout, and separate CTA/pause controls.
- [x] Drawing buffer capped at DPR 1.5 and approximately 1.6 million pixels; no per-frame layout measurement.
- [x] Actual context loss/restoration rebuilds GPU resources and retains explicit pause.
- [x] Unavailable WebGL, compilation failure, and disabled JavaScript retain the procedural fallback and usable content.
- [x] Cleanup removes listeners/observers/RAF, deletes GPU resources, and permits reinitialization.
- [x] Desktop/mobile captures inspected; no runtime exceptions or failed HTTP responses.

Evidence and limits: [Phase 5 report](phase-5-report.md), [browser results](phase-5-browser-report.json). Shader checks use Chrome's software WebGL; hardware/mobile GPU profiling remains in Phase 6.

## Phase 6 — not yet verified

- [ ] Full keyboard/screen-reader/contrast and cross-browser checks.
