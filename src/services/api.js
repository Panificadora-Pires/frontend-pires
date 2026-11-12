import axios from "axios";

export const ACCESS_TOKEN_KEY = "pp_access_token";
export const REFRESH_TOKEN_KEY = "pp_refresh_token";
let sessionVersion = 0;
export const getSessionVersion = () => sessionVersion;

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
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function getRefreshToken() {
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

export function persistTokens({ access, refresh }) {
  sessionVersion += 1;
  saveTokens({ access, refresh });
}

function saveTokens({ access, refresh }) {
  if (access) {
    localStorage.setItem(ACCESS_TOKEN_KEY, access);
  }

  if (refresh) {
    localStorage.setItem(REFRESH_TOKEN_KEY, refresh);
  }
}

export function clearTokens() {
  sessionVersion += 1;
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
}

api.interceptors.request.use((config) => {
  config._sessionVersion ??= sessionVersion;
  if (config._sessionVersion !== sessionVersion) throw sessionChanged(config);
  const accessToken = getAccessToken();

  if (accessToken && !config.skipAuthHeader) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${accessToken}`;
  }

  return config;
}, error => { throw error; }, { synchronous: true });

let refreshPromise = null;

api.interceptors.response.use(
  (response) => {
    if (response.config._sessionVersion !== sessionVersion) throw sessionChanged(response.config);
    return response;
  },

  async (error) => {
    const originalRequest = error.config;
    if (originalRequest && originalRequest._sessionVersion !== sessionVersion) {
      return Promise.reject(sessionChanged(originalRequest));
    }
    const refreshToken = getRefreshToken();

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
      if (version !== sessionVersion) throw sessionChanged(originalRequest);
      // Renovação da mesma sessão mantém válidos os consumidores em andamento.
      saveTokens({
        access: data.access,
        refresh: data.refresh || refreshToken,
      });

      originalRequest.headers = originalRequest.headers ?? {};
      originalRequest.headers.Authorization = `Bearer ${data.access}`;

      return api(originalRequest);
    } catch (refreshError) {
      if (version !== sessionVersion) return Promise.reject(sessionChanged(originalRequest));
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
