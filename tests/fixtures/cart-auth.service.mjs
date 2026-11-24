export const tokens = { access: 'access-ficticio', refresh: 'refresh-ficticio' };
let versao = 0;
export const getSessionVersion = () => versao;
export const clearTokens = () => { versao++; tokens.access = null; tokens.refresh = null; };
export const getAccessToken = () => tokens.access;
export const getRefreshToken = () => tokens.refresh;
export const persistTokens = data => { versao++; Object.assign(tokens, data); };
export const authService = {};
