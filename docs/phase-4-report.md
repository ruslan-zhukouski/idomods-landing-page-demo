# Phase 4 — Motion and carousel

Implemented 10 November 2026 using vanilla HTML, CSS, JavaScript, and the existing local artwork. No runtime dependency was added. The shader remains the static procedural fallback until Phase 5.

## Result

The header crossfades precolored background, logo, text, and icon layers over 250 ms using the shared easing. Presentational duplicate faces are hidden from assistive technology; controls and labels remain singular. Search retains one real input and mirrors its visible text into the dark presentation. The user's later compact-header instruction takes precedence over the original hover proposal: below 1600 px, closed navigation stays transparent with white content; open navigation becomes white/dark. Full desktop navigation responds to both hover and keyboard focus.

Each promotional card scales only its clipped media composition to 1.1 over 500 ms, with ease-out. The text and CTA remain stationary. Its black CTA reveals a prepainted `#4A4A4A` layer over 200 ms. Fine-pointer hover and keyboard focus produce the same effect on that card alone.

Three native lamp buttons follow the original image's cover geometry and expose stable Polish names and `aria-pressed`. They reveal a warm radial glow over 650 ms. Each supplied transparent cutout is registered over its photographed lamp, accounting for the 7.5 px horizontal crop in the 1920 × 1080 reference. Fine-pointer hover and visible keyboard focus enlarge only that lamp to 1.1 over 500 ms with ease-out; leaving restores its original size over the same duration. The cutout and its rotated glow share one transform, keeping the light on the shade throughout enlargement and return. A failed cutout leaves the original photographed lamp and working glow without zoom. Reduced motion removes enlargement. Controls are excluded when cover cropping leaves less than a 44 px visible target in either dimension. Lamp controls disappear, become inert, and reset when the first slide leaves; they return after its incoming image settles.

The second slide uses the original interior photograph and shares the original heading and bestsellers CTA, as authorized by the plan's provisional copy decision. Two reused image layers crossfade over 600 ms; the incoming image settles from 1.05 to 1 over 800 ms. The first slide remains visible until both responsive images decode. If the second image fails, the working first slide and lamps remain and unavailable navigation stays hidden.

One `requestAnimationFrame` clock drives linear `scaleX` progress and 3000 ms transition-start intervals, including crossfade time. Arrows wrap; selectors restart a complete cycle. Rapid navigation cancels the previous effects from their current blend and reuses the same layers. Only manual changes update the polite status; autoplay does not announce every cycle.

Autoplay pauses independently for hover, focus, explicit user pause, hidden documents, an offscreen hero, and reduced motion. Explicit resume clears the current hover/focus pauses so it works while the button remains hovered or focused; a fresh pointer entry or focus change pauses again. Loading, visibility, offscreen, and reduced-motion pauses remain independent. Resuming preserves elapsed progress and avoids background catch-up. Hidden/offscreen states also freeze in-flight image effects. Reduced motion disables autoplay, scaling, and CSS transitions while preserving instant manual navigation and lamp toggles. Changes to the preference are handled during the session. New modules expose cleanup for listeners, observers, animation frames, and animation effects.

The interactive carousel occupies exactly one dynamic viewport height (`100dvh`, with a `100vh` fallback). Desktop sizing no longer depends on viewport width or the previous 640/1080 px minimum/maximum heights. Its progress and pause controls stay within the initial visible screen.

Both photographs fill the entire hero using `object-fit: cover` at every width, including below 1114 px. Compact text, search, controls, and the review badge overlay the full-screen image; a dark gradient preserves text contrast. Short landscape layouts use a single compact header row and a lower control band. Controls remain visible without internal hero overflow or scrolling. Transparent header gaps pass pointer input through to visible lamp regions. No-JavaScript navigation remains expanded, with first-slide content and hidden unavailable controls.

## Verification

- `node --test scripts/carousel-clock.test.mjs`: three deterministic tests cover exact cycles, one queued frame, independent pause reasons, preserved time, manual reset, and cleanup.
- `node scripts/check-phase-4.mjs`: all 44 native Chrome protocol checks pass, covering real autoplay intervals, animation durations, pause/resume with retained pointer/focus, renewed hover/focus pauses, rapid input, keyboard lamp activation, each cutout's intermediate/finished hover and return sizes, isolated enlargement with aligned light, failed-cutout fallback, mobile pointer/touch operation, inactive control exclusion, desktop header hover/focus, isolated card focus effects, compact disclosure keyboard/Escape behavior, the DOM transition property audit, viewport sizing/control visibility, image failure, and the no-JavaScript fallback. Set `QA_CAPTURE=0` to preserve existing captures during interaction-only checks.
- Twenty viewport widths: 320, 375, 390, 599, 600, 699, 700, 768, 899, 900, 1024, 1113, 1114, 1115, 1200, 1280, 1440, 1599, 1600, and 1920 px. Checks include overflow, reachable cropped lamp regions, minimum visible target dimensions, duplicate IDs, and compact header states.
- Twenty additional width/height combinations from 320 × 480 to 2560 × 1440, including short landscape screens and the 1114 px boundary. Both image layers match the entire hero, whose height matches the viewport; CTA, arrows, progress, pause, and review badge fit without scrolling. Three further height changes verify resizing without a reload.
- Desktop and mobile full-page captures include decoded below-fold assets and have been visually inspected. Runtime exceptions and unexpected HTTP errors are checked.
- JavaScript syntax and `git diff --check` pass. All DOM motion uses only opacity and transform; geometry updates on resize are not animated.

Evidence: [browser results](phase-4-browser-report.json), [desktop capture](references/phase-4-1920.png), [mobile capture](references/phase-4-375.png).

Viewport captures: [desktop 1920 × 900](references/hero-viewport-1920x900.png), [mobile 375 × 667](references/hero-viewport-375x667.png), and [landscape 844 × 390](references/hero-viewport-844x390.png).

The hidden-document handler is exercised with a synthetic visibility event because headless Chrome does not reliably reproduce an operating-system tab switch. Touch is Chrome-emulated rather than physical-device testing. Screen-reader review, full contrast/performance audit, Firefox/Safari, and real mobile browser testing remain in Phase 6.

## Pause/resume review

The review reproduced a resume defect using an actual mouse click without moving the pointer or clearing focus. The handler removed only the explicit `user` pause while the activating interaction left `hover` and `focus` reasons active. The label switched to “Wstrzymaj animację” even though progress and autoplay remained stopped.

The original test called `.click()` and immediately moved the pointer outside the hero and blurred focus. That removed the blocking reasons and concealed the defect. The regression failed before the fix. Explicit resume now clears the current interaction pauses, and new checks retain pointer/focus, observe a subsequent slide change, activate both actions with Space, and verify renewed hover/focus and environmental guards.

## Documentation

The project-mandated Context7 CLI was run outside the sandbox: one `library` resolution for MDN Web Docs (`/mdn/content`), then two `docs` queries about the shared animation/visibility clock and reduced-motion changes. Current guidance supports [timestamp-based animation frames](https://github.com/mdn/content/blob/main/files/en-us/web/api/window/requestanimationframe/index.md), [separate document visibility and intersection tracking](https://github.com/mdn/content/blob/main/files/en-us/web/api/intersection_observer_api/timing_element_visibility/index.md), [reduced motion](https://github.com/mdn/content/blob/main/files/en-us/web/css/guides/media_queries/using_for_accessibility/index.md), and [live media-query changes](https://github.com/mdn/content/blob/main/files/en-us/web/css/guides/media_queries/testing/index.md). Exact timings and visuals come from the saved Figma comments and implementation plan.
