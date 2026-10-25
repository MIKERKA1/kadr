import { test } from 'node:test';
import assert from 'node:assert/strict';
import { quote, advise, ZONES } from './pricing.ts';

test('arena by the hour, day', () => {
  const q = quote('arena', 'day', 2, 1);
  assert.equal(q.total, 300);
  assert.equal(q.bundle, 'none');
});

test('3-hour bundle applied only when cheaper', () => {
  const q = quote('arena', 'evening', 4, 2);
  // 560 + 220 = 780 per seat, against 880 hourly
  assert.equal(q.total, 1560);
  assert.equal(q.bundle, '3h');
  assert.equal(q.saved, 200);
});

test('every bundle in the price list is cheaper than its hours', () => {
  for (const z of Object.values(ZONES)) {
    for (const p of ['day', 'evening'] as const) {
      if (z.bundle3) assert.ok(z.bundle3[p] < z.rate[p] * 3, `${z.id} ${p}`);
    }
    assert.ok(z.night < z.rate.evening * 10, `${z.id} night`);
  }
});

test('rooms are counted by capacity', () => {
  const q = quote('bootcamp', 'evening', 2, 6);
  assert.equal(q.units, 2);
  assert.equal(q.total, 5600);
  assert.equal(q.perPerson, 934);
});

test('night is a fixed package', () => {
  const q = quote('solo', 'night', 1, 1);
  assert.equal(q.total, 1290);
  assert.equal(q.hours, 10);
});

test('limits are enforced', () => {
  assert.throws(() => quote('console', 'day', 1, 9), RangeError);
  assert.throws(() => quote('arena', 'day', 0, 1), RangeError);
});

test('advice by group size', () => {
  assert.equal(advise(1).zone, 'solo');
  assert.equal(advise(5).zone, 'bootcamp');
  assert.equal(advise(3).zone, 'arena');
});
