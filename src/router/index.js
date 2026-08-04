import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const routes = [
  {
    path: '/login',
    name: 'login',
    component: () => import('@/views/auth/LoginView.vue'),
    meta: { publica: true },
  },
  {
    path: '/cadastro',
    name: 'cadastro',
    component: () => import('@/views/auth/RegisterView.vue'),
    meta: { publica: true },
  },

  // ---- Área do aluno (layout com sidebar/topbar/bottom nav) ----
  {
    path: '/',
    component: () => import('@/components/layout/StudentLayout.vue'),
    meta: { requerAuth: true },
    children: [
      { path: '', name: 'home', component: () => import('@/views/student/HomeView.vue') },
      { path: 'cardapio', name: 'cardapio', component: () => import('@/views/EmConstrucaoView.vue') },
      { path: 'promocoes', name: 'promocoes', component: () => import('@/views/EmConstrucaoView.vue') },
      { path: 'carrinho', name: 'carrinho', component: () => import('@/views/EmConstrucaoView.vue') },
      { path: 'pedidos', name: 'pedidos', component: () => import('@/views/EmConstrucaoView.vue') },
      { path: 'favoritos', name: 'favoritos', component: () => import('@/views/EmConstrucaoView.vue') },
      { path: 'notificacoes', name: 'notificacoes', component: () => import('@/views/EmConstrucaoView.vue') },
      { path: 'perfil', name: 'perfil', component: () => import('@/views/EmConstrucaoView.vue') },
    ],
  },

  {
    path: '/admin',
    name: 'admin-dashboard',
    component: () => import('@/views/EmConstrucaoView.vue'),
    meta: { requerAuth: true, requerAdmin: true },
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: '/login',
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

router.beforeEach(async (to) => {
  const auth = useAuthStore()

  if ((to.meta.requerAuth || to.meta.publica) && !auth.autenticado) {
    await auth.restaurarSessao()
  }

  if (to.meta.requerAuth && !auth.autenticado) {
    return { name: 'login' }
  }

  if (to.meta.requerAdmin && !auth.isAdmin) {
    return { name: 'home' }
  }

  if (to.meta.publica && to.name !== 'cadastro' && auth.autenticado) {
    return { name: auth.isAdmin ? 'admin-dashboard' : 'home' }
  }
})

export default router
