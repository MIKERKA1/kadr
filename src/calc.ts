import { animate } from 'animejs';
import { quote, advise, ZONES, PERIODS, NIGHT_HOURS, rub, type ZoneId, type Period } from './pricing.ts';

const plural = (n: number, one: string, few: string, many: string) => {
  const a = n % 10, b = n % 100;
  if (a === 1 && b !== 11) return one;
  if (a >= 2 && a <= 4 && (b < 12 || b > 14)) return few;
  return many;
};
const hoursText = (h: number) => `${h} ${plural(h, 'час', 'часа', 'часов')}`;
const PERIOD_WORD: Record<Period, string> = { day: 'днём', evening: 'вечером', night: 'ночью' };

function unitsText(zone: ZoneId, people: number, units: number) {
  const z = ZONES[zone];
  if (z.unit === 'seat') return `${units} ${plural(units, 'место', 'места', 'мест')}`;
  return `${units} ${plural(units, 'комната', 'комнаты', 'комнат')} на ${people} ${plural(people, 'человека', 'человек', 'человек')}`;
}

/** Tween a price label so the change reads as a counter, not a jump. */
function tweenSum(el: HTMLElement, to: number, reduce: boolean) {
  const from = Number(el.dataset.v ?? to);
  el.dataset.v = String(to);
  if (reduce || from === to) { el.textContent = rub(to); return; }
  const o = { v: from };
  animate(o, { v: to, duration: 500, ease: 'outExpo', onUpdate: () => { el.textContent = rub(Math.round(o.v)); } });
}

export interface BookingPrefill { zone: ZoneId; period?: Period; hours?: number; people?: number }
let prefillBooking: (p: BookingPrefill) => void = () => {};

export function initPrices(reduce: boolean) {
  // full price table
  const rows = document.querySelector('[data-price-rows]');
  if (rows) {
    rows.replaceChildren(...Object.values(ZONES).map((z) => {
      const tr = document.createElement('tr');
      const cells = [
        z.unit === 'room' ? `${z.name} (комната до ${z.perRoom})` : z.name,
        rub(z.rate.day), rub(z.rate.evening),
        z.bundle3 ? `${rub(z.bundle3.day)} / ${rub(z.bundle3.evening)}` : '—',
        rub(z.night),
      ];
      cells.forEach((text, i) => {
        const cell = document.createElement(i === 0 ? 'th' : 'td');
        if (i === 0) cell.setAttribute('scope', 'row');
        cell.textContent = text;
        tr.append(cell);
      });
      return tr;
    }));
  }

  const form = document.querySelector<HTMLFormElement>('[data-calc]');
  if (!form) return;
  const range = form.querySelector<HTMLInputElement>('input[name="hours"]')!;
  const rangeBox = form.querySelector<HTMLElement>('[data-range]')!;
  const hoursOut = form.querySelector<HTMLElement>('[data-hours-out]')!;
  const peopleOut = form.querySelector<HTMLElement>('[data-people-out]')!;
  const hint = form.querySelector<HTMLElement>('[data-period-hint]')!;
  const ticket = document.querySelector<HTMLElement>('.ticket')!;
  const $ = (s: string) => document.querySelector<HTMLElement>(s)!;
  let people = 1;

  const state = () => ({
    zone: (new FormData(form).get('zone') as ZoneId),
    period: (new FormData(form).get('period') as Period),
    hours: Number(range.value),
  });

  const render = () => {
    const { zone, period, hours } = state();
    people = Math.min(people, ZONES[zone].max);
    peopleOut.textContent = String(people);
    const night = period === 'night';
    range.disabled = night;
    rangeBox.classList.toggle('is-locked', night);
    hoursOut.textContent = night ? `${NIGHT_HOURS}, вся ночь` : String(hours);
    hint.textContent = PERIODS[period].hint;

    const q = quote(zone, period, hours, people);
    $('[data-t-title]').textContent = `${ZONES[zone].name}, ${PERIOD_WORD[period]}`;
    $('[data-t-hours]').textContent = night ? `22:00–08:00, ${hoursText(NIGHT_HOURS)}` : hoursText(q.hours);
    $('[data-t-people]').textContent = unitsText(zone, people, q.units);
    $('[data-t-bundle]').textContent = q.bundle === '3h' ? `Пакет «3 часа»: дешевле на ${rub(q.saved)}`
      : q.bundle === 'night' ? `Ночной пакет: дешевле на ${rub(q.saved)}` : 'Оплата по часам';
    tweenSum($('[data-t-total]'), q.total, reduce);
    $('[data-t-per]').textContent = people > 1 ? `${rub(q.perPerson)} с человека` : 'за одного';
    if (!reduce) { ticket.classList.remove('is-bump'); void ticket.offsetWidth; ticket.classList.add('is-bump'); }
  };

  form.addEventListener('input', render);
  form.addEventListener('submit', (e) => e.preventDefault());
  form.querySelectorAll<HTMLButtonElement>('[data-step]').forEach((b) => b.addEventListener('click', () => {
    const max = ZONES[state().zone].max;
    people = Math.max(1, Math.min(max, people + Number(b.dataset.step)));
    render();
  }));
  render();

  // links elsewhere on the page ("Посчитать Арену") pick a zone here
  document.querySelectorAll<HTMLAnchorElement>('[data-pick-zone]').forEach((a) => a.addEventListener('click', () => {
    const input = form.querySelector<HTMLInputElement>(`input[name="zone"][value="${a.dataset.pickZone}"]`);
    if (input) { input.checked = true; render(); }
  }));

  $('[data-calc-book]').addEventListener('click', () => {
    const s = state();
    prefillBooking({ zone: s.zone, period: s.period, hours: s.hours, people });
  });
}

