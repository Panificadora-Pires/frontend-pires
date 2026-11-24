import test from "node:test";
import assert from "node:assert/strict";
import { filtrarCategoriasAdmin, indicadoresCategorias } from "../src/utils/adminCategorias.js";

const categorias = [
  { id: 3, nome: "Bebidas", descricao: "Sucos e cafés", slug: "bebidas", ordem: 2, ativa: true },
  { id: 2, nome: "Doces", descricao: "Bolos e pães doces", slug: "doces", ordem: 1, ativa: false },
  { id: 1, nome: "Salgados", descricao: "Coxinhas", slug: "salgados", ordem: 1, ativa: true },
];

test("categorias ordenadas por ordem e nome sem modificar a lista original", () => {
  const original = categorias.map(c => c.id);
  assert.deepEqual(filtrarCategoriasAdmin(categorias).map(c => c.id), [2, 1, 3]);
  assert.deepEqual(categorias.map(c => c.id), original);
});

test("busca considera acentos, descrição e slug", () => {
  assert.deepEqual(filtrarCategoriasAdmin(categorias, { busca: "cafe" }).map(c => c.id), [3]);
  assert.deepEqual(filtrarCategoriasAdmin(categorias, { busca: "PAES" }).map(c => c.id), [2]);
  assert.deepEqual(filtrarCategoriasAdmin(categorias, { busca: "SALGADOS" }).map(c => c.id), [1]);
});

test("filtro de situação e busca funcionam juntos", () => {
  assert.deepEqual(filtrarCategoriasAdmin(categorias, { situacao: "inativa" }).map(c => c.id), [2]);
  assert.deepEqual(filtrarCategoriasAdmin(categorias, { situacao: "ativa", busca: "doces" }), []);
});

test("indicadores são globais e preservam vazio", () => {
  assert.deepEqual(indicadoresCategorias(categorias), { total: 3, ativas: 2, inativas: 1 });
  assert.deepEqual(indicadoresCategorias([]), { total: 0, ativas: 0, inativas: 0 });
});
