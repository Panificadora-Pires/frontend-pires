<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, provide, readonly, ref, watch } from "vue";
import { RouterView, useRoute, useRouter } from "vue-router";
import { motion, useReducedMotion } from "motion-v";
import { ArrowLeft, ArrowRight, ShieldCheck } from "lucide-vue-next";
import GoogleAuthButton from "@/components/auth/GoogleAuthButton.vue";
import { useAuthStore } from "@/stores/auth";
import { safeAuthRedirect } from "@/utils/auth-navigation";

const auth = useAuthStore();
const route = useRoute();
const router = useRouter();
const reduzir = useReducedMotion();
const ocupado = ref(false);
const transicionando = ref(false);
const linksBloqueados = computed(() => ocupado.value || transicionando.value);
const erroGoogle = ref("");
const aceite = ref(false);
const erroAceite = ref(false);
const pequeno = ref(false);
const conteudo = ref(null);
let ativo = true;
let sequencia = 0;
let media;
const cadastro = computed(() => route.name === "cadastro");
const temGoogle = computed(() => ["login", "cadastro"].includes(route.name));
const googleIniciado = ref(temGoogle.value);
const redirect = computed(() => safeAuthRedirect(route.query.redirect));
const consulta = computed(() => redirect.value ? { redirect: redirect.value } : {});
const transicaoFoto = computed(() => ({ duration: reduzir.value ? 0 : .4, ease: [.2, .7, .2, 1] }));
const retorno = computed(() => ({ name: route.name === "redefinir-senha" ? "recuperar-senha" : "login", query: consulta.value }));
function destino(name, query = {}) { return { name, query: { ...consulta.value, ...query } }; }
async function executar(operacao) {
  if (ocupado.value || auth.carregando || !ativo) return { ok: false, ignorado: true, campos: {} };
  const id = ++sequencia;
  const pagina = route.fullPath;
  const atual = () => ativo && id === sequencia && route.fullPath === pagina;
  ocupado.value = true;
  erroGoogle.value = "";
  try {
    const resultado = await operacao({ atual });
    return atual() ? resultado : { ok: false, ignorado: true, campos: {} };
  } catch {
    return atual() ? { ok: false, erro: "Não foi possível concluir. Tente novamente.", campos: {} } : { ok: false, ignorado: true, campos: {} };
  } finally { if (id === sequencia) ocupado.value = false; }
}
async function focarErro() {
  await nextTick();
  if (!ativo) return;
  const alvo = conteudo.value?.querySelector('[aria-invalid="true"]') || conteudo.value?.querySelector('[role="alert"]');
  alvo?.focus();
}
function atualizarAceite(valor) { aceite.value = Boolean(valor); if (aceite.value) erroAceite.value = false; }
provide("authExperience", { ocupado: readonly(ocupado), erroAceite: readonly(erroAceite), executar, destino, focarErro, atualizarAceite });
async function entrarGoogle(credential) {
  if (!temGoogle.value || ocupado.value || auth.carregando) return;
  if (cadastro.value && !aceite.value) {
    erroAceite.value = true;
    await nextTick();
    conteudo.value?.querySelector('[name="accepted-terms"]')?.focus();
    return;
  }
  const resultado = await executar(() => auth.loginWithGoogle(credential));
  if (resultado.ignorado || !ativo) return;
  if (!resultado.ok) { erroGoogle.value = resultado.erro; await focarErro(); return; }
  await router.replace(redirect.value || { name: auth.isAdmin ? "admin-dashboard" : "home" });
}
function sairFormulario(elemento) {
  transicionando.value = true;
  elemento.inert = true;
  elemento.setAttribute("aria-hidden", "true");
}
function concluirTransicao() { transicionando.value = false; }
function focarTitulo() {
  concluirTransicao();
  conteudo.value?.querySelector("h1")?.focus({ preventScroll: true });
}
function guardarNavegacao(evento) {
  if (!linksBloqueados.value) return;
  const link = evento.target?.closest?.("a[href]");
  if (!link || link.origin !== window.location.origin) return;
  if (router.resolve(link.pathname).meta.somenteVisitante) evento.preventDefault();
}
watch(() => route.fullPath, () => {
  sequencia += 1;
  auth.invalidarOperacao();
  ocupado.value = false;
  erroGoogle.value = "";
  aceite.value = false;
  erroAceite.value = false;
  if (temGoogle.value) googleIniciado.value = true;
}, { flush: "sync" });
onMounted(() => { media = window.matchMedia("(max-width: 900px)"); pequeno.value = media.matches; media.addEventListener("change", atualizarTamanho); });
function atualizarTamanho(evento) { pequeno.value = evento.matches; }
onBeforeUnmount(() => { ativo = false; sequencia += 1; media?.removeEventListener("change", atualizarTamanho); auth.invalidarOperacao?.(); });
</script>

