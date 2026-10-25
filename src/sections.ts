import { animate, stagger, steps, splitText, utils } from 'animejs';
import { animate as spring, scroll, inView } from 'motion';

const $$ = <T extends Element = HTMLElement>(s: string, root: ParentNode = document) => [...root.querySelectorAll<T>(s)];

export function initNav(reduce: boolean) {
  const nav = document.querySelector<HTMLElement>('[data-nav]')!;
  let lastY = scrollY;
  addEventListener('scroll', () => {
    const y = scrollY;
    nav.classList.toggle('is-hidden', y > lastY && y > 240 && !document.querySelector('[data-menu]:not([hidden])'));
    lastY = y;
  }, { passive: true });

  // the link of the section on screen
  const links = $$<HTMLAnchorElement>('.nav__links a');
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (!e.isIntersecting) continue;
      links.forEach((a) => a.classList.toggle('is-current', a.hash === `#${e.target.id}`));
    }
  }, { rootMargin: '-45% 0px -50% 0px' });
  links.forEach((a) => { const t = document.querySelector(a.hash); if (t) io.observe(t); });

  // Moscow time next to "open": the club never closes, the clock proves it is live
  const clock = document.querySelector<HTMLElement>('[data-clock]')!;
  const fmt = new Intl.DateTimeFormat('ru-RU', { timeZone: 'Europe/Moscow', hour: '2-digit', minute: '2-digit' });
  const tick = () => { clock.textContent = `24/7 · ${fmt.format(new Date())} МСК`; };
  tick();
  setInterval(tick, 20_000);

  // full-screen menu on phones
  const menu = document.querySelector<HTMLElement>('[data-menu]')!;
  const open = document.querySelector<HTMLButtonElement>('[data-menu-open]')!;
  const close = () => {
    menu.hidden = true;
    open.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
    open.focus();
  };
  open.addEventListener('click', () => {
    menu.hidden = false;
    open.setAttribute('aria-expanded', 'true');
    document.body.style.overflow = 'hidden';
    const items = $$('nav a, .menu__cta, .menu__meta', menu);
    if (!reduce) animate(items, { y: ['60%', '0%'], opacity: [0, 1], duration: 700, delay: stagger(45), ease: 'outExpo' });
    (items[0] as HTMLElement).focus();
  });
  menu.querySelector('[data-menu-close]')!.addEventListener('click', close);
  $$('a', menu).forEach((a) => a.addEventListener('click', () => { menu.hidden = true; open.setAttribute('aria-expanded', 'false'); document.body.style.overflow = ''; }));
  addEventListener('keydown', (e) => { if (e.key === 'Escape' && !menu.hidden) close(); });

  // phone dock: visible between the hero and the booking form
  const dock = document.querySelector<HTMLElement>('[data-dock]')!;
  const seen = { hero: true, booking: false };
  const dio = new IntersectionObserver((entries) => {
    for (const e of entries) seen[(e.target as HTMLElement).id === 'top' ? 'hero' : 'booking'] = e.isIntersecting;
    dock.classList.toggle('is-on', !seen.hero && !seen.booking);
  });
  dio.observe(document.getElementById('top')!);
  dio.observe(document.getElementById('booking')!);
}

/** Every section: heading letters rise out of their words, then text, then pictures. */
export function initReveals(reduce: boolean) {
  if (reduce) return;
  document.documentElement.classList.add('motion');
  const heads = $$('[data-split]').map((h) => {
    const split = splitText(h, { words: { wrap: 'clip' }, chars: true });
    utils.set(split.chars, { y: '105%' });
    return [h, split.chars] as const;
  });
  inView('[data-reveal]', (section) => {
    for (const [h, chars] of heads) {
      if (section.contains(h)) animate(chars, { y: '0%', duration: 1000, delay: stagger(16), ease: 'outExpo' });
    }
    const parts = $$('[data-r]', section);
    animate(parts, { opacity: [0, 1], y: [28, 0], duration: 900, delay: stagger(80, { start: 150 }), ease: 'outExpo' });
  }, { amount: 0.15 });
}

const ZONE_FIELDS = [
  ['#0d0b0e', '#efe9e1'],
  ['#1c1220', '#efe9e1'],
  ['#151217', '#efe9e1'],
  ['#ff3d8b', '#14040b'],
];

