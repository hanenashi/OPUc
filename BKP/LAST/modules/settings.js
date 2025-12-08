// modules/settings.js
(function () {
  const O = window.OPUc;
  if (!O) return;

  O.log('settings: init two-column layout + theme selector + bare toggle');

  // Find the left (native) settings block
  const left = document.querySelector('.ussetmain') || document.querySelector('form[action*="settings"]')?.closest('div') || document.querySelector('#content') || document.body;
  const parent = left.parentElement;

  // Wrap into a two-column grid: [ left (native) | right (OPUc) ]
  const wrap = document.createElement('div');
  wrap.className = 'opuc-settings-wrap';
  parent.insertBefore(wrap, left);
  wrap.appendChild(left);

  // Build OPUc pane
  const pane = document.createElement('aside');
  pane.className = 'opuc-settings-pane';
  pane.innerHTML = `
    <div class="opuc-card">
      <h2>OPUc nastavení</h2>

      <section class="opuc-field">
        <label class="opuc-label">Zobrazení</label>
        <label class="opuc-switch">
          <input type="checkbox" id="opuc-bare">
          <span>Minimal (Bare) mód</span>
        </label>
        <p class="opuc-help">Když je zapnutý, stránka používá co nejjednodušší vzhled bez původních stylů OPU.</p>
      </section>

      <section class="opuc-field">
        <label class="opuc-label">Téma vzhledu</label>
        <div class="opuc-radio">
          <label>
            <input type="radio" name="opuc-theme" value="dark">
            <span>Karty – tmavé</span>
          </label>
          <label>
            <input type="radio" name="opuc-theme" value="light">
            <span>Karty – světlé</span>
          </label>
        </div>
        <p class="opuc-help">Téma vychází z dlaždic v uploaderu (náhled + text). Barvy jsou ostřejší a kontrastní.</p>
      </section>

      <section class="opuc-field">
        <button type="button" id="opuc-reset" class="opuc-btn">Obnovit výchozí</button>
      </section>
    </div>
  `;
  wrap.appendChild(pane);

  // Init controls from settings
  const cfg = O.getSettings();

  // Bare toggle
  const chkBare = pane.querySelector('#opuc-bare');
  chkBare.checked = !!cfg.bareMode;
  chkBare.addEventListener('change', () => {
    O.setBareMode(chkBare.checked);
  });

  // Theme radios
  const radios = pane.querySelectorAll('input[name="opuc-theme"]');
  radios.forEach(r => { r.checked = (r.value === (cfg.theme || 'dark')); });
  function apply(theme) {
    O.set({ theme });
    O.applyTheme(theme);
    O.log(`settings: theme → ${theme}`);
  }
  radios.forEach(r => r.addEventListener('change', () => apply(r.value)));

  // Reset to defaults
  pane.querySelector('#opuc-reset')?.addEventListener('click', () => {
    O.setBareMode(false);
    O.set({ theme: 'dark' });
    chkBare.checked = false;
    radios.forEach(r => r.checked = (r.value === 'dark'));
    O.applyTheme('dark');
    O.log('settings: reset to defaults');
  });
})();