export function initParty() {
  const out = document.querySelector<HTMLElement>('[data-party-out]');
  if (!out) return;
  const seats = document.querySelector<HTMLElement>('[data-party-seats]')!;
  const zoneEl = document.querySelector<HTMLElement>('[data-party-zone]')!;
  const why = document.querySelector<HTMLElement>('[data-party-why]')!;
  const per = document.querySelector<HTMLElement>('[data-party-per]')!;
  const book = document.querySelector<HTMLAnchorElement>('[data-party-book]')!;
  const cells = Array.from({ length: 10 }, () => {
    const d = document.createElement('span');
    d.className = 'seat';
    return d;
  });
  seats.replaceChildren(...cells);
  let n = 5;

  const render = () => {
    out.textContent = String(n);
    cells.forEach((c, i) => c.classList.toggle('is-on', i < n));
    const a = advise(n);
    const q = quote(a.zone, 'evening', 1, n);
    zoneEl.textContent = ZONES[a.zone].name;
    why.textContent = a.why;
    per.textContent = n === 1 ? `Вечером ${rub(q.total)} в час` : `Вечером ${rub(q.perPerson)} с человека в час`;
    book.textContent = `Забронировать на ${n}`;
  };
  document.querySelectorAll<HTMLButtonElement>('[data-party-step]').forEach((b) => b.addEventListener('click', () => {
    n = Math.max(1, Math.min(10, n + Number(b.dataset.partyStep)));
    render();
  }));
  book.addEventListener('click', () => prefillBooking({ zone: advise(n).zone, people: n }));
  render();
}

/** Night if 22:00–07:59, evening if weekend or 17:00+, otherwise day. */
export function periodFor(date: Date, hour: number): Period {
  if (hour >= 22 || hour < 8) return 'night';
  const wd = date.getDay();
  if (wd === 0 || wd === 6 || hour >= 17) return 'evening';
  return 'day';
}

