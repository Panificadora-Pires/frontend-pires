<template>
  <div class="student-layout">
    <!-- ===== Sidebar (desktop) ===== -->
    <aside class="student-layout__sidebar">
      <RouterLink :to="{ name: 'home' }" class="student-layout__brand">
        <img src="/logo.png" alt="Pires Panificadora" />
      </RouterLink>

      <nav class="student-layout__nav">
        <RouterLink
          v-for="item in navItems"
          :key="item.name"
          :to="{ name: item.name }"
          class="student-layout__nav-item"
          active-class="is-active"
        >
          <component :is="item.icon" :size="20" />
          <span>{{ item.label }}</span>
          <span v-if="item.badge" class="student-layout__badge">{{ item.badge }}</span>
        </RouterLink>
      </nav>

      <div class="student-layout__promo">
        <div class="student-layout__promo-icon"><ShoppingBag :size="20" /></div>
        <strong>Reserve antes do intervalo!</strong>
        <p>Evite filas e garanta seus produtos favoritos.</p>
        <RouterLink :to="{ name: 'cardapio' }" class="student-layout__promo-btn">Saiba mais</RouterLink>
      </div>

      <RouterLink :to="{ name: 'perfil' }" class="student-layout__user">
        <span class="student-layout__avatar">{{ iniciais }}</span>
        <div class="student-layout__user-info">
          <strong>{{ auth.usuario?.name || 'Aluno' }}</strong>
          <span>Aluno · IFC</span>
        </div>
      </RouterLink>
    </aside>

    <!-- ===== Header (mobile) ===== -->
    <header class="student-layout__mobile-header">
      <button class="student-layout__menu-btn" aria-label="Abrir menu" @click="menuAberto = true">
        <Menu :size="22" />
      </button>
      <img src="/logo.png" alt="Pires Panificadora" class="student-layout__mobile-logo" />
      <div class="student-layout__mobile-actions">
        <RouterLink :to="{ name: 'notificacoes' }" class="student-layout__icon-btn" aria-label="Notificações">
          <Bell :size="20" />
          <span v-if="notifCount" class="student-layout__badge-dot">{{ notifCount }}</span>
        </RouterLink>
        <RouterLink :to="{ name: 'carrinho' }" class="student-layout__icon-btn" aria-label="Carrinho">
          <ShoppingCart :size="20" />
          <span v-if="cart.totalItens" class="student-layout__badge-dot">{{ cart.totalItens }}</span>
        </RouterLink>
      </div>
    </header>

    <!-- ===== Menu gaveta (mobile) ===== -->
    <Transition name="drawer-fade">
      <div v-if="menuAberto" class="student-layout__drawer-backdrop" @click="menuAberto = false">
        <aside class="student-layout__drawer" @click.stop>
          <img src="/logo.png" alt="Pires Panificadora" class="student-layout__drawer-logo" />
          <nav class="student-layout__nav">
            <RouterLink
              v-for="item in navItems"
              :key="item.name"
              :to="{ name: item.name }"
              class="student-layout__nav-item"
              active-class="is-active"
              @click="menuAberto = false"
            >
              <component :is="item.icon" :size="20" />
              <span>{{ item.label }}</span>
              <span v-if="item.badge" class="student-layout__badge">{{ item.badge }}</span>
            </RouterLink>
          </nav>
        </aside>
      </div>
    </Transition>

    <!-- ===== Conteúdo da página ===== -->
    <main class="student-layout__main">
      <RouterView />
    </main>

    <!-- ===== Bottom nav (mobile) ===== -->
    <nav class="student-layout__bottom-nav">
      <RouterLink
        v-for="item in bottomNavItems"
        :key="item.name"
        :to="{ name: item.name }"
        class="student-layout__bottom-item"
        active-class="is-active"
      >
        <span class="student-layout__bottom-icon-wrap">
          <component :is="item.icon" :size="20" />
          <span v-if="item.badge" class="student-layout__badge-dot student-layout__badge-dot--bottom">{{ item.badge }}</span>
        </span>
        <span>{{ item.label }}</span>
      </RouterLink>
    </nav>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import {
  Home,
  LayoutGrid,
  Tag,
  ShoppingCart,
  ClipboardList,
  Heart,
  Bell,
  User,
  Menu,
  ShoppingBag,
} from 'lucide-vue-next'
import { useAuthStore } from '@/stores/auth'
import { useCartStore } from '@/stores/cart'
import api from '@/services/api'

const auth = useAuthStore()
const cart = useCartStore()

const menuAberto = ref(false)
const notifCount = ref(0)
const promoCount = ref(0)

