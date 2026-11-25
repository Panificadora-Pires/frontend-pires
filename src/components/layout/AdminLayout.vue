<template>
  <div class="admin-layout">
    <a class="admin-skip-link" href="#admin-conteudo">Ir para o conteúdo</a>
    <aside class="admin-sidebar" aria-label="Administração Pires">
      <RouterLink
        :to="{ name: 'admin-dashboard' }"
        class="admin-brand"
        aria-label="Pires Panificadora — Administração"
      >
        <img src="/logo.png" alt="Pires Panificadora" /><span
          >Administração</span
        >
      </RouterLink>
      <AdminNavigation :groups="navGroups" :route-name="route.name" />
      <div class="admin-sidebar__footer">
        <span class="admin-workplace"
          ><Store :size="17" aria-hidden="true" />Balcão Pires</span
        >
        <div class="admin-user">
          <span class="admin-user__avatar" aria-hidden="true">{{
            iniciais
          }}</span>
          <div class="admin-user__copy">
            <strong :title="auth.usuario?.name">{{
              auth.usuario?.name || "Administrador"
            }}</strong>
            <span :title="auth.usuario?.email">{{
              auth.usuario?.email || "Conta administrativa"
            }}</span>
          </div>
          <button
            type="button"
            class="admin-icon-button"
            aria-label="Sair da conta"
            @click="handleLogout"
          >
            <LogOut :size="18" aria-hidden="true" />
          </button>
        </div>
      </div>
    </aside>

    <header class="admin-mobile-header">
      <button
        ref="menuTrigger"
        type="button"
        class="admin-icon-button"
        aria-label="Abrir menu"
        aria-controls="admin-mobile-menu"
        :aria-expanded="menuAberto"
        @click="abrirMenu"
      >
        <Menu :size="21" aria-hidden="true" />
      </button>
      <RouterLink
        :to="{ name: 'admin-dashboard' }"
        class="admin-mobile-header__brand"
        ><img src="/logo.png" alt="Pires Panificadora" /><strong
          >Administração</strong
        ></RouterLink
      >
      <span class="admin-user__avatar" aria-hidden="true">{{ iniciais }}</span>
    </header>
    <main id="admin-conteudo" class="admin-main" tabindex="-1">
      <RouterView v-slot="{ Component, route: viewRoute }">
        <Transition name="admin-route" mode="out-in">
          <component :is="Component" :key="viewRoute.name" />
        </Transition>
      </RouterView>
    </main>

    <dialog
      id="admin-mobile-menu"
      ref="menuDialog"
      class="admin-drawer"
      aria-labelledby="admin-menu-title"
      @cancel.prevent="fecharMenu()"
      @click="fecharPeloFundo"
    >
      <div class="admin-drawer__header">
        <RouterLink
          :to="{ name: 'admin-dashboard' }"
          class="admin-brand"
          @click="fecharMenu({ restaurarFoco: false })"
          ><img src="/logo.png" alt="Pires Panificadora" /><span
            id="admin-menu-title"
            >Administração</span
          ></RouterLink
        >
        <button
          ref="closeTrigger"
          type="button"
          class="admin-icon-button"
          aria-label="Fechar menu"
          @click="fecharMenu()"
        >
          <X :size="20" aria-hidden="true" />
        </button>
      </div>
      <AdminNavigation
        :groups="navGroups"
        :route-name="route.name"
        label="Navegação administrativa móvel"
        @navigate="fecharMenu({ restaurarFoco: false })"
      />
      <div class="admin-sidebar__footer">
        <div class="admin-user">
          <span class="admin-user__avatar" aria-hidden="true">{{
            iniciais
          }}</span>
          <div class="admin-user__copy">
            <strong :title="auth.usuario?.name">{{
              auth.usuario?.name || "Administrador"
            }}</strong
            ><span :title="auth.usuario?.email">{{
              auth.usuario?.email || "Conta administrativa"
            }}</span>
          </div>
          <button
            type="button"
            class="admin-icon-button"
            aria-label="Sair da conta"
            @click="handleLogout"
          >
            <LogOut :size="18" aria-hidden="true" />
          </button>
        </div>
      </div>
    </dialog>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import {
  BarChart3,
  Boxes,
  ClipboardList,
  LayoutDashboard,
  Layers3,
  LogOut,
  Menu,
  Store,
  Tags,
  Users,
  X,
} from "lucide-vue-next";
import "@/assets/styles/admin.css";
import "@/assets/styles/admin-tokens.css";
import AdminNavigation from "@/components/admin/AdminNavigation.vue";
import { useAdminOrdersStore } from "@/stores/adminOrders";
import { useAdminQueueSummaryStore } from "@/stores/adminQueueSummary";
import { useAdminDashboardStore } from "@/stores/adminDashboard";
import { useAuthStore } from "@/stores/auth";
import { useChatStore } from "@/stores/chat";
import { REALTIME_ENABLED, realtimeClient } from "@/services/realtime";

