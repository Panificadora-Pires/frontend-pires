import api from "./api";

// Chatbot de ajuda (regras + FAQ no backend). Nada da conversa é gravado no servidor.
async function inicio() {
  return api.get("/chatbot/inicio/");
}

// Envia o texto digitado ou a intenção de um botão.
async function enviar({ texto, intencao } = {}) {
  return api.post("/chatbot/mensagem/", intencao ? { intencao } : { texto });
}

export default {
  inicio,
  enviar,
};
