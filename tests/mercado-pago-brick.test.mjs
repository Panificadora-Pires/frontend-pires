import test from "node:test";
import assert from "node:assert/strict";
import { erroBrickBloqueante, mensagemAvisoBrick } from "../src/utils/mercadoPagoBrick.js";

test("erro não crítico do Brick mantém o formulário montado", () => {
  const erro = {
    type: "non_critical",
    cause: "missing_payment_information",
    message: "no_payment_method_for_provided_bin",
  };
  assert.equal(erroBrickBloqueante(erro), false);
  assert.match(mensagemAvisoBrick(erro), /cartão/i);
});

test("cartão não reconhecido orienta a conferir o número", () => {
  const mensagem = mensagemAvisoBrick({ type: "non_critical", message: "no_payment_method_for_provided_bin" });
  assert.match(mensagem, /número/);
});

test("erro crítico ou sem tipo continua bloqueando o formulário", () => {
  assert.equal(erroBrickBloqueante({ type: "critical", cause: "fields_setup_failed" }), true);
  assert.equal(erroBrickBloqueante({}), true);
  assert.equal(erroBrickBloqueante(undefined), true);
});

test("erro não crítico desconhecido usa orientação genérica", () => {
  assert.equal(
    mensagemAvisoBrick({ type: "non_critical", cause: "algo_novo" }),
    "Confira os dados do cartão e tente novamente.",
  );
});
