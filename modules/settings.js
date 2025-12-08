// modules/settings.js
(function () {
  const O = window.OPUc; if (!O) return;
  O.log('settings: init two-column + theme + bare + gallery controls');

  const left = document.querySelector('.ussetmain') || document.querySelector('form[action*="settings"]')?.closest('div') || document.querySelector('#content') || document.body;
  const parent = left.parentElement;

  // Wrap as two columns
  let wrap = parent.querySelector('.opuc-settings-wrap');
  if (!wrap) { wrap = document.createElement('div'); wrap.className = 'opuc-settings-wrap'; parent.insertBefore(wrap, left); }
  if (!left.parentElement.classList.contains('opuc-settings-wrap')) wrap.appendChild(left);

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
      </section>

      <section class="opuc-field">
        <label class="opuc-label">Téma vzhledu</label>
        <div class="opuc-radio">
          <label><input type="radio" name="opuc-theme" value="dark"> <span>Karty – tmavé</span></label>
          <label><input type="radio" name="opuc-theme" value="light"> <span>Karty – světlé</span></label>
        </div>
      </section>

      <hr style="border:none;border-top:1px solid var(--opuc-border,#ddd);margin:10px 0;" />

      <section class="opuc-field">
        <label class="opuc-label">Galerie – načítání</label>
        <div class="opuc-radio" style="gap:6px;flex-wrap:wrap">
          <label><input type="radio" name="opuc-gal-target" value="50"> 50</label>
          <label><input type="radio" name="opuc-gal-target" value="100"> 100</label>
          <label><input type="radio" name="opuc-gal-target" value="200"> 200</label>
          <label><input type="radio" name="opuc-gal-target" value="500"> 500</label>
          <label><input type="radio" name="opuc-gal-target" value="1000"> 1000</label>
        </div>
        <div style="display:flex;align-items:center;gap:8px;margin-top:6px">
          <label class="opuc-label" style="margin:0">Zpoždění mezi stránkami (ms)</label>
          <input type="number" id="opuc-gal-delay" class="opuc-input" min="100" max="9999" step="50" />
        </div>
        <label class="opuc-switch" style="margin-top:6px">
          <input type="checkbox" id="opuc-gal-placeholders">
          <span>Nahradit animované náhledy (.gif/.webp) placeholderem při větším počtu</span>
        </label>
      </section>

      <section class="opuc-field">
        <button type="button" id="opuc-reset" class="opuc-btn">Obnovit výchozí</button>
      </section>
    </div>
  `;
  wrap.appendChild(pane);

  const cfg = O.getSettings();
  // defaults
  const defaults = { bareMode:false, theme:'dark', gallery:{ target:100, delay:500, placeholders:true } };
  const merged = { ...defaults, ...cfg, gallery:{ ...defaults.gallery, ...(cfg.gallery||{}) } };

  // Bare
  const bare = pane.querySelector('#opuc-bare'); bare.checked = !!merged.bareMode;
  bare.addEventListener('change', () => O.setBareMode(bare.checked));

  // Theme
  pane.querySelectorAll('input[name="opuc-theme"]').forEach(r=>{
    r.checked = (r.value === (merged.theme||'dark'));
    r.addEventListener('change', ()=>{ O.set({theme:r.value}); O.applyTheme(r.value); });
  });

  // Gallery target
  pane.querySelectorAll('input[name="opuc-gal-target"]').forEach(r=>{
    r.checked = (Number(r.value) === Number(merged.gallery.target||100));
    r.addEventListener('change', ()=>{
      const s = O.getSettings(); s.gallery = s.gallery||{}; s.gallery.target = Number(r.value)||100; O.saveSettings(s);
    });
  });

  // Delay
  const delay = pane.querySelector('#opuc-gal-delay');
  delay.value = Number(merged.gallery.delay||500);
  delay.addEventListener('change', ()=>{
    const v = Math.max(100, Math.min(9999, Number(delay.value)||500));
    const s = O.getSettings(); s.gallery = s.gallery||{}; s.gallery.delay = v; O.saveSettings(s);
    delay.value = v;
  });

  // Placeholders
  const ph = pane.querySelector('#opuc-gal-placeholders');
  ph.checked = !!merged.gallery.placeholders;
  ph.addEventListener('change', ()=>{
    const s = O.getSettings(); s.gallery = s.gallery||{}; s.gallery.placeholders = !!ph.checked; O.saveSettings(s);
  });

  // Reset
  pane.querySelector('#opuc-reset').addEventListener('click', ()=>{
    O.setBareMode(false);
    O.set({ theme:'dark', gallery:{...defaults.gallery} });
    delay.value = defaults.gallery.delay;
    bare.checked = false;
    pane.querySelectorAll('input[name="opuc-theme"]').forEach(r=> r.checked = (r.value==='dark'));
    pane.querySelectorAll('input[name="opuc-gal-target"]').forEach(r=> r.checked = (Number(r.value)===defaults.gallery.target));
    ph.checked = defaults.gallery.placeholders;
    O.applyTheme('dark');
    O.log('settings: reset (gallery + theme + bare)');
  });
})();
