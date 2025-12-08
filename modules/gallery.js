// modules/gallery.js
(function () {
  const O = window.OPUc; if (!O) return;
  O.log('gallery: init (selection, placeholders, multi-page loader)');

  // Host elements
  const wrap = document.querySelector('.box-wrap') || document.querySelector('#content') || document.body;
  const tiles = () => Array.from(wrap.querySelectorAll('.box, .boxtop'));
  const getCheck = (tile) => tile.querySelector('input[type="checkbox"][name="item[]"]');

  // Settings
  const cfg = O.getSettings();
  const g = { target:  Number(cfg?.gallery?.target || 100),
              delay:   Number(cfg?.gallery?.delay  || 500),
              ph:     !!(cfg?.gallery?.placeholders ?? true) };

  // Loading overlay
  const overlay = document.createElement('div');
  overlay.className = 'opuc-loading-overlay';
  overlay.innerHTML = `<div class="opuc-loading-text">Načítám…</div>`;
  document.body.appendChild(overlay);
  function setBusy(on){ overlay.classList.toggle('active', !!on); }

  // Remove legacy lightbox handlers if present
  document.querySelectorAll('.swipebox').forEach(a => {
    a.addEventListener('click', (ev)=>{ ev.stopImmediatePropagation(); }, true);
    a.classList.remove('swipebox');
  });

  // Selection (click to toggle, Shift-click range)
  let lastIdx = -1;
  function indexTiles() { tiles().forEach((t,i)=>t.dataset.opucIndex=i); }
  function syncTileVisual(tile) {
    const cb = getCheck(tile); if (!cb) return;
    tile.classList.toggle('selected', !!cb.checked);
  }
  function initSelection() {
    indexTiles();
    tiles().forEach(t=>{
      const cb = getCheck(t); if (!cb) return;
      syncTileVisual(t);
      // one-click anywhere on the tile
      t.addEventListener('click', (e)=>{
        if (e.target.tagName === 'A' || e.target.closest('button,input,label,select,textarea')) return;
        const cur = Number(t.dataset.opucIndex||0);
        if (e.shiftKey && lastIdx>=0) {
          const a = Math.min(lastIdx,cur), b = Math.max(lastIdx,cur);
          tiles().slice(a,b+1).forEach(tt => { const c = getCheck(tt); if (c && !c.checked){ c.checked = true; syncTileVisual(tt); c.dispatchEvent(new Event('change',{bubbles:true})); }});
        } else {
          cb.checked = !cb.checked; syncTileVisual(t);
          cb.dispatchEvent(new Event('change',{bubbles:true}));
          lastIdx = cur;
        }
        e.preventDefault();
      }, true);
    });
    // Deselect on outside click
    document.addEventListener('click', (e)=>{
      if (e.target.closest('.box, .boxtop')) return;
      tiles().forEach(t=>{ const c=getCheck(t); if (c && c.checked){ c.checked=false; syncTileVisual(t); c.dispatchEvent(new Event('change',{bubbles:true})); }});
      lastIdx = -1;
    });
  }

  // Animated thumbnail placeholder
  function replaceAnimThumbs(scope=wrap) {
    if (!g.ph) return;
    scope.querySelectorAll('.box .inbox-wrap img.inbox[src], .boxtop .inbox-wrap img.inbox[src]').forEach(img=>{
      const src = img.getAttribute('src') || '';
      const isAnim = /\.(gif|webp)(?:$|\?|\#)/i.test(src);
      if (!isAnim) return;
      const ext = src.split('.').pop().split(/[?#]/)[0].toUpperCase();
      const ph = document.createElement('div');
      ph.className = 'anim-placeholder';
      ph.textContent = `.${ext}`;
      img.replaceWith(ph);
    });
  }

  // Multi-page loader to reach target count
  async function fetchPage(start) {
    const url = `https://opu.peklo.biz/?page=userpanel&recordStart=${start}`;
    const res = await fetch(url, { credentials:'include' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const html = await res.text();
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const pageWrap = doc.querySelector('.box-wrap');
    const candidates = pageWrap ? Array.from(pageWrap.children).filter(n=> n.classList.contains('box') || n.classList.contains('boxtop')) : [];
    return candidates;
  }

  async function loadUntilTarget() {
    const have = tiles().length;
    if (have >= g.target) return;

    setBusy(true);
    // figure out current recordStart (default 1)
    const qs = new URLSearchParams(location.search);
    let start = Number(qs.get('recordStart') || 1);
    // conservative safety upper bound for pages
    let safety = 12;

    while (tiles().length < g.target && safety-- > 0) {
      try {
        const next = await fetchPage(++start);
        if (!next.length) break;
        next.forEach(n => wrap.appendChild(n));
        // post-process new nodes
        replaceAnimThumbs(wrap);
        indexTiles();
        await new Promise(r=>setTimeout(r, g.delay));
      } catch {
        break;
      }
    }
    setBusy(false);
    initSelection(); // rebind on appended tiles
  }

  // Kick
  initSelection();
  replaceAnimThumbs(wrap);
  loadUntilTarget().then(()=> O.log(`gallery: loaded ${tiles().length}/${g.target}`));
})();
