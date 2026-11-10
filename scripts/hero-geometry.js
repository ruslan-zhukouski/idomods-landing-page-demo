// Bounds from the original 1920×1080 design; the baked lamps are never duplicated.
export const lampBounds = {
  beige: [760, 85, 372, 419],
  green: [1076, 332, 470, 428],
  terracotta: [418, 434, 423, 393],
};

export function initHeroGeometry() {
  const hero = document.querySelector('.hero');
  const image = hero.querySelector('.hero-image img');
  const layer = hero.querySelector('.lamp-regions');
  const update = () => {
    if (!image.naturalWidth) return;
    const frame = image.closest('picture').getBoundingClientRect();
    const parent = hero.getBoundingClientRect();
    const scale = Math.max(frame.width / image.naturalWidth, frame.height / image.naturalHeight);
    const width = image.naturalWidth * scale;
    const height = image.naturalHeight * scale;
    const offsetX = (frame.width - width) / 2;
    const offsetY = (frame.height - height) / 2;
    Object.assign(layer.style, {left: `${frame.left-parent.left}px`, top: `${frame.top-parent.top}px`, width: `${frame.width}px`, height: `${frame.height}px`});
    for (const region of layer.children) {
      const [x,y,w,h] = lampBounds[region.dataset.lamp];
      const left = offsetX + x / 1920 * width;
      const top = offsetY + y / 1080 * height;
      const regionWidth = w / 1920 * width;
      const regionHeight = h / 1080 * height;
      Object.assign(region.style, {left:`${left}px`, top:`${top}px`, width:`${regionWidth}px`, height:`${regionHeight}px`});
      region.hidden = left + regionWidth <= 0 || left >= frame.width || top + regionHeight <= 0 || top >= frame.height;
    }
  };
  image.addEventListener('load', update);
  new ResizeObserver(update).observe(hero);
  update();
}
