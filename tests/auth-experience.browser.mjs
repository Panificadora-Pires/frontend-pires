import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { writeFile, mkdir } from 'node:fs/promises';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const base = 'http://127.0.0.1:5173';
const evidence = new URL('../docs/auth-experience/evidence/', import.meta.url);
await mkdir(evidence, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const results = [];
const jwt = id => `fixture.${Buffer.from(JSON.stringify({ user_id: id })).toString('base64url')}.fixture`;
const pair = id => ({ access: jwt(id), refresh: jwt(id) });
const generic = 'Se houver uma conta elegível, você receberá um código por e-mail.';
const gis = `window.google={accounts:{id:{initialize(o){window.gsiCallback=o.callback},renderButton(el){const b=document.createElement('button');b.type='button';b.textContent='Continuar com Google (teste)';b.onclick=()=>window.gsiCallback({credential:'synthetic-google'});el.replaceChildren(b)},disableAutoSelect(){}}}};`;
async function fixture({ width = 1440, height = 960, reducedMotion = 'no-preference', pending = null, googleFailure = false } = {}) {
  const context = await browser.newContext({ viewport: { width, height }, reducedMotion });
  context.setDefaultTimeout(7000);
  const state = { calls: [], errors: [], loginStatus: 200, hold: null, registerStatus: 201, codeStatus: 200, resetStatus: 200, sendStatus: 202, offline: false, emailSent: true };
  await context.addInitScript(({ pending }) => {
    if (pending && !sessionStorage.getItem('__fixture_seeded')) {
      sessionStorage.setItem(pending.key, JSON.stringify(pending.value));
      sessionStorage.setItem('__fixture_seeded', '1');
    }
  }, { pending });
  await context.route('**/*', async route => {
    const request = route.request(), url = new URL(request.url());
    if (url.hostname === 'accounts.google.com') return googleFailure ? route.abort() : route.fulfill({ contentType: 'application/javascript', body: gis });
    if (url.port === '5173') return route.continue();
    if (!url.pathname.startsWith('/api/')) return route.abort();
    const path = url.pathname.slice(4), body = request.postData() ? request.postDataJSON() : null;
    state.calls.push({ path, body });
    if (state.offline) return route.abort('failed');
    if (state.hold && state.hold.path === path) { await state.hold.wait; }
    if (path === '/token/' || path === '/social/google/') return route.fulfill({ status: state.loginStatus, json: state.loginStatus === 200 ? pair(1) : { detail: state.loginStatus === 429 ? 'Muitas tentativas.' : 'E-mail ou senha incorretos ou conta não confirmada.' } });
    if (path === '/usuarios/me/') return route.fulfill({ json: { id: 1, name: 'Pessoa fictícia', email: 'synthetic@example.test', is_staff: false } });
    if (path === '/registro/') return route.fulfill({ status: state.registerStatus, json: state.registerStatus === 201 ? { verification_id: 'activation-fixture', email_sent: state.emailSent, expires_in_seconds: 600 } : { email: ['E-mail já cadastrado.'], phone: ['Telefone já cadastrado.'], password: ['Esta senha é muito comum.'] } });
    if (path === '/senha/esqueci/' || path === '/verificacao/reenviar/') return route.fulfill({ status: state.sendStatus, json: state.sendStatus === 202 ? { verification_id: 'resend-fixture', retry_after_seconds: 60, message: generic } : { detail: 'Aguarde antes de tentar novamente.' } });
    if (path === '/verificacao/confirmar/') return route.fulfill({ status: state.codeStatus, json: state.codeStatus === 200 ? { message: 'E-mail confirmado.' } : { detail: 'Código inválido ou expirado.' } });
    if (path === '/senha/redefinir/') return route.fulfill({ status: state.resetStatus, json: state.resetStatus === 200 ? { message: 'Senha redefinida.' } : { new_password: ['Esta senha é muito comum.'], detail: 'Código inválido ou expirado.' } });
    return route.fulfill({ json: request.method() === 'GET' ? { count: 0, results: [] } : {} });
  });
  const page = await context.newPage();
  page.on('pageerror', error => state.errors.push(error.message));
  return { context, page, state };
}
async function check(name, run) {
  try { await run(); results.push({ name, ok: true }); console.log(`PASS ${name}`); }
  catch (error) { results.push({ name, ok: false, error: error.message }); console.error(`FAIL ${name}: ${error.message}`); }
}
const go = async (page, path) => { await page.goto(base + path); await page.locator('h1').waitFor(); };
const idle = async page => { await page.waitForFunction(() => !document.querySelector('.auth-page-enter-active,.auth-page-leave-active')); };
const submit = page => page.locator('form button[type=submit]').click();
async function loginFields(page) { await page.getByLabel('E-mail', { exact: true }).fill('synthetic@example.test'); await page.getByLabel('Senha', { exact: true }).fill('Pires-Fixture!2026'); }
async function registerFields(page) {
  await page.getByLabel('Nome completo', { exact: true }).fill('Pessoa Fictícia');
  await page.getByLabel('E-mail', { exact: true }).fill('synthetic@example.test');
  await page.getByLabel('Telefone', { exact: true }).fill('47999999999');
  await page.getByLabel('Senha', { exact: true }).fill('Pires-Fixture!2026');
  await page.getByLabel('Confirmar senha', { exact: true }).fill('Pires-Fixture!2026');
}
try {
  await check('URL raiz anônima redireciona login; raiz autenticada sobrevive refresh', async () => {
    const { page, context } = await fixture();
    await page.goto(base + '/'); await page.waitForURL('**/login'); await loginFields(page); await submit(page);
    await page.waitForURL(base + '/'); await page.reload();
    await page.waitForFunction(() => document.querySelector('.student-layout, .student-shell, .app-header, header'));
    assert.equal(await page.locator('.auth-layout').count(), 0);
    await context.close();
  });
  await check('navegação bidirecional, histórico, Google persistente e foco', async () => {
    const { page, context, state } = await fixture();
    await go(page, '/login?redirect=/pedidos');
    const google = await page.locator('.google-auth').elementHandle();
    const beforeX = await page.locator('.auth-layout__photo').evaluate(el => el.getBoundingClientRect().x);
    await page.locator('.auth-create-link').click(); await page.waitForURL('**/cadastro?redirect=/pedidos'); await idle(page);
    assert.equal(await page.locator('form').count(), 1);
    assert.equal(await google.evaluate(el => el.isConnected), true);
    assert.equal(await page.evaluate(() => document.activeElement.tagName), 'H1');
    await page.waitForTimeout(450);
    assert.ok((await page.locator('.auth-layout__photo').evaluate(el => el.getBoundingClientRect().x)) < beforeX - 300);
    await page.goBack(); await idle(page); assert.ok(page.url().includes('/login?redirect='));
    await page.goForward(); await idle(page); assert.ok(page.url().includes('/cadastro?redirect='));
    await page.reload(); await page.locator('h1').waitFor(); assert.equal(await page.locator('form').count(), 1);
    await page.locator('.auth-create-link').click(); await page.waitForURL('**/login?redirect=/pedidos'); await idle(page);
    assert.equal(state.errors.length, 0); await context.close();
  });
  await check('refresh durante a transição e acesso direto', async () => {
    const { page, context } = await fixture(); await go(page, '/login');
    await page.locator('.auth-create-link').click(); await page.waitForURL('**/cadastro'); await page.reload();
    await page.getByLabel('Nome completo', { exact: true }).waitFor(); assert.equal(await page.locator('form').count(), 1);
    await context.close();
  });
  await check('clique repetido durante saída não dispara navegação inversa', async () => {
    const { page, context } = await fixture(); await go(page, '/login');
    await page.locator('.auth-create-link').evaluate(el => el.click());
    await page.waitForURL('**/cadastro');
    await page.locator('.auth-create-link').evaluate(el => el.click());
    assert.ok(page.url().includes('/cadastro'));
    await idle(page); assert.equal(await page.locator('form').count(), 1);
    await context.close();
  });
  for (const status of [400, 401, 403, 429]) await check(`login HTTP ${status}: erro recuperável`, async () => {
    const { page, context, state } = await fixture(); state.loginStatus = status;
    await go(page, '/login'); await loginFields(page); await submit(page);
    await page.locator('[role=alert]').first().waitFor(); assert.ok(page.url().endsWith('/login'));
    assert.equal(await page.locator('form button[type=submit]').isEnabled(), true); await context.close();
  });
  await check('login válido preserva destino interno', async () => {
    const { page, context, state } = await fixture(); await go(page, '/login?redirect=/pedidos');
    await loginFields(page); await submit(page); await page.waitForURL('**/pedidos');
    assert.equal(state.calls.filter(c => c.path === '/token/').length, 1); await context.close();
  });
  await check('submissão duplicada e navegação durante HTTP pendente', async () => {
    const { page, context, state } = await fixture(); let release;
    state.hold = { path: '/token/', wait: new Promise(r => { release = r; }) };
    await go(page, '/login'); await loginFields(page);
    await page.locator('form').evaluate(form => { form.requestSubmit(); form.requestSubmit(); });
    await page.waitForTimeout(100); await page.locator('.auth-create-link').click({ force: true });
    assert.ok(page.url().includes('/login')); assert.equal(state.calls.filter(c => c.path === '/token/').length, 1);
    release(); await page.waitForURL(base + '/'); await context.close();
  });
  await check('falha de rede mantém formulário e permite nova tentativa', async () => {
    const { page, context, state } = await fixture(); state.offline = true;
    await go(page, '/login'); await loginFields(page); await submit(page);
    await page.getByText(/Verifique sua conexão/).waitFor(); assert.equal(await page.getByLabel('E-mail', { exact: true }).inputValue(), 'synthetic@example.test');
    state.offline = false; await submit(page); await page.waitForURL(base + '/'); await context.close();
  });
  for (const method of ['senha', 'Google']) for (const direction of ['Voltar', 'Avançar']) {
    await check(`${method}: ${direction} recusado pelo guard preserva login legítimo`, async () => {
      const { page, context, state } = await fixture({ reducedMotion: 'reduce' });
      const shown = async name => {
        await page.waitForURL(`**/${name}`);
        if (name === 'cadastro') await page.getByLabel('Nome completo', { exact: true }).waitFor();
        else await page.getByRole('heading', { name: /Bom te ver/ }).waitFor();
        await idle(page);
      };
      let release;
      const path = method === 'senha' ? '/token/' : '/social/google/';
      state.hold = { path, wait: new Promise(resolve => { release = resolve; }) };
      try {
        await go(page, '/login');
        await page.locator('.auth-create-link').click(); await shown('cadastro');
        await page.goBack(); await shown('login');
        if (direction === 'Voltar') {
          await page.goForward(); await shown('cadastro');
          await page.locator('.auth-create-link').click(); await shown('login');
        }
        await page.evaluate(() => {
          document.querySelector('#app').__vue_app__.config.globalProperties.$router.afterEach((to, from, failure) => {
            window.historyNavigation = { aborted: Boolean(failure), from: from.fullPath, to: to.fullPath };
          });
        });
        await Promise.all([
          page.waitForRequest(request => new URL(request.url()).pathname.endsWith(path)),
          method === 'senha' ? (async () => { await loginFields(page); await submit(page); })()
            : page.getByRole('button', { name: 'Continuar com Google (teste)' }).click(),
        ]);
        if (direction === 'Avançar') await page.goForward(); else await page.goBack();
        await page.waitForFunction(() => window.historyNavigation);
        assert.equal(await page.evaluate(() => window.historyNavigation.aborted), true);
        await page.waitForURL('**/login');
        assert.equal(await page.evaluate(() => {
          const auth = document.querySelector('#app').__vue_app__.config.globalProperties.$pinia._s.get('auth');
          return auth.carregando && auth.usuario === null;
        }), true);
        release();
        await page.waitForURL(base + '/');
        assert.equal(state.calls.filter(call => call.path === path).length, 1);
        assert.deepEqual(state.errors, []);
      } finally { release(); await context.close(); }
    });
  }
  for (const direction of ['Voltar', 'Avançar']) {
    await check(`Google: ${direction} durante transição invalida HTTP retido`, async () => {
      const { page, context, state } = await fixture();
      let release;
      state.hold = { path: '/social/google/', wait: new Promise(resolve => { release = resolve; }) };
      try {
        await go(page, '/cadastro');
        await page.getByRole('button', { name: 'Continuar com Google (teste)' }).waitFor();
        if (direction === 'Avançar') {
          await page.locator('.auth-create-link').click(); await page.waitForURL('**/login'); await idle(page);
          await page.locator('.auth-create-link').click(); await page.waitForURL('**/cadastro'); await idle(page);
          await page.goBack(); await page.waitForURL('**/login'); await idle(page);
          await page.goBack(); await page.waitForURL('**/cadastro'); await idle(page);
        }
        await page.evaluate(() => {
          const auth = document.querySelector('#app').__vue_app__.config.globalProperties.$pinia._s.get('auth');
          auth.$onAction(({ name, after }) => {
            if (name === 'loginWithGoogle') after(result => { window.historyLoginResult = result; });
          });
        });
        if (direction === 'Voltar') await page.locator('.auth-create-link').evaluate(el => el.click());
        else await page.goForward();
        await page.waitForURL('**/login');
        assert.equal(await page.locator('.auth-page-leave-active').count(), 1);
        await Promise.all([
          page.waitForRequest(request => new URL(request.url()).pathname.endsWith('/social/google/')),
          page.evaluate(() => window.gsiCallback({ credential: 'synthetic-google' })),
        ]);
        if (direction === 'Voltar') await page.goBack(); else await page.goForward();
        await page.waitForURL('**/cadastro');
        await page.getByLabel('Nome completo', { exact: true }).waitFor(); await idle(page);
        release();
        await page.waitForFunction(() => window.historyLoginResult);
        const snapshot = await page.evaluate(async () => {
          const auth = document.querySelector('#app').__vue_app__.config.globalProperties.$pinia._s.get('auth');
          const resource = performance.getEntriesByType('resource').find(entry => new URL(entry.name).pathname === '/src/services/api.js');
          const api = await import(resource.name);
          return { result: window.historyLoginResult, usuario: auth.usuario, carregando: auth.carregando,
            access: api.getAccessToken(), refresh: api.getRefreshToken() };
        });
        assert.equal(snapshot.access, null, 'resposta obsoleta não pode gravar access token');
        assert.equal(snapshot.refresh, null, 'resposta obsoleta não pode gravar refresh token');
        assert.equal(snapshot.usuario, null, 'resposta obsoleta não pode autenticar usuário');
        assert.equal(snapshot.result.ignorado, true);
        assert.equal(snapshot.carregando, false);
        assert.equal(state.calls.filter(call => call.path === '/usuarios/me/').length, 0);
        assert.equal(page.url(), base + '/cadastro');
        assert.deepEqual(state.errors, []);
        state.hold = null;
        await page.locator('.auth-create-link').click(); await page.waitForURL('**/login'); await idle(page);
        await page.getByRole('button', { name: 'Continuar com Google (teste)' }).click();
        await page.waitForURL(base + '/');
      } finally { release(); await context.close(); }
    });
  }
  await check('Google integrado usa credencial sintética e destino', async () => {
    const { page, context, state } = await fixture(); await go(page, '/login?redirect=/pedidos');
    await page.getByRole('button', { name: 'Continuar com Google (teste)' }).click(); await page.waitForURL('**/pedidos');
    assert.equal(state.calls.filter(c => c.path === '/social/google/').length, 1); await context.close();
  });
  await check('falha no carregamento Google mantém login por senha', async () => {
    const { page, context } = await fixture({ googleFailure: true }); await go(page, '/login');
    await page.locator('.google-auth__error').waitFor({ timeout: 14000 }); await loginFields(page); await submit(page);
    await page.waitForURL(base + '/'); await context.close();
  });
  await check('cadastro exige aceite, mostra pendência jurídica e erros do servidor', async () => {
    const { page, context, state } = await fixture(); state.registerStatus = 400;
    await go(page, '/cadastro'); await registerFields(page); await submit(page);
    assert.equal(state.calls.filter(c => c.path === '/registro/').length, 0);
    const checkbox = page.locator('[name=accepted-terms]'); await checkbox.check(); await submit(page);
    await page.getByText('E-mail já cadastrado.', { exact: true }).first().waitFor();
    await page.getByText('Telefone já cadastrado.', { exact: true }).waitFor();
    assert.equal(await page.locator('input[aria-invalid=true]').count() >= 2, true);
    await context.close();
  });
  await check('Google no cadastro exige ciência do aviso jurídico', async () => {
    const { page, context, state } = await fixture(); await go(page, '/cadastro');
    await page.getByRole('button', { name: 'Continuar com Google (teste)' }).click();
    assert.equal(state.calls.filter(c => c.path === '/social/google/').length, 0);
    assert.equal(await page.locator('[name=accepted-terms]').evaluate(el => el === document.activeElement), true);
    await page.locator('[name=accepted-terms]').check();
    await page.getByRole('button', { name: 'Continuar com Google (teste)' }).click(); await page.waitForURL(base + '/');
    await context.close();
  });
  await check('cadastro com falha inicial de entrega conduz à confirmação verdadeira', async () => {
    const { page, context, state } = await fixture(); state.emailSent = false;
    await go(page, '/cadastro'); await registerFields(page); await page.locator('[name=accepted-terms]').check(); await submit(page);
    await page.waitForURL('**/confirmar-email'); await idle(page); await page.getByText(/primeiro envio|envio.*falhou/i).first().waitFor();
    assert.equal(await page.evaluate(() => JSON.parse(sessionStorage.getItem('pp_pending_activation')).requestId), 'activation-fixture');
    assert.ok(!(await page.evaluate(() => JSON.stringify({ ...sessionStorage, ...localStorage })) ).includes('Pires-Fixture'));
    await context.close();
  });
  await check('confirmação inválida/expirada, reenvio/cooldown e sucesso', async () => {
    const { page, context, state } = await fixture({ pending: { key: 'pp_pending_activation', value: { requestId: 'activation-fixture', email: 'synthetic@example.test', emailSent: true } } });
    state.codeStatus = 400; await go(page, '/confirmar-email');
    await page.getByLabel('Código de confirmação', { exact: true }).fill('123456'); await submit(page);
    await page.getByText('Código inválido ou expirado.', { exact: true }).waitFor();
    await page.getByRole('button', { name: 'Reenviar código', exact: true }).click(); await page.getByText(generic, { exact: true }).waitFor();
    assert.equal(await page.getByRole('button', { name: /Reenviar em/ }).isDisabled(), true);
    await page.reload(); await page.getByRole('button', { name: /Reenviar em/ }).waitFor();
    state.codeStatus = 200; await page.getByLabel('Código de confirmação', { exact: true }).fill('654321'); await submit(page);
    await page.waitForURL('**/login?ativada=1'); assert.equal(await page.evaluate(() => sessionStorage.getItem('pp_pending_activation')), null);
    await context.close();
  });
  await check('recuperação genérica, persistência, senha fraca/código expirado e sucesso', async () => {
    const { page, context, state } = await fixture(); await go(page, '/recuperar-senha');
    await page.getByLabel('E-mail', { exact: true }).fill('synthetic@example.test'); await submit(page);
    await page.waitForURL('**/redefinir-senha'); await idle(page); await page.getByText(generic, { exact: true }).waitFor();
    await page.reload(); await page.getByLabel('Código de recuperação', { exact: true }).waitFor();
    await page.getByLabel('Código de recuperação', { exact: true }).fill('123456');
    await page.getByLabel('Nova senha', { exact: true }).fill('Pires-Fixture!2026');
    await page.getByLabel('Confirmar nova senha', { exact: true }).fill('Pires-Fixture!2026');
    state.resetStatus = 400; await submit(page); await page.getByText('Esta senha é muito comum.', { exact: true }).first().waitFor();
    state.resetStatus = 200; await submit(page); await page.waitForURL('**/login?senhaRedefinida=1');
    assert.equal(await page.evaluate(() => sessionStorage.getItem('pp_pending_password_reset')), null); await context.close();
  });
  await check('nova aba sem solicitação não simula recuperação', async () => {
    const { page, context } = await fixture(); await go(page, '/redefinir-senha');
    assert.equal(await page.locator('form').count(), 0); await page.getByRole('link', { name: 'Solicitar código' }).waitFor(); await context.close();
  });
  await check('reduced motion, teclado e senha visível', async () => {
    const { page, context } = await fixture({ width: 390, reducedMotion: 'reduce' }); await go(page, '/login');
    await page.getByLabel('Senha', { exact: true }).fill('Ficticia!'); await page.getByRole('button', { name: 'Mostrar senha', exact: true }).click();
    assert.equal(await page.getByLabel('Senha', { exact: true }).getAttribute('type'), 'text');
    await page.locator('.auth-create-link').focus(); await page.keyboard.press('Enter'); await page.waitForURL('**/cadastro'); await idle(page);
    await page.waitForFunction(() => document.activeElement.tagName === 'H1');
    assert.equal(await page.evaluate(() => document.activeElement.tagName), 'H1');
    assert.equal(await page.locator('.auth-layout__photo').evaluate(el => getComputedStyle(el).display), 'none'); await context.close();
  });
  await check('capturas responsivas cinco telas e pouca altura sem overflow', async () => {
    const { page, context, state } = await fixture();
    await go(page, '/login');
    await page.evaluate(() => {
      sessionStorage.setItem('pp_pending_password_reset', JSON.stringify({ requestId: 'reset-fixture', email: 'synthetic@example.test', message: 'Se houver uma conta elegível, você receberá um código por e-mail.' }));
      sessionStorage.setItem('pp_pending_activation', JSON.stringify({ requestId: 'activation-fixture', email: 'synthetic@example.test', emailSent: true }));
    });
    for (const width of [1440, 1280, 768, 390, 320]) {
      await page.setViewportSize({ width, height: 900 });
      for (const path of ['/login', '/cadastro', '/recuperar-senha', '/redefinir-senha', '/confirmar-email']) {
        await go(page, path); await page.waitForTimeout(150);
        const size = await page.evaluate(() => ({ width: innerWidth, scroll: document.documentElement.scrollWidth }));
        assert.equal(size.width, width); assert.ok(size.scroll <= width, `${path}: overflow em ${width}`);
        await page.screenshot({ path: new URL(`after-${path.slice(1)}-${width}.png`, evidence).pathname.replace(/^\/(.:)/, '$1'), fullPage: true });
      }
    }
    await page.setViewportSize({ width: 1280, height: 520 }); await go(page, '/cadastro');
    await page.locator('.auth-create-link').scrollIntoViewIfNeeded(); assert.equal(await page.locator('.auth-create-link').isVisible(), true);
    await page.screenshot({ path: new URL('after-cadastro-short.png', evidence).pathname.replace(/^\/(.:)/, '$1'), fullPage: true });
    assert.deepEqual(state.errors, []); await context.close();
  });
} finally {
  await browser.close();
  await writeFile(new URL('browser-results.json', evidence), JSON.stringify({ synthetic: true, results }, null, 2));
}
if (results.some(result => !result.ok)) process.exitCode = 1;
