export function createRealtimeInvalidations({
  pedidos = () => {},
  chat = () => {},
  notificacoes = () => {},
  delay = 400,
  schedule = (fn, ms) => setTimeout(fn, ms),
  cancel = (id) => clearTimeout(id),
} = {}) {
  const pendentes = new Set();
  const destinos = { pedidos, chat, notificacoes };
  let timer = null;
  let encerrado = false;

  function executar() {
    timer = null;
    if (encerrado) return;
    const lote = [...pendentes];
    pendentes.clear();
    for (const recurso of lote) {
      try {
        Promise.resolve(destinos[recurso]()).catch(() => {});
      } catch {}
    }
  }

  function sinalizar(evento) {
    if (encerrado) return;
    if (evento === null) {
      pendentes.add("pedidos");
      pendentes.add("chat");
      pendentes.add("notificacoes");
    } else if (typeof evento?.tipo === "string") {
      if (evento.tipo.startsWith("pedido.")) pendentes.add("pedidos");
      if (evento.tipo.startsWith("chat.")) pendentes.add("chat");
      if (evento.tipo === "notificacao.alterada") pendentes.add("notificacoes");
    }
    if (!pendentes.size || timer !== null) return;
    timer = schedule(executar, delay);
  }

  function parar() {
    encerrado = true;
    pendentes.clear();
    if (timer !== null) cancel(timer);
    timer = null;
  }

  return { sinalizar, parar };
}