const iniciais = computed(() => {
  const nome = auth.usuario?.name || ''
  return nome
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((parte) => parte[0]?.toUpperCase())
    .join('') || 'A'
})

const navItems = computed(() => [
  { name: 'home', label: 'Início', icon: Home },
  { name: 'cardapio', label: 'Cardápio', icon: LayoutGrid },
  { name: 'promocoes', label: 'Promoções', icon: Tag, badge: promoCount.value || null },
  { name: 'carrinho', label: 'Meu Carrinho', icon: ShoppingCart, badge: cart.totalItens || null },
  { name: 'pedidos', label: 'Meus Pedidos', icon: ClipboardList },
  { name: 'favoritos', label: 'Favoritos', icon: Heart },
  { name: 'notificacoes', label: 'Notificações', icon: Bell, badge: notifCount.value || null },
  { name: 'perfil', label: 'Perfil', icon: User },
])

const bottomNavItems = computed(() => [
  { name: 'home', label: 'Início', icon: Home },
  { name: 'cardapio', label: 'Cardápio', icon: LayoutGrid },
  { name: 'carrinho', label: 'Carrinho', icon: ShoppingCart, badge: cart.totalItens || null },
  { name: 'pedidos', label: 'Pedidos', icon: ClipboardList },
  { name: 'perfil', label: 'Perfil', icon: User },
])

async function buscarNotificacoesNaoLidas() {
  try {
    const { data } = await api.get('/notificacoes/', { params: { lida: false } })
    notifCount.value = data.count ?? data.results?.length ?? 0
  } catch {
    notifCount.value = 0
  }
}

async function buscarPromocoesAtivas() {
  try {
    const { data } = await api.get('/promocoes/')
    const hoje = new Date().toISOString().slice(0, 10)
    const lista = data.results ?? data
    promoCount.value = lista.filter((p) => p.data_inicio <= hoje && p.data_fim >= hoje).length
  } catch {
    promoCount.value = 0
  }
}

onMounted(() => {
  buscarNotificacoesNaoLidas()
  buscarPromocoesAtivas()
})
</script>

<style scoped>
.student-layout {
  min-height: 100vh;
  display: grid;
  grid-template-columns: 260px 1fr;
  background: var(--pp-bg-page);
}

/* ===== Sidebar ===== */
.student-layout__sidebar {
  background: var(--pp-gradient-left, var(--pp-bg-dark));
  color: var(--pp-cream);
  display: flex;
  flex-direction: column;
  padding: var(--pp-space-4) var(--pp-space-3);
  position: sticky;
  top: 0;
  height: 100vh;
  overflow-y: auto;
}

.student-layout__brand img {
  height: 44px;
  width: auto;
  margin-bottom: var(--pp-space-5);
}

.student-layout__nav {
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex: 1;
}

.student-layout__nav-item {
  display: flex;
  align-items: center;
  gap: var(--pp-space-2);
  padding: 11px var(--pp-space-2);
  border-radius: var(--pp-radius-btn);
  color: var(--pp-cream-dim);
  font-size: 14px;
  font-weight: 500;
  position: relative;
  transition: background 200ms ease, color 200ms ease;
}

.student-layout__nav-item:hover {
  background: rgba(255, 255, 255, 0.06);
  color: var(--pp-cream);
}

.student-layout__nav-item.is-active {
  background: var(--pp-gradient-gold, var(--pp-gold));
  color: var(--pp-bg-dark);
  font-weight: 600;
}

.student-layout__badge {
  margin-left: auto;
  background: var(--pp-error);
  color: #fff;
  font-size: 11px;
  font-weight: 700;
  min-width: 18px;
  height: 18px;
  border-radius: var(--pp-radius-full);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 5px;
}

.student-layout__nav-item.is-active .student-layout__badge {
  background: var(--pp-bg-dark);
  color: var(--pp-gold);
}

.student-layout__promo {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid var(--pp-border-soft);
  border-radius: var(--pp-radius-card);
  padding: var(--pp-space-3);
  margin: var(--pp-space-4) 0;
}

.student-layout__promo-icon {
  width: 36px;
  height: 36px;
  border-radius: var(--pp-radius-btn);
  background: var(--pp-gold-soft);
  color: var(--pp-gold);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: var(--pp-space-2);
}

.student-layout__promo strong {
  display: block;
  font-size: 13.5px;
  margin-bottom: 4px;
}

.student-layout__promo p {
  font-size: 12px;
  color: var(--pp-cream-dim);
  margin: 0 0 var(--pp-space-2);
  line-height: 1.4;
}

