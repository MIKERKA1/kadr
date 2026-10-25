// The live thing: a target crossing a lane, drawn only at the moments a monitor of
// the chosen refresh rate would show it. Marks are the frames of the last 0.1 s.

const COMMON = [30, 48, 50, 60, 72, 75, 90, 100, 120, 144, 165, 170, 175, 180, 200, 240, 280, 360, 480, 500, 540];
const SPEED = 900;     // px per second across an 800px-wide lane
const WINDOW = 0.1;    // seconds of history shown as marks

/** Median frame interval over ~40 animation frames, snapped to a known refresh rate. */
export function measureHz(): Promise<number> {
  return new Promise((resolve) => {
    const deltas: number[] = [];
    let last = 0;
    const step = (t: number) => {
      if (last) deltas.push(t - last);
      last = t;
      if (deltas.length < 40) requestAnimationFrame(step);
      else {
        deltas.sort((a, b) => a - b);
        const hz = 1000 / deltas[deltas.length >> 1];
        resolve(COMMON.reduce((a, b) => (Math.abs(b - hz) < Math.abs(a - hz) ? b : a)));
      }
    };
    requestAnimationFrame(step);
  });
}

function drawLane(c: HTMLCanvasElement, rate: number, t: number, colour: string, ghost: string) {
  const ctx = c.getContext('2d');
  if (!ctx) return;
  const w = c.width, h = c.height, s = w / 800;
  ctx.clearRect(0, 0, w, h);
  const span = 800 + 120;
  const pos = (time: number) => (((time * SPEED) % span) - 60) * s;
  const shown = Math.floor(t * rate) / rate;          // the frame on screen right now
  for (let k = 0; k < rate * WINDOW; k++) {
    const tf = shown - k / rate;
    const age = k / (rate * WINDOW);
    ctx.globalAlpha = 0.85 - age * 0.75;
    ctx.fillStyle = ghost;
    ctx.fillRect(pos(tf) - 1.5 * s, h * 0.18, 3 * s, h * 0.64);
  }
  ctx.globalAlpha = 1;
  ctx.fillStyle = colour;
  const x = pos(shown), size = 30 * s;
  ctx.fillRect(x - size / 2, h / 2 - size / 2, size, size);
  ctx.fillStyle = '#0d0b0e';
  ctx.fillRect(x - 3 * s, h / 2 - 3 * s, 6 * s, 6 * s);
}

export function initHz(reduce: boolean) {
  const root = document.querySelector<HTMLElement>('#hz');
  if (!root) return;
  const ref = root.querySelector<HTMLCanvasElement>('[data-lane="60"]')!;
  const pick = root.querySelector<HTMLCanvasElement>('[data-lane="pick"]')!;
  const label = root.querySelector<HTMLElement>('[data-rate-label]')!;
  const readout = root.querySelector<HTMLElement>('[data-hz-readout]')!;
  const buttons = [...root.querySelectorAll<HTMLButtonElement>('[data-rate]')];
  let rate = 540;

  const fit = () => {
    for (const c of [ref, pick]) {
      const dpr = Math.min(devicePixelRatio || 1, 2);
      c.width = Math.round(c.clientWidth * dpr);
      c.height = Math.round(c.width * 96 / 800);
    }
  };
  const frame = (t: number) => {
    drawLane(ref, 60, t, '#efe9e1', '#efe9e1');
    drawLane(pick, rate, t, '#ff3d8b', '#ff3d8b');
  };

  const select = (b: HTMLButtonElement) => {
    rate = Number(b.dataset.rate);
    buttons.forEach((x) => x.setAttribute('aria-checked', String(x === b)));
    label.textContent = String(rate);
    pick.setAttribute('aria-label', `Цель на мониторе ${rate} Гц: ${Math.round(rate * WINDOW)} положений за десятую долю секунды`);
    readout.textContent = `За десятую долю секунды: 6 кадров против ${Math.round(rate * WINDOW)}.`;
    if (reduce) frame(0.42);
  };
  buttons.forEach((b) => b.addEventListener('click', () => select(b)));
  root.querySelector('[role="radiogroup"]')!.addEventListener('keydown', (e) => {
    const k = (e as KeyboardEvent).key;
    if (k !== 'ArrowRight' && k !== 'ArrowLeft') return;
    const i = buttons.findIndex((b) => b.getAttribute('aria-checked') === 'true');
    const next = buttons[(i + (k === 'ArrowRight' ? 1 : -1) + buttons.length) % buttons.length];
    next.focus();
    select(next);
  });

  fit();
  addEventListener('resize', () => { fit(); if (reduce) frame(0.42); });

  // Measure the visitor's own screen once the page has settled.
  const out = root.querySelector<HTMLElement>('[data-hz-measured]')!;
  setTimeout(() => measureHz().then((hz) => { out.textContent = String(hz); }), 1800);

  if (reduce) { frame(0.42); return; }

  let running = false;
  const loop = (now: number) => {
    if (!running) return;
    frame(now / 1000);
    requestAnimationFrame(loop);
  };
  new IntersectionObserver(([e]) => {
    const was = running;
    running = e.isIntersecting;
    if (running && !was) requestAnimationFrame(loop);
  }).observe(root);
}
