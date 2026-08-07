import { createRouter, createWebHistory } from 'vue-router'

import { useAuthStore } from '@/stores/auth'

const routes = [
  {
    path: '/login',
    name: 'login',
    component: () => import('@/views/auth/LoginView.vue'),
    meta: { publica: true, somenteVisitante: true },
  },
  {
    path: '/cadastro',
    name: 'cadastro',
    component: () => import('@/views/auth/RegisterView.vue'),
    meta: { publica: true, somenteVisitante: true },
  },
  {
    path: '/confirmar-email',
    name: 'confirmar-email',
    component: () => import('@/views/auth/VerifyAccountView.vue'),
    meta: { publica: true, somenteVisitante: true },
  },
  {
    path: '/recuperar-senha',
    name: 'recuperar-senha',
    component: () => import('@/views/auth/ForgotPasswordView.vue'),
    meta: { publica: true, somenteVisitante: true },
  },
  {
    path: '/redefinir-senha',
    name: 'redefinir-senha',
    component: () => import('@/views/auth/ResetPasswordView.vue'),
    meta: { publica: true, somenteVisitante: true },
  },

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
    redirect: '/',
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior: () => ({ top: 0 }),
})

router.beforeEach(async (to) => {
  const auth = useAuthStore()

  if (
    !auth.sessaoInicializada &&
    (to.meta.requerAuth || to.meta.somenteVisitante)
  ) {
    await auth.restaurarSessao()
  }

  if (to.meta.requerAuth && !auth.autenticado) {
    return {
      name: 'login',
      query: {
        redirect: to.fullPath !== '/' ? to.fullPath : undefined,
      },
    }
  }

  if (to.meta.requerAdmin && !auth.isAdmin) {
    return { name: 'home' }
  }

  if (to.meta.somenteVisitante && auth.autenticado) {
    return { name: auth.isAdmin ? 'admin-dashboard' : 'home' }
  }

  return true
})

export default router