<template>
  <div class="auth-layout" :class="{ 'auth-layout--register': cadastro, 'auth-layout--reduced': reduzir }" :style="{ '--auth-direction': cadastro ? 1 : -1 }">
    <motion.aside class="auth-layout__photo" aria-hidden="true" :initial="false" :animate="{ x: cadastro ? '0%' : '100%' }" :transition="transicaoFoto">
      <div class="auth-layout__photo-surface"><div class="auth-layout__photo-copy">
        <span class="auth-layout__photo-note">Feito aqui. Pra você.</span>
        <p>Seu intervalo<br />começa aqui.</p>
        <span>PIRES PANIFICADORA</span>
      </div></div>
    </motion.aside>
    <main ref="conteudo" class="auth-layout__panel" :aria-busy="ocupado" @click.capture="guardarNavegacao">
      <div class="auth-layout__content" :class="{ 'auth-layout__content--wide': cadastro }">
        <header class="auth-layout__header">
          <RouterLink :to="destino('login')" class="auth-layout__brand" aria-label="Pires Panificadora — início do acesso" :aria-disabled="linksBloqueados">
            <img src="/logo.png" alt="Pires Panificadora" width="174" height="88" />
          </RouterLink>
          <RouterLink v-if="route.name !== 'login'" :to="retorno" class="auth-layout__back" :aria-disabled="linksBloqueados">
            <ArrowLeft :size="16" aria-hidden="true" />{{ route.name === 'redefinir-senha' ? 'Solicitar outro código' : 'Voltar ao login' }}
          </RouterLink>
        </header>
        <RouterView v-slot="{ Component, route: pagina }">
          <Transition :name="reduzir ? '' : 'auth-page'" mode="out-in" @before-leave="sairFormulario" @after-enter="focarTitulo" @enter-cancelled="concluirTransicao" @leave-cancelled="concluirTransicao">
            <component :is="Component" :key="pagina.name" :style="{ '--auth-page-distance': pequeno ? '6px' : '12px' }" />
          </Transition>
        </RouterView>
        <section v-show="temGoogle" class="auth-layout__alternative" :inert="!temGoogle || ocupado" :aria-hidden="!temGoogle || undefined" aria-label="Outra forma de acessar">
          <div class="auth-divider"><span>ou continue com</span></div>
          <GoogleAuthButton v-if="googleIniciado" :loading="ocupado" @credential="entrarGoogle" @error="focarErro" />
          <p v-if="erroGoogle" class="auth-alert auth-alert--error" role="alert" tabindex="-1">{{ erroGoogle }}</p>
        </section>
        <p v-if="temGoogle" class="auth-footer">
          {{ cadastro ? 'Já tem uma conta?' : 'Primeira vez por aqui?' }}
          <RouterLink :to="destino(cadastro ? 'login' : 'cadastro')" class="auth-link auth-create-link" :aria-disabled="linksBloqueados">
            {{ cadastro ? 'Entrar' : 'Criar minha conta' }} <ArrowRight :size="15" aria-hidden="true" />
          </RouterLink>
        </p>
        <p class="auth-secure"><ShieldCheck :size="16" aria-hidden="true" /> Seu pedido começa com um acesso seguro.</p>
      </div>
    </main>
  </div>
