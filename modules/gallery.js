// modules/gallery.js
(function () {
  const O = window.OPUc; if (!O) return;
  O.log('gallery: init (selection, placeholders, multi-page loader, last-page safe)');

  const wrap = document.querySelector('.box-wrap') || document.querySelector('#content') || document.body;
  const tiles = () => Array.from(wrap.querySelectorAll('.box, .boxtop'));
  const getCheck = (tile) => tile.querySelector('input[type="checkbox"][name="item[]"]');

  const cfg = O.getSettings();
  const g = { target:Number(cfg?.gallery?.target||100), delay:Number(cfg?.gallery?.delay||500), ph:!!(cfg?.gallery?.placeholders??true) };

  const overlay = document.createElement('div');
  overlay.className = 'opuc-loading-overlay';
  overlay.innerHTML = `<div class="opuc-loading-text">Načítám…</div>`;
  document.body.appendChild(overlay);
  const setBusy = (on)=> overlay.classList.toggle('active', !!on);

  // remove legacy lightbox bindings
  document.querySelectorAll('.swipebox').forEach(a=>{
    a.addEventListener('click', ev=>ev.stopImmediatePropagation(), true);
    a.classList.remove('swipebox');
  });

  // selection
  let lastIdx = -1;
  function indexTiles(){ tiles().forEach((t,i)=>t.dataset.opucIndex=i); }
  function syncTileVisual(tile){ const cb=getCheck(tile); if (!cb) return; tile.classList.toggle('selected', !!cb.checked); }
  function initSelection(){
    indexTiles();
    tiles().forEach(t=>{
      const cb=getCheck(t); if(!cb) return;
      syncTileVisual(t);
      t.addEventListener('click', (e)=>{
        if (e.target.tagName === 'A' || e.target.closest('button,input,label,select,textarea')) return;
        const cur = Number(t.dataset.opucIndex||0);
        if (e.shiftKey && lastIdx>=0){
          const a=Math.min(lastIdx,cur), b=Math.max(lastIdx,cur);
          tiles().slice(a,b+1).forEach(tt=>{ const c=getCheck(tt); if(c && !c.checked){ c.checked=true; syncTileVisual(tt); c.dispatchEvent(new Event('change',{bubbles:true})); }});
        } else {
          cb.checked=!cb.checked; syncTileVisual(t); cb.dispatchEvent(new Event('change',{bubbles:true})); lastIdx=cur;
        }
        e.preventDefault();
      }, true);
    });
    document.addEventListener('click', (e)=>{
      if (e.target.closest('.box, .boxtop')) return;
      tiles().forEach(t=>{ const c=getCheck(t); if(c && c.checked){ c.checked=false; syncTileVisual(t); c.dispatchEvent(new Event('change',{bubbles:true})); }});
      lastIdx=-1;
    });
  }

  function replaceAnimThumbs(scope=wrap){
    if (!g.ph) return;
    scope.querySelectorAll('.box .inbox-wrap img.inbox[src], .boxtop .inbox-wrap img.inbox[src]').forEach(img=>{
      const src=img.getAttribute('src')||'';
      if (!/\.(gif|webp)(?:$|[?#])/i.test(src)) return;
      const ext = src.split('.').pop().split(/[?#]/)[0].toUpperCase();
      const ph=document.createElement('div'); ph.className='anim-placeholder'; ph.textContent='.'+ext;
      img.replaceWith(ph);
    });
  }

  // discover max page from paginator
  function getMaxRecordStart() {
    let max = null;
    const pager = document.querySelectorAll('a[href*="recordStart="]');
    pager.forEach(a=>{
      const m = a.href.match(/recordStart=(\d+)/);
      if (m) { const n = Number(m[1]); if (!isNaN(n)) max = Math.max(max ?? n, n); }
    });
    // include current if present without link
    const cur = new URLSearchParams(location.search).get('recordStart');
    if (cur) max = Math.max(max ?? Number(cur), Number(cur));
    return max; // null if unknown
  }

  async function fetchPage(start) {
    const url = `https://opu.peklo.biz/?page=userpanel&recordStart=${start}`;
    try {
      const res = await fetch(url, { credentials:'include' });
      if (!res.ok) return [];
      const html = await res.text();
      const doc = new DOMParser().parseFromString(html, 'text/html');
      const pageWrap = doc.querySelector('.box-wrap');
      if (!pageWrap) return [];
      return Array.from(pageWrap.children).filter(n=> n.classList.contains('box') || n.classList.contains('boxtop'));
    } catch {
      return [];
    }
  }

  async function loadUntilTarget() {
    const haveAtStart = tiles().length;
    if (haveAtStart >= g.target) return;

    const qs = new URLSearchParams(location.search);
    let start = Number(qs.get('recordStart') || 1);

    const maxStart = getMaxRecordStart(); // may be null on some views
    let safety = 30;

    setBusy(true);
    while (tiles().length < g.target && safety-- > 0) {
      const nextStart = start + 1;
      if (maxStart != null && nextStart > maxStart) break;

      const nodes = await fetchPage(nextStart);
      if (!nodes.length) break;

      nodes.forEach(n => wrap.appendChild(n));
      replaceAnimThumbs(wrap);
      indexTiles();

      start = nextStart;
      await new Promise(r=>setTimeout(r, g.delay));
    }
    setBusy(false);

    initSelection(); // rebind after append
    const reachedEnd = (maxStart != null && start >= maxStart);
    O.log(`gallery: loaded ${tiles().length}/${g.target}${reachedEnd ? ' (last page reached)' : ''}`);
  }

  // Kick
  initSelection();
  replaceAnimThumbs(wrap);
  loadUntilTarget();
})();
