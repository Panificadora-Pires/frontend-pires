import api, {
  getAccessToken,
  getSessionVersion,
  onExternalSessionChange,
} from "@/services/api";

export const REALTIME_ENABLED = import.meta.env?.VITE_REALTIME_ENABLED === "true";

const TIPOS = new Set([
  "pedido.criado",
  "pedido.atualizado",
  "chat.mensagem_nova",
  "chat.leitura_atualizada",
  "notificacao.alterada",
]);
const PROTOCOLO = "pires.v1";
const CAMINHO = "/ws/v1/events/";
const MAX_EVENTOS_VISTOS = 400;
const TEMPO_CONEXAO_MS = 10_000;
const BACKOFF_MAX_MS = 30_000;

export function validarEventoRealtime(valor) {
  if (!valor || typeof valor !== "object" || Array.isArray(valor)) return null;
  if (valor.v !== 1 || !TIPOS.has(valor.tipo)) return null;
  if (typeof valor.event_id !== "string" || !/^[0-9a-f]{32}$/i.test(valor.event_id)) return null;
  if (typeof valor.emitido_em !== "string" || !Number.isFinite(Date.parse(valor.emitido_em))) return null;
  if (valor.pedido_id != null && (!Number.isSafeInteger(valor.pedido_id) || valor.pedido_id < 1)) return null;
  return {
    v: 1, tipo: valor.tipo, event_id: valor.event_id,
    emitido_em: valor.emitido_em,
    ...(valor.pedido_id == null ? {} : { pedido_id: valor.pedido_id }),
  };
}

export function construirUrlRealtime(apiBase, caminho = CAMINHO, origem = undefined) {
  if (caminho !== CAMINHO) throw new Error("Caminho WebSocket não permitido.");
  const base = new URL(apiBase, origem || (typeof window === "undefined" ? undefined : window.location.origin));
  if (!["http:", "https:"].includes(base.protocol)) throw new Error("Protocolo de API inválido.");
  if (base.protocol === "http:" && !["localhost", "127.0.0.1", "[::1]"].includes(base.hostname)) {
    throw new Error("WebSocket sem TLS permitido somente em desenvolvimento local.");
  }
  const url = new URL(CAMINHO, base);
  url.protocol = base.protocol === "https:" ? "wss:" : "ws:";
  return url.toString();
}

