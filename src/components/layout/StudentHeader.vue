<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { Bell, ChevronDown, Heart, LogOut, Menu, Search, ShoppingBag, User, X } from "lucide-vue-next";
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
const carrinho = ref(null);
const botaoMobile = ref(null);
const painel = ref(null);
const mobileAberto = ref(false);
const avatarComErro = ref(false);
const termoBusca = ref("");
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
const iniciais = computed(() => (auth.usuario?.name || "Cliente").split(/\s+/).filter(Boolean).slice(0, 2).map(p => p[0].toUpperCase()).join(""));
const rotuloCarrinho = computed(() => `Carrinho com ${cart.totalItens} ${cart.totalItens === 1 ? "item" : "itens"}`);
const rotuloNotificacoes = computed(() => notifications.naoLidas ? `Notificações: ${notifications.naoLidas} não lidas` : "Notificações");
const badge = (valor) => Number(valor) > 99 ? "99+" : valor;

watch(() => [route.name, route.query.busca], ([nome, busca]) => {
  termoBusca.value = nome === "cardapio" ? String(busca || "") : "";
}, { immediate: true });
watch(() => route.fullPath, () => fechar());
watch(() => auth.usuario?.avatar, () => { avatarComErro.value = false; });

function registrarGatilho(tipo, el) {
  if (el) gatilhos.set(tipo, el);
  else gatilhos.delete(tipo);
}
function cancelarFechamento() { window.clearTimeout(timerFechamento); }
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
  if (painel.value === tipo) { cancelarFechamento(); return; }
  abrir(tipo, event, true);
}
function agendarFechamento(event) {
  if (!consultaDesktop?.matches || event.pointerType !== "mouse") return;
  if (raiz.value?.contains(event.relatedTarget)) return;
  if (!aberturaHover && raiz.value?.contains(document.activeElement)) return;
  timerFechamento = window.setTimeout(() => { painel.value = null; }, 180);
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
function desativarPainel(el) { el.inert = true; el.setAttribute("aria-hidden", "true"); }
function ativarPainel(el) { el.inert = false; el.removeAttribute("aria-hidden"); }
function alternarMobile() {
  cancelarFechamento();
  mobileAberto.value = !mobileAberto.value;
  painel.value = null;
}
function clicarFora(event) {
  if ((painel.value || mobileAberto.value) && !raiz.value?.contains(event.target)) fechar();
}
function sairFoco(event) {
  if (event.relatedTarget && !raiz.value?.contains(event.relatedTarget)) fechar();
}
function buscar() {
  fechar();
  router.push({ name: "cardapio", query: termoBusca.value ? { busca: termoBusca.value } : {} });
}
function sair() { fechar(); emit("logout"); }
function aoMudarLayout() { fechar(); }

onMounted(() => {
  consultaDesktop = window.matchMedia("(min-width: 1180px)");
  consultaDesktop.addEventListener("change", aoMudarLayout);
  document.addEventListener("pointerdown", clicarFora);
  if (auth.autenticado) catalogo.carregarPromocoes();
});
onBeforeUnmount(() => {
  cancelarFechamento();
  consultaDesktop?.removeEventListener("change", aoMudarLayout);
  document.removeEventListener("pointerdown", clicarFora);
});
defineExpose({ elementoCarrinho: () => carrinho.value?.$el || null });
</script>

<template>
  <header ref="raiz" class="student-header" :class="{ 'is-expanded': painel || mobileAberto }" @keydown.esc="aoEscape" @focusout="sairFoco" @pointerleave="agendarFechamento" @pointerenter="cancelarFechamento">
    <div class="student-header__bar">
      <button ref="botaoMobile" type="button" class="student-header__icon student-header__mobile-toggle" :aria-label="mobileAberto ? 'Fechar menu' : 'Abrir menu'" :aria-expanded="mobileAberto" aria-controls="navegacao-mobile" @click="alternarMobile">
        <X v-if="mobileAberto" :size="22" aria-hidden="true" /><Menu v-else :size="22" aria-hidden="true" />
      </button>
      <RouterLink :to="{ name: 'home' }" class="student-header__brand" aria-label="Pires Panificadora - Início" @click="fechar()">
        <img src="/logo.png" alt="Pires Panificadora" />
      </RouterLink>
      <nav class="student-header__nav" aria-label="Navegação principal">
        <RouterLink :to="{ name: 'home' }" class="student-header__nav-link" exact-active-class="is-active" @click="fechar()" @pointerenter="painel = null">Início</RouterLink>
        <button v-for="item in itens" :key="item.tipo" :ref="el => registrarGatilho(item.tipo, el)" type="button" class="student-header__nav-link" :class="{ 'is-active': route.name === item.tipo, 'is-open': painel === item.tipo }" :aria-expanded="painel === item.tipo" :aria-controls="`painel-${item.tipo}`" @pointerenter="aoEntrar(item.tipo, $event)" @click="alternar(item.tipo, $event)" @keydown.down="abrirComTeclado(item.tipo, $event)">
          {{ item.rotulo }} <ChevronDown :size="13" aria-hidden="true" />
          <span v-if="item.tipo === 'promocoes' && catalogo.promocoesAtivas.length" class="student-header__badge">{{ badge(catalogo.promocoesAtivas.length) }}</span>
        </button>
      </nav>
      <form class="student-header__search student-header__search--desktop" role="search" @submit.prevent="buscar">
        <Search :size="17" aria-hidden="true" />
        <label for="busca-topo" class="student-header__sr">Buscar no cardápio</label>
        <input id="busca-topo" v-model.trim="termoBusca" type="search" placeholder="Qual vai ser o seu pedido?" autocomplete="off" />
      </form>
      <div class="student-header__actions">
        <RouterLink :to="{ name: 'favoritos' }" class="student-header__icon student-header__desktop-action" aria-label="Favoritos" title="Favoritos" @click="fechar()"><Heart :size="19" aria-hidden="true" /></RouterLink>
        <RouterLink :to="{ name: 'notificacoes' }" class="student-header__icon" :aria-label="rotuloNotificacoes" title="Notificações" @click="fechar()">
          <Bell :size="19" aria-hidden="true" /><span v-if="notifications.naoLidas" class="student-header__badge" aria-hidden="true">{{ badge(notifications.naoLidas) }}</span>
        </RouterLink>
        <button :ref="el => registrarGatilho('conta', el)" type="button" class="student-header__icon student-header__avatar student-header__desktop-action" :aria-label="`Conta de ${auth.usuario?.name || 'cliente'}`" :aria-expanded="painel === 'conta'" aria-controls="painel-conta" @click="alternar('conta', $event)" @keydown.down="abrirComTeclado('conta', $event)">
          <img v-if="auth.usuario?.avatar && !avatarComErro" :src="auth.usuario.avatar" alt="" referrerpolicy="no-referrer" @error="avatarComErro = true" /><span v-else>{{ iniciais }}</span>
        </button>
        <RouterLink ref="carrinho" :to="{ name: 'carrinho' }" class="student-header__cart" :class="{ 'pp-pulo': carrinhoPulando }" :aria-label="rotuloCarrinho" @click="fechar()">
          <ShoppingBag :size="19" aria-hidden="true" /><span class="student-header__cart-label">Carrinho</span><span class="student-header__cart-count" aria-hidden="true">{{ badge(cart.totalItens) }}</span>
        </RouterLink>
      </div>
    </div>

    <Transition name="header-panel" @before-enter="ativarPainel" @before-leave="desativarPainel">
      <div v-if="painel && !mobileAberto" :id="`painel-${painel}`" :key="painel" class="student-header__dropdown" :class="{ 'student-header__dropdown--account': painel === 'conta' }" @pointerenter="cancelarFechamento">
        <div class="student-header__glass student-header__desktop-panel"><StudentHeaderPanel :tipo="painel" @navigate="fechar()" @logout="sair" /></div>
      </div>
    </Transition>

    <Transition name="header-panel" @before-enter="ativarPainel" @before-leave="desativarPainel">
      <div v-if="mobileAberto" id="navegacao-mobile" class="student-header__mobile-panel student-header__glass">
        <form class="student-header__search" role="search" @submit.prevent="buscar">
          <Search :size="18" aria-hidden="true" /><label for="busca-mobile" class="student-header__sr">Buscar no cardápio</label>
          <input id="busca-mobile" v-model.trim="termoBusca" type="search" placeholder="Buscar coxinha, suco, bolo…" autocomplete="off" /><button type="submit" aria-label="Buscar"><Search :size="19" aria-hidden="true" /></button>
        </form>
        <nav aria-label="Menu mobile">
          <RouterLink :to="{ name: 'home' }" class="student-header__mobile-link" exact-active-class="is-active" @click="fechar()">Início</RouterLink>
          <div v-for="item in itens" :key="item.tipo" class="student-header__mobile-group">
            <button type="button" class="student-header__mobile-link" :aria-expanded="painel === item.tipo" :aria-controls="`mobile-${item.tipo}`" @click="alternar(item.tipo, $event)">{{ item.rotulo }}<ChevronDown :size="18" aria-hidden="true" /></button>
            <div v-if="painel === item.tipo" :id="`mobile-${item.tipo}`"><StudentHeaderPanel :tipo="item.tipo" @navigate="fechar()" /></div>
          </div>
        </nav>
        <div class="student-header__mobile-account">
          <span>{{ auth.usuario?.name || 'Sua conta' }}</span>
          <RouterLink :to="{ name: 'favoritos' }" @click="fechar()"><Heart :size="18" aria-hidden="true" />Favoritos</RouterLink>
          <RouterLink :to="{ name: 'perfil' }" @click="fechar()"><User :size="18" aria-hidden="true" />Meu perfil</RouterLink>
          <button type="button" @click="sair"><LogOut :size="18" aria-hidden="true" />Sair da conta</button>
        </div>
      </div>
    </Transition>
  </header>
</template>

<style scoped>
.student-header {
  position: fixed;
  z-index: 60;
  top: var(--pp-header-top);
  left: var(--pp-header-edge);
  right: var(--pp-header-edge);
  max-width: 1320px;
  margin-inline: auto;
  color: var(--pp-header-text);
}

.student-header.is-expanded {
  z-index: 80;
}

.student-header__bar, .student-header__glass {
  background: var(--pp-header-fallback);
  border: 1px solid var(--pp-header-line);
  border-radius: var(--pp-header-radius);
  box-shadow: var(--pp-header-shadow);
}

@supports ((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px))) {
  .student-header__bar, .student-header__glass {
    background: var(--pp-header-glass);
    -webkit-backdrop-filter: blur(22px) saturate(145%);
    backdrop-filter: blur(22px) saturate(145%);
  }

  .student-header__glass {
    background: var(--pp-header-panel-glass);
  }
}

