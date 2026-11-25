<script setup>
import {
  computed,
  nextTick,
  onBeforeUnmount,
  onMounted,
  provide,
  readonly,
  ref,
  watch,
} from "vue";
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
const consulta = computed(() =>
  redirect.value ? { redirect: redirect.value } : {},
);
const transicaoFoto = computed(() => ({
  duration: reduzir.value ? 0 : 0.4,
  ease: [0.2, 0.7, 0.2, 1],
}));
const retorno = computed(() => ({
  name: route.name === "redefinir-senha" ? "recuperar-senha" : "login",
  query: consulta.value,
}));
function destino(name, query = {}) {
  return { name, query: { ...consulta.value, ...query } };
}
async function executar(operacao) {
  if (ocupado.value || auth.carregando || !ativo)
    return { ok: false, ignorado: true, campos: {} };
  const id = ++sequencia;
  const pagina = route.fullPath;
  const atual = () => ativo && id === sequencia && route.fullPath === pagina;
  ocupado.value = true;
  erroGoogle.value = "";
  try {
    const resultado = await operacao({ atual });
    return atual() ? resultado : { ok: false, ignorado: true, campos: {} };
  } catch {
    return atual()
      ? {
          ok: false,
          erro: "Não foi possível concluir. Tente novamente.",
          campos: {},
        }
      : { ok: false, ignorado: true, campos: {} };
  } finally {
    if (id === sequencia) ocupado.value = false;
  }
}
async function focarErro() {
  await nextTick();
  if (!ativo) return;
  const alvo =
    conteudo.value?.querySelector('[aria-invalid="true"]') ||
    conteudo.value?.querySelector('[role="alert"]');
  alvo?.focus();
}
function atualizarAceite(valor) {
  aceite.value = Boolean(valor);
  if (aceite.value) erroAceite.value = false;
}
provide("authExperience", {
  ocupado: readonly(ocupado),
  erroAceite: readonly(erroAceite),
  executar,
  destino,
  focarErro,
  atualizarAceite,
});
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
  if (!resultado.ok) {
    erroGoogle.value = resultado.erro;
    await focarErro();
    return;
  }
  await router.replace(
    redirect.value || { name: auth.isAdmin ? "admin-dashboard" : "home" },
  );
}
function sairFormulario(elemento) {
  transicionando.value = true;
  elemento.inert = true;
  elemento.setAttribute("aria-hidden", "true");
}
function concluirTransicao() {
  transicionando.value = false;
}
function focarTitulo() {
  concluirTransicao();
  conteudo.value?.querySelector("h1")?.focus({ preventScroll: true });
}
function guardarNavegacao(evento) {
  if (!linksBloqueados.value) return;
  const link = evento.target?.closest?.("a[href]");
  if (!link || link.origin !== window.location.origin) return;
  if (router.resolve(link.pathname).meta.somenteVisitante)
    evento.preventDefault();
}
watch(
  () => route.fullPath,
  () => {
    sequencia += 1;
    auth.invalidarOperacao();
    ocupado.value = false;
    erroGoogle.value = "";
    aceite.value = false;
    erroAceite.value = false;
    if (temGoogle.value) googleIniciado.value = true;
  },
  { flush: "sync" },
);
onMounted(() => {
  media = window.matchMedia("(max-width: 900px)");
  pequeno.value = media.matches;
  media.addEventListener("change", atualizarTamanho);
});
function atualizarTamanho(evento) {
  pequeno.value = evento.matches;
}
onBeforeUnmount(() => {
  ativo = false;
  sequencia += 1;
  media?.removeEventListener("change", atualizarTamanho);
  auth.invalidarOperacao?.();
});
</script>

<template>
  <div
    class="auth-layout"
    :class="{
      'auth-layout--register': cadastro,
      'auth-layout--reduced': reduzir,
    }"
    :style="{ '--auth-direction': cadastro ? 1 : -1 }"
  >
    <motion.aside
      class="auth-layout__photo"
      aria-hidden="true"
      :initial="false"
      :animate="{ x: cadastro ? '0%' : '100%' }"
      :transition="transicaoFoto"
    >
      <div class="auth-layout__photo-surface">
        <div class="auth-layout__photo-copy">
          <span class="auth-layout__photo-note">Feito aqui. Pra você.</span>
          <p>Seu intervalo<br />começa aqui.</p>
          <span>PIRES PANIFICADORA</span>
        </div>
      </div>
    </motion.aside>
    <main
      ref="conteudo"
      class="auth-layout__panel"
      :aria-busy="ocupado"
      @click.capture="guardarNavegacao"
    >
      <div
        class="auth-layout__content"
        :class="{ 'auth-layout__content--wide': cadastro }"
      >
        <header class="auth-layout__header">
          <RouterLink
            :to="destino('login')"
            class="auth-layout__brand"
            aria-label="Pires Panificadora — início do acesso"
            :aria-disabled="linksBloqueados"
          >
            <img
              src="/logo.png"
              alt="Pires Panificadora"
              width="174"
              height="88"
            />
          </RouterLink>
          <RouterLink
            v-if="route.name !== 'login'"
            :to="retorno"
            class="auth-layout__back"
            :aria-disabled="linksBloqueados"
          >
            <ArrowLeft :size="16" aria-hidden="true" />{{
              route.name === "redefinir-senha"
                ? "Solicitar outro código"
                : "Voltar ao login"
            }}
          </RouterLink>
        </header>
        <RouterView v-slot="{ Component, route: pagina }">
          <Transition
            :name="reduzir ? '' : 'auth-page'"
            mode="out-in"
            @before-leave="sairFormulario"
            @after-enter="focarTitulo"
            @enter-cancelled="concluirTransicao"
            @leave-cancelled="concluirTransicao"
          >
            <component
              :is="Component"
              :key="pagina.name"
              :style="{ '--auth-page-distance': pequeno ? '6px' : '12px' }"
            />
          </Transition>
        </RouterView>
        <section
          v-show="temGoogle"
          class="auth-layout__alternative"
          :inert="!temGoogle || ocupado"
          :aria-hidden="!temGoogle || undefined"
          aria-label="Outra forma de acessar"
        >
          <div class="auth-divider"><span>ou continue com</span></div>
          <GoogleAuthButton
            v-if="googleIniciado"
            :loading="ocupado"
            @credential="entrarGoogle"
            @error="focarErro"
          />
          <p
            v-if="erroGoogle"
            class="auth-alert auth-alert--error"
            role="alert"
            tabindex="-1"
          >
            {{ erroGoogle }}
          </p>
        </section>
        <p v-if="temGoogle" class="auth-footer">
          {{ cadastro ? "Já tem uma conta?" : "Primeira vez por aqui?" }}
          <RouterLink
            :to="destino(cadastro ? 'login' : 'cadastro')"
            class="auth-link auth-create-link"
            :aria-disabled="linksBloqueados"
          >
            {{ cadastro ? "Entrar" : "Criar minha conta" }}
            <ArrowRight :size="15" aria-hidden="true" />
          </RouterLink>
        </p>
        <p class="auth-secure">
          <ShieldCheck :size="16" aria-hidden="true" /> Seu pedido começa com um
          acesso seguro.
        </p>
      </div>
    </main>
  </div>
</template>

<style scoped src="./AuthLayout.css"></style>
