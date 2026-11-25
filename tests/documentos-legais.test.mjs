import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { ATUALIZADO_EM, CONTATO, VERSAO_DOCUMENTOS, documentosLegais } from '../src/content/documentosLegais.js';

const lerNormalizado = async caminho => (await readFile(new URL(caminho, import.meta.url), 'utf8')).replace(/\s+/g, ' ').replace(/\s*>/g, '>').replace(/\(\s+/g, '(').replace(/,\s*\)/g, ')');

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
  const router = await lerNormalizado('../src/router/index.js');
  assert.match(router, /\[\s?"termos", "privacidade", "cookies",?\s?\]/);
  assert.match(router, /meta: \{ publica: true, documento \}/);
  const cadastro = await lerNormalizado('../src/views/auth/RegisterView.vue');
  assert.match(cadastro, /Li e aceito os <a href="\/termos" target="_blank" rel="noopener">/);
  assert.match(cadastro, /<a href="\/privacidade" target="_blank" rel="noopener">/);
  assert.doesNotMatch(cadastro, /indisponibilidade/);
});
