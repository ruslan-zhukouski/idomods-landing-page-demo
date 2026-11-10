# SOLLUX landing page

Zadanie praktyczne na stanowisko Programisty Frontend + AI w IdoMods.

A responsive Polish storefront built with semantic HTML, CSS, vanilla JavaScript ES modules and native WebGL. Phases 1–6 are implemented for local review. The [QA checklist](docs/qa-checklist.md) distinguishes verified behavior from remaining design, device and accessibility sign-off items. Publishing is outside this project phase.

## Local preview

Node.js 24 was used for verification. The application has no package dependencies and the generated page is committed; no installation or build is needed to preview it.

```powershell
node scripts/serve.mjs
# Open http://127.0.0.1:4173
# Stop with Ctrl+C.
```

If the port is occupied, set `$env:PORT='4175'` before starting. Set `$env:PREVIEW_URL='http://127.0.0.1:4175'` in the terminal running browser/HTTP checks. Use HTTP so browser ES modules and local resources load correctly. With JavaScript disabled, the first hero, expanded navigation, cards, native cookie disclosure and static shader background remain available.

The local server serves only the page, runtime modules, styles and assets. It supports Brotli/gzip, ETag revalidation and HEAD requests. Its `no-cache` policy keeps local edits visible; configure compression, HTTPS and production caching on the deployment host.

## Editing and architecture

```powershell
node scripts/build-static-page.mjs
```

Run this after editing markup/configuration or CSS. Commit both authoring sources and generated output. Do not edit the generated files directly.

| File | Responsibility |
| --- | --- |
| `scripts/build-static-page.mjs` | Page markup, Polish copy, promotional compositions and explicit route decisions |
| `scripts/html-helpers.mjs` | Escaped attributes, local images, responsive pictures and safe links |
| `site.config.mjs` | Title, description, robots and Open Graph values; public URL |
| `styles/tokens.css`, `styles/main.css`, `styles/motion.css` | Readable design tokens, responsive layout, accessibility and motion |
| `scripts/build-styles.mjs` | Combines those sources and local font declarations into one delivery stylesheet |
| `index.html`, `styles/site.min.css` | Generated delivery files |
| `scripts/main.js` | Initializes the independent runtime features |
| `scripts/navigation.js`, `scripts/header-motion.js` | Nonmodal disclosure/focus recovery and opacity-based header presentations |
| `scripts/hero-geometry.js`, `scripts/hero-lights.js` | Cover-crop coordinates, original cutouts, light state and aligned hover enlargement |
| `scripts/hero-slider.js`, `scripts/carousel-clock.js` | Two slides, one animation clock, progress, pause reasons and cleanup |
| `scripts/shader-section.js`, `scripts/shader-renderer.js` | Deferred native WebGL, bounded GPU resolution, 25-second phase and static fallback |

The compact header is transparent with white text/icons when closed, white/dark when open. At desktop widths it crossfades on hover/focus. Both carousel images fill the visible viewport. The three lamp cutouts enlarge by 10% with their light attached to the shade. Autoplay, card scaling and shader motion respect reduced-motion preferences. Offscreen/hidden effects stop and explicit user pauses persist.

A tiny inline head bootstrap reserves the enhanced hero/header geometry before the deferred modules load, preventing a loading layout shift. Disabled JavaScript retains the original static layout; a failed module fetch removes the enhancement marker and restores that fallback.

Set `site.url` to the final public page URL before deployment and regenerate. This produces canonical/og:url and an absolute social image URL. Its empty default intentionally avoids inventing a deployment domain.

## Verification

Start the preview first. Run browser suites **serially** so CPU/GPU contention does not invalidate animation timing.

```powershell
node --test scripts/*.test.mjs
node scripts/check-assets.mjs
node scripts/check-server.mjs
node scripts/check-phase-4.mjs
node scripts/check-phase-5.mjs
node scripts/check-firefox.mjs
node scripts/check-performance.mjs
```

The Phase 4/5 runners need installed Chrome on Windows. `CHROME_PATH` overrides its executable; `QA_CAPTURE=0` retains existing screenshots. Phase 5 uses software WebGL for reproducible pixel comparisons and runs two actual 25-second cycles. These switches affect QA only.

`check-firefox.mjs` checks the installed Firefox through native WebDriver BiDi (`FIREFOX_PATH` overrides its executable). It uses a disposable headless profile and its own content tab. `check-performance.mjs` records a four-times CPU-slowed mobile rendering trace; its full trace stays in the temporary directory.

The optional Phase 6 suite uses tools installed outside the application, with no runtime dependency added:

