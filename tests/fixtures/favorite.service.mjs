export const auth = { usuario: { id: 1 } };
export function useAuthStore() { return auth; }
export const catalog = { obterProduto: async () => null };
export default {
  listar: async () => [],
  adicionar: async () => { throw new Error('Configure POST'); },
  remover: async () => ({}),
};
