export function initHeroLights(hero) {
  const layer = hero.querySelector('.lamp-regions');
  const controller = new AbortController();
  const buttons = [...layer.querySelectorAll('[data-lamp]')];
  let destroyed = false;
  let requested = false;
  layer.addEventListener('click', event => {
    const button = event.target.closest('[data-lamp]');
    if (button && layer.contains(button)) {
      button.setAttribute('aria-pressed', String(button.getAttribute('aria-pressed') !== 'true'));
    }
  }, { signal: controller.signal });
  return {
    show(visible) {
      if (visible && !requested) {
        requested = true;
        for (const button of buttons) {
          // Fetch cutouts only after the primary photograph is decoded. A failed
          // cutout retains the photographed lamp and its working light toggle.
          const image = button.querySelector('img');
          image.loading = 'eager';
          image.decode().then(() => {
            if (!destroyed) button.classList.add('lamp-ready');
          }).catch(() => {});
        }
      }
      layer.hidden = !visible;
      layer.inert = !visible;
      if (!visible) for (const button of buttons) button.setAttribute('aria-pressed', 'false');
    },
    destroy() { destroyed = true; controller.abort(); layer.hidden = true; },
  };
}
