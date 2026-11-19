export const chatService = {
  obter: async () => ({ data: { mensagens: [], nao_lidas: 0 } }),
  naoLidas: async () => ({ data: { total: 0, por_pedido: [] } }),
  enviar: async () => ({ data: { id: 1 } }),
  marcarLidas: async () => ({ data: { marcadas: 0 } }),
};
export default chatService;
