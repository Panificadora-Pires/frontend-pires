<script setup>
import { inject } from "vue";
import {
  Check,
  CheckCircle2,
  CircleAlert,
  Info,
  LoaderCircle,
  Search,
  X,
} from "lucide-vue-next";

import CardActionContent from "@/components/ui/CardActionContent.vue";

const {
  agendarBuscaProduto,
  aoCancelarFormulario,
  aoClicarForaFormulario,
  aoFecharFormulario,
  buscaProduto,
  buscaProdutoRef,
  buscarProdutoAoEnter,
  buscarProdutos,
  carregandoProdutos,
  erroFormulario,
  erroProdutos,
  escolherProduto,
  fecharFormulario,
  form,
  formDialog,
  moeda,
  paginaProdutos,
  produtoSelecionado,
  salvando,
  salvar,
  ref,
} = inject("adminPromocoes");
</script>

<template>
  <dialog
    ref="formDialog"
    class="promotions-dialog"
    aria-labelledby="promotions-dialog-title"
    @cancel="aoCancelarFormulario"
    @close="aoFecharFormulario"
    @click="aoClicarForaFormulario"
  >
    <form class="promotions-dialog-panel" @submit.prevent="salvar">
      <header class="promotions-dialog-header">
        <div>
          <span>OFERTAS DO CARDÁPIO</span>
          <h2 id="promotions-dialog-title">
            {{ form.id ? "Editar promoção" : "Nova promoção" }}
          </h2>
          <p>Escolha um produto, o preço especial e o período da oferta.</p>
        </div>
        <button
          type="button"
          class="promotions-close"
          :disabled="salvando"
          aria-label="Fechar formulário"
          @click="fecharFormulario"
        >
          <X :size="19" aria-hidden="true" />
        </button>
      </header>
      <div class="promotions-form-body">
        <div class="promotions-field">
          <label for="promotion-product-search"
            >Produto da promoção <em>*</em></label
          >
          <div
            v-if="produtoSelecionado"
            class="promotions-selected"
            role="status"
          >
            <div>
              <strong>{{ produtoSelecionado.nome }}</strong>
              <small>
                {{
                  produtoSelecionado.preco != null
                    ? "Preço normal: " + moeda(produtoSelecionado.preco)
                    : "Produto selecionado"
                }}
                <span v-if="produtoSelecionado.ativo === false">
                  · Inativo</span
                >
              </small>
            </div>
            <CheckCircle2 :size="20" aria-hidden="true" />
          </div>
          <div class="promotions-product-search">
            <Search :size="16" aria-hidden="true" />
            <input
              id="promotion-product-search"
              ref="buscaProdutoRef"
              v-model="buscaProduto"
              type="search"
              maxlength="100"
              autocomplete="off"
              placeholder="Buscar produto pelo nome ou código"
              @input="agendarBuscaProduto"
              @keydown.enter.prevent="buscarProdutoAoEnter"
            />
          </div>
          <div
            v-if="erroProdutos"
            class="promotions-product-error"
            role="alert"
          >
            {{ erroProdutos }}
            <button type="button" @click="buscarProdutos(false)">
              Tentar novamente
            </button>
          </div>
          <div
            v-else-if="carregandoProdutos"
            class="promotions-product-loading"
            role="status"
          >
            <LoaderCircle
              :size="16"
              class="promotions-spin"
              aria-hidden="true"
            />
            Buscando produtos…
          </div>
          <div
            v-else-if="!paginaProdutos.results.length"
            class="promotions-product-loading"
          >
            Nenhum produto encontrado. Experimente outro termo.
          </div>
          <div
            v-else
            class="promotions-product-results"
            role="group"
            aria-label="Produtos encontrados"
          >
            <button
              v-for="produto in paginaProdutos.results"
              :key="produto.id"
              type="button"
              :aria-pressed="Number(form.produto) === Number(produto.id)"
              @click="escolherProduto(produto)"
            >
              <span
                ><strong>{{ produto.nome }}</strong
                ><small
                  >{{ moeda(produto.preco)
                  }}<span v-if="!produto.ativo"> · Inativo</span></small
                ></span
              >
              <Check
                v-if="Number(form.produto) === Number(produto.id)"
                :size="17"
                aria-hidden="true"
              />
            </button>
          </div>
          <button
            v-if="paginaProdutos.next && !carregandoProdutos && !erroProdutos"
            type="button"
            class="promotions-more"
            @click="buscarProdutos(true)"
          >
            Mostrar mais produtos
          </button>
          <small>Não encontrou o produto? Busque pelo nome ou código.</small>
        </div>

        <label class="promotions-field">
          <span>Preço promocional (R$) <em>*</em></span>
          <input
            v-model="form.preco_promocional"
            type="number"
            inputmode="decimal"
            min="0.01"
            step="0.01"
            required
            placeholder="0,00"
          />
          <small>O valor deve ser menor que o preço normal do produto.</small>
        </label>
        <div class="promotions-date-grid">
          <label class="promotions-field">
            <span>Data inicial <em>*</em></span>
            <input v-model="form.data_inicio" type="date" required />
          </label>
          <label class="promotions-field">
            <span>Data final <em>*</em></span>
            <input
              v-model="form.data_fim"
              type="date"
              required
              :min="form.data_inicio || undefined"
            />
          </label>
        </div>
        <div class="promotions-date-note">
          <Info :size="16" aria-hidden="true" />
          A promoção inclui as datas de início e fim.
        </div>
        <p v-if="erroFormulario" class="promotions-form-error" role="alert">
          <CircleAlert :size="16" aria-hidden="true" />{{ erroFormulario }}
        </p>
      </div>
      <footer class="promotions-dialog-actions">
        <button
          type="button"
          class="promotions-cancel pp-card-action pp-admin-action--cancel"
          data-card-action-radius
          :disabled="salvando"
          @click="fecharFormulario"
        >
          <CardActionContent>Cancelar</CardActionContent>
        </button>
        <button
          type="submit"
          class="promotions-save pp-card-action pp-admin-action--primary"
          data-card-action-radius
          :disabled="salvando"
        >
          <CardActionContent>
            <LoaderCircle
              v-if="salvando"
              :size="16"
              class="promotions-spin"
              aria-hidden="true"
            />
            <Check v-else :size="16" aria-hidden="true" />
            {{
              salvando
                ? "Salvando…"
                : form.id
                  ? "Salvar alterações"
                  : "Criar promoção"
            }}
          </CardActionContent>
        </button>
      </footer>
    </form>
  </dialog>
</template>

<style scoped src="./AdminPromocaoFormulario.css"></style>
