// modules/uploader.js
(function () {
  const O = window.OPUc;
  if (!O) return;

  O.log('uploader: init OPUh phase-3 (hide native, URL paste, push→submit)');

  // ----- DOM anchors -----
  const form = document.querySelector('form[action="/"]') || document.querySelector('form');
  const fileInput = form && (form.querySelector('#obrazek') || form.querySelector('input[type="file"][name="obrazek"]'));
  if (!form || !fileInput) {
    O.warn('uploader: form or file input not found; aborting');
    return;
  }
  fileInput.multiple = true;

  // Try to locate any "URL re-upload" input so we can ignore/hide it
  const urlInput = form.querySelector('input[type="text"][name*="url"], input[type="url"], input[name="tl_reupload"]');

  // ----- State -----
  const state = {
    items: [],             // [{id, file, url, w, h, processed:false}]
    dt: null,              // DataTransfer or null
    autoSync: true,        // keep input.files in sync
    resizeEnabled: true,   // global resize toggle
    resizeMaxPx: 2048,     // max width/height
    jpegQuality: 0.9,      // 0..1 for JPEG
    draggingId: null
  };

  // Safe DataTransfer construction
  try { state.dt = new DataTransfer(); O.log('uploader: DataTransfer available'); }
  catch { state.dt = null; O.warn('uploader: DataTransfer not constructible; auto-sync/push disabled'); }

  // ----- UI scaffold -----
  const host = document.createElement('section');
  host.className = 'opuc-up';
  host.innerHTML = `
    <div class="opuc-up-bar">
      <button type="button" class="opuc-btn" id="opuc-add">Přidat soubory</button>
      <button type="button" class="opuc-btn" id="opuc-paste">Vložit z&nbsp;clipboardu</button>
      <span class="opuc-sep"></span>

      <label class="opuc-toggle">
        <input type="checkbox" id="opuc-resize" checked>
        <span>Zmenšit na max (px)</span>
      </label>
      <input type="number" id="opuc-maxpx" class="opuc-input" min="256" max="12000" value="2048" step="64" />
      <label class="opuc-toggle">
        <span>JPEG kvalita</span>
      </label>
      <input type="range" id="opuc-jq" min="0.6" max="0.98" step="0.01" value="0.90" />

      <span class="opuc-sep"></span>
      <button type="button" class="opuc-btn" id="opuc-push">Poslat a odeslat</button>
      <label class="opuc-toggle">
        <input type="checkbox" id="opuc-autosync" checked>
        <span>Auto-sync</span>
      </label>

      <span class="opuc-flex"></span>
      <span class="opuc-count" id="opuc-count">0 souborů</span>
      <button type="button" class="opuc-btn danger" id="opuc-clear">Vyčistit frontu</button>
    </div>

    <div class="opuc-drop" id="opuc-drop">
      <b>Přetáhněte obrázky sem</b> nebo vložte z&nbsp;clipboardu (Ctrl/Cmd+V) — umíme i URL adresy obrázků
    </div>

    <div class="opuc-progress" id="opuc-progress" hidden>
      <div class="bar" id="opuc-bar" style="width:0%"></div>
      <div class="label" id="opuc-plabel">0%</div>
    </div>

    <div class="opuc-grid" id="opuc-grid"></div>

    <div class="opuc-note" id="opuc-compat" hidden>
      Váš prohlížeč nepodporuje DataTransfer. Ponechávám původní formulář viditelný — použijte prosím jeho výběr souborů.
    </div>
  `;
  form.parentElement.insertBefore(host, form);

  // Hide native form (but keep for submit) only if DataTransfer works
  if (state.dt) {
    form.classList.add('opuc-native-form-hidden');
  } else {
    host.querySelector('#opuc-compat').hidden = false;
  }

  // Hidden picker
  const hiddenPicker = document.createElement('input');
  hiddenPicker.type = 'file';
  hiddenPicker.accept = 'image/*';
  hiddenPicker.multiple = true;
  hiddenPicker.style.display = 'none';
  document.body.appendChild(hiddenPicker);

  // ----- Elements -----
  const grid = host.querySelector('#opuc-grid');
  const drop = host.querySelector('#opuc-drop');
  const autosync = host.querySelector('#opuc-autosync');
  const count = host.querySelector('#opuc-count');
  const btnPush = host.querySelector('#opuc-push');
  const btnPaste = host.querySelector('#opuc-paste');
  const progWrap = host.querySelector('#opuc-progress');
  const progBar = host.querySelector('#opuc-bar');
  const progLabel = host.querySelector('#opuc-plabel');

  const inpResize = host.querySelector('#opuc-resize');
  const inpMaxpx  = host.querySelector('#opuc-maxpx');
  const inpJq     = host.querySelector('#opuc-jq');

  // Disable push/auto-sync if DataTransfer unsupported
  if (!state.dt) {
    autosync.checked = false;
    autosync.disabled = true;
    btnPush.disabled = true;
    btnPush.title = 'DataTransfer není k dispozici – použijte původní formulář';
  }

  // Hide obvious native controls if present
  try {
    fileInput.closest('div, .uspas, .uspasfile')?.classList?.add('opuc-hide-native');
    urlInput?.closest('div, .uspas, .uspasurl')?.classList?.add('opuc-hide-native');
  } catch {}

  // ----- Helpers -----
  function updateCount() {
    count.textContent = `${state.items.length} ${state.items.length === 1 ? 'soubor' : 'souborů'}`;
  }

  function rebuildDataTransfer() {
    if (!state.dt) return;
    try { state.dt = new DataTransfer(); } catch { state.dt = null; }
    if (!state.dt) return;
    state.items.forEach(it => { try { state.dt.items.add(it.file); } catch {} });
    if (autosync.checked && fileInput) {
      try { fileInput.files = state.dt.files; } catch (e) { O.warn('uploader: cannot assign input.files', e); }
    }
    updateCount();
  }

  function cardHTML(id, url, name, sizeKB) {
    return `
      <div class="thumb"><img src="${url}" alt="${name}"></div>
      <div class="meta">
        <div class="name" title="${name}">${name}</div>
        <div class="sub"><span class="size">${sizeKB.toFixed(1)} kB</span> <span class="dims">…</span></div>
      </div>
      <div class="ops">
        <button class="opuc-icon remove" title="Odebrat">✕</button>
      </div>
    `;
  }

  function addFiles(list) {
    const files = Array.from(list || []).filter(f => f && /^image\//i.test(f.type));
    if (!files.length) return;

    files.forEach(file => {
      const id = `${Date.now()}_${Math.random().toString(36).slice(2,8)}`;
      const url = URL.createObjectURL(file);
      const card = document.createElement('div');
      card.className = 'opuc-card';
      card.dataset.id = id;
      card.draggable = true; // drag reorder
      card.innerHTML = cardHTML(id, url, file.name, file.size/1024);
      grid.appendChild(card);

      // Load dimensions
      const img = new Image();
      img.onload = () => { card.querySelector('.dims').textContent = `${img.naturalWidth}×${img.naturalHeight}px`; };
      img.src = url;

      state.items.push({ id, file, url, processed: false });
    });

    rebuildDataTransfer();
  }

  function removeById(id) {
    const idx = state.items.findIndex(x => x.id === id);
    if (idx >= 0) {
      URL.revokeObjectURL(state.items[idx].url);
      state.items.splice(idx, 1);
      grid.querySelector(`.opuc-card[data-id="${id}"]`)?.remove();
      rebuildDataTransfer();
    }
  }

  function swapByIds(aId, bId) {
    if (aId === bId) return;
    const a = state.items.findIndex(x => x.id === aId);
    const b = state.items.findIndex(x => x.id === bId);
    if (a < 0 || b < 0) return;
    const tmp = state.items[a]; state.items[a] = state.items[b]; state.items[b] = tmp;

    const aNode = grid.querySelector(`.opuc-card[data-id="${aId}"]`);
    const bNode = grid.querySelector(`.opuc-card[data-id="${bId}"]`);
    if (aNode && bNode) {
      const aNext = aNode.nextSibling, bNext = bNode.nextSibling;
      grid.insertBefore(aNode, bNext);
      grid.insertBefore(bNode, aNext);
    }
    rebuildDataTransfer();
  }

  function clearAll() {
    state.items.forEach(it => URL.revokeObjectURL(it.url));
    state.items = [];
    grid.innerHTML = '';
    rebuildDataTransfer();
  }

  // --- URL → File helpers ---
  const urlRegex = /(https?:\/\/[^\s"'<>]+?\.(?:png|jpe?g|gif|webp|bmp|avif))(?:[?#][^\s"'<>]*)?/ig;

  function extractImageUrls(text) {
    const found = new Set();
    let m; while ((m = urlRegex.exec(text))) found.add(m[0]);
    return Array.from(found);
  }

  async function urlToFile(u) {
    try {
      const res = await fetch(u, { mode: 'cors' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const blob = await res.blob();
      const extFromCT = (blob.type.split('/')[1] || 'jpg').replace('jpeg','jpg');
      const urlObj = new URL(u);
      const base = urlObj.pathname.split('/').pop() || `image.${extFromCT}`;
      const name = /\./.test(base) ? base : `${base}.${extFromCT}`;
      return new File([blob], name, { type: blob.type || 'image/jpeg' });
    } catch (e) {
      O.warn('uploader: fetch URL blocked (CORS?) →', u, e);
      return null;
    }
  }

  async function addFromTextClipboard(text) {
    const urls = extractImageUrls(text);
    if (!urls.length) { O.warn('uploader: clipboard text has no image URLs'); return; }
    O.log(`uploader: URLs detected → ${urls.length}`);

    const files = [];
    for (const u of urls) {
      const f = await urlToFile(u);
      if (f) files.push(f);
    }
    if (files.length) addFiles(files);
  }

  // Resize utility (returns new File or original)
  async function maybeResize(file) {
    const maxpx = Math.max(256, Math.min(12000, Number(inpMaxpx.value) || state.resizeMaxPx));
    const jq = Math.max(0.5, Math.min(0.99, Number(inpJq.value) || state.jpegQuality));

    const img = await new Promise((res, rej) => {
      const i = new Image();
      i.onload = () => res(i);
      i.onerror = rej;
      i.src = URL.createObjectURL(file);
    });

    const { naturalWidth: w, naturalHeight: h } = img;
    const scale = state.resizeEnabled ? Math.min(1, maxpx / Math.max(w, h)) : 1;
    if (scale >= 1) return file;

    const cw = Math.round(w * scale);
    const ch = Math.round(h * scale);
    const canvas = document.createElement('canvas');
    canvas.width = cw; canvas.height = ch;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0, cw, ch);

    const wantJPEG = /jpe?g$/i.test(file.name) || /jpeg/i.test(file.type);
    const mime = wantJPEG ? 'image/jpeg' : (file.type || 'image/png');
    const quality = wantJPEG ? jq : undefined;

    const blob = await new Promise(res => canvas.toBlob(res, mime, quality));
    const newName = file.name.replace(/\.(png|jpg|jpeg|webp|bmp|avif)$/i, wantJPEG ? '.jpg' : '.$1');
    return new File([blob], newName, { type: blob.type });
  }

  async function processAllIfNeeded() {
    const total = state.items.length;
    if (!total) return;

    progWrap.hidden = false;
    let done = 0;

    for (const it of state.items) {
      try {
        const nf = await maybeResize(it.file);
        if (nf !== it.file) {
          it.file = nf;
          const card = grid.querySelector(`.opuc-card[data-id="${it.id}"]`);
          card.querySelector('.size').textContent = `${(nf.size/1024).toFixed(1)} kB`;
          card.querySelector('.dims').textContent = '↻';
        }
      } catch (e) {
        O.warn('uploader: resize failed for one file', e);
      }
      done++;
      const pct = Math.round((done / total) * 100);
      progBar.style.width = pct + '%';
      progLabel.textContent = pct + '%';
      await new Promise(r => setTimeout(r, 0));
    }
    setTimeout(() => { progWrap.hidden = true; }, 200);
  }

  async function pushAndSubmit() {
    if (!state.items.length) { O.warn('uploader: empty queue'); return; }
    if (!state.dt) { O.warn('uploader: DataTransfer unsupported; cannot push'); return; }

    await processAllIfNeeded();

    try {
      state.dt = new DataTransfer();
      state.items.forEach(it => { try { state.dt.items.add(it.file); } catch {} });
      fileInput.multiple = true;
      fileInput.files = state.dt.files;
      O.log(`uploader: pushed ${state.items.length} file(s) → submitting form`);
      const submit = form.querySelector('input[type="submit"], button[type="submit"], input[name^="tl_"]');
      if (submit) submit.click();
      else form.submit();
    } catch (e) {
      O.err('uploader: failed to push/submit', e);
    }
  }

  // ----- Events -----
  hiddenPicker.addEventListener('change', e => addFiles(e.target.files));
  host.querySelector('#opuc-add').addEventListener('click', () => hiddenPicker.click());

  ;['dragenter','dragover'].forEach(ev =>
    drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.add('hover'); })
  );
  ;['dragleave','drop'].forEach(ev =>
    drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.remove('hover'); })
  );
  drop.addEventListener('drop', e => {
    const dt = e.dataTransfer;
    if (dt && dt.files && dt.files.length) addFiles(dt.files);
    else if (dt && dt.getData) {
      const text = dt.getData('text/plain'); if (text) addFromTextClipboard(text);
    }
  });

  document.addEventListener('paste', e => {
    const items = e.clipboardData && e.clipboardData.items || [];
    const imgs = [];
    for (const it of items) if (it.kind === 'file' && /^image\//i.test(it.type)) imgs.push(it.getAsFile());
    if (imgs.length) {
      O.log(`uploader: paste → ${imgs.length} image(s)`);
      addFiles(imgs);
    } else {
      const text = e.clipboardData?.getData('text/plain');
      if (text) addFromTextClipboard(text);
    }
  });

  // Paste button (mobile-friendly): requires user gesture to read clipboard
  btnPaste.addEventListener('click', async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) await addFromTextClipboard(text);
      else O.warn('uploader: clipboard is empty');
    } catch (e) {
      O.warn('uploader: clipboard readText failed (permission?)', e);
    }
  });

  // Card ops
  grid.addEventListener('click', e => {
    const btn = e.target.closest('button.opuc-icon.remove');
    if (!btn) return;
    const card = e.target.closest('.opuc-card');
    removeById(card.dataset.id);
  });

  // Drag to reorder
  grid.addEventListener('dragstart', e => {
    const card = e.target.closest('.opuc-card'); if (!card) return;
    state.draggingId = card.dataset.id;
    card.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
  });
  grid.addEventListener('dragend', e => {
    const card = e.target.closest('.opuc-card'); if (card) card.classList.remove('dragging');
    state.draggingId = null;
  });
  grid.addEventListener('dragover', e => {
    e.preventDefault();
    const over = e.target.closest('.opuc-card'); if (!over) return;
    const dragId = state.draggingId; if (!dragId) return;
    const overId = over.dataset.id;
    if (dragId !== overId) swapByIds(dragId, overId);
  });

  // Toolbar
  host.querySelector('#opuc-clear').addEventListener('click', clearAll);
  host.querySelector('#opuc-push').addEventListener('click', pushAndSubmit);
  autosync.addEventListener('change', () => {
    state.autoSync = autosync.checked;
    if (state.autoSync) rebuildDataTransfer();
  });

  inpResize.addEventListener('change', () => state.resizeEnabled = inpResize.checked);
  inpMaxpx.addEventListener('change', () => state.resizeMaxPx = Math.max(256, Math.min(12000, Number(inpMaxpx.value)||2048)));
  inpJq.addEventListener('input',  () => state.jpegQuality = Math.max(0.5, Math.min(0.99, Number(inpJq.value)||0.9)));

  // If the user uses the original input, import its files into our queue (if visible)
  fileInput.addEventListener('change', () => {
    if (fileInput.files && fileInput.files.length) {
      O.log(`uploader: importing ${fileInput.files.length} file(s) from native input`);
      addFiles(fileInput.files);
      try { fileInput.value = ''; } catch {}
    }
  });

  updateCount();
})();