</template>

<style scoped>
.auth-layout { position: relative; min-height: 100dvh; overflow: clip; background: var(--pp-creme); color: var(--pp-marrom); }
.auth-layout__photo { position: fixed; z-index: 2; top: 0; bottom: 0; left: 0; width: 50%; min-height: 100dvh; padding: 16px; will-change: transform; }
.auth-layout__photo-surface { position: absolute; inset: 16px; overflow: hidden; border-radius: var(--pp-radius-card-lg); background: var(--pp-marrom); }
.auth-layout__photo-surface::after { content: ''; position: absolute; inset: 35% 0 0; background: var(--pp-auth-photo-shade); }
.auth-layout__photo-copy { position: absolute; z-index: 1; left: clamp(32px, 4.5vw, 76px); bottom: 64px; color: var(--pp-creme); }
.auth-layout__photo-copy p { margin: 12px 0 28px; font: 400 clamp(40px, 4.8vw, 72px)/1.1 var(--pp-font-titulo); letter-spacing: -.025em; }
.auth-layout__photo-copy > span:last-child { font-size: 11px; font-weight: 600; letter-spacing: .16em; }
.auth-layout__photo-note { color: var(--pp-gold); font: 700 30px/1.2 var(--pp-font-nota); }
.auth-layout__panel { position: relative; width: 50%; min-height: 100dvh; margin-left: 0; display: flex; justify-content: center; align-items: center; padding: 44px clamp(28px, 4vw, 68px); }
.auth-layout--register .auth-layout__panel { margin-left: 50%; }
.auth-layout__content { width: 100%; max-width: 400px; }
.auth-layout__content--wide { max-width: 500px; }
.auth-layout__header { display: flex; flex-direction: column; align-items: flex-start; gap: 24px; margin-bottom: 36px; }
.auth-layout__brand { display: inline-flex; width: 174px; }
.auth-layout__brand img { display: block; width: 100%; height: auto; filter: brightness(.45); }
.auth-layout__back { display: inline-flex; align-items: center; gap: 7px; min-height: 30px; font-size: 12px; color: var(--pp-texto-2); }
.auth-layout__back:hover { color: var(--pp-dourado-profundo); text-decoration: underline; }
.auth-page-enter-active,.auth-page-leave-active { transition: opacity 140ms var(--pp-ease), transform 140ms var(--pp-ease); }
.auth-page-enter-from { opacity: 0; transform: translateX(calc(var(--auth-page-distance) * var(--auth-direction))); }
.auth-page-leave-to { opacity: 0; transform: translateX(calc(-1 * var(--auth-page-distance) * var(--auth-direction))); }
@media (max-width: 900px) {
  .auth-layout__photo { display: none; }
  .auth-layout__panel,.auth-layout--register .auth-layout__panel { width: 100%; margin-left: 0; padding: 28px 24px 32px; }
  .auth-layout__content,.auth-layout__content--wide { max-width: 500px; }
  .auth-layout__header { margin-bottom: 30px; gap: 20px; }
  .auth-layout__brand { width: 150px; }
  .auth-page-enter-from { transform: translateY(calc(var(--auth-page-distance) * var(--auth-direction))); }
  .auth-page-leave-to { transform: translateY(calc(-1 * var(--auth-page-distance) * var(--auth-direction))); }
}
@media (min-width: 901px) { .auth-layout__photo-surface { background: var(--pp-marrom) url('/background-image.png') center / cover no-repeat; } }
@media (max-height: 700px) { .auth-layout__panel { align-items: flex-start; padding-block: 24px; } .auth-layout__header { margin-bottom: 24px; gap: 12px; } }
@media (max-width: 380px) { .auth-layout__panel,.auth-layout--register .auth-layout__panel { padding-inline: 20px; } }
@media (prefers-reduced-motion: reduce) { .auth-layout__photo { will-change: auto; } .auth-page-enter-active,.auth-page-leave-active { transition: none; } }
</style>
