<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { ClipboardList, Home, LayoutGrid, ShoppingCart, User } from "lucide-vue-next";
import StudentHeader from "@/components/layout/StudentHeader.vue";
import ChatbotWidget from "@/components/chatbot/ChatbotWidget.vue";
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
const header = ref(null);
const carrinhoPulando = ref(false);
let timerPulo = null;
let pararDeOuvirCarrinho = null;
const mostrarChatbot = computed(() => route.name !== "checkout");
const bottomNavItems = computed(() => [
  { name: "home", label: "Início", icon: Home },
  { name: "cardapio", label: "Cardápio", icon: LayoutGrid },
  { name: "carrinho", label: "Carrinho", icon: ShoppingCart, badge: cart.totalItens || null },
  { name: "pedidos", label: "Pedidos", icon: ClipboardList },
  { name: "perfil", label: "Perfil", icon: User },
]);
function limitarBadge(valor) { return Number(valor || 0) > 99 ? "99+" : valor; }
async function pularContador() {
  window.clearTimeout(timerPulo);
  carrinhoPulando.value = false;
  await nextTick();
  carrinhoPulando.value = true;
  timerPulo = window.setTimeout(() => { carrinhoPulando.value = false; }, 500);
}
async function handleLogout() {
  chat.resetar();
  chatbot.resetar();
  await auth.logout();
  await router.replace({ name: "login" });
}
watch(() => notifications.naoLidas, (atual, anterior) => {
  if (atual > anterior && orders.inicializado) orders.carregar({ force: true, silencioso: true }).catch(() => {});
});
onMounted(() => {
  notifications.iniciarPolling();
  chat.iniciarPollingNaoLidas(30_000);
  pararDeOuvirCarrinho = cart.$onAction(({ name, after }) => {
    if (name !== "adicionar") return;
    after(async () => {
      await animarVooAoCarrinho(header.value?.elementoCarrinho());
      pularContador();
    });
  });
});
onBeforeUnmount(() => {
  notifications.pararPolling();
  chat.pararPollingNaoLidas();
  pararDeOuvirCarrinho?.();
  window.clearTimeout(timerPulo);
});
</script>

<template>
  <div class="student-layout" :class="{ 'has-chatbot': mostrarChatbot }">
    <StudentHeader ref="header" :carrinho-pulando="carrinhoPulando" @logout="handleLogout" />
    <main class="student-layout__main"><RouterView /></main>
    <ChatbotWidget v-if="mostrarChatbot" />
    <nav class="student-layout__bottom-nav" aria-label="Navegação rápida">
      <RouterLink v-for="item in bottomNavItems" :key="item.name" :to="{ name: item.name }" class="student-layout__bottom-item" exact-active-class="is-active">
        <span class="student-layout__bottom-icon-wrap">
          <component :is="item.icon" :size="20" aria-hidden="true" />
          <span v-if="item.badge" class="student-layout__badge-dot student-layout__badge-dot--bottom">{{ limitarBadge(item.badge) }}</span>
        </span>
        <span>{{ item.label }}</span>
      </RouterLink>
    </nav>
  </div>
</template>

<style scoped>
.student-layout {
  min-height: 100vh;
  padding-top: calc(var(--pp-header-top) + var(--pp-header-height) + 28px);
  background: var(--student-bg);
}

.student-layout__main {
  min-width: 0;
  max-width: 1304px;
  margin: 0 auto;
  padding: 0 32px 56px;
}

.student-layout__bottom-nav {
  display: none;
}

@media (max-width: 980px) {
  .student-layout {
    padding-bottom: 66px;
  }

  .student-layout__main {
    padding: 0 18px 34px;
  }

  .student-layout__bottom-nav {
    position: fixed;
    inset: auto 0 0;
    z-index: 50;
    height: 64px;
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    padding: 5px max(4px, env(safe-area-inset-right)) max(5px, env(safe-area-inset-bottom)) max(4px, env(safe-area-inset-left));
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

  .student-layout__badge-dot--bottom {
    top: -5px;
    right: -6px;
  }

  .student-layout.has-chatbot {
    padding-bottom: calc(66px + 64px);
  }
}

@media (max-width: 520px) {
  .student-layout__main {
    padding: 0 13px 28px;
  }
}
</style>
