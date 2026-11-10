// Ordinary site links in a nonmodal disclosure, without a focus trap.
const instances = new WeakMap();
export function initNavigation(header = document.querySelector('.site-header')) {
  if (!header) return () => {};
  if (instances.has(header)) return instances.get(header);
  const toggle = header.querySelector('.menu-toggle');
  const panel = document.getElementById(toggle?.getAttribute('aria-controls'));
  if (!toggle || !panel) return () => {};
  const controller = new AbortController();
  const { signal } = controller;
  let destroyed = false;
  const desktop = matchMedia('(min-width: 1600px)');
  const firstLink = panel.querySelector('a');
  const setOpen = (open, restoreFocus = false) => {
    panel.hidden = !open;
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Zamknij menu' : 'Menu');
    header.classList.toggle('navigation-open', open && !desktop.matches);
    if (restoreFocus) toggle.focus();
  };
  const sync = () => {
    const focused = document.activeElement;
    toggle.hidden = desktop.matches;
    setOpen(desktop.matches);
    if (!desktop.matches && panel.contains(focused)) toggle.focus();
    if (desktop.matches && focused === toggle) firstLink?.focus();
  };
  toggle.addEventListener('click', () => setOpen(panel.hidden), { signal });
  header.addEventListener('keydown', event => {
    if (event.key === 'Escape' && !desktop.matches && !panel.hidden) {
      event.preventDefault();
      setOpen(false, true);
    }
  }, { signal });
  document.addEventListener('pointerdown', event => {
    if (!desktop.matches && !panel.hidden && !header.contains(event.target)) {
      setOpen(false, panel.contains(document.activeElement));
    }
  }, { signal });
  header.addEventListener('focusout', event => {
    if (event.relatedTarget && !header.contains(event.relatedTarget) && !desktop.matches) setOpen(false);
  }, { signal });
  desktop.addEventListener('change', sync, { signal });
  header.classList.add('navigation-enhanced');
  sync();
  const cleanup = () => {
    if (destroyed) return;
    destroyed = true;
    controller.abort();
    header.classList.remove('navigation-enhanced', 'navigation-open');
    toggle.hidden = true;
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-label', 'Menu');
    panel.hidden = false;
    instances.delete(header);
  };
  instances.set(header, cleanup);
  return cleanup;
}
