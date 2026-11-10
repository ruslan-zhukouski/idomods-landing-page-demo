import { initNavigation } from './navigation.js';
import { initHeroGeometry } from './hero-geometry.js';
import { initHeaderMotion } from './header-motion.js';
import { initHeroSlider } from './hero-slider.js';
import { initShaderSection } from './shader-section.js';

const header = document.querySelector('.site-header');
const hero = document.querySelector('.hero');

initNavigation(header);
initHeroGeometry(hero);
initHeaderMotion(header);
initHeroSlider(hero);
initShaderSection();
