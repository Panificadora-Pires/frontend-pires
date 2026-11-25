import api from "./api";

async function inicio() {
  return api.get("/chatbot/inicio/");
}

async function enviar({ texto, intencao } = {}) {
  return api.post("/chatbot/mensagem/", intencao ? { intencao } : { texto });
}

export default {
  inicio,
  enviar,
};