.student-header__bar {
  min-height: var(--pp-header-height);
  padding: 12px 20px;
  display: flex;
  align-items: center;
  gap: 18px;
  box-shadow: var(--pp-header-shadow), inset 0 1px 0 var(--pp-header-reflection);
}

.student-header :is(a, button):focus-visible {
  outline: 2px solid var(--pp-header-accent);
  outline-offset: 3px;
}

.student-header__brand {
  flex: none;
  display: flex;
  align-items: center;
}

.student-header__brand img {
  width: 106px;
  max-width: 100%;
  height: 42px;
  object-fit: contain;
}

.student-header__nav {
  display: flex;
  align-items: center;
  gap: 3px;
}

.student-header__nav-link {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  min-height: 44px;
  padding: 0 10px;
  border: 0;
  border-radius: 10px;
  background: transparent;
  color: var(--pp-header-text);
  font-size: 13px;
  font-weight: 600;
  white-space: nowrap;
  cursor: pointer;
  transition: background .18s ease, color .18s ease;
}

.student-header__nav-link.is-active {
  color: var(--pp-header-accent);
}

.student-header__nav-link.is-active::after {
  content: '';
  position: absolute;
  bottom: 1px;
  left: 10px;
  right: 10px;
  height: 2px;
  border-radius: 2px;
  background: var(--pp-header-accent);
}

