#!/usr/bin/env python3
"""Generates the static SEO pages (tools hub, tool pages, about, privacy, 404) and sitemap.xml.
Run from the repo root: python3 scripts/build_pages.py"""
import json, html, os, datetime

SITE = 'https://grainroomapp.vercel.app'
ISSUES = 'https://github.com/idirmohamed2012-pgrammer34/grainroom/issues'
TODAY = datetime.date.today().isoformat()
E = html.escape

def T(slug, icon, cat, name, title, desc, h1, lead, steps, faqs, related, badges=None):
    return dict(slug=slug, icon=icon, cat=cat, name=name, title=title, desc=desc, h1=h1, lead=lead,
                steps=steps, faqs=faqs, related=related, badges=badges or [])

def conv(a, b, A, B, why, lossy_note):
    slug = f'{a}-to-{b}'
    return T(slug, '🔄', 'Convert', f'{A} to {B}',
        f'{A} to {B} Converter — Free, Private, In Your Browser | Grainroom',
        f'Convert {A} images to {B} online for free. No upload, no signup, no watermark: Grainroom converts in your browser and works with many files at once.',
        f'{A} to {B} converter',
        f'Convert {A} files to {B} in one click, right in your browser. {why}',
        [f'Drop one or many {A} files onto the box above (or paste from the clipboard).', 'Adjust quality or background colour if you want.', f'Download each {B} file or grab them all in a ZIP.'],
        [(f'Is this {A} to {B} converter really free?', 'Yes. There is no signup, no watermark and no limit on the number of files, because the conversion runs on your own device.'),
         (f'Are my {A} files uploaded anywhere?', 'No. Files are decoded and re-encoded locally by your browser. Nothing is sent to a server, so it also works offline once the page has loaded.'),
         (f'Will converting {A} to {B} change the quality?', lossy_note),
         ('Can I convert many files at once?', 'Yes. Drop as many as you like. Each one is converted separately and you can download them together as a ZIP.')],
        [x for x in ['png-to-jpg', 'jpg-to-png', 'webp-to-jpg', 'webp-to-png', 'jpg-to-webp', 'png-to-webp'] if x != slug][:3] + ['compress'],
        ['Free', 'No upload', 'Batch'])

