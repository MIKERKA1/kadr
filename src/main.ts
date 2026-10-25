import '@fontsource-variable/tektur/standard.css';
import '@fontsource-variable/onest/index.css';
import './style.css';
import { initHero } from './hero.ts';
import { initHz } from './hz.ts';
import { initPrices, initParty, initBooking } from './calc.ts';
import { initNav, initReveals, initZones, initGear, initMore, initVisit, initRibbon, initCta } from './sections.ts';

const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

// Each part fails alone: a broken effect must never take the booking form with it.
const parts: [string, () => void][] = [
  ['reveals', () => initReveals(reduce)],
  ['hero', () => initHero(reduce)],
  ['nav', () => initNav(reduce)],
  ['hz', () => initHz(reduce)],
  ['zones', () => initZones(reduce)],
  ['gear', () => initGear()],
  ['prices', () => initPrices(reduce)],
  ['party', () => initParty()],
  ['booking', () => initBooking(reduce)],
  ['more', () => initMore(reduce)],
  ['visit', () => initVisit(reduce)],
  ['ribbon', () => initRibbon(reduce)],
  ['cta', () => initCta(reduce)],
];
for (const [name, run] of parts) {
  try { run(); } catch (err) { console.error(`[kadr] ${name} failed`, err); }
}
