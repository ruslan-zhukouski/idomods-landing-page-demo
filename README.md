# idomods-landing-page-demo
Zadanie praktyczne na stanowisko Programisty Frontend + AI w IdoMods

Phases 1 and 2 are complete. Open [index.html](index.html) for the complete static landing page. It works without JavaScript and uses the original local assets and fonts.

For an HTTP preview, run `node scripts/serve.mjs` and open `http://127.0.0.1:4173`. No package installation or build is required.

- Read [the Phase 2 report](docs/phase-2-report.md) for scope, verification, and content decisions.
- See the [desktop capture](docs/references/phase-2-1920.png), [mobile capture](docs/references/phase-2-375.png), and [QA checklist](docs/qa-checklist.md).
- Run `node scripts/check-static-page.mjs` while the server is running to verify six viewport widths with JavaScript disabled (Windows with Chrome installed).

Compact navigation, slider/lamp interactions, hover animation, and the live WebGL shader remain in the plan's later phases.

- Open [the local asset review](docs/asset-review.html) to inspect both heroes, lamp cutouts, card media, logos, and footer assets.
- Read [the Phase 1 report](docs/phase-1-report.md) for provenance, crop decisions, checks, reproduction commands, and the Figma access limitation.
- Use [the asset manifest](docs/asset-manifest.json) for source nodes, local paths, dimensions, hashes, and composition details.
- Use [the destination map](docs/destinations.json) for observed storefront routes and unresolved content decisions.
- Follow [the implementation plan](LANDING_PAGE_IMPLEMENTATION_PLAN.md) for the remaining phases.

Assets are local, including licensed Red Hat Display webfonts, responsive WebP images, and JPEG fallbacks. No application dependencies or framework were introduced.
