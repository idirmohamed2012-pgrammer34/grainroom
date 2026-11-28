/* Grainroom tools engine. Everything runs locally in the browser: no uploads. */
(function () {
'use strict';
const $ = (s, r) => (r || document).querySelector(s);
function el(tag, props, ...kids) {
  const n = document.createElement(tag);
  for (const k in (props || {})) {
    if (k === 'class') n.className = props[k];
    else if (k === 'html') n.innerHTML = props[k];
    else if (k.startsWith('on')) n.addEventListener(k.slice(2), props[k]);
    else if (props[k] !== undefined && props[k] !== null) n.setAttribute(k, props[k]);
  }
  for (const c of kids.flat()) if (c != null) n.append(c.nodeType ? c : document.createTextNode(c));
  return n;
}
const fmtBytes = n => n < 1024 ? n + ' B' : n < 1048576 ? (n / 1024).toFixed(1) + ' KB' : (n / 1048576).toFixed(2) + ' MB';
const baseName = n => n.replace(/\.[^.]+$/, '');
const debounce = (f, ms) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => f(...a), ms); }; };
const EXT = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };

async function loadImage(file) {
  if (window.createImageBitmap) {
    try { const b = await createImageBitmap(file, { imageOrientation: 'from-image' }); return { src: b, w: b.width, h: b.height }; } catch (e) { /* fallback */ }
  }
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error('Cannot read this image')); i.src = url; });
    return { src: img, w: img.naturalWidth, h: img.naturalHeight };
  } finally { setTimeout(() => URL.revokeObjectURL(url), 1000); }
}
function makeCanvas(w, h) { const c = document.createElement('canvas'); c.width = Math.max(1, Math.round(w)); c.height = Math.max(1, Math.round(h)); return c; }
function toBlob(canvas, type, q) {
  return new Promise((res, rej) => canvas.toBlob(b => {
    if (!b) return rej(new Error('Could not encode image'));
    if (type && b.type !== type) return rej(new Error('Your browser cannot save ' + (EXT[type] || type).toUpperCase() + ' files'));
    res(b);
  }, type, q));
}
function download(blob, name) {
  const a = el('a', { href: URL.createObjectURL(blob), download: name });
  document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}
const hex2rgb = h => { h = h.replace('#', ''); if (h.length === 3) h = h.replace(/./g, '$&$&'); const n = parseInt(h, 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; };
const rgb2hex = (r, g, b) => '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('');
function rgb2hsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b); let h = 0, s = 0; const l = (mx + mn) / 2;
  if (mx !== mn) {
    const d = mx - mn; s = l > .5 ? d / (2 - mx - mn) : d / (mx + mn);
    h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; h *= 60;
  }
  return [Math.round(h), Math.round(s * 100), Math.round(l * 100)];
}

/* ---------- ZIP (store only) ---------- */
const CRC = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
function crc32(u8) { let c = 0xFFFFFFFF; for (let i = 0; i < u8.length; i++) c = CRC[(c ^ u8[i]) & 255] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; }
async function makeZip(files) { // files: [{name, blob}]
  const enc = new TextEncoder(), parts = [], central = []; let offset = 0;
  const d = new Date(), dt = ((d.getFullYear() - 1980) << 9 | (d.getMonth() + 1) << 5 | d.getDate()), tm = (d.getHours() << 11 | d.getMinutes() << 5 | d.getSeconds() >> 1);
  const used = new Set();
  for (const f of files) {
    let name = f.name, i = 1; while (used.has(name)) name = baseName(f.name) + '-' + (i++) + (f.name.match(/\.[^.]+$/) || [''])[0]; used.add(name);
    const data = new Uint8Array(await f.blob.arrayBuffer()), nm = enc.encode(name), crc = crc32(data);
    const lh = new DataView(new ArrayBuffer(30));
    lh.setUint32(0, 0x04034b50, true); lh.setUint16(4, 20, true); lh.setUint16(6, 0x0800, true); lh.setUint16(8, 0, true);
    lh.setUint16(10, tm, true); lh.setUint16(12, dt, true); lh.setUint32(14, crc, true); lh.setUint32(18, data.length, true); lh.setUint32(22, data.length, true); lh.setUint16(26, nm.length, true); lh.setUint16(28, 0, true);
    parts.push(new Uint8Array(lh.buffer), nm, data);
    const ch = new DataView(new ArrayBuffer(46));
    ch.setUint32(0, 0x02014b50, true); ch.setUint16(4, 20, true); ch.setUint16(6, 20, true); ch.setUint16(8, 0x0800, true); ch.setUint16(10, 0, true);
    ch.setUint16(12, tm, true); ch.setUint16(14, dt, true); ch.setUint32(16, crc, true); ch.setUint32(20, data.length, true); ch.setUint32(24, data.length, true); ch.setUint16(28, nm.length, true); ch.setUint32(42, offset, true);
    central.push(new Uint8Array(ch.buffer), nm);
    offset += 30 + nm.length + data.length;
  }
  const csize = central.reduce((a, b) => a + b.length, 0);
  const eo = new DataView(new ArrayBuffer(22));
  eo.setUint32(0, 0x06054b50, true); eo.setUint16(8, files.length, true); eo.setUint16(10, files.length, true); eo.setUint32(12, csize, true); eo.setUint32(16, offset, true);
  return new Blob([...parts, ...central, new Uint8Array(eo.buffer)], { type: 'application/zip' });
}

