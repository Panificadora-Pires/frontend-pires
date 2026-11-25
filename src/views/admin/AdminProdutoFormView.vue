<template>
  <section class="admin-page editor-page">
    <header class="editor-header">
      <div>
        <RouterLink :to="{ name: 'admin-produtos' }" class="editor-back">
          <ArrowLeft :size="16" aria-hidden="true" /> Voltar aos produtos
        </RouterLink>
        <h1>{{ editando ? "Editar produto" : "Novo produto" }}</h1>
        <p>
          {{
            editando
              ? "Atualize o que aparece no cardápio, mantendo os dados internos organizados."
              : "Adicione um produto ao cardápio da Pires."
          }}
        </p>
      </div>
    </header>

    <div
      v-if="erroCarregamento"
      class="admin-alert admin-alert--error editor-loading-error"
      role="alert"
    >
      <CircleAlert :size="18" aria-hidden="true" />
      <span>{{ erroCarregamento }}</span>
      <button type="button" class="editor-retry" @click="carregar">
        Tentar novamente
      </button>
    </div>
    <div v-if="carregandoDados" class="editor-loading" role="status">
      <LoaderCircle :size="24" class="editor-spin" aria-hidden="true" />
      Carregando informações…
    </div>

    <form
      v-if="!carregandoDados && !erroCarregamento"
      class="editor-layout"
      @submit.prevent="salvar"
    >
      <div class="editor-main">
        <section class="editor-panel">
          <header class="editor-panel__header">
            <div>
              <h2>Informações do produto</h2>
              <p>Dados que identificam este item para o cliente.</p>
            </div>
          </header>
          <div class="editor-fields">
            <label class="editor-field editor-field--full">
              <span>Nome do produto <em>*</em></span>
              <input
                v-model.trim="form.nome"
                required
                maxlength="255"
                placeholder="Ex.: Coxinha de frango"
              />
            </label>
            <div class="editor-field">
              <span>Categoria <em>*</em></span>
              <AdminRemoteCategorySelect
                v-model="form.categoria"
                aria-label="Selecionar categoria do produto"
                required
              />
            </div>
            <label class="editor-field">
              <span>Unidade de medida <em>*</em></span>
              <select v-model="form.unidade_medida" required>
                <option value="unidade">Unidade</option>
                <option value="kg">Quilo</option>
                <option value="g">Grama</option>
                <option value="l">Litro</option>
                <option value="ml">Mililitro</option>
              </select>
            </label>
            <label class="editor-field editor-field--full">
              <span>Descrição</span>
              <textarea
                v-model="form.descricao"
                rows="4"
                placeholder="Conte ao cliente o que torna este produto especial."
              ></textarea>
              <small>Texto exibido na página do produto e no cardápio.</small>
            </label>
          </div>
        </section>

        <section class="editor-panel">
          <header class="editor-panel__header">
            <div>
              <h2>Preço e estoque</h2>
              <p>Valores de venda e quantidades disponíveis para pedidos.</p>
            </div>
          </header>
          <div class="editor-fields">
            <label class="editor-field">
              <span>Preço de venda (R$) <em>*</em></span>
              <input
                v-model="form.preco"
                type="number"
                min="0.01"
                step="0.01"
                required
                placeholder="0,00"
              />
            </label>
            <label class="editor-field">
              <span>Preço de custo (R$)</span>
              <input
                v-model="form.preco_custo"
                type="number"
                min="0"
                step="0.01"
                placeholder="Opcional"
              />
              <small>Informação interna, nunca exibida ao cliente.</small>
            </label>
            <label class="editor-field">
              <span>Quantidade em estoque <em>*</em></span>
              <input
                v-model="form.estoque"
                type="number"
                min="0"
                step="1"
                required
              />
            </label>
            <label class="editor-field">
              <span>Estoque mínimo <em>*</em></span>
              <input
                v-model="form.estoque_minimo"
                type="number"
                min="0"
                step="1"
                required
              />
              <small
                >Usado para indicar quando é preciso repor o produto.</small
              >
            </label>
          </div>
        </section>
      </div>

      <aside class="editor-side">
        <section class="editor-panel">
          <header class="editor-panel__header">
            <div>
              <h2>Imagem do produto</h2>
              <p>Uma foto clara ajuda na escolha do cliente.</p>
            </div>
          </header>
          <div class="editor-image">
            <img
              v-if="preview"
              :src="preview"
              :alt="'Prévia de ' + (form.nome || 'produto')"
            />
            <div v-else class="editor-image__placeholder">
              <ImageIcon :size="30" aria-hidden="true" />
              <span>Nenhuma foto selecionada</span>
            </div>
            <label class="editor-upload">
              <Upload :size="16" aria-hidden="true" />
              {{ preview ? "Trocar imagem" : "Escolher imagem" }}
              <input
                type="file"
                accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                @change="selecionarImagem"
              />
            </label>
            <p class="editor-upload-note">JPG, PNG ou WebP · máximo de 5 MB</p>
            <p v-if="erroImagem" class="editor-image-error" role="alert">
              {{ erroImagem }}
            </p>
          </div>
        </section>

        <section class="editor-panel editor-visibility">
          <header class="editor-panel__header">
            <div>
              <h2>Visibilidade</h2>
              <p>Como este produto aparece no cardápio.</p>
            </div>
          </header>
          <label class="editor-toggle">
            <input v-model="form.ativo" type="checkbox" />
            <span
              ><strong>Produto ativo</strong
              ><small>Disponível no cardápio.</small></span
            >
          </label>
          <label class="editor-toggle">
            <input v-model="form.destaque" type="checkbox" />
            <span
              ><strong>Produto em destaque</strong
              ><small>Maior evidência nas vitrines do site.</small></span
            >
          </label>
        </section>

        <div v-if="erro" class="admin-alert admin-alert--error" role="alert">
          <CircleAlert :size="17" aria-hidden="true" />{{ erro }}
        </div>

        <div class="editor-actions">
          <RouterLink
            :to="{ name: 'admin-produtos' }"
            class="editor-cancel pp-card-action pp-admin-action--cancel"
            data-card-action-radius
          >
            <CardActionContent>Cancelar</CardActionContent>
          </RouterLink>
          <button
            type="submit"
            :disabled="salvando || Boolean(erroImagem)"
            class="editor-save pp-card-action pp-admin-action--primary"
            data-card-action-radius
          >
            <CardActionContent>
              <LoaderCircle
                v-if="salvando"
                :size="17"
                class="editor-spin"
                aria-hidden="true"
              />
              <Save v-else :size="17" aria-hidden="true" />
              {{
                salvando
                  ? "Salvando…"
                  : editando
                    ? "Salvar alterações"
                    : "Cadastrar produto"
              }}
            </CardActionContent>
          </button>
        </div>
      </aside>
    </form>
  </section>
</template>

<script setup>
import {
  ArrowLeft,
  CircleAlert,
  ImageIcon,
  LoaderCircle,
  Save,
  Upload,
} from "lucide-vue-next";
import CardActionContent from "@/components/ui/CardActionContent.vue";
import AdminRemoteCategorySelect from "@/components/admin/AdminRemoteCategorySelect.vue";
import { useAdminProdutoForm } from "@/composables/useAdminProdutoForm";

const {
  carregandoDados,
  carregar,
  editando,
  erro,
  erroCarregamento,
  erroImagem,
  form,
  imagem,
  preview,
  salvando,
  salvar,
  selecionarImagem,
} = useAdminProdutoForm();
</script>

<style scoped src="./AdminProdutoFormView.css"></style>
