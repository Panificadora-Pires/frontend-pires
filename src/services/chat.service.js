import api from "./api";

// Chat por pedido (cliente dono do pedido ↔ administração). O id é o do pedido.
async function obter(pedidoId) {
  return api.get(`/chat/${pedidoId}/`);
}

async function enviar(pedidoId, texto) {
  return api.post(`/chat/${pedidoId}/mensagens/`, { texto });
}

async function marcarLidas(pedidoId) {
  return api.post(`/chat/${pedidoId}/marcar_lidas/`);
}

async function naoLidas() {
  return api.get("/chat/nao_lidas/");
}

export default {
  obter,
  enviar,
  marcarLidas,
  naoLidas,
};