/* ---------- PDF writer (JPEG pages) ---------- */
function buildPdf(pages) { // pages: [{jpeg:Uint8Array, iw, ih, pw, ph, x, y, w, h}]
  const enc = new TextEncoder(), chunks = [], offsets = []; let pos = 0;
  const push = d => { const u = typeof d === 'string' ? enc.encode(d) : d; chunks.push(u); pos += u.length; };
  const obj = (n, body) => { offsets[n] = pos; push(n + ' 0 obj\n'); if (typeof body === 'string') push(body); else body.forEach(push); push('\nendobj\n'); };
  const N = pages.length, f = v => (+v.toFixed(2)).toString();
  push('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n');
  obj(1, '<< /Type /Catalog /Pages 2 0 R >>');
  obj(2, '<< /Type /Pages /Count ' + N + ' /Kids [' + pages.map((_, i) => (3 + i * 3) + ' 0 R').join(' ') + '] >>');
  pages.forEach((p, i) => {
    const pg = 3 + i * 3, im = pg + 1, ct = pg + 2;
    obj(pg, '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ' + f(p.pw) + ' ' + f(p.ph) + '] /Resources << /XObject << /Im0 ' + im + ' 0 R >> >> /Contents ' + ct + ' 0 R >>');
    obj(im, ['<< /Type /XObject /Subtype /Image /Width ' + p.iw + ' /Height ' + p.ih + ' /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ' + p.jpeg.length + ' >>\nstream\n', p.jpeg, '\nendstream']);
    const cs = 'q ' + f(p.w) + ' 0 0 ' + f(p.h) + ' ' + f(p.x) + ' ' + f(p.y) + ' cm /Im0 Do Q';
    obj(ct, '<< /Length ' + cs.length + ' >>\nstream\n' + cs + '\nendstream');
  });
  const total = 3 + N * 3, xr = pos;
  let x = 'xref\n0 ' + total + '\n0000000000 65535 f \n';
  for (let i = 1; i < total; i++) x += String(offsets[i]).padStart(10, '0') + ' 00000 n \n';
  push(x + 'trailer\n<< /Size ' + total + ' /Root 1 0 R >>\nstartxref\n' + xr + '\n%%EOF');
  return new Blob(chunks, { type: 'application/pdf' });
}

/* ---------- JPEG EXIF ---------- */
function readExif(u8) {
  const out = { make: '', model: '', date: '', software: '', gps: false, orientation: 1, found: false };
  if (u8[0] !== 0xFF || u8[1] !== 0xD8) return out;
  let i = 2;
  while (i + 4 < u8.length) {
    if (u8[i] !== 0xFF) break;
    const m = u8[i + 1]; if (m === 0xDA || m === 0xD9) break;
    const len = u8[i + 2] << 8 | u8[i + 3];
    if (m === 0xE1 && u8[i + 4] === 0x45 && u8[i + 5] === 0x78 && u8[i + 6] === 0x69 && u8[i + 7] === 0x66) {
      out.found = true;
      try {
        const base = i + 10, dv = new DataView(u8.buffer, u8.byteOffset + base, len - 8), le = dv.getUint16(0) === 0x4949;
        const g16 = o => dv.getUint16(o, le), g32 = o => dv.getUint32(o, le);
        const str = (cnt, vo) => { let s = ''; const st = cnt > 4 ? g32(vo) : vo; for (let k = 0; k < cnt - 1 && st + k < dv.byteLength; k++) s += String.fromCharCode(dv.getUint8(st + k)); return s.trim(); };
        const ifd = g32(4), n = g16(ifd);
        for (let k = 0; k < n; k++) {
          const e = ifd + 2 + k * 12, tag = g16(e), cnt = g32(e + 4);
          if (tag === 0x010F) out.make = str(cnt, e + 8);
          else if (tag === 0x0110) out.model = str(cnt, e + 8);
          else if (tag === 0x0131) out.software = str(cnt, e + 8);
          else if (tag === 0x0132) out.date = str(cnt, e + 8);
          else if (tag === 0x0112) out.orientation = g16(e + 8);
          else if (tag === 0x8825) out.gps = true;
        }
      } catch (e) { /* partial info is fine */ }
    }
    i += 2 + len;
  }
  return out;
}
function stripJpegMeta(u8) { // drops EXIF/XMP (APP1), APP13 (IPTC) and comments; keeps colour profile
  const parts = [u8.subarray(0, 2)]; let i = 2;
  while (i + 4 <= u8.length) {
    if (u8[i] !== 0xFF) break;
    const m = u8[i + 1];
    if (m === 0xDA) { parts.push(u8.subarray(i)); i = u8.length; break; }
    const len = u8[i + 2] << 8 | u8[i + 3], seg = u8.subarray(i, i + 2 + len);
    if (!(m === 0xE1 || m === 0xED || m === 0xFE)) parts.push(seg);
    i += 2 + len;
  }
  return new Blob(parts, { type: 'image/jpeg' });
}

