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
