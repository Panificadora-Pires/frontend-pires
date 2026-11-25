import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { ATUALIZADO_EM, CONTATO, VERSAO_DOCUMENTOS, documentosLegais } from '../src/content/documentosLegais.js';

test('os três documentos têm título, resumo acadêmico e seções com conteúdo', () => {
  assert.deepEqual(Object.keys(documentosLegais), ['termos', 'privacidade', 'cookies']);
  for (const doc of Object.values(documentosLegais)) {
    assert.ok(doc.titulo && doc.nota);
    assert.match(doc.resumo, /projeto acadêmico, sem fins lucrativos e sem CNPJ/);
    assert.ok(doc.secoes.length > 0);
    for (const secao of doc.secoes) assert.ok(secao.titulo && (secao.itens?.length || secao.paragrafos?.length));
  }
  assert.match(VERSAO_DOCUMENTOS, /^\d{4}-\d{2}-\d{2}$/);
  assert.ok(ATUALIZADO_EM);
  assert.match(CONTATO, /^[^\s@]+@[^\s@]+\.[^\s@]+$/);
});

test('rotas legais são públicas e o cadastro aponta para os documentos', async () => {
  const router = await readFile(new URL('../src/router/index.js', import.meta.url), 'utf8');
  assert.match(router, /\["termos", "privacidade", "cookies"\]/);
  assert.match(router, /meta: \{ publica: true, documento \}/);
  const cadastro = await readFile(new URL('../src/views/auth/RegisterView.vue', import.meta.url), 'utf8');
  assert.match(cadastro, /Li e aceito os <a href="\/termos" target="_blank" rel="noopener">/);
  assert.match(cadastro, /<a href="\/privacidade" target="_blank" rel="noopener">/);
  assert.doesNotMatch(cadastro, /indisponibilidade/);
});
