import test from "node:test";
import assert from "node:assert/strict";
import {
  descreverEtapaPagamento,
  descreverEtapaPedido,
  etapaPagamentoAprovada,
} from "../src/utils/checkoutProgress.js";

test("antes do checkout exibe seleção, não conclusão", () => {
  assert.equal(descreverEtapaPagamento(), "Escolha como pagar");
  assert.equal(descreverEtapaPedido(null), "Próxima etapa");
});

test("Pix pendente e processando nunca aparecem como pagos", () => {
  for (const status of ["pendente", "processando"]) {
    assert.equal(descreverEtapaPagamento({
      temResultado: true, forma: "pix", status,
    }), "Aguardando Pix");
    assert.equal(etapaPagamentoAprovada(status), false);
  }
});

test("dinheiro é registrado para pagamento na retirada", () => {
  assert.equal(descreverEtapaPagamento({
    temResultado: true, forma: "dinheiro", status: "pendente",
  }), "Na retirada");
  assert.equal(descreverEtapaPedido(42), "Pedido registrado");
});

test("aprovado só quando o backend informa status aprovado", () => {
  assert.equal(descreverEtapaPagamento({
    temResultado: true, forma: "pix", status: "aprovado",
  }), "Pagamento confirmado");
  assert.equal(etapaPagamentoAprovada("aprovado"), true);
});

test("3DS e falhas conservam a semântica financeira", () => {
  assert.equal(descreverEtapaPagamento({
    temResultado: true, forma: "cartao", status: "pendente", temChallenge: true,
  }), "Verifique no banco");
  for (const status of ["recusado", "cancelado", "reembolsado", "erro"]) {
    assert.equal(descreverEtapaPagamento({
      temResultado: true, forma: "cartao", status,
    }), "Não concluído");
  }
  assert.equal(descreverEtapaPagamento({
    temResultado: true, forma: "card", status: "processando",
  }), "Em análise");
});
