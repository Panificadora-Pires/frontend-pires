import api from "./api";

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
