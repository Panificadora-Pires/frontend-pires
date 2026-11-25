import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";

import { useAuthStore } from "@/stores/auth";
import { useCartStore } from "@/stores/cart";
import { useNavigationCatalogStore } from "@/stores/navigationCatalog";
import { useNotificationsStore } from "@/stores/notifications";

export function useCabecalhoAluno(emit) {
  const auth = useAuthStore();
  const cart = useCartStore();
  const notifications = useNotificationsStore();
  const catalogo = useNavigationCatalogStore();
  const route = useRoute();
  const router = useRouter();
  const raiz = ref(null);
  const navegacao = ref(null);
  const indicador = ref({ opacity: 0 });
  let observarNavegacao;
  const carrinho = ref(null);
  const botaoMobile = ref(null);
  const painel = ref(null);
  const mobileAberto = ref(false);
  const avatarComErro = ref(false);
  const termoBusca = ref("");
  const mostrarBusca = computed(() => route.name !== "cardapio");
  const gatilhos = new Map();
  let consultaDesktop;
  let timerFechamento;
  let aberturaHover = false;
  let ultimoGatilho = null;

  const itens = [
    { tipo: "cardapio", rotulo: "Cardápio" },
    { tipo: "promocoes", rotulo: "Promoções" },
    { tipo: "pedidos", rotulo: "Meus pedidos" },
  ];
  const iniciais = computed(() =>
    (auth.usuario?.name || "Cliente")
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0].toUpperCase())
      .join(""),
  );
  const rotuloCarrinho = computed(
    () =>
      `Carrinho com ${cart.totalItens} ${cart.totalItens === 1 ? "item" : "itens"}`,
  );
  const rotuloNotificacoes = computed(() =>
    notifications.naoLidas
      ? `Notificações: ${notifications.naoLidas} não lidas`
      : "Notificações",
  );
  const badge = (valor) => (Number(valor) > 99 ? "99+" : valor);

  watch(
    () => [route.name, route.query.busca],
    ([nome, busca]) => {
      termoBusca.value = nome === "cardapio" ? String(busca || "") : "";
    },
    { immediate: true },
  );
  watch(
    () => route.fullPath,
    () => {
      fechar();
      nextTick(atualizarIndicador);
    },
  );
  watch(
    () => auth.usuario?.avatar,
    () => {
      avatarComErro.value = false;
    },
  );

  function registrarGatilho(tipo, el) {
    if (el) gatilhos.set(tipo, el);
    else gatilhos.delete(tipo);
  }
  function atualizarIndicador() {
    const ativo = navegacao.value?.querySelector(".is-active");
    indicador.value = ativo
      ? {
          opacity: 1,
          transform: `translateX(${ativo.offsetLeft + 10}px) scaleX(${Math.max(0, ativo.offsetWidth - 20)})`,
        }
      : { opacity: 0 };
  }
  function cancelarFechamento() {
    window.clearTimeout(timerFechamento);
  }
  function fechar({ restaurarFoco = false } = {}) {
    cancelarFechamento();
    const destino = mobileAberto.value ? botaoMobile.value : ultimoGatilho;
    painel.value = null;
    mobileAberto.value = false;
    aberturaHover = false;
    if (restaurarFoco) nextTick(() => destino?.focus());
  }
  function prepararDados(tipo) {
    if (!auth.autenticado) return;
    if (tipo === "cardapio") catalogo.carregarCategorias();
    if (tipo === "promocoes") catalogo.carregarPromocoes({ force: true });
  }
  function abrir(tipo, event, hover = false) {
    cancelarFechamento();
    ultimoGatilho = event?.currentTarget || gatilhos.get(tipo);
    painel.value = tipo;
    aberturaHover = hover;
    prepararDados(tipo);
  }
  function alternar(tipo, event) {
    if (painel.value === tipo && !aberturaHover) {
      painel.value = null;
    } else abrir(tipo, event);
    aberturaHover = false;
  }
  function aoEntrar(tipo, event) {
    if (event.pointerType !== "mouse" || !consultaDesktop?.matches) return;
    if (painel.value === tipo) {
      cancelarFechamento();
      return;
    }
    abrir(tipo, event, true);
  }
  function agendarFechamento(event) {
    if (!consultaDesktop?.matches || event.pointerType !== "mouse") return;
    if (raiz.value?.contains(event.relatedTarget)) return;
    if (!aberturaHover && raiz.value?.contains(document.activeElement)) return;
    timerFechamento = window.setTimeout(() => {
      painel.value = null;
    }, 180);
  }
  async function abrirComTeclado(tipo, event) {
    event.preventDefault();
    abrir(tipo, event);
    await nextTick();
    if (painel.value !== tipo) return;
    const atual = document.getElementById(`painel-${tipo}`);
    atual?.querySelector("a, button")?.focus();
  }
  function aoEscape(event) {
    if (!painel.value && !mobileAberto.value) return;
    event.preventDefault();
    event.stopPropagation();
    fechar({ restaurarFoco: true });
  }
  function desativarPainel(el) {
    el.inert = true;
    el.setAttribute("aria-hidden", "true");
  }
  function ativarPainel(el) {
    el.inert = false;
    el.removeAttribute("aria-hidden");
  }
  function alternarMobile() {
    cancelarFechamento();
    mobileAberto.value = !mobileAberto.value;
    painel.value = null;
  }
  function clicarFora(event) {
    if (
      (painel.value || mobileAberto.value) &&
      !raiz.value?.contains(event.target)
    )
      fechar();
  }
  function sairFoco(event) {
    if (event.relatedTarget && !raiz.value?.contains(event.relatedTarget))
      fechar();
  }
  function buscar() {
    fechar();
    router.push({
      name: "cardapio",
      query: termoBusca.value ? { busca: termoBusca.value } : {},
    });
  }
  function sair() {
    fechar();
    emit("logout");
  }
  function aoMudarLayout() {
    fechar();
  }

  onMounted(() => {
    consultaDesktop = window.matchMedia("(min-width: 1180px)");
    consultaDesktop.addEventListener("change", aoMudarLayout);
    document.addEventListener("pointerdown", clicarFora);
    observarNavegacao = new ResizeObserver(atualizarIndicador);
    observarNavegacao.observe(navegacao.value);
    atualizarIndicador();
    if (auth.autenticado) catalogo.carregarPromocoes();
  });
  onBeforeUnmount(() => {
    observarNavegacao?.disconnect();
    cancelarFechamento();
    consultaDesktop?.removeEventListener("change", aoMudarLayout);
    document.removeEventListener("pointerdown", clicarFora);
  });
  return {
    abrirComTeclado,
    agendarFechamento,
    alternar,
    alternarMobile,
    aoEntrar,
    aoEscape,
    ativarPainel,
    auth,
    avatarComErro,
    badge,
    botaoMobile,
    buscar,
    cancelarFechamento,
    carrinho,
    cart,
    desativarPainel,
    fechar,
    indicador,
    iniciais,
    itens,
    mobileAberto,
    mostrarBusca,
    navegacao,
    notifications,
    painel,
    raiz,
    registrarGatilho,
    rotuloCarrinho,
    rotuloNotificacoes,
    route,
    sair,
    sairFoco,
    termoBusca,
  };
}