/* ---------- generic UI pieces ---------- */
function dropzone(root, { multiple = true, accept = 'image/*', label = 'Drop images here or click to choose', onFiles }) {
  const input = el('input', { type: 'file', accept, hidden: '' }); if (multiple) input.multiple = true;
  const dz = el('div', { class: 'drop', tabindex: '0', role: 'button', 'aria-label': 'Choose files' }, el('strong', {}, label), el('span', {}, 'JPG, PNG, WebP, GIF, BMP, AVIF · processed on your device'));
  const go = fl => { const f = [...fl].filter(x => x.type.startsWith('image/') || /\.(jpe?g|png|webp|gif|bmp|avif|heic)$/i.test(x.name)); if (f.length) onFiles(multiple ? f : f.slice(0, 1)); };
  dz.onclick = () => input.click();
  dz.onkeydown = e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); input.click(); } };
  input.onchange = () => { go(input.files); input.value = ''; };
  ['dragenter', 'dragover'].forEach(t => dz.addEventListener(t, e => { e.preventDefault(); dz.classList.add('over'); }));
  ['dragleave', 'drop'].forEach(t => dz.addEventListener(t, e => { e.preventDefault(); dz.classList.remove('over'); }));
  dz.addEventListener('drop', e => go(e.dataTransfer.files));
  window.addEventListener('paste', e => { const fl = [...(e.clipboardData?.files || [])]; if (fl.length) go(fl); });
  root.append(dz, input);
  return dz;
}
function optionsUI(defs, onChange) {
  const box = el('div', { class: 'opts' }), vals = {}, nodes = {};
  const get = () => ({ ...vals });
  defs.forEach(d => {
    vals[d.id] = d.value;
    let inp;
    if (d.type === 'select') inp = el('select', {}, d.choices.map(([v, l]) => el('option', { value: v }, l)));
    else if (d.type === 'checkbox') inp = el('input', { type: 'checkbox' });
    else { inp = el('input', { type: d.type, min: d.min, max: d.max, step: d.step, placeholder: d.placeholder }); }
    if (d.type === 'checkbox') inp.checked = !!d.value; else inp.value = d.value;
    const valEl = el('span', { class: 'val' }, d.type === 'range' ? d.value + (d.suffix || '') : '');
    const upd = () => {
      let v = d.type === 'checkbox' ? inp.checked : inp.value;
      if (d.type === 'range' || d.type === 'number') v = v === '' ? '' : +v;
      vals[d.id] = v; if (d.type === 'range') valEl.textContent = v + (d.suffix || '');
      refresh(); onChange(get(), d.id);
    };
    inp.addEventListener(d.type === 'range' || d.type === 'text' || d.type === 'number' ? 'input' : 'change', upd);
    const wrap = el('div', { class: 'opt' + (d.type === 'checkbox' ? ' chk' : '') },
      d.type === 'checkbox' ? el('label', {}, inp, d.label) : [el('label', {}, d.label, valEl), inp]);
    nodes[d.id] = wrap; box.append(wrap);
  });
  function refresh() { defs.forEach(d => { if (d.when) nodes[d.id].style.display = d.when(vals) ? '' : 'none'; }); }
  refresh();
  return { box, get, set(id, v) { vals[id] = v; const i = nodes[id].querySelector('input,select'); if (i.type === 'checkbox') i.checked = v; else i.value = v; refresh(); } };
}
function privacyNote(root) {
  root.append(el('p', { class: 'privacy-note' }, el('b', {}, '🔒 100% private.'), ' Your files never leave this page: everything is processed by your browser, nothing is uploaded to any server.'));
}

/* ---------- batch framework ---------- */
function batchTool(root, cfg) {
  const state = { items: [], opts: {} };
  const ui = optionsUI(cfg.options || [], () => schedule());
  state.opts = ui.get();
  const list = el('div', { class: 'list' });
  const stat = el('span', { class: 'stat' });
  const dlAll = el('button', { class: 'btn', type: 'button', disabled: '' }, '⬇ Download all (ZIP)');
  const clear = el('button', { class: 'btn outline', type: 'button', disabled: '' }, 'Clear');
  const bar = el('div', { class: 'bar' }, dlAll, clear, el('span', { class: 'grow' }), stat);
  dropzone(root, { label: cfg.dropLabel || 'Drop images here or click to choose', multiple: cfg.multiple !== false, onFiles: add });
  if ((cfg.options || []).length) root.append(ui.box);
  if (cfg.extra) root.append(cfg.extra(ui));
  root.append(bar, list); privacyNote(root);

  function add(files) { files.forEach(f => { const it = { file: f, id: 0, row: null }; state.items.push(it); render(it); run(it); }); upd(); }
  function render(it) {
    const th = el('img', { alt: '' }); it.th = th; it.url = URL.createObjectURL(it.file); th.src = it.url;
    it.nm = el('div', { class: 'nm' }, it.file.name); it.meta = el('div', { class: 'meta' }, 'Working…'); it.acts = el('div', { class: 'acts' });
    it.row = el('div', { class: 'row' }, th, el('div', {}, it.nm, it.meta), it.acts); list.append(it.row);
  }
  async function run(it) {
    const id = ++it.id; it.out = null; it.meta.textContent = 'Working…'; it.acts.replaceChildren(); upd();
    try {
      const o = await cfg.process(it.file, ui.get(), it);
      if (id !== it.id) return;
      it.out = o; const a = it.file.size, b = o.blob.size, d = Math.round((b - a) / a * 100);
      it.meta.replaceChildren(fmtBytes(a) + ' → ' + fmtBytes(b) + ' ', el('b', { class: d <= 0 ? 'good' : 'bad' }, (d > 0 ? '+' : '') + d + '%'), o.note ? ' · ' + o.note : '');
      it.nm.textContent = o.name;
      it.acts.replaceChildren(el('button', { class: 'btn sm', type: 'button', onclick: () => download(o.blob, o.name) }, 'Download'));
    } catch (e) { if (id !== it.id) return; it.out = null; it.meta.replaceChildren(el('span', { class: 'err' }, '⚠ ' + (e.message || e))); }
    upd();
  }
  const schedule = debounce(() => state.items.forEach(run), 250);
  function upd() {
    const done = state.items.filter(i => i.out);
    dlAll.disabled = !done.length; clear.disabled = !state.items.length;
    if (done.length) {
      const a = done.reduce((s, i) => s + i.file.size, 0), b = done.reduce((s, i) => s + i.out.blob.size, 0);
      stat.textContent = done.length + ' file' + (done.length > 1 ? 's' : '') + ' · ' + fmtBytes(a) + ' → ' + fmtBytes(b);
    } else stat.textContent = state.items.length ? 'Working…' : '';
    dlAll.textContent = done.length === 1 ? '⬇ Download' : '⬇ Download all (ZIP)';
  }
  dlAll.onclick = async () => {
    const done = state.items.filter(i => i.out);
    if (done.length === 1) return download(done[0].out.blob, done[0].out.name);
    dlAll.disabled = true; try { download(await makeZip(done.map(i => ({ name: i.out.name, blob: i.out.blob }))), 'grainroom-' + (cfg.zipName || 'images') + '.zip'); } finally { dlAll.disabled = false; }
  };
  clear.onclick = () => { state.items.forEach(i => { URL.revokeObjectURL(i.url); i.id++; }); state.items = []; list.replaceChildren(); upd(); };
  return state;
}

