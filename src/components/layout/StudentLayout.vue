<template>
  <div class="student-layout">
    <aside class="student-layout__sidebar">
      <RouterLink :to="{ name: 'home' }" class="student-layout__brand" aria-label="Pires Panificadora - Início">
        <img src="/logo.png" alt="Pires Panificadora" />
      </RouterLink>

      <nav class="student-layout__nav" aria-label="Navegação principal">
        <RouterLink
          v-for="item in navItems"
          :key="item.name"
          :to="{ name: item.name }"
          class="student-layout__nav-item"
          active-class="is-active"
        >
          <component :is="item.icon" :size="20" aria-hidden="true" />
          <span>{{ item.label }}</span>
          <span v-if="item.badge" class="student-layout__badge">{{ limitarBadge(item.badge) }}</span>
        </RouterLink>
      </nav>

      <div class="student-layout__promo">
        <div class="student-layout__promo-icon"><ShoppingBag :size="21" /></div>
        <strong>Reserve antes do intervalo!</strong>
        <p>Evite filas e garanta seus produtos favoritos.</p>
        <RouterLink :to="{ name: 'cardapio' }" class="student-layout__promo-btn">Saiba mais</RouterLink>
      </div>

      <div class="student-layout__user-card">
        <RouterLink :to="{ name: 'perfil' }" class="student-layout__user">
          <span class="student-layout__avatar">{{ iniciais }}</span>
          <div class="student-layout__user-info">
            <strong>{{ auth.usuario?.name || 'Aluno' }}</strong>
            <span>{{ auth.isAdmin ? 'Administração' : 'Aluno · IFC' }}</span>
          </div>
        </RouterLink>

        <button
          type="button"
          class="student-layout__logout"
          aria-label="Sair da conta"
          title="Sair da conta"
          @click="handleLogout"
        >
          <LogOut :size="18" />
        </button>
      </div>
    </aside>

    <header class="student-layout__mobile-header">
      <button type="button" class="student-layout__menu-btn" aria-label="Abrir menu" @click="menuAberto = true">
        <Menu :size="22" />
      </button>

      <RouterLink :to="{ name: 'home' }" class="student-layout__mobile-brand" aria-label="Pires Panificadora - Início">
        <img src="/logo.png" alt="Pires Panificadora" class="student-layout__mobile-logo" />
      </RouterLink>

      <div class="student-layout__mobile-actions">
        <RouterLink :to="{ name: 'notificacoes' }" class="student-layout__icon-btn" aria-label="Notificações">
          <Bell :size="19" />
          <span v-if="notifCount" class="student-layout__badge-dot">{{ limitarBadge(notifCount) }}</span>
        </RouterLink>
        <RouterLink :to="{ name: 'carrinho' }" class="student-layout__icon-btn" aria-label="Carrinho">
          <ShoppingCart :size="19" />
          <span v-if="cart.totalItens" class="student-layout__badge-dot">{{ limitarBadge(cart.totalItens) }}</span>
        </RouterLink>
      </div>
    </header>

    <Transition name="drawer-fade">
      <div v-if="menuAberto" class="student-layout__drawer-backdrop" @click="menuAberto = false">
        <aside class="student-layout__drawer" @click.stop>
          <div class="student-layout__drawer-head">
            <img src="/logo.png" alt="Pires Panificadora" class="student-layout__drawer-logo" />
            <button type="button" aria-label="Fechar menu" @click="menuAberto = false">
              <X :size="20" />
            </button>
          </div>

          <nav class="student-layout__nav" aria-label="Menu mobile">
            <RouterLink
              v-for="item in navItems"
              :key="item.name"
              :to="{ name: item.name }"
              class="student-layout__nav-item"
              active-class="is-active"
              @click="menuAberto = false"
            >
              <component :is="item.icon" :size="20" aria-hidden="true" />
              <span>{{ item.label }}</span>
              <span v-if="item.badge" class="student-layout__badge">{{ limitarBadge(item.badge) }}</span>
            </RouterLink>
          </nav>

          <button type="button" class="student-layout__drawer-logout" @click="handleLogout">
            <LogOut :size="19" />
            <span>Sair da conta</span>
          </button>
        </aside>
      </div>
    </Transition>

    <main class="student-layout__main">
      <RouterView />
    </main>

    <nav class="student-layout__bottom-nav" aria-label="Navegação rápida">
      <RouterLink
        v-for="item in bottomNavItems"
        :key="item.name"
        :to="{ name: item.name }"
        class="student-layout__bottom-item"
        active-class="is-active"
      >
        <span class="student-layout__bottom-icon-wrap">
          <component :is="item.icon" :size="20" aria-hidden="true" />
          <span v-if="item.badge" class="student-layout__badge-dot student-layout__badge-dot--bottom">
            {{ limitarBadge(item.badge) }}
          </span>
        </span>
        <span>{{ item.label }}</span>
      </RouterLink>
    </nav>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import {
  Bell,
  ClipboardList,
  Heart,
  Home,
  LayoutGrid,
  LogOut,
  Menu,
  ShoppingBag,
  ShoppingCart,
  Tag,
  User,
  X,
} from 'lucide-vue-next'

