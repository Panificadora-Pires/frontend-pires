import axios from "axios";

export const ACCESS_TOKEN_KEY = "pp_access_token";
export const REFRESH_TOKEN_KEY = "pp_refresh_token";
const SESSION_ID_KEY = "pp_session_id";
let sessionVersion = 0;
let localTokens = null;
let sessionSuspended = false;
const externalSessionListeners = new Set();

export function getSessionVersion() {
  reconcileSession();
  return sessionVersion;
}

export function onExternalSessionChange(listener) {
  reconcileSession();
  externalSessionListeners.add(listener);
  if (sessionSuspended) listener();
  return () => externalSessionListeners.delete(listener);
}

function readTokens() {
  const sessionId = localStorage.getItem(SESSION_ID_KEY);
  if (sessionId) {
    const tokens = readJson(tokensKey(sessionId));
    const revoked = localStorage.getItem(revokedKey(sessionId));
    return { sessionId, access: revoked ? null : tokens?.access ?? null, refresh: revoked ? null : tokens?.refresh ?? null };
  }

  // Compatibilidade somente leitura com os JWTs das versões anteriores.
  // Não migra o ponteiro no bootstrap, que poderia concorrer com outro login.
  const sourceAccess = localStorage.getItem(ACCESS_TOKEN_KEY);
  const sourceRefresh = localStorage.getItem(REFRESH_TOKEN_KEY);
  const source = { sourceAccess, sourceRefresh };
  if (!sourceAccess && !sourceRefresh) return { sessionId: null, access: null, refresh: null };
  const matchesSource = value => value?.sourceAccess === sourceAccess && value?.sourceRefresh === sourceRefresh;
  const revoked = matchesSource(readJson(revokedKey('legacy')));
  const saved = readJson(tokensKey('legacy'));
  return {
    sessionId: 'legacy', ...source,
    access: revoked ? null : matchesSource(saved) ? saved.access : sourceAccess,
    refresh: revoked ? null : matchesSource(saved) ? saved.refresh : sourceRefresh,
  };
}

const tokensKey = id => `pp_session_tokens:${id}`;
const revokedKey = id => `pp_session_revoked:${id}`;

function readJson(key) {
  try { return JSON.parse(localStorage.getItem(key)); } catch { return null; }
}

function sameTokens(a, b) {
  return a.access === b.access && a.refresh === b.refresh && a.sessionId === b.sessionId;
}

// Só identifica continuidade local. Validação/permissões do JWT continuam no servidor.
function tokenOwner(token) {
  try {
    const payload = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    const id = JSON.parse(atob(payload)).user_id;
    return typeof id === "string" || typeof id === "number" ? String(id) : null;
  } catch {
    return null;
  }
}

function sameAccountRefresh(previous, current) {
  const owner = tokenOwner(previous.access);
  return previous.sessionId === current.sessionId && owner !== null &&
    [previous.refresh, current.access, current.refresh].every(token => tokenOwner(token) === owner);
}

function reconcileSession() {
  if (sessionSuspended) return false;
  const current = readTokens();
  if (!localTokens) localTokens = current;
  if (sameTokens(localTokens, current)) return true;
  if (sameAccountRefresh(localTokens, current)) {
    localTokens = current;
    return true;
  }

  // Não adota credenciais de outra aba sobre stores/componentes da conta anterior.
  sessionSuspended = true;
  sessionVersion += 1;
  for (const listener of externalSessionListeners) listener();
  return false;
}

if (typeof window !== "undefined") {
  window.addEventListener?.("storage", (event) => {
    if (event.storageArea !== localStorage) return;
    if (event.key === null || [ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY, SESSION_ID_KEY].includes(event.key) ||
      event.key.startsWith('pp_session_tokens:') || event.key.startsWith('pp_session_revoked:')) {
      // Lê o par atual: eventos atrasados de uma rotação não devem causar falso logout.
      reconcileSession();
    }
  });
}

const API_BASE_URL = (
  import.meta.env.VITE_API_URL ||
  (import.meta.env.PROD
    ? "https://backend-pires.class.fabricadesoftware.ifc.edu.br/api"
    : "http://127.0.0.1:8000/api")
).replace(/\/+$/, "");

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15_000,
  headers: {
    Accept: "application/json",
  },
});

export function getAccessToken() {
  return reconcileSession() ? localTokens.access : null;
}

export function getRefreshToken() {
  return reconcileSession() ? localTokens.refresh : null;
}

export function persistTokens({ access, refresh }) {
  if (!reconcileSession()) return;
  const previous = localTokens;
  sessionVersion += 1;
  // Login (inclusive A→B→A) muda a geração; refresh nunca muda este marcador.
  const sessionId = crypto.randomUUID();
  const tokens = { sessionId, access, refresh };
  localStorage.setItem(tokensKey(sessionId), JSON.stringify(tokens));
  localStorage.setItem(SESSION_ID_KEY, sessionId);
  localTokens = tokens;
  revokeSession(previous);
  reconcileSession();
}

