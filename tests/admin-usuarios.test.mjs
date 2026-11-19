import test from "node:test";
import assert from "node:assert/strict";

import { iniciaisUsuario, ultimoAcesso } from "../src/utils/adminUsuarios.js";

test("iniciais utilizam nome sem mostrar outros dados", () => {
  assert.equal(iniciaisUsuario("Joana Cristina", "teste@example.com"), "JC");
  assert.equal(iniciaisUsuario("Mariana", "teste@example.com"), "MA");
  assert.equal(iniciaisUsuario("", "cliente.teste@example.com"), "CT");
  assert.equal(iniciaisUsuario(null, null), "—");
});
test("último acesso considera o fuso de São Paulo, ausência e datas inválidas", () => {
  assert.match(ultimoAcesso("2026-11-19T01:30:00Z"), /^18\/11\/2026/);
  assert.equal(ultimoAcesso(null), "Nunca acessou");
  assert.equal(ultimoAcesso("invalido"), "Não informado");
});
