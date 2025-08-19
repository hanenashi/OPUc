// modules/uploader.js
(function () {
  const O = window.OPUc;
  if (!O) return;

  O.log('uploader: init OPUh phase-1 (drop/paste → queue → push to form)');

  // ----- DOM anchors -----
  const form = document.querySelector('form[action="/"]') || document.querySelector('form');
  const fileInput = form && (form.querySelector('#obrazek') || form.querySelector('input[type="file"][name="obrazek"]'));
  if (!form || !fileInput) {
    O.warn('uploader: form or file input not found; aborting');
    return;
  }

  // Ensure multi if supported (server will ignore extras for anon single-upload)
  fileInput.multiple = true;

  // ----- State -----
  const state = {
    items: [],          // [{id, file, url, w, h}]
    dt: new (window.DataTransfer || window.ClipboardEvent || function(){})().constructor?.() || null,
    autoSync: true,     // keep form.files in sync with queue
  };

  // Fallback if DataTransfer constructor not directly available
  try {
    if (!state.dt || typeof state.dt.items === 'undefined') {
      state.dt = new DataTransfer();
    }
  } catch { state.dt = null; }

  // ----- UI scaffold -----
  const host = document.createElement('section');
  host.className = 'opuc-up';
  host.innerHTML = `
    <div class="opuc-up-bar">
      <button type="button" class="opuc-btn" id="opuc-add">Přidat soubory</button>
      <span class="opuc-sep"></span>
      <button type="button" class="opuc-btn" id="opuc-push">Poslat do formuláře</button>
      <label class="opuc-toggle">
        <input type="checkbox" id="opuc-autosync" checked>
        <span>Auto-sync</span>
      </label>
      <span class="opuc-count" id="opuc-count">0 souborů</span>
      <span class="opuc-flex"></span>
      <button type="button" class="opuc-btn danger" id="opuc-clear">Vyčistit frontu</button>
    </div>
    <div class="opuc-drop" id="opuc-drop">
      <b>Přetáhněte obrázky sem</b> nebo je vložte z&nbsp;clipboardu (Ctrl/Cmd+V)
    </div>
    <div class="opuc-grid" id="opuc-grid"></div>
  `;

  // Place above the native upload controls
  form.parentElement.insertBefore(host, form);

  // Hidden real "select files" input (uses accept=image/*, multiple)
  const hiddenPicker = document.createElement('input');
  hiddenPicker.type = 'file';
  hiddenPicker.accept = 'image/*';
  hiddenPicker.multiple = true;
  hiddenPicker.style.display = 'none';
  document.body.appendChild(hiddenPicker);

  // ----- Helpers -----
  const grid = host.querySelector('#opuc-grid');
  const drop = host.querySelector('#opuc-drop');
  const autosync = host.querySelector('#opuc-autosync');
  const count = host.querySelector('#opuc-count');

  function updateCount() {
    count.textContent = `${state.items.length} ${state.items.length === 1 ? 'soubor' : 'souborů'}`;
  }

  function rebuildDataTransfer() {
    if (!state.dt) return;
    // Clear by new instance (safer than items.clear() in some browsers)
    try { state.dt = new DataTransfer(); } catch { state.dt = null; }
    if (!state.dt) return;
    state.items.forEach(it => {
      try { state.dt.items.add(it.file); } catch {}
    });
    if (autosync.checked && fileInput) {
      try {
        fileInput.files = state.dt.files;
      } catch (e) {
        O.warn('uploader: cannot assign fileInput.files', e);
      }
    }
    updateCount();
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
      card.innerHTML = `
        <div class="thumb"><img src="${url}" alt="${file.name}"></div>
        <div class="meta">
          <div class="name" title="${file.name}">${file.name}</div>
          <div class="sub"><span class="size">${(file.size/1024).toFixed(1)} kB</span> <span class="dims">…</span></div>
        </div>
        <div class="ops">
          <button class="opuc-icon up"    title="Nahoru">▲</button>
          <button class="opuc-icon down"  title="Dolů">▼</button>
          <button class="opuc-icon remove" title="Odebrat">✕</button>
        </div>
      `;
      grid.appendChild(card);

      // Load dimensions
      const img = new Image();
      img.onload = () => {
        const d = `${img.naturalWidth}×${img.naturalHeight}px`;
        card.querySelector('.dims').textContent = d;
      };
      img.src = url;

      state.items.push({ id, file, url });
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

  function move(id, dir) {
    const i = state.items.findIndex(x => x.id === id);
    if (i < 0) return;
    const j = dir === -1 ? i - 1 : i + 1;
    if (j < 0 || j >= state.items.length) return;
    const [it] = state.items.splice(i, 1);
    state.items.splice(j, 0, it);

    const node = grid.querySelector(`.opuc-card[data-id="${id}"]`);
    if (dir === -1) grid.insertBefore(node, node.previousElementSibling);
    else grid.insertBefore(node.nextElementSibling, node);
    rebuildDataTransfer();
  }

  function clearAll() {
    state.items.forEach(it => URL.revokeObjectURL(it.url));
    state.items = [];
    grid.innerHTML = '';
    rebuildDataTransfer();
  }

  function pushToForm() {
    if (!state.items.length) { O.warn('uploader: pushToForm with empty queue'); return; }
    if (!state.dt) {
      O.warn('uploader: DataTransfer unsupported; cannot auto-sync. Select files via native dialog.');
      return;
    }
    try {
      fileInput.multiple = true;
      fileInput.files = state.dt.files;
      O.log(`uploader: pushed ${state.items.length} file(s) to native input`);
      // focus native submit button if present
      const submit = form.querySelector('input[type="submit"], button[type="submit"], input[name^="tl_"]');
      submit?.focus();
    } catch (e) {
      O.err('uploader: failed to push to form', e);
    }
  }

  // ----- Events -----
  // Import files selected via the native picker
  hiddenPicker.addEventListener('change', e => addFiles(e.target.files));

  // Big "Add files" button
  host.querySelector('#opuc-add').addEventListener('click', () => hiddenPicker.click());

  // Dropzone
  ;['dragenter','dragover'].forEach(ev =>
    drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.add('hover'); })
  );
  ;['dragleave','drop'].forEach(ev =>
    drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.remove('hover'); })
  );
  drop.addEventListener('drop', e => addFiles(e.dataTransfer.files));

  // Paste images from clipboard
  document.addEventListener('paste', e => {
    const items = e.clipboardData && e.clipboardData.items || [];
    const imgs = [];
    for (const it of items) if (it.kind === 'file' && /^image\//i.test(it.type)) imgs.push(it.getAsFile());
    if (imgs.length) {
      O.log(`uploader: paste → ${imgs.length} image(s)`);
      addFiles(imgs);
    }
  });

  // Card buttons
  grid.addEventListener('click', e => {
    const btn = e.target.closest('button.opuc-icon');
    if (!btn) return;
    const card = e.target.closest('.opuc-card');
    const id = card?.dataset.id;
    if (!id) return;
    if (btn.classList.contains('remove')) removeById(id);
    if (btn.classList.contains('up')) move(id, -1);
    if (btn.classList.contains('down')) move(id, +1);
  });

  // Toolbar
  host.querySelector('#opuc-clear').addEventListener('click', clearAll);
  autosync.addEventListener('change', () => {
    state.autoSync = autosync.checked;
    if (state.autoSync) rebuildDataTransfer();
  });
  host.querySelector('#opuc-push').addEventListener('click', pushToForm);

  // If user selects something in the original input, import it into our queue (so we stay in sync)
  fileInput.addEventListener('change', () => {
    if (fileInput.files && fileInput.files.length) {
      O.log(`uploader: importing ${fileInput.files.length} file(s) from native input`);
      addFiles(fileInput.files);
      // Clear native input to avoid duplicate double-submit
      try { fileInput.value = ''; } catch {}
    }
  });

  updateCount();
})();
