import { createCarouselClock } from './carousel-clock.js';
import { initHeroLights } from './hero-lights.js';

export function initHeroSlider() {
  const hero = document.querySelector('.hero');
  if (!hero) return () => {};
  const slides = [...hero.querySelectorAll('.hero-slide')];
  const images = slides.map(slide => slide.querySelector('img'));
  const selectors = [...hero.querySelectorAll('[data-slide]')];
  const controls = [...hero.querySelectorAll('.hero-arrow, .hero-controls')];
  const pause = hero.querySelector('.hero-pause');
  const status = hero.querySelector('.hero-status');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const tokens = getComputedStyle(document.documentElement);
  const milliseconds = name => parseFloat(tokens.getPropertyValue(name));
  const timing = {cycle: milliseconds('--motion-cycle'), fade: milliseconds('--motion-crossfade'), image: milliseconds('--motion-image')};
  const easing = tokens.getPropertyValue('--ease-standard').trim();
  const controller = new AbortController();
  const signal = controller.signal;
  hero.classList.add('hero-interactive');
  const lights = initHeroLights(hero);
  let current = 0, generation = 0, animations = [], ready = false, destroyed = false;
  let userPaused = false, offscreen = true;
  const progress = value => selectors.forEach((button, i) => {
    button.querySelector('span').style.transform = `scaleX(${i === current ? value : 0})`;
  });
  const clock = createCarouselClock({onCycle: () => select(1 - current), onProgress: progress, duration: timing.cycle});
  function finish() {
    animations.forEach(animation => animation.cancel());
    animations = [];
    slides.forEach((slide, i) => { slide.style.opacity = i === current ? '1' : '0'; });
    lights.show(current === 0);
  }
  function select(index, manual = false) {
    if (!ready) return;
    const token = ++generation;
    // Capture the current blend before cancelling previous effects. Rapid input
    // reuses the same two layers, never queues additional transitions or timers.
    const opacity = slides.map(slide => getComputedStyle(slide).opacity);
    animations.forEach(animation => animation.cancel());
    animations = [];
    const changed = index !== current;
    current = index;
    hero.dataset.slide = String(current);
    slides.forEach((slide, i) => {
      slide.setAttribute('aria-hidden', String(i !== current));
      slide.style.opacity = i === current ? '1' : '0';
    });
    selectors.forEach((button, i) => {
      if (i === current) button.setAttribute('aria-current', 'true');
      else button.removeAttribute('aria-current');
    });
    if (manual) {
      clock.reset();
      status.textContent = `Slajd ${current + 1} z 2`;
    }
    lights.show(false);
    if (changed && !reduced.matches) {
      slides.forEach((slide, i) => animations.push(slide.animate([
        {opacity: opacity[i]}, {opacity: i === current ? 1 : 0},
      ], {duration: timing.fade, easing, fill: 'both'})));
      animations.push(images[current].animate([{transform: 'scale(1.05)'}, {transform: 'scale(1)'}],
        {duration: timing.image, easing: 'ease-out', fill: 'both'}));
      Promise.all(animations.map(animation => animation.finished)).then(() => {
        if (token === generation && !destroyed) finish();
      }).catch(() => {}); // Cancellation is expected on rapid input or cleanup.
      syncEnvironment();
    } else finish();
    progress(0);
  }
  function syncEnvironment() {
    clock.pause('hidden', document.hidden);
    clock.pause('offscreen', offscreen);
    // Temporary environment pauses freeze in-flight image motion as well.
    for (const animation of animations) {
      if (document.hidden || offscreen) animation.pause(); else animation.play();
    }
  }
  function syncReduced() {
    clock.pause('reduced-motion', reduced.matches);
    pause.disabled = reduced.matches;
    pause.textContent = reduced.matches ? 'Animacja wyłączona' : userPaused ? 'Wznów animację' : 'Wstrzymaj animację';
    if (reduced.matches) { ++generation; finish(); clock.reset(); }
  }
  hero.addEventListener('pointerenter', event => {
    if (event.pointerType === 'mouse' || event.pointerType === 'pen') clock.pause('hover', true);
  }, {signal});
  hero.addEventListener('pointerleave', () => clock.pause('hover', false), {signal});
  hero.addEventListener('focusin', () => clock.pause('focus', true), {signal});
  hero.addEventListener('focusout', event => {
    if (!hero.contains(event.relatedTarget)) clock.pause('focus', false);
  }, {signal});
  pause.addEventListener('click', () => {
    userPaused = !userPaused;
    clock.pause('user', userPaused);
    pause.textContent = userPaused ? 'Wznów animację' : 'Wstrzymaj animację';
  }, {signal});
  hero.querySelector('.hero-arrow-left').addEventListener('click', () => select((current + slides.length - 1) % slides.length, true), {signal});
  hero.querySelector('.hero-arrow-right').addEventListener('click', () => select((current + 1) % slides.length, true), {signal});
  selectors.forEach((button, i) => button.addEventListener('click', () => select(i, true), {signal}));
  document.addEventListener('visibilitychange', syncEnvironment, {signal});
  reduced.addEventListener('change', syncReduced, {signal});
  const observer = new IntersectionObserver(entries => {
    offscreen = !entries[0].isIntersecting || entries[0].intersectionRatio === 0;
    syncEnvironment();
  }, {threshold: [0, 0.001]});
  observer.observe(hero);
  syncReduced();
  clock.pause('hidden', document.hidden);
  clock.pause('hover', matchMedia('(hover: hover)').matches && hero.matches(':hover'));
  clock.pause('focus', hero.contains(document.activeElement));
  // Lamps work even when the second photo fails. Neither navigation nor autoplay
  // is exposed until both responsive image selections have decoded successfully.
  images[0].decode().then(() => { if (!destroyed) lights.show(true); }).catch(() => {});
  images[1].loading = 'eager';
  Promise.all(images.map(image => image.decode())).then(() => {
    if (destroyed) return;
    ready = true;
    hero.querySelector('.hero-slide-secondary').hidden = false;
    hero.classList.add('carousel-ready');
    hero.setAttribute('aria-roledescription', 'karuzela');
    slides.forEach((slide, i) => {
      slide.setAttribute('role', 'group');
      slide.setAttribute('aria-roledescription', 'slajd');
      slide.setAttribute('aria-label', `${i + 1} z 2`);
      slide.setAttribute('aria-hidden', String(i !== 0));
    });
    controls.forEach(control => { control.hidden = false; });
    clock.reset();
    clock.pause('loading', false);
  }).catch(() => { hero.dataset.carouselError = 'image'; });
  return () => {
    destroyed = true;
    ++generation;
    controller.abort();
    observer.disconnect();
    clock.destroy();
    animations.forEach(animation => animation.cancel());
    lights.destroy();
    hero.classList.remove('hero-interactive');
  };
}
