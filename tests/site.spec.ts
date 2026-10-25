import { test, expect, type Page } from '@playwright/test';

const tomorrow = () => {
  const d = new Date(Date.now() + 86_400_000);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const isMobile = (page: Page) => (page.viewportSize()?.width ?? 1440) < 900;

test.describe('КАДР', () => {
  let errors: string[];
  test.beforeEach(async ({ page }) => {
    errors = [];
    page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
    page.on('pageerror', (e) => errors.push(String(e)));
    await page.goto('/');
  });
  test.afterEach(() => { expect(errors, errors.join('\n')).toEqual([]); });

  test('first screen says what, where, how much, and offers booking', async ({ page }) => {
    await expect(page.getByRole('heading', { level: 1 })).toContainText('КАДР');
    await expect(page.locator('.hero__lead')).toContainText('Плёночный проезд');
    await expect(page.locator('.hero__price')).toContainText('150');
    await expect(page.getByRole('link', { name: 'Выбрать место', exact: true })).toBeVisible();
  });

  test('no sideways scroll anywhere on the page', async ({ page }) => {
    for (const y of [0, 0.25, 0.5, 0.75, 1]) {
      await page.evaluate((f) => scrollTo(0, document.body.scrollHeight * f), y);
      await page.waitForTimeout(150);
      const over = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
      expect(over).toBeLessThanOrEqual(0);
    }
  });

  test('hero animates: letters move and the frame swaps pictures', async ({ page }) => {
    const ch = page.locator('.hero__word .ch').first();
    const t0 = await ch.evaluate((el) => getComputedStyle(el).transform);
    await page.waitForTimeout(250);
    const t1 = await ch.evaluate((el) => getComputedStyle(el).transform);
    expect(t0).not.toBe(t1);
    await expect(page.locator('[data-hero-caption]')).not.toHaveText('Арена: 40 мест в общем зале', { timeout: 9000 });
  });

  test('refresh-rate demo responds to the chosen rate', async ({ page }) => {
    await page.locator('#hz').scrollIntoViewIfNeeded();
    await page.getByRole('radio', { name: '144' }).click();
    await expect(page.locator('[data-hz-readout]')).toHaveText('За десятую долю секунды: 6 кадров против 14.');
    await expect(page.locator('[data-hz-measured]')).toHaveText(/^\d+$/, { timeout: 6000 });
  });

  test('calculator: rooms, people, bundles and night lock', async ({ page }) => {
    await page.locator('#price').scrollIntoViewIfNeeded();
    await page.locator('.calc label', { hasText: 'Буткемп' }).click();
    await page.locator('.calc label', { hasText: 'Вечер' }).click();
    const plus = page.getByRole('button', { name: 'Больше человек' }).first();
    for (let i = 0; i < 5; i++) await plus.click();
    await expect(page.locator('[data-t-people]')).toHaveText('2 комнаты на 6 человек');
    await expect(page.locator('[data-t-total]')).toHaveText(/8\s400 ₽/);
    await page.locator('.calc label', { hasText: 'Ночь' }).click();
    await expect(page.locator('.calc input[name="hours"]')).toBeDisabled();
    await expect(page.locator('[data-t-total]')).toHaveText(/9\s800 ₽/);
    await page.locator('.calc label', { hasText: 'Арена' }).click();
    await page.locator('.calc label', { hasText: 'День' }).click();
    await expect(page.locator('[data-t-bundle]')).toContainText('Пакет «3 часа»');
  });

  test('calculator hands its choice to the booking form', async ({ page }) => {
    await page.locator('#price').scrollIntoViewIfNeeded();
    await page.locator('.calc label', { hasText: 'Соло' }).click();
    await page.getByRole('link', { name: 'Забронировать так' }).click();
    await expect(page.locator('.book select[name="zone"]')).toHaveValue('solo');
  });

  test('booking: validation, then an honest demo result', async ({ page }) => {
    await page.locator('#booking').scrollIntoViewIfNeeded();
    await page.getByRole('button', { name: 'Проверить бронь' }).click();
    await expect(page.locator('[data-book-error]')).toContainText('Как к вам обращаться?');
    await page.locator('.book input[name="date"]').fill(tomorrow());
    await page.locator('.book select[name="time"]').selectOption('19');
    await page.locator('.book input[name="people"]').fill('2');
    await page.locator('.book input[name="name"]').fill('Аня');
    await page.locator('.book input[name="phone"]').fill('+7 900 123-45-67');
    await expect(page.locator('[data-book-sum]')).toHaveText(/\d ₽/);
    await page.getByRole('button', { name: 'Проверить бронь' }).click();
    const result = page.locator('[data-book-result]');
    await expect(result).toBeVisible();
    await expect(result).toContainText('Демо: бронь не отправлена');
    await expect(result).toContainText('Аня');
    await page.getByRole('button', { name: 'Изменить бронь' }).click();
    await expect(page.locator('[data-book]')).toBeVisible();
  });

  test('zones: tabs follow scroll on desktop and swipe on phones', async ({ page }) => {
    const tab = page.getByRole('tab', { name: 'PS5' });
    await page.locator('#zones').scrollIntoViewIfNeeded();
    await tab.click();
    await expect(tab).toHaveAttribute('aria-selected', 'true', { timeout: 5000 });
    if (!isMobile(page)) {
      await expect(page.locator('#z-console')).toBeVisible();
      await expect(page.locator('#z-arena .zone__info')).toBeHidden();
    }
  });

  test('party size changes the advice', async ({ page }) => {
    await page.locator('#party').scrollIntoViewIfNeeded();
    for (let i = 0; i < 4; i++) await page.locator('[data-party-step="-1"]').click();
    await expect(page.locator('[data-party-out]')).toHaveText('1');
    await expect(page.locator('[data-party-zone]')).toHaveText('Соло-капсула');
    await expect(page.locator('.seat.is-on')).toHaveCount(1);
  });

  test('gear rows move the aim', async ({ page }) => {
    await page.locator('#gear').scrollIntoViewIfNeeded();
    const row = page.getByRole('button', { name: /Видеокарта RTX 5080/ });
    await row.click();
    await expect(row).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('[data-gear-zoom]')).toHaveClass(/is-zoomed/);
  });

  test('every image loads', async ({ page }) => {
    await page.evaluate(async () => {
      for (const img of document.querySelectorAll('img')) img.loading = 'eager';
      await Promise.all([...document.images].map((i) => i.complete ? null : new Promise((r) => { i.onload = i.onerror = r; })));
    });
    const broken = await page.evaluate(() => [...document.images].filter((i) => !i.naturalWidth).map((i) => i.src));
    expect(broken).toEqual([]);
  });

  test('phone menu opens and closes with Escape', async ({ page }) => {
    test.skip(!isMobile(page), 'phone only');
    await page.getByRole('button', { name: 'Меню' }).click();
    await expect(page.locator('#menu')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.locator('#menu')).toBeHidden();
    await expect(page.getByRole('button', { name: 'Меню' })).toBeFocused();
  });
});

test('reduced motion keeps every section readable', async ({ browser }) => {
  const ctx = await browser.newContext({ reducedMotion: 'reduce', viewport: { width: 1280, height: 800 } });
  const page = await ctx.newPage();
  await page.goto('http://localhost:4411/');
  const hidden = await page.evaluate(() => [...document.querySelectorAll('[data-r]')].filter((e) => getComputedStyle(e).opacity === '0').length);
  expect(hidden).toBe(0);
  await expect(page.locator('[data-hero-pause]')).toBeHidden();
  await ctx.close();
});
