<script setup>
import { computed, onBeforeUnmount, watchEffect } from "vue";
import { useRoute } from "vue-router";
import { ArrowLeft, Mail } from "lucide-vue-next";
import { ATUALIZADO_EM, CONTATO, RESPONSAVEL, documentosLegais } from "@/content/documentosLegais";

const route = useRoute();
const documento = computed(() => documentosLegais[route.meta.documento]);
const documentos = Object.entries(documentosLegais).map(([rota, doc]) => ({ rota, titulo: doc.titulo }));
const tituloOriginal = document.title;
watchEffect(() => { document.title = `${documento.value.titulo} — Pires Panificadora`; });
onBeforeUnmount(() => { document.title = tituloOriginal; });
</script>

<template>
  <div class="legal">
    <header class="legal__topo">
      <RouterLink :to="{ name: 'home' }" class="legal__marca" aria-label="Pires Panificadora — início">
        <img src="/logo.png" alt="Pires Panificadora" width="128" height="64" />
      </RouterLink>
      <RouterLink :to="{ name: 'home' }" class="legal__voltar">
        <ArrowLeft :size="16" aria-hidden="true" /> Voltar para a Pires
      </RouterLink>
    </header>

    <main class="legal__conteudo">
      <nav class="legal__abas" aria-label="Documentos do projeto">
        <RouterLink v-for="item in documentos" :key="item.rota" :to="{ name: item.rota }" class="legal__aba">{{ item.titulo }}</RouterLink>
      </nav>

      <article aria-labelledby="legal-titulo">
        <p class="legal__nota" aria-hidden="true">{{ documento.nota }}</p>
        <h1 id="legal-titulo" class="legal__titulo">{{ documento.titulo }}</h1>
        <p class="legal__meta">Material acadêmico · Última atualização: {{ ATUALIZADO_EM }}</p>
        <p class="legal__resumo">{{ documento.resumo }}</p>

        <section v-for="secao in documento.secoes" :key="secao.titulo" class="legal__secao">
          <h2>{{ secao.titulo }}</h2>
          <ul v-if="secao.itens">
            <li v-for="item in secao.itens" :key="item">{{ item }}</li>
          </ul>
          <p v-for="paragrafo in secao.paragrafos" :key="paragrafo">{{ paragrafo }}</p>
        </section>

        <section class="legal__contato" aria-labelledby="legal-contato">
          <h2 id="legal-contato">Contato</h2>
          <p>{{ RESPONSAVEL }}</p>
          <a :href="'mailto:' + CONTATO"><Mail :size="16" aria-hidden="true" /> {{ CONTATO }}</a>
        </section>
      </article>
    </main>
  </div>
</template>

<style scoped>
.legal { min-height: 100dvh; background: var(--pp-creme); color: var(--pp-marrom); }
.legal__topo {
  display: flex; align-items: center; justify-content: space-between; gap: var(--pp-space-3);
  max-width: 760px; margin: 0 auto; padding: var(--pp-space-4) 16px var(--pp-space-3);
}
.legal__marca img { display: block; width: 112px; height: auto; }
.legal__voltar, .legal__aba, .legal__contato a {
  display: inline-flex; align-items: center; gap: 6px; min-height: 44px;
  color: var(--pp-dourado-profundo); font-size: 14px; font-weight: 600; text-underline-offset: 4px;
}
.legal__voltar:hover, .legal__aba:hover, .legal__contato a:hover { text-decoration: underline; }
.legal__conteudo { max-width: 760px; margin: 0 auto; padding: 0 16px var(--pp-space-6); }
.legal__abas { display: flex; flex-wrap: wrap; gap: 0 var(--pp-space-4); padding-bottom: var(--pp-space-2); border-bottom: 1px solid var(--pp-creme-borda); }
.legal__aba { color: var(--pp-texto-2); }
.legal__aba.router-link-exact-active { color: var(--pp-marrom); text-decoration: underline; text-decoration-color: var(--pp-gold); text-decoration-thickness: 3px; text-underline-offset: 8px; }
.legal__nota { margin: var(--pp-space-5) 0 0; color: var(--pp-dourado-escuro); font: 700 26px/1.1 var(--pp-font-nota); }
.legal__titulo { margin: 4px 0 0; font: 400 clamp(36px, 6vw, 56px)/1.1 var(--pp-font-titulo); letter-spacing: -.02em; }
.legal__meta { margin: var(--pp-space-2) 0 0; color: var(--pp-texto-2); font-size: 13px; }
.legal__resumo { margin: var(--pp-space-4) 0 0; font-size: 17px; line-height: 1.6; }
.legal__secao, .legal__contato { margin-top: var(--pp-space-5); }
.legal h2 { margin: 0 0 var(--pp-space-2); font-size: 19px; font-weight: 700; line-height: 1.3; }
.legal__secao p, .legal__secao li, .legal__contato p { margin: 0 0 var(--pp-space-2); color: var(--pp-marrom-2); font-size: 15px; line-height: 1.65; }
.legal__secao ul { margin: 0 0 var(--pp-space-2); padding-left: 20px; }
.legal__secao li::marker { color: var(--pp-dourado-escuro); }
.legal__contato { padding-top: var(--pp-space-4); border-top: 1px solid var(--pp-creme-borda); }
.legal a:focus-visible { outline: 3px solid var(--pp-dourado-escuro); outline-offset: 4px; border-radius: 4px; }
@media (max-width: 520px) {
  .legal__nota { font-size: 22px; }
  .legal__resumo { font-size: 16px; }
}
</style>