.student-header__nav-link:hover, .student-header__nav-link.is-open {
  background: var(--pp-header-hover);
}

.student-header__nav-link > svg {
  transition: transform .18s ease;
}

.student-header__nav-link[aria-expanded='true'] > svg {
  transform: rotate(180deg);
}

.student-header__search {
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 44px;
  padding: 0 14px;
  border: 1px solid var(--pp-header-line);
  border-radius: 14px;
  background: var(--pp-header-hover);
  color: var(--pp-header-text);
}

.student-header__search--desktop {
  flex: 1;
  margin-left: auto;
  max-width: 320px;
}

.student-header__search:focus-within {
  outline: 2px solid var(--pp-header-accent);
  outline-offset: 3px;
}

.student-header__search input {
  min-width: 0;
  width: 100%;
  border: 0;
  outline: 0;
  background: transparent;
  color: var(--pp-header-text);
  font-size: 13px;
}

.student-header__search input::placeholder {
  color: var(--pp-header-muted);
  opacity: 1;
}

.student-header__search input::-webkit-search-cancel-button {
  -webkit-appearance: none;
}

.student-header__search button {
  flex: none;
  display: grid;
  place-items: center;
  min-width: 44px;
  min-height: 44px;
  border: 0;
  background: transparent;
  color: inherit;
  cursor: pointer;
}

.student-header__actions {
  display: flex;
  align-items: center;
  gap: 6px;
  flex: none;
}

.student-header__icon {
  position: relative;
  width: 44px;
  height: 44px;
  display: grid;
  place-items: center;
  flex: none;
  border: 1px solid var(--pp-header-line);
  border-radius: 50%;
  background: transparent;
  color: var(--pp-header-text);
  cursor: pointer;
  transition: background .18s ease;
}

.student-header__icon:hover, .student-header__icon[aria-expanded='true'] {
  background: var(--pp-header-hover);
}

.student-header__avatar {
  padding: 0;
  overflow: hidden;
  background: var(--pp-header-hover);
  color: var(--pp-header-accent);
  font-size: 12px;
  font-weight: 700;
}

