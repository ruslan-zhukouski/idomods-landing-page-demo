# Phase 2 — static semantic page

Completed on 5 November 2026. Open [index.html](../index.html) directly in a browser, or run `node scripts/serve.mjs` and visit `http://127.0.0.1:4173`.

## Delivered

- A complete Polish HTML page: SOLLUX header/navigation, real product search, first hero slide and CTA, five benefits, four promotional cards, a static black/gold CTA section, and the full footer.
- Local Red Hat Display fonts and original Phase 1 artwork. Responsive `<picture>` elements use WebP with JPEG fallbacks; the hero gets loading priority, and below-fold media is lazy-loaded.
- Shared tokens in `styles/tokens.css` and responsive layout rules in `styles/main.css`. The two card rows preserve the exact 648/936 px and reversed 936/648 px dimensions inside the 1600 px desktop container.
- The laptop/palette, catalogue tablet, both SMART phones/screens/masks, and partner logos remain composed from the original assets. Their proportional placement works entirely in CSS, including when scripting is disabled.
- Semantic landmarks, one H1, a skip link, descriptive control names, focus indicators, image alternatives, five footer link groups, ten payment/delivery marks, six awards, all eight country-store links, VAT details, and company contact information.
- A native cookie-settings disclosure: the page uses no optional cookies and links visitors to the official shop privacy information. It works without JavaScript and does not claim to change another website's preferences.

The page has no runtime JavaScript, package dependencies, framework, or required build step. `scripts/build-static-page.mjs` is an optional authoring helper that reproduces the committed `index.html` from the asset/destination inventories. Make generated-markup changes there, then regenerate; CSS is edited directly.

## Scope and content decisions

The page uses the high-fidelity Figma context and local assets captured in Phase 1, with the original storefront render as its visual target. No additional Figma exports were needed.

The first hero image is the static fallback. Its arrows and progress tracks are decorative and excluded from the accessibility tree, rather than nonfunctional buttons. Slide switching, autoplay, lamp toggles, hover animations, navigation disclosures, and live WebGL remain in their specified later phases. All navigation links remain available at narrow widths without JavaScript. Phase 3 can add compact disclosure behavior as progressive enhancement.

The shader section uses a procedural CSS background, with real HTML heading, supporting copy, and link above it. It deliberately does not use the baked-text Figma screenshot as a page asset. The animated WebGL effect remains Phase 5 work.

[Content decisions](phase-2-content-decisions.json) record the following:

- “O nas” links to the verified [official company page](https://sollux-lighting.com/pl/o-firmie/).
- “Inspiracje” uses the verified official blog; “Marka premium” uses the same THORO destination as its card; “Kup teraz” opens the verified lamp catalogue. These are explicit implementation choices, not inferred Figma links.
- Promocje, Polityka bezpieczeństwa, Kurs światła, and TikTok still lack confirmed destinations. Their labels/artwork are preserved as noninteractive content; no fake anchors, guessed routes, or unrelated TikTok accounts are shipped.
- The footer spelling is corrected from “Wpsółpraca” to “Współpraca”. Original promotional copy, including “Pobierz aplikacje na telefon”, is retained.
- Inspection of the original award image identified the first mark as Rzetelna Firma; its descriptive alternative is corrected accordingly.

## Verification

Chrome was run with **page JavaScript disabled** at 1920, 1600, 1280, 768, 375, and 320 px viewport widths. All six checks passed:

- No horizontal document overflow.
- All 70 image instances decoded successfully with alternative text attributes; computed asset geometry and source node mappings are recorded per viewport.
- No failing HTTP requests or missing local assets after adding the original SOLLUX SVG as the favicon.
- Exactly one H1 and one main landmark; Polish language metadata; no duplicate IDs or nested link/button actions.
- No empty or `href="#"` anchors.
- All ten payment/delivery logos, six awards, and eight flags are present.
- Local font loading succeeded with Polish text.
- At 375 px, the cookie disclosure received focus and opened using Space. The GET search form serializes a sample query as `text=lampy`.

At the 1920 px reference viewport, the page measures approximately 4053 px high versus 4048 px in Figma. The hero is 1080 px, the benefits/cards section approximately 1424 px, and the CTA section 835 px. The small overall height difference is in flexible footer text layout; no fixed height clips the footer.

The [desktop capture](references/phase-2-1920.png) and [mobile capture](references/phase-2-375.png) were inspected visually against the source. The static CTA background approximates the intended black/gold treatment; it is not presented as the final shader. This phase does not claim full cross-browser, screen-reader, contrast, or interaction verification; those remain in the plan's later checks.

Evidence: [browser report](phase-2-browser-report.json). The report includes rendered file/crop dimensions, section bounds, network results, footer counts, and the native form/disclosure checks. No application script, temporary Figma URL, or reference screenshot is referenced by the page.

## Reproduce

```powershell
# Optional: regenerate the committed HTML after authoring changes.
node scripts/build-static-page.mjs

# Start the local, read-only preview server.
node scripts/serve.mjs

# In another terminal: browser verification (Windows, installed Chrome).
node scripts/check-static-page.mjs
```

The checker uses Chrome's native debugging protocol without adding dependencies. `CHROME_PATH` can override the installed browser location, and `PREVIEW_URL` can override the default preview URL. Set `QA_CAPTURE=0` to retain the existing screenshots when checking changes that do not affect rendering. Stop the preview server with Ctrl+C after use.

## Documentation

The find-docs workflow fetched current native responsive-image guidance through Context7 on 5 November 2026: library resolution for MDN Web Docs selected `/mdn/content`, followed by one focused query about `picture`, `srcset`, `sizes`, and WebP/JPEG fallbacks. The implementation follows its guidance to put size/fit attributes on the child image and provide accurate slot hints.

Primary sources returned by Context7: [picture](https://github.com/mdn/content/blob/main/files/en-us/web/html/reference/elements/picture/index.md) and [responsive images](https://github.com/mdn/content/blob/main/files/en-us/web/html/guides/responsive_images/index.md).
