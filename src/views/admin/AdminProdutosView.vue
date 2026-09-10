<template>
  <section class="admin-page">
    <header class="admin-page-header">
      <div>
        <h1 class="admin-page-title">Produtos</h1>
        <p class="admin-page-subtitle">
          Gerencie preços, estoque, disponibilidade e informações do cardápio.
        </p>
      </div>
      <div class="admin-actions">
        <button class="admin-btn" :disabled="carregando" @click="carregar">
          <RefreshCw :size="16" :class="{ 'admin-spin': carregando }" />
          Atualizar
        </button>
        <RouterLink
          :to="{ name: 'admin-produto-novo' }"
          class="admin-btn admin-btn--primary"
          ><Plus :size="16" />Novo produto</RouterLink
        >
      </div>
    </header>

    <div class="admin-kpis products-kpis">
      <article class="admin-kpi">
        <span class="admin-kpi-label">Total de produtos</span
        ><strong class="admin-kpi-value">{{ produtos.length }}</strong
        ><span class="admin-kpi-caption">Itens cadastrados</span>
      </article>
      <article class="admin-kpi">
        <span class="admin-kpi-label">Ativos</span
        ><strong class="admin-kpi-value">{{ ativos }}</strong
        ><span class="admin-kpi-caption">Visíveis no cardápio</span>
      </article>
      <article class="admin-kpi">
        <span class="admin-kpi-label">Sem estoque</span
        ><strong class="admin-kpi-value">{{ semEstoque }}</strong
        ><span class="admin-kpi-caption">Precisam de reposição</span>
      </article>
      <article class="admin-kpi">
        <span class="admin-kpi-label">Em promoção</span
        ><strong class="admin-kpi-value">{{ emPromocao }}</strong
        ><span class="admin-kpi-caption">Com preço promocional ativo</span>
      </article>
    </div>

    <div class="admin-toolbar">
      <label class="admin-search"
        ><Search :size="16" /><input
          v-model="busca"
          placeholder="Buscar por nome ou código"
      /></label>
      <select v-model="categoria" class="admin-select">
        <option value="">Todas as categorias</option>
        <option v-for="c in categorias" :key="c.id" :value="String(c.id)">
          {{ c.nome }}
        </option>
      </select>
      <select v-model="situacao" class="admin-select">
        <option value="">Todas as situações</option>
        <option value="ativo">Ativos</option>
        <option value="inativo">Inativos</option>
        <option value="sem-estoque">Sem estoque</option>
      </select>
    </div>

    <div v-if="erro" class="admin-alert admin-alert--error">
      <CircleAlert :size="17" />{{ erro }}
    </div>
    <div v-if="carregando && !produtos.length" class="admin-loading">
      Carregando produtos...
    </div>
    <div v-else-if="!filtrados.length" class="admin-card admin-empty">
      <Boxes :size="28" /><strong>Nenhum produto encontrado</strong>
    </div>

    <div v-else class="admin-table-wrap">
      <table class="admin-table products-table">
        <thead>
          <tr>
            <th>Produto</th>
            <th>Categoria</th>
            <th>Preço</th>
            <th>Estoque</th>
            <th>Situação</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="p in filtrados" :key="p.id">
            <td>
              <div class="product-cell">
                <ProductImage :produto="p" class="product-cell__image" />
                <div>
                  <strong>{{ p.nome }}</strong
                  ><small>{{ p.codigo }}</small>
                </div>
              </div>
            </td>
            <td>{{ p.categoria_nome || categoriaNome(p.categoria) }}</td>
            <td>
              <strong>{{ moeda(p.preco_atual ?? p.preco) }}</strong
              ><small v-if="p.em_promocao">De {{ moeda(p.preco) }}</small>
            </td>
            <td>
              <strong :class="{ 'stock-zero': Number(p.estoque) === 0 }">{{
                p.estoque ?? "—"
              }}</strong
              ><small>{{
                Number(p.estoque) === 1 ? "unidade" : "unidades"
              }}</small>
            </td>
            <td>
              <span
                class="admin-badge"
                :class="
                  p.ativo ? 'admin-badge--success' : 'admin-badge--neutral'
                "
                >{{ p.ativo ? "Ativo" : "Inativo" }}</span
              >
            </td>
            <td>
              <div class="product-actions">
                <button
                  type="button"
                  class="admin-btn admin-btn--sm"
                  :disabled="alterando === p.id"
                  @click="alternarAtivo(p)"
                >
                  <Power :size="14" />{{ p.ativo ? "Desativar" : "Ativar" }}
                </button>
                <RouterLink
                  :to="{ name: 'admin-produto-editar', params: { id: p.id } }"
                  class="admin-btn admin-btn--sm"
                  ><Pencil :size="14" />Editar</RouterLink
                >
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>