async function renderBitmap(im, { w, h, type, q, bg, draw }) {
  const c = makeCanvas(w || im.w, h || im.h), x = c.getContext('2d');
  x.imageSmoothingQuality = 'high';
  if (type === 'image/jpeg') { x.fillStyle = bg || '#ffffff'; x.fillRect(0, 0, c.width, c.height); }
  x.drawImage(im.src, 0, 0, c.width, c.height);
  if (draw) draw(x, c);
  return { blob: await toBlob(c, type, q), canvas: c };
}
const QOPT = { id: 'q', label: 'Quality', type: 'range', min: 40, max: 100, step: 1, value: 85, suffix: '%' };
const BGOPT = { id: 'bg', label: 'Background for transparency', type: 'color', value: '#ffffff' };

/* ---------- tool registry ---------- */
const TOOLS = {};

TOOLS.compress = root => batchTool(root, {
  zipName: 'compressed',
  options: [
    { id: 'fmt', label: 'Output format', type: 'select', value: 'image/webp', choices: [['image/webp', 'WebP (smallest)'], ['image/jpeg', 'JPG (most compatible)']] },
    { ...QOPT, value: 75 },
    { id: 'maxw', label: 'Max width (px, 0 = keep)', type: 'number', min: 0, max: 20000, step: 10, value: 0 },
    { ...BGOPT, when: o => o.fmt === 'image/jpeg' }
  ],
  async process(file, o) {
    const im = await loadImage(file); let w = im.w, h = im.h;
    if (o.maxw > 0 && w > o.maxw) { h = h * o.maxw / w; w = o.maxw; }
    const { blob } = await renderBitmap(im, { w, h, type: o.fmt, q: o.q / 100, bg: o.bg });
    return { blob, name: baseName(file.name) + '-compressed.' + EXT[o.fmt] };
  }
});

function converter(to, from) {
  return root => batchTool(root, {
    zipName: to + '-converted',
    options: [
      { ...QOPT, value: 90, when: () => to !== 'png' },
      { ...BGOPT, when: () => to === 'jpg' }
    ],
    async process(file, o) {
      const type = { jpg: 'image/jpeg', png: 'image/png', webp: 'image/webp' }[to];
      const im = await loadImage(file);
      const { blob } = await renderBitmap(im, { type, q: o.q / 100, bg: o.bg });
      return { blob, name: baseName(file.name) + '.' + to };
    }
  });
}
['png-to-jpg', 'jpg-to-png', 'webp-to-jpg', 'webp-to-png', 'jpg-to-webp', 'png-to-webp'].forEach(k => { const [a, b] = k.split('-to-'); TOOLS[k] = converter(b, a); });

