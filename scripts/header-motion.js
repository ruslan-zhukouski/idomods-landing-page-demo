// Mirror only the visible input text: the real input retains selection, editing,
// form semantics, and its single accessible label throughout the crossfade.
export function initHeaderMotion(header = document.querySelector('.site-header')) {
  if (!header) return () => {};
  const input = header.querySelector('input');
  const mirror = header.querySelector('.search-dark-text');
  const sync = () => {
    mirror.textContent = input.value || input.placeholder;
    mirror.scrollLeft = input.scrollLeft;
  };
  const controller = new AbortController();
  for (const event of ['input', 'scroll', 'change', 'focus']) input.addEventListener(event, sync, {signal: controller.signal});
  sync();
  header.classList.add('header-motion');
  return () => { controller.abort(); header.classList.remove('header-motion'); };
}
