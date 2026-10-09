# Wendmark logo

A teaching cursor with a winding trail: the route Wendmark guides people
along. The colours are the portal's own (`apps/portal/app/globals.css`) and
the snippet's cursor (`packages/snippet/src/overlay/cursor.ts`).

| Part              | Light     | Reversed  |
| ----------------- | --------- | --------- |
| Cursor            | `#0e5c57` | `#ffffff` |
| Trail             | `#12857d` | `#5fb8ae` |
| Wordmark          | `#08332f` | `#ffffff` |
| Reversed backdrop | —         | `#08332f` |
| App icon tile     | `#0e5c57` | —         |

The wordmark is Plus Jakarta Sans SemiBold (600), tracked −1%, converted to
outlines, so the SVGs need no font. Plus Jakarta Sans is under the SIL Open
Font License 1.1.

## Files

- `wendmark-horizontal(-reversed).svg`: primary lockup.
- `wendmark-stacked(-reversed).svg`: mark above the wordmark.
- `wendmark-mark(-reversed).svg`: the mark alone, square.
- `wendmark-app-icon.svg`: reversed mark on a rounded teal tile.
- `wendmark-app-icon-square.svg`: full-bleed tile for platforms that apply
  their own mask (iOS, maskable PWA icons).
- `png/`: `favicon.ico` (16, 32, 48), `favicon-*.png`,
  `apple-touch-icon.png` (180), `icon-192.png`, `icon-512.png`,
  `icon-maskable-512.png`, and @2x PNGs of each lockup.

Keep clear space around the logo of at least the trail's height, and don't
recolour, stretch, or add effects to the mark.
