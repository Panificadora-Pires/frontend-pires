<template>
  <div class="cart-page">
    <header class="cart-page__header">
      <div>
        <h1>Seu carrinho</h1>
        <p>Seu intervalo começa por aqui.</p>
      </div>

      <RouterLink :to="{ name: 'cardapio' }" class="cart-page__continue">
        <ArrowLeft :size="16" />
        Continuar comprando
      </RouterLink>
    </header>

    <Transition
      name="cart-content"
      mode="out-in"
      @after-enter="focarVazioAposTransicao"
    >
      <section v-if="cart.vazio" key="vazio" class="cart-page__empty">
        <div class="cart-page__empty-copy">
          <span class="cart-page__eyebrow">Falta só escolher</span>
          <h2>Um intervalo<br />com seu sabor.</h2>
          <p>
            Seu carrinho está vazio. Encontre seu próximo favorito no cardápio.
          </p>
          <RouterLink :to="{ name: 'cardapio' }" class="cart-page__primary-link"
            >Explorar cardápio <ArrowRight :size="18" aria-hidden="true"
          /></RouterLink>
        </div>
        <div class="cart-page__empty-art" aria-hidden="true">
          <ProductIllustration tipo="coxinha" /><span
            >feito para o seu intervalo</span
          >
        </div>
      </section>

      <div v-else key="com-itens" class="cart-page__content">
        <div class="cart-page__layout">
          <section class="cart-page__items" aria-labelledby="cart-items-title">
            <div class="cart-page__section-head">
              <div>
                <h2 id="cart-items-title">Itens do pedido</h2>
                <p>
                  {{ cart.totalItens }}
                  {{
                    cart.totalItens === 1
                      ? "item selecionado"
                      : "itens selecionados"
                  }}
                </p>
              </div>

              <button
                type="button"
                ref="botaoLimparRef"
                class="cart-page__clear"
                :disabled="finalizando"
                @click="abrirConfirmacaoLimpeza"
              >
                <Trash2 :size="14" />
                Limpar
              </button>
            </div>

            <div v-if="sincronizando" class="cart-page__sync" role="status">
              <LoaderCircle :size="15" class="cart-page__spinner" />
              Conferindo preços e disponibilidade...
            </div>

            <TransitionGroup
              name="cart-item-list"
              tag="div"
              class="cart-page__item-list"
            >
              <article
                v-for="item in cart.itens"
                :key="item.produto.id"
                class="cart-item"
                :class="{ 'cart-item--problem': problemaItem(item) }"
              >
                <ProductImage :produto="item.produto" variant="compact" />

                <div class="cart-item__info">
                  <span class="cart-item__category">
                    {{ item.produto.categoria_nome || "Produto" }}
                  </span>
                  <h3>{{ item.produto.nome }}</h3>

                  <div class="cart-item__prices">
                    <span
                      v-if="item.produto.em_promocao"
                      class="cart-item__old-price"
                    >
                      {{ formatarPreco(item.produto.preco) }}
                    </span>
                    <strong>{{ formatarPreco(precoUnitario(item)) }}</strong>
                    <span>un.</span>
                  </div>

                  <p v-if="problemaItem(item)" class="cart-item__problem-text">
                    <CircleAlert :size="14" />
                    {{ problemaItem(item) }}
                  </p>
                </div>

                <div class="cart-item__actions">
                  <div
                    class="cart-item__quantity"
                    aria-label="Controle de quantidade"
                  >
                    <button
                      type="button"
                      class="pp-card-action"
                      :disabled="finalizando || item.quantidade <= 1"
                      :aria-label="`Diminuir quantidade de ${item.produto.nome}`"
                      @click="alterarQuantidade(item, item.quantidade - 1)"
                    >
                      <CardActionContent
                        ><Minus :size="15"
                      /></CardActionContent>
                    </button>
                    <strong>{{ item.quantidade }}</strong>
                    <button
                      type="button"
                      class="pp-card-action"
                      :disabled="finalizando || !podeAumentar(item)"
                      :aria-label="`Aumentar quantidade de ${item.produto.nome}`"
                      @click="alterarQuantidade(item, item.quantidade + 1)"
                    >
                      <CardActionContent><Plus :size="15" /></CardActionContent>
                    </button>
                  </div>

                  <small v-if="estoqueConhecido(item)" class="cart-item__stock">
                    {{ estoqueDisponivel(item) }}
                    {{
                      estoqueDisponivel(item) === 1
                        ? "disponível"
                        : "disponíveis"
                    }}
                  </small>
                </div>

                <div class="cart-item__subtotal">
                  <span>Subtotal</span>
                  <strong>
                    {{ formatarPreco(precoUnitario(item) * item.quantidade) }}
                  </strong>
                </div>

                <button
                  type="button"
                  class="cart-item__remove"
                  :disabled="finalizando"
                  :aria-label="`Remover ${item.produto.nome} do carrinho`"
                  @click="removerItem(item.produto.id)"
                >
                  <X :size="18" aria-hidden="true" />
                </button>
              </article>
            </TransitionGroup>
          </section>

          <aside class="cart-summary" aria-labelledby="cart-summary-title">
            <span class="cart-summary__eyebrow">Balcão Pires</span>
            <div class="cart-summary__head">
              <h2 id="cart-summary-title">Seu pedido</h2>
              <span
                >{{ cart.totalItens }}
                {{ cart.totalItens === 1 ? "item" : "itens" }}</span
              >
            </div>

            <div class="cart-summary__rows">
              <div>
                <span>Subtotal</span>
                <strong>{{ formatarPreco(cart.totalPreco) }}</strong>
              </div>
              <div>
                <span>Taxa de retirada</span>
                <strong>Grátis</strong>
              </div>
            </div>

            <div class="cart-summary__total">
              <span>Total</span>
              <Transition name="cart-price" mode="out-in">
                <strong :key="cart.totalPreco">{{
                  formatarPreco(cart.totalPreco)
                }}</strong>
              </Transition>
            </div>

            <div class="cart-summary__pickup">
              <Clock3 :size="18" />
              <div>
                <strong>Retirada no balcão</strong>
                <p>
                  Você acompanha o preparo e retira quando o pedido estiver
                  pronto.
                </p>
              </div>
            </div>

            <div v-if="erroFinalizar" class="cart-summary__error" role="alert">
              <CircleAlert :size="17" />
              <span>{{ erroFinalizar }}</span>
            </div>

            <button
              type="button"
              class="cart-summary__checkout"
              :disabled="finalizando || sincronizando || temProblemas"
              @click="finalizarPedido"
            >
              <LoaderCircle
                v-if="finalizando"
                :size="18"
                class="cart-page__spinner"
              />
              <ShoppingBag v-else :size="18" />
              {{
                finalizando
                  ? "Conferindo pedido..."
                  : "Continuar para pagamento"
              }}
              <ArrowRight v-if="!finalizando" :size="16" />
            </button>

            <div class="cart-summary__safe">
              <CircleCheckBig :size="15" />
              Preços e estoque verificados antes do pagamento
            </div>
          </aside>
        </div>

        <CartRecommendations />
      </div>
    </Transition>

    <dialog
      ref="dialogoLimpezaRef"
      class="cart-clear-dialog"
      aria-labelledby="cart-clear-dialog-title"
      aria-describedby="cart-clear-dialog-description"
      @close="restaurarFocoLimpeza"
    >
      <span class="cart-clear-dialog__eyebrow">SEU CARRINHO</span>
      <h2 id="cart-clear-dialog-title" class="cart-clear-dialog__title">
        Tirar tudo do carrinho?
      </h2>
      <p
        id="cart-clear-dialog-description"
        class="cart-clear-dialog__description"
      >
        Todos os produtos escolhidos serão removidos. Você pode adicioná-los
        novamente pelo cardápio.
      </p>
      <div class="cart-clear-dialog__actions">
        <button
          ref="botaoCancelarLimpezaRef"
          type="button"
          class="cart-clear-dialog__cancel"
          @click="fecharConfirmacaoLimpeza"
        >
          Manter produtos
        </button>
        <button
          type="button"
          class="cart-clear-dialog__confirm"
          @click="confirmarLimpezaCarrinho"
        >
          <Trash2 :size="17" aria-hidden="true" />
          Sim, limpar carrinho
        </button>
      </div>
    </dialog>

    <Transition name="cart-toast">
      <div
        v-if="toast"
        class="cart-page__toast"
        role="status"
        aria-live="polite"
      >
        <Check :size="17" />
        {{ toast }}
      </div>
    </Transition>
  </div>
