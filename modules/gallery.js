// modules/gallery.js
(function () {
  const O = window.OPUc; if (!O) return;
  O.log('gallery: init (selection, placeholders, multi-page loader, OPUc pager)');

  const wrap = document.querySelector('.box-wrap') || document.querySelector('#content') || document.body;
  const tiles = () => Array.from(wrap.querySelectorAll('.box, .boxtop'));
  const getCheck = (tile) => tile.querySelector('input[type="checkbox"][name="item[]"]');

  const cfg = O.getSettings();
  const g = { target:Number(cfg?.gallery?.target||100), delay:Number(cfg?.gallery?.delay||500), ph:!!(cfg?.gallery?.placeholders??true) };

  // Hide native paginations (both top and bottom)
  document.querySelectorAll('.pagiup, .pagidown').forEach(el => el.classList.add('opuc-hide-native-pager'));

  // Busy overlay
  const overlay = document.createElement('div');
  overlay.className = 'opuc-loading-overlay';
  overlay.innerHTML = `<div class="opuc-loading-text">Načítám…</div>`;
  document.body.appendChild(overlay);
  const setBusy = (on)=> overlay.classList.toggle('active', !!on);

  // Strip legacy lightbox hooks
  document.querySelectorAll('.swipebox').forEach(a=>{
    a.addEventListener('click', ev=>ev.stopImmediatePropagation(), true);
    a.classList.remove('swipebox');
  });

  // Selection
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

  // Animated thumb placeholders
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

  // Paginator helpers
  function getCurrentStart() {
    const s = new URLSearchParams(location.search).get('recordStart');
    return Number(s || 1);
  }
  function getMaxRecordStart() {
    let max = null;
    document.querySelectorAll('a[href*="recordStart="]').forEach(a=>{
      const m = a.href.match(/recordStart=(\d+)/); if (m) { const n = Number(m[1]); if (!isNaN(n)) max = Math.max(max ?? n, n); }
    });
    const cur = getCurrentStart();
    max = Math.max(max ?? cur, cur);
    return max;
  }
  function gotoStart(start) {
    start = Math.max(1, start);
    const params = new URLSearchParams(location.search);
    params.set('page','userpanel');
    params.set('recordStart', String(start));
    location.search = params.toString();
  }

  // Our floating pager
  function buildPager() {
    const cur = getCurrentStart();
    const max = getMaxRecordStart();

    const bar = document.createElement('div');
    bar.className = 'opuc-pager';
    bar.innerHTML = `
      <button class="opuc-btn sm" data-act="first" title="První">«</button>
      <button class="opuc-btn sm" data-act="prev"  title="Předchozí">‹</button>
      <span class="opuc-pg">
        Page <input type="number" class="opuc-pg-input" min="1" max="${max}" value="${cur}"> / <b class="opuc-pg-max">${max}</b>
      </span>
      <button class="opuc-btn sm" data-act="next"  title="Další">›</button>
      <button class="opuc-btn sm" data-act="last"  title="Poslední">»</button>
    `;
    document.body.appendChild(bar);

    const input = bar.querySelector('.opuc-pg-input');
    function clamp(n){ return Math.max(1, Math.min(max, Number(n)||1)); }

    bar.addEventListener('click', (e)=>{
      const btn = e.target.closest('button[data-act]'); if (!btn) return;
      const act = btn.dataset.act;
      const curNow = getCurrentStart();
      if (act==='first') return gotoStart(1);
      if (act==='prev')  return gotoStart(curNow>1 ? curNow-1 : 1);
      if (act==='next')  return gotoStart(curNow<max ? curNow+1 : max);
      if (act==='last')  return gotoStart(max);
    });

    input.addEventListener('keydown', e=>{
      if (e.key === 'Enter') gotoStart(clamp(input.value));
      e.stopPropagation(); // avoid arrow keys triggering global handlers while focused
    });

    // Keyboard quick-nav if input not focused
    document.addEventListener('keydown', (e)=>{
      if (document.activeElement === input) return;
      if (e.key === 'ArrowLeft')  { e.preventDefault(); gotoStart(getCurrentStart()>1 ? getCurrentStart()-1 : 1); }
      if (e.key === 'ArrowRight') { e.preventDefault(); gotoStart(getCurrentStart()<max ? getCurrentStart()+1 : max); }
    });
  }

  // Fetch helper (used by auto-load-to-target)
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
    } catch { return []; }
  }

  async function loadUntilTarget() {
    if (tiles().length >= g.target) return;

    let start = getCurrentStart();
    const maxStart = getMaxRecordStart();
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
  buildPager();
})();