const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export function initBooking(reduce: boolean) {
  const form = document.querySelector<HTMLFormElement>('[data-book]');
  if (!form) return;
  const f = form.elements as unknown as Record<string, HTMLInputElement & HTMLSelectElement>;
  const sum = document.querySelector<HTMLElement>('[data-book-sum]')!;
  const detail = document.querySelector<HTMLElement>('[data-book-detail]')!;
  const error = document.querySelector<HTMLElement>('[data-book-error]')!;
  const result = document.querySelector<HTMLElement>('[data-book-result]')!;
  const receipt = document.querySelector<HTMLElement>('[data-book-receipt]')!;

  for (let h = 0; h < 24; h++) f.time.add(new Option(`${String(h).padStart(2, '0')}:00`, String(h)));
  for (let h = 1; h <= 12; h++) f.hours.add(new Option(hoursText(h), String(h)));
  const today = new Date();
  f.date.min = iso(today);
  f.date.value = iso(today);
  f.time.value = String(Math.min(21, Math.max(10, today.getHours() + 1)));
  f.hours.value = '3';

  const read = () => {
    const zone = f.zone.value as ZoneId;
    const [y, m, d] = f.date.value.split('-').map(Number);
    const date = new Date(y, (m || 1) - 1, d || 1);
    const hour = Number(f.time.value);
    const period = periodFor(date, hour);
    const hours = period === 'night' ? NIGHT_HOURS : Number(f.hours.value);
    const people = Number(f.people.value);
    return { zone, date, hour, period, hours, people, valid: Boolean(f.date.value) };
  };

  const describe = (s: ReturnType<typeof read>) => {
    const day = s.date.toLocaleDateString('ru-RU', { weekday: 'short', day: 'numeric', month: 'long' });
    const start = s.period === 'night' ? 22 : s.hour;
    const end = s.period === 'night' ? 8 : (s.hour + s.hours) % 24;
    return `${ZONES[s.zone].name} · ${day} · ${String(start).padStart(2, '0')}:00–${String(end).padStart(2, '0')}:00`;
  };

  // Hours run up to 22:00 at most; from 22:00 the night package takes over.
  const capHours = () => {
    const hour = Number(f.time.value);
    const max = hour >= 8 && hour < 22 ? 22 - hour : 12;
    for (const o of f.hours.options) o.disabled = Number(o.value) > max;
    if (Number(f.hours.value) > max) f.hours.value = String(max);
  };

  const update = () => {
    capHours();
    const s = read();
    f.people.max = String(ZONES[s.zone].max);
    f.hours.disabled = s.period === 'night';
    if (!s.valid || !Number.isInteger(s.people) || s.people < 1 || s.people > ZONES[s.zone].max) {
      sum.textContent = '—';
      detail.textContent = `${ZONES[s.zone].name}: от 1 до ${ZONES[s.zone].max} человек`;
      return;
    }
    const q = quote(s.zone, s.period, s.hours, s.people);
    tweenSum(sum, q.total, reduce);
    detail.textContent = `${describe(s)}${s.period === 'night' ? ' (ночной пакет)' : ''}`;
  };

  const check = (): HTMLElement | null => {
    const s = read();
    const bad: [HTMLElement, string][] = [];
    const now = new Date();
    if (!s.valid) bad.push([f.date, 'Выберите дату.']);
    else if (iso(s.date) === iso(now) && s.hour <= now.getHours() && s.period !== 'night') bad.push([f.time, 'Это время уже прошло, выберите позже.']);
    if (!(s.people >= 1 && s.people <= ZONES[s.zone].max)) bad.push([f.people, `В зону «${ZONES[s.zone].name}» помещается от 1 до ${ZONES[s.zone].max} человек.`]);
    if (!f.name.value.trim()) bad.push([f.name, 'Как к вам обращаться?']);
    const digits = f.phone.value.replace(/\D/g, '');
    if (digits.length < 10 || digits.length > 15) bad.push([f.phone, 'Нужен телефон: 10–15 цифр.']);
    for (const el of [f.date, f.time, f.people, f.name, f.phone]) el.removeAttribute('aria-invalid');
    bad.forEach(([el]) => el.setAttribute('aria-invalid', 'true'));
    error.textContent = bad.map(([, m]) => m).join(' ');
    return bad[0]?.[0] ?? null;
  };

  form.addEventListener('input', () => { update(); if (error.textContent) check(); });
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const first = check();
    if (first) { first.focus(); return; }
    const s = read();
    const q = quote(s.zone, s.period, s.hours, s.people);
    const lines: [string, string][] = [
      ['Зона', ZONES[s.zone].name],
      ['Когда', describe(s).split(' · ').slice(1).join(', ')],
      ['Гостей', String(s.people)],
      ['Имя', f.name.value.trim()],
      ['Телефон', f.phone.value.trim()],
      ['К оплате на месте', rub(q.total)],
    ];
    receipt.replaceChildren(...lines.map(([k, v]) => {
      const row = document.createElement('div');
      const a = document.createElement('span'); a.textContent = k;
      const b = document.createElement('span'); b.textContent = v;
      row.append(a, b);
      return row;
    }));
    form.hidden = true;
    result.hidden = false;
    result.focus();
  });
  document.querySelector('[data-book-again]')!.addEventListener('click', () => {
    result.hidden = true;
    form.hidden = false;
    f.name.focus();
  });

  prefillBooking = (p) => {
    f.zone.value = p.zone;
    if (p.people) f.people.value = String(Math.min(p.people, ZONES[p.zone].max));
    if (p.hours) f.hours.value = String(p.hours);
    if (p.period) f.time.value = p.period === 'night' ? '22' : p.period === 'evening' ? '19' : '12';
    update();
  };
  update();
}
