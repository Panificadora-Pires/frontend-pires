import test from 'node:test';
import assert from 'node:assert/strict';

test('falha no script libera timers e permite tentar carregar Google novamente', async () => {
  const timers = new Set(); let script = null, created = 0;
  globalThis.window = {
    setInterval(fn) { const id = { fn }; timers.add(id); return id; },
    clearInterval(id) { timers.delete(id); },
  };
  globalThis.document = {
    querySelector() { return script; },
    createElement() { created++; return { remove() { script = null; } }; },
    head: { appendChild(el) { script = el; } },
  };
  const { renderGoogleButton } = await import('../src/services/google-identity.js?retry-fixture');
  const element = { isConnected: true, replaceChildren() {} };
  const first = renderGoogleButton({ element, clientId: 'synthetic-client', onCredential() {} });
  script.onerror(); await assert.rejects(first);
  assert.equal(timers.size, 0);
  const second = renderGoogleButton({ element, clientId: 'synthetic-client', onCredential() {} });
  assert.equal(created, 2);
  window.google = { accounts: { id: { initialize() {}, renderButton() {} } } };
  for (const timer of [...timers]) timer.fn();
  await second; assert.equal(timers.size, 0);
});
