<template>
  <div class="student-layout" :class="{ 'has-chatbot': mostrarChatbot }">
    <header class="student-layout__topbar">
      <RouterLink
        :to="{ name: 'home' }"
        class="student-layout__brand"
        aria-label="Pires Panificadora - Início"
      >
        <img src="/logo.png" alt="Pires Panificadora" />
      </RouterLink>

      <nav class="student-layout__top-nav" aria-label="Navegação principal">
        <RouterLink
          v-for="item in topNavItems"
          :key="item.name"
          :to="{ name: item.name }"
          class="student-layout__top-link"
          exact-active-class="is-active"
        >
          {{ item.label }}
          <span v-if="item.badge" class="student-layout__badge">{{
            limitarBadge(item.badge)
          }}</span>
        </RouterLink>
      </nav>

      <form
        class="student-layout__search"
        role="search"
        @submit.prevent="buscarNoCardapio"
      >
        <Search :size="16" aria-hidden="true" />
        <label for="busca-topo" class="student-layout__sr">Buscar no cardápio</label>
        <input
          id="busca-topo"
          v-model.trim="termoBusca"
          type="search"
          placeholder="Buscar coxinha, suco, bolo…"
          autocomplete="off"
        />
      </form>

      <div class="student-layout__top-actions">
        <RouterLink
          :to="{ name: 'favoritos' }"
          class="student-layout__round-btn"
          aria-label="Favoritos"
          title="Favoritos"
        >
          <Heart :size="18" aria-hidden="true" />
        </RouterLink>
        <RouterLink
          :to="{ name: 'notificacoes' }"
          class="student-layout__round-btn"
          :aria-label="rotuloNotificacoes"
          title="Notificações"
        >
          <Bell :size="18" aria-hidden="true" />
          <span
            v-if="notifications.naoLidas"
            class="student-layout__badge-dot"
            aria-hidden="true"
            >{{ limitarBadge(notifications.naoLidas) }}</span
          >
        </RouterLink>

        <div
          ref="contaRef"
          class="student-layout__account"
          @keydown.esc="fecharContaComTeclado"
        >
          <button
            ref="botaoConta"
            type="button"
            class="student-layout__round-btn student-layout__avatar"
            :aria-expanded="contaAberta"
            :aria-controls="contaAberta ? 'menu-conta' : undefined"
            :aria-label="rotuloConta"
            @click="contaAberta = !contaAberta"
          >
            <img
              v-if="avatarDisponivel"
              :src="auth.usuario.avatar"
              alt=""
              @error="avatarComErro = true"
            />
            <template v-else>{{ iniciais }}</template>
          </button>
          <div
            v-if="contaAberta"
            id="menu-conta"
            class="student-layout__account-menu"
          >
            <strong>{{ auth.usuario?.name || "Cliente" }}</strong>
            <RouterLink :to="{ name: 'perfil' }" @click="fecharConta">
              <User :size="16" aria-hidden="true" /> Meu perfil
            </RouterLink>
            <RouterLink :to="{ name: 'favoritos' }" @click="fecharConta">
              <Heart :size="16" aria-hidden="true" /> Favoritos
            </RouterLink>
            <button type="button" @click="handleLogout">
              <LogOut :size="16" aria-hidden="true" /> Sair da conta
            </button>
          </div>
        </div>

        <RouterLink
          ref="carrinhoTopo"
          :to="{ name: 'carrinho' }"
          class="student-layout__cart"
          :class="{ 'pp-pulo': carrinhoPulando }"
          :aria-label="rotuloCarrinho"
        >
          <ShoppingBag :size="18" aria-hidden="true" />
          <span>Carrinho</span>
          <span class="student-layout__cart-count" aria-hidden="true">{{
            limitarBadge(cart.totalItens)
          }}</span>
        </RouterLink>
      </div>
    </header>

    <header class="student-layout__mobile-header">
      <button
        type="button"
        class="student-layout__menu-btn"
        aria-label="Abrir menu"
        @click="menuAberto = true"
      >
        <Menu :size="22" />
      </button>

      <RouterLink
        :to="{ name: 'home' }"
        class="student-layout__mobile-brand"
        aria-label="Pires Panificadora - Início"
      >
        <img
          src="/logo.png"
          alt="Pires Panificadora"
          class="student-layout__mobile-logo"
        />
      </RouterLink>

      <div class="student-layout__mobile-actions">
        <RouterLink
          :to="{ name: 'notificacoes' }"
          class="student-layout__icon-btn"
          aria-label="Notificações"
        >
          <Bell :size="19" />
          <span
            v-if="notifications.naoLidas"
            class="student-layout__badge-dot"
            >{{ limitarBadge(notifications.naoLidas) }}</span
          >
        </RouterLink>
        <RouterLink
          ref="carrinhoMobile"
          :to="{ name: 'carrinho' }"
          class="student-layout__icon-btn"
          :class="{ 'pp-pulo': carrinhoPulando }"
          aria-label="Carrinho"
        >
          <ShoppingCart :size="19" />
          <span v-if="cart.totalItens" class="student-layout__badge-dot">{{
            limitarBadge(cart.totalItens)
          }}</span>
        </RouterLink>
      </div>
    </header>

    <Transition name="drawer-fade">
      <div
        v-if="menuAberto"
        class="student-layout__drawer-backdrop"
        @click="menuAberto = false"
      >
        <aside class="student-layout__drawer" @click.stop>
          <div class="student-layout__drawer-head">
            <img
              src="/logo.png"
              alt="Pires Panificadora"
              class="student-layout__drawer-logo"
            />
            <button
              type="button"
              aria-label="Fechar menu"
              @click="menuAberto = false"
            >
              <X :size="20" />
            </button>
          </div>

          <nav class="student-layout__nav" aria-label="Menu mobile">
            <RouterLink
              v-for="item in navItems"
              :key="item.name"
              :to="{ name: item.name }"
              class="student-layout__nav-item"
              exact-active-class="is-active"
              @click="menuAberto = false"
            >
              <component :is="item.icon" :size="20" aria-hidden="true" />
              <span>{{ item.label }}</span>
              <span v-if="item.badge" class="student-layout__badge">{{
                limitarBadge(item.badge)
              }}</span>
            </RouterLink>
          </nav>

          <button
            type="button"
            class="student-layout__drawer-logout"
            @click="handleLogout"
          >
            <LogOut :size="19" />
            <span>Sair da conta</span>
          </button>
        </aside>
      </div>
    </Transition>

    <main class="student-layout__main">
      <RouterView />
    </main>

    <ChatbotWidget v-if="mostrarChatbot" />

    <nav class="student-layout__bottom-nav" aria-label="Navegação rápida">
      <RouterLink
        v-for="item in bottomNavItems"
        :key="item.name"
        :to="{ name: item.name }"
        class="student-layout__bottom-item"
        exact-active-class="is-active"
      >
        <span class="student-layout__bottom-icon-wrap">
          <component :is="item.icon" :size="20" aria-hidden="true" />
          <span
            v-if="item.badge"
            class="student-layout__badge-dot student-layout__badge-dot--bottom"
          >
            {{ limitarBadge(item.badge) }}
          </span>
        </span>
        <span>{{ item.label }}</span>
      </RouterLink>
    </nav>
  </div>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import {
  Bell,
  ClipboardList,
  Heart,
  Home,
  LayoutGrid,
  LogOut,
  Menu,
  Search,
  ShoppingBag,
  ShoppingCart,
  Tag,
  User,
  X,
} from "lucide-vue-next";