TOOLS = [
    T('compress', '🗜️', 'Optimise', 'Image Compressor',
      'Compress Images Online — Free JPG & WebP Compressor | Grainroom',
      'Reduce image file size by up to 90% without visible loss. Free online image compressor that runs in your browser: no upload, no signup, batch support.',
      'Compress images online',
      'Shrink JPG, PNG and WebP photos for websites, email and social media. Choose the quality you want and compare sizes instantly.',
      ['Drop your images on the box above.', 'Pick WebP for the smallest files or JPG for maximum compatibility, then set the quality (75% is a good start).', 'Optionally limit the width, then download the results or the ZIP.'],
      [('How much can I reduce the size?', 'Photos typically shrink by 60–90% at 70–80% quality with little visible difference. Screenshots and graphics with flat colours compress even better as WebP.'),
       ('Is my image uploaded?', 'No. Compression happens in your browser using the built-in image encoder.'),
       ('JPG or WebP?', 'WebP is usually 25–35% smaller at the same quality and is supported by all modern browsers. Use JPG when you need to share with older software.'),
       ('Does it keep transparency?', 'WebP keeps transparency. JPG cannot, so transparent areas are filled with the background colour you choose.')],
      ['resize', 'png-to-webp', 'jpg-to-webp', 'remove-exif'], ['Free', 'No upload', 'Batch']),
    conv('png', 'jpg', 'PNG', 'JPG', 'Smaller files for photos, with a background colour for transparent areas.', 'JPG is a lossy format, so a very small amount of detail is traded for a much smaller file. At 90% quality the difference is invisible for photos. Transparent areas are filled with the background colour you pick.'),
    conv('jpg', 'png', 'JPG', 'PNG', 'PNG is lossless, which is handy for editing and screenshots.', 'The PNG is a lossless copy of the decoded JPG, so no further quality is lost. The file will be larger because PNG does not use lossy compression, and JPG artefacts already present remain.'),
    conv('webp', 'jpg', 'WebP', 'JPG', 'Use JPG when a site or app refuses WebP.', 'JPG is lossy, so keep the quality at 90% or above for the best result. Transparent areas are filled with the background colour you pick.'),
    conv('webp', 'png', 'WebP', 'PNG', 'PNG keeps transparency and works everywhere.', 'PNG is lossless and keeps transparency. The file may be larger than the WebP original.'),
    conv('jpg', 'webp', 'JPG', 'WebP', 'WebP files are typically a quarter to a third smaller at the same quality.', 'WebP in lossy mode is re-compression, so keep quality at 85–90% to avoid visible changes. File size is usually noticeably smaller.'),
    conv('png', 'webp', 'PNG', 'WebP', 'WebP is much smaller than PNG and supports transparency.', 'Transparency is preserved. WebP is lossy at the quality you choose, so keep it at 90% or higher for graphics with fine text.'),
    T('resize', '📐', 'Optimise', 'Image Resizer',
      'Resize Images Online — Free Batch Image Resizer | Grainroom',
      'Resize photos by width, height, percentage or fit-inside-a-box. Free, batch-capable and private: images are resized in your browser, never uploaded.',
      'Resize images online',
      'Change the pixel size of many images at once. High-quality downscaling keeps edges sharp.',
      ['Drop your images on the box above.', 'Choose how to resize: width, height, percent, fit in a box, or exact size.', 'Pick the output format and download the images or a ZIP.'],
      [('Does resizing reduce quality?', 'Shrinking uses multi-step high-quality scaling, so results stay sharp. Enlarging cannot add real detail, which is why "Never enlarge" is on by default.'),
       ('Can I keep the aspect ratio?', 'Yes. Width, height, percent and fit modes always keep the ratio. Only "Exact size" stretches.'),
       ('What size should I use for the web?', 'For full-width web photos 1600–2000 px wide is plenty. For social posts 1080 px is typical.')],
      ['compress', 'collage', 'jpg-to-webp', 'watermark'], ['Free', 'No upload', 'Batch']),
    T('watermark', '💧', 'Create', 'Watermark Photos',
      'Add a Watermark to Photos Online — Free, Private | Grainroom',
      'Add a text watermark to many photos at once. Choose position, size, opacity and colour, or tile it across the picture. Runs in your browser.',
      'Add a watermark to photos',
      'Protect your work with a custom text watermark. Place it in a corner, in the centre or tile it diagonally across the image.',
      ['Drop your photos on the box above.', 'Type your watermark and set position, size, opacity and colour.', 'Download the watermarked images or a ZIP.'],
      [('Can I watermark many photos at once?', 'Yes, every photo you add gets the same watermark and updates live when you change an option.'),
       ('Are my photos uploaded?', 'No. The watermark is drawn on your device.'),
       ('What makes a good watermark?', 'A semi-transparent name or handle with a soft shadow stays readable on light and dark areas without ruining the photo. Tiled mode is harder to crop out.')],
      ['resize', 'compress', 'remove-exif', 'collage'], ['Free', 'No upload', 'Batch']),
    T('remove-exif', '🕵️', 'Privacy', 'EXIF Remover',
      'Remove EXIF Data from Photos — Strip GPS & Metadata Online | Grainroom',
      'Remove GPS location, camera model and other hidden metadata from photos before you share them. Lossless for JPG, private and free, in your browser.',
      'Remove EXIF data and GPS location from photos',
      'Photos often carry hidden details: where they were taken, when, and with which device. Strip them in one click before posting online.',
      ['Drop your photos on the box above.', 'The list shows what was found and removed (camera, date, GPS).', 'Download the clean copies or a ZIP.'],
      [('What is EXIF data?', 'EXIF is metadata stored inside a photo: camera make and model, date and time, exposure settings and often the GPS coordinates where it was taken.'),
       ('Is JPG quality affected?', 'No. For JPG the metadata blocks are cut out without re-encoding, so pixels are untouched. Colour profiles are kept so colours stay correct.'),
       ('What about the rotation of my photo?', 'If a photo relies on an EXIF orientation flag, it is rotated into the correct position and re-saved at high quality so it stays upright after cleaning.'),
       ('Does it work for PNG and WebP?', 'Yes. They are re-encoded, which drops embedded metadata.'),
       ('Does it upload my photos?', 'Never. This matters most for a privacy tool: all processing happens on your device.')],
      ['compress', 'watermark', 'resize', 'png-to-jpg'], ['Free', 'No upload', 'Lossless JPG']),
    T('collage', '🧩', 'Create', 'Photo Collage Maker',
      'Photo Collage Maker — Free Online Grid Collage | Grainroom',
      'Make a photo collage online in seconds. Choose columns, spacing, rounded corners and background colour, then download in high resolution. Private and free.',
      'Photo collage maker',
      'Combine several photos into a clean grid. Adjust columns, cell shape, spacing and corners, then download a high-resolution image.',
      ['Add two or more photos.', 'Choose columns, cell shape, spacing, corner radius and background colour.', 'Download the collage as JPG or PNG.'],
      [('How many photos can I add?', 'As many as you like. Large collages may take a moment on older devices.'),
       ('What resolution is the result?', 'Choose 1200, 2000 or 3000 px wide.'),
       ('Can I make more complex layouts?', 'Yes, open the Grainroom editor to arrange layers freely with masks, text and filters.')],
      ['resize', 'meme', 'watermark', 'image-to-pdf'], ['Free', 'No upload', 'No watermark']),
    T('meme', '😂', 'Create', 'Meme Generator',
      'Meme Generator — Add Top & Bottom Text to Any Image | Grainroom',
      'Create memes with your own image: classic top and bottom captions with outline, any colour and size. Free, no watermark, nothing uploaded.',
      'Meme generator',
      'Add the classic top and bottom caption to any image. No watermark and no account.',
      ['Add an image.', 'Type the top and bottom text, then change size and colours.', 'Download your meme as PNG.'],
      [('Does the meme have a watermark?', 'No. The image is yours.'),
       ('Is my image uploaded?', 'No. The text is drawn on your device.'),
       ('Can I use my own font or effects?', 'For full control use the Grainroom editor, which has text styles, stickers and filters.')],
      ['collage', 'resize', 'compress', 'watermark'], ['Free', 'No watermark', 'No upload']),
    T('color-picker', '🎨', 'Design', 'Image Color Picker',
      'Image Color Picker — Pick HEX, RGB & HSL from a Photo | Grainroom',
      'Upload a picture, hover to read any pixel colour and click to copy HEX, RGB or HSL. Also extracts the dominant colour palette. Free and private.',
      'Image color picker and palette extractor',
      'Pick exact colours from any image and get the dominant palette in one go. Click a swatch to copy its HEX code.',
      ['Add an image.', 'Move the cursor over it to read colours and click to save a swatch.', 'Click any swatch to copy its HEX code. The dominant palette is shown automatically.'],
      [('Which colour formats are shown?', 'HEX, RGB and HSL.'),
       ('How is the palette computed?', 'Pixels are grouped into similar colours and the most common distinct groups are shown.'),
       ('Is my image uploaded?', 'No. Everything stays on your device.')],
      ['collage', 'resize', 'compress', 'meme'], ['Free', 'No upload']),
    T('image-to-pdf', '📄', 'Convert', 'Image to PDF',
      'Image to PDF Converter — Combine JPG & PNG into One PDF | Grainroom',
      'Turn JPG, PNG and WebP images into a single PDF. Reorder pages, choose A4, Letter or image size. Free, private and done in your browser.',
      'Convert images to PDF',
      'Combine several images into one PDF, one image per page. Reorder them, pick the page size and download.',
      ['Add your images and reorder them with the arrows.', 'Choose A4, US Letter or the same size as each image, and the margin.', 'Click Create PDF to download.'],
      [('Is the order of pages adjustable?', 'Yes. Use the up and down arrows next to each image.'),
       ('Is my content uploaded?', 'No. The PDF is built entirely in your browser.'),
       ('Will quality be reduced?', 'Images are embedded as high-quality JPEG (90% by default, adjustable). Transparent areas become white.')],
      ['compress', 'resize', 'collage', 'png-to-jpg'], ['Free', 'No upload', 'No watermark']),
]

