<template>
  <section class="admin-page categories-page">
    <header class="categories-header">
      <div>
        <h1>Categorias</h1>
        <p>Organize os grupos do cardápio e defina a ordem de exibição.</p>
      </div>
      <button
        type="button"
        class="categories-create pp-card-action pp-admin-action--primary"
        data-card-action-radius
        @click="abrirNovaCategoria"
      >
        <CardActionContent
          ><Plus :size="17" aria-hidden="true" /> Nova
          categoria</CardActionContent
        >
      </button>
    </header>

    <section class="categories-metrics" aria-label="Resumo das categorias">
      <div class="categories-metric">
        <span>Total de categorias</span>
        <strong>{{ inicializado ? indicadores.total : "—" }}</strong>
        <small>Grupos cadastrados</small>
      </div>
      <div class="categories-metric">
        <span>Ativas</span>
        <strong>{{ inicializado ? indicadores.ativas : "—" }}</strong>
        <small>Marcadas como disponíveis</small>
      </div>
      <div class="categories-metric">
        <span>Inativas</span>
        <strong>{{ inicializado ? indicadores.inativas : "—" }}</strong>
        <small>Desativadas no cadastro</small>
      </div>
    </section>

    <section class="categories-panel" aria-labelledby="categories-title">
      <header class="categories-panel-header">
        <div>
          <h2 id="categories-title">Estrutura do cardápio</h2>
          <p>
            {{
              inicializado
                ? dadosPagina.count +
                  (dadosPagina.count === 1
                    ? " categoria encontrada"
                    : " categorias encontradas")
                : "Organize a apresentação das categorias."
            }}
          </p>
        </div>
      </header>

      <div class="categories-toolbar">
        <div class="categories-search" role="search">
          <Search :size="17" aria-hidden="true" />
          <input
            v-model="busca"
            type="search"
            maxlength="100"
            aria-label="Buscar categorias"
            placeholder="Buscar por nome, descrição ou identificador"
          />
          <button
            v-if="busca"
            type="button"
            class="categories-clear"
            aria-label="Limpar busca"
            @click="busca = ''"
          >
            <X :size="16" aria-hidden="true" />
          </button>
        </div>
        <AdminCatalogSelect
          v-model="situacao"
          class="categories-filter"
          aria-label="Filtrar situação das categorias"
          :options="opcoesSituacao"
        />
      </div>

      <div v-if="erroExibido" class="categories-alert" role="alert">
        <CircleAlert :size="18" aria-hidden="true" />
        <span>{{ erroExibido }}</span>
        <button type="button" @click="atualizarAgora">Tentar novamente</button>
      </div>
      <div v-if="mensagemSucesso" class="categories-success" role="status">
        <CheckCircle2 :size="17" aria-hidden="true" />{{ mensagemSucesso }}
      </div>

      <div
        v-if="!inicializado && !erroExibido"
        class="categories-state"
        role="status"
        aria-live="polite"
      >
        <LoaderCircle :size="22" class="categories-spin" aria-hidden="true" />
        Carregando categorias…
      </div>
      <div
        v-else-if="inicializado && !indicadores.total"
        class="categories-state"
      >
        <Layers3 :size="28" aria-hidden="true" />
        <strong>Seu cardápio ainda não tem categorias</strong>
        <span>Crie uma categoria para começar a organizar os produtos.</span>
        <button
          type="button"
          class="categories-empty-action"
          @click="abrirNovaCategoria"
        >
          Criar categoria
        </button>
      </div>
      <div
        v-else-if="inicializado && !dadosPagina.count"
        class="categories-state"
      >
        <SearchX :size="28" aria-hidden="true" />
        <strong>Nenhuma categoria corresponde aos filtros</strong>
        <span>Experimente outra busca ou situação.</span>
        <button
          type="button"
          class="categories-empty-action"
          @click="limparFiltros"
        >
          Limpar filtros
        </button>
      </div>

      <template v-if="inicializado && visiveis.length">
        <div class="categories-columns" aria-hidden="true">
          <span>Categoria</span>
          <span>Ordem</span>
          <span>Situação</span>
          <span class="categories-actions-label">Ações</span>
        </div>
        <ul class="categories-list">
          <AdminCategoriaItem
            v-for="categoriaItem in visiveis"
            :key="categoriaItem.id"
            :categoria="categoriaItem"
            @editar="abrirEdicao"
          />
        </ul>
      </template>
      <AdminCategoriasPaginacao
        v-if="inicializado && indicadores.total"
        :dados-pagina="dadosPagina"
        :quantidade-visivel="visiveis.length"
        :bloqueado="carregando || Boolean(erroLeitura)"
        @mudar="mudarPagina"
      />
    </section>

    <dialog
      ref="dialogRef"
      class="categories-dialog"
      aria-labelledby="categories-dialog-title"
      @cancel="aoCancelarDialog"
      @close="aoFecharDialog"
    >
      <form class="categories-dialog-panel" @submit.prevent="salvar">
        <header class="categories-dialog-header">
          <div>
            <span>ORGANIZAÇÃO DO CARDÁPIO</span>
            <h2 id="categories-dialog-title">
              {{ form.id ? "Editar categoria" : "Nova categoria" }}
            </h2>
            <p>
              Configure como esta categoria aparece na organização do cardápio.
            </p>
          </div>
          <button
            type="button"
            class="categories-dialog-close"
            :disabled="salvando"
            aria-label="Fechar formulário"
            @click="fecharDialog"
          >
            <X :size="19" aria-hidden="true" />
          </button>
        </header>

        <div class="categories-dialog-body">
          <label class="categories-field">
            <span>Nome da categoria <em>*</em></span>
            <input
              ref="nomeRef"
              v-model.trim="form.nome"
              required
              maxlength="100"
              autocomplete="off"
              placeholder="Ex.: Salgados"
            />
          </label>
          <label class="categories-field">
            <span>Descrição</span>
            <textarea
              v-model.trim="form.descricao"
              maxlength="255"
              rows="3"
              placeholder="Descreva brevemente os produtos desta categoria."
            ></textarea>
            <small>Opcional. Até 255 caracteres.</small>
          </label>
          <label class="categories-field">
            <span>Ordem de exibição <em>*</em></span>
            <input
              v-model.number="form.ordem"
              type="number"
              required
              min="0"
              max="2147483647"
              step="1"
            />
            <small
              >Valores menores aparecem primeiro. Categorias com a mesma ordem
              são organizadas pelo nome.</small
            >
          </label>
          <label class="categories-visibility">
            <input v-model="form.ativa" type="checkbox" />
            <span
              ><strong>Categoria ativa</strong
              ><small
                >Controla a situação desta categoria no cardápio.</small
              ></span
            >
          </label>
          <p v-if="!form.ativa" class="categories-inactive-note">
            <Info :size="16" aria-hidden="true" />
            Você está marcando esta categoria como inativa. Os produtos
            vinculados continuam cadastrados.
          </p>
          <p v-if="erroSalvar" class="categories-form-error" role="alert">
            <CircleAlert :size="16" aria-hidden="true" /> {{ erroSalvar }}
          </p>
        </div>

        <footer class="categories-dialog-actions">
          <button
            type="button"
            class="categories-cancel pp-card-action pp-admin-action--cancel"
            data-card-action-radius
            :disabled="salvando"
            @click="fecharDialog"
          >
            <CardActionContent>Cancelar</CardActionContent>
          </button>
          <button
            type="submit"
            class="categories-save pp-card-action pp-admin-action--primary"
            data-card-action-radius
            :disabled="salvando"
          >
            <CardActionContent>
              <LoaderCircle
                v-if="salvando"
                :size="17"
                class="categories-spin"
                aria-hidden="true"
              />
              <Check v-else :size="17" aria-hidden="true" />
              {{
                salvando
                  ? "Salvando…"
                  : form.id
                    ? "Salvar alterações"
                    : "Criar categoria"
              }}
            </CardActionContent>
          </button>
        </footer>
      </form>
    </dialog>
  </section>
</template>

<script setup>
import AdminCategoriaItem from "@/components/admin/AdminCategoriaItem.vue";
import AdminCategoriasPaginacao from "@/components/admin/AdminCategoriasPaginacao.vue";
import {
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  Info,
  Layers3,
  LoaderCircle,
  Pencil,
  Plus,
  Search,
  SearchX,
  X,
} from "lucide-vue-next";
import AdminCatalogSelect from "@/components/admin/AdminCatalogSelect.vue";
import CardActionContent from "@/components/ui/CardActionContent.vue";
import { useAdminCategorias } from "@/composables/useAdminCategorias";

const {
  abrirEdicao,
  abrirNovaCategoria,
  aoCancelarDialog,
  aoFecharDialog,
  atualizarAgora,
  busca,
  carregando,
  dadosPagina,
  dialogRef,
  erroExibido,
  erroLeitura,
  erroSalvar,
  fecharDialog,
  form,
  indicadores,
  inicializado,
  limparFiltros,
  mensagemSucesso,
  mudarPagina,
  nomeRef,
  opcoesSituacao,
  salvando,
  salvar,
  situacao,
  visiveis,
  ref,
} = useAdminCategorias();
</script>

<style scoped src="./AdminCategoriasView.css"></style>
