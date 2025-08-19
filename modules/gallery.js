// modules/gallery.js
(function () {
  const O = window.OPUc;
  if (!O) return;

  O.log('gallery: init (swipebox → OFF)');

  // 1) If jQuery swipebox is present, neutralize to stop future inits.
  if (window.jQuery && jQuery.fn && jQuery.fn.swipebox) {
    try {
      jQuery.fn.swipebox = function () { return this; };
      O.log('gallery: neutralized jQuery.fn.swipebox');
    } catch (e) {
      O.warn('gallery: could not neutralize swipebox', e);
    }
  }

  // 2) Strip hooks and enforce direct-open behavior
  const killSwipeboxHooks = () => {
    const links = document.querySelectorAll('a.swipebox, a[rel~="swipebox"]');
    links.forEach(a => {
      a.classList.remove('swipebox');
      if (a.getAttribute('rel') === 'swipebox') a.removeAttribute('rel');

      // Remove any swipebox-bound click handlers (best-effort)
      a.onclick = null;

      // Enforce: open the href directly in a new tab
      a.target = '_blank';
    });
    O.log(`gallery: stripped swipebox hooks on ${links.length} links`);
  };

  // Initial pass + observer for dynamic content
  killSwipeboxHooks();
  const mo = new MutationObserver(() => killSwipeboxHooks());
  mo.observe(document.documentElement, { childList: true, subtree: true });

  // 3) Hide any leftover Swipebox overlay DOM if it ever appears
  const hideOverlay = () => {
    const ids = ['#swipebox-overlay', '#swipebox-slider', '#swipebox-container'];
    document.querySelectorAll(ids.join(',')).forEach(el => el.remove());
  };
  hideOverlay();
  setTimeout(hideOverlay, 300);
  setTimeout(hideOverlay, 1000);

  // 4) Bare-mode note
  document.documentElement.classList.contains('opuc-bare') && O.log('gallery: bare-mode active; using native links only');
})();
