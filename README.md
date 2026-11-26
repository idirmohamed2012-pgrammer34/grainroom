# Grainroom — Free Photoshop Online

Free browser-based photo editor with real layers, masks, selections, filters, clone stamp, healing brush, adjustments and export.  
No signup. No watermarks. 100% client-side. Installable and works offline.

**Live:** https://grainroomapp.vercel.app

## Features

**Selections**
- Rectangle, ellipse, lasso and magic wand (exact pixel masks, contiguous or global)
- Add / subtract / intersect (Shift / Alt / Shift+Alt), invert, feather, grow, shrink, select layer pixels
- Selection to layer mask, layer via copy / cut, fill, clear
- Painting, fills, filters and cuts all respect the selection

**Layers**
- Blend modes, opacity, masks, clipping masks, drag-to-reorder, merge, flatten
- Drop shadow and outline stroke, adjustment layers
- Text layers (many fonts, outline, line gap) and shape layers

**Transform**
- Free Transform (Ctrl+T) with handles: proportional / free scale, rotate, flip, fit, fill
- Smart snapping to canvas edges, centre and other layers; align buttons; grid
- Crop with ratios and straighten, rotate / flip canvas, resize image and canvas, trim

**Adjustments and filters**
- Levels, curves, exposure, highlights / shadows, vibrance, saturation, hue, warmth, tint
- Sharpen, clarity, blur, vignette, grain, invert, black & white, sepia, looks
- Live histogram and Auto tone
- Filters with live preview: Gaussian / motion blur, sharpen, noise, pixelate, posterize, emboss, find edges, threshold

**Painting and retouching**
- Brush (pen pressure, smoothing), eraser, bucket, linear / radial gradient
- Clone stamp, spot heal, dodge / burn / sponge, smudge, eyedropper
- Colour panel with HSL mixer, swatches and recent colours

**Workflow**
- 60-step undo history, cut / copy / paste, drag & drop (multiple files)
- Save and open `.grainroom` project files, automatic session recovery (stored only on your device)
- Export PNG / JPEG / WebP with quality and scale, copy to clipboard
- Touch support with pinch zoom, light / dark theme, keyboard shortcuts (press `?`)
- English + French landing pages, installable PWA with offline support

## Deploy

This is a pure static site. Just push to GitHub and connect to Vercel.

```bash
# or
vercel --prod
```

## Analytics

Vercel Web Analytics is already included in all pages (`/_vercel/insights/script.js`).

## License

MIT — free for personal and commercial use.
