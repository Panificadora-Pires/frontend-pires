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
  {
    path: '/',
    name: 'cardapio',
    component: () => import('@/views/EmConstrucaoView.vue'),
    meta: { requerAuth: true },
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
    return { name: 'cardapio' }
  }

  if (to.meta.publica && to.name !== 'cadastro' && auth.autenticado) {
    return { name: auth.isAdmin ? 'admin-dashboard' : 'cardapio' }
  }
})

export default router
