export const session = { versao: 0, token: "JWT-SOMENTE-NO-HEADER", ouvintes: new Set() };
export const getSessionVersion = () => session.versao;
export const getAccessToken = () => session.token;
export function onExternalSessionChange(listener) {
  session.ouvintes.add(listener);
  return () => session.ouvintes.delete(listener);
}
export default {
  defaults: { baseURL: "https://backend-pires.class.fabricadesoftware.ifc.edu.br/api" },
  post: async () => ({ data: {
    protocol: "pires.v1", ws_path: "/ws/v1/events/",
    ticket: "a".repeat(43), expires_in: 45,
  } }),
};
