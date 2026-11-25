<script setup>
import {
  computed,
  nextTick,
  onBeforeUnmount,
  shallowRef,
  useId,
  useTemplateRef,
  watch,
} from "vue";
import {
  CircleAlert,
  Heart,
  LoaderCircle,
  Minus,
  Plus,
  ShoppingCart,
  X,
} from "lucide-vue-next";
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
const estoque = computed(() =>
  Math.max(0, Math.floor(Number(props.produto?.estoque) || 0)),
);
const limiteQuantidade = computed(() => Math.max(1, estoque.value));
const preco = computed(() =>
  Number(props.produto?.preco_atual ?? props.produto?.preco ?? 0),
);
const temDesconto = computed(
  () => props.produto?.em_promocao && Number(props.produto.preco) > preco.value,
);
const statusEstoque = computed(() => {
  if (!estoque.value) return { disponivel: false, texto: "Sem estoque" };
  if (estoque.value <= 5)
    return {
      disponivel: true,
      texto:
        estoque.value === 1
          ? "Só 1 unidade disponível"
          : `Só ${estoque.value} unidades disponíveis`,
    };
  return { disponivel: true, texto: "Disponível para pedir" };
});
const moeda = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});
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
watch(
  [() => props.open, dialogo],
  ([aberto, elemento]) => {
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
  },
  { immediate: true, flush: "post" },
);
watch(
  () => [props.open, props.produto?.id],
  () => {
    quantidade.value = 1;
  },
);
watch(
  [() => props.open, () => props.feedback],
  ([aberto, mensagem], [estavaAberto]) => {
    mensagemFeedback.value = aberto && estavaAberto ? mensagem : "";
  },
);
watch(limiteQuantidade, (limite) => {
  quantidade.value = Math.min(quantidade.value, limite);
});
onBeforeUnmount(() => {
  dialogo.value?.close();
  restaurarPagina();
});

function conterTab(event) {
  if (event.key !== "Tab") return;
  const controles = [
    ...dialogo.value.querySelectorAll(
      'button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled), [tabindex="0"]',
    ),
  ].filter((elemento) => elemento.getClientRects().length);
  const primeiro = controles[0];
  const ultimo = controles.at(-1);
  if (event.shiftKey && document.activeElement === primeiro) {
    event.preventDefault();
    ultimo?.focus();
  } else if (!event.shiftKey && document.activeElement === ultimo) {
    event.preventDefault();
    primeiro?.focus();
  }
}
function marcarFundo(event) {
  fundoPressionado = event.target === dialogo.value;
}
function fecharPeloFundo(event) {
  if (fundoPressionado && event.target === dialogo.value) emit("close");
  fundoPressionado = false;
}
function diminuir() {
  if (!enviando.value) quantidade.value = Math.max(1, quantidade.value - 1);
}
function aumentar() {
  if (!enviando.value)
    quantidade.value = Math.min(limiteQuantidade.value, quantidade.value + 1);
}
async function adicionar() {
  if (
    !props.open ||
    props.loading ||
    !props.produto ||
    !statusEstoque.value.disponivel ||
    enviando.value
  )
    return;
  solicitando.value = true;
  registrarOrigemVoo(midia.value);
  emit("add", { produto: props.produto, quantidade: quantidade.value });
  await nextTick();
  solicitando.value = false;
}
</script>

