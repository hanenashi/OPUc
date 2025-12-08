// ==UserScript==
// @name         OPUc
// @namespace    https://opu.peklo.biz/
// @version      0.3.9
// @description  OPU overhaul with modular router, themes, bare mode, uploader tile editor, and gallery boosts
// @match        https://opu.peklo.biz/*
// @run-at       document-end
// @noframes
// @grant        none
// @updateURL    https://raw.githubusercontent.com/hanenashi/OPUc/main/OPUc.user.js
// @downloadURL  https://raw.githubusercontent.com/hanenashi/OPUc/main/OPUc.user.js
// ==/UserScript==

(function () {
  'use strict';

  const OPUC_VERSION = '0.3.9';
  // minute-salted cache buster so TM/GreaseMonkey pulls fresh modules each refresh
  const BUILD_SALT = 'b309-' + Math.floor(Date.now() / 60000);

  window.OPUc = window.OPUc || {};
  window.OPUc.version = OPUC_VERSION;

  const DEV_BASE = 'https://raw.githubusercontent.com/hanenashi/OPUc/main/';

  async function loadText(path) {
    const url = DEV_BASE + path + `?v=${BUILD_SALT}`;
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) throw new Error(`Fetch failed: ${url} [${res.status}]`);
    return res.text();
  }

  async function loadScript(path) {
    (0, eval)(await loadText(path));
  }

  async function loadCSS(path) {
    const css = await loadText(path);
    const el = document.createElement('style');
    el.setAttribute('data-opuc', path);
    el.textContent = css;
    document.head.appendChild(el);
    return el;
  }

  (async function boot() {
    console.log(
      `%c[OPUc]%c booting v${OPUc.version}`,
      'color:#fff;background:#111;padding:1px 4px;border-radius:3px',
      'color:inherit;background:transparent'
    );

    // Base + feature styles
    await loadCSS('css/base.css');
    await loadCSS('css/uploader.css');
    await loadCSS('css/gallery.css');

    // Core runtime + router (which imports per-route modules)
    await loadScript('modules/utils.js');
    await loadScript('modules/router.js');
  })().catch(err => console.error('[OPUc] boot error:', err));
})();
