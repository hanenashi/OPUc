// ==UserScript==
// @name         OPUc
// @namespace    https://opu.peklo.biz/
// @version      0.2.2
// @description  Unified modular overhaul for OPU with logging + bare-mode CSS
// @match        https://opu.peklo.biz/*
// @run-at       document-end
// @noframes
// @grant        none
// @updateURL    https://raw.githubusercontent.com/hanenashi/OPUc/main/OPUc.user.js
// @downloadURL  https://raw.githubusercontent.com/hanenashi/OPUc/main/OPUc.user.js
// ==/UserScript==

(function () {
  'use strict';

  const OPUC_VERSION = '0.2.2'; // keep in sync with @version

  // Expose version early so modules can read it
  window.OPUc = window.OPUc || {};
  window.OPUc.version = OPUC_VERSION;

  // --- Configure where modules/CSS are fetched from (your repo)
  const DEV_BASE = 'https://raw.githubusercontent.com/hanenashi/OPUc/main/';

  // --- Loader helpers
  async function loadText(path) {
    const url = DEV_BASE + path + `?v=${Date.now()}`;
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) throw new Error(`Fetch failed: ${url} [${res.status}]`);
    return await res.text();
  }
  async function loadScript(path) {
    const txt = await loadText(path);
    (0, eval)(txt);
  }
  async function loadCSS(path) {
    const css = await loadText(path);
    const el = document.createElement('style');
    el.setAttribute('data-opuc', path);
    el.textContent = css;
    document.head.appendChild(el);
    return el;
  }

  // --- Boot
  (async function boot() {
    console.log(`%c[OPUc]%c booting v${OPUc.version}`,
      'color:#fff;background:#111;padding:1px 4px;border-radius:3px',
      'color:inherit;background:transparent');

    await loadCSS('css/base.css');      // bare-mode + base resets
    await loadScript('modules/utils.js');   // logger, route, settings, bare toggle
    await loadScript('modules/router.js');  // per-route loader
  })().catch(err => {
    console.error('[OPUc] boot error:', err);
  });
})();