</template>

<script setup>
import {
  computed,
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
  watch,
} from "vue";
import { useRouter } from "vue-router";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CircleAlert,
  CircleCheckBig,
  Clock3,
  LoaderCircle,
  Minus,
  Plus,
  ReceiptText,
  ShoppingBag,
  ShoppingCart,
  Trash2,
  X,
} from "lucide-vue-next";

import ProductIllustration from "@/components/catalog/ProductIllustration.vue";
import ProductImage from "@/components/catalog/ProductImage.vue";
import CardActionContent from "@/components/ui/CardActionContent.vue";
import CartRecommendations from "@/components/cart/CartRecommendations.vue";
import catalogService from "@/services/catalog.service";
import { useCartStore } from "@/stores/cart";

const cart = useCartStore();
const router = useRouter();

const estoques = ref({});
const ativos = ref({});
const sincronizando = ref(false);
const finalizando = ref(false);
const erroFinalizar = ref("");
const toast = ref("");
const dialogoLimpezaRef = ref(null);
const botaoLimparRef = ref(null);
const botaoCancelarLimpezaRef = ref(null);
const focarAoEsvaziar = ref(false);
let toastTimer = null;
let montado = true;
const contextoAtual = (contexto) => montado && cart.contextoAtual(contexto);
watch(
  () => cart.geracao,
  () => {
    estoques.value = {};
    ativos.value = {};
    sincronizando.value = false;
    finalizando.value = false;
    erroFinalizar.value = "";
    toast.value = "";
    focarAoEsvaziar.value = false;
    if (dialogoLimpezaRef.value?.open) dialogoLimpezaRef.value.close();
    window.clearTimeout(toastTimer);
  },
  { flush: "sync" },
);