<template>
  <Teleport to="body">
    <dialog
      ref="dialogo"
      class="product-modal"
      :aria-labelledby="tituloId"
      aria-modal="true"
      @cancel.prevent="emit('close')"
      @keydown="conterTab"
      @pointerdown="marcarFundo"
      @click="fecharPeloFundo"
    >
      <div class="product-modal__dialog">
        <header class="product-modal__header">
          <button
            ref="fechar"
            type="button"
            class="product-modal__close"
            aria-label="Fechar detalhes"
            autofocus
            @click="emit('close')"
          >
            <X :size="22" aria-hidden="true" />
          </button>
        </header>
        <div v-if="loading" class="product-modal__loading" role="status">
          <LoaderCircle
            :size="28"
            class="product-modal__spinner"
            aria-hidden="true"
          />
          <h2 :id="tituloId">Carregando detalhes do produto…</h2>
        </div>
        <template v-else-if="produto">
          <div class="product-modal__body">
            <div ref="midia" class="product-modal__media">
              <ProductImage
                :produto="produto"
                variant="modal"
                loading="eager"
              />
            </div>
            <div class="product-modal__content">
              <div class="product-modal__topline">
                <span class="product-modal__category">{{
                  produto.categoria_nome || "Produto"
                }}</span>
                <button
                  type="button"
                  class="product-modal__favorite"
                  :class="{ 'is-active': favorito }"
                  :disabled="favoritando"
                  :aria-pressed="favorito"
                  :aria-label="
                    favorito
                      ? 'Remover dos favoritos'
                      : 'Adicionar aos favoritos'
                  "
                  @click="emit('favorite', produto)"
                >
                  <LoaderCircle
                    v-if="favoritando"
                    :size="20"
                    class="product-modal__spinner"
                    aria-hidden="true"
                  />
                  <Heart
                    v-else
                    :size="22"
                    :fill="favorito ? 'currentColor' : 'none'"
                    aria-hidden="true"
                  />
                </button>
              </div>
              <h2 :id="tituloId">{{ produto.nome }}</h2>
              <p class="product-modal__description">
                {{
                  produto.descricao ||
                  "Produto disponível para reserva na Pires Panificadora."
                }}
              </p>
              <div class="product-modal__prices">
                <s v-if="temDesconto" class="product-modal__old-price">{{
                  moeda.format(Number(produto.preco))
                }}</s>
                <strong>{{ moeda.format(preco) }}</strong>
              </div>
              <p class="product-modal__stock" role="status">
                {{ statusEstoque.texto }}
              </p>
            </div>
          </div>
          <div class="product-modal__purchase-area">
            <div class="product-modal__purchase">
              <div>
                <span :id="quantidadeId" class="product-modal__label"
                  >Quantidade</span
                >
                <div
                  class="product-modal__quantity"
                  role="group"
                  :aria-labelledby="quantidadeId"
                >
                  <button
                    type="button"
                    :disabled="
                      quantidade <= 1 || !statusEstoque.disponivel || enviando
                    "
                    aria-label="Diminuir quantidade"
                    @click="diminuir"
                  >
                    <Minus :size="18" aria-hidden="true" />
                  </button>
                  <output aria-live="polite" aria-label="Quantidade">{{
                    quantidade
                  }}</output>
                  <button
                    type="button"
                    :disabled="
                      !statusEstoque.disponivel ||
                      quantidade >= limiteQuantidade ||
                      enviando
                    "
                    aria-label="Aumentar quantidade"
                    @click="aumentar"
                  >
                    <Plus :size="18" aria-hidden="true" />
                  </button>
                </div>
              </div>
              <div class="product-modal__subtotal">
                <span>Subtotal</span><strong>{{ subtotal }}</strong>
              </div>
            </div>
            <p
              v-if="mensagemFeedback"
              class="product-modal__feedback"
              role="status"
              aria-live="polite"
              aria-atomic="true"
            >
              {{ mensagemFeedback }}
            </p>
            <button
              type="button"
              class="product-modal__add pp-card-action"
              data-card-action-radius
              :class="{ 'is-loading': enviando }"
              :disabled="!statusEstoque.disponivel || enviando"
              :aria-busy="enviando"
              @click="adicionar"
            >
              <CardActionContent>
                <LoaderCircle
                  v-if="enviando"
                  :size="20"
                  class="product-modal__spinner"
                  aria-hidden="true"
                />
                <ShoppingCart v-else :size="20" aria-hidden="true" />
                {{
                  enviando
                    ? "Adicionando…"
                    : statusEstoque.disponivel
                      ? "Adicionar ao carrinho"
                      : "Produto indisponível"
                }}
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

<style scoped src="./ProductDetailsModal.css"></style>
