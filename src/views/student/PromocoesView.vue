<script setup>
import {
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  CircleAlert,
  Search,
  SearchX,
  Tag,
  X,
} from "lucide-vue-next";
import PromotionCampaign from "@/components/promotions/PromotionCampaign.vue";
import ProductDetailsModal from "@/components/catalog/ProductDetailsModal.vue";
import { usePromocoes } from "@/composables/usePromocoes";
import { useFavoritesStore } from "@/stores/favorites";

const favorites = useFavoritesStore();
const {
  produtos,
  busca,
  categoriaAtiva,
  ordenacao,
  carregando,
  erro,
  falhaAtualizacao,
  produtoAdicionando,
  modalAberto,
  carregandoDetalhe,
  produtoDetalhado,
  adicionandoModal,
  toast,
  indicador,
  promocoesAtivas,
  categoriasPromocionais,
  promocoesFiltradas,
  destaque,
  demais,
  assinatura,
  temFiltros,
  maiorDesconto,
  textoContagem,
  atualizarAgora,
  abrirProduto,
  fecharModal,
  alternarFavorito,
  adicionar,
  adicionarDoModal,
  limparFiltros,
} = usePromocoes();
</script>

<template>
  <div class="promotions-page">
    <header class="promotions-page__header">
      <div>
        <h1>Promoções</h1>
        <p class="promotions-page__note">Seu intervalo, por menos.</p>
      </div>
      <div class="promotions-page__intro">
        <p>
          {{
            !carregando && !erro && !promocoesAtivas.length
              ? "Consulte o cardápio completo da Pires."
              : "Escolha seu lanche entre as ofertas vigentes da Pires."
          }}
        </p>
        <p
          v-if="!carregando && !erro && promocoesAtivas.length"
          class="promotions-page__facts"
        >
          {{ promocoesAtivas.length }}
          {{ promocoesAtivas.length === 1 ? "oferta" : "ofertas" }} · descontos
          de até {{ maiorDesconto }}%
        </p>
      </div>
    </header>
    <section
      class="promotions-page__controls"
      aria-label="Busca e filtros de promoções"
    >
      <label class="promotions-page__search"
        ><Search :size="20" aria-hidden="true" /><input
          v-model="busca"
          type="search"
          aria-label="Buscar nas promoções"
          placeholder="Qual oferta você procura?"
          autocomplete="off" /><button
          v-if="busca"
          type="button"
          aria-label="Limpar busca"
          @click="busca = ''"
        >
          <X :size="18" aria-hidden="true" /></button
      ></label>
      <div
        ref="trilha"
        class="promotions-page__categories"
        role="group"
        aria-label="Categorias em promoção"
      >
        <div class="promotions-page__category-track">
          <button
            type="button"
            :aria-pressed="categoriaAtiva === null"
            @click="categoriaAtiva = null"
          >
            Todas
          </button>
          <button
            v-for="categoria in categoriasPromocionais"
            :key="categoria.id"
            type="button"
            :aria-pressed="categoriaAtiva === categoria.id"
            @click="categoriaAtiva = categoria.id"
          >
            {{ categoria.nome }}
          </button>
          <span
            class="promotions-page__indicator"
            :style="indicador"
            aria-hidden="true"
          />
        </div>
      </div>
      <label class="promotions-page__sort"
        ><select v-model="ordenacao" aria-label="Ordenar promoções">
          <option value="desconto">Maior desconto</option>
          <option value="menor-preco">Menor preço</option>
          <option value="termina-primeiro">Validade</option>
          <option value="nome">Nome A–Z</option></select
        ><ChevronDown :size="16" aria-hidden="true"
      /></label>
    </section>
    <section
      class="promotions-page__content"
      aria-labelledby="promotions-title"
      :aria-busy="carregando"
    >
      <div class="promotions-page__content-head">
        <h2 id="promotions-title" aria-live="polite" aria-atomic="true">
          {{ carregando ? "Carregando ofertas" : textoContagem }}
        </h2>
        <button v-if="temFiltros" type="button" @click="limparFiltros">
          Limpar filtros
        </button>
      </div>
      <p v-if="falhaAtualizacao" role="status">
        Não foi possível atualizar as ofertas. A disponibilidade será conferida
        ao adicionar.
      </p>
      <div
        v-if="carregando"
        class="promotions-page__loading"
        aria-label="Carregando promoções"
      >
        <div class="promotions-page__skeleton" />
        <div class="promotions-page__skeleton" />
      </div>
      <div v-else-if="erro" class="promotions-page__state" role="alert">
        <CircleAlert :size="28" aria-hidden="true" />
        <h2>Não conseguimos carregar as promoções.</h2>
        <p>Verifique sua conexão e tente novamente.</p>
        <button type="button" @click="atualizarAgora">Tentar novamente</button>
      </div>
      <div v-else-if="!promocoesAtivas.length" class="promotions-page__state">
        <Tag :size="28" aria-hidden="true" />
        <h2>Um novo sabor pode estar no cardápio.</h2>
        <p>
          Nenhuma promoção ativa agora. Você ainda pode escolher no cardápio
          completo.
        </p>
        <RouterLink :to="{ name: 'cardapio' }"
          >Ver cardápio <ArrowRight :size="18" aria-hidden="true"
        /></RouterLink>
      </div>
      <div
        v-else-if="!promocoesFiltradas.length"
        class="promotions-page__state"
      >
        <SearchX :size="28" aria-hidden="true" />
        <h2>Nenhuma oferta encontrada.</h2>
        <p>Tente outro produto ou remova os filtros.</p>
        <button type="button" @click="limparFiltros">
          Ver todas as ofertas
        </button>
      </div>
      <Transition
        v-else
        name="offers"
        @leave="(_element, concluir) => concluir()"
      >
        <div
          :key="assinatura"
          class="promotions-page__showcase"
          :class="{ 'promotions-page__showcase--pair': demais.length === 1 }"
        >
          <PromotionCampaign
            :key="destaque.produto.id"
            :item="destaque"
            featured
            :favorito="favorites.tem(destaque.produto.id)"
            :favoritando="favorites.estaProcessando(destaque.produto.id)"
            :adicionando="produtoAdicionando === destaque.produto.id"
            @open="abrirProduto"
            @favorite="alternarFavorito"
            @add="adicionar"
          />
          <section
            v-if="demais.length"
            class="promotions-page__more"
            aria-labelledby="more-offers"
          >
            <h2 id="more-offers">
              {{
                demais.length === 1
                  ? "Também em oferta"
                  : "Mais ofertas para escolher"
              }}
            </h2>
            <div
              class="promotions-page__grid"
              :class="{ 'promotions-page__grid--four': demais.length === 4 }"
            >
              <PromotionCampaign
                v-for="item in demais"
                :key="item.produto.id"
                :item="item"
                :favorito="favorites.tem(item.produto.id)"
                :favoritando="favorites.estaProcessando(item.produto.id)"
                :adicionando="produtoAdicionando === item.produto.id"
                @open="abrirProduto"
                @favorite="alternarFavorito"
                @add="adicionar"
              />
            </div>
          </section>
        </div>
      </Transition>
    </section>
    <section
      v-revelar
      class="promotions-page__how"
      aria-labelledby="how-offers"
    >
      <div>
        <h2 id="how-offers">Seu próximo<br />intervalo começa aqui.</h2>
        <RouterLink :to="{ name: 'cardapio' }"
          >Conhecer o cardápio <ArrowRight :size="18" aria-hidden="true"
        /></RouterLink>
      </div>
      <ol>
        <li>
          <strong>Escolha seu lanche</strong>
          <p>Veja os detalhes e adicione os produtos ao carrinho.</p>
        </li>
        <li>
          <strong>Conclua seu pedido</strong>
          <p>Escolha a forma de pagamento disponível no checkout.</p>
        </li>
        <li>
          <strong>Acompanhe e retire</strong>
          <p>
            Acompanhe o preparo e apresente o QR Code para retirar seu pedido.
          </p>
        </li>
      </ol>
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
    <Transition name="promotions-toast"
      ><div
        v-if="toast"
        class="promotions-page__toast"
        role="status"
        aria-live="polite"
      >
        <CheckCircle2 :size="18" aria-hidden="true" />{{ toast }}
      </div></Transition
    >
  </div>
</template>

<style scoped src="./PromocoesView.css"></style>