const temProblemas = computed(() =>
  cart.itens.some((item) => Boolean(problemaItem(item))),
);

function formatarPreco(valor) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(Number(valor || 0));
}

function precoUnitario(item) {
  return Number(item?.produto?.preco_atual ?? item?.produto?.preco ?? 0);
}

function estoqueConhecido(item) {
  return (
    Object.prototype.hasOwnProperty.call(estoques.value, item.produto.id) ||
    item?.produto?.estoque !== undefined
  );
}

function estoqueDisponivel(item) {
  if (Object.prototype.hasOwnProperty.call(estoques.value, item.produto.id))
    return Number(estoques.value[item.produto.id] || 0);
  if (item.produto.estoque !== undefined)
    return Number(item.produto.estoque || 0);
  return 0;
}

function problemaItem(item) {
  const id = item.produto.id;

  if (ativos.value[id] === false) {
    return "Este produto não está mais disponível para venda.";
  }

  if (!estoqueConhecido(item)) return "";

  const estoque = estoqueDisponivel(item);
  if (estoque <= 0) return "Produto sem estoque no momento.";
  if (item.quantidade > estoque) {
    return `A quantidade escolhida excede o estoque atual (${estoque}).`;
  }

  return "";
}

function podeAumentar(item) {
  if (!estoqueConhecido(item)) return false;
  return (
    estoqueDisponivel(item) > item.quantidade &&
    ativos.value[item.produto.id] !== false
  );
}

function alterarQuantidade(item, quantidade) {
  const estoque = estoqueDisponivel(item);

  if (quantidade > estoque && estoqueConhecido(item)) {
    mostrarToast(
      `Há somente ${estoque} ${estoque === 1 ? "unidade disponível" : "unidades disponíveis"}.`,
    );
    return;
  }

  cart.alterarQuantidade(item.produto.id, quantidade);
  erroFinalizar.value = "";
}

function removerItem(produtoId) {
  cart.removerItem(produtoId);
  delete estoques.value[produtoId];
  delete ativos.value[produtoId];
  estoques.value = { ...estoques.value };
  ativos.value = { ...ativos.value };
  erroFinalizar.value = "";
  mostrarToast("Produto removido do carrinho.");
}

function abrirConfirmacaoLimpeza() {
  if (finalizando.value || cart.vazio || dialogoLimpezaRef.value?.open) return;
  dialogoLimpezaRef.value?.showModal();
  nextTick(() => botaoCancelarLimpezaRef.value?.focus());
}

function fecharConfirmacaoLimpeza() {
  dialogoLimpezaRef.value?.close();
}

function restaurarFocoLimpeza() {
  if (focarAoEsvaziar.value) return;
  nextTick(() => botaoLimparRef.value?.focus());
}

