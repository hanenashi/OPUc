// modules/router.js
(function () {
  const O = window.OPUc;
  if (!O) return console.error('[OPUc] utils not present');

  const r = O.route.name();
  console.groupCollapsed(`[OPUc] Router -> ${r}`);
  O.time('router:enter');

  // Later we’ll conditionally load modules here (uploader/gallery/settings…)
  // For now we just log what we WOULD load.
  if (r === 'uploader') {
    O.log('Would load: modules/uploader.js + css/uploader.css');
  } else if (r === 'gallery') {
    O.log('Would load: modules/gallery.js + css/gallery.css');
  } else if (r === 'settings') {
    O.log('Would load: modules/settings.js + css/settings.css');
  } else if (r === 'relace') {
    O.log('Would load: modules/relace.js');
  } else if (r === 'faq') {
    O.log('Would load: modules/faq.js');
  } else {
    O.warn('Unknown route; no modules loaded');
  }

  O.time('router:exit');
  console.groupEnd();
})();