export function initZones(reduce: boolean) {
  const section = document.querySelector<HTMLElement>('[data-zones]');
  if (!section) return;
  const track = section.querySelector<HTMLElement>('[data-zones-track]')!;
  const list = section.querySelector<HTMLElement>('[data-zones-list]')!;
  const tabs = $$<HTMLButtonElement>('[data-zone-tab]', section);
  const zones = $$('[data-zone]', section);
  const wide = matchMedia('(min-width: 901px)');
  let active = 0;

  let leaveTimer = 0;
  const setActive = (i: number) => {
    if (i === active) return;
    const prev = zones[active];
    active = i;
    tabs.forEach((t, k) => { t.setAttribute('aria-selected', String(k === i)); t.tabIndex = k === i ? 0 : -1; });
    if (!wide.matches) return;
    section.style.setProperty('--zbg', ZONE_FIELDS[i][0]);
    section.style.setProperty('--zink', ZONE_FIELDS[i][1]);
    const next = zones[i];
    // Only two zones may exist on screen: the new one, and the old picture underneath it
    // while the wipe runs. The old text disappears at once so nothing overlaps.
    clearTimeout(leaveTimer);
    zones.forEach((z) => { if (z !== next && z !== prev) z.classList.remove('is-active', 'is-leaving'); });
    next.classList.remove('is-leaving');
    next.classList.add('is-active');
    next.style.zIndex = '2';
    prev.style.zIndex = '1';
    prev.classList.add('is-leaving');
    if (reduce) { prev.classList.remove('is-active', 'is-leaving'); return; }
    leaveTimer = window.setTimeout(() => prev.classList.remove('is-active', 'is-leaving'), 700);
    const pic = next.querySelector<HTMLElement>('.zone__pic')!;
    const img = pic.querySelector('img')!;
    const info = $$('.zone__info > *', next);
    // the new zone is drawn top to bottom in eight steps, like a frame refreshing
    animate(pic, { clipPath: ['inset(0% 0% 100% 0%)', 'inset(0% 0% 0% 0%)'], duration: 650, ease: steps(8) });
    animate(img, { scale: [1.18, 1], duration: 1400, ease: 'outExpo' });
    animate(info, { opacity: [0, 1], x: [40, 0], duration: 800, delay: stagger(60), ease: 'outExpo' });
  };

  // Desktop: scroll position inside the tall track picks the zone (the frame stays pinned).
  scroll((p: number) => {
    if (!wide.matches) return;
    setActive(Math.min(zones.length - 1, Math.floor(p * zones.length * 0.999)));
  }, { target: track, offset: ['start start', 'end end'] });

  // Phone: the swipe strip reports which card is in view.
  const io = new IntersectionObserver((entries) => {
    if (wide.matches) return;
    for (const e of entries) if (e.isIntersecting) setActive(zones.indexOf(e.target as HTMLElement));
  }, { root: list, threshold: 0.6 });
  zones.forEach((z) => io.observe(z));

  const go = (i: number) => {
    if (wide.matches) {
      const top = track.getBoundingClientRect().top + scrollY;
      const run = track.offsetHeight - innerHeight;
      scrollTo({ top: top + run * ((i + 0.5) / zones.length), behavior: reduce ? 'auto' : 'smooth' });
    } else {
      list.scrollTo({ left: zones[i].offsetLeft - list.offsetLeft - parseFloat(getComputedStyle(list).paddingLeft), behavior: reduce ? 'auto' : 'smooth' });
      setActive(i);
    }
  };
  tabs.forEach((t, i) => {
    t.addEventListener('click', () => go(i));
    t.addEventListener('keydown', (e) => {
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
      const n = (i + (e.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
      tabs[n].focus();
      go(n);
    });
  });
}

export function initGear() {
  const zoom = document.querySelector<HTMLElement>('[data-gear-zoom]');
  if (!zoom) return;
  const aim = document.querySelector<HTMLElement>('[data-gear-aim]')!;
  const buttons = $$<HTMLButtonElement>('[data-spot]');
  const img = zoom.querySelector('img')!;

  const pick = (b: HTMLButtonElement) => {
    buttons.forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    const [x, y] = b.dataset.spot!.split(',').map(Number);
    img.style.setProperty('--ox', `${x}%`);
    img.style.setProperty('--oy', `${y}%`);
    const whole = x === 50 && y === 50;   // the network line has no single part to point at
    zoom.classList.toggle('is-zoomed', !whole);
    aim.style.opacity = whole ? '0' : '1';
    spring(aim, { x: (x / 100) * zoom.clientWidth, y: (y / 100) * zoom.clientHeight }, { type: 'spring', stiffness: 160, damping: 20 });
  };
  buttons.forEach((b) => b.addEventListener('click', () => pick(b)));
  addEventListener('resize', () => pick(buttons.find((b) => b.getAttribute('aria-pressed') === 'true') ?? buttons[0]));
  // start on the monitor once the photo is on screen
  inView(zoom, () => pick(buttons[0]), { amount: 0.4 });
}

/** "More than games": the frame on the right shows whichever line the pointer is on. */
export function initMore(reduce: boolean) {
  const win = document.querySelector<HTMLElement>('[data-more-frame]');
  if (!win) return;
  const items = $$('[data-more] li');
  let shown = items[0];
  const show = (li: HTMLElement) => {
    if (li === shown) return;
    shown.classList.remove('is-current');
    li.classList.add('is-current');
    shown = li;
    const old = win.querySelector('img')!;
    const img = old.cloneNode() as HTMLImageElement;
    img.src = li.querySelector('img')!.src;
    win.append(img);
    const done = () => { for (const x of [...win.querySelectorAll('img')].slice(0, -1)) x.remove(); };
    if (reduce) { done(); return; }
    animate(img, { clipPath: ['inset(0% 100% 0% 0%)', 'inset(0% 0% 0% 0%)'], duration: 600, ease: steps(10), onComplete: done });
    animate(img, { scale: [1.2, 1], duration: 1200, ease: 'outExpo' });
  };
  items.forEach((li) => li.addEventListener('pointerenter', () => show(li)));
  // without a pointer, the line nearest the middle of the screen leads
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) if (e.isIntersecting) show(e.target as HTMLElement);
  }, { rootMargin: '-48% 0px -48% 0px' });
  items.forEach((li) => io.observe(li));
}

