<template>
  <div class="admin-layout">
    <a class="admin-skip-link" href="#admin-conteudo">Ir para o conteúdo</a>
    <aside class="admin-sidebar" aria-label="Administração Pires">
      <RouterLink :to="{ name: 'admin-dashboard' }" class="admin-brand" aria-label="Pires Panificadora — Administração">
        <img src="/logo.png" alt="Pires Panificadora" /><span>Administração</span>
      </RouterLink>
      <AdminNavigation :groups="navGroups" :route-name="route.name" />
      <div class="admin-sidebar__footer">
        <span class="admin-workplace"><Store :size="17" aria-hidden="true" />Balcão Pires</span>
        <div class="admin-user">
          <span class="admin-user__avatar" aria-hidden="true">{{ iniciais }}</span>
          <div class="admin-user__copy">
            <strong :title="auth.usuario?.name">{{ auth.usuario?.name || 'Administrador' }}</strong>
            <span :title="auth.usuario?.email">{{ auth.usuario?.email || 'Conta administrativa' }}</span>
          </div>
          <button type="button" class="admin-icon-button" aria-label="Sair da conta" @click="handleLogout"><LogOut :size="18" aria-hidden="true" /></button>
        </div>
      </div>
    </aside>

    <header class="admin-mobile-header">
      <button ref="menuTrigger" type="button" class="admin-icon-button" aria-label="Abrir menu" aria-controls="admin-mobile-menu" :aria-expanded="menuAberto" @click="abrirMenu"><Menu :size="21" aria-hidden="true" /></button>
      <RouterLink :to="{ name: 'admin-dashboard' }" class="admin-mobile-header__brand"><img src="/logo.png" alt="Pires Panificadora" /><strong>Administração</strong></RouterLink>
      <span class="admin-user__avatar" aria-hidden="true">{{ iniciais }}</span>
    </header>
    <main id="admin-conteudo" class="admin-main" tabindex="-1"><RouterView /></main>

    <dialog id="admin-mobile-menu" ref="menuDialog" class="admin-drawer" aria-labelledby="admin-menu-title" @cancel.prevent="fecharMenu()" @click="fecharPeloFundo">
      <div class="admin-drawer__header">
        <RouterLink :to="{ name: 'admin-dashboard' }" class="admin-brand" @click="fecharMenu({ restaurarFoco: false })"><img src="/logo.png" alt="Pires Panificadora" /><span id="admin-menu-title">Administração</span></RouterLink>
        <button ref="closeTrigger" type="button" class="admin-icon-button" aria-label="Fechar menu" @click="fecharMenu()"><X :size="20" aria-hidden="true" /></button>
      </div>
      <AdminNavigation :groups="navGroups" :route-name="route.name" label="Navegação administrativa móvel" @navigate="fecharMenu({ restaurarFoco: false })" />
      <div class="admin-sidebar__footer">
        <div class="admin-user">
          <span class="admin-user__avatar" aria-hidden="true">{{ iniciais }}</span>
          <div class="admin-user__copy"><strong :title="auth.usuario?.name">{{ auth.usuario?.name || 'Administrador' }}</strong><span :title="auth.usuario?.email">{{ auth.usuario?.email || 'Conta administrativa' }}</span></div>
          <button type="button" class="admin-icon-button" aria-label="Sair da conta" @click="handleLogout"><LogOut :size="18" aria-hidden="true" /></button>
        </div>
      </div>
    </dialog>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { BarChart3, Boxes, ClipboardList, LayoutDashboard, Layers3, LogOut, Menu, Store, Tags, Users, X } from "lucide-vue-next";
import "@/assets/styles/admin.css";
import "@/assets/styles/admin-tokens.css";
import AdminNavigation from "@/components/admin/AdminNavigation.vue";
import { useAdminOrdersStore } from "@/stores/adminOrders";
import { useAdminDashboardStore } from "@/stores/adminDashboard";
import { useAuthStore } from "@/stores/auth";
import { useChatStore } from "@/stores/chat";

