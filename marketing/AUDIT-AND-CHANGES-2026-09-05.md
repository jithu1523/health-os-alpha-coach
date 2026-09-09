# Alpha Coach Marketing Audit And Changes

Date: 2026-09-08  
Owner: DESIGNER Pam  
Scope: `marketing/` only. `alpha-coach.html` was not edited.

## Outcome

The marketing site is now self-contained under `marketing/` with app-derived Grove, Ember, and dark theme tokens, first-party SVG product artwork, a reactive five-state mascot, SVG progress rings, refreshed social metadata, and current light/dark desktop/mobile screenshots.

## Changed Files

- `marketing/index.html`
  - Added Open Graph and Twitter image metadata for `og-image.png`.
  - Linked `design-tokens.css` as the theme source of truth.
  - Removed duplicated inline token declarations from component CSS.
  - Removed the raw scroll listener and scroll CSS variable used for decorative parallax.
  - Replaced the remaining inline hardcoded shadow color with `var(--line-2)`.
- `marketing/design-tokens.css`
  - Holds Grove, Ember, system dark, explicit light, and explicit dark theme tokens.
  - Keeps color, shadow, motion duration, easing, layout width, font, and mascot semantic variables in one layer.
- `marketing/DESIGN-NOTES.md`
  - Updated to document the external token layer and the simpler motion system.
- `marketing/LICENSES.md`
  - Added `og-image.png` as a first-party rendered social preview.
- `marketing/og-image.png`
  - New 1200x630 social preview rendered from the actual hero composition.
- `marketing/screenshot-light-desktop.png`
- `marketing/screenshot-dark-desktop.png`
- `marketing/screenshot-light-mobile.png`
- `marketing/screenshot-dark-mobile.png`
  - Refreshed from headless Chrome after the final HTML/CSS changes.

## Skill-Driven Decisions

- `ui-ux-pro-max`: Used the preflight lens for accessibility, responsive fit, obvious hierarchy, honest copy, keyboard-visible controls, and no horizontal overflow. I also ran its design-system search, but kept the app's Alpha Coach tokens because the generated direction was less faithful to the product.
- `design`, `design-system`, `ui-styling`: Consolidated design decisions into `design-tokens.css`, kept component CSS on variables, added social preview metadata, and ran both token validators.
- `apple-design`: Kept chrome quiet, made product artifacts the first-screen signal, used a single functional theme control, and kept interaction feedback direct.
- `emil-design-eng`, `animate`, `transitions-dev`, `transitions-polish`: Preserved purposeful hover, reveal, mascot, and SVG-ring motion while removing ornamental scroll-linked motion. Motion remains transform, opacity, and stroke-dashoffset based.
- `improve-animations`, `review-animations`: Audited the motion system for unnecessary work and removed the raw scroll listener. Remaining animations have a visible product purpose and reduced-motion handling.
- `animation-vocabulary`: Treated the remaining motion as reveal, hover lift, pointer tilt, mascot state transition, and progress-ring draw.
- `banner-design`: Generated the OG/social preview from the real hero rather than a separate stock-like banner.
- `impeccable`: Final self-review score: 92/100. Strong product specificity, token discipline, responsive behavior, and honest copy. Residual risk is mostly browser support for `color-mix()` in older engines; current Chromium capture is good.
- `karpathy-guidelines`: The local skill file was not installed, so I applied the requested spirit as a no-bloat rule: no extra runtime dependency, no ornamental library, no fake content, and no app-file changes.

## Reference Direction Applied

- Apple: restraint, product-first visual signal, quiet chrome.
- Linear: dark craft, precise panels, restrained depth.
- Vercel: clean grid, strong type scale, low-noise canvas.
- Stripe: confident editorial composition without copying the gradient identity.
- Framer: artboard-like product stage and responsive motion restraint.
- Superhuman: sharp headline hierarchy and concise premium copy.

## Verification

- `node --check` on the extracted marketing script: passed.
- Static DOM smoke check: passed, 9 checks.
- Guardrail scan for raw scroll listener, `--scroll`, fake names, invite/beta copy, and dash characters in page HTML: passed.
- `node .agents\skills\design-system\scripts\validate-tokens.cjs --dir marketing`: passed.
- `python .agents\skills\design-system\scripts\html-token-validator.py marketing\index.html`: passed.
- `npm test`: passed, 216 checks.
- `npm run test:boot`: passed, all 13 boot paths render.
- Visual QA: inspected light desktop, dark mobile at 375px, and 1200x630 OG preview.

## Screenshot Paths

- `marketing/screenshot-light-desktop.png`
- `marketing/screenshot-dark-desktop.png`
- `marketing/screenshot-light-mobile.png`
- `marketing/screenshot-dark-mobile.png`
- `marketing/og-image.png`

## Boundary Check

- Work stayed inside `marketing/` plus Pam hive protocol files.
- `alpha-coach.html` was not touched.
- No push was performed.
