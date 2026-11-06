<script setup>
import { computed, nextTick, onBeforeUnmount, shallowRef, useId, useTemplateRef, watch } from "vue";
import { CircleAlert, Heart, LoaderCircle, Minus, Plus, ShoppingCart, X } from "lucide-vue-next";
import ProductImage from "@/components/catalog/ProductImage.vue";
import CardActionContent from "@/components/ui/CardActionContent.vue";
import { registrarOrigemVoo } from "@/utils/vooAoCarrinho";

const props = defineProps({
  open: { type: Boolean, default: false },
  produto: { type: Object, default: null },
  loading: { type: Boolean, default: false },
  adding: { type: Boolean, default: false },
  favorito: { type: Boolean, default: false },
  favoritando: { type: Boolean, default: false },
  feedback: { type: String, default: "" },
});
const emit = defineEmits(["close", "favorite", "add"]);
const dialogo = useTemplateRef("dialogo");
const fechar = useTemplateRef("fechar");
const midia = useTemplateRef("midia");
const tituloId = useId();
const quantidadeId = useId();
const quantidade = shallowRef(1);
const solicitando = shallowRef(false);
const mensagemFeedback = shallowRef("");
const enviando = computed(() => props.adding || solicitando.value);
const estoque = computed(() => Math.max(0, Math.floor(Number(props.produto?.estoque) || 0)));
const limiteQuantidade = computed(() => Math.max(1, estoque.value));
const preco = computed(() => Number(props.produto?.preco_atual ?? props.produto?.preco ?? 0));
const temDesconto = computed(() => props.produto?.em_promocao && Number(props.produto.preco) > preco.value);
const statusEstoque = computed(() => {
  if (!estoque.value) return { disponivel: false, texto: "Sem estoque" };
  if (estoque.value <= 5) return { disponivel: true, texto: estoque.value === 1 ? "Só 1 unidade disponível" : `Só ${estoque.value} unidades disponíveis` };
  return { disponivel: true, texto: "Disponível para pedir" };
});
const moeda = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const subtotal = computed(() => moeda.format(preco.value * quantidade.value));
let overflowAnterior = null;
let gatilho = null;
let fundoPressionado = false;

function restaurarPagina() {
  if (overflowAnterior !== null) {
    const { valor, prioridade } = overflowAnterior;
    if (valor) document.body.style.setProperty("overflow", valor, prioridade);
    else document.body.style.removeProperty("overflow");
    overflowAnterior = null;
  }
  if (gatilho?.isConnected) gatilho.focus({ preventScroll: true });
  gatilho = null;
}
watch([() => props.open, dialogo], ([aberto, elemento]) => {
  if (!elemento) return;
  if (aberto && !elemento.open) {
    gatilho = document.activeElement;
    overflowAnterior = {
      valor: document.body.style.getPropertyValue("overflow"),
      prioridade: document.body.style.getPropertyPriority("overflow"),
    };
    document.body.style.setProperty("overflow", "hidden");
    elemento.showModal();
    fechar.value?.focus({ preventScroll: true });
  } else if (!aberto && elemento.open) {
    elemento.close();
    restaurarPagina();
  }
}, { immediate: true, flush: "post" });
watch(() => [props.open, props.produto?.id], () => { quantidade.value = 1; });
watch([() => props.open, () => props.feedback], ([aberto, mensagem], [estavaAberto]) => {
  mensagemFeedback.value = aberto && estavaAberto ? mensagem : "";
});
watch(limiteQuantidade, (limite) => { quantidade.value = Math.min(quantidade.value, limite); });
onBeforeUnmount(() => { dialogo.value?.close(); restaurarPagina(); });

function conterTab(event) {
  if (event.key !== "Tab") return;
  const controles = [...dialogo.value.querySelectorAll('button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled), [tabindex="0"]')]
    .filter((elemento) => elemento.getClientRects().length);
  const primeiro = controles[0];
  const ultimo = controles.at(-1);
  if (event.shiftKey && document.activeElement === primeiro) {
    event.preventDefault(); ultimo?.focus();
  } else if (!event.shiftKey && document.activeElement === ultimo) {
    event.preventDefault(); primeiro?.focus();
  }
}
function marcarFundo(event) { fundoPressionado = event.target === dialogo.value; }
function fecharPeloFundo(event) {
  if (fundoPressionado && event.target === dialogo.value) emit("close");
  fundoPressionado = false;
}
function diminuir() { if (!enviando.value) quantidade.value = Math.max(1, quantidade.value - 1); }
function aumentar() { if (!enviando.value) quantidade.value = Math.min(limiteQuantidade.value, quantidade.value + 1); }
// O voo até o carrinho parte da imagem do modal (só acontece se o item entrar no carrinho).
async function adicionar() {
  if (!props.open || props.loading || !props.produto || !statusEstoque.value.disponivel || enviando.value) return;
  solicitando.value = true;
  registrarOrigemVoo(midia.value);
  emit("add", { produto: props.produto, quantidade: quantidade.value });
  await nextTick();
  solicitando.value = false;
}
</script>

