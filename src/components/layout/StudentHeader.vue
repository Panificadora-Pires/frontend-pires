<script setup>
import {
  computed,
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
  watch,
} from "vue";
import { useRoute, useRouter } from "vue-router";
import {
  Bell,
  ChevronDown,
  Heart,
  LogOut,
  Menu,
  Search,
  ShoppingBag,
  User,
  X,
} from "lucide-vue-next";
import StudentHeaderPanel from "@/components/layout/StudentHeaderPanel.vue";
import { useAuthStore } from "@/stores/auth";
import { useCartStore } from "@/stores/cart";
import { useNotificationsStore } from "@/stores/notifications";
import { useNavigationCatalogStore } from "@/stores/navigationCatalog";

defineProps({ carrinhoPulando: { type: Boolean, default: false } });
const emit = defineEmits(["logout"]);
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
defineExpose({ elementoCarrinho: () => carrinho.value?.$el || null });
</script>

<template>
  <header
    ref="raiz"
    class="student-header"
    :class="{
      'is-expanded': painel || mobileAberto,
      'student-header--without-search': !mostrarBusca,
    }"
    @keydown.esc="aoEscape"
    @focusout="sairFoco"
    @pointerleave="agendarFechamento"
    @pointerenter="cancelarFechamento"
  >
    <div class="student-header__bar">
      <button
        ref="botaoMobile"
        type="button"
        class="student-header__icon student-header__mobile-toggle"
        :aria-label="mobileAberto ? 'Fechar menu' : 'Abrir menu'"
        :aria-expanded="mobileAberto"
        aria-controls="navegacao-mobile"
        @click="alternarMobile"
      >
        <X v-if="mobileAberto" :size="22" aria-hidden="true" /><Menu
          v-else
          :size="22"
          aria-hidden="true"
        />
      </button>
      <RouterLink
        :to="{ name: 'home' }"
        class="student-header__brand"
        aria-label="Pires Panificadora - Início"
        @click="fechar()"
      >
        <img src="/logo.png" alt="Pires Panificadora" />
      </RouterLink>
      <nav
        ref="navegacao"
        class="student-header__nav"
        aria-label="Navegação principal"
      >
        <span
          class="student-header__nav-indicator"
          :style="indicador"
          aria-hidden="true"
        />
        <RouterLink
          :to="{ name: 'home' }"
          class="student-header__nav-link"
          exact-active-class="is-active"
          @click="fechar()"
          @pointerenter="painel = null"
          >Início</RouterLink
        >
        <button
          v-for="item in itens"
          :key="item.tipo"
          :ref="(el) => registrarGatilho(item.tipo, el)"
          type="button"
          class="student-header__nav-link"
          :class="{
            'is-active': route.name === item.tipo,
            'is-open': painel === item.tipo,
          }"
          :aria-expanded="painel === item.tipo"
          :aria-current="route.name === item.tipo ? 'page' : undefined"
          :aria-controls="`painel-${item.tipo}`"
          @pointerenter="aoEntrar(item.tipo, $event)"
          @click="alternar(item.tipo, $event)"
          @keydown.down="abrirComTeclado(item.tipo, $event)"
        >
          {{ item.rotulo }}
          <ChevronDown :size="13" aria-hidden="true" />
        </button>
      </nav>
      <form
        v-if="mostrarBusca"
        class="student-header__search student-header__search--desktop"
        role="search"
        @submit.prevent="buscar"
      >
        <Search :size="17" aria-hidden="true" />
        <label for="busca-topo" class="student-header__sr"
          >Buscar no cardápio</label
        >
        <input
          id="busca-topo"
          v-model.trim="termoBusca"
          type="search"
          placeholder="Qual vai ser o seu pedido?"
          autocomplete="off"
        />
      </form>
      <div class="student-header__actions">
        <RouterLink
          :to="{ name: 'favoritos' }"
          class="student-header__icon student-header__desktop-action"
          aria-label="Favoritos"
          title="Favoritos"
          @click="fechar()"
          ><Heart :size="19" aria-hidden="true"
        /></RouterLink>
        <RouterLink
          :to="{ name: 'notificacoes' }"
          class="student-header__icon"
          :aria-label="rotuloNotificacoes"
          title="Notificações"
          @click="fechar()"
        >
          <Bell :size="19" aria-hidden="true" /><span
            v-if="notifications.naoLidas"
            class="student-header__badge"
            aria-hidden="true"
            >{{ badge(notifications.naoLidas) }}</span
          >
        </RouterLink>
        <button
          :ref="(el) => registrarGatilho('conta', el)"
          type="button"
          class="student-header__icon student-header__avatar student-header__desktop-action"
          :aria-label="`Conta de ${auth.usuario?.name || 'cliente'}`"
          :aria-expanded="painel === 'conta'"
          aria-controls="painel-conta"
          @click="alternar('conta', $event)"
          @keydown.down="abrirComTeclado('conta', $event)"
        >
          <img
            v-if="auth.usuario?.avatar && !avatarComErro"
            :src="auth.usuario.avatar"
            alt=""
            referrerpolicy="no-referrer"
            @error="avatarComErro = true"
          /><span v-else>{{ iniciais }}</span>
        </button>
        <RouterLink
          ref="carrinho"
          :to="{ name: 'carrinho' }"
          class="student-header__cart"
          :class="{ 'is-added': carrinhoPulando }"
          :aria-label="rotuloCarrinho"
          @click="fechar()"
        >
          <ShoppingBag :size="19" aria-hidden="true" /><span
            class="student-header__cart-label"
            >Carrinho</span
          ><span class="student-header__cart-count" aria-hidden="true">{{
            badge(cart.totalItens)
          }}</span>
        </RouterLink>
      </div>
    </div>

    <Transition
      name="header-panel"
      @before-enter="ativarPainel"
      @before-leave="desativarPainel"
    >
      <div
        v-if="painel && !mobileAberto"
        :id="`painel-${painel}`"
        :key="painel"
        class="student-header__dropdown"
        :class="{ 'student-header__dropdown--account': painel === 'conta' }"
        @pointerenter="cancelarFechamento"
      >
        <div class="student-header__glass student-header__desktop-panel">
          <StudentHeaderPanel
            :tipo="painel"
            @navigate="fechar()"
            @logout="sair"
          />
        </div>
      </div>
    </Transition>

    <Transition
      name="header-panel"
      @before-enter="ativarPainel"
      @before-leave="desativarPainel"
    >
      <div
        v-if="mobileAberto"
        id="navegacao-mobile"
        class="student-header__mobile-panel student-header__glass"
      >
        <form
          v-if="mostrarBusca"
          class="student-header__search"
          role="search"
          @submit.prevent="buscar"
        >
          <Search :size="18" aria-hidden="true" /><label
            for="busca-mobile"
            class="student-header__sr"
            >Buscar no cardápio</label
          >
          <input
            id="busca-mobile"
            v-model.trim="termoBusca"
            type="search"
            placeholder="Buscar coxinha, suco, bolo…"
            autocomplete="off"
          /><button type="submit" aria-label="Buscar">
            <Search :size="19" aria-hidden="true" />
          </button>
        </form>
        <nav aria-label="Menu mobile">
          <RouterLink
            :to="{ name: 'home' }"
            class="student-header__mobile-link"
            exact-active-class="is-active"
            @click="fechar()"
            >Início</RouterLink
          >
          <div
            v-for="item in itens"
            :key="item.tipo"
            class="student-header__mobile-group"
          >
            <button
              type="button"
              class="student-header__mobile-link"
              :class="{ 'is-active': route.name === item.tipo }"
              :aria-current="route.name === item.tipo ? 'page' : undefined"
              :aria-expanded="painel === item.tipo"
              :aria-controls="`mobile-${item.tipo}`"
              @click="alternar(item.tipo, $event)"
            >
              {{ item.rotulo }}<ChevronDown :size="18" aria-hidden="true" />
            </button>
            <div v-if="painel === item.tipo" :id="`mobile-${item.tipo}`">
              <StudentHeaderPanel :tipo="item.tipo" @navigate="fechar()" />
            </div>
          </div>
        </nav>
        <div class="student-header__mobile-account">
          <span>{{ auth.usuario?.name || "Sua conta" }}</span>
          <RouterLink :to="{ name: 'favoritos' }" @click="fechar()"
            ><Heart :size="18" aria-hidden="true" />Favoritos</RouterLink
          >
          <RouterLink :to="{ name: 'perfil' }" @click="fechar()"
            ><User :size="18" aria-hidden="true" />Meu perfil</RouterLink
          >
          <button type="button" @click="sair">
            <LogOut :size="18" aria-hidden="true" />Sair da conta
          </button>
        </div>
      </div>
    </Transition>
  </header>
</template>

<style scoped src="./StudentHeader.css"></style>
