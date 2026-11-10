# Phase 6 — verification and handoff

Implemented on 10 November 2026. The static site is ready for local review, with the manual and design sign-off items listed in [the QA checklist](qa-checklist.md). Publication is outside this phase. The existing visual appearance and no-JavaScript layout are preserved.

## Findings fixed

- **Loading layout shift:** the initial compact page used its static-flow header/hero until the deferred modules initialized. A throttled mobile audit caught a page-sized shift (CLS 0.583). A tiny synchronous head bootstrap now selects the enhanced geometry before the stylesheet's first paint. It does not collapse navigation before initialization. Disabled JavaScript retains the original static layout; a failed module fetch removes the enhancement marker. A delayed-module regression check verifies that the hero and following section retain the same rectangles before/after initialization. Final measured CLS is 0.018.
- **Invalid HTML:** fractional SVG dimensions were copied into integer-only HTML image width/height attributes. The renderer now rounds those attributes while retaining exact source SVG viewBoxes and CSS placement. The composed IdoSell mark also used block wrappers inside spans; valid block containers now retain the same artwork and accessible name. The initial standard validation reported 47 errors; the final generated HTML has none.
- **Keyboard focus:** the search input suppressed its native outline without a replacement. Keyboard focus now gives the search field a visible dark/white ring, with no change to its unfocused appearance.
- **Navigation lifecycle:** initialization previously attached listeners with no cleanup. The disclosure now has guarded, idempotent initialization and cleanup using an AbortController. Reinitialization, breakpoint focus recovery, Escape and closed-content exclusion have behavioral coverage.

No application library, runtime package dependency, backend service or publication was introduced.

## Verification evidence

| Check | Result and scope |
| --- | --- |
| Focused Node tests | 6/6 pass: one-clock timing/pause/cleanup, generated links/images and CSS compaction |
| Motion/carousel integration | 44/44 pass: exact cycle/fade/scale timings, pause/resume, pointer/touch/keyboard lamps, failed assets, header/card effects, responsive coverage and no-JavaScript fallback |
| WebGL integration | 24/24 pass: actual software-GPU pixel boundaries, two uninterrupted 25-second cycles, resize, pause/reduced motion, context loss/restoration, failure and cleanup |
| Existing visual regression | 42/42 pass: 20 states across ten viewport sizes with/without JavaScript, plus semantics/SEO checks; exact measured rectangles and bounded raster differences against the original snapshots |
| Phase 6 compatibility matrix | 88/88 pass across installed Chrome/Edge and additional Firefox/WebKit engines; native keyboard controls, accessible structure, axe, no-JavaScript, module failure/delay, touch emulation and reflow |
| Installed Firefox smoke | 10/10 pass using Firefox 159's native WebDriver BiDi and a disposable content tab; viewport widths, landscape, native Tab/Enter/Space/Escape, lamp, slide navigation and live shader |
| Asset and URL integrity | All 110 manifest files and eight optimized copies match byte counts/SHA-256; 116 runtime asset/style references resolve locally |
| Destination review | Every generated anchor matches the captured official inventory or an explicit content decision; no empty/dead hash actions |
| HTML standards | html-validate 11.21.0, standard preset: no errors/warnings |
| HTTP | Brotli/gzip round trips, decoded content equality, ETag/304, HEAD, encoding negotiation and private-route boundaries pass |
| Build hygiene | Generated HTML/CSS reproduce byte-for-byte; Node syntax checks and git diff --check pass |

Machine-readable evidence: [browser matrix](phase-6-browser-report.json), [installed Firefox](phase-6-firefox-report.json), [assets](phase-6-assets-report.json), [destinations](phase-6-destinations-report.json), [HTML](phase-6-html-report.json), [Phase 4](phase-4-browser-report.json), [Phase 5](phase-5-browser-report.json), [visual regression](refactor-browser-report.json).

## Visual and responsive review

The [1920px current full page](references/phase-6-1920.png) was compared with [the captured Figma storefront](references/landing-page.png). The centered 1600px content region, local Red Hat Display typography, original hero composition, asymmetric 648/936px and reversed card rows, all device compositions and footer bands retain the intended hierarchy. The procedural shader preserves black/gold motion and stationary HTML rather than copying the baked-text reference. Pause controls, compact navigation and lamp interactions are intentional later-phase additions.

The [375px current full page](references/phase-6-375.png) was inspected for readable copy, protected card media, footer wrapping and the user-requested cover-cropped viewport hero. Smaller screens are responsive adaptations; no mobile Figma artboard was supplied. The hero covers its visible viewport, and progress/pause controls remain reachable without scrolling the hero.

The new matrix uses widths 320, 375, 390, 500, 699, 700, 768, 899, 900, 1024, 1113, 1114, 1199, 1200, 1280, 1440, 1599, 1600 and 1920px, plus 844×390 landscape. No-JavaScript checks use all eight acceptance widths. Existing Phase 4 checks additionally exercise live resizing and viewport-height/crop geometry. Image decoding/font readiness and settled resize frames are awaited before measurements.

All ten payment/delivery logos, six awards, eight named flags and both partner marks were checked, not just the large media. The first photo's original crop registration and 10% enlarged lamp/glow geometry retain the earlier checks. The source and delivery artwork remain unchanged.

## Browser and accessibility scope

