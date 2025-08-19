// modules/settings.js
(function () {
  const O = window.OPUc;
  if (!O) return;

  O.log('settings: init two-column layout + theme selector');

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
        <label class="opuc-label">Téma vzhledu</label>
        <div class="opuc-radio">
          <label>
            <input type="radio" name="opuc-theme" value="dark">
            <span>Jednoduché tmavé</span>
          </label>
          <label>
            <input type="radio" name="opuc-theme" value="light">
            <span>Jednoduché světlé</span>
          </label>
        </div>
        <p class="opuc-help">Téma se aplikuje na všechny stránky OPU. “Bare mode” (Ctrl+Alt+B) přebarví vše na kostru – téma pak jen jemně doladí barvy.</p>
      </section>

      <section class="opuc-field">
        <button type="button" id="opuc-reset" class="opuc-btn">Obnovit výchozí</button>
      </section>
    </div>
  `;
  wrap.appendChild(pane);

  // Make the wrapper a grid only if both halves exist
  if (!wrap.querySelector('.opuc-settings-pane') || !wrap.contains(left)) {
    // Fallback: if something went weird, just append pane after left
    parent.appendChild(pane);
  }

  // Init theme radios from settings
  const cfg = O.getSettings();
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
    O.set({ theme: 'dark' });
    radios.forEach(r => r.checked = (r.value === 'dark'));
    O.applyTheme('dark');
    O.log('settings: reset to defaults');
  });
})();