def simple(slug, icon, cat, name, desc_what, h1, lead, steps, faqs, related, badges=('Free', 'No upload', 'Batch')):
    return T(slug, icon, cat, name, f'{name} — Free Online Tool | Grainroom', f'{desc_what} Free, private and fast: runs in your browser, nothing is uploaded.', h1, lead, steps, faqs, related, list(badges))

PRIV = ('Is my file uploaded?', 'No. Everything is processed on your device by your browser. Nothing is sent to a server.')
TOOLS += [
    simple('rotate', '↻', 'Edit', 'Rotate & Flip Images', 'Rotate images 90°, 180° or flip them horizontally and vertically in batch.', 'Rotate and flip images online',
           'Fix sideways photos or mirror an image. Works on many files at once.',
           ['Drop your images on the box above.', 'Choose rotate 90° left or right, 180°, or flip horizontally or vertically.', 'Download the results or a ZIP.'],
           [PRIV, ('Does rotating lose quality?', 'Rotating by 90° steps is exact. Saving as JPG or WebP re-encodes the image, so use quality 92% or higher, or choose PNG for no loss.'), ('Can I rotate many photos?', 'Yes. Every file you add gets the same action.')],
           ['crop-image', 'resize', 'photo-filters', 'compress']),
    simple('crop-image', '✂️', 'Edit', 'Crop Image to Size', 'Crop images to Instagram, TikTok, YouTube, Facebook, X or LinkedIn sizes, or a custom size.', 'Crop images to social media sizes',
           'Get the exact pixel size each platform wants. Move the focus point to choose which part of the photo stays in frame.',
           ['Drop your images on the box above.', 'Pick a preset like Instagram post or YouTube thumbnail, or enter a custom size.', 'Adjust the horizontal and vertical focus, then download.'],
           [PRIV, ('How does the crop work?', 'The image is scaled to fill the target size and the extra edges are cut off. The focus sliders decide which side is trimmed.'), ('Which sizes are available?', 'Instagram post, portrait and story, YouTube thumbnail, Facebook post and cover, X header, LinkedIn banner, a square ID size and custom.')],
           ['resize', 'rotate', 'compress', 'collage']),
    simple('photo-filters', '🎞️', 'Edit', 'Photo Filters', 'Apply black and white, sepia, vintage and more filters to photos, with brightness, contrast and saturation controls.', 'Apply filters to photos online',
           'Give your photos a look in seconds: black and white, sepia, vintage, vivid, faded film, cool or warm. Fine-tune brightness, contrast, saturation and blur.',
           ['Drop your photos on the box above.', 'Pick a look and tweak the sliders.', 'Download the results or a ZIP.'],
           [PRIV, ('Can I apply the same filter to many photos?', 'Yes, all added photos update live with your settings.'), ('Why does it need a modern browser?', 'Filters use the browser canvas filter feature, available in Chrome, Edge and Firefox. For more control use the full Grainroom editor with film looks and adjustments.')],
           ['rotate', 'crop-image', 'watermark', 'compress']),
    simple('favicon', '⭐', 'Design', 'Favicon Generator', 'Turn any logo or image into a complete favicon pack: favicon.ico, PNG sizes, Apple touch icon and Android icons.', 'Favicon generator',
           'Create every icon size your website needs from one image. Download a ZIP with favicon.ico, 16/32/48 px PNGs, the Apple touch icon and 192/512 px Android icons.',
           ['Drop your logo or image (a square one works best).', 'Optionally set a background colour and padding.', 'Download the ZIP and copy the HTML lines from the included text file into your site head.'],
           [PRIV, ('What sizes are included?', 'favicon.ico (16, 32, 48), PNGs at 16, 32 and 48, apple-touch-icon at 180, and Android icons at 192 and 512.'), ('What image should I start with?', 'A square image of at least 512 × 512 px. Simple logos with a transparent background work best.')],
           ['resize', 'crop-image', 'png-to-webp', 'image-to-base64'], ('Free', 'No upload')),
    simple('image-to-base64', '🔣', 'Convert', 'Image to Base64', 'Convert an image to a Base64 data URI, an HTML img tag or CSS background.', 'Convert image to Base64',
           'Embed small images directly in HTML or CSS. Get a data URI, an img tag, a CSS background rule or the raw Base64 string.',
           ['Drop an image on the box above.', 'Choose the output style.', 'Click Copy.'],
           [PRIV, ('When should I use Base64 images?', 'For very small images such as icons, where saving an extra request helps. Base64 makes data about 33% bigger, so large photos are better as normal files.')],
           ['compress', 'favicon', 'png-to-webp', 'resize'], ('Free', 'No upload')),
    conv('svg', 'png', 'SVG', 'PNG', 'Pick the output width for a sharp result at any size.', 'PNG is a raster image, so choose an output width large enough for where you will use it. SVG itself stays perfectly sharp at any size.'),
    conv('avif', 'jpg', 'AVIF', 'JPG', 'Open AVIF photos in software that does not support them yet.', 'JPG is lossy, so keep the quality at 90% or above. Transparent areas are filled with the background colour you choose.'),
    conv('avif', 'png', 'AVIF', 'PNG', 'PNG keeps transparency and works everywhere.', 'PNG is lossless, so no more quality is lost. The file will be larger than the AVIF.'),
    conv('gif', 'png', 'GIF', 'PNG', 'Extracts the first frame of the GIF as a PNG.', 'PNG is lossless. For animated GIFs only the first frame is converted.'),
    conv('gif', 'jpg', 'GIF', 'JPG', 'Extracts the first frame of the GIF as a JPG.', 'JPG is lossy but at 90% quality the difference is invisible. For animated GIFs only the first frame is converted.'),
    conv('bmp', 'jpg', 'BMP', 'JPG', 'BMP files are huge. JPG makes them far smaller.', 'JPG is lossy, but at 90% quality the difference is invisible, and the file is usually 90% smaller than the BMP.'),
    conv('bmp', 'png', 'BMP', 'PNG', 'PNG is lossless and much smaller than BMP.', 'PNG is lossless, so the picture is identical to the BMP and the file is much smaller.'),
    simple('merge-pdf', '📚', 'PDF', 'Merge PDF', 'Combine several PDF files into one document in the order you choose.', 'Merge PDF files online',
           'Join PDFs into a single file. Reorder them with the arrows, then download the merged document.',
           ['Add two or more PDF files.', 'Reorder them with the arrows.', 'Click Merge PDFs and download.'],
           [PRIV, ('Is there a size or page limit?', 'No fixed limit. Very large files depend on your device memory.'), ('Does merging change the quality?', 'No. Pages are copied as they are, so text stays selectable and images keep their quality.'), ('Can it merge password-protected PDFs?', 'Not if they need a password to open. Remove the password first.')],
           ['split-pdf', 'rotate-pdf', 'image-to-pdf', 'compress'], ('Free', 'No upload', 'No watermark')),
    simple('split-pdf', '✂️', 'PDF', 'Split PDF', 'Extract pages or split a PDF into several files by page ranges.', 'Split PDF and extract pages',
           'Pull out the pages you need, split into parts, or save every page as its own PDF.',
           ['Add a PDF. The page count appears.', 'Type pages or ranges such as 1-3, 5, 8-.', 'Choose one PDF with those pages, one PDF per range, or every page separately, then download.'],
           [PRIV, ('What is the range format?', 'Use commas and dashes: 1-3, 5, 8- means pages 1 to 3, page 5 and page 8 to the end.'), ('Is quality kept?', 'Yes. Pages are copied without recompressing.')],
           ['merge-pdf', 'rotate-pdf', 'image-to-pdf', 'compress'], ('Free', 'No upload', 'No watermark')),
    simple('rotate-pdf', '🔃', 'PDF', 'Rotate PDF', 'Rotate all pages or selected pages of a PDF by 90, 180 or 270 degrees.', 'Rotate PDF pages online',
           'Fix scanned documents that came out sideways. Rotate every page or only the ones you choose.',
           ['Add a PDF.', 'Choose the rotation and, optionally, which pages.', 'Click Rotate PDF and download.'],
           [PRIV, ('Can I rotate only some pages?', 'Yes, enter ranges like 2-4, 7. Leave blank for all pages.'), ('Is quality kept?', 'Yes. The rotation is stored in the PDF and nothing is recompressed.')],
           ['merge-pdf', 'split-pdf', 'image-to-pdf', 'rotate'], ('Free', 'No upload', 'No watermark')),
]
BY = {t['slug']: t for t in TOOLS}
CATS = ['Optimise', 'Edit', 'Convert', 'PDF', 'Create', 'Privacy', 'Design']
CAT_DESC = {'Edit': 'Rotate, crop and filter photos', 'PDF': 'Merge, split and rotate PDF files', 'Optimise': 'Make images lighter and the right size', 'Convert': 'Switch between image formats and PDF', 'Create': 'Make collages, memes and watermarks', 'Privacy': 'Protect what you share', 'Design': 'Colour tools'}

