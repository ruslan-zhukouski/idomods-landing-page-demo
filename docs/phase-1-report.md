# Phase 1 — source capture and assets

Completed on 5 November 2026. The Phase 1 gate is satisfied: both heroes, original promotional media, logos/icons, all footer marks, and licensed fonts are available locally. Remaining copy/destination decisions are listed explicitly. The landing page, interactive controls, and live shader belong to subsequent phases.

## Deliverables

- [Asset review](asset-review.html): local, dependency-free visual catalogue, including assembled device compositions and the complete IdoSell mark.
- [Source manifest](asset-manifest.json): 110 files with source node IDs, intended slots, dimensions, byte sizes, SHA-256 hashes, crop information, derivative provenance, and composition selectors.
- [Capture records](asset-sources.json): original Figma bindings, source ordering, identified payment/country labels, and reference-only file inventory.
- [Integrity results](asset-validation.json) and [browser results](browser-asset-validation.json).
- [Destination map](destinations.json): 44 public-source destinations, the search form action, and nine explicit follow-ups.
- [Desktop asset-review capture](references/asset-review-desktop.png) and [captured Figma storefront reference](references/landing-page.png).

## Assets acquired

The production asset directory contains 110 files, totaling 14,799,687 bytes:

| Category | Result |
| --- | --- |
| Original Figma assets and exact lamp outputs | 76 files, including both hero images and all source fragments |
| Responsive JPEG fallbacks | 15 files |
| Responsive WebP variants | 15 files |
| Fonts and license | Two WOFF2 subsets, local font-face CSS, and the SIL OFL license |
| Payment/delivery marks | All ten, in recorded source order |
| Awards | All six, retaining source artwork |
| Country flags | All eight, identified visually and matched to official store links |

Payment order: Visa, Mastercard, PayU, PayPal, InPost, DPD, Paczka w Ruchu, DHL, GLS, Poczta Polska. Country order: Poland, Germany, Spain, Romania, France, United Kingdom, Netherlands, Sweden. Neither list was inferred from filenames alone; the downloaded artwork was rendered and inspected.

The `Dg_icon 2` award keeps the neutral filename `dg-icon.png`: its label is not silently changed to an unrelated design award. Source-layer years in award names do not necessarily match the text visible within the source image; preserve the artwork.

## Fonts

Red Hat Display normal 500 and 700 are self-hosted through [the local stylesheet](../assets/fonts/red-hat-display.css). It includes Latin and Latin Extended subsets so Polish text such as “Zażółć gęślą jaźń” renders correctly. Both requested weights use the supplied WOFF2 resources and retain the official unicode-range declarations and `font-display: swap`.