TOOLS.resize = root => batchTool(root, {
  zipName: 'resized',
  options: [
    { id: 'mode', label: 'Resize by', type: 'select', value: 'width', choices: [['width', 'Width'], ['height', 'Height'], ['percent', 'Percent'], ['fit', 'Fit inside box'], ['exact', 'Exact size (stretch)']] },
    { id: 'w', label: 'Width (px)', type: 'number', min: 1, max: 20000, value: 1280, when: o => ['width', 'fit', 'exact'].includes(o.mode) },
    { id: 'h', label: 'Height (px)', type: 'number', min: 1, max: 20000, value: 720, when: o => ['height', 'fit', 'exact'].includes(o.mode) },
    { id: 'p', label: 'Scale', type: 'range', min: 5, max: 200, value: 50, suffix: '%', when: o => o.mode === 'percent' },
    { id: 'noup', label: 'Never enlarge', type: 'checkbox', value: true },
    { id: 'fmt', label: 'Format', type: 'select', value: 'keep', choices: [['keep', 'Same as original'], ['image/jpeg', 'JPG'], ['image/png', 'PNG'], ['image/webp', 'WebP']] },
    { ...QOPT, value: 90, when: o => o.fmt !== 'image/png' }
  ],
  async process(file, o) {
    const im = await loadImage(file); let w = im.w, h = im.h;
    const r = im.w / im.h;
    if (o.mode === 'width') { w = o.w; h = w / r; }
    else if (o.mode === 'height') { h = o.h; w = h * r; }
    else if (o.mode === 'percent') { w = im.w * o.p / 100; h = im.h * o.p / 100; }
    else if (o.mode === 'fit') { const s = Math.min(o.w / im.w, o.h / im.h); w = im.w * s; h = im.h * s; }
    else { w = o.w; h = o.h; }
    if (o.noup && (w > im.w || h > im.h) && o.mode !== 'exact') { w = im.w; h = im.h; }
    w = Math.max(1, Math.round(w)); h = Math.max(1, Math.round(h));
    let type = o.fmt === 'keep' ? (['image/jpeg', 'image/png', 'image/webp'].includes(file.type) ? file.type : 'image/png') : o.fmt;
    // step-down for big reductions keeps quality high
    let cur = im.src, cw = im.w, ch = im.h;
    while (cw / 2 > w && ch / 2 > h) { const c = makeCanvas(cw / 2, ch / 2); const x = c.getContext('2d'); x.imageSmoothingQuality = 'high'; x.drawImage(cur, 0, 0, c.width, c.height); cur = c; cw = c.width; ch = c.height; }
    const { blob } = await renderBitmap({ src: cur, w: cw, h: ch }, { w, h, type, q: o.q / 100 });
    return { blob, name: baseName(file.name) + '-' + w + 'x' + h + '.' + EXT[type], note: w + '×' + h + ' px' };
  }
});

TOOLS.watermark = root => batchTool(root, {
  zipName: 'watermarked',
  options: [
    { id: 'text', label: 'Watermark text', type: 'text', value: '© Your name' },
    { id: 'pos', label: 'Position', type: 'select', value: 'br', choices: [['br', 'Bottom right'], ['bl', 'Bottom left'], ['tr', 'Top right'], ['tl', 'Top left'], ['c', 'Center'], ['tile', 'Tiled (diagonal)']] },
    { id: 'size', label: 'Size', type: 'range', min: 2, max: 20, value: 5, suffix: '%' },
    { id: 'op', label: 'Opacity', type: 'range', min: 5, max: 100, value: 60, suffix: '%' },
    { id: 'col', label: 'Colour', type: 'color', value: '#ffffff' },
    { id: 'shadow', label: 'Soft shadow', type: 'checkbox', value: true },
    { id: 'fmt', label: 'Format', type: 'select', value: 'image/jpeg', choices: [['image/jpeg', 'JPG'], ['image/png', 'PNG'], ['image/webp', 'WebP']] },
    { ...QOPT, value: 92, when: o => o.fmt !== 'image/png' }
  ],
  async process(file, o) {
    const im = await loadImage(file);
    const { blob } = await renderBitmap(im, {
      type: o.fmt, q: o.q / 100,
      draw(x, c) {
        const fs = Math.max(10, Math.round(Math.min(c.width, c.height) * o.size / 100));
        x.font = '600 ' + fs + 'px "DM Sans", system-ui, sans-serif'; x.fillStyle = o.col; x.globalAlpha = o.op / 100; x.textBaseline = 'middle';
        if (o.shadow) { x.shadowColor = 'rgba(0,0,0,.55)'; x.shadowBlur = fs / 6; x.shadowOffsetY = fs / 18; }
        const t = o.text || '', m = x.measureText(t).width, pad = fs * .8;
        if (o.pos === 'tile') {
          x.save(); x.translate(c.width / 2, c.height / 2); x.rotate(-Math.PI / 6); x.textAlign = 'center';
          const stepX = m + fs * 3, stepY = fs * 3.2, R = Math.hypot(c.width, c.height);
          for (let yy = -R, r = 0; yy < R; yy += stepY, r++) for (let xx = -R + (r % 2) * stepX / 2; xx < R; xx += stepX) x.fillText(t, xx, yy);
          x.restore();
        } else {
          const L = o.pos.includes('l'), R = o.pos.includes('r'), T = o.pos.includes('t'), B = o.pos.includes('b');
          const px = o.pos === 'c' ? (c.width - m) / 2 : L ? pad : c.width - m - pad, py = o.pos === 'c' ? c.height / 2 : T ? pad + fs / 2 : c.height - pad - fs / 2;
          x.textAlign = 'left'; x.fillText(t, px, py);
        }
      }
    });
    return { blob, name: baseName(file.name) + '-watermarked.' + EXT[o.fmt] };
  }
});