FONTS = '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700&family=Playfair+Display:wght@700&display=swap">'

def jl(o): return '<script type="application/ld+json">' + json.dumps(o, ensure_ascii=False) + '</script>'

def head(title, desc, path, ld=(), robots=None):
    url = SITE + path
    return f'''<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{E(title)}</title>
<meta name="description" content="{E(desc)}">
<link rel="canonical" href="{url}">
{f'<meta name="robots" content="{robots}">' if robots else ''}
<meta name="theme-color" content="#0f0e0c">
<link rel="manifest" href="/manifest.webmanifest">
<link rel="icon" href="/icon-192.png">
<meta property="og:type" content="website"><meta property="og:site_name" content="Grainroom App">
<meta property="og:title" content="{E(title)}"><meta property="og:description" content="{E(desc)}">
<meta property="og:url" content="{url}"><meta property="og:image" content="{SITE}/og.png">
<meta name="twitter:card" content="summary_large_image">
{FONTS}
<link rel="stylesheet" href="/assets/site.css">
{''.join(jl(x) for x in ld)}
</head>
<body>
'''

HEADER = '''<header class="site"><div class="wrap">
<a class="logo" href="/">Grain<span>room</span></a>
<nav class="main"><a href="/tools">Tools</a><a class="hide-sm" href="/about">About</a><a class="hide-sm" href="/fr">FR</a><a class="btn sm" href="/editor">Open Editor →</a></nav>
</div></header>
'''

