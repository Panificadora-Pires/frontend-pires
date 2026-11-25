<script setup>
import {
  computed,
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
  watch,
} from "vue";
import { AnimatePresence } from "motion-v";
import {
  ArrowRight,
  CheckCircle2,
  CircleAlert,
  Heart,
  Search,
  SearchX,
  X,
} from "lucide-vue-next";
import FavoriteProduct from "@/components/favorites/FavoriteProduct.vue";
import FavoriteCollectionItem from "@/components/favorites/FavoriteCollectionItem.vue";
import ProductDetailsModal from "@/components/catalog/ProductDetailsModal.vue";
import { useCartStore } from "@/stores/cart";
import { useFavoritesStore } from "@/stores/favorites";
import { useAuthStore } from "@/stores/auth";
import {
  categoriasFavoritas,
  filtrarFavoritos,
  precoProduto,
  validarAdicao,
} from "@/utils/favoritos";
import { registrarOrigemVoo } from "@/utils/vooAoCarrinho";

const cart = useCartStore(),
  favorites = useFavoritesStore(),
  auth = useAuthStore();
const busca = ref(""),
  categoria = ref(""),
  ordem = ref("selecao");
const estado = ref(null),
  titulo = ref(null);
const categorias = computed(() => categoriasFavoritas(favorites.produtos));
const produtosFiltrados = computed(() =>
  filtrarFavoritos(favorites.produtos, {
    busca: busca.value,
    categoria: categoria.value,
    ordem: ordem.value,
  }),
);
const temFiltros = computed(() =>
  Boolean(busca.value || categoria.value || ordem.value !== "selecao"),
);
const modalAberto = ref(false),
  carregandoDetalhe = ref(false),
  produtoDetalhado = ref(null);
const produtoAdicionando = ref(null),
  origemAdicao = ref(null);
const toast = ref(""),
  tipoToast = ref("sucesso");
const adicionandoModal = computed(
  () => produtoAdicionando.value !== null && origemAdicao.value === "modal",
);
let montado = true,
  geracao = 0,
  requisicaoDetalhe = 0,
  toastTimer;
let destinoModal = null,
  produtoModalId = null;
