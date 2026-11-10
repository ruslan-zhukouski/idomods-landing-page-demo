// Lossless delivery copies; original Figma PNGs remain the fallback/source.
export const optimizedImages = new Map([
  'configurator-laptop', 'catalogue-tablet', 'smart-phone-frame',
  'smart-screen-front', 'smart-screen-back', 'lamp-beige', 'lamp-green', 'lamp-terracotta',
].map(name => [`assets/images/${name}.png`, `assets/images/${name}.webp`]));