<template>
  <Teleport to="body">
    <dialog ref="dialogo" class="product-modal" :aria-labelledby="tituloId" aria-modal="true"
      @cancel.prevent="emit('close')" @keydown="conterTab" @pointerdown="marcarFundo" @click="fecharPeloFundo">
      <div class="product-modal__dialog">
        <header class="product-modal__header">
          <button ref="fechar" type="button" class="product-modal__close" aria-label="Fechar detalhes" autofocus @click="emit('close')">
            <X :size="22" aria-hidden="true" />
          </button>
        </header>
        <div v-if="loading" class="product-modal__loading" role="status">
          <LoaderCircle :size="28" class="product-modal__spinner" aria-hidden="true" />
          <h2 :id="tituloId">Carregando detalhes do produto…</h2>
        </div>
        <template v-else-if="produto">
          <div class="product-modal__body">
            <div ref="midia" class="product-modal__media"><ProductImage :produto="produto" variant="modal" loading="eager" /></div>
            <div class="product-modal__content">
              <div class="product-modal__topline">
                <span class="product-modal__category">{{ produto.categoria_nome || "Produto" }}</span>
                <button type="button" class="product-modal__favorite" :class="{ 'is-active': favorito }" :disabled="favoritando" :aria-pressed="favorito"
                  :aria-label="favorito ? 'Remover dos favoritos' : 'Adicionar aos favoritos'" @click="emit('favorite', produto)">
                  <LoaderCircle v-if="favoritando" :size="20" class="product-modal__spinner" aria-hidden="true" />
                  <Heart v-else :size="22" :fill="favorito ? 'currentColor' : 'none'" aria-hidden="true" />
                </button>
              </div>
              <h2 :id="tituloId">{{ produto.nome }}</h2>
              <p class="product-modal__description">{{ produto.descricao || "Produto disponível para reserva na Pires Panificadora." }}</p>
              <div class="product-modal__prices">
                <s v-if="temDesconto" class="product-modal__old-price">{{ moeda.format(Number(produto.preco)) }}</s>
                <strong>{{ moeda.format(preco) }}</strong>
              </div>
              <p class="product-modal__stock" role="status">{{ statusEstoque.texto }}</p>
            </div>
          </div>
          <div class="product-modal__purchase-area">
            <div class="product-modal__purchase">
              <div>
                <span :id="quantidadeId" class="product-modal__label">Quantidade</span>
                <div class="product-modal__quantity" role="group" :aria-labelledby="quantidadeId">
                  <button type="button" :disabled="quantidade <= 1 || !statusEstoque.disponivel || enviando" aria-label="Diminuir quantidade" @click="diminuir"><Minus :size="18" aria-hidden="true" /></button>
                  <output aria-live="polite" aria-label="Quantidade">{{ quantidade }}</output>
                  <button type="button" :disabled="!statusEstoque.disponivel || quantidade >= limiteQuantidade || enviando" aria-label="Aumentar quantidade" @click="aumentar"><Plus :size="18" aria-hidden="true" /></button>
                </div>
              </div>
              <div class="product-modal__subtotal"><span>Subtotal</span><strong>{{ subtotal }}</strong></div>
            </div>
            <p v-if="mensagemFeedback" class="product-modal__feedback" role="status" aria-live="polite" aria-atomic="true">{{ mensagemFeedback }}</p>
            <button type="button" class="product-modal__add pp-card-action" data-card-action-radius :class="{ 'is-loading': enviando }"
              :disabled="!statusEstoque.disponivel || enviando" :aria-busy="enviando" @click="adicionar">
              <CardActionContent>
                <LoaderCircle v-if="enviando" :size="20" class="product-modal__spinner" aria-hidden="true" />
                <ShoppingCart v-else :size="20" aria-hidden="true" />
                {{ enviando ? "Adicionando…" : statusEstoque.disponivel ? "Adicionar ao carrinho" : "Produto indisponível" }}
              </CardActionContent>
            </button>
          </div>
        </template>
        <div v-else class="product-modal__error" role="alert">
          <CircleAlert :size="30" aria-hidden="true" />
          <h2 :id="tituloId">Não foi possível carregar este produto.</h2>
          <p>Feche os detalhes e tente abrir o produto novamente.</p>
          <button type="button" @click="emit('close')">Fechar</button>
        </div>
      </div>
    </dialog>
  </Teleport>