TOOLS['remove-exif'] = root => {
  const infoBox = el('div', { class: 'info', style: 'display:none' });
  const t = batchTool(root, {
    zipName: 'clean',
    async process(file, o, it) {
      const isJpg = file.type === 'image/jpeg' || /\.jpe?g$/i.test(file.name);
      let rep = '';
      if (isJpg) {
        const u8 = new Uint8Array(await file.arrayBuffer()), ex = readExif(u8);
        const bits = []; if (ex.make || ex.model) bits.push('camera: ' + (ex.make + ' ' + ex.model).trim()); if (ex.date) bits.push('taken ' + ex.date); if (ex.gps) bits.push('GPS location'); if (ex.software) bits.push('software: ' + ex.software);
        rep = ex.found ? 'removed ' + (bits.join(', ') || 'metadata') : 'no EXIF found';
        if (ex.orientation > 1) { // keep the picture upright by baking rotation in
          const im = await loadImage(file); const { blob } = await renderBitmap(im, { type: 'image/jpeg', q: .95 });
          return { blob, name: baseName(file.name) + '-clean.jpg', note: rep + ' (re-encoded to keep orientation)' };
        }
        return { blob: stripJpegMeta(u8), name: baseName(file.name) + '-clean.jpg', note: rep + ' · lossless' };
      }
      const im = await loadImage(file), type = file.type === 'image/webp' ? 'image/webp' : 'image/png';
      const { blob } = await renderBitmap(im, { type, q: .95 });
      return { blob, name: baseName(file.name) + '-clean.' + EXT[type], note: 'metadata dropped by re-encoding' };
    }
  });
  return t;
};

TOOLS['image-to-pdf'] = root => {
  const files = [];
  const state = { items: files };
  const ui = optionsUI([
    { id: 'size', label: 'Page size', type: 'select', value: 'a4', choices: [['a4', 'A4'], ['letter', 'US Letter'], ['fit', 'Same as image']] },
    { id: 'margin', label: 'Margin (pt)', type: 'number', min: 0, max: 100, value: 24, when: o => o.size !== 'fit' },
    { id: 'q', label: 'JPEG quality', type: 'range', min: 50, max: 100, value: 90, suffix: '%' }
  ], () => {});
  const list = el('div', { class: 'list' }), stat = el('span', { class: 'stat' });
  const mk = el('button', { class: 'btn', type: 'button', disabled: '' }, '⬇ Create PDF');
  const clear = el('button', { class: 'btn outline', type: 'button', disabled: '' }, 'Clear');
  dropzone(root, { label: 'Drop images here or click to choose (one per page)', onFiles: fs => { fs.forEach(f => files.push(f)); draw(); } });
  root.append(ui.box, el('div', { class: 'bar' }, mk, clear, el('span', { class: 'grow' }), stat), list); privacyNote(root);
  function draw() {
    list.replaceChildren(...files.map((f, i) => {
      const th = el('img', { alt: '', src: URL.createObjectURL(f) });
      const mv = (d) => () => { const j = i + d; if (j < 0 || j >= files.length) return; [files[i], files[j]] = [files[j], files[i]]; draw(); };
      return el('div', { class: 'row' }, th, el('div', {}, el('div', { class: 'nm' }, (i + 1) + '. ' + f.name), el('div', { class: 'meta' }, fmtBytes(f.size))),
        el('div', { class: 'acts' }, el('button', { class: 'btn sm outline', type: 'button', title: 'Move up', onclick: mv(-1) }, '↑'), ' ', el('button', { class: 'btn sm outline', type: 'button', title: 'Move down', onclick: mv(1) }, '↓'), ' ',
          el('button', { class: 'btn sm outline', type: 'button', title: 'Remove', onclick: () => { files.splice(i, 1); draw(); } }, '✕')));
    }));
    mk.disabled = clear.disabled = !files.length; stat.textContent = files.length ? files.length + ' page' + (files.length > 1 ? 's' : '') : '';
  }
  clear.onclick = () => { files.length = 0; draw(); };
  mk.onclick = async () => {
    mk.disabled = true; stat.textContent = 'Building PDF…';
    try {
      const o = ui.get(), pages = [], A = { a4: [595.28, 841.89], letter: [612, 792] };
      for (const f of files) {
        const im = await loadImage(f), { blob } = await renderBitmap(im, { type: 'image/jpeg', q: o.q / 100, bg: '#ffffff' });
        const jpeg = new Uint8Array(await blob.arrayBuffer());
        let pw, ph, x, y, w, h;
        if (o.size === 'fit') { pw = w = im.w * .75; ph = h = im.h * .75; x = y = 0; }
        else {
          [pw, ph] = A[o.size]; if (im.w > im.h) [pw, ph] = [ph, pw];
          const m = Math.min(o.margin, Math.min(pw, ph) / 3), s = Math.min((pw - 2 * m) / im.w, (ph - 2 * m) / im.h);
          w = im.w * s; h = im.h * s; x = (pw - w) / 2; y = (ph - h) / 2;
        }
        pages.push({ jpeg, iw: im.w, ih: im.h, pw, ph, x, y, w, h });
      }
      const pdf = buildPdf(pages); download(pdf, 'grainroom-images.pdf'); stat.textContent = 'PDF ready · ' + fmtBytes(pdf.size);
    } catch (e) { stat.textContent = '⚠ ' + e.message; }
    mk.disabled = false;
  };
  state.build = () => mk.onclick();
  return state;
};