def footer():
    cols = ''
    for c in CATS:
        items = ''.join(f'<li><a href="/tools/{t["slug"]}">{E(t["name"])}</a></li>' for t in TOOLS if t['cat'] == c)
        cols += f'<div><h4>{c}</h4><ul>{items}</ul></div>'
    return f'''<footer class="site"><div class="wrap"><div class="cols">
<div><h4>Grainroom App</h4><ul><li><a href="/editor">Free online photo editor</a></li><li><a href="/tools">All tools</a></li><li><a href="/about">About</a></li><li><a href="/privacy">Privacy</a></li><li><a href="/fr">Français</a></li><li><a href="{ISSUES}" rel="noopener">Feedback</a></li></ul></div>
{cols}
</div>
<p style="margin-top:22px">Grainroom App is a web app that runs in your browser. It is separate from the Grainroom Photo Studio mobile app. © {datetime.date.today().year} Grainroom.</p>
</div></footer>
<script defer src="/_vercel/insights/script.js"></script>
<script>if('serviceWorker' in navigator)addEventListener('load',()=>navigator.serviceWorker.register('/sw.js').catch(()=>{{}}))</script>
</body></html>
'''

def crumbs(items):
    h = ' <span>›</span> '.join(f'<a href="{u}">{E(n)}</a>' if u else E(n) for n, u in items)
    return f'<div class="crumbs">{h}</div>'

