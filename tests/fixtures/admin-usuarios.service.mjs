let versao = 0;
export function getSessionVersion() { return versao; }
export function alterarVersao(valor) { versao = valor; }
const service = {
  listarUsuariosAdminPagina: async () => ({
    count: 1, page: 1, page_size: 18, total_pages: 1,
    next: null, previous: null,
    results: [{ id: 4, name: "Joana", email: "joana@example.com", is_staff: false, is_active: true, email_verified: true, last_login: null }],
  }),
  resumoUsuariosAdmin: async () => ({ total: 1, administradores: 0, clientes: 1, ativas: 1, emails_verificados: 1 }),
};
export default service;
