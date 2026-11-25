<template>
  <section class="admin-page promotions-page">
    <header class="promotions-header">
      <div>
        <h1>Promoções</h1>
        <p>Organize ofertas e períodos especiais do cardápio em um só lugar.</p>
      </div>
      <button
        ref="novaRef"
        type="button"
        class="promotions-create pp-card-action pp-admin-action--primary"
        data-card-action-radius
        @click="abrirNovo"
      >
        <CardActionContent
          ><Plus :size="17" aria-hidden="true" /> Nova
          promoção</CardActionContent
        >
      </button>
    </header>

    <section class="promotions-metrics" aria-label="Resumo das promoções">
      <div
        v-for="metrica in metricas"
        :key="metrica.campo"
        class="promotions-metric"
      >
        <span>{{ metrica.label }}</span>
        <strong>{{ store.resumo ? indicadores[metrica.campo] : "—" }}</strong>
        <small>{{ metrica.descricao }}</small>
      </div>
    </section>

    <section class="promotions-panel" aria-labelledby="promotions-list-title">
      <header class="promotions-panel-header">
        <h2 id="promotions-list-title">Ofertas cadastradas</h2>
        <p>
          {{
            store.inicializado
              ? store.pagina.count +
                (store.pagina.count === 1
                  ? " promoção encontrada"
                  : " promoções encontradas")
              : "Acompanhe ofertas em andamento, futuras e encerradas."
          }}
        </p>
      </header>
      <div class="promotions-toolbar">
        <div class="promotions-search" role="search">
          <Search :size="17" aria-hidden="true" />
          <input
            v-model="busca"
            type="search"
            maxlength="100"
            autocomplete="off"
            placeholder="Buscar promoção pelo produto"
            aria-label="Buscar promoção pelo nome do produto"
          />
          <button
            v-if="busca"
            type="button"
            class="promotions-clear"
            aria-label="Limpar busca"
            @click="busca = ''"
          >
            <X :size="16" aria-hidden="true" />
          </button>
        </div>
        <AdminCatalogSelect
          v-model="situacao"
          class="promotions-filter"
          aria-label="Filtrar promoções por situação"
          :options="opcoesSituacao"
        />
      </div>

      <div v-if="store.erro" class="promotions-alert" role="alert">
        <CircleAlert :size="18" aria-hidden="true" />
        <span>{{ store.erro }}</span>
        <button type="button" @click="atualizarAgora">Tentar novamente</button>
      </div>
      <div v-if="sucesso" class="promotions-success" role="status">
        <CheckCircle2 :size="17" aria-hidden="true" />{{ sucesso }}
      </div>

      <div
        v-if="!store.inicializado && !store.erro"
        class="promotions-empty"
        role="status"
      >
        <LoaderCircle :size="22" class="promotions-spin" aria-hidden="true" />
        Carregando promoções…
      </div>
      <div
        v-else-if="store.inicializado && !store.resumo?.total"
        class="promotions-empty"
      >
        <Tags :size="30" aria-hidden="true" />
        <strong>Nenhuma promoção cadastrada</strong>
        <span>Crie uma oferta para destacar um produto por um período.</span>
        <button type="button" @click="abrirNovo">Criar promoção</button>
      </div>
      <div
        v-else-if="store.inicializado && !store.pagina.count"
        class="promotions-empty"
      >
        <SearchX :size="29" aria-hidden="true" />
        <strong>Nenhuma promoção encontrada</strong>
        <span>Experimente buscar outro produto ou mudar o filtro.</span>
        <button type="button" @click="limparFiltros">Limpar filtros</button>
      </div>

      <template v-if="store.inicializado && visiveis.length">
        <div class="promotions-columns" aria-hidden="true">
          <span>Produto</span><span>Preço especial</span><span>Vigência</span
          ><span>Situação</span>
          <span class="promotions-actions-head">Ações</span>
        </div>
        <ul class="promotions-list">
          <li
            v-for="promocao in visiveis"
            :key="promocao.id"
            class="promotions-row"
          >
            <div class="promotions-product">
              <span class="promotions-product-icon" aria-hidden="true"
                ><Tag :size="20"
              /></span>
              <div>
                <strong>{{
                  promocao.produto_nome || "Produto não identificado"
                }}</strong>
              </div>
            </div>
            <div class="promotions-price">
              <span class="promotions-mobile-label">Preço especial</span>
              <strong>{{ moeda(promocao.preco_promocional) }}</strong>
            </div>
            <div class="promotions-period">
              <span class="promotions-mobile-label">Vigência</span>
              <span
                ><CalendarDays :size="14" aria-hidden="true" />
                {{ dataCivil(promocao.data_inicio) }} até
                {{ dataCivil(promocao.data_fim) }}</span
              >
            </div>
            <div class="promotions-situation">
              <span class="promotions-mobile-label">Situação</span>
              <span
                class="promotions-badge"
                :class="'promotions-badge--' + estadoPromocao(promocao, hoje)"
              >
                <span aria-hidden="true" class="promotions-dot"></span>
                {{ rotuloEstado(estadoPromocao(promocao, hoje)) }}
              </span>
            </div>
            <div class="promotions-actions">
              <button
                type="button"
                class="promotions-action pp-card-action pp-admin-action--secondary"
                data-card-action-radius
                :aria-label="'Editar promoção de ' + promocao.produto_nome"
                @click="abrirEdicao(promocao, $event)"
              >
                <CardActionContent
                  ><Pencil
                    :size="15"
                    aria-hidden="true"
                  />Editar</CardActionContent
                >
              </button>
              <button
                type="button"
                class="promotions-action promotions-action--danger pp-card-action pp-admin-action--danger"
                data-card-action-radius
                :aria-label="'Excluir promoção de ' + promocao.produto_nome"
                @click="abrirExclusao(promocao, $event)"
              >
                <CardActionContent
                  ><Trash2
                    :size="15"
                    aria-hidden="true"
                  />Excluir</CardActionContent
                >
              </button>
            </div>
          </li>
        </ul>
      </template>
      <footer
        v-if="store.inicializado && store.pagina.count"
        class="promotions-footer"
      >
        <span
          >Exibindo {{ primeiraExibida }}–{{ ultimaExibida }} de
          {{ store.pagina.count }}</span
        >
        <div v-if="totalPaginas > 1" class="promotions-pagination">
          <button
            type="button"
            :disabled="
              store.pagina.page <= 1 || store.carregando || Boolean(store.erro)
            "
            @click="mudarPagina(-1)"
          >
            <ChevronLeft :size="16" aria-hidden="true" /> Anterior
          </button>
          <span>Página {{ store.pagina.page }} de {{ totalPaginas }}</span>
          <button
            type="button"
            :disabled="
              store.pagina.page >= totalPaginas ||
              store.carregando ||
              Boolean(store.erro)
            "
            @click="mudarPagina(1)"
          >
            Próxima <ChevronRight :size="16" aria-hidden="true" />
          </button>
        </div>
      </footer>
    </section>

    <AdminPromocaoFormulario />

    <AdminPromocaoExclusao />
  </section>