```powershell
$env:QA_TOOLS_DIR = Join-Path $env:TEMP 'idomods-phase6-tools'
npm install --prefix $env:QA_TOOLS_DIR --no-save --no-package-lock playwright@1.61.0 axe-core@4.14.0 html-validate@11.21.0
& "$env:QA_TOOLS_DIR/node_modules/.bin/playwright.cmd" install firefox webkit
node scripts/check-phase-6.mjs
& "$env:QA_TOOLS_DIR/node_modules/.bin/html-validate.cmd" --preset standard --formatter json=docs/phase-6-html-report.json index.html
```

Chrome and Edge use installed browser channels. Firefox/WebKit use the Playwright engines matching the pinned QA tool; these are additional compatibility checks, not a claim to test current Firefox/Safari releases. `QA_ENGINES=chrome,edge` selects a subset. A subset run replaces the browser report, so run the full suite for handoff. `QA_ARTIFACT_DIR` chooses a screenshot directory (default: system temporary directory). Chrome desktop/mobile handoff captures are also saved under `docs/references/phase-6-*.png`.

The suite checks acceptance widths and intermediate breakpoints, landscape, native keyboard controls, menu lifecycle/focus recovery, tab order, accessible structure, live announcements, axe audits, reduced motion, no-JavaScript behavior, disabled WebGL, touch emulation and 200% equivalent reflow. The [Phase 6 report](docs/phase-6-report.md) records actual browser versions, results, visual comparison and limitations. This does not replace listening with a screen reader or testing physical mobile devices.

To repeat the optional mobile lab audit, use the preview's actual port and run it separately from other browser suites:

```powershell
npx --yes lighthouse@13.6.0 http://127.0.0.1:4173 --only-categories=performance,accessibility,best-practices,seo --chrome-flags="--headless --disable-gpu" --output=json --output-path="$env:TEMP/idomods-phase6-lighthouse.json"
```

`check-static-page.mjs` retains the earlier static-page checks. `check-refactor.mjs` compares against external snapshots: capture `QA_BASELINE=1` from an unchanged preview first, then compare the changed preview using the same `QA_SNAPSHOT_DIR`. Those historical pixel comparisons are separate from Phase 6 acceptance checks.

## Assets and provenance

All production images, SVG geometry and Red Hat Display fonts are local. The [asset manifest](docs/asset-manifest.json) maps 110 original/derived files to Figma nodes, dimensions, hashes and usage. [Phase 1](docs/phase-1-report.md) records exports, crops and acquisition limits; [the asset review](docs/asset-review.html) shows the original compositions. Design screenshots under `docs/references` are reference material and are never used by the application.

Eight lossless WebP delivery copies preserve the PNG artwork and visible alpha/RGB, with PNG fallbacks. [The optimization inventory](docs/optimized-assets.json) records their hashes and pixel checks. The font license is [SIL OFL](assets/fonts/OFL.txt); both local WOFF2 subsets cover the requested weights and Polish text. Historical Phase 1 mobile proposals are superseded by the later user-requested full-viewport cover layout.

The [refactor report](docs/refactor-report.md) records the earlier matched Lighthouse comparison (77→94 performance, 6.1→1.6s LCP, CLS 0); those lab measurements are not field Core Web Vitals. Phase 6 has its own current audit and profiling evidence. Production performance depends on hosting and devices.

## Content and handoff limitations

The [destination inventory](docs/destinations.json) records public storefront links captured on 5 November 2026. [Explicit decisions](docs/phase-2-content-decisions.json) and the page generator define the effective overrides. Every anchor maps to that reviewed inventory or a documented decision; local cookie information uses native `details` and performs no remote preference change.

- Promocje, Polityka bezpieczeństwa and Kurs światła remain plain labels pending supplied destinations.
- TikTok links to its homepage, following the later user instruction, until an official SOLLUX profile is verified.
- Slide two reuses the supplied hero copy/CTA because no separate campaign copy was provided.
- Account, cart, order, search, configurator, catalogue and app actions open external services. No commerce/backend or 3D configurator is implemented locally; authenticated/transactional flows were not exercised.
- The supplied blue configurator card's white text fails contrast (2.54:1). Its colors remain as designed under the existing visual-preservation constraint; this needs a design correction before claiming WCAG conformance.
- Native Safari, physical Android/iOS, screen-reader listening, actual browser UI zoom and hardware GPU profiling still need manual sign-off. Emulation and accessibility snapshots are labeled as such.
- Supply the production URL in `site.config.mjs` before publishing.

See [the implementation plan](LANDING_PAGE_IMPLEMENTATION_PLAN.md) and [QA checklist](docs/qa-checklist.md) for evidence and the remaining review tasks.
