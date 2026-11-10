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

## Later phases — not yet verified

- [ ] Slider timings, pause reasons, rapid input, and failure handling.
- [ ] Interactive lamp regions and header/card motion.
- [ ] WebGL loop continuity, resize, context loss, and fallback behavior.
- [ ] Full keyboard/screen-reader/contrast and cross-browser checks.
