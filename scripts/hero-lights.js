export function initHeroLights(hero) {
  const layer = hero.querySelector('.lamp-regions');
  const controller = new AbortController();
  for (const button of layer.children) {
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
    destroy() { controller.abort(); layer.hidden = true; },
  };
}
