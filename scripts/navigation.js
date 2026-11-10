// Ordinary site links in a nonmodal disclosure, without a focus trap.
export function initNavigation() {
  const header = document.querySelector('.site-header');
  const toggle = header.querySelector('.menu-toggle');
  const panel = document.getElementById(toggle.getAttribute('aria-controls'));
  const desktop = matchMedia('(min-width: 1600px)');
  const setOpen = (open, restoreFocus = false) => {
    panel.hidden = !open;
    toggle.setAttribute('aria-expanded', String(open));
    toggle.textContent = open ? 'Zamknij menu' : 'Menu';
    header.classList.toggle('navigation-open', open && !desktop.matches);
    if (restoreFocus) toggle.focus();
  };
  const sync = () => {
    const focused = document.activeElement;
    toggle.hidden = desktop.matches;
    setOpen(desktop.matches);
    if (!desktop.matches && panel.contains(focused)) toggle.focus();
    if (desktop.matches && focused === toggle) panel.querySelector('a').focus();
  };
  toggle.addEventListener('click', () => setOpen(panel.hidden));
  header.addEventListener('keydown', event => {
    if (event.key === 'Escape' && !desktop.matches && !panel.hidden) {
      event.preventDefault();
      setOpen(false, true);
    }
  });
  document.addEventListener('pointerdown', event => {
    if (!desktop.matches && !panel.hidden && !header.contains(event.target)) {
      setOpen(false, panel.contains(document.activeElement));
    }
  });
  header.addEventListener('focusout', event => {
    if (event.relatedTarget && !header.contains(event.relatedTarget) && !desktop.matches) setOpen(false);
  });
  desktop.addEventListener('change', sync);
  header.classList.add('navigation-enhanced');
  sync();
}