function focarVazioAposTransicao() {
  if (!focarAoEsvaziar.value || !cart.vazio) return;
  focarAoEsvaziar.value = false;
  document.querySelector(".cart-page__primary-link")?.focus();
}

function confirmarLimpezaCarrinho() {
  if (finalizando.value) return;
  focarAoEsvaziar.value = true;
  dialogoLimpezaRef.value?.close();
  cart.limpar();
  estoques.value = {};
  ativos.value = {};
  erroFinalizar.value = "";
}

async function sincronizarCarrinho({ silencioso = false } = {}) {
  if (cart.vazio || sincronizando.value) return;
  const contexto = cart.capturarContexto();
  if (!contextoAtual(contexto)) return;

  sincronizando.value = true;
  if (!silencioso) erroFinalizar.value = "";

  const itensSnapshot = [...cart.itens];
  const resultados = await Promise.allSettled(
    itensSnapshot.map(async (item) => {
      const detalhe = await catalogService.obterProduto(item.produto.id);
      return { id: item.produto.id, detalhe };
    }),
  );

  if (!contextoAtual(contexto)) return;

  const novosEstoques = { ...estoques.value };
  const novosAtivos = { ...ativos.value };
  let falhas = 0;

  resultados.forEach((resultado, index) => {
    const itemOriginal = itensSnapshot[index];
    const id = itemOriginal.produto.id;

    if (resultado.status === "fulfilled") {
      const detalhe = resultado.value.detalhe;
      novosEstoques[id] = Number(detalhe?.estoque ?? 0);
      novosAtivos[id] = detalhe?.ativo !== false;

      const itemAtual = cart.itens.find((item) => item.produto.id === id);
      if (itemAtual) {
        itemAtual.produto = {
          ...itemAtual.produto,
          ...detalhe,
        };
      }
    } else {
      falhas += 1;
      novosAtivos[id] = false;
    }
  });

  estoques.value = novosEstoques;
  ativos.value = novosAtivos;
  cart.atualizarRascunho();
  sincronizando.value = false;

  if (falhas && !silencioso) {
    erroFinalizar.value =
      "Não foi possível atualizar todos os produtos do carrinho.";
  }
}

async function finalizarPedido() {
  if (cart.vazio || finalizando.value) return;
  const contexto = cart.capturarContexto();
  if (!contextoAtual(contexto)) return;

  finalizando.value = true;
  erroFinalizar.value = "";

  try {
    await sincronizarCarrinho({ silencioso: true });
    if (!contextoAtual(contexto) || cart.vazio) return;

    if (temProblemas.value) {
      erroFinalizar.value = "Revise os itens destacados antes de continuar.";
      return;
    }

    await router.push({ name: "checkout" });
  } catch (error) {
    if (contextoAtual(contexto))
      erroFinalizar.value = mensagemErroPedido(error);
  } finally {
    if (contextoAtual(contexto)) finalizando.value = false;
  }
}

function mensagemErroPedido(error) {
  const data = error?.response?.data;

  if (typeof data?.detail === "string") return data.detail;
  if (typeof data?.itens_criacao === "string") return data.itens_criacao;
  if (Array.isArray(data?.itens_criacao)) return data.itens_criacao.join(" ");

  if (data && typeof data === "object") {
    const primeiraMensagem = Object.values(data)
      .flatMap((valor) => (Array.isArray(valor) ? valor : [valor]))
      .find((valor) => typeof valor === "string");

    if (primeiraMensagem) return primeiraMensagem;
  }

  return "Não foi possível confirmar o pedido. Verifique sua conexão e tente novamente.";
}

function mostrarToast(mensagem) {
  toast.value = mensagem;
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => {
    toast.value = "";
  }, 2200);
}

onMounted(() => {
  const contexto = cart.capturarContexto();
  sincronizarCarrinho().catch(() => {
    if (!contextoAtual(contexto)) return;
    erroFinalizar.value =
      "Não foi possível atualizar a disponibilidade dos produtos.";
    sincronizando.value = false;
  });
});

onBeforeUnmount(() => {
  montado = false;
  window.clearTimeout(toastTimer);
  if (dialogoLimpezaRef.value?.open) dialogoLimpezaRef.value.close();
});
</script>

<style scoped src="./CarrinhoView.css"></style>