<script setup>
import { computed, onMounted, ref } from "vue";
import {
  Boxes,
  CircleAlert,
  Pencil,
  Plus,
  Power,
  RefreshCw,
  Search,
} from "lucide-vue-next";
import ProductImage from "@/components/catalog/ProductImage.vue";
import adminService from "@/services/admin.service";

const produtos = ref([]);
const categorias = ref([]);
const carregando = ref(false);
const erro = ref("");
const busca = ref("");
const categoria = ref("");
const situacao = ref("");
const alterando = ref(null);

const ativos = computed(() => produtos.value.filter((p) => p.ativo).length);
const semEstoque = computed(
  () => produtos.value.filter((p) => Number(p.estoque) === 0).length,
);
const emPromocao = computed(
  () => produtos.value.filter((p) => p.em_promocao).length,
);
const filtrados = computed(() => {
  const q = busca.value.trim().toLowerCase();
  return produtos.value
    .filter((p) => {
      if (categoria.value && String(p.categoria) !== categoria.value)
        return false;
      if (situacao.value === "ativo" && !p.ativo) return false;
      if (situacao.value === "inativo" && p.ativo) return false;
      if (situacao.value === "sem-estoque" && Number(p.estoque) !== 0)
        return false;
      return (
        !q ||
        String(p.nome).toLowerCase().includes(q) ||
        String(p.codigo || "")
          .toLowerCase()
          .includes(q)
      );
    })
    .sort((a, b) => String(a.nome).localeCompare(String(b.nome), "pt-BR"));
});

function moeda(v) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(Number(v || 0));
}
function categoriaNome(id) {
  return (
    categorias.value.find((c) => Number(c.id) === Number(id))?.nome ||
    "Sem categoria"
  );
}

async function carregar() {
  carregando.value = true;
  erro.value = "";
  try {
    const [lista, cats] = await Promise.all([
      adminService.listarProdutos(),
      adminService.listarCategorias(),
    ]);
    categorias.value = cats;
    produtos.value = await Promise.all(
      lista.map(async (p) => {
        try {
          return { ...p, ...(await adminService.obterProduto(p.id)) };
        } catch {
          return p;
        }
      }),
    );
  } catch {
    erro.value = "Não foi possível carregar os produtos.";
  } finally {
    carregando.value = false;
  }
}

async function alternarAtivo(p) {
  alterando.value = p.id;
  erro.value = "";
  try {
    await adminService.atualizarProduto(p.id, { ativo: !p.ativo });
    p.ativo = !p.ativo;
  } catch {
    erro.value = "Não foi possível alterar a disponibilidade do produto.";
  } finally {
    alterando.value = null;
  }
}

onMounted(carregar);
</script>

<style scoped>
.products-table {
  min-width: 900px;
}
.product-cell {
  display: flex;
  align-items: center;
  gap: 11px;
  min-width: 230px;
}
.product-cell__image {
  width: 48px !important;
  height: 48px !important;
  min-width: 48px;
  border-radius: 8px !important;
  overflow: hidden;
}
.product-actions {
  display: flex;
  justify-content: flex-end;
  gap: 6px;
  min-width: 190px;
}
.stock-zero {
  color: var(--admin-danger) !important;
}
</style>
