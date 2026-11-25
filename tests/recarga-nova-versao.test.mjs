import test from 'node:test';
import assert from 'node:assert/strict';
import { erroDeVersaoAntiga, podeRecarregar } from '../src/utils/recargaNovaVersao.js';

const memoria = () => { const dados = new Map(); return { getItem: k => dados.get(k) ?? null, setItem: (k, v) => dados.set(k, v) }; };

test('recarrega uma vez e bloqueia nova recarga em menos de 10 s', () => {
  const armazenamento = memoria();
  assert.equal(podeRecarregar(armazenamento, 100_000), true);
  assert.equal(podeRecarregar(armazenamento, 105_000), false);
  assert.equal(podeRecarregar(armazenamento, 111_000), true);
});

test('sem acesso ao armazenamento não recarrega', () => {
  const bloqueado = { getItem() { throw new Error('bloqueado'); }, setItem() {} };
  assert.equal(podeRecarregar(bloqueado, 1), false);
});

test('reconhece só erros de arquivo de versão antiga', () => {
  assert.equal(erroDeVersaoAntiga(new TypeError('Failed to fetch dynamically imported module: /assets/A.js')), true);
  assert.equal(erroDeVersaoAntiga(new Error('Unable to preload CSS for /assets/A.css')), true);
  assert.equal(erroDeVersaoAntiga(new Error('Request failed with status code 500')), false);
  assert.equal(erroDeVersaoAntiga(undefined), false);
});