</template>

<script setup>
import { provide } from "vue";
import {
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  LoaderCircle,
  Pencil,
  Plus,
  Search,
  SearchX,
  Tag,
  Tags,
  Trash2,
  X,
} from "lucide-vue-next";
import AdminCatalogSelect from "@/components/admin/AdminCatalogSelect.vue";
import CardActionContent from "@/components/ui/CardActionContent.vue";
import AdminPromocaoExclusao from "@/components/admin/AdminPromocaoExclusao.vue";
import AdminPromocaoFormulario from "@/components/admin/AdminPromocaoFormulario.vue";
import { useAdminPromocoes } from "@/composables/useAdminPromocoes";

const promocoes = useAdminPromocoes();
provide("adminPromocoes", promocoes);
const {
  abrirEdicao,
  abrirExclusao,
  abrirNovo,
  atualizarAgora,
  busca,
  dataCivil,
  hoje,
  indicadores,
  limparFiltros,
  metricas,
  moeda,
  mudarPagina,
  novaRef,
  opcoesSituacao,
  primeiraExibida,
  rotuloEstado,
  situacao,
  store,
  sucesso,
  totalPaginas,
  ultimaExibida,
  visiveis,
  estadoPromocao,
  ref,
} = promocoes;
</script>

<style scoped src="./AdminPromocoesView.css"></style>