const vistos = new Set();
function contextoAtual(g, conta) {
  return (
    montado &&
    !favorites.suspenso &&
    geracao === g &&
    (auth.usuario?.id ?? null) === conta
  );
}
function mostrarToast(mensagem, tipo = "sucesso") {
  toast.value = mensagem;
  tipoToast.value = tipo;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toast.value = "";
  }, 4400);
}
function limparFiltros() {
  busca.value = "";
  categoria.value = "";
  ordem.value = "selecao";
}
async function recarregar() {
  try {
    await favorites.carregar({ force: true });
  } catch {}
}
function focarColecao(preferido) {
  const botao = preferido
    ? document.getElementById(`favorite-remove-${preferido}`)
    : null;
  const valido = (elemento) =>
    elemento && !elemento.disabled && !elemento.closest("[inert]");
  const primeiro = produtosFiltrados.value
    .map((p) => document.getElementById(`favorite-remove-${p.id}`))
    .find(valido);
  (valido(botao) ? botao : primeiro || estado.value || titulo.value)?.focus({
    preventScroll: true,
  });
}
async function alternarFavorito(produto, confirmar) {
  if (
    !auth.usuario ||
    favorites.suspenso ||
    !produto?.id ||
    favorites.estaProcessando(produto.id)
  )
    return;
  const g = geracao,
    conta = auth.usuario?.id ?? null;
  const ids = produtosFiltrados.value.map((p) => p.id),
    indice = ids.indexOf(produto.id);
  const proximo = ids[indice + 1] ?? ids[indice - 1];
  const estava = favorites.tem(produto.id);
  let resultado;
  try {
    resultado = await favorites.alternar(produto);
  } catch {
    if (contextoAtual(g, conta))
      mostrarToast(
        "Não foi possível atualizar seus favoritos. Tente novamente.",
        "erro",
      );
    return;
  }
  if (!contextoAtual(g, conta) || resultado === undefined) return;
  mostrarToast(
    `${produto.nome} ${resultado ? "adicionado aos favoritos" : "removido dos favoritos"}.`,
  );
  if (estava && !resultado) {
    if (modalAberto.value && Number(produtoModalId) === Number(produto.id)) {
      destinoModal = { id: proximo };
      fecharModal();
    } else {
      await nextTick();
      focarColecao(proximo);
    }
  }
  confirmar?.();
}
function detalheExibivel(detalhe) {
  if (precoProduto(detalhe) === null) return null;
  return detalhe.ativo ? detalhe : { ...detalhe, estoque: 0 };
}
async function abrirProduto(produto) {
  if (!auth.usuario || favorites.suspenso || !produto?.id) return;
  const requisicao = ++requisicaoDetalhe,
    g = geracao,
    conta = auth.usuario?.id ?? null;
  destinoModal = { elemento: document.activeElement, id: produto.id };
  produtoModalId = produto.id;
  modalAberto.value = true;
  carregandoDetalhe.value = true;
  produtoDetalhado.value = null;
  toast.value = "";
  try {
    const detalhe = await favorites.obterDetalhe(produto.id);
    if (
      !contextoAtual(g, conta) ||
      requisicao !== requisicaoDetalhe ||
      !modalAberto.value
    )
      return;
    if (Number(detalhe?.id) !== Number(produto.id)) return;
    favorites.atualizarProduto(detalhe);
    produtoDetalhado.value = detalheExibivel(detalhe);
  } catch {
  } finally {
    if (contextoAtual(g, conta) && requisicao === requisicaoDetalhe)
      carregandoDetalhe.value = false;
  }
}
async function fecharModal() {
  const destino = destinoModal;
  destinoModal = null;
  produtoModalId = null;
  requisicaoDetalhe++;
  modalAberto.value = false;
  carregandoDetalhe.value = false;
  produtoDetalhado.value = null;
  await nextTick();
  if (!montado) return;
  if (
    destino?.elemento?.isConnected &&
    !destino.elemento.disabled &&
    !destino.elemento.closest("[inert]")
  )
    destino.elemento.focus({ preventScroll: true });
  else focarColecao(destino?.id);
}
async function adicionar(
  produto,
  quantidade = 1,
  origem = "direta",
  elementoOrigem = null,
) {
  if (
    !auth.usuario ||
    favorites.suspenso ||
    !produto?.id ||
    produtoAdicionando.value !== null ||
    !Number.isSafeInteger(quantidade) ||
    quantidade < 1
  )
    return;
  const g = geracao,
    conta = auth.usuario?.id ?? null,
    requisicao = requisicaoDetalhe;
  const contexto = cart.capturarContexto();
  if (!cart.contextoAtual(contexto)) return;
  produtoAdicionando.value = produto.id;
  origemAdicao.value = origem;
  const valido = () =>
    contextoAtual(g, conta) &&
    cart.contextoAtual(contexto) &&
    (origem !== "modal" ||
      (modalAberto.value && requisicao === requisicaoDetalhe));
  try {
    const detalhe = await favorites.obterDetalhe(produto.id);
    if (!valido()) return;
    const existente = cart.itens.find(
      (item) => Number(item.produto.id) === Number(produto.id),
    );
    const erro = validarAdicao(
      produto,
      detalhe,
      quantidade,
      existente?.quantidade || 0,
    );
    if (Number(detalhe?.id) === Number(produto.id))
      favorites.atualizarProduto(detalhe);
    if (origem === "modal") produtoDetalhado.value = detalheExibivel(detalhe);
    if (erro) {
      const mensagem =
        erro === "preco-alterado"
          ? "O preço mudou. Confira o valor atualizado e confirme a adição novamente."
          : erro === "estoque"
            ? "A quantidade solicitada não está disponível. Confira o estoque e o seu carrinho."
            : "Este produto está indisponível no momento.";
      mostrarToast(mensagem, "erro");
      if (erro === "preco-alterado" && origem !== "modal") {
        destinoModal = { elemento: document.activeElement, id: produto.id };
        produtoModalId = produto.id;
        requisicaoDetalhe++;
        modalAberto.value = true;
        carregandoDetalhe.value = false;
        produtoDetalhado.value = detalheExibivel(detalhe);
      }
      return;
    }
    if (existente) existente.produto = detalhe;
    if (origem === "direta") registrarOrigemVoo(elementoOrigem);
    if (!cart.adicionar(detalhe, quantidade, contexto)) return;
    mostrarToast(`${detalhe.nome} adicionado ao carrinho.`);
    if (origem === "modal") fecharModal();
  } catch {
    if (valido())
      mostrarToast(
        "Não foi possível conferir este produto. Tente novamente.",
        "erro",
      );
  } finally {
    if (contextoAtual(g, conta) && cart.contextoAtual(contexto)) {
      produtoAdicionando.value = null;
      origemAdicao.value = null;
    }
  }
}
function adicionarRapido(produto, origem) {
  return adicionar(produto, 1, "direta", origem);
}
function adicionarDoModal({ produto, quantidade }) {
  return adicionar(produto, quantidade, "modal");
}
watch(categorias, (lista) => {
  if (categoria.value && !lista.includes(categoria.value)) categoria.value = "";
});
watch(
  () => favorites.geracao,
  () => {
    geracao++;
    requisicaoDetalhe++;
    modalAberto.value = false;
    produtoDetalhado.value = null;
    carregandoDetalhe.value = false;
    produtoAdicionando.value = null;
    origemAdicao.value = null;
    destinoModal = null;
    produtoModalId = null;
    toast.value = "";
  },
  { flush: "sync" },
);
watch(
  () => auth.usuario?.id ?? null,
  () => {
    geracao++;
    requisicaoDetalhe++;
    modalAberto.value = false;
    produtoDetalhado.value = null;
    carregandoDetalhe.value = false;
    produtoAdicionando.value = null;
    origemAdicao.value = null;
    destinoModal = null;
    toast.value = "";
    limparFiltros();
    vistos.clear();
    favorites.sincronizarConta();
    if (auth.usuario) recarregar();
  },
  { flush: "sync" },
);
onMounted(recarregar);
onBeforeUnmount(() => {
  montado = false;
  geracao++;
  requisicaoDetalhe++;
  clearTimeout(toastTimer);
});
</script>