.student-header__avatar img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  display: block;
  border-radius: inherit;
  object-fit: cover;
}

.student-header__badge {
  display: grid;
  place-items: center;
  min-width: 18px;
  height: 18px;
  padding: 0 4px;
  border-radius: 12px;
  background: var(--pp-header-accent);
  color: var(--pp-header-fallback);
  font-size: 10px;
}

.student-header__icon .student-header__badge {
  position: absolute;
  top: -3px;
  right: -3px;
}

.student-header__cart {
  display: inline-flex;
  min-height: 44px;
  align-items: center;
  gap: 8px;
  padding: 0 8px 0 14px;
  border: 1px solid var(--pp-header-line);
  border-radius: 14px;
  background: var(--pp-header-hover);
  color: var(--pp-header-text);
  font-size: 13px;
  font-weight: 600;
}

.student-header__cart:hover {
  border-color: var(--pp-header-accent);
}

.student-header__cart-count {
  min-width: 26px;
  height: 26px;
  display: grid;
  place-items: center;
  padding: 0 5px;
  border-radius: 50%;
  background: var(--pp-header-accent);
  color: var(--pp-header-fallback);
  font-size: 12px;
}

.student-header__dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  padding-top: 12px;
}

.student-header__desktop-panel {
  max-height: calc(100dvh - var(--pp-header-top) - var(--pp-header-height) - 40px);
  overflow-y: auto;
}

.student-header__dropdown--account {
  left: auto;
  width: min(680px, 100%);
}

.student-header__mobile-toggle, .student-header__mobile-panel {
  display: none;
}

.student-header__sr {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
}

.header-panel-enter-active, .header-panel-leave-active {
  transition: opacity .18s ease, transform .18s ease;
}

.header-panel-enter-from, .header-panel-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}

@media (max-width: 1279px) and (min-width: 1180px) {
  .student-header__bar {
    gap: 10px;
    padding-inline: 16px;
  }

  .student-header__nav-link {
    padding-inline: 8px;
  }

  .student-header__cart-label {
    display: none;
  }
}

@media (max-width: 1179px) {
  .student-header__bar {
    min-height: var(--pp-header-height);
    padding: 8px;
    gap: 8px;
  }

  .student-header__nav, .student-header__search--desktop, .student-header__desktop-action, .student-header__dropdown {
    display: none;
  }

  .student-header__mobile-toggle {
    display: grid;
  }

  .student-header__brand {
    flex: 1;
    justify-content: center;
    min-width: 0;
  }

  .student-header__brand img {
    width: 108px;
    height: 36px;
  }

  .student-header__actions {
    gap: 6px;
  }

  .student-header__cart {
    padding: 0 8px;
    gap: 6px;
    border-radius: 14px;
  }

  .student-header__cart-label {
    display: none;
  }

  .student-header__cart-count {
    min-width: 22px;
    height: 22px;
    font-size: 11px;
  }

  .student-header__mobile-panel {
    display: block;
    margin-top: 10px;
    padding: 16px;
    max-height: calc(100dvh - var(--pp-header-top) - var(--pp-header-height) - 30px);
    overflow-y: auto;
    overscroll-behavior: contain;
  }

  .student-header__mobile-panel > form {
    margin-bottom: 16px;
  }

  .student-header__mobile-link {
    width: 100%;
    min-height: 54px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 12px;
    border: 0;
    border-bottom: 1px solid var(--pp-header-line);
    background: transparent;
    color: var(--pp-header-text);
    font-size: 15px;
    font-weight: 600;
    text-align: left;
    cursor: pointer;
  }

  .student-header__mobile-link:hover, .student-header__mobile-link.is-active, .student-header__mobile-link[aria-expanded='true'] {
    color: var(--pp-header-accent);
  }

  .student-header__mobile-link[aria-expanded='true'] > svg {
    transform: rotate(180deg);
  }

  .student-header__mobile-account {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 4px;
    padding: 20px 8px 0;
  }

  .student-header__mobile-account > span {
    grid-column: 1 / -1;
    font-size: 12px;
    color: var(--pp-header-muted);
    margin-bottom: 8px;
    overflow-wrap: anywhere;
  }

  .student-header__mobile-account :is(a,button) {
    min-height: 44px;
    display: flex;
    align-items: center;
    gap: 8px;
    border: 0;
    background: transparent;
    color: var(--pp-header-text);
    font-size: 13px;
    padding: 8px 0;
    text-align: left;
    cursor: pointer;
  }
}

@media (prefers-reduced-motion: reduce) {
  .header-panel-enter-active, .header-panel-leave-active {
    transition: none;
  }

  .header-panel-enter-from, .header-panel-leave-to {
    transform: none;
  }
}
</style>
