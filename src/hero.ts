import { animate, createTimeline, stagger, steps, utils } from 'animejs';
import { animate as spring, scroll } from 'motion';

const RATES = [60, 144, 240, 360, 540];
const GLYPHS = 'КАДР0123456789#/<>_';

/** Replace the caption letter by letter through random glyphs, like a signal locking on. */
function scramble(el: HTMLElement, next: string, reduce: boolean) {
  if (reduce) { el.textContent = next; return; }
  const from = el.textContent ?? '';
  const len = Math.max(from.length, next.length);
  const state = { p: 0 };
  animate(state, {
    p: 1, duration: 600, ease: 'linear',
    onUpdate: () => {
      const done = Math.floor(state.p * len);
      let out = '';
      for (let i = 0; i < len; i++) {
        if (i < done) out += next[i] ?? '';
        else if (next[i] === ' ' || i >= next.length) out += next[i] ?? '';
        else out += GLYPHS[(Math.random() * GLYPHS.length) | 0];
      }
      el.textContent = out;
    },
    onComplete: () => { el.textContent = next; },
  });
}

export function initHero(reduce: boolean) {
  const hero = document.querySelector<HTMLElement>('[data-hero]');
  if (!hero) return;
  const word = hero.querySelector<HTMLElement>('[data-hero-word]')!;
  const frame = hero.querySelector<HTMLElement>('[data-hero-frame]')!;
  const win = frame.querySelector<HTMLElement>('[data-tilt]')!;
  const imgs = [...win.querySelectorAll<HTMLImageElement>('img')];
  const slats = [...win.querySelectorAll<HTMLElement>('.shutter i')];
  const caption = hero.querySelector<HTMLElement>('[data-hero-caption]')!;
  const pause = hero.querySelector<HTMLButtonElement>('[data-hero-pause]')!;
  const count = hero.querySelector<HTMLElement>('[data-hz-count]')!;

  // Letters of the name become separate pieces; the h1 keeps its readable text.
  word.setAttribute('aria-label', word.textContent ?? '');
  const chars = [...(word.textContent ?? '')].map((c) => {
    const s = document.createElement('span');
    s.className = 'ch';
    s.setAttribute('aria-hidden', 'true');
    s.textContent = c;
    return s;
  });
  word.replaceChildren(...chars);

  if (reduce) {
    pause.hidden = true;
    return;
  }

  // ---- intro: the frame "boots" at a low refresh rate, then runs smooth ----
  const corners = [...frame.querySelectorAll<HTMLElement>('.frame__corner')];
  const copy = [...hero.querySelectorAll<HTMLElement>('.hero__copy > *, .hero__kind, .hero__hz, .hero figcaption')];
  utils.set(chars, { y: '102%', '--w': 75 });
  utils.set(slats, { scaleY: 1 });
  utils.set(corners, { opacity: 0, scale: 1.8 });
  utils.set(copy, { opacity: 0, y: 24 });

  const rate = { i: 0 };
  createTimeline({ defaults: { ease: 'outExpo' } })
    .add(chars, { y: '0%', '--w': 100, duration: 1300, delay: stagger(80) }, 0)
    .add(slats, { scaleY: 0, duration: 900, delay: stagger(55), ease: steps(6) }, 150)
    .add(corners, { opacity: 1, scale: 1, duration: 900, delay: stagger(70) }, 250)
    .add(copy, { opacity: 1, y: 0, duration: 1000, delay: stagger(70) }, 450)
    .add(rate, {
      i: RATES.length - 1, duration: 1100, ease: steps(4),
      onUpdate: () => { count.textContent = String(RATES[Math.round(rate.i)]); },
    }, 400);

  // ---- the frame changes its contents: slats close, picture swaps, slats open ----
  let current = 0;
  let paused = false;
  let visible = true;
  let busy = false;

  const show = (next: number) => {
    busy = true;
    utils.set(slats, { transformOrigin: '50% 0%' });
    animate(slats, {
      scaleY: [0, 1], duration: 380, delay: stagger(28), ease: 'inQuad',
      onComplete: () => {
        imgs[current].classList.remove('is-on');
        imgs[next].classList.add('is-on');
        current = next;
        spring(imgs[next], { scale: [1.14, 1.02] }, { duration: 3.6, ease: 'linear' });
        scramble(caption, imgs[next].dataset.caption ?? '', reduce);
        utils.set(slats, { transformOrigin: '50% 100%' });
        animate(slats, { scaleY: 0, duration: 650, delay: stagger(32, { from: 'last' }), ease: 'outExpo', onComplete: () => { busy = false; } });
      },
    });
  };

  const tick = () => {
    if (!paused && visible && !busy && !document.hidden) show((current + 1) % imgs.length);
  };
  setTimeout(() => setInterval(tick, 3600), 1400);

  new IntersectionObserver(([e]) => { visible = e.isIntersecting; }).observe(frame);
  pause.addEventListener('click', () => {
    paused = !paused;
    pause.setAttribute('aria-pressed', String(paused));
    pause.textContent = paused ? 'Дальше' : 'Пауза';
  });
  frame.addEventListener('focusin', () => { paused = true; });
  frame.addEventListener('focusout', () => { paused = pause.getAttribute('aria-pressed') === 'true'; });

  // ---- pointer: the frame tilts toward the cursor, the name drifts the other way ----
  if (matchMedia('(pointer: fine)').matches) {
    hero.addEventListener('pointermove', (e) => {
      const r = hero.getBoundingClientRect();
      const nx = (e.clientX - r.left) / r.width - 0.5;
      const ny = (e.clientY - r.top) / r.height - 0.5;
      spring(win, { rotateY: nx * 10, rotateX: -ny * 8 }, { type: 'spring', stiffness: 120, damping: 18 });
      spring(chars, { x: nx * -18 }, { type: 'spring', stiffness: 90, damping: 20 });
    });
    hero.addEventListener('pointerleave', () => {
      spring(win, { rotateY: 0, rotateX: 0 }, { type: 'spring', stiffness: 120, damping: 18 });
      spring(chars, { x: 0 }, { type: 'spring', stiffness: 90, damping: 20 });
    });
  }

  // ---- scroll: the name compresses and lifts away, the frame sinks ----
  scroll((p: number) => {
    if (p < 0.002) return; // leave the intro in charge at the top
    word.style.transform = `translateY(${p * -90}px)`;
    chars.forEach((c, i) => c.style.setProperty('--w', String(100 - p * (25 - i * 3))));
  }, { target: hero, offset: ['start start', 'end start'] });
  scroll(spring(frame, { y: [0, 90], scale: [1, 0.94] }, { ease: 'linear' }), { target: hero, offset: ['start start', 'end start'] });
}