<template>
  <div class="favorites-page">
    <header class="favorites-page__header">
      <div>
        <h1 ref="titulo" tabindex="-1">Favoritos</h1>
        <p class="favorites-page__note">Seus sabores de sempre, por perto.</p>
      </div>
      <div class="favorites-page__summary">
        <p v-if="favorites.inicializado">
          <Heart :size="15" fill="currentColor" aria-hidden="true" /><strong>{{
            favorites.total
          }}</strong>
          {{ favorites.total === 1 ? "produto salvo" : "produtos salvos" }}
        </p>
        <RouterLink :to="{ name: 'cardapio' }"
          >Explorar cardápio <ArrowRight :size="17" aria-hidden="true"
        /></RouterLink>
      </div>
    </header>
    <div
      v-if="favorites.inicializado && favorites.total"
      class="favorites-page__controls"
      :class="{ 'favorites-page__controls--compact': favorites.total <= 2 }"
    >
      <label class="favorites-page__search"
        ><Search :size="19" aria-hidden="true" /><input
          v-model="busca"
          type="search"
          aria-label="Buscar nos favoritos"
          placeholder="Buscar um sabor salvo"
          autocomplete="off" /><button
          v-if="busca"
          type="button"
          aria-label="Limpar busca"
          @click="busca = ''"
        >
          <X :size="17" aria-hidden="true" /></button
      ></label>
      <label class="favorites-page__select"
        ><span>Categoria</span
        ><select v-model="categoria" aria-label="Filtrar por categoria">
          <option value="">Todas</option>
          <option v-for="nome in categorias" :key="nome" :value="nome">
            {{ nome }}
          </option>
        </select></label
      >
      <label class="favorites-page__select"
        ><span>Ordenar</span
        ><select v-model="ordem" aria-label="Ordenar favoritos">
          <option value="selecao">Ordem da seleção</option>
          <option value="nome">Nome A–Z</option>
          <option value="menor-preco">Menor preço</option>
          <option value="maior-preco">Maior preço</option>
        </select></label
      >
    </div>
    <section
      class="favorites-page__collection"
      aria-label="Sua coleção de favoritos"
      :aria-busy="favorites.carregando"
    >
      <p
        v-if="favorites.inicializado && favorites.erro"
        class="favorites-page__update-error"
        role="status"
      >
        Não foi possível atualizar sua coleção. Seus produtos continuam aqui.
        <button
          type="button"
          :disabled="favorites.carregando"
          @click="recarregar"
        >
          Tentar novamente
        </button>
      </p>
      <div
        v-if="!favorites.inicializado && !favorites.erro"
        class="favorites-page__loading"
        role="status"
      >
        <span>Carregando seus favoritos…</span>
        <div class="favorites-page__skeletons" aria-hidden="true">
          <div v-for="n in 4" :key="n" />
        </div>
      </div>
      <div
        v-else-if="!favorites.inicializado && favorites.erro"
        ref="estado"
        tabindex="-1"
        class="favorites-page__state"
        role="alert"
      >
        <CircleAlert :size="32" aria-hidden="true" />
        <h2>Sua coleção não carregou.</h2>
        <p>Verifique sua conexão e tente novamente.</p>
        <button
          type="button"
          :disabled="favorites.carregando"
          @click="recarregar"
        >
          {{ favorites.carregando ? "Carregando…" : "Tentar novamente" }}
        </button>
      </div>
      <template v-else>
        <div v-if="favorites.total" class="favorites-page__collection-head">
          <p aria-live="polite" aria-atomic="true">
            {{ produtosFiltrados.length }}
            {{
              produtosFiltrados.length === 1
                ? "sabor para o seu intervalo"
                : "sabores para o seu intervalo"
            }}
          </p>
          <button v-if="temFiltros" type="button" @click="limparFiltros">
            Limpar filtros
          </button>
        </div>
        <div
          class="favorites-page__grid"
          :class="{
            'favorites-page__grid--single': produtosFiltrados.length === 1,
            'favorites-page__grid--duo': produtosFiltrados.length === 2,
          }"
        >
          <AnimatePresence mode="popLayout">
            <FavoriteCollectionItem
              v-for="produto in produtosFiltrados"
              :key="produto.id"
              :produto-id="produto.id"
              :animar="!vistos.has(produto.id)"
              @apareceu="vistos.add($event)"
            >
              <FavoriteProduct
                :produto="produto"
                :destaque="produtosFiltrados.length === 1"
                :favoritando="favorites.estaProcessando(produto.id)"
                :adicionando="produtoAdicionando === produto.id"
                @open="abrirProduto"
                @favorite="alternarFavorito"
                @add="adicionarRapido"
              />
            </FavoriteCollectionItem>
          </AnimatePresence>
        </div>
        <div
          v-if="!favorites.total"
          class="favorites-page__state favorites-page__state--empty"
        >
          <svg
            class="favorites-page__illustration"
            viewBox="0 0 200 150"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="M30 110h140M45 110l-7-55h124l-7 55M60 110v18m80-18v18"
              stroke="currentColor"
              stroke-width="3"
              stroke-linecap="round"
            />
            <path
              d="M65 54c-16-6-17-27-4-32 8-4 16 0 20 7 4-7 12-11 20-7 13 5 12 26-4 32L81 66 65 54Z"
              fill="var(--pp-creme-3)"
              stroke="currentColor"
              stroke-width="2"
            />
            <path
              d="M110 53c-6-14 5-28 18-25 10 2 16 14 10 25M67 81h66m-58 13h50"
              stroke="currentColor"
              stroke-width="3"
              stroke-linecap="round"
            />
          </svg>
          <h2 ref="estado" tabindex="-1">
            Guarde um lugar<br />para os seus preferidos.
          </h2>
          <p>
            Toque no coração dos produtos que você gosta.<br
              class="favorites-page__desktop-break"
            />
            Eles ficam aqui para o próximo intervalo.
          </p>
          <RouterLink :to="{ name: 'cardapio' }"
            >Encontrar meu próximo favorito
            <ArrowRight :size="17" aria-hidden="true"
          /></RouterLink>
        </div>
        <div
          v-else-if="!produtosFiltrados.length"
          ref="estado"
          tabindex="-1"
          class="favorites-page__state"
        >
          <SearchX :size="32" aria-hidden="true" />
          <h2>Esse sabor não está na seleção.</h2>
          <p>Tente outro nome ou veja todos os produtos que você salvou.</p>
          <button type="button" @click="limparFiltros">
            Ver todos os favoritos
          </button>
        </div>
      </template>
    </section>
    <ProductDetailsModal
      :open="modalAberto"
      :produto="produtoDetalhado"
      :loading="carregandoDetalhe"
      :adding="adicionandoModal"
      :feedback="toast"
      :favorito="
        Boolean(produtoDetalhado && favorites.tem(produtoDetalhado.id))
      "
      :favoritando="
        Boolean(
          produtoDetalhado && favorites.estaProcessando(produtoDetalhado.id),
        )
      "
      @close="fecharModal"
      @favorite="alternarFavorito"
      @add="adicionarDoModal"
    />
    <Transition name="favorites-toast"
      ><div
        v-if="toast"
        class="favorites-page__toast"
        :class="{ 'favorites-page__toast--error': tipoToast === 'erro' }"
        :role="tipoToast === 'erro' ? 'alert' : 'status'"
        aria-live="polite"
      >
        <CircleAlert
          v-if="tipoToast === 'erro'"
          :size="19"
          aria-hidden="true"
        /><CheckCircle2 v-else :size="19" aria-hidden="true" />{{ toast }}
      </div></Transition
    >
  </div>
</template>

<style scoped src="./FavoritosView.css"></style>