export function initVisit(reduce: boolean) {
  // the one moving picture: plays only while on screen, never under reduced motion
  for (const v of $$<HTMLVideoElement>('video[data-loop]')) {
    if (reduce) continue;
    new IntersectionObserver(([e]) => { if (e.isIntersecting) v.play().catch(() => {}); else v.pause(); }).observe(v);
  }
  if (reduce) return;
  for (const verb of $$('.verb')) {
    const img = verb.querySelector<HTMLElement>('.verb__img')!;
    const word = verb.querySelector<HTMLElement>('.verb__word')!;
    scroll(spring(img, { scale: [1.25, 1], y: ['-6%', '6%'] }, { ease: 'linear' }), { target: verb, offset: ['start end', 'end start'] });
    // the verb widens from condensed to full width as its panel passes
    scroll((p: number) => { word.style.setProperty('--w', String(75 + 25 * Math.min(1, p * 2))); }, { target: verb, offset: ['start end', 'end start'] });
  }
}

export function initRibbon(reduce: boolean) {
  const track = document.querySelector<HTMLElement>('[data-ribbon]');
  if (!track || reduce) return;
  const run = track.animate([{ transform: 'translateX(0)' }, { transform: 'translateX(-50%)' }], { duration: 32000, iterations: Infinity });
  // scrolling speeds the band up and can run it backwards; it eases back to cruise
  let target = 1;
  scroll((_p: number, info) => {
    const v = info.y.velocity;
    target = 1 + Math.max(-4, Math.min(6, v / 350));
  });
  const ease = () => {
    run.playbackRate += (target - run.playbackRate) * 0.08;
    target += (1 - target) * 0.04;
    requestAnimationFrame(ease);
  };
  requestAnimationFrame(ease);
}

export function initCta(reduce: boolean) {
  const cta = document.querySelector<HTMLElement>('[data-cta]');
  const word = document.querySelector<HTMLElement>('[data-cta-word]');
  if (!cta || !word || reduce) return;
  const { chars } = splitText(word, { chars: true });
  inView(cta, () => { animate(chars, { y: ['100%', '0%'], duration: 1100, delay: stagger(60), ease: 'outExpo' }); }, { amount: 0.4 });
  cta.addEventListener('pointerenter', () => animate(chars, { y: [0, '-14%', 0], duration: 600, delay: stagger(40), ease: 'outQuad' }));

  const name = document.querySelector<HTMLElement>('.foot__name');
  if (name) {
    const s = splitText(name, { chars: true });
    utils.set(s.chars, { y: '40%', opacity: 0 });
    inView(name, () => { animate(s.chars, { y: '0%', opacity: 1, duration: 1200, delay: stagger(90), ease: 'outExpo' }); }, { amount: 0.2 });
  }
}