| Browser/engine | Verified version | Scope |
| --- | --- | --- |
| Installed Google Chrome | 156.0.8078.82 | Full Phase 6 matrix and mobile touch emulation; motion/WebGL suites and profiling |
| Installed Microsoft Edge | 157.0.4341.42 | Full Phase 6 matrix |
| Installed Mozilla Firefox | 159.0.1 | Native WebDriver BiDi smoke, actual keyboard input, 19 widths/landscape and running shader |
| Additional Playwright Firefox | 151.0 | Full Phase 6 matrix, including no-JavaScript and accessibility checks |
| Playwright WebKit | 26.5 | Full Phase 6 matrix and mobile touch emulation; not the Safari application |

These are the actual available versions tested, not a claim that every engine is the latest vendor release. Playwright 1.61.0 and axe-core 4.14.0 are optional external QA tools; neither ships with the page. Chrome/Edge use the installed channels. Firefox 159 uses native automation independently of Playwright's pinned Firefox build.

Windows WebKit skips anchors in its default native Tab traversal. Its report explicitly records that limitation; the skip link is focused explicitly before native keyboard activation, and native focus traversal is checked for the controls it includes. Safari with full keyboard access still needs a macOS check. Other engines verify the skip link as the first native Tab stop.

The [accessible snapshot](phase-6-accessibility-snapshot.txt) exposes header/main/footer in order, named navigation, one H1, one exposed slide and named actions. Autoplay leaves the live region silent; manual slide selection updates it. Closed navigation and inactive/cropped lamp controls are excluded from focus. Native cookie details and search retain their semantics. These checks do not constitute listening with NVDA/JAWS/VoiceOver.

Axe audits at 1920px and 375px report the existing white text on the blue configurator card (2.54:1); no additional audited-rule violations were found. The original colors remain under the user's visual-preservation constraint. This design issue must be corrected before claiming WCAG conformance. Contrast over image/shader phases and real assistive-technology behavior also need human sign-off; automated incomplete checks are retained in the report.

No normal-load console exceptions, missing images or failed HTTP responses were found. Firefox can cancel an in-flight lazy image while the runner navigates away; those navigation cancellations are listed separately. The intentionally aborted module in the failure test is isolated from the normal-load error audit.

## Mobile performance

[The Lighthouse report](phase-6-lighthouse-report.json) compares sequential local mobile navigation audits before/after the loading-geometry correction. Both use Lighthouse 13.6.0, headless Chrome, default simulated mobile throttling and four-times CPU slowdown.

| Metric | Before geometry fix | Final |
| --- | ---: | ---: |
| Performance | 78 | 100 |
| Accessibility | 97 | 97 |
| Best practices | 100 | 100 |
| Basic SEO | 100 | 100 |
| FCP | 0.8s | 0.8s |
| LCP | 1.6s | 1.9s |
| TBT | 0ms | 0ms |
| CLS | 0.583 | 0.018 |

The verified improvement is loading stability; the LCP variation does not establish a speed improvement. These are lab snapshots, not field Core Web Vitals or a production PageSpeed guarantee. The earlier refactor's separate before/after study remains in [its report](refactor-report.md).

[The rendering profile](phase-6-performance-report.json) records warmed 375×812 samples at four-times CPU slowdown. Across each 3.5-second sample, the hero performs three layouts (about 5ms total) and the shader performs none. Sampled page RAF intervals have no gaps over 50ms; these sample callbacks are not the shader's draw count (which remains capped at 30fps). Two approximately 60ms renderer-main tasks occur in the complete setup/section trace, outside the steady sampling windows. The full Chrome trace stays in the system temporary directory. Software rendering and synthetic slowdown do not substitute for hardware GPU, battery, INP or physical-device profiling.

## Handoff and remaining decisions

[README](../README.md) documents HTTP preview, authoring/generated files, architecture, reproduction, assets/fonts, the route inventory and deployment settings. The [QA checklist](qa-checklist.md) leaves unverified items unchecked rather than treating emulation as physical testing.

Remaining sign-off: configurator text contrast, screen-reader listening, actual 200% browser UI zoom, macOS Safari/full keyboard access, physical Android/iOS/browser bars and hardware GPU profiling. The 200% equivalent reflow test uses 960×540 CSS px at DPR 2, not a claimed browser UI zoom action.

Promocje, Polityka bezpieczeństwa and Kurs światła remain plain labels pending destinations. TikTok uses its documented homepage until an official SOLLUX profile is verified. Slide two reuses the supplied campaign copy. Captured official routes were reviewed against the effective generated anchors; authenticated flows, purchases and current downstream service health were not exercised. Set site.url to the final public URL and regenerate before publishing.

Current Playwright guidance was retrieved through the find-docs/Context7 CLI workflow (library resolution followed by cross-browser and keyboard queries). Primary references: [browser channels](https://playwright.dev/docs/browsers), [keyboard behavior tests](https://github.com/microsoft/playwright/blob/main/tests/page/page-focus.spec.ts), [Firefox BiDi connection](https://developer.mozilla.org/en-US/docs/Web/WebDriver/How_to/Create_BiDi_connection), [viewport command](https://developer.mozilla.org/en-US/docs/Web/WebDriver/Reference/BiDi/Modules/browsingContext/setViewport), and [native input actions](https://developer.mozilla.org/en-US/docs/Web/WebDriver/Reference/BiDi/Modules/input/performActions).