import ChatbotWidget from "@/components/chatbot/ChatbotWidget.vue";
import catalogService, { promocaoEstaAtiva } from "@/services/catalog.service";
import { useAuthStore } from "@/stores/auth";
import { useCartStore } from "@/stores/cart";
import { useChatStore } from "@/stores/chat";
import { useChatbotStore } from "@/stores/chatbot";
import { useNotificationsStore } from "@/stores/notifications";
import { useOrdersStore } from "@/stores/orders";
import { animarVooAoCarrinho } from "@/utils/vooAoCarrinho";

const auth = useAuthStore();
const cart = useCartStore();
const chat = useChatStore();
const chatbot = useChatbotStore();
const notifications = useNotificationsStore();
const orders = useOrdersStore();
const router = useRouter();
const route = useRoute();

const menuAberto = ref(false);
const contaAberta = ref(false);
const contaRef = ref(null);
const botaoConta = ref(null);
const termoBusca = ref(route.name === "cardapio" ? String(route.query.busca || "") : "");
const carrinhoTopo = ref(null);
const carrinhoMobile = ref(null);
const carrinhoPulando = ref(false);
let timerPulo = null;
let pararDeOuvirCarrinho = null;
const promoCount = ref(0);
const avatarComErro = ref(false);

const avatarDisponivel = computed(
  () => Boolean(auth.usuario?.avatar) && !avatarComErro.value,
);

