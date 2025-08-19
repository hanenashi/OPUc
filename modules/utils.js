// modules/utils.js
(function () {
  const NS = 'OPUc';
  const O = (window.OPUc = window.OPUc || {});
  if (O.__utils_loaded) return;
  O.__utils_loaded = true;

  O.version = O.version || '0.0.0-dev';

  // ---------- Logging ----------
  const start = performance.now();
  const pad = n => String(n).padStart(2, '0');
  function log(level, msg, ...rest) {
    const prefix = `%c[${NS} v${O.version}]%c ${level}%c ${msg}`;
    const a = [
      'color:#fff;background:#111;padding:1px 4px;border-radius:3px',
      level === 'ERR' ? 'color:#fff;background:#b00020;padding:1px 4px;border-radius:3px'
        : level === 'WARN' ? 'color:#111;background:#ffcc00;padding:1px 4px;border-radius:3px'
        : 'color:#111;background:#a0e3ff;padding:1px 4px;border-radius:3px',
      'color:inherit;background:transparent'
    ];
    console.log(prefix, ...a, ...rest);
  }
  O.log  = (m, ...r) => log('INFO', m, ...r);
  O.warn = (m, ...r) => log('WARN', m, ...r);
  O.err  = (m, ...r) => log('ERR',  m, ...r);
  O.time = (label) => O.log(`${label} (+${(performance.now() - start).toFixed(1)}ms)`);

  // ---------- Settings ----------
  const SKEY = 'OPUc_SETTINGS';
  O.getSettings = () => { try { return JSON.parse(localStorage.getItem(SKEY) || '{}'); } catch { return {}; } };
  O.saveSettings = (obj) => localStorage.setItem(SKEY, JSON.stringify(obj || {}));
  O.set = (patch) => { const cur = O.getSettings(); O.saveSettings({ ...cur, ...patch }); return O.getSettings(); };

  // ---------- Route detection (robust) ----------
  const params = new URLSearchParams(location.search);
  const hasPage = params.has('page');
  const pageVal = (params.get('page') || '').toLowerCase();

  O.route = {
    atUploader() {
      // Only treat as uploader when NO 'page' param, OR explicitly index-like,
      // and prefer a DOM marker (#obrazek file input) to be safe.
      if (hasPage && pageVal !== '' && pageVal !== 'index') return false;
      return !!document.querySelector('#obrazek, form[action="/"] input[type="file"]#obrazek, form[action="/"] input[type="file"][name="obrazek"]');
    },
    atGallery() {
      if (pageVal === 'userpanel') return true;
      return !!document.querySelector('.inbox-wrap, .box-wrap, .userpanel, #gallery, .galerie');
    },
    atSettings() {
      if (pageVal === 'settings') return true;
      return !!document.querySelector('.ussetmain, form[action*="settings"]');
    },
    atRelace() {
      if (pageVal === 'relace') return true;
      return !!document.querySelector('table .small-user-agent, #tl_destroy_all, #tl_destroy');
    },
    atFAQ() {
      if (pageVal === 'faq') return true;
      return !!document.querySelector('h2,h3') && /F\.A\.Q|FAQ/i.test(document.body.textContent || '');
    },
    name() {
      if (this.atGallery())  return 'gallery';
      if (this.atSettings()) return 'settings';
      if (this.atRelace())   return 'relace';
      if (this.atFAQ())      return 'faq';
      if (this.atUploader()) return 'uploader';
      return 'unknown';
    }
  };

  // ---------- Bare-mode toggle ----------
  const cfg = O.getSettings();
  if (typeof cfg.bareMode === 'undefined') O.set({ bareMode: true });

  document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.altKey && e.key.toLowerCase() === 'b') {
      const cur = O.getSettings().bareMode;
      O.set({ bareMode: !cur });
      O.log(`Bare mode: ${!cur ? 'ON' : 'OFF'} (reload to fully apply)`);
      document.documentElement.classList.toggle('opuc-bare', !cur);
    }
  });

  document.documentElement.classList.toggle('opuc-bare', !!O.getSettings().bareMode);
  document.documentElement.setAttribute('data-opuc-route', O.route.name());

  O.log(`Boot utils on route: "${O.route.name()}"  url=${location.href}`);
})();
