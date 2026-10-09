'use strict';

(function (global) {
  const STORAGE_KEY = 'talos.textScale';
  const PRESETS = { standard: 1, comfortable: 1.12, large: 1.2 };

  function apply(scale) {
    document.documentElement.style.setProperty('--text-scale', String(scale));
  }

  function activeKey() {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && PRESETS[saved]) return saved;
    return 'comfortable';
  }

  function syncButtons(root) {
    const key = activeKey();
    root.querySelectorAll('[data-text-scale]').forEach((button) => {
      button.setAttribute('aria-pressed', String(button.dataset.textScale === key));
    });
  }

  function init(root = document) {
    apply(PRESETS[activeKey()]);
    syncButtons(root);
    root.querySelectorAll('[data-text-scale]').forEach((button) => {
      button.addEventListener('click', () => {
        const key = button.dataset.textScale;
        if (!PRESETS[key]) return;
        localStorage.setItem(STORAGE_KEY, key);
        apply(PRESETS[key]);
        syncButtons(root);
      });
    });
  }

  global.TalosTextScale = { init, PRESETS, STORAGE_KEY };
})(window);
