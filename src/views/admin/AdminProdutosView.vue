<template>
  <section class="admin-page pp-catalog">
    <header class="catalog-header">
      <div>
        <h1>Produtos</h1>
        <p>Preços, estoque e disponibilidade do cardápio em um só lugar.</p>
      </div>
      <RouterLink
        :to="{ name: 'admin-produto-novo' }"
        class="catalog-create pp-card-action pp-admin-action--primary"
        data-card-action-radius
      >
        <CardActionContent
          ><Plus :size="17" aria-hidden="true" /> Novo
          produto</CardActionContent
        >
      </RouterLink>
    </header>

    <section class="catalog-metrics" aria-label="Resumo do catálogo">
      <div
        v-for="metrica in metricas"
        :key="metrica.label"
        class="catalog-metric"
      >
        <span>{{ metrica.label }}</span>
        <strong>{{ resumo ? resumo[metrica.campo] : "—" }}</strong>
        <small>{{ metrica.descricao }}</small>
      </div>
    </section>

    <section class="catalog-panel" aria-labelledby="catalog-list-title">
      <header class="catalog-panel-header">
        <div>
          <h2 id="catalog-list-title">Catálogo de produtos</h2>
          <p v-if="inicializado">
            {{ paginaDados.count }}
            {{
              paginaDados.count === 1
                ? "produto encontrado"
                : "produtos encontrados"
            }}
            <span v-if="filtrosAtivos">com os filtros selecionados</span>
          </p>
          <p v-else>Organize o cardápio e acompanhe a disponibilidade.</p>
        </div>
      </header>

      <div class="catalog-toolbar">
        <div class="catalog-search" role="search">
          <Search :size="18" aria-hidden="true" />
          <input
            v-model="busca"
            type="search"
            aria-label="Buscar produto por nome ou código"
            maxlength="100"
            autocomplete="off"
            placeholder="Buscar por nome ou código"
          />
          <button
            v-if="busca"
            type="button"
            aria-label="Limpar busca"
            class="catalog-search-clear"
            @click="busca = ''"
          >
            <X :size="16" aria-hidden="true" />
          </button>
        </div>
        <AdminRemoteCategorySelect
          v-model="categoria"
          aria-label="Filtrar por categoria"
          incluir-todas
          class="catalog-filter"
        />
        <AdminCatalogSelect
          v-model="situacao"
          aria-label="Filtrar por situação do estoque e atividade"
          :options="opcoesSituacao"
          class="catalog-filter"
        />
      </div>

      <div v-if="erro" class="catalog-error" role="alert">
        <CircleAlert :size="18" aria-hidden="true" />
        <span>{{ erro }}</span>
        <button type="button" @click="tentarNovamente">Tentar novamente</button>
      </div>

      <div
        v-if="!inicializado && !erro"
        class="catalog-state"
        role="status"
        aria-live="polite"
      >
        <LoaderCircle :size="22" class="catalog-spin" aria-hidden="true" />
        Carregando catálogo…
      </div>
      <div
        v-else-if="inicializado && !paginaDados.results.length"
        class="catalog-state"
      >
        <PackageOpen :size="30" aria-hidden="true" />
        <strong>Nenhum produto encontrado</strong>
        <span>{{
          filtrosAtivos
            ? "Experimente remover ou alterar os filtros."
            : "Cadastre o primeiro produto para começar."
        }}</span>
        <button
          v-if="filtrosAtivos"
          type="button"
          class="catalog-reset"
          @click="limparFiltros"
        >
          Limpar filtros
        </button>
        <RouterLink
          v-else
          :to="{ name: 'admin-produto-novo' }"
          class="catalog-reset"
          >Cadastrar produto</RouterLink
        >
      </div>

      <template v-if="inicializado && paginaDados.results.length">
        <div class="catalog-columns" aria-hidden="true">
          <span>Produto</span>
          <span>Categoria</span>
          <span>Preço atual</span>
          <span>Estoque</span>
          <span>Situação</span>
          <span class="catalog-column-action">Ações</span>
        </div>

        <ul class="catalog-list">
          <li
            v-for="produto in paginaDados.results"
            :key="produto.id"
            class="catalog-row"
          >
            <div class="catalog-product">
              <ProductImage :produto="produto" class="catalog-product__image" />
              <div>
                <strong>{{ produto.nome }}</strong>
                <small>{{ produto.codigo || "Sem código" }}</small>
              </div>
            </div>

            <div class="catalog-cell catalog-cell--category">
              <span class="catalog-cell__label">Categoria</span>
              <span>{{ produto.categoria_nome || "Sem categoria" }}</span>
            </div>

            <div class="catalog-cell catalog-cell--price">
              <span class="catalog-cell__label">Preço atual</span>
              <strong>{{ moeda(produto.preco_atual ?? produto.preco) }}</strong>
              <span v-if="produto.em_promocao" class="catalog-promo">
                <s>{{ moeda(produto.preco) }}</s> <em>Oferta</em>
              </span>
            </div>

            <div class="catalog-cell catalog-cell--stock">
              <span class="catalog-cell__label">Estoque</span>
              <strong :class="{ 'is-empty': Number(produto.estoque) === 0 }">
                {{ produto.estoque ?? "—" }}
                <small>{{
                  Number(produto.estoque) === 1 ? "unidade" : "unidades"
                }}</small>
              </strong>
              <span
                v-if="produto.estoque_baixo"
                class="catalog-stock-note"
                :class="{ 'is-empty': Number(produto.estoque) === 0 }"
                >{{
                  Number(produto.estoque) === 0
                    ? "Sem estoque"
                    : "Repor estoque"
                }}</span
              >
            </div>

            <div class="catalog-cell catalog-cell--status">
              <span class="catalog-cell__label">Situação</span>
              <span
                class="catalog-status"
                :class="{ 'is-inactive': !produto.ativo }"
              >
                <span class="catalog-status__dot" aria-hidden="true"></span>
                {{ produto.ativo ? "Ativo" : "Inativo" }}
              </span>
            </div>

            <div class="catalog-actions">
              <RouterLink
                class="catalog-action catalog-action--edit pp-card-action pp-admin-action--secondary"
                data-card-action-radius
                :to="{
                  name: 'admin-produto-editar',
                  params: { id: produto.id },
                }"
                :aria-label="`Editar ${produto.nome}`"
              >
                <CardActionContent
                  ><Pencil :size="15" aria-hidden="true" />
                  Editar</CardActionContent
                >
              </RouterLink>
              <button
                type="button"
                class="catalog-action pp-card-action"
                data-card-action-radius
                :class="
                  produto.ativo
                    ? 'catalog-action--inactive pp-admin-action--danger'
                    : 'pp-admin-action--secondary'
                "
                :disabled="alterando === produto.id"
                :aria-label="`${produto.ativo ? 'Desativar' : 'Ativar'} ${produto.nome}`"
                @click="alternarAtivo(produto)"
              >
                <CardActionContent>
                  <LoaderCircle
                    v-if="alterando === produto.id"
                    :size="15"
                    class="catalog-spin"
                    aria-hidden="true"
                  />
                  <Power v-else :size="15" aria-hidden="true" />
                  {{
                    alterando === produto.id
                      ? "Salvando…"
                      : produto.ativo
                        ? "Desativar"
                        : "Ativar"
                  }}
                </CardActionContent>
              </button>
            </div>
          </li>
        </ul>
      </template>

      <footer
        v-if="inicializado && paginaDados.count > 0"
        class="catalog-pagination"
      >
        <span
          >Exibindo {{ inicioExibido }}–{{ fimExibido }} de
          {{ paginaDados.count }}</span
        >
        <div>
          <button
            type="button"
            :disabled="paginaAtual <= 1 || consultando"
            @click="mudarPagina(-1)"
          >
            <ChevronLeft :size="16" aria-hidden="true" /> Anterior
          </button>
          <span
            >Página {{ paginaDados.page }} de
            {{ paginaDados.total_pages }}</span
          >
          <button
            type="button"
            :disabled="!paginaDados.next || consultando"
            @click="mudarPagina(1)"
          >
            Próxima <ChevronRight :size="16" aria-hidden="true" />
          </button>
        </div>
      </footer>
    </section>
  </section>
</template>

<script setup>
import {
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  LoaderCircle,
  PackageOpen,
  Pencil,
  Plus,
  Power,
  Search,
  X,
} from "lucide-vue-next";
import AdminCatalogSelect from "@/components/admin/AdminCatalogSelect.vue";
import AdminRemoteCategorySelect from "@/components/admin/AdminRemoteCategorySelect.vue";
import CardActionContent from "@/components/ui/CardActionContent.vue";
import ProductImage from "@/components/catalog/ProductImage.vue";
import { useAdminProdutos } from "@/composables/useAdminProdutos";

const {
  alterando,
  alternarAtivo,
  busca,
  categoria,
  consultando,
  erro,
  filtrosAtivos,
  fimExibido,
  inicializado,
  inicioExibido,
  limparFiltros,
  metricas,
  moeda,
  mudarPagina,
  opcoesSituacao,
  paginaAtual,
  paginaDados,
  resumo,
  situacao,
  tentarNovamente,
} = useAdminProdutos();
</script>

<style scoped src="./AdminProdutosView.css"></style>
