// modules/router.js
(function () {
  const O = window.OPUc;
  if (!O) return console.error('[OPUc] utils not present');

  const DEV_BASE = 'https://raw.githubusercontent.com/hanenashi/OPUc/main/';

  async function loadText(path) {
    const url = DEV_BASE + path + `?v=${Date.now()}`;
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) throw new Error(`Fetch failed: ${url} [${res.status}]`);
    return await res.text();
  }
  async function loadCSS(path) {
    const css = await loadText(path);
    const el = document.createElement('style');
    el.setAttribute('data-opuc', path);
    el.textContent = css;
    document.head.appendChild(el);
    return el;
  }
  async function loadJS(path) {
    const js = await loadText(path);
    (0, eval)(js);
  }

  const route = O.route.name();
  console.groupCollapsed(`[OPUc] Router -> ${route}`);
  O.time('router:enter');

  const tasks = [];
  if (route === 'uploader') {
    tasks.push(loadCSS('css/uploader.css'), loadJS('modules/uploader.js'));
  } else if (route === 'gallery') {
    tasks.push(loadCSS('css/gallery.css'), loadJS('modules/gallery.js'));
  } else if (route === 'settings') {
    tasks.push(loadCSS('css/settings.css'), loadJS('modules/settings.js'));
  } else if (route === 'relace') {
    tasks.push(loadJS('modules/relace.js'));
  } else if (route === 'faq') {
    tasks.push(loadJS('modules/faq.js'));
  } else {
    O.warn('Unknown route; no modules loaded');
  }

  Promise.allSettled(tasks).then(results => {
    results.forEach((r, i) => {
      if (r.status === 'fulfilled') O.log(`router: loaded [${i}]`);
      else O.warn('router: load failed', r.reason);
    });
    O.time('router:exit');
    console.groupEnd();
  });
})();
