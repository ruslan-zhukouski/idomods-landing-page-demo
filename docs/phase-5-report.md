# Phase 5 — Native WebGL light waves

Implemented 10 November 2026 using native WebGL, GLSL, HTML, CSS, and vanilla JavaScript. No framework, runtime dependency, GIF, video, generated artwork, or reference screenshot was added to the page.

## Result

The lighting CTA now has softly edged golden folds and diagonal dark channels beneath a black upper field, based on the previously captured Figma reference. The existing heading, shopping link, and supporting copy remain real, singular HTML and never animate. A stationary dark overlay protects the central content. Desktop and mobile compositions were inspected in [the desktop capture](references/phase-5-1920.png) and [mobile capture](references/phase-5-375.png). Mobile retains the existing responsive section height and text layout.

`scripts/shader-renderer.js` owns one WebGL 1 context, a fullscreen triangle, GLSL source, resolution/aspect/phase/palette uniforms, resizing, and GPU resource deletion. Broad analytical fields create soft ribbons without textures or expensive blur passes. All temporal inputs derive from a sine/cosine circle with a 25,000 ms period. No linearly advancing noise coordinate resets at the boundary; both phase value and velocity repeat.

`scripts/shader-section.js` owns progressive initialization and the animation lifecycle. One requestAnimationFrame chain accumulates active timestamp deltas and draws at at most 30 fps. The drawing buffer caps DPR at 1.5 and total size at approximately 1.6 million pixels, including ultrawide displays. CSS size remains independent of buffer size. ResizeObserver and window resize handle layout and DPR changes; the animation loop never measures layout. The renderer requests a low-power, opaque context without antialiasing, depth, stencil, or a preserved drawing buffer.

The native button has section-specific Polish labels: “Wstrzymaj animację tła” and “Wznów animację tła”. Space/click resumes immediately with focus retained. Hover/focus do not suspend this decorative background; explicit pause, offscreen intersection, hidden document, and reduced motion do. These independent conditions preserve phase without background catch-up. An explicit pause persists across visibility and motion preference changes. The canvas is decorative, excluded from tab order, and never intercepts pointer events. Visible keyboard focus is scoped to the section's controls.

Reduced motion before load produces a stable shader composition; a live preference change freezes the current frame and disables the motion button with “Animacja tła wyłączona”. Ordinary resizes may redraw that same phase. Unsupported WebGL, initialization/compilation failure, or context loss exposes the existing static CSS black/gold background and hides the unavailable motion control. The HTML CTA remains usable. Context restoration rebuilds every invalid GPU resource and retains phase/user pause. Cleanup cancels RAF, disconnects observers, aborts listeners, deletes programs/buffers/shaders, and permits reinitialization. Initialization is idempotent for the same section. Non-persisted page exit cleans up; ordinary back-forward cache suspension retains the instance.

The HTML authoring generator includes the decorative canvas and initially hidden button; `index.html` was regenerated. `main.js` initializes the optional module, and the local preview allowlist serves both new runtime modules. Without JavaScript the canvas stays hidden, the motion button stays hidden, and the original fallback/content remain visible.

## Verification

Run `node scripts/serve.mjs`, then `node scripts/check-phase-5.mjs`. `PREVIEW_URL` and `CHROME_PATH` can override the defaults. Windows with Chrome and Node's native WebSocket support is the existing test environment. No package installation is required.

- All 24 Phase 5 browser checks passed. See [machine-readable results](phase-5-browser-report.json).
- Actual compiled GLSL frames were read with WebGL `readPixels`. Frames at 0, 25, and 50 seconds were byte-identical, as were corresponding frames at 24.9/49.9 and 25.1/50.1 seconds. Finite differences across the boundary stayed continuous within pixel quantization. Quarter-cycle images changed substantially, confirming a live effect rather than a static shader.
- Two real uninterrupted cycles were observed over approximately 52 seconds, without accelerated timers. Phase travel exceeded two full turns, no boundary jump occurred, and heading/link/supporting-copy rectangles stayed unchanged. Observed rendering remained below 30 draws per second.
- Keyboard Space pause/resume, retained focus/visible outline, preserved phase, offscreen suspension, hidden-document suspension, explicit pause persistence, and both initial/live reduced motion passed.
- Layout and buffer checks passed at 1920 × 900 / DPR 1, 1280 × 800 / DPR 2, 768 × 1024 / DPR 2, 375 × 812 / DPR 3, 320 × 568 / DPR 3, 844 × 390 / DPR 2, and 2560 × 1440 / DPR 2. The canvas filled its section, content and pause controls did not overlap, and no horizontal overflow appeared.
- `WEBGL_lose_context` caused a real context loss and restoration. The fallback/CTA remained available, rebuilt resources rendered successfully, and explicit pause survived restoration.
- Forced unavailable-context and compilation-failure checks preserved the fallback and released partially created GPU resources. No-JavaScript rendering retained the same semantic content. Idempotent initialization, cleanup, and reinitialization passed.
- No runtime exceptions, failed HTTP responses, or WebGL pixel-read errors were observed.
- The three existing carousel clock unit tests passed. JavaScript syntax and whitespace checks passed. All 36 Phase 4 browser checks also passed for integration regression coverage; its report records the results.

## Documentation checked

The find-docs skill and repository-mandated Context7 CLI were used outside the sandbox. Exactly three commands were run: resolve “MDN Web Docs”, then fetch WebGL drawing-buffer/context/resource lifecycle guidance and requestAnimationFrame/visibility/reduced-motion guidance. Selected library: `/mdn/content`, High source reputation, 115,623 snippets, benchmark 74.67.

Current indexed guidance confirmed that [restored contexts require newly created resources](https://github.com/mdn/content/blob/main/files/en-us/web/api/htmlcanvaselement/webglcontextrestored_event/index.md), [DPR-aware buffers require bounded sizing and careful rounding](https://github.com/mdn/content/blob/main/files/en-us/web/api/webgl_api/webgl_best_practices/index.md), and [requestAnimationFrame animation should use timestamps](https://github.com/mdn/content/blob/main/files/en-us/web/api/window/requestanimationframe/index.md). The controller explicitly handles [visibility changes](https://github.com/mdn/content/blob/main/files/en-us/web/api/page_visibility_api/index.md) and motion preferences. Project-specific cycle duration, palette, and behavior come from the implementation plan.

## Limits and Phase 6

Rendering and pixel comparisons used headless Chrome with SwiftShader software WebGL for repeatability. This verifies actual shader compilation/rendering and lifecycle behavior, but does not establish hardware GPU cost or mobile battery use. Hidden-document testing dispatches visibilitychange with a synthetic document.hidden value because headless OS-tab visibility is unreliable. Mobile sizes/DPR are browser emulation, not physical devices.

The animation is a procedural interpretation of the captured raster reference; no source shader was supplied. Cross-browser/physical-device verification, hardware profiling, a full contrast audit over all phases, and assistive-technology checks remain in Phase 6. The existing unresolved destinations and provisional second-slide copy remain recorded in earlier reports.
