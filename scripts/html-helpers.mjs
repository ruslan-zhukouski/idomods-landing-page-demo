import { optimizedImages } from './optimized-assets.mjs';

export const escapeHtml = text => String(text)
  .replaceAll('&', '&amp;').replaceAll('"', '&quot;')
  .replaceAll('<', '&lt;').replaceAll('>', '&gt;');

export function createHtmlHelpers(manifest, routes) {
  const assets = new Map(manifest.assets.map(asset => [asset.path, asset]));

  const img = (file, { alt = '', classes = '', style = '', eager = false, priority = '' } = {}) => {
    const asset = assets.get(file);
    if (!asset) throw new Error(`Missing asset: ${file}`);
    const attributes = [
      `src="${file}"`, `width="${asset.width}"`, `height="${asset.height}"`,
      `alt="${escapeHtml(alt)}"`, `loading="${eager ? 'eager' : 'lazy'}"`, 'decoding="async"',
      `data-figma-node="${asset.sourceNodeIds.join(' ')}"`,
    ];
    if (classes) attributes.push(`class="${escapeHtml(classes)}"`);
    if (style) attributes.push(`style="${escapeHtml(style)}"`);
    if (priority) attributes.push(`fetchpriority="${priority}"`);
    const image = `<img ${attributes.join(' ')}>`;
    return optimizedImages.has(file)
      ? `<picture class="asset-picture"><source type="image/webp" srcset="${optimizedImages.get(file)}">${image}</picture>`
      : image;
  };

  const icon = (name, classes = '', eager = false) =>
    `<span class="icon${classes ? ` ${classes}` : ''}" aria-hidden="true">${img(`assets/icons/${name}.svg`, { eager })}</span>`;

  const link = (id, label, classes = '', { target = '', accessibleLabel = '' } = {}) => {
    if (!routes.has(id)) return `<span class="unresolved-label ${classes}" data-unresolved-destination="${id}">${label}</span>`;
    const attributes = [`href="${escapeHtml(routes.get(id))}"`, `data-destination="${id}"`];
    if (classes) attributes.push(`class="${escapeHtml(classes)}"`);
    if (target) attributes.push(`target="${escapeHtml(target)}"`);
    if (target === '_blank') attributes.push('rel="noopener noreferrer"');
    if (accessibleLabel) attributes.push(`aria-label="${escapeHtml(accessibleLabel)}"`);
    return `<a ${attributes.join(' ')}>${label}</a>`;
  };

  const picture = (name, sizes, { alt = '', eager = false, classes = '', hidden = false } = {}) => {
    const variants = manifest.assets.filter(asset =>
      asset.path.startsWith(`assets/images/${name}-`) && asset.path.endsWith('.jpg'))
      .sort((a, b) => a.width - b.width);
    if (!variants.length) throw new Error(`Missing responsive images: ${name}`);
    const srcset = extension => variants.map(asset => `${asset.path.replace('.jpg', extension)} ${asset.width}w`).join(', ');
    const fallback = variants.at(-1);
    return `<picture${classes ? ` class="${classes}"` : ''}${hidden ? ' hidden' : ''}><source type="image/webp" srcset="${srcset('.webp')}" sizes="${sizes}"><img src="${fallback.path}" srcset="${srcset('.jpg')}" sizes="${sizes}" width="${fallback.width}" height="${fallback.height}" alt="${escapeHtml(alt)}" loading="${eager ? 'eager' : 'lazy'}" fetchpriority="${eager ? 'high' : 'low'}" decoding="async" data-figma-node="${fallback.sourceNodeIds.join(' ')}"></picture>`;
  };

  return { img, icon, link, picture };
}