import api from '@/services/api'
import catalogService, { promocaoEstaAtiva } from '@/services/catalog.service'
import { useAuthStore } from '@/stores/auth'
import { useCartStore } from '@/stores/cart'

const auth = useAuthStore()
const cart = useCartStore()
const router = useRouter()

const menuAberto = ref(false)
const notifCount = ref(0)
const promoCount = ref(0)

const iniciais = computed(() => {
  const nome = auth.usuario?.name || ''
  return (
    nome
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((parte) => parte[0]?.toUpperCase())
      .join('') || 'A'
  )
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

function limitarBadge(valor) {
  const numero = Number(valor || 0)
  return numero > 99 ? '99+' : numero
}

async function handleLogout() {
  menuAberto.value = false
  await auth.logout()
  await router.replace({ name: 'login' })
}

async function buscarNotificacoesNaoLidas() {
  try {
    const { data } = await api.get('/notificacoes/', {
      params: { lida: false, page_size: 1 },
    })
    notifCount.value = data.count ?? data.results?.length ?? 0
  } catch {
    notifCount.value = 0
  }
}

async function buscarPromocoesAtivas() {
  try {
    const lista = await catalogService.listarPromocoes()
    promoCount.value = lista.filter((promocao) => promocaoEstaAtiva(promocao)).length
  } catch {
    promoCount.value = 0
  }
}

onMounted(() => {
  Promise.allSettled([
    buscarNotificacoesNaoLidas(),
    buscarPromocoesAtivas(),
  ])
})
</script>

<style scoped>
.student-layout {
  min-height: 100vh;
  display: grid;
  grid-template-columns: 238px minmax(0, 1fr);
  background: var(--pp-bg-page);
}

.student-layout__sidebar {
  position: sticky;
  top: 0;
  height: 100vh;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  padding: 24px 15px 18px;
  background:
    radial-gradient(circle at 30% 4%, rgba(224, 168, 62, 0.08), transparent 25%),
    linear-gradient(180deg, #241108 0%, #32180b 100%);
  color: var(--pp-cream);
  scrollbar-width: thin;
}

.student-layout__brand {
  display: inline-flex;
  align-self: flex-start;
  padding: 4px 7px;
  margin: 0 0 27px;
}

.student-layout__brand img {
  width: 126px;
  height: auto;
  display: block;
}

.student-layout__nav {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.student-layout__sidebar > .student-layout__nav {
  flex: 1;
}

.student-layout__nav-item {
  min-height: 46px;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 0 13px;
  border-radius: 11px;
  color: #d1c0aa;
  font-size: 13px;
  font-weight: 520;
  transition: color 160ms ease, background 160ms ease, transform 160ms ease;
}

.student-layout__nav-item:hover {
  color: #fff3df;
  background: rgba(255, 255, 255, 0.055);
}

.student-layout__nav-item.is-active {
  color: #251409;
  background: linear-gradient(110deg, #d99b2d 0%, #e5a83a 100%);
  font-weight: 750;
  box-shadow: 0 7px 18px rgba(224, 168, 62, 0.12);
}

.student-layout__badge {
  min-width: 19px;
  height: 19px;
  margin-left: auto;
  display: grid;
  place-items: center;
  padding: 0 5px;
  border-radius: 99px;
  background: #db5c4f;
  color: #fff;
  font-size: 9px;
  font-weight: 800;
}

.student-layout__nav-item.is-active .student-layout__badge {
  background: #2c180b;
  color: #f1b443;
}

.student-layout__promo {
  margin: 22px 0 17px;
  padding: 16px;
  border: 1px solid rgba(224, 168, 62, 0.22);
  border-radius: 16px;
  background: linear-gradient(145deg, rgba(255, 255, 255, 0.055), rgba(224, 168, 62, 0.035));
}

.student-layout__promo-icon {
  width: 38px;
  height: 38px;
  display: grid;
  place-items: center;
  margin-bottom: 12px;
  border-radius: 10px;
  background: rgba(224, 168, 62, 0.12);
  color: #e6a83a;
}

.student-layout__promo strong {
  display: block;
  margin-bottom: 5px;
  color: #fff2df;
  font-size: 13px;
  line-height: 1.25;
}

.student-layout__promo p {
  margin: 0 0 13px;
  color: #bba991;
  font-size: 11.5px;
  line-height: 1.45;
}

.student-layout__promo-btn {
  min-height: 36px;
  display: grid;
  place-items: center;
  border-radius: 9px;
  background: linear-gradient(100deg, #dca033, #edb33f);
  color: #28160a;
  font-size: 11px;
  font-weight: 800;
}

.student-layout__user-card {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px;
  border: 1px solid rgba(224, 168, 62, 0.18);
  border-radius: 13px;
  background: rgba(255, 255, 255, 0.025);
}

.student-layout__user {
  min-width: 0;
  flex: 1;
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 3px;
  border-radius: 9px;
}

.student-layout__avatar {
  width: 35px;
  height: 35px;
  flex: 0 0 auto;
  display: grid;
  place-items: center;
  border-radius: 50%;
  background: rgba(224, 168, 62, 0.14);
  color: #e7a837;
  font-size: 11px;
  font-weight: 800;
}

.student-layout__user-info {
  min-width: 0;
}

.student-layout__user-info strong {
  display: block;
  overflow: hidden;
  color: #fff0db;
  font-size: 11.5px;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.student-layout__user-info span {
  display: block;
  margin-top: 2px;
  overflow: hidden;
  color: #9f8d78;
  font-size: 9.5px;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.student-layout__logout {
  width: 34px;
  height: 34px;
  flex: 0 0 auto;
  display: grid;
  place-items: center;
  padding: 0;
  border: 0;
  border-radius: 9px;
  background: transparent;
  color: #8f7d69;
  cursor: pointer;
}

.student-layout__logout:hover {
  background: rgba(255, 255, 255, 0.06);
  color: #efad39;
}

.student-layout__mobile-header,
.student-layout__drawer-backdrop,
.student-layout__bottom-nav {
  display: none;
}

.student-layout__main {
  min-width: 0;
  padding: 30px clamp(24px, 2.5vw, 40px) 36px;
}

@media (max-width: 1180px) {
  .student-layout {
    grid-template-columns: 220px minmax(0, 1fr);
  }

  .student-layout__sidebar {
    padding-inline: 12px;
  }

  .student-layout__main {
    padding-inline: 24px;
  }
}

@media (max-width: 1024px) {
  .student-layout {
    display: block;
  }

  .student-layout__sidebar {
    display: none;
  }

  .student-layout__mobile-header {
    position: sticky;
    top: 0;
    z-index: 25;
    min-height: 60px;
    display: grid;
    grid-template-columns: 42px 1fr auto;
    align-items: center;
    gap: 10px;
    padding: 9px 16px;
    background: linear-gradient(90deg, #261107 0%, #32180b 100%);
    color: var(--pp-cream);
    box-shadow: 0 4px 16px rgba(31, 17, 9, 0.12);
  }

  .student-layout__menu-btn {
    width: 38px;
    height: 38px;
    display: grid;
    place-items: center;
    padding: 0;
    border: 0;
    border-radius: 9px;
    background: transparent;
    color: #eadbc9;
    cursor: pointer;
  }

  .student-layout__mobile-brand {
    justify-self: center;
    display: inline-flex;
  }

  .student-layout__mobile-logo {
    width: 83px;
    height: auto;
    display: block;
  }

  .student-layout__mobile-actions {
    justify-self: end;
    display: flex;
    gap: 7px;
  }

  .student-layout__icon-btn {
    width: 36px;
    height: 36px;
    position: relative;
    display: grid;
    place-items: center;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.07);
    color: #efe0cc;
  }

  .student-layout__badge-dot {
    position: absolute;
    top: -3px;
    right: -3px;
    min-width: 16px;
    height: 16px;
    display: grid;
    place-items: center;
    padding: 0 4px;
    border: 2px solid #2b1409;
    border-radius: 99px;
    background: #e2a133;
    color: #29170b;
    font-size: 8px;
    font-weight: 900;
  }

  .student-layout__drawer-backdrop {
    position: fixed;
    inset: 0;
    z-index: 40;
    display: block;
    background: rgba(18, 10, 6, 0.52);
    backdrop-filter: blur(2px);
  }

  .student-layout__drawer {
    width: min(82vw, 310px);
    height: 100%;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    padding: 20px 15px;
    background: linear-gradient(180deg, #241108, #32180b);
    color: var(--pp-cream);
    box-shadow: 16px 0 40px rgba(19, 10, 5, 0.24);
  }

  .student-layout__drawer-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 22px;
    padding: 0 5px;
  }

  .student-layout__drawer-logo {
    width: 112px;
    height: auto;
  }

  .student-layout__drawer-head button {
    width: 34px;
    height: 34px;
    display: grid;
    place-items: center;
    padding: 0;
    border: 0;
    border-radius: 9px;
    background: rgba(255, 255, 255, 0.06);
    color: #d6c6b3;
  }

  .student-layout__drawer .student-layout__nav {
    flex: 1;
  }

  .student-layout__drawer-logout {
    min-height: 42px;
    display: flex;
    align-items: center;
    gap: 10px;
    margin-top: 18px;
    padding: 0 12px;
    border: 1px solid rgba(243, 233, 216, 0.12);
    border-radius: 10px;
    background: transparent;
    color: #c8b7a2;
    font: inherit;
    font-size: 12px;
  }

  .student-layout__main {
    padding: 20px 20px 92px;
  }

  .student-layout__bottom-nav {
    position: fixed;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 25;
    min-height: 66px;
    display: flex;
    padding: 5px 8px max(6px, env(safe-area-inset-bottom));
    border-top: 1px solid rgba(36, 17, 8, 0.09);
    background: rgba(255, 255, 255, 0.97);
    box-shadow: 0 -8px 24px rgba(41, 27, 19, 0.06);
    backdrop-filter: blur(14px);
  }

  .student-layout__bottom-item {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 3px;
    color: #8e8984;
    font-size: 9px;
    font-weight: 650;
  }

  .student-layout__bottom-item.is-active {
    color: #b9760a;
  }

  .student-layout__bottom-icon-wrap {
    position: relative;
    display: inline-flex;
  }

  .student-layout__badge-dot--bottom {
    top: -8px;
    right: -10px;
    border-color: #fff;
  }
}

@media (max-width: 600px) {
  .student-layout__mobile-header {
    min-height: 58px;
    padding-inline: 12px;
  }

  .student-layout__mobile-logo {
    width: 78px;
  }

  .student-layout__main {
    padding: 16px 16px 88px;
  }
}

.drawer-fade-enter-active,
.drawer-fade-leave-active {
  transition: opacity 180ms ease;
}

.drawer-fade-enter-active .student-layout__drawer,
.drawer-fade-leave-active .student-layout__drawer {
  transition: transform 210ms ease;
}

.drawer-fade-enter-from,
.drawer-fade-leave-to {
  opacity: 0;
}

.drawer-fade-enter-from .student-layout__drawer,
.drawer-fade-leave-to .student-layout__drawer {
  transform: translateX(-18px);
}
</style>