def crumb_ld(items):
    return {"@context": "https://schema.org", "@type": "BreadcrumbList", "itemListElement": [
        {"@type": "ListItem", "position": i + 1, "name": n, **({"item": SITE + u} if u else {})} for i, (n, u) in enumerate(items)]}

def tool_page(t):
    path = '/tools/' + t['slug']
    cr = [('Home', '/'), ('Tools', '/tools'), (t['name'], None)]
    ld = [
        {"@context": "https://schema.org", "@type": "WebApplication", "name": t['name'] + ' — Grainroom', "url": SITE + path,
         "applicationCategory": "MultimediaApplication", "operatingSystem": "All", "browserRequirements": "Requires HTML5 support",
         "description": t['desc'], "offers": {"@type": "Offer", "price": "0", "priceCurrency": "USD"}},
        {"@context": "https://schema.org", "@type": "FAQPage", "mainEntity": [
            {"@type": "Question", "name": q, "acceptedAnswer": {"@type": "Answer", "text": a}} for q, a in t['faqs']]},
        crumb_ld(cr)]
    steps = ''.join(f'<li>{E(s)}</li>' for s in t['steps'])
    faqs = ''.join(f'<details><summary>{E(q)}</summary><p>{E(a)}</p></details>' for q, a in t['faqs'])
    rel = ''.join(f'<a class="card" href="/tools/{r}"><div class="ic">{BY[r]["icon"]}</div><h3>{E(BY[r]["name"])}</h3><p>{E(BY[r]["lead"][:90].rsplit(" ", 1)[0])}…</p></a>' for r in t['related'])
    badges = ''.join(f'<span class="badge"><b>✓</b> {E(b)}</span>' for b in t['badges'])
    return (head(t['title'], t['desc'], path, ld) + HEADER + f'''<main class="wrap">
{crumbs(cr)}
<div class="hero"><h1>{E(t['h1'])}</h1><p class="lead">{E(t['lead'])}</p><div class="badges">{badges}</div></div>
<div class="toolbox" id="tool" data-tool="{t['slug']}"><noscript><p>This tool needs JavaScript. Nothing is uploaded: it all runs in your browser.</p></noscript></div>
<section class="block prose"><h2>How to use it</h2><ol class="steps">{steps}</ol></section>
<section class="block"><h2>Frequently asked questions</h2>{faqs}</section>
<section class="block"><h2>More free tools</h2><div class="grid">{rel}</div>
<p class="prose" style="margin-top:16px">Need more than a quick fix? Open the <a href="/editor">Grainroom online photo editor</a> for layers, masks, retouching and film looks, free in your browser.</p></section>
</main>
<script src="/assets/tools.js"></script>
''' + footer())