watch(
  () => auth.usuario?.avatar,
  () => {
    avatarComErro.value = false;
  },
);

const iniciais = computed(() => {
  const nome = auth.usuario?.name || "";
  return (
    nome
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((parte) => parte[0]?.toUpperCase())
      .join("") || "A"
  );
});

// No checkout o cliente está pagando: o assistente não disputa espaço com o formulário.
const mostrarChatbot = computed(() => route.name !== "checkout");

const navItems = computed(() => [
  { name: "home", label: "Início", icon: Home },
  { name: "cardapio", label: "Cardápio", icon: LayoutGrid },
  {
    name: "promocoes",
    label: "Promoções",
    icon: Tag,
    badge: promoCount.value || null,
  },
  {
    name: "carrinho",
    label: "Meu Carrinho",
    icon: ShoppingCart,
    badge: cart.totalItens || null,
  },
  { name: "pedidos", label: "Meus Pedidos", icon: ClipboardList },
  { name: "favoritos", label: "Favoritos", icon: Heart },
  {
    name: "notificacoes",
    label: "Notificações",
    icon: Bell,
    badge: notifications.naoLidas || null,
  },
  { name: "perfil", label: "Perfil", icon: User },
]);

// Menu do topo (desktop): o essencial para pedir; conta e carrinho ficam à direita.
const topNavItems = computed(() => [
  { name: "home", label: "Início" },
  { name: "cardapio", label: "Cardápio" },
  { name: "promocoes", label: "Promoções", badge: promoCount.value || null },
  { name: "pedidos", label: "Meus pedidos" },
]);

const rotuloNotificacoes = computed(() =>
  notifications.naoLidas
    ? `Notificações: ${notifications.naoLidas} não lidas`
    : "Notificações",
);
const rotuloConta = computed(() => `Conta de ${auth.usuario?.name || "cliente"}`);
const rotuloCarrinho = computed(
  () => `Carrinho com ${cart.totalItens} ${cart.totalItens === 1 ? "item" : "itens"}`,
);

const bottomNavItems = computed(() => [
  { name: "home", label: "Início", icon: Home },
  { name: "cardapio", label: "Cardápio", icon: LayoutGrid },
  {
    name: "carrinho",
    label: "Carrinho",
    icon: ShoppingCart,
    badge: cart.totalItens || null,
  },
  { name: "pedidos", label: "Pedidos", icon: ClipboardList },
  { name: "perfil", label: "Perfil", icon: User },
]);

function limitarBadge(valor) {
  const numero = Number(valor || 0);
  return numero > 99 ? "99+" : numero;
}

function buscarNoCardapio() {
  const busca = termoBusca.value;
  router.push({ name: "cardapio", query: busca ? { busca } : {} });
}

// Fora do cardápio a busca do topo começa vazia; no cardápio, acompanha a URL.
watch(
  () => [route.name, route.query.busca],
  ([nome, busca]) => {
    termoBusca.value = nome === "cardapio" ? String(busca || "") : "";
  },
);

function fecharConta() {
  contaAberta.value = false;
}

function fecharContaComTeclado() {
  if (!contaAberta.value) return;
  fecharConta();
  botaoConta.value?.focus();
}

function fecharContaAoClicarFora(event) {
  if (contaAberta.value && !contaRef.value?.contains(event.target)) {
    fecharConta();
  }
}

watch(() => route.fullPath, fecharConta);

