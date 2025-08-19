// ==UserScript==
// @name         OPUc
// @namespace    https://opu.peklo.biz/
// @version      0.2.0
// @description  Unified modular overhaul for OPU with logging + bare-mode CSS
// @match        https://opu.peklo.biz/*
// @run-at       document-end
// @noframes
// @grant        none
// ==/UserScript==

(function () {
  'use strict';

  // --- Configure where modules/CSS are fetched from (your repo)
  const DEV_BASE = 'https://raw.githubusercontent.com/hanenashi/OPUc/main/';

  // --- Loader helpers
  async function loadText(path) {
    const url = DEV_BASE + path + `?v=${Date.now()}`; // bust cache while iterating
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) throw new Error(`Fetch failed: ${url} [${res.status}]`);
    return await res.text();
  }
  async function loadScript(path) {
    const txt = await loadText(path);
    // eval in page context
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
    // Base CSS first so early flicker is minimized (bare mode is toggled inside utils)
    await loadCSS('css/base.css');

    // Core utils (logger, route detect, settings, CSS toggles)
    await loadScript('modules/utils.js');

    // Router: decides page, logs everything, and (later) loads page modules
    await loadScript('modules/router.js');
  })().catch(err => {
    console.error('[OPUc] boot error:', err);
  });
})();