TOOLS.collage = root => {
  const imgs = [];
  const ui = optionsUI([
    { id: 'cols', label: 'Columns', type: 'range', min: 1, max: 6, value: 2 },
    { id: 'ratio', label: 'Cell shape', type: 'select', value: '1', choices: [['1', 'Square 1:1'], ['1.3333', 'Landscape 4:3'], ['0.75', 'Portrait 3:4'], ['1.7778', 'Wide 16:9'], ['auto', 'Original proportions']] },
    { id: 'gap', label: 'Spacing', type: 'range', min: 0, max: 60, value: 12, suffix: 'px' },
    { id: 'rad', label: 'Rounded corners', type: 'range', min: 0, max: 80, value: 0, suffix: 'px' },
    { id: 'bg', label: 'Background', type: 'color', value: '#ffffff' },
    { id: 'width', label: 'Output width', type: 'select', value: '2000', choices: [['1200', '1200 px'], ['2000', '2000 px'], ['3000', '3000 px']] },
    { id: 'fmt', label: 'Format', type: 'select', value: 'image/jpeg', choices: [['image/jpeg', 'JPG'], ['image/png', 'PNG']] }
  ], () => draw());
  const cv = makeCanvas(10, 10), wrap = el('div', { class: 'canvas-wrap' }, cv), stat = el('span', { class: 'stat' });
  const dl = el('button', { class: 'btn', type: 'button', disabled: '' }, '⬇ Download collage');
  const clear = el('button', { class: 'btn outline', type: 'button', disabled: '' }, 'Clear');
  dropzone(root, { label: 'Drop 2 or more photos here or click to choose', onFiles: async fs => { for (const f of fs) { try { imgs.push(await loadImage(f)); } catch (e) { stat.textContent = '⚠ ' + e.message; } } draw(); } });
  root.append(ui.box, el('div', { class: 'bar' }, dl, clear, el('span', { class: 'grow' }), stat), wrap); privacyNote(root);
  function draw() {
    dl.disabled = clear.disabled = !imgs.length; wrap.style.display = imgs.length ? '' : 'none';
    if (!imgs.length) { stat.textContent = ''; return; }
    const o = ui.get(), n = imgs.length, cols = Math.min(o.cols, n), rows = Math.ceil(n / cols), W = +o.width, g = o.gap;
    const cw = (W - g * (cols + 1)) / cols;
    const rh = i => o.ratio === 'auto' ? cw / imgs[i].w * imgs[i].h : cw / +o.ratio;
    const rowH = []; for (let r = 0; r < rows; r++) { let m = 0; for (let c = 0; c < cols; c++) { const i = r * cols + c; if (i < n) m = Math.max(m, rh(i)); } rowH.push(m); }
    const H = Math.round(g * (rows + 1) + rowH.reduce((a, b) => a + b, 0));
    cv.width = W; cv.height = H; const x = cv.getContext('2d'); x.imageSmoothingQuality = 'high';
    x.fillStyle = o.bg; x.fillRect(0, 0, W, H);
    let y = g;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const i = r * cols + c; if (i >= n) break; const im = imgs[i], px = g + c * (cw + g), ch = o.ratio === 'auto' ? rh(i) : rowH[r];
        const py = y + (rowH[r] - ch) / 2;
        x.save(); x.beginPath(); if (x.roundRect) x.roundRect(px, py, cw, ch, o.rad); else x.rect(px, py, cw, ch); x.clip();
        const s = Math.max(cw / im.w, ch / im.h), dw = im.w * s, dh = im.h * s; x.drawImage(im.src, px + (cw - dw) / 2, py + (ch - dh) / 2, dw, dh); x.restore();
      }
      y += rowH[r] + g;
    }
    stat.textContent = n + ' photo' + (n > 1 ? 's' : '') + ' · ' + W + '×' + H + ' px';
  }
  dl.onclick = async () => { const o = ui.get(); download(await toBlob(cv, o.fmt, .93), 'grainroom-collage.' + EXT[o.fmt]); };
  clear.onclick = () => { imgs.length = 0; draw(); };
  draw();
};

TOOLS.meme = root => {
  let im = null;
  const ui = optionsUI([
    { id: 'top', label: 'Top text', type: 'text', value: 'WHEN THE EDIT', placeholder: 'Top text' },
    { id: 'bot', label: 'Bottom text', type: 'text', value: 'FINALLY LOOKS RIGHT', placeholder: 'Bottom text' },
    { id: 'size', label: 'Text size', type: 'range', min: 4, max: 20, value: 10, suffix: '%' },
    { id: 'col', label: 'Text colour', type: 'color', value: '#ffffff' },
    { id: 'stroke', label: 'Outline colour', type: 'color', value: '#000000' },
    { id: 'upper', label: 'UPPERCASE', type: 'checkbox', value: true }
  ], () => draw());
  const cv = makeCanvas(10, 10), wrap = el('div', { class: 'canvas-wrap', style: 'display:none' }, cv), stat = el('span', { class: 'stat' });
  const dl = el('button', { class: 'btn', type: 'button', disabled: '' }, '⬇ Download meme');
  dropzone(root, { multiple: false, label: 'Drop an image here or click to choose', onFiles: async fs => { try { im = await loadImage(fs[0]); draw(); } catch (e) { stat.textContent = '⚠ ' + e.message; } } });
  root.append(ui.box, el('div', { class: 'bar' }, dl, el('span', { class: 'grow' }), stat), wrap); privacyNote(root);
  function wrapLines(x, t, maxW) { const words = t.split(/\s+/).filter(Boolean), lines = []; let cur = ''; for (const w of words) { const test = cur ? cur + ' ' + w : w; if (x.measureText(test).width > maxW && cur) { lines.push(cur); cur = w; } else cur = test; } if (cur) lines.push(cur); return lines; }
  function draw() {
    if (!im) return; wrap.style.display = ''; dl.disabled = false;
    const s = Math.min(1, 1400 / im.w); cv.width = Math.round(im.w * s); cv.height = Math.round(im.h * s);
    const o = ui.get(), x = cv.getContext('2d'); x.drawImage(im.src, 0, 0, cv.width, cv.height);
    const fs = Math.round(cv.height * o.size / 100) , maxW = cv.width * .94;
    x.font = '900 ' + fs + 'px Impact, "Arial Black", "DM Sans", sans-serif'; x.textAlign = 'center'; x.textBaseline = 'top'; x.lineJoin = 'round'; x.lineWidth = Math.max(2, fs / 7); x.fillStyle = o.col; x.strokeStyle = o.stroke;
    const place = (t, fromTop) => {
      t = o.upper ? t.toUpperCase() : t; const lines = wrapLines(x, t, maxW), lh = fs * 1.05, total = lines.length * lh;
      let y = fromTop ? cv.height * .03 : cv.height - total - cv.height * .03;
      lines.forEach(l => { x.strokeText(l, cv.width / 2, y); x.fillText(l, cv.width / 2, y); y += lh; });
    };
    if (o.top) place(o.top, true); if (o.bot) place(o.bot, false);
    stat.textContent = cv.width + '×' + cv.height + ' px';
  }
  dl.onclick = async () => download(await toBlob(cv, 'image/png'), 'grainroom-meme.png');
};

