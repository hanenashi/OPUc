// ==UserScript==
// @name         OPUc
// @namespace    https://opu.peklo.biz/
// @version      0.1.0
// @description  Unified modular overhaul of OPU (uploader, gallery, settings)
// @match        https://opu.peklo.biz/*
// @run-at       document-end
// @noframes
// @grant        none
// ==/UserScript==

(function () {
  'use strict';
  const DEV_BASE = 'https://raw.githubusercontent.com/yourname/OPUc/main/'; // adjust to your repo
  async function loadScript(path) {
    const res = await fetch(DEV_BASE + path);
    const txt = await res.text();
    (0,eval)(txt);
  }
  async function loadCSS(path) {
    const res = await fetch(DEV_BASE + path);
    const css = await res.text();
    const style = document.createElement('style');
    style.textContent = css;
    document.head.appendChild(style);
  }
  // Load base utils + router
  loadCSS('css/base.css');
  loadScript('modules/utils.js').then(()=>loadScript('modules/router.js'));
})();