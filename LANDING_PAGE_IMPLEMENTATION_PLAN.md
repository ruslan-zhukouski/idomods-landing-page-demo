# SOLLUX responsive landing page implementation plan

Prepared: 5 November 2026. Deliverable: a plan for a static landing page built with semantic HTML, CSS, vanilla JavaScript, and native WebGL. This document does not implement the page or download production assets.

## 1. Inspected sources and scope

- [Figma design and storefront reference](https://www.figma.com/design/BgVDA1zzvmKFbpznBGg4VG/?node-id=1-505), file key `BgVDA1zzvmKFbpznBGg4VG`.
- Design page: `0:1`, named **➡️ Landing Page**.
- [Project comments](https://www.figma.com/design/BgVDA1zzvmKFbpznBGg4VG/?node-id=16-91): the actual layer is named **Komentarze do projektu**, ID `16:91`. All six requirement groups were read in full.
- Storefront frame: `1:505`, actually named **Landingp page**, 1920 × 4048 px. Its screenshot and design context were inspected.
- Additional assets beside the frame: `lampa1` (`1:1004`), `lampa2` (`1:1003`), `lampa3` (`1:1002`), and `HERO Baner2` (`1:1005`). Their individual design contexts and renders were inspected.
- Repository baseline: only `README.md` and Git metadata; no existing application, assets, dependencies, or component system to reuse.

Build the complete storefront represented by this frame: header, two-slide hero, benefits, four promotional cards, animated shader CTA, and complete footer. Keep Polish content and existing SOLLUX branding. Backend commerce, a functioning 3D configurator, account services, and a shopping cart backend are outside this static landing-page scope; their entry points must have meaningful destinations.

Only a desktop storefront frame was found on the design page. The responsive layouts below are implementation proposals, not additional Figma specifications. Use the desktop design as the fidelity reference and preserve its hierarchy on smaller screens.

## 2. Requirements extracted from Project comments

| Source group | Required behavior | Implementation and verification |
| --- | --- | --- |
| General, `16:108` | Short hover interactions: 200–250 ms. Larger movements: 500–800 ms. Shared easing: `cubic-bezier(0.4, 0, 0.2, 1)`; ease-out for enlargements. Animate only transform and opacity. | Central CSS timing tokens; explicitly list transition properties. Audit for animated layout, color, filter, or shadow properties. |
| Menu, `16:131` | On header/menu hover, transparent background becomes white and white text, logo, and icons become black. Enter and leave both take 250 ms with the same easing. | Crossfade a white background layer and alternate foreground presentations together over 250 ms. Apply the same treatment on keyboard focus and while mobile navigation is open. |
| Hero lamps, `16:144` | Creative lamp animation; examples include clicking a lamp to turn it on and cursor-driven movement. | Choose click/tap/keyboard light toggles as the baseline, with a subtle warm glow revealed by opacity. Cursor parallax is optional only if clean separated artwork can support it. |
| Slider, `16:159` | Automatic image change every 3 s; 600 ms crossfade; incoming image scale 1.05 → 1 over 800 ms, ease-out; yellow progress fills linearly over 3 s and resets. | Two slides, one timing controller, arrows, progress selectors, and pause/resume. Use opacity, transform, and progress `scaleX`, with accessibility and visibility pause rules. |
| Cards, `16:174` | On one card's hover: its image scales 1 → 1.1 over 500 ms, ease-out; black button becomes `#4A4A4A` over 200 ms. Clip image overflow. | Transform only the media wrapper; crossfade the gray button background layer. Apply the equivalent visible state on focus within the card. |
| Shader, `16:194` | Continuous, seamless, slow waving animation; approximately 20–30 s per cycle. Real-time WebGL/shader, not GIF/video. Text and CTA remain static above it. | Native WebGL canvas with a periodic fragment shader; 25 s cycle as an implementation choice. Separate semantic HTML heading, link, and supporting copy. |

### Resolve the comments' animation constraint consistently

The general rule permits only `transform` and `opacity`, whereas the specific header and card requirements describe color changes. Produce those visual changes using opacity transitions between precolored layers. Do not animate `background-color`, `color`, SVG fill, box-shadow, width, or height.

Keep one semantic control per action. Any duplicate text/icon used for crossfading is presentational, `aria-hidden`, and noninteractive. Both visual presentations occupy the same layout space; the accessible name and focus target remain stable. Keep text readable throughout the crossfade, including over the second photograph. Shader pixel updates are the explicitly requested real-time effect, separate from the DOM animation restriction.

## 3. Asset acquisition and source manifest

Export original artwork from this file and keep it local. Do not substitute stock images, redraw logos/icons, flatten entire sections into screenshots, or use the page screenshot as a runtime asset. The shader section's reference image contains baked text and must not become the finished section.

The paths below are planned output paths, not files already present in the repository.

| Asset/use | Exact Figma source | Planned local output and handling |
| --- | --- | --- |
| First hero photograph/composition | Image fill on `HERO Baner`, `1:506` | `assets/images/hero-bestsellers-*`; preserve the three lamps and rock composition, create responsive raster sizes. |
| Second hero photograph | `HERO Baner2`, `1:1005`, 1920 × 1080 | `assets/images/hero-interior-*`; use as slide two, not as a lamp-free background for slide one. |
| Beige lamp | `lampa1`, `1:1004`, 372 × 419 | `assets/images/lamp-beige.png`; export the node with its crop and alpha, not the full underlying image fill. |
| Green lamp | `lampa2`, `1:1003`, 470 × 428 | `assets/images/lamp-green.png`; retain the vector node's image silhouette and transparency. |
| Terracotta lamp | `lampa3`, `1:1002`, 423 × 393 | `assets/images/lamp-terracotta.png`; preserve crop and transparency. |
| Header/footer SOLLUX logos | Header `1:536`; footer `1:712` | `assets/icons/sollux-*.svg`; reuse original geometry for light/dark presentations. |
| Hero arrows, indicators, review badge | `1:514`, `1:517`, `1:520`, `1:524` and their vector descendants | Export arrow/star artwork as SVG; implement indicator tracks and badge text in HTML/CSS. |
| Search and utility icons | Header roots `1:569`, `1:574` | Export search, configurator, account, and cart artwork; preserve supplied proportions. |
| Five benefits icons | `1:597`, `1:603`, `1:609`, `1:615`, `1:626` | `assets/icons/benefit-*.svg`; export whole masked icon groups where applicable. |
| THORO photo | Image fill of `1:633` | `assets/images/thoro-*`; extract the photo without overlaid card text/button. |
| Configurator media | Composition `1:641` / `1:642`; laptop image `1:661`; palette `1:643` | `assets/images/configurator-*`; preserve laptop and color palette arrangement. Export the full media-only composition if that is the most faithful asset. |
| Catalogue media | Composition `1:671`; iPad image `1:672` | `assets/images/catalogue-*`; retain the supplied tablet image and designed crop. |
| SOLLUX SMART media | Phone compositions `1:681`, `1:691`; phone images `1:683`, `1:693`; screen artwork `1:689`, `1:699` | `assets/images/smart-phone-*.png`; preserve both phone frames, masks, screen content, rotations, and fade overlays. Export media groups without card copy. |
| Social icons | Footer social group `1:720`, buttons `1:721`, `1:724`, `1:727`, `1:734` | `assets/icons/social-*.svg`; identify platform names from original artwork before assigning accessible labels. |
| Payment/delivery logos | `1:841`, `1:844`, `1:847`, `1:850`, `1:853`, `1:856`, `1:859`, `1:862`, `1:865`, `1:868` | Ten assets under `assets/images/payments/`; preserve source ordering, aspect ratios, and recognizable names. |
| Awards | `1:872`–`1:877`: Dg_icon, Orły Oświetlenia, e-Gazele Biznesu, Solidna Firma, Polska Gwarancja Jakości, Firma Godna Zaufania | Six assets under `assets/images/awards/`; preserve the original logos without recreation. |
| Country/shop flags | Flag groups `1:881`, `1:886`, `1:892`, `1:900`, `1:906`, `1:912`, `1:932`, `1:938` | Eight SVG/PNG assets; use complete flag groups, retain circular presentation, and identify country names. |
| Footer partner marks | `1:952`, `1:967` | `assets/icons/partner-*.svg`; export each complete mark, not separate vector fragments. |
| Shader visual reference | `screen`, `1:707`, 1920 × 835 | Reference only: recreate black/gold movement in WebGL and transcribe the copy into HTML. |
| Typography | Text layers use **Red Hat Display**, Medium 500 and Bold 700 | Obtain licensed font files from an authorized source or existing project owner assets; Figma's font metadata is not an exported webfont. Prefer local WOFF2 with `font-display: swap`. Record provenance. |

### Export procedure and asset quality gate

1. Request fresh node-level design context for each required asset/composition. Capture original dimensions, crop/mask behavior, source ID, and intended slot in an asset manifest.
2. Download assets using the Figma response's prescribed `curl -L` workflow. Asset URLs expire after seven days; persist files and use local relative URLs rather than recording expiring URLs as permanent dependencies.
3. For lamp rectangles, export the visible node rather than copying the raw fill: their generated contexts use oversized source images and crop offsets. Check alpha at the edges. Inspect all masked smartphone and vector exports at actual size.
4. Preserve exact SVG geometry and intrinsic width/height. Control responsive placement through appropriately proportioned wrappers; avoid blanket rules that distort icons.
5. Generate raster derivatives suited to actual slots, preserving transparent originals for lamps and devices. Use WebP/AVIF where supported and retain suitable fallbacks. Do not upscale beyond meaningful source resolution.
6. Set explicit image dimensions/aspect ratios. Use accurate `srcset`/`sizes` for photographic media. Give the first hero appropriate loading priority; lazy-load below-fold images and prepare slide two before starting its transition.
7. Verify each asset is nonempty, correctly typed, locally referenced, and visually mapped to the correct layer. Inventory the ten payment logos, six awards, eight flags, and all footer marks so small assets are not lost.

### Important hero asset limitation

The first hero already contains the three lamps, and the three separate lamp nodes are also available. No clean, lamp-free version of that background was found among the design page's top-level assets. Moving the cutouts on top of the existing banner would reveal duplicate stationary lamps.

The baseline therefore keeps the original composition and uses three accurately positioned light-toggle hit regions with static glow layers. The cutouts can supply silhouette/mask references if needed, but are not rendered as moving duplicates. Calculate positions against the same image coordinate system as `object-fit`/`object-position`, and hide inaccessible hit regions if a mobile crop removes a lamp. Use a crop/layout that retains all three lamps where practical. If a clean background is later supplied, cutout parallax becomes an optional enhancement rather than a dependency for completion.

## 4. Structure and visual system

### Suggested files

```text
index.html
styles/
  tokens.css
  main.css
scripts/
  main.js
  navigation.js
  hero-slider.js
  hero-lights.js
  shader-section.js
assets/
  fonts/
  icons/
  images/
docs/
  asset-manifest.json
  qa-checklist.md
LANDING_PAGE_IMPLEMENTATION_PLAN.md
```

Use native ES modules and a local HTTP server for development. No framework, CSS utility library, carousel dependency, animation dependency, or WebGL library is needed. GLSL shader source can be stored in JavaScript template literals so shader loading adds no fetch dependency. Module initialization should tolerate a missing optional section and return cleanup functions for listeners, timers, and GPU resources.

### Foundation tokens

| Token | Observed value or planned usage |
| --- | --- |
| Content maximum | 1600 px / 100 rem; centered. At 1920 px this produces 160 px side margins. |
| Primary yellow | `#F2BF25` |
| Near-black | `#101011`; main dark text also uses `#1E1E1E` |
| Hover gray | `#4A4A4A` |
| Borders | `#E7E7E7` |
| Configurator blue | `#72A3F3` |
| Catalogue cream | `#FDF8EB` |
| SMART neutral | `#E8E4DF` |
| Card radius | 24 px; buttons are pill shaped |
| Spacing | Reuse observed 8, 12, 16, 24, 32, 48, and 64 px steps |
| Motion | 200 ms button, 250 ms header, 500 ms card, 600 ms crossfade, 800 ms hero scale, 3000 ms slider cycle |
| Easing | `cubic-bezier(0.4, 0, 0.2, 1)`; `ease-out` for enlargements; linear progress |

Use `box-sizing: border-box`, fluid container gutters, Grid for section layouts, and Flexbox for compact control groups. Use normal document flow for content and absolute positioning only for intentionally layered media and hero controls. Avoid copying the generated React/Tailwind markup or the desktop frame's fixed widths directly.

Use Red Hat Display 500/700. Desktop reference sizes include hero heading 56 px with line-height 1, card headings 32 px with line-height 1.1, card eyebrows/benefit headings 21 px, buttons 16 px, navigation/supporting text 14 px, footer links 13 px, and legal/contact copy 12 px. Use fluid heading sizes with bounded `clamp()` values, and preserve legibility on mobile rather than shrinking the whole artboard.

## 5. Section-by-section build

### Header and navigation — `1:533`

- Overlay the header at the top of the hero; desktop reference height is 84 px. Sticky behavior is not specified, so do not introduce it by default.
- Preserve SOLLUX logo, Lampy, Kolory, Pomieszczenia, Nowości, Bestsellery, Promocje, search, configurator entry, account, and cart controls.
- Keep navigation as `<nav>` with lists and links. Use real buttons for expanding disclosures and a labeled search form. Do not assign application `menu`/`menuitem` roles to ordinary site links.
- Make the entire header's hover/focus state turn it white with dark elements, then restore it on leaving, over 250 ms in both directions. Keep an opaque white state while a mobile panel is open.
- Below the width where this content fits comfortably, collapse links into a labeled menu toggle and reposition the search field. Keep logo and essential utility actions visible.
- A nonmodal disclosure panel is sufficient: `aria-expanded`, `aria-controls`, Escape-to-close, and focus restoration to the trigger. Hide closed controls from keyboard focus. Avoid a focus trap unless the final design becomes a true modal.
- Use source-supported destinations for category links. Do not invent unseen mega-menu content just because a chevron appears in the mockup.

### Hero — `1:506`, desktop reference 1920 × 1080

- Build a named carousel region with two overlapping slide image layers, a separate content layer, header, previous/next buttons, two progress selectors, and the Trustmate badge.
- Slide one copy: “Bestsellery SOLLUX”, “Kolor i forma / w nowym świetle”, CTA “Sprawdź bestsellery”. Keep the deliberate desktop line break only while it fits.
- Slide two uses the supplied interior photograph. Its separate marketing copy and destination are not specified: reuse the existing hero copy/CTA as the provisional implementation choice and record that decision rather than inventing a campaign.
- Preserve the rating “4.8” and “Uwielbiany przez klientów”; retain the star artwork. The badge and pagination must remain readable and clear of the CTA.
- Desktop controls: 48 px circular arrow buttons, approximately 72 px from the viewport edges; progress tracks are 64 × 2 px with a 4 px gap, 32 px from the bottom. Adapt these offsets on smaller screens.
- Put lamp controls only on the first slide. Each toggle is keyboard/touch operable, has a Polish accessible name and `aria-pressed`, and reveals a prepainted warm lens/halo using opacity. Keep focus rings visible without covering the CTA. Use a restrained 500–800 ms reveal.
- On mobile, give copy and controls protected space; reposition the image crop and badge. Do not shrink a 1920 px layout to fit the viewport or use the original 1080 px height everywhere.

### Benefits and promotional grid — `1:593`

Desktop section padding is 86 px top/bottom. Its inner container is 1600 px wide, with a 64 px gap between benefits and cards.

Render five benefits as a semantic list, keeping their individual icons and copy:

1. “Zwroty nawet do 100 dni” — “szybkie i proste”.
2. “5 lat gwarancji” — “na wszystkie produkty”.
3. “Darmowa dostawa” — “już za 299 zł”.
4. “Polskie produkty” — “sprawdzona jakość”.
5. “Oficjalny sklep producenta” — “gwarancja satysfakcji”.

The desktop cards use two asymmetric rows, 16 px gaps, 518 px height, 24 px corner radii, and 48 px content padding. Row one is 648/936 px; row two reverses to 936/648 px. Use proportional columns in each row (648:936, then 936:648) to reproduce these exact dimensions at 1600 px after subtracting the row gap.

| Card/source | Copy and CTA | Media/layout |
| --- | --- | --- |
| THORO, `1:633` | “Marka THORO”; “Poznaj lampy premium”; “Odwiedź sklep THORO” | Full-bleed supplied photo; white copy at bottom left. |
| Configurator, `1:640` | “Konfigurator 3D”; “Wybierz projekt i dostosuj go do swojego wnętrza”; “Stwórz swój projekt” | Blue background, supplied laptop/palette on the right, white copy. |
| Catalogue, `1:670` | “Katalog”; “Odkryj najnowszy katalog”; “Sprawdź katalog” | Cream background, supplied iPad on the right, dark copy. |
| SMART, `1:680` | “SOLLUX SMART”; “Przymierz lampę w aplikacji”; “Pobierz aplikacje na telefon” (source wording) | Neutral background and both original phone compositions; dark copy. |

Use one link per card/action and avoid nested links/buttons. Animate the complete media composition independently of text. Keep the text and CTA stationary when media enlarges, and test that the 10% zoom does not obscure either.

### Shader CTA — reference `1:707`, 1920 × 835

- Build a real section with a decorative canvas behind its content. The Figma layer is a raster reference, not editable text or a finished shader implementation.
- Recreate the black upper field, blurred golden light waves, diagonal dark channels, and centered composition through a fragment shader. Keep the visual energy mostly below the content.
- Heading: “Twoje wnętrze zasługuje na wyjątkowe światło”. CTA: “Kup teraz”. Supporting copy: “Od 119 zł na oficjalnej stronie producenta SOLLUX”. These are visible in the inspected reference and must be real HTML.
- Keep the heading/CTA stationary and high contrast. Use a static dark overlay if the moving gold threatens readability.
- Add an accessible motion pause control near the section without displacing the central CTA.

### Footer — `1:708`

- Recreate the desktop top band (380 px reference), lower band (208 px), and legal caption (121 px) using flexible content heights on smaller screens.
- Top band: SOLLUX logo/socials and all five link groups: Moje zamówienia, Moje konto, Regulaminy, Informacje, and the source's “Wpsółpraca” heading. Treat that spelling as a source typo; propose “Współpraca” and record the correction during implementation.
- Preserve all links, including order tracking, complaints/exchanges, registration/cart/lists/history, shipping/payments, privacy/security/cookies, FAQ/inspirations/warranty/configurator, and architect/3D/distribution resources.
- Lower band: all payment/delivery marks, all six awards, and all eight shop flags, with wrapping instead of clipping.
- Caption: retain VAT/Poland text, partner marks, NIP `6070082443`, phone `+48 668 806 323`, hours `(Pn - Pt 7:00 - 15:00)`, `sklep@sollux.pl`, company name, and Budzyń address. Use `tel:` and `mailto:` links.
- On mobile, keep link groups expanded by default and stack them in a readable order. Accordions are optional, not required to fit the content.

## 6. Responsive layout specification

Breakpoints are initial implementation choices and must be adjusted to actual content fit. Start with mobile styles, then add wider layouts through min-width media queries, following the current [MDN mobile-first guidance retrieved through Context7](https://github.com/mdn/content/blob/main/files/en-us/mdn/writing_guidelines/code_style_guide/css/index.md).

| Viewport | Header/hero | Benefits/cards | Shader/footer |
| --- | --- | --- | --- |
| 320–599 px | Compact header with disclosure navigation; search on its own row/panel; adaptive hero height and crop; heading about 32–40 px; arrows at safe insets; badge below main copy. | One-column cards in source order; benefit list stacked or two columns only when labels fit. Card height/content padding adapt to media and text. | CTA section around 420–560 px as content permits; footer groups stacked; logos wrap. |
| 600–899 px | Compact navigation; larger image area and more generous gutters. | Benefits in two columns with the fifth item naturally following; cards in two equal columns only if artwork/copy remain clear, otherwise continue stacking. | Multiple footer columns; contact/legal lines wrap. |
| 900–1199 px | Retain collapsed navigation until measured header content fits; do not force full desktop navigation at 900 px. | Benefits may use three columns; cards in two columns with reduced padding, preserving source order. | Shader grows fluidly; footer spreads across available columns. |
| 1200 px and above | Full navigation only where its measured contents fit; fluid container capped at 1600 px. | Five benefits; asymmetric two-column card rows when text/media fit. | Desktop bands and spacing approach reference; no fixed footer height if content wraps. |
| 1920 px reference | Match hero 1080 px, 84 px header, source crop and control placement. | Match 1600 px content width, 86 px section padding, 64 px section gap, and 648/936 px card widths. | Match shader 835 px and footer 709 px total as closely as content allows. |

Use `<meta name="viewport" content="width=device-width, initial-scale=1">`. Use `minmax(0, 1fr)` where grid tracks could overflow; permit long footer labels and contact text to wrap. Keep the DOM order identical to reading order. Use stable/small viewport units with sensible minimum heights where mobile browser chrome would otherwise create jumps.

Responsive images must describe their real rendered slot, including the 1600 px maximum container and asymmetric card spans. Do not use `sizes="100vw"` indiscriminately. This follows the [responsive image selection guidance retrieved through Context7](https://github.com/mdn/content/blob/main/files/en-us/web/html/reference/elements/img/index.md).

## 7. JavaScript behavior and timing

### Slider controller

1. Keep explicit state: current slide, incoming slide, cycle start/elapsed time, transition state, user pause, environmental pause reasons, and reduced-motion preference.
2. Interpret “every 3 s” as transition starts 3000 ms apart; the 600 ms crossfade is included in that cycle, not added to make a 3600 ms interval. Start the first cycle when the initial slide is ready and slide two is prepared.
3. Drive both progress and slide changes from one elapsed-time source. Progress uses a left-origin `scaleX(0…1)`. At the next cycle, reset it, crossfade opacity over 600 ms, and settle the incoming image from scale 1.05 to 1 over 800 ms.
4. Keep only one timing loop alive. Use elapsed timestamps, not a frame count; refresh rates vary. This follows [MDN requestAnimationFrame guidance](https://developer.mozilla.org/en-US/docs/Web/API/Window/requestAnimationFrame).
5. Arrows/selectors wrap through two slides. Manual changes restart a complete 3 s cycle. Serialize rapid clicks so no more than two image layers are crossfading and no timer accumulates.
6. Pause on hover, keyboard focus within the carousel, explicit pause, hidden tab, and hero leaving the viewport. Resume only when all temporary pause reasons clear; an explicit user pause persists. Avoid catch-up transitions after a background tab returns.
7. Provide a pause/resume button with a clear accessible name. Keep inactive slide controls out of the focus order; do not duplicate the same CTA in the accessibility tree. Update pagination state and announce manual changes politely without announcing autoplay every three seconds.
8. Reduced motion disables autoplay and image scaling by default; manual navigation still works with instant state changes. Listen for preference changes during the session.
9. If slide-two loading fails, retain the usable first slide and suppress unusable navigation/autoplay rather than revealing an empty frame.

The carousel is not a numeric ARIA slider. Context7 also returned numeric slider-role material; that material is not applicable to these image slides.

### Header, cards, and lamp toggles

- Let CSS handle hover/focus visuals. JavaScript owns disclosure state and lamp `aria-pressed` values, rather than duplicating hover handlers.
- On devices without hover, every action remains available by tap. Gate optional pointer-only effects behind `(hover: hover) and (pointer: fine)`.
- Keep lamp light state tied to the correct slide. When the slide leaves, disable its interactive regions and restore a predictable initial state on return.
- Build card focus/hover states with exactly the documented 500 ms image and 200 ms button timings; reduced motion removes scaling.

### Native WebGL shader

1. Create one canvas and one native WebGL context, compile a minimal vertex shader and fragment shader, and draw a fullscreen triangle/quad. Keep all text in a separate HTML layer. Native WebGL uses JavaScript control code and GPU shader code, as described by [MDN's WebGL introduction](https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/Tutorial/Getting_started_with_WebGL).
2. Expose resolution, aspect ratio, phase, and a small palette as uniforms. Build gold bands with smooth fields and domain distortion; tune density and blur-like edges against the reference.
3. Use a 25 s periodic phase. Drive every temporal term with sine/cosine harmonics or sample noise along a closed circular path. Merely resetting a linearly increasing noise coordinate would create the very loop seam the comments prohibit. Match both value and motion at the cycle boundary.
4. Keep canvas CSS size independent of drawing-buffer size. Resize only when dimensions change, cap device-pixel ratio at an initial value of 1.5–2, and lower resolution if profiling shows excessive GPU cost. These are project choices consistent with [MDN WebGL resource guidance](https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/WebGL_best_practices).
5. Render with `requestAnimationFrame`, using elapsed active time. Suspend when the section is offscreen, the tab is hidden, the user pauses animation, or reduced motion is enabled. Preserve phase across pauses without a large time jump.
6. Under reduced motion, show a single stable shader frame. If WebGL initialization/compilation fails, show a static black/gold CSS background behind the same readable content. Do not use GIF/video or a rasterized section containing the text as the fallback.
7. Handle context loss by stopping rendering and showing the fallback; rebuild resources when restored. Release buffers/programs and cancel animation on cleanup. [MDN documents that a lost context must be re-established before rendering resumes](https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/isContextLost).
8. Mark the canvas decorative (`aria-hidden="true"`), remove it from tab order, and prevent it from intercepting pointer actions intended for the content.

## 8. Accessibility, resilience, and performance

- Use `lang="pl"`, one `<h1>`, meaningful section headings, header/main/footer landmarks, and a skip link. Keep the benefits as a list and the shader CTA as a link.
- Provide Polish labels for icon buttons, search, menu, slider controls, motion controls, lamp toggles, social destinations, and country links. Avoid relying on flags alone to name countries.
- Preserve visible focus, logical keyboard order, and practical touch targets of approximately 44 × 44 px or larger. Meet contrast requirements for normal text, controls, and focus indicators over both hero images and every shader phase.
- Keep one accessible copy of crossfaded text. Do not leave invisible slide links, closed navigation content, or hidden lamp controls focusable.
- Respect reduced motion across CSS and JavaScript. The Context7 results specifically advise honoring the preference and using native navigation semantics: [motion preference guidance](https://github.com/mdn/content/blob/main/files/en-us/web/css/guides/scroll-driven_animations/timelines/index.md), [navigation semantics](https://github.com/mdn/content/blob/main/files/en-us/web/accessibility/aria/reference/roles/menu_role/index.md).
- Without JavaScript, show slide one, the main content, usable navigation links, all cards, the static shader fallback, and the complete footer. Add collapsed/hidden behavior only after initialization succeeds.
- Prioritize the initial hero and required fonts. Lazy-load lower imagery. Reserve image space to avoid layout shifts; avoid permanently assigning `will-change` to every card.
- Keep shader quality bounded and ensure offscreen effects stop. Check browser performance recordings for avoidable repeated layout work and dropped frames rather than relying solely on a synthetic score.
- Maintain a small central destination map. Use verified storefront routes, same-page anchors, and `tel:`/`mailto:` as appropriate. If a destination is unavailable, record it as unresolved; do not ship dead `href="#"` controls or fake successful commerce actions.

## 9. Implementation sequence and completion gates

### Phase 1 — Source capture and assets

**Status: completed on 5 November 2026.** See [the Phase 1 report](docs/phase-1-report.md), [asset review](docs/asset-review.html), and [manifest](docs/asset-manifest.json). The report records acquisition details, verification, the Figma MCP quota limitation, and the remaining destination/copy decisions.

- Export the complete manifest above and map every file to source ID and usage slot.
- Resolve fonts, link destinations, hero cropping, and alpha/crop integrity before polishing motion.
- Keep design references separate from production assets.
- **Gate:** both hero images, all card compositions, all logos/icons, and every footer mark can be displayed locally at the correct proportions; remaining destination/copy decisions are listed explicitly.

### Phase 2 — Static semantic page

**Status: completed on 5 November 2026.** See [the page](index.html), [Phase 2 report](docs/phase-2-report.md), and [browser verification](docs/phase-2-browser-report.json). The static page works without JavaScript; navigation enhancements, motion, and WebGL remain in their later phases.

- Build HTML structure, full Polish content, and real actions.
- Add tokens, desktop composition, responsive grids, image fitting, and footer wrapping.
- Recreate shader copy as HTML over its static fallback.
- **Gate:** the page is complete and readable with scripts disabled, and the 1920 px view matches the inspected structure without missing assets.

### Phase 3 — Responsive behavior and navigation

**Status: completed on 8 November 2026.** See [the Phase 3 report](docs/phase-3-report.md), [browser checks](docs/phase-3-browser-report.json), and [JavaScript-disabled checks](docs/phase-3-no-js-report.json).

- Implement compact header/search, disclosure navigation, crop rules, lamp hit-region geometry, and card media layout at each breakpoint.
- Check content at 320 px and continuously resize through each transition.
- **Gate:** no horizontal page overflow, overlapping text/actions, clipped footer content, or unreachable navigation across the test matrix.

### Phase 4 — Motion and slider

- Add shared motion tokens, header/card opacity layering, lamp toggles, carousel controls, exact cycle timing, and pause state management.
- Add reduced-motion behavior and visibility/focus handling at the same time.
- **Gate:** all comment requirements in groups 01–05 pass, with only transform/opacity animated in the DOM.

### Phase 5 — Shader

- Implement black/gold shader appearance, 25 s closed phase path, pause/resume, resize handling, reduced-motion static state, and context failure fallback.
- Tune at desktop and mobile aspect ratios; keep the heading readable throughout.
- **Gate:** at least two full cycles run without a seam or content movement; failure and pause modes remain usable.

### Phase 6 — Verification and handoff

- Complete the acceptance checks below, fix in-scope mismatches, and record verification in `docs/qa-checklist.md`.
- Update `README.md` with the local HTTP serving workflow, architecture, asset provenance, and any unresolved destination/content limitations.
- **Gate:** all required behaviors and assets have evidence, and the static site is ready for review. Publishing is a separate action, not part of this plan.

## 10. Verification and acceptance checklist

### Visual and responsive checks

- [ ] Compare a full-page render at 1920 px with the Figma reference; inspect hero crop, 1600 px container, typography, asymmetric cards, shader placement, and all footer bands.
- [ ] Check 320, 375, 390, 768, 1024, 1280, 1440, and 1920 px widths, plus landscape mobile and intermediate resize positions. Breakpoint values must not become the only tested widths.
- [ ] At 200% zoom, navigation/content remain usable and reading order remains coherent.
- [ ] Every static image/icon has a nonempty local file, correct source-layer mapping, correct DOM usage, and correct rendered size/crop. Verify all small footer marks, not only the large media.
- [ ] No temporary Figma asset URLs remain in runtime files, and no screenshot has replaced the functional page or shader section.

### Interaction checks

- [ ] Header enters/leaves white/dark state in 250 ms; text, logo, and icons remain synchronized and readable.
- [ ] Each of three hero lamp regions can be toggled by pointer, touch, and keyboard without duplicate lamp artwork or misaligned hit targets after resizing.
- [ ] Carousel transition starts occur 3000 ms apart while running; crossfade is 600 ms; incoming scale settles over 800 ms; progress resets and fills linearly with the same clock.
- [ ] Arrows and both selectors work; rapid clicks, pauses, focus, hidden tabs, image failure, and offscreen resume never create overlapping timers or blank slides.
- [ ] Each hovered/focused card enlarges only its media to 1.1 over 500 ms and changes only its own button appearance to `#4A4A4A` over 200 ms.
- [ ] Shader runs in real time with a seamless approximately 25 s loop; compare frames and motion immediately before/after the boundary over at least two cycles.
- [ ] Canvas resize, context loss/restoration, explicit pause, and reduced-motion behavior all preserve the usable CTA.
- [ ] A motion audit finds no animated layout/color/filter properties, aside from shader pixel rendering itself.

### Accessibility, browser, and performance checks

- [ ] Keyboard-only navigation, visible focus, correct expanded/pressed states, and closed/inactive content focus exclusion all pass.
- [ ] Screen-reader smoke check confirms names, landmark order, single accessible slide content, and no autoplay announcement spam.
- [ ] Reduced motion enabled before load and changed during the session disables autoplay/scaling and stops shader motion without breaking actions.
- [ ] JavaScript-disabled and WebGL-disabled states preserve content/navigation and show an intentional static background.
- [ ] Check current stable Chrome/Edge, Firefox, and Safari, including Android Chrome and iOS Safari where available; record any platform not actually tested.
- [ ] Inspect console/network for errors and missing assets, validate HTML, audit contrast, and inspect performance at a representative mobile size.
- [ ] Add focused behavioral automation for carousel timing/pause/rapid navigation and menu focus handling if the implementation introduces a test harness. Do not add tests merely to assert CSS constants.
- [ ] Every outbound action has a reviewed destination or is documented as an unresolved handoff item; no fake checkout/configurator functionality is implied.

## 11. Open decisions and defaults

| Item | Evidence / default | Effect on implementation |
| --- | --- | --- |
| Mobile artboards | No alternate storefront frames found on the inspected design page. | Use the responsive rules above and validate against content fit; label them as adaptations. |
| Slide-two copy | Second photograph exists; distinct copy/destination was not found. | Reuse existing hero copy/CTA provisionally; centralize it for easy replacement. |
| Lamp animation | Separate cutouts exist, but the first banner already includes lamps and no clean plate was found. | Ship creative light toggles; avoid independent cutout movement that produces ghost lamps. |
| Header/card colors versus transform-only rule | Both requirements appear in the comments. | Use opacity layers as specified, preserving timing and visual outcome. |
| Fonts | Family/weights verified; webfont files not present in the repository. | Obtain authorized files and record provenance; a fallback is temporary during development. |
| Commerce and footer destinations | Labels are available; most route URLs are not supplied by the design context. | Verify the intended SOLLUX routes during implementation; record unresolved routes before handoff. |
| Shader visual fidelity | Reference is a raster with baked text; continuous shader is explicitly required. | Recreate the effect procedurally and use real HTML copy. A static procedural background is the failure fallback. |

These decisions allow implementation to proceed without pretending that unspecified responsive designs, routes, clean background assets, or alternate campaign copy already exist.

## 12. Documentation checked

Current documentation was fetched on 5 November 2026 using the **find-docs** skill and the repository-mandated Context7 CLI outside the default sandbox. This used exactly three CLI commands: library resolution followed by two documentation queries. Context7 provides the latest indexed guidance, not a promise that every upstream page was indexed that day.

Selected library: **MDN Web Docs**, `/mdn/content`, High source reputation, 113,280 snippets, benchmark 76.15 in the resolution result. It covers the native web platform without adding application dependencies.

```powershell
npx ctx7@latest library "MDN Web Docs" "How should a landing page built with pure HTML, CSS, and JavaScript use mobile-first responsive layouts and responsive images?"
npx ctx7@latest docs /mdn/content "How should a pure HTML/CSS landing page combine mobile-first media queries, CSS Grid or Flexbox, the viewport meta tag, and srcset/sizes responsive images?"
npx ctx7@latest docs /mdn/content "How should vanilla JavaScript implement accessible disclosure navigation with aria-expanded and keyboard handling, and respect prefers-reduced-motion for scroll and slider transitions?"
```

The first documentation result supports the viewport tag, mobile-first media queries, fluid layouts, and `srcset`/`sizes`. The second supports respecting reduced motion, native disclosure semantics, and avoiding application-menu roles on ordinary site navigation. It also returned unrelated numeric slider material, which was excluded from the carousel plan.

Supplemental native WebGL and animation details were checked directly in the current primary MDN documentation linked in sections 7–8. Exact durations, colors, card geometry, and required shader behavior come from Figma rather than from documentation examples.
