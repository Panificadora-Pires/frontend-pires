/**
 * Atualização automática "inteligente" (polling) usada pelas telas e stores.
 *
 * - não roda com a aba escondida; ao voltar para a aba, ganhar foco ou reconectar, atualiza na hora;
 * - nunca executa duas vezes ao mesmo tempo;
 * - em erro, espera cada vez mais (backoff exponencial com jitter) até o limite;
 * - o intervalo pode ser um número ou uma função (ex.: mais curto com pedido em andamento).
 */

const INTERVALO_PADRAO_MS = 30_000;
const INTERVALO_MAXIMO_ERRO_MS = 5 * 60_000;
// Evita disparar duas vezes seguidas quando "focus" e "visibilitychange" chegam juntos.
const INTERVALO_MINIMO_ENTRE_EXECUCOES_MS = 2_000;

function comJitter(ms) {
  const variacao = ms * 0.2;
  return Math.round(ms - variacao + Math.random() * variacao * 2);
}

function abaVisivel() {
  return typeof document === "undefined" || document.visibilityState !== "hidden";
}

export function createAutoRefresh(
  tarefa,
  {
    intervalo = INTERVALO_PADRAO_MS,
    intervaloMaximoErro = INTERVALO_MAXIMO_ERRO_MS,
    imediato = true,
    onEstado = () => {},
  } = {},
) {
  let timer = null;
  let ativo = false;
  let executando = null;
  let falhasSeguidas = 0;
  let ultimaExecucao = 0;

  const estado = {
    atualizando: false,
    ultimaAtualizacao: null,
    erro: null,
  };

  function publicarEstado(parcial) {
    Object.assign(estado, parcial);
    onEstado({ ...estado });
  }

  function intervaloAtual() {
    const base = Number(typeof intervalo === "function" ? intervalo() : intervalo);
    const seguro = Number.isFinite(base) && base > 0 ? base : INTERVALO_PADRAO_MS;

    if (!falhasSeguidas) return comJitter(seguro);

    const comBackoff = Math.min(seguro * 2 ** falhasSeguidas, intervaloMaximoErro);
    return comJitter(Math.max(seguro, comBackoff));
  }

  function limparTimer() {
    if (timer) {
      window.clearTimeout(timer);
      timer = null;
    }
  }

  function agendar() {
    limparTimer();
    if (!ativo || !abaVisivel()) return;
    timer = window.setTimeout(() => executar(), intervaloAtual());
  }

  async function executar() {
    if (executando) return executando;

    limparTimer();
    ultimaExecucao = Date.now();
    publicarEstado({ atualizando: true });

    executando = (async () => {
      try {
        await tarefa();
        falhasSeguidas = 0;
        publicarEstado({ ultimaAtualizacao: new Date(), erro: null });
      } catch (error) {
        falhasSeguidas += 1;
        publicarEstado({ erro: error });
      } finally {
        executando = null;
        publicarEstado({ atualizando: false });
        agendar();
      }
    })();

    return executando;
  }

  function aoRetomar() {
    if (!ativo || !abaVisivel()) return;
    if (Date.now() - ultimaExecucao < INTERVALO_MINIMO_ENTRE_EXECUCOES_MS) return;
    executar();
  }

  function aoMudarVisibilidade() {
    if (abaVisivel()) {
      aoRetomar();
    } else {
      // Aba escondida: nenhuma requisição até o usuário voltar.
      limparTimer();
    }
  }

  function iniciar() {
    if (ativo) return;
    ativo = true;

    document.addEventListener("visibilitychange", aoMudarVisibilidade);
    window.addEventListener("focus", aoRetomar);
    window.addEventListener("online", aoRetomar);

    if (imediato && abaVisivel()) {
      executar();
    } else {
      agendar();
    }
  }

  function parar() {
    ativo = false;
    limparTimer();
    document.removeEventListener("visibilitychange", aoMudarVisibilidade);
    window.removeEventListener("focus", aoRetomar);
    window.removeEventListener("online", aoRetomar);
  }

  return {
    iniciar,
    parar,
    // Executa agora (ou aguarda a execução em andamento) e reinicia a contagem do intervalo.
    atualizarAgora: () => executar(),
    // Recalcula o próximo disparo, por exemplo quando o intervalo dinâmico mudou.
    reagendar: () => {
      if (!executando) agendar();
    },
    get estado() {
      return { ...estado };
    },
  };
}