def hub():
    cr = [('Home', '/'), ('Tools', None)]
    ld = [{"@context": "https://schema.org", "@type": "CollectionPage", "name": "Free online image tools", "url": SITE + '/tools',
           "description": "Free image tools that run in your browser: compress, convert, resize, watermark, remove EXIF, collage, meme, colour picker and image to PDF.",
           "mainEntity": {"@type": "ItemList", "itemListElement": [{"@type": "ListItem", "position": i + 1, "url": SITE + '/tools/' + t['slug'], "name": t['name']} for i, t in enumerate(TOOLS)]}},
          crumb_ld(cr)]
    body = ''
    for c in CATS:
        cards = ''.join(f'<a class="card" href="/tools/{t["slug"]}"><div class="ic">{t["icon"]}</div><h3>{E(t["name"])}</h3><p>{E(t["lead"].split(". ")[0].rstrip("."))}.</p></a>' for t in TOOLS if t['cat'] == c)
        body += f'<div class="cat">{c} · {CAT_DESC[c]}</div><div class="grid">{cards}</div>'
    return (head('Free Online Image Tools — Compress, Convert, Resize | Grainroom', 'Free image tools that run in your browser: compress, convert PNG/JPG/WebP, resize, watermark, remove EXIF, collage, meme maker, colour picker and image to PDF. No upload.', '/tools', ld) + HEADER + f'''<main class="wrap">
{crumbs(cr)}
<div class="hero"><h1>Free online image tools</h1><p class="lead">Quick tools for everyday image jobs. Web app, in the browser, no download, no signup. Your files never leave your device.</p>
<div class="badges"><span class="badge"><b>✓</b> En ligne</span><span class="badge"><b>✓</b> Dans le navigateur</span><span class="badge"><b>✓</b> Sans téléchargement</span><span class="badge"><b>✓</b> 100% private</span></div></div>
<a class="card" href="/editor" style="margin:10px 0 0;border-color:var(--accent)"><div class="ic">🖼️</div><h3>Grainroom Photo Editor</h3><p>The full editor: layers, masks, selections, retouching, film looks and more. Free in your browser.</p></a>
<input id="q" type="search" placeholder="Search tools (e.g. compress, pdf, png)…" aria-label="Search tools" style="width:100%;margin:18px 0 0;padding:12px 14px;background:var(--panel);border:1px solid var(--line);border-radius:10px;color:var(--fg);font:inherit">
<div id="all">{body}</div><p id="none" class="stat" style="display:none;color:var(--muted);margin-top:20px">No tool matches your search.</p>
</main>
<script>(function(){{var q=document.getElementById('q'),n=document.getElementById('none');q.addEventListener('input',function(){{var v=q.value.trim().toLowerCase(),shown=0;document.querySelectorAll('#all .card').forEach(function(c){{var m=!v||c.textContent.toLowerCase().indexOf(v)>-1||(c.getAttribute('href')||'').indexOf(v)>-1;c.style.display=m?'':'none';if(m)shown++}});document.querySelectorAll('#all .cat').forEach(function(h){{var g=h.nextElementSibling,any=Array.prototype.some.call(g.children,function(c){{return c.style.display!=='none'}});h.style.display=g.style.display=any?'':'none'}});n.style.display=shown?'none':''}})}})();</script>
''' + footer())

