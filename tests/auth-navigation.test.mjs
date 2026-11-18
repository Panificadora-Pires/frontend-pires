import test from 'node:test';
import assert from 'node:assert/strict';
import { safeAuthRedirect } from '../src/utils/auth-navigation.js';
test('destino interno mantém query e hash', () => {
  assert.equal(safeAuthRedirect('/checkout?origem=cardapio#resumo'), '/checkout?origem=cardapio#resumo');
});
for (const value of [null, ['//evil.test'], 'https://evil.test', '//evil.test', '/\\evil.test', '/%5cevil.test', '/%2f%2fevil.test', '/%252f%252fevil.test', '/login', '/cadastro?redirect=/login', '/redefinir-senha', '/a/../login', '/x\n', '/%0aevil']) {
  test(`destino inseguro/circular rejeitado: ${JSON.stringify(value)}`, () => assert.equal(safeAuthRedirect(value), ''));
}
