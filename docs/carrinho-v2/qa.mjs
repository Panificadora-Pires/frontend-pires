import { createRequire } from 'node:module';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'C:/Users/arthu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const out = new URL('../prints/carrinho-v2/', import.meta.url);
await mkdir(out, { recursive: true });
const base = process.env.QA_BASE || 'http://127.0.0.1:5187';
const products = [
  { id: 1, nome: 'Coxinha de frango', categoria_nome: 'Salgados', categoria: 1, preco: '8.00', preco_atual: '5.00', em_promocao: true },
  { id: 2, nome: 'Suco de laranja', categoria_nome: 'Bebidas', categoria: 2, preco: '6.00', preco_atual: '6.00' },
  { id: 3, nome: 'Bolo de cenoura com chocolate', categoria_nome: 'Doces', categoria: 3, preco: '7.00', preco_atual: '7.00' },
  { id: 4, nome: 'Pão de queijo', categoria_nome: 'Salgados', categoria: 1, preco: '4.00', preco_atual: '4.00' },
  { id: 5, nome: 'Café coado', categoria_nome: 'Bebidas', categoria: 2, preco: '3.00', preco_atual: '3.00' },
].map(p => ({ ativo: true, estoque: 10, descricao: 'Produto fictício de validação.', ...p }));
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const results = [];
// Cache opcional da máquina de QA; sem ele, usa as fontes públicas do projeto.
const fonts = process.env.QA_FONT_CACHE ? JSON.parse(await readFile(process.env.QA_FONT_CACHE, 'utf8')) : null;
async function fixture(width = 1440, reducedMotion = 'no-preference') {
  const context = await browser.newContext({ viewport: { width, height: 1000 }, reducedMotion });
  const state = { fail: false, delay: 0, stock: 10, requests: [], errors: [] };
  await context.addInitScript(() => localStorage.setItem('pp_access_token', 'synthetic-qa'));
  await context.route('**/*', async route => {
    const url = new URL(route.request().url());
    if (url.hostname === 'fonts.googleapis.com') return fonts ? route.fulfill({ contentType: 'text/css', body: ['Inter', 'Anton', 'Caveat'].map(f => `@font-face{font-family:${f};src:url(${fonts.find(x => x.url.includes('/' + f.toLowerCase() + '/')).url})}`).join('\n') }) : route.continue();
    if (url.hostname === 'fonts.gstatic.com') return fonts ? route.fulfill({ contentType: 'font/woff2', body: Buffer.from(fonts.find(f => f.url === url.href).data, 'base64'), headers: { 'access-control-allow-origin': '*' } }) : route.continue();
    if (url.origin === base && !url.pathname.startsWith('/api')) return route.continue();
    if (!url.pathname.includes('/api/')) return route.abort();
    const path = url.pathname.replace(/^.*\/api/, '');
    state.requests.push({ path, method: route.request().method() });
    let data = [];
    if (path === '/usuarios/me/') data = { id: 99001, name: 'Cliente fictício', email: 'qa@example.invalid', is_staff: false };
    if (path === '/produtos/') data = products;
    if (path === '/categorias/') data = ['Salgados', 'Bebidas', 'Doces'].map((nome, i) => ({ id: i + 1, nome, ativa: true }));
    if (/^\/produtos\/\d+\/$/.test(path)) {
      if (state.delay) await new Promise(r => setTimeout(r, state.delay));
      if (state.fail) return route.fulfill({ status: 503, json: { detail: 'Falha fictícia.' } });
      data = { ...products.find(p => p.id === Number(path.split('/')[2])), estoque: state.stock };
    }
    if (path === '/chat/nao_lidas/') data = { total: 0, pedidos: [] };
    return route.fulfill({ json: data });
  });
  const page = await context.newPage();
  page.on('pageerror', e => state.errors.push(e.message));
  await page.goto(base + '/carrinho');
  await page.locator('.cart-page').waitFor();
  await page.evaluate(() => document.fonts.ready);
  return { context, page, state };
}
async function seed(page, count) {
  await page.evaluate(async ({ products, count }) => {
    const { useCartStore } = await import('/src/stores/cart.js');
    const cart = useCartStore(); cart.limpar();
    for (const p of products.slice(0, count)) cart.adicionar(p);
    const router = document.querySelector('#app').__vue_app__.config.globalProperties.$router;
    await router.push('/cardapio'); await router.push('/carrinho');
  }, { products, count });
  await page.locator('.cart-page').waitFor();
}
async function settled(page) { await page.waitForFunction(() => !document.querySelector('.cart-page__sync')); await page.evaluate(() => document.fonts.ready); }
try {
  for (const width of [1440, 1280, 768, 390, 320]) {
    const { page, context, state } = await fixture(width);
    for (const count of [0, 1, 3]) {
      await seed(page, count); await settled(page);
      assert.equal(await page.evaluate(() => window.innerWidth), width);
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `overflow ${width}/${count}`);
      const metrics = await page.locator('.cart-page').evaluate(el => ({
        title: getComputedStyle(el.querySelector('h1')).fontFamily,
        targets: [...el.querySelectorAll('button,a')].filter(x => x.getBoundingClientRect().height > 0).map(x => ({ text: x.getAttribute('aria-label') || x.textContent.trim(), height: x.getBoundingClientRect().height })),
      }));
      assert.ok(metrics.title.includes('Anton'));
      assert.ok(metrics.targets.every(t => t.height >= 44), JSON.stringify(metrics.targets));
      await page.screenshot({ path: new URL(`${width}-${count}.png`, out).pathname.replace(/^\/(\w:)/, '$1'), fullPage: true });
      results.push({ width, count, ...metrics });
    }
    if (width <= 768) {
      await page.locator('.cart-summary__checkout').scrollIntoViewIfNeeded();
      const visible = await page.locator('.cart-summary__checkout').evaluate(el => {
        const box = el.getBoundingClientRect(), nav = document.querySelector('.student-layout__bottom-nav').getBoundingClientRect();
        const header = document.querySelector('header').getBoundingClientRect();
        return box.bottom < nav.top && box.top > header.bottom;
      });
      assert.ok(visible, 'CTA livre do header e navegação');
      await page.screenshot({ path: new URL(`${width}-cta-viewport.png`, out).pathname.replace(/^\/(\w:)/, '$1') });
      await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
      assert.ok(await page.locator('.chatbot__botao').evaluate(el => el.getBoundingClientRect().bottom < document.querySelector('.student-layout__bottom-nav').getBoundingClientRect().top), 'Ajuda acessível acima da navegação');
    }
    await page.evaluate(async () => document.querySelector('#app').__vue_app__.config.globalProperties.$router.push('/cardapio'));
    await page.locator('.menu-page').waitFor();
    await page.screenshot({ path: new URL(`${width}-cardapio.png`, out).pathname.replace(/^\/(\w:)/, '$1'), fullPage: true });
    assert.deepEqual(state.errors, []);
    await context.close();
  }
  const { page, context, state } = await fixture(390);
  await seed(page, 1); await settled(page);
  assert.match(await page.locator('.cart-summary__total').innerText(), /5,00/);
  await page.getByRole('button', { name: 'Aumentar quantidade de Coxinha de frango', exact: true }).click();
  assert.match(await page.locator('.cart-summary__total').innerText(), /10,00/);
  await page.getByRole('button', { name: 'Diminuir quantidade de Coxinha de frango', exact: true }).click();
  assert.match(await page.locator('.cart-summary__total').innerText(), /5,00/);
  await page.getByRole('button', { name: 'Adicionar Suco de laranja ao carrinho', exact: true }).click();
  assert.equal(await page.locator('.cart-item').count(), 2);
  await page.getByRole('button', { name: 'Remover Suco de laranja do carrinho', exact: true }).click();
  assert.equal(await page.locator('.cart-item').count(), 1);
  page.once('dialog', d => d.accept()); await page.getByRole('button', { name: 'Limpar', exact: true }).click();
  assert.equal(await page.locator('.cart-page__empty').count(), 1);
  state.stock = 0; await seed(page, 1); await settled(page);
  assert.ok(await page.locator('.cart-summary__checkout').isDisabled());
  await page.screenshot({ path: new URL('390-stock.png', out).pathname.replace(/^\/(\w:)/, '$1'), fullPage: true });
  state.stock = 1; await seed(page, 1); await settled(page);
  await page.evaluate(async () => (await import('/src/stores/cart.js')).useCartStore().alterarQuantidade(1, 2));
  assert.ok(await page.locator('.cart-summary__checkout').isDisabled());
  assert.equal(await page.locator('.cart-item').count(), 1);
  state.stock = 10; state.fail = true; await seed(page, 1); await settled(page);
  assert.ok(await page.locator('.cart-summary__checkout').isDisabled());
  assert.match(await page.locator('[role=alert]').innerText(), /atualizar/);
  await page.screenshot({ path: new URL('390-error.png', out).pathname.replace(/^\/(\w:)/, '$1'), fullPage: true });
  state.fail = false; state.delay = 1200; await seed(page, 1);
  await page.locator('.cart-page__sync').waitFor();
  assert.ok(await page.locator('.cart-summary__checkout').isDisabled());
  await page.screenshot({ path: new URL('390-loading.png', out).pathname.replace(/^\/(\w:)/, '$1'), fullPage: true });
  await settled(page); state.delay = 0;
  await page.locator('.cart-summary__checkout').click(); await page.waitForURL('**/checkout');
  assert.ok(state.requests.every(r => r.method === 'GET'), 'Nenhuma mutação financeira');
  results.push({ functional: 'promoção, quantidade, recomendação, remoção, limpeza, estoque, erro, loading, navegação checkout', errors: state.errors });
  await context.close();
  const reduced = await fixture(320, 'reduce'); await seed(reduced.page, 1); await settled(reduced.page);
  await reduced.page.locator('.cart-page__continue').focus();
  await reduced.page.keyboard.press('Tab');
  assert.equal(await reduced.page.evaluate(() => document.activeElement.textContent.trim()), 'Limpar');
  await reduced.page.locator('.cart-summary__checkout').focus();
  assert.equal(await reduced.page.locator('.cart-summary__checkout').evaluate(el => getComputedStyle(el).transitionDuration), '0s');
  assert.notEqual(await reduced.page.locator('.cart-summary__checkout').evaluate(el => getComputedStyle(el).outlineStyle), 'none');
  await reduced.context.close();
  function contrast(a, b) {
    const luminance = hex => {
      const c = hex.match(/../g).map(v => parseInt(v, 16) / 255).map(v => v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4);
      return c[0] * .2126 + c[1] * .7152 + c[2] * .0722;
    };
    const values = [luminance(a), luminance(b)].sort((x, y) => y - x);
    return (values[0] + .05) / (values[1] + .05);
  }
  const ratios = { body: contrast('2a160b', 'fbf6ee'), secondary: contrast('6b5641', 'fbf6ee'), note: contrast('7f4f14', 'fbf6ee'), summary: contrast('c9bba6', '2a160b'), cta: contrast('2a160b', 'e0a83e') };
  assert.ok(Object.values(ratios).every(ratio => ratio >= 4.5));
  results.push({ contrast: ratios });
  await writeFile(new URL('./results.json', import.meta.url), JSON.stringify(results, null, 2));
  console.log('PASS: 15 composições, 5 referências Cardápio, fluxos funcionais, foco e movimento reduzido.');
} finally { await browser.close(); }
