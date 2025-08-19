// ==UserScript==
// @name         OPUc
// @namespace    https://opu.peklo.biz/
// @version      0.3.4
// @description  Unified modular overhaul for OPU with logging + bare-mode + uploader queue
// @match        https://opu.peklo.biz/*
// @run-at       document-end
// @noframes
// @grant        none
// @updateURL    https://raw.githubusercontent.com/hanenashi/OPUc/main/OPUc.user.js
// @downloadURL  https://raw.githubusercontent.com/hanenashi/OPUc/main/OPUc.user.js
// ==/UserScript==

(function () {
  'use strict';

  const OPUC_VERSION = '0.3.4'; // keep in sync with @version
  window.OPUc = window.OPUc || {};
  window.OPUc.version = OPUC_VERSION;

  const DEV_BASE = 'https://raw.githubusercontent.com/hanenashi/OPUc/main/';

  async function loadText(path) {
    const url = DEV_BASE + path + `?v=${Date.now()}`;
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) throw new Error(`Fetch failed: ${url} [${res.status}]`);
    return await res.text();
  }
  async function loadScript(path) { (0, eval)(await loadText(path)); }
  async function loadCSS(path) {
    const css = await loadText(path);
    const el = document.createElement('style');
    el.setAttribute('data-opuc', path);
    el.textContent = css;
    document.head.appendChild(el);
    return el;
  }

  (async function boot() {
    console.log(`%c[OPUc]%c booting v${OPUc.version}`,
      'color:#fff;background:#111;padding:1px 4px;border-radius:3px',
      'color:inherit;background:transparent');

    await loadCSS('css/base.css');        // bare-mode + theme tokens
    await loadScript('modules/utils.js'); // logger, route, settings
    await loadScript('modules/router.js');// per-route loader
  })().catch(err => console.error('[OPUc] boot error:', err));
})();