const auth = useAuthStore();
const adminOrders = useAdminOrdersStore();
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

const iniciais = computed(() => {
  const nome = auth.usuario?.name || auth.usuario?.email || "Admin";
  return nome.split(/\s+/).filter(Boolean).slice(0, 2).map((parte) => parte[0]?.toUpperCase()).join("") || "AD";
});
const navGroups = computed(() => [
  { label: "Visão geral", items: [{ name: "admin-dashboard", label: "Dashboard", icon: LayoutDashboard }] },
  { label: "Operação", items: [{ name: "admin-pedidos", label: "Pedidos", icon: ClipboardList, badge: adminOrders.aguardandoAcao || null, children: ["admin-pedido-detalhes"] }] },
  { label: "Catálogo", items: [
    { name: "admin-produtos", label: "Produtos", icon: Boxes, children: ["admin-produto-novo", "admin-produto-editar"] },
    { name: "admin-categorias", label: "Categorias", icon: Layers3 },
    { name: "admin-promocoes", label: "Promoções", icon: Tags },
  ] },
  { label: "Gestão", items: [{ name: "admin-relatorios", label: "Relatórios", icon: BarChart3 }, { name: "admin-usuarios", label: "Usuários", icon: Users }] },
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
  overflowAnterior = { valor: document.body.style.getPropertyValue("overflow"), prioridade: document.body.style.getPropertyPriority("overflow") };
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
  if (estavaAberto && restaurarFoco && !desktopMedia?.matches) menuTrigger.value?.focus();
}
function fecharPeloFundo(event) {
  if (event.target !== menuDialog.value) return;
  const rect = menuDialog.value.getBoundingClientRect();
  if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) fecharMenu();
}
function ajustarDesktop(event) {
  if (!event.matches) return;
  const moverFoco = Boolean(menuDialog.value?.open && menuDialog.value.contains(document.activeElement));
  fecharMenu({ restaurarFoco: false });
  if (moverFoco) document.querySelector(".admin-sidebar .admin-nav__item.is-active")?.focus();
}
watch(() => route.fullPath, () => fecharMenu({ restaurarFoco: false }));
async function handleLogout() {
  fecharMenu({ restaurarFoco: false });
  adminOrders.resetar();
  dashboard.resetar();
  chat.resetar();
  await auth.logout();
  await router.replace({ name: "login" });
}
// A fila do admin fica atualizada em segundo plano enquanto o painel estiver aberto:
// o badge do menu, o dashboard e a tela de pedidos leem a mesma store.
onMounted(() => {
  desktopMedia = window.matchMedia("(min-width: 1024px)");
  desktopMedia.addEventListener("change", ajustarDesktop);
  adminOrders.iniciarAutoAtualizacao();
  // Mensagens de clientes ainda não lidas, no mesmo ritmo da fila.
  chat.iniciarPollingNaoLidas(15_000);
});
onBeforeUnmount(() => {
  fecharMenu({ restaurarFoco: false });
  desktopMedia?.removeEventListener("change", ajustarDesktop);
  adminOrders.pararAutoAtualizacao();
  dashboard.resetar();
  chat.pararPollingNaoLidas();
});
</script>

