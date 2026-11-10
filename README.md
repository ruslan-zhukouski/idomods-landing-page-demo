# idomods-landing-page-demo
Zadanie praktyczne na stanowisko Programisty Frontend + AI w IdoMods

Phases 1–4 are complete. Open [index.html](index.html) for the landing page. It works without JavaScript and uses the original local assets and fonts.

For an HTTP preview, run `node scripts/serve.mjs` and open `http://127.0.0.1:4173`. No package installation or build is required.

- Read [the Phase 2 report](docs/phase-2-report.md) for scope, verification, and content decisions.
- See the [desktop capture](docs/references/phase-2-1920.png), [mobile capture](docs/references/phase-2-375.png), and [QA checklist](docs/qa-checklist.md).
- Run `node scripts/check-static-page.mjs` while the server is running to verify six viewport widths with JavaScript disabled (Windows with Chrome installed).

Compact navigation supports keyboard/touch disclosure and responsive focus handling. The two-slide hero now has timed progress, arrows, selectors, pause/resume, and interactive lamp lighting. Header/card effects and all motion respect reduced-motion preferences. The live WebGL shader remains in Phase 5.

- Read [the Phase 3 report](docs/phase-3-report.md) for responsive geometry, navigation behavior, and verification.
- Read [the Phase 4 report](docs/phase-4-report.md) for motion, carousel behavior, responsive adaptations, and current verification.
- Run `node --test scripts/carousel-clock.test.mjs` for deterministic timing/pause tests.
- With the preview server running, run `node scripts/check-phase-4.mjs` for Chrome timing, keyboard/pointer/touch, responsive, reduced-motion, image-failure, and no-JavaScript checks. Set `PREVIEW_URL` or `CHROME_PATH` if needed. This writes the Phase 4 browser report and captures.
- Phase 2/3 reports preserve the earlier implementation evidence; Phase 4 checks cover the current interactions.
- The optional authoring helper `node scripts/build-static-page.mjs` regenerates the committed HTML; runtime modules require an HTTP preview.

- Open [the local asset review](docs/asset-review.html) to inspect both heroes, lamp cutouts, card media, logos, and footer assets.
- Read [the Phase 1 report](docs/phase-1-report.md) for provenance, crop decisions, checks, reproduction commands, and the Figma access limitation.
- Use [the asset manifest](docs/asset-manifest.json) for source nodes, local paths, dimensions, hashes, and composition details.
- Use [the destination map](docs/destinations.json) for observed storefront routes and unresolved content decisions.
- Follow [the implementation plan](LANDING_PAGE_IMPLEMENTATION_PLAN.md) for the remaining phases.

Assets are local, including licensed Red Hat Display webfonts, responsive WebP images, and JPEG fallbacks. No application dependencies or framework were introduced.
