import { createLightRenderer, LIGHT_CYCLE_MS } from './shader-renderer.js';

const instances = new WeakMap();
export function initShaderSection(section = document.querySelector('.light-section')) {
  if (!section) return () => {};
  if (instances.has(section)) return instances.get(section);
  const canvas = section.querySelector('.light-canvas');
  const control = section.querySelector('.light-pause');
  if (!canvas || !control) return () => {};
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  let renderer = null, frame = null, previous = null, lastDraw = null, elapsed = 0;
  let visible = false, userPaused = false, destroyed = false;
  const listeners = new AbortController();

  function stop() {
    if (frame !== null) cancelAnimationFrame(frame);
    frame = null; previous = null; lastDraw = null;
  }
  function running() { return renderer && visible && !document.hidden && !motion.matches && !userPaused && !destroyed; }
  function update() {
    section.dataset.shaderState = !renderer ? 'fallback' : motion.matches ? 'reduced' : userPaused ? 'paused' : running() ? 'running' : 'suspended';
    control.hidden = !renderer;
    control.disabled = motion.matches;
    control.textContent = motion.matches ? 'Animacja tła wyłączona' : userPaused ? 'Wznów animację tła' : 'Wstrzymaj animację tła';
    if (running()) { if (frame === null) frame = requestAnimationFrame(tick); }
    else stop();
  }
  function tick(timestamp) {
    frame = null;
    if (!running()) return;
    if (previous !== null) elapsed = (elapsed + timestamp - previous) % LIGHT_CYCLE_MS;
    previous = timestamp;
    // Limit GPU work to 30fps while retaining timestamp-based motion.
    if (lastDraw === null || timestamp - lastDraw >= 1000 / 30 - 1) {
      renderer.draw(elapsed); lastDraw = timestamp;
    }
    frame = requestAnimationFrame(tick);
  }
  function resize() {
    if (!renderer || destroyed) return;
    const bounds = section.getBoundingClientRect();
    renderer.resize(bounds.width, bounds.height, window.devicePixelRatio);
    renderer.draw(elapsed);
  }
  function build() {
    try {
      renderer = createLightRenderer(canvas);
      resize();
      section.classList.add('shader-ready');
    } catch {
      renderer?.destroy(); renderer = null;
      section.classList.remove('shader-ready');
    }
    update();
  }
  control.addEventListener('click', () => { userPaused = !userPaused; update(); }, { signal: listeners.signal });
  document.addEventListener('visibilitychange', update, { signal: listeners.signal });
  motion.addEventListener('change', update, { signal: listeners.signal });
  window.addEventListener('resize', resize, { signal: listeners.signal });
  canvas.addEventListener('webglcontextlost', event => {
    event.preventDefault(); stop(); renderer = null;
    section.classList.remove('shader-ready'); update();
  }, { signal: listeners.signal });
  canvas.addEventListener('webglcontextrestored', () => { if (!destroyed) build(); }, { signal: listeners.signal });
  const intersection = new IntersectionObserver(entries => {
    const entry = entries[entries.length - 1];
    visible = entry.isIntersecting && entry.intersectionRatio > 0; update();
  }, { threshold: [0, 0.001] });
  intersection.observe(section);
  const sizeObserver = new ResizeObserver(resize);
  sizeObserver.observe(section);
  function cleanup() {
    destroyed = true; stop(); listeners.abort();
    intersection.disconnect(); sizeObserver.disconnect();
    renderer?.destroy(); renderer = null;
    section.classList.remove('shader-ready'); control.hidden = true;
    delete section.dataset.shaderState; instances.delete(section);
  }
  window.addEventListener('pagehide', event => { if (!event.persisted) cleanup(); }, { signal: listeners.signal });
  instances.set(section, cleanup);
  build();
  return cleanup;
}