function saveTokens({ access, refresh }) {
  const tokens = { ...localTokens, access, refresh };
  // A gravação atômica pertence ao UUID capturado: nunca escreve no bundle B.
  localStorage.setItem(tokensKey(tokens.sessionId), JSON.stringify(tokens));
  localTokens = tokens;
  reconcileSession();
}

export function clearTokens() {
  if (!reconcileSession()) return;
  sessionVersion += 1;
  const previous = localTokens;
  if (!previous.sessionId) return;
  revokeSession(previous);
  localTokens = { ...previous, access: null, refresh: null };
  reconcileSession();
}

function revokeSession(previous) {
  if (!previous.sessionId) return;
  // Revogação prevalece mesmo se um refresh de outra aba gravar A depois.
  // Nunca remove o ponteiro ativo: ele já pode ter sido substituído por B.
  const tombstone = previous.sessionId === 'legacy'
    ? { sourceAccess: previous.sourceAccess, sourceRefresh: previous.sourceRefresh }
    : true;
  localStorage.setItem(revokedKey(previous.sessionId), JSON.stringify(tombstone));
  localStorage.removeItem(tokensKey(previous.sessionId));
}

api.interceptors.request.use((config) => {
  if (!reconcileSession()) throw sessionChanged(config);
  config._sessionVersion ??= sessionVersion;
  if (config._sessionVersion !== sessionVersion) throw sessionChanged(config);
  const accessToken = localTokens.access;

  if (accessToken && !config.skipAuthHeader) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${accessToken}`;
  }

  return config;
}, error => { throw error; }, { synchronous: true });

let refreshPromise = null;

api.interceptors.response.use(
  (response) => {
    if (!reconcileSession() || response.config._sessionVersion !== sessionVersion) throw sessionChanged(response.config);
    return response;
  },

  async (error) => {
    const originalRequest = error.config;
    if (!reconcileSession() || (originalRequest && originalRequest._sessionVersion !== sessionVersion)) {
      return Promise.reject(sessionChanged(originalRequest));
    }
    const refreshToken = localTokens.refresh;

    const shouldRefresh = Boolean(
      originalRequest &&
      error.response?.status === 401 &&
      !originalRequest.skipAuthRefresh &&
      !originalRequest._authRetry &&
      refreshToken,
    );

    if (!shouldRefresh) {
      return Promise.reject(error);
    }

    originalRequest._authRetry = true;
    const version = sessionVersion;
    let flight;

    try {
      if (!refreshPromise || refreshPromise.version !== version) {
        refreshPromise = {
          version,
          tokens: localTokens,
          promise: axios.post(
            `${API_BASE_URL}/token/refresh/`,
            { refresh: refreshToken },
            {
              timeout: 15_000,
              headers: { Accept: "application/json" },
            },
          ),
        };
      }
      flight = refreshPromise;

      const { data } = await flight.promise;
      if (!reconcileSession() || version !== sessionVersion) throw sessionChanged(originalRequest);
      // Renovação da mesma sessão mantém válidos os consumidores em andamento.
      // Outra aba pode ter renovado antes: não sobrescreve a credencial mais recente.
      if (sameTokens(localTokens, flight.tokens)) {
        saveTokens({
          access: data.access,
          refresh: data.refresh || refreshToken,
        });
      }
      if (!reconcileSession() || version !== sessionVersion) throw sessionChanged(originalRequest);

      originalRequest.headers = originalRequest.headers ?? {};
      originalRequest.headers.Authorization = `Bearer ${localTokens.access}`;

      return api(originalRequest);
    } catch (refreshError) {
      if (!reconcileSession() || version !== sessionVersion) return Promise.reject(sessionChanged(originalRequest));
      // Uma rotação já concluída em outra aba também torna irrelevante a falha antiga.
      if (flight && !sameTokens(localTokens, flight.tokens)) return api(originalRequest);
      // Sem resposta (rede caiu, servidor acordando) não significa sessão expirada:
      // mantém os tokens para a próxima tentativa em vez de deslogar o usuário.
      if (refreshError?.response) {
        clearTokens();
        redirectToLoginAfterExpiredSession();
      }

      return Promise.reject(refreshError);
    } finally {
      if (refreshPromise === flight) refreshPromise = null;
    }
  },
);

function sessionChanged(config) {
  return new axios.CanceledError("A sessão mudou durante a requisição.", config);
}

function redirectToLoginAfterExpiredSession() {
  if (typeof window === "undefined") return;

  const publicAuthPaths = new Set([
    "/login",
    "/cadastro",
    "/confirmar-email",
    "/recuperar-senha",
    "/redefinir-senha",
  ]);

  if (!publicAuthPaths.has(window.location.pathname)) {
    window.location.replace("/login?motivo=sessao-expirada");
  }
}

export default api;
