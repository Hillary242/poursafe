# PourSafe — Brand Handoff

PourSafe is a field safety and compliance app for concrete safety managers. This folder holds the approved logo and the brand rules to apply when building the app's UI. Use these files as-is; do not redraw the logo.

## Files

| File | Use |
|---|---|
| `poursafe-wordmark.svg` | Primary logo. Charcoal "Pour", orange "Safe", charcoal hard hat over the "a". Light backgrounds. |
| `poursafe-wordmark-reversed.svg` | White "Pour" and hat, orange "Safe". Charcoal or dark backgrounds. |
| `poursafe-wordmark-mono.svg` | One-color charcoal "PourSafe", no hat. Orange backgrounds, vests, stickers, single-color print. |
| `poursafe-app-icon.svg` | App icon source: orange hard hat over white "PS" on a charcoal rounded square (1024×1024). |
| `poursafe-app-icon-1024.png` | 1024×1024 PNG of the app icon, for app store and icon generators. |

All text in the SVGs is converted to outlines, so they render correctly without any font installed. Transparent backgrounds except the app icon.

## Colors

| Token | Hex | Role |
|---|---|---|
| `--ps-charcoal` | `#1F2124` | Primary text, "Pour", dark surfaces, icon background |
| `--ps-orange` | `#F26B1D` | Brand accent: "Safe", primary buttons, highlights |
| `--ps-concrete` | `#EDECE8` | App background / light surface |
| `--ps-slate` | `#4A4D52` | Secondary text, labels |
| `--ps-white` | `#FFFFFF` | Cards, text on charcoal |

Alternate accent tested in design: safety yellow `#F5B800`. Orange is the approved choice.

### Contrast rules
- Orange on white is about 3:1 — use it only for text 24px and larger, icons, and fills. Never for body text.
- Text on orange buttons and fills is **charcoal** (about 5:1), not white.
- Body and small text is charcoal or slate on white/concrete.

## Typography

- **Display / headings / logo-style text:** Archivo Black (Google Fonts, `@fontsource/archivo-black` on npm). Tight tracking, about -0.02em.
- **UI and body:** Inter, weights 500 and 600.
- Taglines and section labels: Inter 600, uppercase, letter-spacing about 0.2em, slate color. Approved tagline: **FIELD SAFETY & COMPLIANCE**.

## Supporting graphic

A short diagonal hazard stripe (charcoal and orange, 45°, 8px bands) is used as a small accent beside the tagline. Use sparingly as a divider or accent, never as a full background.

```css
background: repeating-linear-gradient(-45deg, #1F2124 0 8px, #F26B1D 8px 16px);
```

## Logo usage

- Keep clear space around the wordmark equal to the height of the hard hat.
- Minimum wordmark width: 120px on screen. Below that, use the app icon.
- Don't recolor, stretch, rotate, outline, or add effects. Don't separate the hat from the "a".
- On photos, place the logo on a solid charcoal or white panel.

## App icon

Generate platform sizes (iOS, Android adaptive icon, PWA/favicon) from `poursafe-app-icon.svg` or the 1024 PNG. For Android adaptive icons, use the charcoal `#1F2124` as the background layer and keep the hat and "PS" inside the safe zone. iOS applies its own corner mask, so for iOS export a square version without the rounded corners.

## Design intent

The app is used on jobsites: outdoors, in sun glare, often with gloves. Favor high contrast, large touch targets (44px minimum, larger for primary actions), bold labels, and simple layouts over decoration.
