const service = {
  obterPedido: async id => ({ id, status: "pendente" }),
  alterarStatusPedido: async (id, status) => ({ id, status }),
};
export default service;