const auth = useAuthStore();
const adminOrders = useAdminOrdersStore();
const queueSummary = useAdminQueueSummaryStore();
const dashboard = useAdminDashboardStore();
const chat = useChatStore();
const router = useRouter();
const route = useRoute();
const menuAberto = ref(false);
const menuDialog = ref(null);
const menuTrigger = ref(null);
const closeTrigger = ref(null);
let desktopMedia = null;
let overflowAnterior = null;
let desinscreverRealtime = null;
let timerRealtime = null;
let atualizarPedidosRealtime = false;
let atualizarChatRealtime = false;
function limparPendenciasRealtime() {
  if (timerRealtime !== null) clearTimeout(timerRealtime);
  timerRealtime = null;
  atualizarPedidosRealtime = false;
  atualizarChatRealtime = false;
}
function agendarRealtime(evento) {
  if (!evento || evento.tipo.startsWith("pedido."))
    atualizarPedidosRealtime = true;
  if (!evento || evento.tipo.startsWith("chat.")) atualizarChatRealtime = true;
  if (
    timerRealtime !== null ||
    (!atualizarPedidosRealtime && !atualizarChatRealtime)
  )
    return;
  timerRealtime = setTimeout(() => {
    timerRealtime = null;
    const pedidos = atualizarPedidosRealtime;
    const chatPendente = atualizarChatRealtime;
    atualizarPedidosRealtime = false;
    atualizarChatRealtime = false;
    if (pedidos) void queueSummary.atualizarAgora().catch(() => {});
    if (chatPendente) void chat.carregarNaoLidas().catch(() => {});
  }, 400);
}

const iniciais = computed(() => {
  const nome = auth.usuario?.name || auth.usuario?.email || "Admin";
  return (
    nome
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((parte) => parte[0]?.toUpperCase())
      .join("") || "AD"
  );
});
const navGroups = computed(() => [
  {
    label: "Visão geral",
    items: [
      { name: "admin-dashboard", label: "Dashboard", icon: LayoutDashboard },
    ],
  },
  {
    label: "Operação",
    items: [
      {
        name: "admin-pedidos",
        label: "Pedidos",
        icon: ClipboardList,
        badge: queueSummary.aguardandoAcao || null,
        children: ["admin-pedido-detalhes"],
      },
    ],
  },
  {
    label: "Catálogo",
    items: [
      {
        name: "admin-produtos",
        label: "Produtos",
        icon: Boxes,
        children: ["admin-produto-novo", "admin-produto-editar"],
      },
      { name: "admin-categorias", label: "Categorias", icon: Layers3 },
      { name: "admin-promocoes", label: "Promoções", icon: Tags },
    ],
  },
  {
    label: "Gestão",
    items: [
      { name: "admin-relatorios", label: "Relatórios", icon: BarChart3 },
      { name: "admin-usuarios", label: "Usuários", icon: Users },
    ],
  },
]);

function restaurarRolagem() {
  if (overflowAnterior === null) return;
  const { valor, prioridade } = overflowAnterior;
  if (valor) document.body.style.setProperty("overflow", valor, prioridade);
  else document.body.style.removeProperty("overflow");
  overflowAnterior = null;
}
function abrirMenu() {
  if (menuDialog.value?.open || desktopMedia?.matches) return;
  overflowAnterior = {
    valor: document.body.style.getPropertyValue("overflow"),
    prioridade: document.body.style.getPropertyPriority("overflow"),
  };
  menuDialog.value.showModal();
  document.body.style.setProperty("overflow", "hidden");
  menuAberto.value = true;
  closeTrigger.value?.focus();
}
function fecharMenu({ restaurarFoco = true } = {}) {
  const estavaAberto = Boolean(menuDialog.value?.open || menuAberto.value);
  if (menuDialog.value?.open) menuDialog.value.close();
  menuAberto.value = false;
  restaurarRolagem();
  if (estavaAberto && restaurarFoco && !desktopMedia?.matches)
    menuTrigger.value?.focus();
}
function fecharPeloFundo(event) {
  if (event.target !== menuDialog.value) return;
  const rect = menuDialog.value.getBoundingClientRect();
  if (
    event.clientX < rect.left ||
    event.clientX > rect.right ||
    event.clientY < rect.top ||
    event.clientY > rect.bottom
  )
    fecharMenu();
}
function ajustarDesktop(event) {
  if (!event.matches) return;
  const moverFoco = Boolean(
    menuDialog.value?.open && menuDialog.value.contains(document.activeElement),
  );
  fecharMenu({ restaurarFoco: false });
  if (moverFoco)
    document
      .querySelector(".admin-sidebar .admin-nav__item.is-active")
      ?.focus();
}
watch(
  () => route.fullPath,
  () => fecharMenu({ restaurarFoco: false }),
);
async function handleLogout() {
  fecharMenu({ restaurarFoco: false });
  adminOrders.resetar();
  queueSummary.resetar();
  dashboard.resetar();
  chat.resetar();
  limparPendenciasRealtime();
  realtimeClient.parar();
  await auth.logout();
  await router.replace({ name: "login" });
}
onMounted(() => {
  desktopMedia = window.matchMedia("(min-width: 1024px)");
  desktopMedia.addEventListener("change", ajustarDesktop);
  queueSummary.iniciarAutoAtualizacao();
  chat.iniciarPollingNaoLidas(15_000);
  if (REALTIME_ENABLED) {
    desinscreverRealtime = realtimeClient.inscrever(agendarRealtime);
    realtimeClient.iniciar();
  }
});
onBeforeUnmount(() => {
  fecharMenu({ restaurarFoco: false });
  desktopMedia?.removeEventListener("change", ajustarDesktop);
  queueSummary.resetar();
  dashboard.resetar();
  chat.pararPollingNaoLidas();
  desinscreverRealtime?.();
  desinscreverRealtime = null;
  limparPendenciasRealtime();
  realtimeClient.parar();
});
</script>

<style scoped src="./AdminLayout.css"></style>
