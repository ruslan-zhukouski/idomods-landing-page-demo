export function initHeroLights(hero) {
  const layer = hero.querySelector('.lamp-regions');
  const controller = new AbortController();
  let destroyed = false;
  for (const button of layer.children) {
    // Keep the photograph and its working light toggle if a cutout cannot load.
    // Only a decoded cutout can enlarge and carry its glow with it.
    button.querySelector('img').decode().then(() => {
      if (!destroyed) button.classList.add('lamp-ready');
    }).catch(() => {});
    button.addEventListener('click', () => {
      button.setAttribute('aria-pressed', String(button.getAttribute('aria-pressed') !== 'true'));
    }, { signal: controller.signal });
  }
  return {
    show(visible) {
      layer.hidden = !visible;
      layer.inert = !visible;
      if (!visible) for (const button of layer.children) button.setAttribute('aria-pressed', 'false');
    },
    destroy() { destroyed = true; controller.abort(); layer.hidden = true; },
  };
}
