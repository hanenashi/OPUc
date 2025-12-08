// modules/uploader.js
(function () {
  const O = window.OPUc;
  if (!O) return;

  O.log('uploader: OPUc tile tools v0.3.7 (crop/resize/remove)');

  // ----- external cropper loader -----
  let cropperReady = false, cropperLoading = false;
  function ensureCropper() {
    return new Promise((resolve, reject) => {
      if (cropperReady) return resolve(true);
      if (cropperLoading) {
        const iv = setInterval(() => { if (cropperReady) { clearInterval(iv); resolve(true); } }, 50);
        return;
      }
      cropperLoading = true;
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'https://cdnjs.cloudflare.com/ajax/libs/cropperjs/1.5.13/cropper.min.css';
      const js = document.createElement('script');
      js.src = 'https://cdnjs.cloudflare.com/ajax/libs/cropperjs/1.5.13/cropper.min.js';
      js.onload = () => { cropperReady = true; resolve(true); };
      js.onerror = reject;
      document.head.appendChild(link);
      document.head.appendChild(js);
    });
  }

  // ----- find native form + input -----
  const form = document.querySelector('form[action="/"]') || document.querySelector('form');
  const fileInput = form && (form.querySelector('#obrazek') || form.querySelector('input[type="file"][name="obrazek"], input[type="file"][name="obrazek[]"]'));
  if (!form || !fileInput) { O.warn('uploader: form or file input not found'); return; }
  fileInput.multiple = true;

  // ----- State -----
  const state = {
    items: [],   // [{id, file}]
    dt: null,
    autoSync: true,
    resizeEnabled: true,
    resizeMaxPx: 2048,
    jpegQuality: 0.9,
    draggingId: null
  };
  try { state.dt = new DataTransfer(); O.log('uploader: DataTransfer available'); } catch { state.dt = null; O.warn('uploader: DataTransfer not constructible'); }

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
      <label class="opuc-toggle"><span>JPEG kvalita</span></label>
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

    <div class="opuc-note" id="opuc-compat" ${state.dt ? 'hidden' : ''}>
      DataTransfer není k dispozici — použiji přímé odeslání formuláře na pozadí. Funkce “Auto-sync” je vypnutá.
    </div>
  `;
  form.parentElement.insertBefore(host, form);

  host.querySelector('#opuc-compat').hidden = !!state.dt;

  // hide native blocks
  try {
    fileInput.closest('fieldset')?.classList.add('opuc-hide-native');
    document.getElementById('xhttp')?.classList.add('opuc-hide-native');
    document.querySelector('#xpc-ctrlv')?.classList.add('opuc-hide-native');
    document.querySelector('#dimensions-output')?.classList.add('opuc-hide-native');
  } catch {}

  // Hidden picker
  const hiddenPicker = document.createElement('input');
  hiddenPicker.type = 'file'; hiddenPicker.accept = 'image/*'; hiddenPicker.multiple = true; hiddenPicker.style.display = 'none';
  document.body.appendChild(hiddenPicker);

  // ----- elements -----
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

  if (!state.dt) { autosync.checked = false; autosync.disabled = true; }

  // ----- utils -----
  function updateCount() {
    count.textContent = `${state.items.length} ${state.items.length === 1 ? 'soubor' : 'souborů'}`;
  }
  function rebuildDataTransfer() {
    if (!state.dt) return;
    let dt; try { dt = new DataTransfer(); } catch { state.dt = null; return; }
    state.items.forEach(it => { try { dt.items.add(it.file); } catch {} });
    state.dt = dt;
    if (autosync.checked && fileInput) { try { fileInput.files = state.dt.files; } catch {} }
    updateCount();
  }

  function makeOpsBar() {
    const bar = document.createElement('div');
    bar.className = 'opuc-ops';
    bar.innerHTML = `
      <button class="opuc-icon opuc-crop"   title="Ořez (crop)">✂️</button>
      <button class="opuc-icon opuc-resize" title="Změnit velikost">🪄</button>
      <button class="opuc-icon opuc-remove" title="Odebrat">✕</button>
      <div class="opuc-fab"><span>✂️</span><span>🪄</span><span>✕</span></div>
    `;
    return bar;
  }
  function ensureOpsBars() {
    grid.querySelectorAll('.opuc-card').forEach(card => {
      if (!card.querySelector('.opuc-ops')) card.appendChild(makeOpsBar());
    });
  }

  function humanKB(b) { return (b/1024).toFixed(1) + ' kB'; }

  function cardHTML(id, url, name, sizeKB) {
    return `
      <div class="thumb"><img src="${url}" alt="${name}"></div>
      <div class="meta">
        <div class="name" title="${name}">${name}</div>
        <div class="sub"><span class="size">${sizeKB.toFixed(1)} kB</span> <span class="dims">…</span></div>
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
      card.draggable = true;
      card.innerHTML = cardHTML(id, url, file.name, file.size/1024);
      grid.appendChild(card);
      card.appendChild(makeOpsBar());

      const img = new Image();
      img.onload = () => {
        card.querySelector('.dims').textContent = `${img.naturalWidth}×${img.naturalHeight}px`;
        URL.revokeObjectURL(url);
      };
      img.src = url;

      state.items.push({ id, file });
    });

    rebuildDataTransfer();
  }

  function findItem(id) { return state.items.find(x => x.id === id); }

  function replaceFileOnCard(card, newFile) {
    const id = card.dataset.id;
    const item = findItem(id);
    if (!item) return;

    item.file = newFile;

    // refresh visuals
    const url = URL.createObjectURL(newFile);
    const img = card.querySelector('.thumb img');
    img.src = url;
    card.querySelector('.name').textContent = newFile.name;
    card.querySelector('.size').textContent = humanKB(newFile.size);
    const di = card.querySelector('.dims');
    const probe = new Image();
    probe.onload = () => { di.textContent = `${probe.naturalWidth}×${probe.naturalHeight}px`; URL.revokeObjectURL(url); };
    probe.src = url;

    rebuildDataTransfer();
  }

  function removeCard(card) {
    const id = card.dataset.id;
    const idx = state.items.findIndex(x => x.id === id);
    if (idx >= 0) state.items.splice(idx, 1);
    card.remove();
    rebuildDataTransfer();
  }

  // ----- Resize prompt -----
  function promptResize(card, file) {
    const val = prompt('Zadejte procenta (např. 50) nebo rozměry (800x600, 800x, x600):', '50');
    if (!val) return;
    const percent = /^([1-9][0-9]?|100)$/;
    const fixed = /^(\d+)[xX](\d+)$/;
    const oneSide = /^(\d+)[xX]$|^[xX](\d+)$/;

    const img = new Image();
    img.onload = async () => {
      let nw, nh;
      if (percent.test(val)) { const s = parseInt(val,10); nw = Math.round(img.naturalWidth*s/100); nh = Math.round(img.naturalHeight*s/100); }
      else if (fixed.test(val)) { const m = val.match(fixed); nw = parseInt(m[1],10); nh = parseInt(m[2],10); }
      else if (oneSide.test(val)) {
        const m = val.match(oneSide);
        if (m[1]) { nw = parseInt(m[1],10); nh = Math.round(img.naturalHeight*(nw/img.naturalWidth)); }
        else { nh = parseInt(m[2],10); nw = Math.round(img.naturalWidth*(nh/img.naturalHeight)); }
      } else { alert('Neplatný formát. Příklad: 50  |  800x600  |  800x  |  x600'); return; }

      const canvas = document.createElement('canvas'); canvas.width = Math.max(1, Math.floor(nw)); canvas.height = Math.max(1, Math.floor(nh));
      const ctx = canvas.getContext('2d'); ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      const wantJPEG = /jpe?g$/i.test(file.name) || /jpeg/.test(file.type);
      const mime = wantJPEG ? 'image/jpeg' : (file.type || 'image/png');
      const quality = wantJPEG ? (Number(inpJq.value)||0.9) : undefined;

      const blob = await new Promise(res => canvas.toBlob(res, mime, quality));
      const newName = file.name.replace(/\.(png|jpg|jpeg|webp|bmp|avif)$/i, wantJPEG ? '.jpg' : '.png');
      const nf = new File([blob], newName, { type: blob.type || mime });
      replaceFileOnCard(card, nf);
    };
    img.src = URL.createObjectURL(file);
  }

  // ----- Crop modal -----
  async function openCrop(card, file) {
    try { await ensureCropper(); } catch { alert('Cropper knihovna nelze načíst.'); return; }
    if (!window.Cropper) { alert('Cropper není k dispozici.'); return; }

    const reader = new FileReader();
    reader.onload = () => {
      const modal = document.createElement('div');
      modal.className = 'opuc-crop-modal';
      modal.innerHTML = `
        <div class="opuc-crop-content">
          <img class="opuc-crop-img" src="${reader.result}">
          <div class="opuc-crop-bar">
            <button class="opuc-btn" data-act="ok">Oříznout</button>
            <span class="opuc-flex"></span>
            <button class="opuc-btn" data-act="cancel">Zrušit</button>
          </div>
        </div>`;
      document.body.appendChild(modal);

      const img = modal.querySelector('.opuc-crop-img');
      const cropper = new window.Cropper(img, { viewMode: 1, autoCropArea: 1 });

      const close = () => { try { cropper.destroy(); } catch {} modal.remove(); };

      modal.querySelector('[data-act="cancel"]').onclick = close;
      modal.querySelector('[data-act="ok"]').onclick = async () => {
        const canvas = cropper.getCroppedCanvas();
        if (!canvas) return;
        const wantJPEG = /jpe?g$/i.test(file.name) || /jpeg/.test(file.type);
        const blob = await new Promise(res => canvas.toBlob(res, wantJPEG ? 'image/jpeg' : 'image/png', wantJPEG ? (Number(inpJq.value)||0.9) : undefined));
        const newName = file.name.replace(/\.(png|jpg|jpeg|webp|bmp|avif)$/i, wantJPEG ? '.jpg' : '.png');
        const nf = new File([blob], newName, { type: blob.type });
        replaceFileOnCard(card, nf);
        close();
      };
    };
    reader.readAsDataURL(file);
  }

  // ----- events -----
  function wireGridEvents() {
    grid.addEventListener('click', (e) => {
      const card = e.target.closest('.opuc-card'); if (!card) return;
      const item = findItem(card.dataset.id); if (!item) return;

      if (e.target.closest('.opuc-remove')) return removeCard(card);
      if (e.target.closest('.opuc-resize')) return promptResize(card, item.file);
      if (e.target.closest('.opuc-crop'))   return openCrop(card, item.file);
      // FAB overlay clicks map to the same actions
      const fab = e.target.closest('.opuc-fab'); if (fab) {
        const spans = [...fab.querySelectorAll('span')];
        if (e.target === spans[0]) return openCrop(card, item.file);
        if (e.target === spans[1]) return promptResize(card, item.file);
        if (e.target === spans[2]) return removeCard(card);
      }
    });

    grid.addEventListener('dragstart', e => {
      const card = e.target.closest('.opuc-card'); if (!card) return;
      state.draggingId = card.dataset.id; card.classList.add('dragging'); e.dataTransfer.effectAllowed = 'move';
    });
    grid.addEventListener('dragend',   e => { const c = e.target.closest('.opuc-card'); c && c.classList.remove('dragging'); state.draggingId = null; });
    grid.addEventListener('dragover',  e => {
      e.preventDefault();
      const over = e.target.closest('.opuc-card'); if (!over) return;
      const a = state.draggingId, b = over.dataset.id; if (!a || !b || a===b) return;
      const aIdx = state.items.findIndex(x => x.id === a);
      const bIdx = state.items.findIndex(x => x.id === b);
      if (aIdx<0 || bIdx<0) return;
      [state.items[aIdx], state.items[bIdx]] = [state.items[bIdx], state.items[aIdx]];
      const aNode = grid.querySelector(`.opuc-card[data-id="${a}"]`);
      const bNode = grid.querySelector(`.opuc-card[data-id="${b}"]`);
      const ref = (aNode.compareDocumentPosition(bNode) & Node.DOCUMENT_POSITION_FOLLOWING) ? bNode.nextSibling : aNode;
      grid.insertBefore(aNode, bNode);
      grid.insertBefore(bNode, ref);
      rebuildDataTransfer();
    });
  }

  // Drop / paste
  ;['dragenter','dragover'].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.add('hover'); }));
  ;['dragleave','drop'].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.remove('hover'); }));
  drop.addEventListener('drop', e => {
    const dt = e.dataTransfer;
    if (dt?.files?.length) addFiles(dt.files);
    else {
      const text = dt?.getData && dt.getData('text/plain');
      if (text) addFromTextClipboard(text);
    }
  });

  document.addEventListener('paste', e => {
    const items = e.clipboardData?.items || [];
    const imgs = [];
    for (const it of items) if (it.kind === 'file' && /^image\//i.test(it.type)) imgs.push(it.getAsFile());
    if (imgs.length) { e.preventDefault(); addFiles(imgs); return; }
    const text = e.clipboardData?.getData('text/plain');
    if (text) addFromTextClipboard(text);
  });
  host.querySelector('#opuc-paste').addEventListener('click', async () => {
    try { const text = await navigator.clipboard.readText(); if (text) await addFromTextClipboard(text); } catch {}
  });

  // URL intake
  const urlRegex = /(https?:\/\/[^\s"'<>]+?\.(?:png|jpe?g|gif|webp|bmp|avif))(?:[?#][^\s"'<>]*)?/ig;
  function extractImageUrls(text) { const s=new Set(); let m; while ((m=urlRegex.exec(text))) s.add(m[0]); return [...s]; }
  async function urlToFile(u) {
    try {
      const res = await fetch(u, { mode: 'cors' });
      if (!res.ok) throw 0;
      const blob = await res.blob();
      const ext = (blob.type.split('/')[1] || 'jpg').replace('jpeg','jpg');
      const base = (new URL(u)).pathname.split('/').pop() || `image.${ext}`;
      const name = /\./.test(base) ? base : `${base}.${ext}`;
      return new File([blob], name, { type: blob.type || 'image/jpeg' });
    } catch { return null; }
  }
  async function addFromTextClipboard(text) {
    const urls = extractImageUrls(text);
    if (!urls.length) return;
    const out = [];
    for (const u of urls) { const f = await urlToFile(u); if (f) out.push(f); }
    if (out.length) addFiles(out);
  }

  // Pre-push resize-all
  async function maybeResize(file) {
    if (!state.resizeEnabled) return file;
    const maxpx = Math.max(256, Math.min(12000, Number(inpMaxpx.value) || state.resizeMaxPx));
    const jq = Math.max(0.5, Math.min(0.99, Number(inpJq.value) || state.jpegQuality));

    const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = URL.createObjectURL(file); });
    const w=img.naturalWidth, h=img.naturalHeight, s = Math.min(1, maxpx/Math.max(w,h));
    if (s >= 1) return file;

    const cw = Math.round(w*s), ch = Math.round(h*s);
    const canvas = document.createElement('canvas'); canvas.width = cw; canvas.height = ch;
    const ctx = canvas.getContext('2d'); ctx.drawImage(img,0,0,cw,ch);

    const wantJPEG = /jpe?g$/i.test(file.name) || /jpeg/i.test(file.type);
    const mime = wantJPEG ? 'image/jpeg' : (file.type || 'image/png');
    const quality = wantJPEG ? jq : undefined;

    const blob = await new Promise(res => canvas.toBlob(res, mime, quality));
    const newName = file.name.replace(/\.(png|jpg|jpeg|webp|bmp|avif)$/i, wantJPEG ? '.jpg' : '.png');
    return new File([blob], newName, { type: blob.type || mime });
  }

  async function processAllIfNeeded() {
    const total = state.items.length; if (!total) return;
    progWrap.hidden = false; let done = 0;
    for (const it of state.items) {
      try { it.file = await maybeResize(it.file); } catch {}
      done++; const pct = Math.round((done/total)*100);
      progBar.style.width = pct + '%'; progLabel.textContent = pct + '%';
      await new Promise(r => setTimeout(r, 0));
    }
    setTimeout(() => { progWrap.hidden = true; }, 200);
  }

  async function pushAndSubmit() {
    if (!state.items.length) { O.warn('uploader: empty queue'); return; }
    await processAllIfNeeded();

    if (state.dt) {
      try {
        let dt = new DataTransfer();
        state.items.forEach(it => { try { dt.items.add(it.file); } catch {} });
        fileInput.multiple = true; fileInput.files = dt.files;
        const submit = form.querySelector('input[type="submit"], button[type="submit"], input[name^="tl_"]');
        if (submit) submit.click(); else form.submit();
      } catch (e) { O.err('uploader: push/submit failed', e); }
      return;
    }

    try {
      const fd = new FormData(form);
      fd.delete('obrazek'); fd.delete('obrazek[]'); fd.delete('url');
      for (const it of state.items) fd.append('obrazek[]', it.file, it.file.name);

      const resp = await fetch(form.action || location.href, { method: 'POST', body: fd, credentials: 'include' });
      const html = await resp.text();
      document.open(); document.write(html); document.close();
    } catch (e) {
      O.err('uploader: fetch submit failed', e);
      alert('Odeslání se nezdařilo. Zkuste to znovu nebo použijte původní formulář.');
    }
  }

  // wire UI
  hiddenPicker.addEventListener('change', e => addFiles(e.target.files));
  host.querySelector('#opuc-add').addEventListener('click', () => hiddenPicker.click());
  host.querySelector('#opuc-clear').addEventListener('click', () => { state.items = []; grid.innerHTML = ''; rebuildDataTransfer(); });
  host.querySelector('#opuc-push').addEventListener('click', pushAndSubmit);
  autosync.addEventListener('change', () => { state.autoSync = autosync.checked; if (state.autoSync) rebuildDataTransfer(); });
  inpResize.addEventListener('change', () => state.resizeEnabled = inpResize.checked);
  inpMaxpx.addEventListener('change', () => state.resizeMaxPx = Math.max(256, Math.min(12000, Number(inpMaxpx.value)||2048)));
  inpJq.addEventListener('input',  () => state.jpegQuality = Math.max(0.5, Math.min(0.99, Number(inpJq.value)||0.9)));

  fileInput.addEventListener('change', () => { if (fileInput.files?.length) { addFiles(fileInput.files); try { fileInput.value = ''; } catch {} } });

  wireGridEvents();
  // safety: if something replaced nodes, restore ops bars
  const mo = new MutationObserver(() => ensureOpsBars());
  mo.observe(grid, { childList: true, subtree: true });
  ensureOpsBars();
})();
