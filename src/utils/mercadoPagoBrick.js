// Payment Brick do Mercado Pago: só erros "non_critical" mantêm o formulário montado.
// Ex.: cartão não reconhecido (BIN sem meio de pagamento). O cliente corrige e tenta de novo;
// erro crítico ou sem tipo continua trocando o formulário pela mensagem de recarregar.
const MENSAGENS = {
  no_payment_method_for_provided_bin: "Não reconhecemos esse cartão. Confira o número ou use outro cartão.",
};

const MENSAGEM_PADRAO = "Confira os dados do cartão e tente novamente.";

export function erroBrickBloqueante(erro) {
  return erro?.type !== "non_critical";
}

export function mensagemAvisoBrick(erro) {
  return MENSAGENS[erro?.message] || MENSAGEM_PADRAO;
}
