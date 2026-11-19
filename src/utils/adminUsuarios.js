// Identidade discreta e datas legíveis; não expor informações extras da conta.
export function iniciaisUsuario(nome, email) {
  const identificador = String(nome || "").trim() ||
    String(email || "").split("@")[0].replace(/[._-]+/g, " ").trim();
  const palavras = identificador.split(/\s+/u).filter(Boolean);
  if (!palavras.length) return "—";
  if (palavras.length === 1) return [...palavras[0]].slice(0, 2).join("").toLocaleUpperCase("pt-BR");
  return (palavras[0].slice(0, 1) + palavras.at(-1).slice(0, 1)).toLocaleUpperCase("pt-BR");
}

export function ultimoAcesso(valor) {
  if (!valor) return "Nunca acessou";
  const instante = new Date(valor);
  if (!Number.isFinite(instante.getTime())) return "Não informado";
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo",
  }).format(instante);
}
