// Fronteira de HTTP isolada: os testes exercitam o store Pinia real.
const service = {
  listar: async () => [],
  marcarLida: async () => {
    throw new Error("Configure a resposta do teste");
  },
  marcarTodasLidas: async () => ({}),
};
export default service;
