import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const base = process.env.ADMIN_BASE || 'http://127.0.0.1:5193';
assert.ok(['localhost', '127.0.0.1'].includes(new URL(base).hostname));
const browser = await chromium.launch({ channel: 'chrome', headless: true });
try {
  const page = await browser.newPage();
  await page.goto(base + '/tests/fixtures/admin-actions.html');
  const buttons = page.locator('.admin-layout button');
  await buttons.first().waitFor();
  const fill = i => buttons.nth(i).locator('.pp-card-action__fill');
  const color = i => fill(i).evaluate(e => ({ bg: getComputedStyle(e).backgroundColor, fg: getComputedStyle(e).color }));
  assert.deepEqual(await color(2), { bg: 'rgb(155, 48, 41)', fg: 'rgb(251, 246, 238)' });
  assert.deepEqual(await color(3), { bg: 'rgb(249, 233, 229)', fg: 'rgb(155, 48, 41)' });
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 900 });
    for (let i = 0; i < 4; i++) {
      await page.mouse.move(0, 800);
      await page.waitForTimeout(420);
      const before = await buttons.nth(i).boundingBox();
      await buttons.nth(i).hover();
      await page.waitForTimeout(120);
      const partial = await fill(i).evaluate(e => getComputedStyle(e).clipPath);
      assert.doesNotMatch(partial, /circle\(0%/);
      await page.waitForTimeout(320);
      const full = await fill(i).evaluate(e => getComputedStyle(e).clipPath);
      assert.notEqual(partial, full);
      assert.deepEqual(await buttons.nth(i).boundingBox(), before, 'Hover não desloca o botão');
    }
  }
  await buttons.nth(4).hover();
  await page.waitForTimeout(420);
  assert.match(await fill(4).evaluate(e => getComputedStyle(e).clipPath), /circle\(0%/);
  await page.mouse.move(0, 800);
  await page.evaluate(() => document.activeElement.blur());
  await page.keyboard.press('Tab');
  assert.equal(await buttons.first().evaluate(e => e.matches(':focus-visible')), true);
  assert.notEqual(await buttons.first().evaluate(e => getComputedStyle(e).outlineStyle), 'none');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await buttons.nth(2).hover();
  assert.ok(parseFloat(await fill(2).evaluate(e => getComputedStyle(e).transitionDuration)) < 0.001);
  assert.equal(await page.locator('.student .pp-card-action__fill').evaluate(e => getComputedStyle(e).backgroundColor), 'rgb(224, 168, 62)');
  console.log('PASS: variantes, expansão intermediária/final, geometria 1440/390, disabled, teclado, reduced motion e aluno preservado.');
} finally { await browser.close(); }