function elementoDoCarrinhoVisivel() {
  const candidatos = [carrinhoTopo.value?.$el, carrinhoMobile.value?.$el];
  return candidatos.find((el) => el && el.getBoundingClientRect().width > 0) || null;
}

async function pularContador() {
  window.clearTimeout(timerPulo);
  carrinhoPulando.value = false;
  await nextTick();
  carrinhoPulando.value = true;
  timerPulo = window.setTimeout(() => {
    carrinhoPulando.value = false;
  }, 500);
}

async function handleLogout() {
  menuAberto.value = false;
  contaAberta.value = false;
  chat.resetar();
  chatbot.resetar();
  await auth.logout();
  await router.replace({ name: "login" });
}

async function buscarPromocoesAtivas() {
  try {
    const lista = await catalogService.listarPromocoes();
    promoCount.value = lista.filter((promocao) =>
      promocaoEstaAtiva(promocao),
    ).length;
  } catch {
    promoCount.value = 0;
  }
}

// Notificação nova costuma ser mudança de pedido (ex.: "pronto"): atualiza os pedidos na hora,
// sem esperar o próximo ciclo da tela "Meus pedidos".
watch(
  () => notifications.naoLidas,
  (atual, anterior) => {
    if (atual > anterior && orders.inicializado) {
      orders.carregar({ force: true, silencioso: true }).catch(() => {});
    }
  },
);

onMounted(() => {
  notifications.iniciarPolling();
  // Contador de mensagens novas do chat nos cards de "Meus pedidos".
  chat.iniciarPollingNaoLidas(30_000);
  buscarPromocoesAtivas();
  document.addEventListener("click", fecharContaAoClicarFora);
  // Só depois que o item entrou no carrinho (sem erro): o produto voa e o contador pula.
  pararDeOuvirCarrinho = cart.$onAction(({ name, after }) => {
    if (name !== "adicionar") return;
    after(async () => {
      await animarVooAoCarrinho(elementoDoCarrinhoVisivel());
      pularContador();
    });
  });
});

onBeforeUnmount(() => {
  notifications.pararPolling();
  chat.pararPollingNaoLidas();
  document.removeEventListener("click", fecharContaAoClicarFora);
  pararDeOuvirCarrinho?.();
  window.clearTimeout(timerPulo);
});
</script>

