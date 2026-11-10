import test from 'node:test';
import assert from 'node:assert/strict';
import { createCarouselClock } from './carousel-clock.js';

function fixture() {
  let next = 0;
  const frames = new Map(), cycles = [], progress = [];
  const clock = createCarouselClock({
    requestFrame: fn => { frames.set(++next, fn); return next; },
    cancelFrame: id => frames.delete(id),
    onCycle: () => { cycles.push(progress.length); clock.pause('hidden', false); },
    onProgress: value => progress.push(value),
  });
  const tick = time => {
    assert.equal(frames.size, 1, 'exactly one queued frame');
    const [id, callback] = frames.entries().next().value;
    frames.delete(id);
    callback(time);
  };
  return {clock, frames, cycles, progress, tick};
}
test('cycles start 3000ms apart, including the transition, without duplicate loops', () => {
  const f = fixture();
  f.clock.pause('loading', false); f.clock.pause('offscreen', false);
  f.tick(100); f.tick(1600);
  assert.equal(f.progress.at(-1), .5);
  f.tick(3100); f.tick(6100);
  assert.equal(f.cycles.length, 2);
  assert.equal(f.progress.at(-1), 0);
  assert.equal(f.frames.size, 1);
});
test('independent pause reasons preserve elapsed time and prevent background catch-up', () => {
  const f = fixture();
  f.clock.pause('loading', false); f.clock.pause('offscreen', false);
  f.tick(0); f.tick(1000);
  for (const reason of ['hover','focus','user','hidden','offscreen','reduced-motion']) f.clock.pause(reason, true);
  assert.equal(f.frames.size, 0);
  for (const reason of ['hover','focus','hidden','offscreen','reduced-motion']) f.clock.pause(reason, false);
  assert.equal(f.frames.size, 0, 'user pause survives temporary reasons');
  f.clock.pause('user', false);
  f.tick(100000); f.tick(101000);
  assert.equal(f.cycles.length, 0);
  assert.equal(f.progress.at(-1), 2/3);
  f.tick(102000);
  assert.equal(f.cycles.length, 1);
});
test('manual reset gives a full cycle; cleanup cancels the only pending frame', () => {
  const f = fixture();
  f.clock.pause('loading', false); f.clock.pause('offscreen', false);
  f.tick(0); f.tick(2900);
  f.clock.reset(); f.tick(2950); f.tick(5900);
  assert.equal(f.cycles.length, 0);
  f.tick(5950);
  assert.equal(f.cycles.length, 1);
  f.clock.destroy();
  assert.equal(f.frames.size, 0);
  f.clock.pause('user', false);
  assert.equal(f.frames.size, 0);
});
