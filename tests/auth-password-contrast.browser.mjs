// Chrome real, dados sintéticos e nenhuma chamada ao backend ou Google real.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdir, writeFile } from 'node:fs/promises';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const phase = process.env.AUTH_CONTRAST_PHASE || 'after';
const folder = 'docs/auth-experience/password-contrast';
await mkdir(folder, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const results = [];
const luminance = rgb => rgb.map(v => v / 255).map(v => v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4).reduce((sum, v, i) => sum + v * [.2126, .7152, .0722][i], 0);
const rgb = value => value.match(/[\d.]+/g).slice(0, 3).map(Number);
const ratio = (a, b) => { const values = [luminance(a), luminance(b)].sort((x, y) => y - x); return (values[0] + .05) / (values[1] + .05); };
async function measure(locator) {
  return locator.evaluate(el => {
    const style = getComputedStyle(el);
    let background = 'rgb(251, 246, 238)', opacity = 1, foundBackground = false;
    for (let parent = el; parent; parent = parent.parentElement) {
      const current = getComputedStyle(parent);
      opacity *= Number(current.opacity);
      if (!foundBackground && current.backgroundColor !== 'rgba(0, 0, 0, 0)') { background = current.backgroundColor; foundBackground = true; }
    }
    return { color: style.color, background, opacity, outline: style.outlineColor, outlineStyle: style.outlineStyle, focusVisible: el.matches(':focus-visible'), disabled: el.matches(':disabled'), pressed: el.getAttribute('aria-pressed'), label: el.getAttribute('aria-label') };
  });
}
async function record(locator, info, minimum = 3) {
  const sample = await measure(locator), background = rgb(sample.background);
  const foreground = rgb(sample.color).map((v, i) => v * sample.opacity + background[i] * (1 - sample.opacity));
  const contrast = ratio(foreground, background);
  results.push({ ...info, ...sample, contrast: +contrast.toFixed(2), ok: contrast >= minimum });
  return sample;
}
try {
  for (const width of [1440, 390]) {
    const context = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: 'reduce', isMobile: width === 390, hasTouch: width === 390 });
    context.setDefaultTimeout(8000);
    await context.addInitScript(() => sessionStorage.setItem('pp_pending_password_reset', JSON.stringify({ requestId: 'synthetic', email: 'synthetic@example.test' })));
    await context.route('**/*', route => new URL(route.request().url()).port === '5173' ? route.continue() : route.abort());
    const page = await context.newPage();
    for (const route of ['login', 'cadastro', 'redefinir-senha']) {
      await page.goto(`http://localhost:5173/${route}`);
      const toggles = page.locator('.pp-field__toggle');
      await toggles.first().waitFor();
      for (let field = 0; field < await toggles.count(); field++) {
        const toggle = toggles.nth(field), input = toggle.locator('..').locator('input');
        await input.fill('Senha-sintetica!2026');
        for (const visible of [false, true]) {
          if ((await input.getAttribute('type') === 'text') !== visible) await toggle.click();
          assert.equal(await input.getAttribute('type'), visible ? 'text' : 'password');
          assert.equal(await toggle.getAttribute('aria-pressed'), String(visible));
          assert.equal(await toggle.getAttribute('aria-label'), visible ? 'Ocultar senha' : 'Mostrar senha');
          const info = { width, route, field, visible };
          await toggle.evaluate(el => el.blur()); await page.mouse.move(0, 0);
          await record(toggle, { ...info, state: 'normal' });
          await toggle.hover(); await record(toggle, { ...info, state: 'hover' });
          if (route === 'login' && !visible) await page.screenshot({ path: `${folder}/${phase}-hover-${width}.png`, fullPage: true });
          await page.mouse.move(0, 0); await input.focus(); await page.keyboard.press('Tab');
          const focused = await record(toggle, { ...info, state: 'focus-visible' });
          assert.equal(focused.focusVisible, true);
          assert.notEqual(focused.outlineStyle, 'none');
          assert.ok(ratio(rgb(focused.outline), rgb(focused.background)) >= 3);
          await page.keyboard.press('Space'); assert.equal(await input.getAttribute('type'), visible ? 'password' : 'text');
          await page.keyboard.press('Space'); assert.equal(await input.getAttribute('type'), visible ? 'text' : 'password');
          await toggle.hover(); await page.mouse.down(); await record(toggle, { ...info, state: 'active' }); await page.mouse.up();
          const control = toggle.locator('..');
          await page.locator('fieldset').evaluate(el => { el.disabled = true; });
          const disabled = await record(toggle, { ...info, state: 'disabled-fieldset' }); assert.equal(disabled.disabled, true);
          await toggle.evaluate(el => el.click()); assert.equal(await input.getAttribute('type'), visible ? 'password' : 'text');
          await control.evaluate(el => el.classList.add('pp-field__control--disabled'));
          await record(toggle, { ...info, state: 'disabled-dimmed' });
          await control.evaluate(el => el.classList.remove('pp-field__control--disabled'));
          await page.locator('fieldset').evaluate(el => { el.disabled = false; });
        }
        if (width === 390) {
          const previousType = await input.getAttribute('type');
          await toggle.tap();
          assert.notEqual(await input.getAttribute('type'), previousType);
          assert.equal(await input.inputValue(), 'Senha-sintetica!2026');
        }
      }
      const others = page.locator('.auth-link, .auth-layout__back, .auth-layout .pp-btn, .auth-checkbox a, .auth-resend:not(:disabled)');
      for (let i = 0; i < await others.count(); i++) {
        await others.nth(i).hover(); await record(others.nth(i), { width, route, state: 'other-hover', text: (await others.nth(i).innerText()).trim() }, 4.5);
      }
      // Réplica dos atributos scoped fora do shell: o tema legado continua proprietário.
      // Hover por mouse só é exigido no contexto desktop; mobile já valida toque acima.
      if (width === 1440) {
        const outside = await toggles.first().evaluate(el => {
          const clone = el.cloneNode(true); clone.id = 'outside-auth-toggle'; clone.style.position = 'fixed'; clone.style.top = '0'; clone.style.left = '0'; clone.style.zIndex = '10000'; document.body.append(clone);
          return true;
        });
        assert.equal(outside, true);
        await page.locator('#outside-auth-toggle').hover();
        await page.waitForFunction(() => document.getElementById('outside-auth-toggle')?.matches(':hover'));
        const legacy = await measure(page.locator('#outside-auth-toggle'));
        assert.equal(legacy.color, 'rgb(243, 233, 216)');
        await page.locator('#outside-auth-toggle').evaluate(el => el.remove());
      }
    }
    await context.close();
  }
} finally {
  await browser.close();
  await writeFile(`${folder}/${phase}-results.json`, JSON.stringify({ phase, results }, null, 2));
}
const failures = results.filter(result => !result.ok);
console.log(JSON.stringify({ phase, checks: results.length, failures: failures.length, minimumContrast: Math.min(...results.map(r => r.contrast)), failedStates: [...new Set(failures.map(r => r.state))] }));
assert.equal(failures.length, 0, 'Contraste insuficiente nos estados registrados');
