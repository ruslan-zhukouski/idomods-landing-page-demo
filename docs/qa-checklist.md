# Verification and handoff checklist

Verified on 10 November 2026. The static site is ready for review with the limitations below. This is not a WCAG, physical-device or production-performance certification.

## Visual, responsive and source integrity

- [x] Inspected current full-page 1920px and 375px captures against the saved Figma reference. Hero crop, local typography, 1600px container, 648/936 and reversed card widths, shader placement and all footer bands retain the intended composition.
- [x] Checked 320, 375, 390, 768, 1024, 1280, 1440 and 1920px, eleven intermediate/breakpoint widths, and 844×390 landscape. No horizontal overflow, clipped copy or missing footer content.
- [x] JavaScript-disabled checks pass at all eight acceptance widths. Separate pre-refactor comparisons pass across 20 states with identical layout rectangles and bounded raster differences.
- [x] 200% equivalent reflow at 960×540 CSS px / DPR 2 preserves navigation, content and CTA.
- [x] All 110 manifest files and eight lossless delivery copies are nonempty and match their hashes. Every runtime asset/style URL resolves locally; source mappings remain intact.
- [x] Ten payment/delivery marks, six awards, eight named country links and both partner marks are present and visually reviewed.
- [x] No temporary Figma URLs or reference screenshots are used by the runtime. The shader and its fallback retain real HTML content.
- [x] Generated HTML passes the standard HTML validator with no errors/warnings. Invalid fractional image dimensions and block elements nested in the partner mark's span were corrected.

Evidence: [current desktop](references/phase-6-1920.png), [current mobile](references/phase-6-375.png), [browser matrix](phase-6-browser-report.json), [asset audit](phase-6-assets-report.json), [HTML validation](phase-6-html-report.json), [visual regression](refactor-browser-report.json).

## Interactions and resilience

- [x] Compact header stays transparent/white when closed and white/dark when open; desktop hover/focus crossfades over 250ms. Hamburger/X controls stay on the right without borders.
- [x] All three registered lamp cutouts toggle by pointer/touch/keyboard, enlarge smoothly by 10%, and carry the aligned glow. Cropped/inactive controls are excluded; failed cutouts preserve usable lighting.
- [x] One carousel clock controls the 3000ms cycle, 600ms crossfade, 800ms image scale and linear progress. Arrows, selectors and rapid input settle correctly.
- [x] Explicit pause/resume works with focus/pointer retained; hover/focus, document visibility and offscreen pauses clear independently. Reduced motion works before load and when changed live.
- [x] Each card independently scales only its media over 500ms and crossfades its button over 200ms; the DOM motion audit finds only transform/opacity transitions.
- [x] Shader GPU pixels repeat across the 25-second boundary and two uninterrupted cycles; HTML content remains stationary. Resize, bounded resolution, pause/reduced motion, context loss/restoration, allocation failure and cleanup are covered.
- [x] Disabled JavaScript, disabled WebGL and failed module loading preserve usable content/navigation. Delayed modules preserve hero and following-section geometry before/after enhancement.
- [x] Native cookie disclosure opens from the keyboard. External commerce actions remain links to actual services, with no fake local transactions.

Evidence: [44 motion/carousel checks](phase-4-browser-report.json), [24 WebGL checks](phase-5-browser-report.json), [Phase 6 checks](phase-6-browser-report.json), [installed Firefox checks](phase-6-firefox-report.json). Hidden-document tests use the actual event handler with an injected visibility state; WebGL pixel tests use software rendering.

## Accessibility, browser and performance audit

- [x] Skip link, search focus, menu Space/Enter/Escape, focus restoration at breakpoints, disclosure lifecycle and tab traversal pass. Navigation initialization/cleanup does not duplicate listeners. Search now has a visible focus ring.
- [x] Accessible snapshots expose header/main/footer, named navigation, one H1, one active slide and named controls. Autoplay leaves the live region silent; manual navigation announces the selected slide.
- [x] Axe audits at 1920px and 375px record the supplied configurator color-contrast issue, with no additional violations in the audited rules. Automated snapshots/audits are not screen-reader listening.
- [x] Browser versions, native versus compatibility engines, WebKit keyboard preference behavior and mobile emulation are explicitly recorded in the Phase 6 report.
- [x] No uncaught runtime errors, missing images or HTTP failures in the normal runs. Navigation-cancelled requests are recorded separately from failed loads.
- [x] Mobile Lighthouse and a four-times CPU-slowed rendering trace inspected. The loading shift was fixed by reserving enhanced geometry before paint; loaded appearance and no-JavaScript geometry remain unchanged.
- [x] Build output reproduces from the authoring sources; focused Node tests, HTTP compression/revalidation checks and asset integrity checks pass.
- [x] Every generated anchor matches the captured official destination map or an explicit content decision. Three missing routes remain plain labels; TikTok uses its documented homepage placeholder.

Evidence: [accessible snapshot](phase-6-accessibility-snapshot.txt), [Lighthouse results](phase-6-lighthouse-report.json), [rendering profile](phase-6-performance-report.json), [destination review](phase-6-destinations-report.json). The full trace/raw audits remain in the system temporary directory. No authenticated or transactional external flows were executed.

## Remaining manual/design sign-off

- [ ] Correct white copy on the supplied blue configurator card (2.54:1 contrast); confirm the design change separately from the visual-preserving implementation. Full WCAG conformance is not claimed.
- [ ] Listen with NVDA/JAWS/VoiceOver; confirm names, landmark order, manual slide announcements and absence of autoplay spam.
- [ ] Check actual 200% browser UI zoom, plus macOS Safari with full keyboard access. Windows WebKit does not substitute for the Safari application.
- [ ] Check physical Android Chrome and iOS Safari, real tab switching, touch/rotation/browser bars and hardware GPU/battery performance. Emulated touch and software WebGL are supplementary evidence.
- [ ] Supply destinations for Promocje, Polityka bezpieczeństwa and Kurs światła; verify an official SOLLUX TikTok profile and distinct slide-two copy if desired.
- [ ] Set the final public URL in site.config.mjs, regenerate and configure the production host before publishing. Public deployment and external service health/checkout testing are outside this phase.

See [the Phase 6 report](phase-6-report.md) and [README](../README.md) for reproduction and handoff. Phase [1](phase-1-report.md), [2](phase-2-report.md), [3](phase-3-report.md), [4](phase-4-report.md) and [5](phase-5-report.md) reports retain their dated implementation evidence.
