# Source refactor and verification

The refactor preserves the existing layout, copy, navigation, carousel, lamp interactions, card motion and shader. It keeps the buildless HTML/CSS/JavaScript runtime and adds no application dependencies.

## Review findings and changes

| Area | Finding | Refactor |
| --- | --- | --- |
| Semantics | The main landmarks, one H1 and section headings already existed. Footer navigation used generic wrappers; three social links had no accessible names. | Retained the heading hierarchy, converted footer link/social groups to named `nav` landmarks, labeled every social link, and described the two meaningful hero photographs. Decorative fragments retain empty alt text. Removed the secondary slide's unnecessary wrapper. |
| SEO | Title/description existed, but robots, Open Graph and a deployment URL configuration were missing. | Centralized editable values in `site.config.mjs`; generated robots, Open Graph title/description/image/type/locale/image alt. A configured public URL also generates canonical/og:url and resolves the image to an absolute URL. |
| Links | Routes were already centralized; unresolved destinations intentionally had no invented links. | Preserved route decisions. The shared link renderer escapes attributes and automatically adds `noopener noreferrer` for `_blank` links. |
| CSS | Four stylesheets blocked rendering. Later phases repeated or overrode layout and control declarations. | One minified delivery stylesheet, assembled without `@import` from readable sources. Removed obsolete hero/lamp rules, shared pause-button styles, consolidated compact control layouts, and made card media rules mobile-first. Comments group reset, utilities, header, hero, cards, light section, footer and responsive enhancements. |
| Images | Large PNG artwork and eager secondary assets competed with the first hero. Some offscreen icons were eager. | Eight lossless WebP copies with original PNG fallbacks. Below-fold images/icons use native lazy loading and explicit dimensions. Only the first hero has high fetch priority; its decode precedes cutout/second-slide requests. |
| JavaScript | Runtime code already used ES modules and modern syntax. Progress queried/wrote both bars every frame; lamps and slide selectors each had listeners. GPU initialization happened while far offscreen. | Cached shared roots, geometry references and progress elements; updated only the active bar each frame; delegated repeated control clicks; prewarmed WebGL within 600px of the section. Existing visibility, pause, reduced-motion, failure and cleanup behavior remains covered. |
| HTTP | Preview responses were uncompressed. | Added Brotli/gzip negotiation and cached compressed representations, ETag revalidation, correct HEAD responses and content-type protection. Local cache revalidation still exposes edits immediately. |

The artwork's eight delivery files total **3,367,890 bytes**, down from **7,025,160 bytes** (52% smaller). All alpha values and visible RGB samples match the originals exactly. [The asset report](optimized-assets.json) records hashes and verification. Original Figma files remain intact.

The combined delivery CSS is 28,096 bytes (5,500 bytes with Brotli), replacing four blocking stylesheets totaling 34,866 bytes. The readable sources remain available for editing.

## Validation

- `node --test scripts/*.test.mjs`: six timing, image/link rendering and CSS compaction checks.
- `node scripts/check-server.mjs`: real Brotli/gzip round trips, content equality, ETags/304, HEAD, encoding quality, method handling and route boundaries.
- `node scripts/check-phase-4.mjs`: 44 carousel, lamp, navigation, responsiveness, reduced-motion, image failure and no-JavaScript checks.
- `node scripts/check-phase-5.mjs`: 24 native WebGL checks, including deferred allocation, two actual 25-second cycles, keyboard pause/resume, resizing, context recovery and fallback behavior.
- `node scripts/check-refactor.mjs`: geometry/pixel comparisons across 20 states (10 viewport sizes with and without JavaScript), plus semantic/SEO/image-priority checks.

Visual references were captured from commit `09f2f42` using a separate local preview. Both comparison passes used cold browser caches, reduced motion and loaded fonts/artwork. Every measured layout rectangle matches, without horizontal overflow. Source image pixels are unchanged; Chrome's PNG/WebP scaling produces sparse edge differences. The comparison limits average error to 0.01 of one 8-bit channel value, with peaks bounded at 32. Captures stay in the system temporary directory; [the browser report](refactor-browser-report.json) retains the measurements.

Animation runners execute separately to keep CPU/GPU contention from invalidating timing assertions. Syntax checks and `git diff --check` also pass.

## Performance and remaining limits

See [the Lighthouse measurements](refactor-lighthouse-report.json) for before/after mobile lab scores and timing. These are local Chrome/Lighthouse measurements, not field Core Web Vitals or a production PageSpeed guarantee. Production compression and caching depend on the host.

| Final matched mobile audit | Original | Refactored |
| --- | ---: | ---: |
| Performance | 77 | 94 |
| Accessibility | 93 | 97 |
| Basic SEO | 100 | 100 |
| First Contentful Paint | 1.4s | 0.8s |
| Largest Contentful Paint | 6.1s | 1.6s |
| Total Blocking Time | 80ms | 280ms |
| Cumulative Layout Shift | 0 | 0 |
| Observed transferred bytes | 7,353,838 | 3,601,422 |

TBT varied between local runs: the initial measurements were 320ms before and 90ms after. The final matched run above therefore does **not** establish a TBT improvement. Its script-evaluation work decreased from about 549ms to 254ms, but image/rendering work remains. Profile this on the production host and representative devices before claiming an INP or field Core Web Vitals result.

Set the final `site.url` before deployment, then run `node scripts/build-static-page.mjs`. This intentionally avoids publishing a fabricated canonical URL or social image host. The title, description and robots policy already contain editable, usable defaults.

The original blue configurator card's white text fails Lighthouse contrast checks. Its colors were preserved to honor the visual constraint; changing them needs a separate design adjustment. Automated accessibility checks do not replace screen-reader and real-device testing. Existing Phase 6 cross-browser/hardware checks remain outstanding.

To reproduce lossless image encoding as an optional authoring step (no runtime dependency):

```powershell
npx --yes sharp-cli -i assets/images/configurator-laptop.png assets/images/catalogue-tablet.png assets/images/smart-phone-frame.png assets/images/smart-screen-front.png assets/images/smart-screen-back.png assets/images/lamp-beige.png assets/images/lamp-green.png assets/images/lamp-terracotta.png -o assets/images -f webp --lossless --effort 6
node scripts/build-static-page.mjs
```

For future visual comparisons, capture `QA_BASELINE=1` against the unchanged version first, then run against the edited preview with the same `QA_SNAPSHOT_DIR`. Keep captures enabled for this runner; `QA_CAPTURE=0` suppresses captures only in the Phase 4/5 runners.
