// One timestamp source owns both the 3-second cycle and its linear progress.
export function createCarouselClock({ onCycle, onProgress, duration = 3000,
  requestFrame = requestAnimationFrame, cancelFrame = cancelAnimationFrame }) {
  const reasons = new Set(['loading', 'offscreen']);
  let elapsed = 0, previous = null, frame = null, destroyed = false, ticking = false;
  function tick(timestamp) {
    frame = null;
    if (destroyed || reasons.size) return;
    ticking = true;
    if (previous !== null) elapsed += timestamp - previous;
    previous = timestamp;
    if (elapsed >= duration) {
      elapsed %= duration;
      onCycle();
    }
    onProgress(elapsed / duration);
    ticking = false;
    if (!destroyed && !reasons.size) frame = requestFrame(tick);
  }
  return {
    pause(reason, paused) {
      if (paused) reasons.add(reason); else reasons.delete(reason);
      if (reasons.size) {
        if (frame !== null) cancelFrame(frame);
        frame = null;
        previous = null;
      } else if (frame === null && !destroyed && !ticking) frame = requestFrame(tick);
    },
    reset() { elapsed = 0; previous = null; onProgress(0); },
    destroy() { destroyed = true; if (frame !== null) cancelFrame(frame); },
  };
}