export function createRealtimeClient({
  enabled = REALTIME_ENABLED,
  http = api,
  getVersion = getSessionVersion,
  getToken = getAccessToken,
  onSessionChange = onExternalSessionChange,
  socketFactory = (url, protocols) => new WebSocket(url, protocols),
  schedule = (fn, ms) => setTimeout(fn, ms),
  unschedule = id => clearTimeout(id),
  random = Math.random,
  origin = () => (typeof window === "undefined" ? undefined : window.location.origin),
} = {}) {
  let iniciado = false;
  let socket = null;
  let timer = null;
  let timeoutConexao = null;
  let geracao = 0;
  let falhas = 0;
  let sessao = null;
  let desinscreverSessao = null;
  let estado = enabled ? "parado" : "desativado";
  const recebidos = new Set();
  const ouvintes = new Set();
  const estados = new Set();

  const avisarEstado = proximo => {
    if (estado === proximo) return;
    estado = proximo;
    for (const ouvir of estados) {
      try { ouvir(estado); } catch {}
    }
  };
  function limparTimers() {
    if (timer !== null) { unschedule(timer); timer = null; }
    if (timeoutConexao !== null) { unschedule(timeoutConexao); timeoutConexao = null; }
  }
  function encerrarSocket() {
    const anterior = socket;
    socket = null;
    if (anterior) {
      anterior.onopen = null;
      anterior.onmessage = null;
      anterior.onclose = null;
      anterior.onerror = null;
      try { anterior.close(); } catch {}
    }
  }
  function sessaoAtual(geracaoDaChamada, versao) {
    return iniciado && geracaoDaChamada === geracao && versao === getVersion() && Boolean(getToken());
  }
  function agendarNovaTentativa() {
    if (!iniciado || !getToken() || sessao !== getVersion()) { parar(); return; }
    falhas += 1;
    const atraso = Math.min(BACKOFF_MAX_MS, 1000 * 2 ** Math.min(falhas - 1, 5));
    const comJitter = Math.round(atraso * (0.8 + 0.4 * random()));
    avisarEstado("reconectando");
    if (timer !== null) unschedule(timer);
    timer = schedule(() => {
      timer = null;
      if (iniciado) void conectar();
    }, comJitter);
  }
  async function conectar() {
    if (!iniciado || socket) return;
    limparTimers();
    const versao = sessao;
    const chamada = ++geracao;
    if (!sessaoAtual(chamada, versao)) { parar(); return; }
    avisarEstado(falhas ? "reconectando" : "conectando");

    try {
      const { data } = await http.post("/realtime/ticket/", null);
      if (!sessaoAtual(chamada, versao)) return;
      if (
        !data || data.protocol !== PROTOCOLO || data.ws_path !== CAMINHO ||
        typeof data.ticket !== "string" || !/^[a-zA-Z0-9_-]{40,128}$/.test(data.ticket)
      ) throw new Error("Ticket WebSocket inválido.");

      const url = construirUrlRealtime(http.defaults.baseURL, data.ws_path, origin());
      const ws = socketFactory(url, [PROTOCOLO, `pires.ticket.${data.ticket}`]);
      socket = ws;

      const atual = () => socket === ws && sessaoAtual(chamada, versao);
      const falhou = () => {
        if (socket !== ws) return;
        if (timeoutConexao !== null) { unschedule(timeoutConexao); timeoutConexao = null; }
        encerrarSocket();
        if (!iniciado || sessao !== getVersion()) { parar(); return; }
        agendarNovaTentativa();
      };

      timeoutConexao = schedule(() => {
        timeoutConexao = null;
        if (atual() && estado !== "conectado") falhou();
      }, TEMPO_CONEXAO_MS);

      ws.onopen = () => {
        if (!atual()) { falhou(); return; }
        if (ws.protocol !== PROTOCOLO) { falhou(); return; }
        if (timeoutConexao !== null) { unschedule(timeoutConexao); timeoutConexao = null; }
        falhas = 0;
        recebidos.clear();
        avisarEstado("conectado");
        for (const ouvir of ouvintes) {
          try { ouvir(null); } catch {}
        }
      };
      ws.onmessage = mensagem => {
        if (!atual() || estado !== "conectado") { falhou(); return; }
        let dados;
        try { dados = validarEventoRealtime(JSON.parse(mensagem.data)); }
        catch { return; }
        if (!dados || recebidos.has(dados.event_id)) return;
        recebidos.add(dados.event_id);
        if (recebidos.size > MAX_EVENTOS_VISTOS) recebidos.delete(recebidos.values().next().value);
        for (const ouvir of ouvintes) {
          try { ouvir(dados); } catch {}
        }
      };
      ws.onerror = falhou;
      ws.onclose = falhou;
    } catch {
      if (sessaoAtual(chamada, versao)) agendarNovaTentativa();
      else if (iniciado) parar();
    }
  }
  function iniciar() {
    if (!enabled || iniciado) return false;
    if (!getToken()) return false;
    iniciado = true;
    sessao = getVersion();
    desinscreverSessao = onSessionChange(() => {
      if (iniciado && sessao !== getVersion()) parar();
    });
    void conectar();
    return true;
  }
  function parar() {
    iniciado = false;
    geracao += 1;
    limparTimers();
    encerrarSocket();
    desinscreverSessao?.();
    desinscreverSessao = null;
    falhas = 0;
    sessao = null;
    recebidos.clear();
    avisarEstado(enabled ? "parado" : "desativado");
  }

  return {
    iniciar,
    parar,
    inscrever(ouvinte) {
      ouvintes.add(ouvinte);
      return () => ouvintes.delete(ouvinte);
    },
    observarEstado(ouvinte) {
      estados.add(ouvinte);
      return () => estados.delete(ouvinte);
    },
    get estado() { return estado; },
    get ativo() { return iniciado; },
  };
}

export const realtimeClient = createRealtimeClient();
