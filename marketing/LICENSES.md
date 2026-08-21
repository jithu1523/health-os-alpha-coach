# Alpha Coach Marketing Site V2 - Licenses

## Third-Party Fonts

| Asset | Source | License | Attribution / Notes |
|---|---|---|---|
| Unbounded | Google Fonts, `https://fonts.google.com/specimen/Unbounded` | SIL Open Font License 1.1 | Remote web font loaded from Google Fonts. No attribution required by OFL, but license/copyright should remain with redistributed font files if self-hosted later. |
| Plus Jakarta Sans | Google Fonts, `https://fonts.google.com/specimen/Plus+Jakarta+Sans` | SIL Open Font License 1.1 | Remote web font loaded from Google Fonts. No attribution required by OFL, but license/copyright should remain with redistributed font files if self-hosted later. |
| Cabinet Grotesk | Fontshare, `https://www.fontshare.com/fonts/cabinet-grotesk` | Fontshare Free Fonts License / free for personal and commercial use | Remote web font loaded from Fontshare. Keep Fontshare license terms with redistributed font files if self-hosted later. |

## First-Party / Original Assets

| Asset | Source | License | Attribution / Notes |
|---|---|---|---|
| Interactive mascot SVG | Ported from this repository's `alpha-coach.html` inline mascot implementation | First-party plutonaiii / Alpha Coach brand asset | Same mascot geometry and state classes adapted for the marketing page. No third-party attribution. |
| Interactive progress rings | Ported/adapted from this repository's `alpha-coach.html` SVG ring and mascot arc implementation | First-party plutonaiii / Alpha Coach brand asset | Uses SVG `pathLength`, `stroke-dasharray`, and `stroke-dashoffset`; no PNG asset. |
| Layout, micro-interactions, and inline SVG icons | Written for this marketing page | First-party plutonaiii / Alpha Coach code | No copied template, stock photo, or third-party icon set. |

## Code And Libraries

- No third-party JavaScript libraries are used.
- Lenis, GSAP, Motion, Swiper, AOS, Locomotive Scroll, Pixi.js, and Three.js are not included.
- GSAP remains deliberately excluded because the brief requires open-source/MIT-compatible choices and Oscar flagged GSAP as free for commercial use but not MIT/OSI open-source.
- `marketing/assets/mascot.png` and `marketing/assets/ring.png` were removed in V2.
