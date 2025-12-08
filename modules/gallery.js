// modules/gallery.js
(function () {
  const O = window.OPUc; if (!O) return;
  O.log('gallery: init (virtual paging, total detection, placeholders, selection)');

  const wrap = document.querySelector('.box-wrap') || document.querySelector('#content') || document.body;
  const tiles = () => Array.from(wrap.querySelectorAll('.box, .boxtop'));
  const getCheck = (tile) => tile.querySelector('input[type="checkbox"][name="item[]"]');

  const cfg = O.getSettings();
  const perView = Number(cfg?.gallery?.target || 100); // OPUc items per view
  const delay = Number(cfg?.gallery?.delay || 500);
  const usePH = !!(cfg?.gallery?.placeholders ?? true);

  // Hide native paginations and per-page selectors (just in case one leaked here)
  document.querySelectorAll('.pagiup, .pagidown, select[name="pocet_prispevku"]').forEach(el => el.classList.add('opuc-hide-native-pager'));

  // Busy overlay
  const overlay = document.createElement('div');
  overlay.className = 'opuc-loading-overlay';
  overlay.innerHTML = `<div class="opuc-loading-text">Načítám…</div>`;
  document.body.appendChild(overlay);
  const setBusy = (on)=> overlay.classList.toggle('active', !!on);

  // Kill legacy swipebox
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

  // Placeholders for animated thumbnails
  function replaceAnimThumbs(scope=wrap){
    if (!usePH) return;
    scope.querySelectorAll('.box .inbox-wrap img.inbox[src], .boxtop .inbox-wrap img.inbox[src]').forEach(img=>{
      const src=img.getAttribute('src')||'';
      if (!/\.(gif|webp)(?:$|[?#])/i.test(src)) return;
      const ext = src.split('.').pop().split(/[?#]/)[0].toUpperCase();
      const ph=document.createElement('div'); ph.className='anim-placeholder'; ph.textContent='.'+ext;
      img.replaceWith(ph);
    });
  }

  // Helpers to work with site paging (recordStart)
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
  async function fetchPage(start) {
    const url = `https://opu.peklo.biz/?page=userpanel&recordStart=${start}`;
    try {
      const res = await fetch(url, { credentials:'include' });
      if (!res.ok) return { nodes:[], count:0 };
      const html = await res.text();
      const doc = new DOMParser().parseFromString(html, 'text/html');
      const pageWrap = doc.querySelector('.box-wrap');
      if (!pageWrap) return { nodes:[], count:0 };
      const candidates = Array.from(pageWrap.children).filter(n=> n.classList.contains('box') || n.classList.contains('boxtop'));
      return { nodes:candidates, count:candidates.length };
    } catch { return { nodes:[], count:0 }; }
  }

  // Detect site page size and total items
  async function detectTotals() {
    const curStart = getCurrentStart();
    const curPage = await fetchPage(curStart);
    const perSite = Math.max(1, curPage.count || 50);

    const maxStart = getMaxRecordStart();
    const lastPage = await fetchPage(maxStart);
    const total = (maxStart - 1) * perSite + (lastPage.count || 0);

    return { perSite, total, maxStart };
  }

  // Virtual pager UI
  function mountPager(vcur, vmax) {
    const bar = document.createElement('div');
    bar.className = 'opuc-pager';
    bar.innerHTML = `
      <button class="opuc-btn sm" data-act="first" title="První">«</button>
      <button class="opuc-btn sm" data-act="prev"  title="Předchozí">‹</button>
      <span class="opuc-pg">
        Page <input type="number" class="opuc-pg-input" min="1" max="${vmax}" value="${vcur}"> / <b class="opuc-pg-max">${vmax}</b>
      </span>
      <button class="opuc-btn sm" data-act="next"  title="Další">›</button>
      <button class="opuc-btn sm" data-act="last"  title="Poslední">»</button>
    `;
    document.body.appendChild(bar);
    return bar;
  }

  // Map virtual page -> recordStart
  function virtualToRecordStart(vpage, perSite) {
    const offset = (vpage - 1) * perView;              // item offset from 0
    const rStart = Math.floor(offset / perSite) + 1;   // 1-based recordStart
    return Math.max(1, rStart);
  }

  async function ensureFilledView(start, perSite) {
    // We are on 'start'; load successive pages until perView or end
    if (tiles().length >= perView) return;
    const maxStart = getMaxRecordStart();
    let cur = start;
    setBusy(true);
    while (tiles().length < perView && cur < maxStart) {
      const next = cur + 1;
      const { nodes } = await fetchPage(next);
      if (!nodes.length) break;
      nodes.forEach(n => wrap.appendChild(n));
      replaceAnimThumbs(wrap);
      indexTiles();
      cur = next;
      await new Promise(r=>setTimeout(r, delay));
    }
    setBusy(false);
    initSelection();
  }

  // Kick
  (async () => {
    initSelection();
    replaceAnimThumbs(wrap);

    const { perSite, total, maxStart } = await detectTotals();
    const vMax = Math.max(1, Math.ceil(total / perView));
    const curStart = getCurrentStart();
    const vCur = Math.max(1, Math.min(vMax, Math.floor(((curStart - 1) * perSite) / perView) + 1));

    // Build pager against virtual pages
    const bar = mountPager(vCur, vMax);
    const input = bar.querySelector('.opuc-pg-input');

    function gotoVirtual(page) {
      page = Math.max(1, Math.min(vMax, Number(page) || 1));
      const targetStart = virtualToRecordStart(page, perSite);
      const params = new URLSearchParams(location.search);
      params.set('page','userpanel');
      params.set('recordStart', String(targetStart));
      // hard navigation so we start from a clean DOM for that slice
      location.search = params.toString();
    }

    bar.addEventListener('click', (e)=>{
      const btn = e.target.closest('button[data-act]'); if (!btn) return;
      const act = btn.dataset.act;
      const cur = Number(input.value);
      if (act==='first') return gotoVirtual(1);
      if (act==='prev')  return gotoVirtual(cur-1);
      if (act==='next')  return gotoVirtual(cur+1);
      if (act==='last')  return gotoVirtual(vMax);
    });
    input.addEventListener('keydown', e=>{
      if (e.key === 'Enter') gotoVirtual(input.value);
      e.stopPropagation();
    });
    document.addEventListener('keydown', (e)=>{
      if (document.activeElement === input) return;
      if (e.key === 'ArrowLeft')  { e.preventDefault(); gotoVirtual(Number(input.value)-1); }
      if (e.key === 'ArrowRight') { e.preventDefault(); gotoVirtual(Number(input.value)+1); }
    });

    // Fill current view to the configured perView
    await ensureFilledView(curStart, perSite);

    // Log for sanity
    O.log(`gallery: perSite=${perSite}, total=${total}, perView=${perView}, virtual ${vCur}/${vMax}, last=${maxStart}`);
  })();
})();
