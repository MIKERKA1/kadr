// Prices of the fictional club. One source of truth for the calculator,
// the price table, the party advisor and the booking summary.

export type ZoneId = 'arena' | 'bootcamp' | 'solo' | 'console';
export type Period = 'day' | 'evening' | 'night';

export interface Zone {
  id: ZoneId;
  name: string;
  /** seat: price per person; room: price per room of `perRoom` people */
  unit: 'seat' | 'room';
  perRoom: number;
  /** most people the zone takes at once */
  max: number;
  rate: Record<'day' | 'evening', number>;
  /** "3 hours" bundle, only where it exists */
  bundle3?: Record<'day' | 'evening', number>;
  night: number;
}

export const ZONES: Record<ZoneId, Zone> = {
  arena: { id: 'arena', name: 'Арена', unit: 'seat', perRoom: 1, max: 40,
    rate: { day: 150, evening: 220 }, bundle3: { day: 390, evening: 560 }, night: 790 },
  bootcamp: { id: 'bootcamp', name: 'Буткемп', unit: 'room', perRoom: 5, max: 15,
    rate: { day: 1000, evening: 1400 }, night: 4900 },
  solo: { id: 'solo', name: 'Соло-капсула', unit: 'seat', perRoom: 1, max: 9,
    rate: { day: 290, evening: 390 }, bundle3: { day: 750, evening: 1000 }, night: 1290 },
  console: { id: 'console', name: 'PS5-комната', unit: 'room', perRoom: 4, max: 8,
    rate: { day: 500, evening: 700 }, night: 2400 },
};

export const PERIODS: Record<Period, { name: string; hint: string }> = {
  day: { name: 'День', hint: 'будни 08:00–17:00' },
  evening: { name: 'Вечер', hint: 'будни 17:00–22:00, выходные весь день' },
  night: { name: 'Ночь', hint: '22:00–08:00, одним пакетом' },
};

export const NIGHT_HOURS = 10;

export interface Quote {
  total: number;
  perPerson: number;
  hours: number;
  units: number;
  /** what the visitor would pay at the plain hourly rate */
  hourlyTotal: number;
  bundle: 'none' | '3h' | 'night';
  saved: number;
}

export function quote(zoneId: ZoneId, period: Period, hours: number, people: number): Quote {
  const z = ZONES[zoneId];
  if (!Number.isInteger(people) || people < 1 || people > z.max) {
    throw new RangeError(`${z.name}: от 1 до ${z.max} человек`);
  }
  const units = z.unit === 'seat' ? people : Math.ceil(people / z.perRoom);

  if (period === 'night') {
    const total = z.night * units;
    const hourlyTotal = z.rate.evening * NIGHT_HOURS * units;
    return { total, perPerson: Math.ceil(total / people), hours: NIGHT_HOURS, units,
      hourlyTotal, bundle: 'night', saved: hourlyTotal - total };
  }

  if (!Number.isInteger(hours) || hours < 1 || hours > 12) {
    throw new RangeError('от 1 до 12 часов');
  }
  const rate = z.rate[period];
  const hourly = rate * hours;
  // A bundle is applied only when it is cheaper than paying by the hour.
  let best = hourly;
  if (z.bundle3 && hours >= 3) {
    best = Math.min(hourly, Math.floor(hours / 3) * z.bundle3[period] + (hours % 3) * rate);
  }
  const total = best * units;
  const hourlyTotal = hourly * units;
  return { total, perPerson: Math.ceil(total / people), hours, units, hourlyTotal,
    bundle: best < hourly ? '3h' : 'none', saved: hourlyTotal - total };
}

/** Which zone suits a group of this size, and what it costs per person in the evening. */
export function advise(people: number): { zone: ZoneId; why: string } {
  if (people === 1) return { zone: 'solo', why: 'Отдельная капсула с дверью: тишина и свой свет.' };
  if (people <= 4 && people >= 2) {
    return { zone: 'arena', why: 'Места рядом в общем зале: дешевле всего и слышно друг друга.' };
  }
  if (people === 5 || people === 10 || people === 15) {
    return { zone: 'bootcamp', why: 'Своя комната на пятерых: полный состав, никто не мешает.' };
  }
  return { zone: 'arena', why: 'Посадим вас одним рядом в Арене, места подряд.' };
}

export const rub = (n: number) => `${n.toLocaleString('ru-RU')} ₽`;
