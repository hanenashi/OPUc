// modules/login.js
(function () {
  const O = window.OPUc;
  if (!O) return;

  O.log('login: init');

  // Default preference for "Přihlásit trvale?" (persisted in OPUc settings)
  const cfg = O.getSettings();
  if (typeof cfg.loginPermanent === 'undefined') {
    O.set({ loginPermanent: false }); // default off; change to true if you prefer
  }

  const emailInput = document.querySelector('input[name="email"]');
  const passInput  = document.querySelector('input[name="heslo"]');
  const permHidden = document.querySelector('input[type="hidden"][name="permanentlogin"]');
  const permCheck  = document.querySelector('input[type="checkbox"][name="permanentlogin"]');
  const submitBtn  = document.querySelector('input[name="tl_prihlasit"]');

  // 1) Autofocus email (if empty), else password
  if (emailInput) {
    const stored = localStorage.getItem('OPUc_login_email') || '';
    if (stored && !emailInput.value) emailInput.value = stored;
    if (!emailInput.value) emailInput.focus();
  }
  if (passInput && emailInput && emailInput.value) passInput.focus();

  // 2) Remember typed email locally
  if (emailInput) {
    const save = () => localStorage.setItem('OPUc_login_email', emailInput.value.trim());
    emailInput.addEventListener('change', save);
    emailInput.addEventListener('blur', save);
    emailInput.addEventListener('input', save);
  }

  // 3) Set default for "permanentlogin" from settings
  if (permCheck) {
    permCheck.checked = !!cfg.loginPermanent;
    permCheck.addEventListener('change', () => O.set({ loginPermanent: permCheck.checked }));
  }
  if (permHidden && permCheck) {
    // Keep the hidden input in sync so server gets deterministic value
    const sync = () => { permHidden.value = permCheck.checked ? '1' : '0'; };
    sync();
    permCheck.addEventListener('change', sync);
  }

  // 4) Enter in password triggers submit (should already happen, but belt & suspenders)
  if (passInput && submitBtn) {
    passInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        O.log('login: Enter on password → submit');
        submitBtn.click();
      }
    });
  }
})();