<style scoped>
.student-layout {
  min-height: 100vh;
  background: var(--student-bg);
}
.student-layout__topbar {
  position: sticky;
  top: 0;
  z-index: 60;
  height: var(--pp-altura-topo);
  display: flex;
  align-items: center;
  gap: 24px;
  padding: 0 max(32px, calc((100vw - 1240px) / 2));
  border-bottom: 1px solid var(--student-border);
  background: var(--pp-creme);
}
.student-layout__brand {
  flex: 0 0 auto;
  display: flex;
  align-items: center;
}
.student-layout__brand img {
  width: 128px;
  max-height: 44px;
  object-fit: contain;
  object-position: left center;
}
.student-layout__top-nav {
  display: flex;
  align-items: center;
  gap: 22px;
}
.student-layout__top-link {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 0;
  border-bottom: 2px solid transparent;
  color: var(--student-text);
  font-size: 14px;
  font-weight: 600;
  white-space: nowrap;
  transition: color 0.15s ease;
}
.student-layout__top-link:hover {
  color: var(--student-accent);
}
.student-layout__top-link.is-active {
  border-color: var(--pp-gold);
  color: var(--student-accent);
}
.student-layout__search {
  flex: 1;
  max-width: 380px;
  margin-left: auto;
  height: 42px;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 16px;
  border: 1px solid var(--student-border);
  border-radius: var(--pp-radius-full);
  background: var(--student-surface);
  color: var(--student-muted-2);
}
.student-layout__search:focus-within {
  border-color: var(--student-accent);
  outline: 2.5px solid var(--pp-gold);
  outline-offset: 2px;
}
.student-layout__search input {
  min-width: 0;
  flex: 1;
  border: 0;
  outline: 0;
  background: transparent;
  color: var(--student-text);
  font-size: 14px;
}
.student-layout__sr {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
}
.student-layout__top-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}
.student-layout__round-btn {
  position: relative;
  width: 40px;
  height: 40px;
  display: grid;
  place-items: center;
  padding: 0;
  border: 1px solid var(--student-border);
  border-radius: 50%;
  background: var(--student-surface);
  color: var(--student-text);
  cursor: pointer;
  transition: border-color 0.15s ease;
}
.student-layout__round-btn:hover {
  border-color: var(--student-border-strong);
}
.student-layout__round-btn .student-layout__badge-dot {
  top: -4px;
  right: -4px;
}
.student-layout__avatar {
  overflow: hidden;
  background: var(--student-accent-soft);
  color: var(--student-accent-hover);
  font-size: 12px;
  font-weight: 700;
}
.student-layout__avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.student-layout__account {
  position: relative;
}
.student-layout__account-menu {
  position: absolute;
  right: 0;
  top: calc(100% + 8px);
  min-width: 210px;
  display: grid;
  gap: 2px;
  padding: 8px;
  border: 1px solid var(--student-border);
  border-radius: var(--student-radius);
  background: var(--student-surface);
  box-shadow: var(--student-shadow);
}
.student-layout__account-menu strong {
  margin-bottom: 4px;
  padding: 6px 10px 8px;
  border-bottom: 1px solid var(--student-border);
  font-size: 13px;
}
.student-layout__account-menu a,
.student-layout__account-menu button {
  min-height: 38px;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 10px;
  border: 0;
  border-radius: var(--student-radius-sm);
  background: transparent;
  color: var(--student-text);
  font-size: 14px;
  text-align: left;
  cursor: pointer;
}
.student-layout__account-menu a:hover,
.student-layout__account-menu button:hover {
  background: var(--student-surface-soft);
}
.student-layout__cart {
  height: 42px;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 0 8px 0 16px;
  border-radius: var(--pp-radius-full);
  background: var(--student-text);
  color: var(--pp-creme);
  font-size: 14px;
  font-weight: 700;
  transition: background 0.2s ease;
}
.student-layout__cart:hover {
  background: var(--pp-marrom-2);
}
.student-layout__cart-count {
  min-width: 26px;
  height: 26px;
  display: grid;
  place-items: center;
  padding: 0 6px;
  border-radius: var(--pp-radius-full);
  background: var(--pp-gold);
  color: var(--student-text);
  font-size: 12px;
}
@media (max-width: 1180px) {
  .student-layout__topbar {
    gap: 16px;
  }
  .student-layout__top-nav {
    gap: 14px;
  }
  .student-layout__cart > span:not(.student-layout__cart-count) {
    display: none;
  }
}
.student-layout__nav {
  display: flex;
  flex-direction: column;
  gap: 3px;
}
.student-layout__nav-item {
  min-height: 42px;
  display: grid;
  grid-template-columns: 22px minmax(0, 1fr) auto;
  align-items: center;
  gap: 10px;
  padding: 0 11px;
  border-radius: 7px;
  color: #c9beb4;
  font-size: 13px;
  font-weight: 600;
  transition:
    background 0.15s ease,
    color 0.15s ease;
}
.student-layout__nav-item:hover {
  background: rgba(255, 255, 255, 0.055);
  color: #fff;
}
.student-layout__nav-item.is-active {
  background: rgba(224, 168, 62, 0.13);
  color: #f6d79f;
}
.student-layout__nav-item.is-active::before {
  content: "";
  position: absolute;
  width: 3px;
  height: 20px;
  margin-left: -11px;
  border-radius: 0 3px 3px 0;
  background: #d99b35;
}
.student-layout__nav-item {
  position: relative;
}
.student-layout__badge {
  min-width: 20px;
  height: 20px;
  padding: 0 6px;
  display: grid;
  place-items: center;
  border-radius: 999px;
  background: #d99b35;
  color: #24160c;
  font-size: 10px;
  font-weight: 800;
}
.student-layout__icon-btn,
.student-layout__menu-btn {
  display: grid;
  place-items: center;
  border: 0;
  background: transparent;
  cursor: pointer;
}
.student-layout__main {
  min-width: 0;
  max-width: 1304px;
  margin: 0 auto;
  padding: 28px 32px 56px;
}
.student-layout__mobile-header,
.student-layout__bottom-nav {
  display: none;
}
.student-layout__drawer-backdrop {
  position: fixed;
  inset: 0;
  z-index: 80;
  background: rgba(20, 14, 10, 0.45);
}
.student-layout__drawer {
  width: min(310px, 86vw);
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 18px 14px;
  background: var(--student-sidebar);
  color: #efe6dc;
}
.student-layout__drawer-head {
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 6px 12px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}
.student-layout__drawer-logo {
  width: 145px;
  max-height: 34px;
  object-fit: contain;
  object-position: left center;
}
.student-layout__drawer-head button {
  width: 34px;
  height: 34px;
  display: grid;
  place-items: center;
  border: 0;
  border-radius: 7px;
  background: transparent;
  color: #c9beb4;
}
.student-layout__drawer-logout {
  margin-top: auto;
  min-height: 42px;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 11px;
  border: 1px solid rgba(255, 255, 255, 0.09);
  border-radius: 7px;
  background: transparent;
  color: #c9beb4;
}
.student-layout__mobile-brand img {
  display: block;
}
.student-layout__badge-dot {
  position: absolute;
  min-width: 17px;
  height: 17px;
  padding: 0 4px;
  display: grid;
  place-items: center;
  border-radius: 999px;
  background: var(--student-accent);
  color: var(--student-surface);
  font-size: 9px;
  font-weight: 800;
}
.drawer-fade-enter-active,
.drawer-fade-leave-active {
  transition: opacity 0.16s ease;
}
.drawer-fade-enter-from,
.drawer-fade-leave-to {
  opacity: 0;
}
@media (max-width: 980px) {
  .student-layout {
    display: block;
    padding-top: 58px;
    padding-bottom: 66px;
  }
  .student-layout__topbar {
    display: none;
  }
  .student-layout__mobile-header {
    position: fixed;
    inset: 0 0 auto 0;
    z-index: 50;
    height: 58px;
    display: grid;
    grid-template-columns: 42px 1fr auto;
    align-items: center;
    gap: 8px;
    padding: 0 14px;
    background: var(--pp-creme);
    border-bottom: 1px solid var(--student-border);
  }
  .student-layout__menu-btn {
    width: 38px;
    height: 38px;
    color: var(--student-text);
    border-radius: 7px;
  }
  .student-layout__mobile-brand {
    justify-self: center;
  }
  .student-layout__mobile-logo {
    height: 32px;
    width: auto;
    max-width: 145px;
    object-fit: contain;
  }
  .student-layout__mobile-actions {
    display: flex;
    gap: 4px;
  }
  .student-layout__icon-btn {
    position: relative;
    width: 38px;
    height: 38px;
    color: var(--student-text);
    border-radius: 7px;
  }
  .student-layout__icon-btn .student-layout__badge-dot {
    top: 1px;
    right: 0;
  }
  .student-layout__main {
    padding: 22px 18px 34px;
  }
  .student-layout__bottom-nav {
    position: fixed;
    inset: auto 0 0;
    z-index: 50;
    height: 64px;
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    padding: 5px max(4px, env(safe-area-inset-right))
      max(5px, env(safe-area-inset-bottom)) max(4px, env(safe-area-inset-left));
    background: var(--pp-creme);
    border-top: 1px solid var(--student-border);
  }
  .student-layout__bottom-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 3px;
    color: var(--student-muted);
    font-size: 10px;
    font-weight: 600;
  }
  .student-layout__bottom-item.is-active {
    color: var(--student-accent-hover);
  }
  .student-layout__bottom-icon-wrap {
    position: relative;
    display: grid;
    place-items: center;
    width: 28px;
    height: 24px;
  }
  .student-layout__badge-dot--bottom {
    top: -5px;
    right: -6px;
  }
}
@media (max-width: 980px) {
  /* Espaço para o botão do assistente não cobrir o fim da página. */
  .student-layout.has-chatbot {
    padding-bottom: calc(66px + 64px);
  }
}
@media (max-width: 520px) {
  .student-layout__main {
    padding: 18px 13px 28px;
  }
}
</style>