.student-layout__promo-btn {
  display: block;
  text-align: center;
  background: var(--pp-gradient-gold, var(--pp-gold));
  color: var(--pp-bg-dark);
  font-size: 12.5px;
  font-weight: 700;
  padding: 9px;
  border-radius: var(--pp-radius-btn);
}

.student-layout__user {
  display: flex;
  align-items: center;
  gap: var(--pp-space-2);
  padding: var(--pp-space-1);
  border-radius: var(--pp-radius-btn);
}

.student-layout__user:hover {
  background: rgba(255, 255, 255, 0.06);
}

.student-layout__avatar {
  width: 38px;
  height: 38px;
  border-radius: var(--pp-radius-full);
  background: var(--pp-gold-soft);
  color: var(--pp-gold);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 13px;
  flex-shrink: 0;
}

.student-layout__user-info {
  min-width: 0;
}

.student-layout__user-info strong {
  display: block;
  font-size: 13.5px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.student-layout__user-info span {
  font-size: 11.5px;
  color: var(--pp-cream-faint);
}

/* ===== Header mobile ===== */
.student-layout__mobile-header {
  display: none;
}

/* ===== Drawer mobile ===== */
.student-layout__drawer-backdrop {
  display: none;
}

/* ===== Conteúdo ===== */
.student-layout__main {
  min-width: 0;
  padding: var(--pp-space-5);
}

/* ===== Bottom nav mobile ===== */
.student-layout__bottom-nav {
  display: none;
}

/* ============================================================
   Responsivo
   ============================================================ */
@media (max-width: 1024px) {
  .student-layout {
    grid-template-columns: 1fr;
  }

  .student-layout__sidebar {
    display: none;
  }

  .student-layout__mobile-header {
    display: flex;
    align-items: center;
    gap: var(--pp-space-2);
    position: sticky;
    top: 0;
    z-index: 20;
    background: var(--pp-gradient-left, var(--pp-bg-dark));
    padding: var(--pp-space-2) var(--pp-space-3);
  }

  .student-layout__menu-btn {
    background: none;
    border: none;
    color: var(--pp-cream);
    display: flex;
    padding: 4px;
  }

  .student-layout__mobile-logo {
    height: 30px;
    width: auto;
  }

  .student-layout__mobile-actions {
    margin-left: auto;
    display: flex;
    gap: var(--pp-space-1);
  }

  .student-layout__icon-btn {
    position: relative;
    width: 38px;
    height: 38px;
    border-radius: var(--pp-radius-full);
    background: rgba(255, 255, 255, 0.08);
    color: var(--pp-cream);
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .student-layout__badge-dot {
    position: absolute;
    top: -4px;
    right: -4px;
    background: var(--pp-error);
    color: #fff;
    font-size: 10px;
    font-weight: 700;
    min-width: 16px;
    height: 16px;
    border-radius: var(--pp-radius-full);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0 4px;
    border: 2px solid var(--pp-bg-dark);
  }

  .student-layout__drawer-backdrop {
    display: block;
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.5);
    z-index: 30;
  }

  .student-layout__drawer {
    width: 78%;
    max-width: 300px;
    height: 100%;
    background: var(--pp-gradient-left, var(--pp-bg-dark));
    color: var(--pp-cream);
    padding: var(--pp-space-4) var(--pp-space-3);
    overflow-y: auto;
  }

  .student-layout__drawer-logo {
    height: 40px;
    margin-bottom: var(--pp-space-4);
  }

  .student-layout__main {
    padding: var(--pp-space-3);
    padding-bottom: 88px; /* espaço pra bottom nav não cobrir conteúdo */
  }

  .student-layout__bottom-nav {
    display: flex;
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    z-index: 20;
    background: var(--pp-surface-card);
    border-top: 1px solid var(--pp-surface-border);
    padding: 6px var(--pp-space-1);
    padding-bottom: max(6px, env(safe-area-inset-bottom));
  }

  .student-layout__bottom-item {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;
    padding: 6px 0;
    color: var(--pp-text-secondary);
    font-size: 10.5px;
    font-weight: 600;
  }

  .student-layout__bottom-item.is-active {
    color: var(--pp-gold-hover);
  }

  .student-layout__bottom-icon-wrap {
    position: relative;
    display: flex;
  }

  .student-layout__badge-dot--bottom {
    border-color: var(--pp-surface-card);
  }
}

.drawer-fade-enter-active,
.drawer-fade-leave-active {
  transition: opacity 200ms ease;
}

.drawer-fade-enter-from,
.drawer-fade-leave-to {
  opacity: 0;
}
</style>