<style scoped>
.admin-layout { min-height: 100dvh; display: grid; grid-template-columns: 232px minmax(0, 1fr); background: var(--pp-admin-bg); color: var(--pp-admin-text); font-family: var(--pp-font-body); }
.admin-skip-link { position: fixed; top: 8px; left: 248px; z-index: 80; padding: 12px 16px; background: var(--pp-admin-text); color: var(--pp-admin-bg); border-radius: var(--pp-radius-sm); transform: translateY(-160%); }
.admin-skip-link:focus { transform: none; }
.admin-sidebar { position: sticky; top: 0; height: 100dvh; display: flex; flex-direction: column; overflow-y: auto; padding: 24px 16px 16px; background: var(--pp-admin-sidebar-bg); color: var(--pp-admin-sidebar-text); scrollbar-color: var(--pp-admin-sidebar-border) var(--pp-admin-sidebar-bg); }
.admin-brand { display: flex; flex-direction: column; align-items: center; gap: 9px; padding: 6px 12px 26px; color: inherit; }
.admin-brand img { width: 110px; height: 59px; object-fit: contain; }
.admin-brand span { font-size: 13px; }
.admin-sidebar__footer { margin-top: auto; padding-top: 28px; }
.admin-workplace { display: flex; align-items: center; gap: 8px; color: var(--pp-admin-sidebar-muted); font-size: 13px; margin: 0 10px 18px; }
.admin-user { display: grid; grid-template-columns: 32px minmax(0, 1fr) 44px; gap: 9px; align-items: center; padding-top: 18px; border-top: 1px solid var(--pp-admin-sidebar-border); }
.admin-user__avatar { display: grid; place-items: center; flex: none; width: 32px; height: 32px; border-radius: var(--pp-radius-full); background: var(--pp-creme-2); color: var(--pp-marrom); font-size: 13px; font-weight: 600; }
.admin-user__copy { min-width: 0; }
.admin-user__copy strong, .admin-user__copy span { display: block; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; font-size: 13px; }
.admin-user__copy span { color: var(--pp-admin-sidebar-muted); margin-top: 2px; }
.admin-icon-button { display: inline-flex; justify-content: center; align-items: center; flex: none; width: 44px; min-width: 44px; height: 44px; padding: 0; border: 0; border-radius: var(--pp-radius-sm); background: transparent; color: inherit; cursor: pointer; }
.admin-icon-button:hover { background: var(--pp-creme-2); color: var(--pp-marrom); }
.admin-main { min-width: 0; padding: 28px 28px 40px; }
.admin-main:focus { outline: none; }
.admin-mobile-header { display: none; }
.admin-drawer { position: fixed; inset: 0 auto 0 0; margin: 0; width: min(304px, calc(100vw - 32px)); max-width: none; height: 100dvh; max-height: none; border: 0; padding: 20px 16px; background: var(--pp-admin-sidebar-bg); color: var(--pp-admin-sidebar-text); overflow-y: auto; }
.admin-drawer[open] { display: flex; flex-direction: column; }
.admin-drawer::backdrop { background: var(--pp-admin-backdrop); }
.admin-drawer__header { display: flex; align-items: flex-start; justify-content: space-between; gap: 8px; }
.admin-drawer__header .admin-brand { align-items: flex-start; padding: 0 6px 26px; }
.admin-drawer__header .admin-brand img { width: 102px; height: 54px; }
.admin-drawer__header .admin-icon-button { margin-top: 2px; }
@media (max-width: 1023px) {
  .admin-layout { display: block; }
  .admin-sidebar { display: none; }
  .admin-mobile-header { position: sticky; top: 0; z-index: 60; display: flex; align-items: center; gap: 12px; height: 56px; padding: 6px 16px; border-bottom: 1px solid var(--pp-admin-border); background: var(--pp-admin-bg); }
  .admin-mobile-header__brand { display: flex; align-items: center; gap: 12px; color: var(--pp-admin-text); min-width: 0; font-size: 14px; }
  .admin-mobile-header__brand img { width: 42px; height: 30px; object-fit: contain; }
  .admin-mobile-header__brand strong { font-weight: 600; }
  .admin-mobile-header > .admin-user__avatar { margin-left: auto; width: 30px; height: 30px; }
  .admin-main { padding: 20px 16px 36px; }
  .admin-skip-link { left: 12px; }
}
@media (prefers-reduced-motion: reduce) { *, *::before, *::after { transition: none !important; animation: none !important; scroll-behavior: auto !important; } }
</style>