The files were obtained from the [Google Fonts family CSS](https://fonts.googleapis.com/css2?family=Red+Hat+Display:wght@500;700&display=swap); the original response is saved separately in `references/google-fonts.css`. Licensing comes from the [Google Fonts Red Hat Display source directory](https://github.com/google/fonts/tree/main/ofl/redhatdisplay), with the full unmodified license stored in `assets/fonts/OFL.txt`. No Google-hosted font URLs are required at runtime.

## Crop and composition findings

- The first hero's uploaded image is **2752 × 1536**, while its Figma slot is **1920 × 1080**. Centered cover fitting renders it at 1935 × 1080 and crops 7.5 px from either horizontal edge. Do not force the source image to a distorted 16:9 ratio.
- The second hero is **1920 × 1080** and is the supplied interior photograph. It is not a clean background for the first slide's lamps.
- Beige and terracotta lamps were extracted using the exact crop rectangles from the individually captured Figma fill transforms. Their dimensions are 372 × 419 and 423 × 393, respectively.
- The green lamp is the exact **vector-masked export**, 940 × 856 pixels for a 470 × 428 design slot (2×). A rectangular crop includes part of another lamp, so that crop was rejected. All three delivered lamps have fully transparent corners and antialiased alpha edges; detailed counts are in `asset-inspection.json`.
- The original lamp source sheet is kept under `docs/references`, rather than treated as a page asset. The first hero already contains lamps: retain the planned light-toggle approach unless a clean plate is supplied. Independent moving cutouts would expose duplicate lamps.
- The configurator palette/laptop, catalogue tablet/fade, and both SMART devices/screens/masks are assembled from the original assets at their documented placement coordinates in the review page. The laptop and device files are not complete standalone card compositions. Card copy and CTAs remain HTML work for Phase 2.
- The IdoSell mark includes all supplied original SVG fragments at the source percentage insets. Its complete 66 × 36 composition is available in the review page; no logo paths were redrawn.
- The shader's raster reference contains baked text. It remains under `docs/references` and must not be used as the runtime shader section or its fallback. The later implementation must provide semantic HTML text above native WebGL.

Responsive variants are provided at 480, 640, 960, 1280, 1600, and 1920 pixels where the original supports those sizes. THORO's 1080 px source has only 480/640/960 px derivatives. No raster is upscaled. JPEGs use quality 86; WebP files use Chrome's native encoder at quality 0.86. Original transparent artwork is preserved as PNG/SVG.

For mobile, use a dedicated artwork region that preserves the three lamps and place copy outside that region when necessary. No mobile Figma artboard was supplied. Final hotspot positions must be calibrated against the displayed hero crop; the separate 1920 × 1080 lamp sheet provides positioning references, not a guarantee of pixel alignment with the uploaded hero.

## Destinations and copy decisions

Destinations were read from the official [SOLLUX storefront](https://sollux.pl/), and the relevant public HTML was retained as inert reference text. They were not guessed from labels. Account, cart, registration, catalogue, configurator, SMART app, tracking, shipping, payments, warranty, architect/model resources, country stores, phone, and email entries are recorded in `destinations.json`.

Search uses GET `https://sollux.pl/pl/search` with the parameter `text`, as observed in the actual search form. The map distinguishes source-observed links from proposals. Authenticated flows and transactions were not executed, and not every downstream page response was tested.

Nine items need an explicit later implementation/content decision: Promocje, Polityka bezpieczeństwa, O nas, Kurs światła, Inspiracje, Marka premium, TikTok, cookie settings, and the shader “Kup teraz” target. In particular, the live site's third social slot repeats the Instagram URL while Figma shows TikTok artwork; this mismatch was not copied. The live cookie link is a script-bound `#`, not a usable standalone URL.

Slide two has an image but no separately specified campaign copy; retain the plan's provisional reuse of slide-one copy/CTA. The source footer typo “Wpsółpraca” can become “Współpraca” during content implementation. These choices do not require inventing assets or blocking source acquisition.

## Verification evidence

- All **110** local files are nonempty and mapped; recorded SHA-256 hashes match their contents.
- All SVGs were parsed for root dimensions/viewBox; all PNG/JPEG dimensions were read from decoded images. WebP dimensions match the encoder's target sizes and were verified through browser decoding.
- The ten payment logos, six awards, and eight flags pass explicit inventory checks.
- All three lamp exports have transparency and opaque image content; the neighboring-lamp contamination was removed by using the proper green vector export.
- Chrome at **1440 × 2800** loaded **177 image instances with zero failures**. This includes every image/SVG/WebP/JPEG file in an additional hidden decode inventory, as well as the visible composition instances. Each of the two font weights loaded both subsets successfully.
- The final asset-review screenshot was inspected visually. Promotional media, phone masks, partner composition, lamp alpha, flags, and small footer marks are recognizable and correctly proportioned. Light SVGs are shown on dark swatches.
- Node syntax checks passed for the review generator, destination capture script, and WebP writer. No application/unit tests are claimed for a phase that only prepares assets.

## Figma access limitation

After the full storefront context and an initial lamp export, further Figma MCP reads/exports reached the account's **Starter-plan call limit**. Identity/plan inspection confirmed this. The complete storefront response supplied its source images and SVG fragments; still-valid URLs from the earlier individual node contexts supplied slide two, the shared lamp sheet, and the exact green vector export.

No required source asset remains missing. Fresh independent full-node exports of every media group and fresh font/link metadata reads were unavailable. The original fragment compositions and previously captured placement instructions are retained rather than claiming those unavailable exports were produced. No Figma design nodes were edited.

## Reproducing the checks

From the repository root, on Windows with PowerShell 7, Node, and Chrome installed:

```powershell
# Recreate exact rectangular lamp crops and JPEG variants; refresh metadata/hashes.
pwsh -File scripts/prepare-assets.ps1

# Rebuild the manifest and dependency-free visual review; verify hashes/inventory.
node scripts/build-asset-review.mjs

# Optional: recreate WebP variants through Chrome, then refresh metadata and manifest.
pwsh -File scripts/review-assets.ps1 -EncodeWebp
pwsh -File scripts/prepare-assets.ps1 -InspectOnly
node scripts/build-asset-review.mjs

# Decode all assets, check both font weights, and save the browser report/screenshot.
pwsh -File scripts/review-assets.ps1

# Rebuild the destination map from the captured official-link inventory.
node scripts/capture-destinations.mjs
```

The review can also be opened directly as `docs/asset-review.html`; it does not need a package install or a server. Scripts use local inputs after acquisition. Chrome runs hidden/headless with an isolated temporary profile. The asset-generation script uses Windows System.Drawing; delivered assets themselves work independently of that tooling.
