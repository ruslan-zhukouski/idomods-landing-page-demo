# Phase 3 — Responsive behavior and navigation

Completed on 8 November 2026.

The page now progressively enhances ordinary navigation into a nonmodal disclosure below 1600 px. The Menu button exposes its controlled navigation and expanded state; Space/Enter activate the native button. Escape closes the panel and restores trigger focus. Outside pointer input and tabbing out close it. Resizing to desktop reveals links and transfers focus away from the hidden trigger; resizing back rescues focus from a collapsed link. Search, account, and cart remain visible. No application-menu roles, focus trap, scroll lock, or invented category content were added. With scripts disabled, the existing links remain expanded.

Search moves onto its own row below 900 px. Between 900 and 1599 px it sits beside the logo, menu toggle, and utility actions. Desktop header spacing tightens between 1600 and 1799 px to keep every control clear.

Below 1200 px, configurator, catalogue, and SMART artwork have reserved media space above copy. Original images, masks, source ordering, and proportions remain intact. Desktop asymmetric cards retain their original layered composition. Footer labels can wrap at all widths.

The three lamp regions use the saved Figma bounds and are projected through the image's centered cover transform, accounting for natural image size, displayed frame, and crop offsets. ResizeObserver and image-load updates keep them aligned. They are decorative, noninteractive geometry in this phase; Phase 4 will add accessible toggle controls and glow layers. No duplicate lamp cutouts are drawn.

## Verification

- Chrome: all 70 page images load at each of 17 widths: 320, 375, 390, 599, 600, 699, 700, 768, 899, 900, 1024, 1200, 1280, 1440, 1599, 1600, and 1920 px.
- Both JavaScript-enabled and disabled runs pass overflow, landmarks, image, footer inventory, search serialization, native cookie disclosure, and network checks.
- Native keyboard events verify disclosure opening, first-link Tab access, Escape focus restoration, and unrestricted tab exit. Pointer dismissal and focus recovery across the desktop breakpoint pass.
- A 101-position resize sweep from 320 to 1920 px in 16 px increments checks open navigation, header-control overlap, content overflow, protected card media/copy space, and visible lamp-region geometry.
- Desktop and mobile captures were inspected. No dependency or framework was introduced.

Evidence: [browser checks](phase-3-browser-report.json), [no-JavaScript checks](phase-3-no-js-report.json), [desktop capture](references/phase-3-1920.png), and [mobile capture](references/phase-3-375.png).

Run `node scripts/serve.mjs`, then in PowerShell run `$env:QA_PHASE='3'; node scripts/check-static-page.mjs`. For the fallback run, also set `$env:QA_NO_JS='1'`. Set `PREVIEW_URL` if using a different port and `QA_CAPTURE='0'` to skip screenshots.

## Documentation and remaining scope

Current documentation was retrieved through the project's Context7 CLI workflow using MDN's `/mdn/content` library. [MDN aria-expanded guidance](https://github.com/mdn/content/blob/main/files/en-us/web/accessibility/aria/reference/attributes/aria-expanded/index.md) supports the button's controlled ID and synchronized expanded state.

Existing user edits removing general focus outlines were preserved; the new menu trigger and enhanced navigation links have scoped visible focus styling.

Slider/lamp behavior and motion remain Phase 4; WebGL remains Phase 5. Destination limitations from Phase 2 remain documented. Verification here used local desktop Chrome and emulated viewport widths; physical mobile browsers, Firefox/Safari, screen-reader testing, and actual browser zoom remain Phase 6 checks. Existing captured Figma context/assets were reused because the Figma MCP quota was exhausted during Phase 1.
