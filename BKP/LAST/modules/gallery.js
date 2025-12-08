// modules/gallery.js
(function () {
  const O = window.OPUc;
  if (!O) return;

  O.log('gallery: init (swipebox → OFF)');

  // 0) Intercept clicks early (capture) on any swipebox-marked links → open directly
  document.addEventListener('click', (e) => {
    const a = e.target && e.target.closest && e.target.closest('a.swipebox, a[rel~="swipebox"]');
    if (!a) return;
    e.preventDefault();
    e.stopPropagation();
    try { window.open(a.href, '_blank'); } catch { location.href = a.href; }
  }, true); // capture to beat delegated handlers

  // 1) If jQuery swipebox exists, neuter it; also unbind delegated handler
  if (window.jQuery && jQuery.fn) {
    try {
      if (jQuery.fn.swipebox) {
        jQuery.fn.swipebox = function () { return this; };
        O.log('gallery: neutralized jQuery.fn.swipebox');
      }
      // Best-effort: remove delegated click from document
      if (jQuery(document).off) {
        jQuery(document).off('click', '.swipebox');
        O.log('gallery: jQuery delegated .swipebox click removed');
      }
    } catch (e) { O.warn('gallery: jQuery neutralize failed', e); }
  }

  // 2) Strip hooks & enforce direct-open behavior on existing nodes
  const killSwipeboxHooks = () => {
    const links = document.querySelectorAll('a.swipebox, a[rel~="swipebox"]');
    links.forEach(a => {
      a.classList.remove('swipebox');
      if (/\bswipebox\b/.test(a.getAttribute('rel') || '')) {
        a.setAttribute('rel', (a.getAttribute('rel') || '').replace(/\bswipebox\b/g, '').trim() || null);
      }
      a.removeAttribute('onclick');
      a.target = '_blank';
    });
    if (links.length) O.log(`gallery: stripped swipebox hooks on ${links.length} links`);
  };

  killSwipeboxHooks();

  // 3) Observe dynamic gallery updates and keep stripping
  const mo = new MutationObserver(() => killSwipeboxHooks());
  mo.observe(document.documentElement, { childList: true, subtree: true });

  // 4) Remove any leftover overlay nodes if injected
  const hideOverlay = () => {
    ['#swipebox-overlay', '#swipebox-slider', '#swipebox-container']
      .forEach(sel => document.querySelector(sel)?.remove());
  };
  hideOverlay();
  setTimeout(hideOverlay, 200);
  setTimeout(hideOverlay, 800);
  setTimeout(hideOverlay, 1600);

  document.documentElement.classList.contains('opuc-bare') && O.log('gallery: bare-mode active; native link behavior');
})();
