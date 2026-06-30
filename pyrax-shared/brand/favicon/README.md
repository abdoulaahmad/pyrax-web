# PYRAX favicon + title standard (all sites)

Canonical favicon set + the page-title rule for **every** PYRAX website. Source icon:
`pyrax-branding/Logo V2/pyrax-icon.png` (the dual-flame phoenix), trimmed + padded so it isn't
edge-to-edge in a browser tab.

## Files (copy these into each site's `public/` root)

- `favicon.ico` — multi-res 16/32/48
- `favicon-32.png`, `favicon-16.png` — transparent PNG tab icons
- `apple-touch-icon.png` — 180×180 on the dark brand bg (`#0c0e16`)
- `icon-192.png`, `icon-512.png` — PWA / manifest
- `site.webmanifest`

## `<head>` snippet (every site)

```html
<link rel="icon" href="/favicon.ico" sizes="any" />
<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32.png" />
<link rel="icon" type="image/png" sizes="16x16" href="/favicon-16.png" />
<link rel="apple-touch-icon" href="/apple-touch-icon.png" />
<link rel="manifest" href="/site.webmanifest" />
<meta name="theme-color" content="#06070b" />
```

## Title rule

Every page title MUST start with **`PYRAX™`** (PYRAX followed immediately by the ™ trademark), then
a separator and the page/section name. Example: `PYRAX™ · Team Sign In`. Enforce in the layout:

```js
const fullTitle = /^PYRAX/.test(title) ? title : `PYRAX™ · ${title}`;
```

## Regenerating from the source icon (ImageMagick 7, `magick`)

```bash
SRC="pyrax-branding/Logo V2/pyrax-icon.png"; OUT=public
magick "$SRC" -trim +repage -resize 416x416 -background none -gravity center -extent 512x512 "$OUT/icon-512.png"
magick "$OUT/icon-512.png" -resize 192x192 "$OUT/icon-192.png"
magick "$OUT/icon-512.png" -resize 32x32  "$OUT/favicon-32.png"
magick "$OUT/icon-512.png" -resize 16x16  "$OUT/favicon-16.png"
magick "$OUT/icon-512.png" -define icon:auto-resize=16,32,48 "$OUT/favicon.ico"
magick "$SRC" -trim +repage -resize 134x134 -background "#0c0e16" -gravity center -extent 180x180 "$OUT/apple-touch-icon.png"
```
