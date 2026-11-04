<template>
  <footer class="home-footer">
    <div class="home-footer__marca">
      <img src="/logo.png" alt="Pires Panificadora" width="64" height="64" loading="lazy" />
      <span>Pires Panificadora</span>
    </div>
    <nav class="home-footer__links" aria-label="Explore a Pires">
      <RouterLink :to="{ name: 'cardapio' }">Cardápio</RouterLink>
      <RouterLink :to="{ name: 'promocoes' }">Promoções</RouterLink>
      <RouterLink :to="{ name: 'pedidos' }">Meus pedidos</RouterLink>
    </nav>
  </footer>
</template>

<style scoped>
.home-footer {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: var(--pp-space-4);
  margin-top: var(--pp-home-section-space);
  padding: var(--pp-space-5) 0 0;
  border-top: 1px solid var(--pp-creme-borda);
  color: var(--pp-marrom);
}
.home-footer__marca { display: flex; align-items: center; gap: var(--pp-space-2); }
.home-footer__marca img { display: block; object-fit: contain; }
.home-footer__marca span { font-family: var(--pp-font-titulo); font-size: 22px; font-weight: 400; }
.home-footer__links { display: flex; flex-wrap: wrap; gap: var(--pp-space-1) var(--pp-space-4); }
.home-footer__links a {
  display: inline-flex;
  align-items: center;
  min-height: 44px;
  color: var(--pp-marrom);
  font-size: 14px;
  font-weight: 600;
}
.home-footer__links a:hover,
.home-footer__links a:focus-visible { text-decoration: underline; text-underline-offset: 4px; }
.home-footer__links a:focus-visible { outline: 3px solid var(--pp-dourado-escuro); outline-offset: 4px; }
</style>