def about():
    cr = [('Home', '/'), ('About', None)]
    ld = [{"@context": "https://schema.org", "@type": "AboutPage", "name": "About Grainroom App", "url": SITE + '/about'}, crumb_ld(cr)]
    return (head('About Grainroom App — Free Online Photo Editor & Web Studio', 'About Grainroom App: a free, private photo editor and set of image tools that run entirely in your web browser. Learn how it works and how it differs from the Photo Studio mobile app.', '/about', ld) + HEADER + f'''<main class="wrap prose">
{crumbs(cr)}
<div class="hero"><h1>About Grainroom App</h1><p class="lead">A free photo editor and image toolkit that lives in your browser.</p></div>
<section class="block"><h2>What it is</h2>
<p>Grainroom App is a web app: open the page and start editing. There is nothing to install and no account to create. The <a href="/editor">editor</a> offers layers, masks, selections, free transform, retouching, film looks, text and stickers. The <a href="/tools">tools</a> handle quick jobs such as compressing, converting and resizing.</p></section>
<section class="block"><h2>Web app vs. mobile app</h2>
<p><strong>Grainroom App</strong> (this site, grainroomapp.vercel.app) runs in your browser on any device with a modern browser. <strong>Grainroom Photo Studio</strong> is a separate mobile app. They are different products with different features.</p></section>
<section class="block"><h2>How it works</h2>
<p>Everything is processed by your browser using the canvas and standard web APIs. Your photos are not uploaded to a server. After the first visit the editor and tools are cached so they keep working offline. Details are on the <a href="/privacy">privacy page</a>.</p></section>
<section class="block"><h2>Feedback</h2>
<p>Found a bug or want a tool added? Open an issue on <a href="{ISSUES}" rel="noopener">GitHub</a>.</p></section>
</main>
''' + footer())

def privacy():
    cr = [('Home', '/'), ('Privacy', None)]
    ld = [crumb_ld(cr)]
    return (head('Privacy — Grainroom App', 'How Grainroom App handles your photos and data: files are processed locally in your browser and are not uploaded. Details on local storage, analytics and fonts.', '/privacy', ld) + HEADER + f'''<main class="wrap prose">
{crumbs(cr)}
<div class="hero"><h1>Privacy</h1><p class="lead">Short version: your photos stay on your device.</p></div>
<section class="block"><h2>Your images</h2>
<p>The editor and every tool process images locally in your browser. Images are not sent to our servers. We cannot see them.</p></section>
<section class="block"><h2>Data stored on your device</h2>
<p>To make the editor convenient it saves some things in your browser: an autosave of your current project (IndexedDB), small preferences (local storage) and a cache of the site files so it works offline (service worker). This data never leaves your device. You can clear it from your browser settings at any time.</p></section>
<section class="block"><h2>Analytics and third parties</h2>
<ul><li>We use Vercel Web Analytics to count page views. It is designed to be privacy-friendly and does not use cookies.</li>
<li>Fonts are loaded from Google Fonts, which means your browser contacts Google to download them.</li>
<li>The site is hosted on Vercel, which processes standard server logs such as IP address to deliver pages.</li></ul></section>
<section class="block"><h2>Contact</h2><p>Questions? Open an issue on <a href="{ISSUES}" rel="noopener">GitHub</a>.</p></section>
<p class="stat" style="color:var(--muted)">Last updated {TODAY}.</p>
</main>
''' + footer())

def notfound():
    return (head('Page not found — Grainroom App', 'This page does not exist. Try the free online photo editor or the image tools.', '/404', robots='noindex') + HEADER + '''<main class="wrap"><div class="hero" style="padding:70px 0"><h1>Page not found</h1><p class="lead">That page does not exist. Try the <a href="/editor">photo editor</a> or the <a href="/tools">free image tools</a>.</p></div></main>
''' + footer())

def write(path, content):
    os.makedirs(os.path.dirname(path) or '.', exist_ok=True)
    open(path, 'w', encoding='utf-8').write(content)

def sitemap():
    urls = [('/', 1.0, True), ('/fr', 0.9, True), ('/editor', 0.9, False), ('/tools', 0.8, False)] + [('/tools/' + t['slug'], 0.7, False) for t in TOOLS] + [('/about', 0.4, False), ('/privacy', 0.3, False)]
    out = ['<?xml version="1.0" encoding="UTF-8"?>', '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">']
    for p, pr, alt in urls:
        u = SITE + (p if p != '/' else '/')
        out.append(f'<url><loc>{u}</loc><lastmod>{TODAY}</lastmod><priority>{pr}</priority>')
        if alt:
            out.append(f'<xhtml:link rel="alternate" hreflang="en" href="{SITE}/"/><xhtml:link rel="alternate" hreflang="fr" href="{SITE}/fr"/>')
        out.append('</url>')
    out.append('</urlset>')
    return '\n'.join(out) + '\n'

if __name__ == '__main__':
    write('tools/index.html', hub())
    for t in TOOLS: write(f'tools/{t["slug"]}.html', tool_page(t))
    write('about.html', about()); write('privacy.html', privacy()); write('404.html', notfound())
    write('sitemap.xml', sitemap())
    print('built', len(TOOLS), 'tool pages')
