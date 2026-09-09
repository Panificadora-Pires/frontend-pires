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
    meta: { requerAuth: true, requerAluno: true },
    children: [
      { path: '', name: 'home', component: () => import('@/views/student/HomeView.vue') },
      { path: 'cardapio', name: 'cardapio', component: () => import('@/views/student/CardapioView.vue') },
      { path: 'promocoes', name: 'promocoes', component: () => import('@/views/student/PromocoesView.vue') },
      { path: 'carrinho', name: 'carrinho', component: () => import('@/views/student/CarrinhoView.vue') },
      { path: 'checkout', name: 'checkout', component: () => import('@/views/student/CheckoutView.vue') },
      { path: 'pedidos', name: 'pedidos', component: () => import('@/views/student/PedidosView.vue') },
      { path: 'favoritos', name: 'favoritos', component: () => import('@/views/student/FavoritosView.vue') },
      { path: 'notificacoes', name: 'notificacoes', component: () => import('@/views/student/NotificacoesView.vue') },
      { path: 'perfil', name: 'perfil', component: () => import('@/views/student/ProfileView.vue') },
    ],
  },

  {
    path: '/admin',
    component: () => import('@/components/layout/AdminLayout.vue'),
    meta: { requerAuth: true, requerAdmin: true },
    children: [
      { path: '', name: 'admin-dashboard', component: () => import('@/views/admin/AdminDashboardView.vue') },
      { path: 'pedidos', name: 'admin-pedidos', component: () => import('@/views/admin/AdminPedidosView.vue') },
      { path: 'pedidos/:id', name: 'admin-pedido-detalhes', component: () => import('@/views/admin/AdminPedidoDetalhesView.vue') },
      { path: 'produtos', name: 'admin-produtos', component: () => import('@/views/admin/AdminProdutosView.vue') },
      { path: 'produtos/novo', name: 'admin-produto-novo', component: () => import('@/views/admin/AdminProdutoFormView.vue') },
      { path: 'produtos/:id/editar', name: 'admin-produto-editar', component: () => import('@/views/admin/AdminProdutoFormView.vue') },
      { path: 'categorias', name: 'admin-categorias', component: () => import('@/views/admin/AdminCategoriasView.vue') },
      { path: 'promocoes', name: 'admin-promocoes', component: () => import('@/views/admin/AdminPromocoesView.vue') },
      { path: 'relatorios', name: 'admin-relatorios', component: () => import('@/views/admin/AdminRelatoriosView.vue') },
      { path: 'usuarios', name: 'admin-usuarios', component: () => import('@/views/admin/AdminUsuariosView.vue') },
    ],
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

  if (to.meta.requerAluno && auth.isAdmin) {
    return { name: 'admin-dashboard' }
  }

  if (to.meta.somenteVisitante && auth.autenticado) {
    return { name: auth.isAdmin ? 'admin-dashboard' : 'home' }
  }

  return true
})

export default router
