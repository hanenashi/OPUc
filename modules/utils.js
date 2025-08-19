// modules/utils.js
(function () {
  const NS = 'OPUc';
  const O = (window.OPUc = window.OPUc || {});
  if (O.__utils_loaded) return;
  O.__utils_loaded = true;

  // ---------- Logging backbone ----------
  const start = performance.now();
  const pad = n => String(n).padStart(2, '0');
  const ts = () => {
    const d = new Date();
    return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}.${String(d.getMilliseconds()).padStart(3,'0')}`;
  };
  function log(level, msg, ...rest) {
    const prefix = `%c[${NS}]%c ${level}%c ${msg}`;
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
  O.time = (label) => {
    const ms = (performance.now() - start).toFixed(1);
    O.log(`${label} (+${ms}ms)`);
  };

  // ---------- Settings store ----------
  const SKEY = 'OPUc_SETTINGS';
  O.getSettings = () => {
    try { return JSON.parse(localStorage.getItem(SKEY) || '{}'); }
    catch { return {}; }
  };
  O.saveSettings = (obj) => localStorage.setItem(SKEY, JSON.stringify(obj || {}));
  O.set = (patch) => { const cur = O.getSettings(); O.saveSettings({ ...cur, ...patch }); return O.getSettings(); };

  // ---------- Route detection ----------
  O.route = {
    atUploader() { return location.search === '' || location.pathname === '/'; },
    atGallery()  { return /page=userpanel/i.test(location.search); },
    atSettings() { return /page=settings/i.test(location.search); },
    atRelace()   { return /page=relace/i.test(location.search); },
    atFAQ()      { return /page=faq/i.test(location.search); },
    name() {
      if (this.atUploader()) return 'uploader';
      if (this.atGallery())  return 'gallery';
      if (this.atSettings()) return 'settings';
      if (this.atRelace())   return 'relace';
      if (this.atFAQ())      return 'faq';
      return 'unknown';
    }
  };

  // ---------- Bare-mode CSS toggle ----------
  // Flip this on to nuke site styling and see raw layout.
  // Persisted in settings; default = true while we iterate.
  const cfg = O.getSettings();
  if (typeof cfg.bareMode === 'undefined') O.set({ bareMode: true });

  // Add a keyboard toggle (Ctrl+Alt+B) to switch bare mode live.
  document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.altKey && e.key.toLowerCase() === 'b') {
      const cur = O.getSettings().bareMode;
      O.set({ bareMode: !cur });
      O.log(`Bare mode: ${!cur ? 'ON' : 'OFF'} (reload to fully apply)`);
      // Live toggle class for any CSS that looks at it
      document.documentElement.classList.toggle('opuc-bare', !cur);
    }
  });

  // Mark <html> with flags for CSS to target
  document.documentElement.classList.toggle('opuc-bare', !!O.getSettings().bareMode);
  document.documentElement.setAttribute('data-opuc-route', O.route.name());

  // Greeting
  O.log(`Boot utils on route: "${O.route.name()}"  url=${location.href}`);
})();