TOOLS['color-picker'] = root => {
  let im = null;
  const cv = makeCanvas(10, 10), wrap = el('div', { class: 'canvas-wrap', style: 'display:none;cursor:crosshair' }, cv);
  const live = el('div', { class: 'info' }, 'Move over the image and click to pick a colour.');
  const picked = el('div', { class: 'swatches' }), pal = el('div', { class: 'swatches' });
  dropzone(root, { multiple: false, label: 'Drop an image here or click to choose', onFiles: async fs => { im = await loadImage(fs[0]); const s = Math.min(1, 1000 / im.w); cv.width = Math.round(im.w * s); cv.height = Math.round(im.h * s); cv.getContext('2d', { willReadFrequently: true }).drawImage(im.src, 0, 0, cv.width, cv.height); wrap.style.display = ''; palette(); } });
  root.append(wrap, live, el('h3', { style: 'margin:16px 0 4px;font-size:1rem' }, 'Picked colours'), picked, el('h3', { style: 'margin:16px 0 4px;font-size:1rem' }, 'Dominant palette'), pal); privacyNote(root);
  const at = e => { const r = cv.getBoundingClientRect(), px = Math.floor((e.clientX - r.left) * cv.width / r.width), py = Math.floor((e.clientY - r.top) * cv.height / r.height); const d = cv.getContext('2d', { willReadFrequently: true }).getImageData(Math.max(0, Math.min(cv.width - 1, px)), Math.max(0, Math.min(cv.height - 1, py)), 1, 1).data; return [d[0], d[1], d[2]]; };
  const fmt = c => { const hx = rgb2hex(...c), hs = rgb2hsl(...c); return { hex: hx.toUpperCase(), rgb: 'rgb(' + c.join(', ') + ')', hsl: 'hsl(' + hs[0] + ', ' + hs[1] + '%, ' + hs[2] + '%)' }; };
  function swatch(c) {
    const f = fmt(c), n = el('div', { class: 'sw', title: 'Click to copy HEX' }, el('i', { style: 'background:' + f.hex }), el('span', {}, el('b', {}, f.hex), f.rgb, el('br'), f.hsl));
    n.onclick = () => { (navigator.clipboard ? navigator.clipboard.writeText(f.hex) : Promise.reject()).then(() => { n.querySelector('b').textContent = 'Copied!'; setTimeout(() => n.querySelector('b').textContent = f.hex, 900); }, () => { }); };
    return n;
  }
  cv.addEventListener('mousemove', e => { const f = fmt(at(e)); live.innerHTML = '<b style="display:inline-block;width:14px;height:14px;border-radius:3px;vertical-align:-2px;background:' + f.hex + '"></b> <b>' + f.hex + '</b> · ' + f.rgb + ' · ' + f.hsl; });
  cv.addEventListener('click', e => { picked.prepend(swatch(at(e))); });
  function palette() {
    const d = cv.getContext('2d', { willReadFrequently: true }).getImageData(0, 0, cv.width, cv.height).data, bk = new Map();
    for (let i = 0; i < d.length; i += 16) { if (d[i + 3] < 128) continue; const k = (d[i] >> 4) << 8 | (d[i + 1] >> 4) << 4 | d[i + 2] >> 4; const b = bk.get(k) || [0, 0, 0, 0]; b[0] += d[i]; b[1] += d[i + 1]; b[2] += d[i + 2]; b[3]++; bk.set(k, b); }
    const arr = [...bk.values()].sort((a, b) => b[3] - a[3]).map(b => [Math.round(b[0] / b[3]), Math.round(b[1] / b[3]), Math.round(b[2] / b[3])]), out = [];
    for (const c of arr) { if (out.every(o => Math.hypot(o[0] - c[0], o[1] - c[1], o[2] - c[2]) > 48)) out.push(c); if (out.length >= 8) break; }
    pal.replaceChildren(...out.map(swatch));
  }
};

window.GrainroomTools = { crc32, makeZip, buildPdf, readExif, stripJpegMeta, TOOLS };
function boot() { const r = $('#tool'); if (!r) return; const f = TOOLS[r.dataset.tool]; if (f) f(r); }
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