</template>

<style scoped>
.product-modal {
  --pp-home-action-duration: 450ms;
  position: fixed;
  inset: 0;
  width: 100%;
  height: 100dvh;
  max-width: none;
  max-height: none;
  margin: 0;
  padding: var(--pp-space-5) 80px;
  border: 0;
  overflow: auto;
  background: transparent;
  color: var(--pp-marrom);
  font-family: var(--pp-font-body);
  overscroll-behavior: contain;
}
.product-modal[open] { display: grid; place-items: center; }
.product-modal:not([open]) { display: none; }
.product-modal::backdrop { background: var(--pp-overlay); }
.product-modal__dialog {
  position: relative;
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  grid-template-rows: minmax(0, 1fr) auto;
  width: min(1040px, 100%);
  height: min(680px, calc(100dvh - 64px));
  min-height: 0;
  border-radius: var(--pp-radius-card);
  background: var(--pp-creme);
  box-shadow: var(--pp-shadow-elevation);
}
.product-modal__header { position: absolute; top: 0; right: -64px; }
.product-modal__close, .product-modal__favorite { display: grid; place-items: center; width: 48px; height: 48px; padding: 0; border: 0; border-radius: var(--pp-radius-full); background: var(--pp-creme); color: var(--pp-marrom); cursor: pointer; }
.product-modal__favorite { flex: none; background: transparent; color: var(--pp-texto-2); }
.product-modal__favorite.is-active { color: var(--pp-marrom); }
.product-modal__body { display: contents; }
.product-modal__media { grid-column: 1; grid-row: 1 / 3; min-width: 0; min-height: 0; overflow: hidden; border-radius: var(--pp-radius-card) 0 0 var(--pp-radius-card); background: var(--pp-creme-2); }
.product-modal__media :deep(.catalog-product-image--modal) { min-height: 0; height: 100%; }
.product-modal__content { grid-column: 2; min-width: 0; min-height: 0; overflow-y: auto; overscroll-behavior: contain; padding: var(--pp-space-5) var(--pp-space-5) var(--pp-space-3); }
.product-modal__topline { display: flex; align-items: center; justify-content: space-between; gap: var(--pp-space-3); }
.product-modal__category { color: var(--pp-texto-2); font-size: 14px; line-height: 1.5; }
.product-modal__content h2 { margin: var(--pp-space-3) 0 var(--pp-space-4); color: var(--pp-marrom); font: 400 clamp(32px, 3.2vw, 44px)/1.15 var(--pp-font-titulo); letter-spacing: -.025em; overflow-wrap: anywhere; }
.product-modal__description { max-width: 65ch; margin: 0; color: var(--pp-texto-2); font-size: 16px; line-height: 1.65; overflow-wrap: anywhere; }
.product-modal__prices { display: flex; flex-wrap: wrap; align-items: baseline; gap: var(--pp-space-2); margin-top: var(--pp-space-4); }
.product-modal__prices strong { font-size: 30px; font-weight: 700; line-height: 1.3; }
.product-modal__old-price { color: var(--pp-texto-2); font-size: 15px; }
.product-modal__stock { margin: var(--pp-space-2) 0 0; color: var(--pp-texto-2); font-size: 14px; line-height: 1.5; }
.product-modal__purchase-area { grid-column: 2; min-width: 0; padding: var(--pp-space-4) var(--pp-space-5) var(--pp-space-5); }
.product-modal__purchase { display: flex; align-items: end; justify-content: space-between; gap: var(--pp-space-3); }
.product-modal__label, .product-modal__subtotal span { display: block; margin-bottom: var(--pp-space-1); color: var(--pp-texto-2); font-size: 13px; line-height: 1.5; }
.product-modal__quantity { display: grid; grid-template-columns: 44px 40px 44px; align-items: center; border: 1px solid var(--pp-creme-borda); border-radius: var(--pp-radius-full); }
.product-modal__quantity button { display: grid; place-items: center; width: 44px; height: 44px; border: 0; border-radius: var(--pp-radius-full); background: transparent; color: var(--pp-marrom); cursor: pointer; }
.product-modal__quantity output { text-align: center; font-weight: 600; font-variant-numeric: tabular-nums; }
.product-modal__subtotal { text-align: right; }
.product-modal__subtotal strong { font-size: 20px; font-variant-numeric: tabular-nums; }
.product-modal__feedback { margin: var(--pp-space-3) 0 0; color: var(--pp-marrom); font-size: 14px; line-height: 1.5; overflow-wrap: anywhere; }
.product-modal__add { display: flex; justify-content: center; align-items: center; gap: var(--pp-space-2); width: 100%; min-height: 52px; margin-top: var(--pp-space-4); padding: var(--pp-space-2) var(--pp-space-3); border: 0; border-radius: var(--pp-radius-full); background: var(--pp-marrom); color: var(--pp-creme); font: 600 15px/1.5 var(--pp-font-body); cursor: pointer; }
.product-modal button:disabled { opacity: .5; cursor: default; }
.product-modal button:focus-visible { outline: 3px solid var(--pp-dourado-escuro); outline-offset: 3px; }
.product-modal__loading, .product-modal__error { grid-column: 1 / -1; grid-row: 1 / -1; display: flex; flex-direction: column; justify-content: center; align-items: center; gap: var(--pp-space-3); min-height: 0; padding: var(--pp-space-4); overflow-y: auto; text-align: center; }
.product-modal__loading h2, .product-modal__error h2 { margin: 0; font: 600 20px/1.5 var(--pp-font-body); }
.product-modal__error p { margin: 0; color: var(--pp-texto-2); line-height: 1.6; }
.product-modal__error button { min-height: 44px; padding: var(--pp-space-2) var(--pp-space-4); border: 1px solid var(--pp-creme-borda); border-radius: var(--pp-radius-full); background: transparent; color: var(--pp-marrom); font: inherit; cursor: pointer; }
.product-modal__spinner { animation: modal-spin 800ms linear infinite; }
@keyframes modal-spin { to { transform: rotate(360deg); } }
@media (hover: hover) { .product-modal__close:hover, .product-modal__favorite:hover, .product-modal__quantity button:hover:not(:disabled) { background: var(--pp-creme-2); } }
@media (max-width: 1120px) {
  .product-modal { padding: var(--pp-space-4); }
  .product-modal__dialog { grid-template-rows: auto minmax(0, 1fr) auto; height: min(720px, calc(100dvh - 48px)); }
  .product-modal__header { position: static; grid-column: 1 / -1; display: flex; justify-content: flex-end; padding: var(--pp-space-1); }
  .product-modal__media { grid-row: 2 / 4; border-top-left-radius: 0; }
  .product-modal__content { grid-row: 2; }
  .product-modal__purchase-area { grid-row: 3; }
  .product-modal__content, .product-modal__purchase-area { padding-inline: var(--pp-space-4); }
  .product-modal__loading, .product-modal__error { grid-row: 2 / -1; }
}
@media (max-width: 760px) {
  .product-modal { padding: max(var(--pp-space-2), env(safe-area-inset-top)) var(--pp-space-1) max(var(--pp-space-1), env(safe-area-inset-bottom)); }
  .product-modal__dialog { display: flex; flex-direction: column; height: calc(100dvh - max(var(--pp-space-2), env(safe-area-inset-top)) - max(var(--pp-space-1), env(safe-area-inset-bottom))); border-radius: var(--pp-radius-card); }
  .product-modal__header { flex: none; padding: 4px var(--pp-space-1); }
  .product-modal__body { display: block; flex: 1; min-height: 0; overflow-y: auto; overscroll-behavior: contain; }
  .product-modal__media { height: clamp(150px, 30dvh, 280px); min-height: 0; border-radius: 0; }
  .product-modal__content { overflow: visible; padding: var(--pp-space-3) var(--pp-space-4) var(--pp-space-4); }
  .product-modal__content h2 { margin-top: var(--pp-space-1); font-size: 32px; }
  .product-modal__description { font-size: 15px; }
  .product-modal__prices { margin-top: var(--pp-space-3); }
  .product-modal__purchase-area { flex: none; padding: var(--pp-space-3) var(--pp-space-4) var(--pp-space-4); box-shadow: 0 -1px 0 var(--pp-creme-borda); }
  .product-modal__add { margin-top: var(--pp-space-3); }
  .product-modal__loading, .product-modal__error { flex: 1; }
}
@media (prefers-reduced-motion: reduce) { .product-modal__spinner { animation: none; } }
</style>
