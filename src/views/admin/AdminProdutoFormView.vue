<template>
  <section class="admin-page product-form-page">
    <header class="admin-page-header">
      <div>
        <RouterLink :to="{ name: 'admin-produtos' }" class="product-form__back"
          ><ArrowLeft :size="15" /> Produtos</RouterLink
        >
        <h1 class="admin-page-title">
          {{ editando ? "Editar produto" : "Novo produto" }}
        </h1>
        <p class="admin-page-subtitle">
          {{
            editando
              ? "Atualize as informações comerciais, estoque e disponibilidade."
              : "Cadastre um novo item para o cardápio."
          }}
        </p>
      </div>
    </header>

    <form class="product-form" @submit.prevent="salvar">
      <main class="admin-card product-form__main">
        <div class="admin-card-header">
          <h2 class="admin-card-title">Informações do produto</h2>
        </div>
        <div class="product-form__fields admin-form-grid">
          <label class="admin-field admin-field--full"
            ><span class="admin-field-label">Nome</span
            ><input
              v-model.trim="form.nome"
              required
              maxlength="255"
              placeholder="Ex.: Coxinha de frango"
          /></label>
          <label class="admin-field"
            ><span class="admin-field-label">Categoria</span
            ><select v-model="form.categoria" required>
              <option disabled value="">Selecione</option>
              <option v-for="c in categorias" :key="c.id" :value="c.id">
                {{ c.nome }}
              </option>
            </select></label
          >
          <label class="admin-field"
            ><span class="admin-field-label">Unidade de medida</span
            ><select v-model="form.unidade_medida" required>
              <option value="unidade">Unidade</option>
              <option value="kg">Quilo</option>
              <option value="g">Grama</option>
              <option value="l">Litro</option>
              <option value="ml">Mililitro</option>
            </select></label
          >
          <label class="admin-field admin-field--full"
            ><span class="admin-field-label">Descrição</span
            ><textarea
              v-model="form.descricao"
              rows="4"
              placeholder="Descrição exibida ao cliente"
            ></textarea>
          </label>
          <label class="admin-field"
            ><span class="admin-field-label">Preço de venda</span
            ><input
              v-model="form.preco"
              required
              type="number"
              min="0.01"
              step="0.01"
          /></label>
          <label class="admin-field"
            ><span class="admin-field-label">Preço de custo</span
            ><input
              v-model="form.preco_custo"
              type="number"
              min="0"
              step="0.01"
            /><small v-if="editando" class="admin-field-help"
              >Deixe vazio para manter o custo atual.</small
            ></label
          >
          <label class="admin-field"
            ><span class="admin-field-label">Estoque</span
            ><input
              v-model="form.estoque"
              required
              type="number"
              min="0"
              step="1"
          /></label>
          <label class="admin-field"
            ><span class="admin-field-label">Estoque mínimo</span
            ><input
              v-model="form.estoque_minimo"
              :required="!editando"
              type="number"
              min="0"
              step="1"
            /><small v-if="editando" class="admin-field-help"
              >Deixe vazio para manter o limite atual.</small
            ></label
          >
        </div>
      </main>

      <aside class="product-form__side">
        <section class="admin-card">
          <div class="admin-card-header">
            <h2 class="admin-card-title">Imagem</h2>
          </div>
          <div class="product-image-panel">
            <img v-if="preview" :src="preview" alt="Prévia do produto" />
            <div v-else class="product-image-panel__empty">
              <ImageIcon :size="30" /><span>Nenhuma imagem selecionada</span>
            </div>
            <label class="admin-btn product-image-panel__upload"
              ><Upload :size="16" />Escolher imagem<input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                @change="selecionarImagem"
            /></label>
          </div>
        </section>

        <section class="admin-card product-options">
          <label
            ><input v-model="form.ativo" type="checkbox" /><span
              ><strong>Produto ativo</strong
              ><small>Disponível para os clientes no cardápio.</small></span
            ></label
          >
          <label
            ><input v-model="form.destaque" type="checkbox" /><span
              ><strong>Produto em destaque</strong
              ><small
                >Pode receber maior evidência nas vitrines do site.</small
              ></span
            ></label
          >
        </section>

        <div v-if="erro" class="admin-alert admin-alert--error">
          <CircleAlert :size="17" />{{ erro }}
        </div>

        <div class="product-form__actions">
          <RouterLink :to="{ name: 'admin-produtos' }" class="admin-btn"
            >Cancelar</RouterLink
          >
          <button
            type="submit"
            class="admin-btn admin-btn--primary"
            :disabled="salvando"
          >
            <LoaderCircle v-if="salvando" :size="16" class="admin-spin" />
            <Save v-else :size="16" />
            {{ salvando ? "Salvando..." : "Salvar produto" }}
          </button>
        </div>
      </aside>
    </form>
  </section>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, reactive, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import {
  ArrowLeft,
  CircleAlert,
  ImageIcon,
  LoaderCircle,
  Save,
  Upload,
} from "lucide-vue-next";
import adminService from "@/services/admin.service";
import { resolverUrlMidia } from "@/services/catalog.service";

const route = useRoute();
const router = useRouter();
const categorias = ref([]);
const salvando = ref(false);
const erro = ref("");
const imagem = ref(null);
const previewTemporario = ref("");
const imagemAtual = ref("");
const editando = computed(() => Boolean(route.params.id));
const form = reactive({
  nome: "",
  descricao: "",
  categoria: "",
  unidade_medida: "unidade",
  preco: "",
  preco_custo: "",
  estoque: 0,
  estoque_minimo: 0,
  destaque: false,
  ativo: true,
});
const preview = computed(() => previewTemporario.value || imagemAtual.value);

function preencher(p) {
  form.nome = p.nome || "";
  form.descricao = p.descricao || "";
  form.categoria = p.categoria || "";
  form.unidade_medida = p.unidade_medida || "unidade";
  form.preco = p.preco || "";
  form.preco_custo = "";
  form.estoque = p.estoque ?? 0;
  form.estoque_minimo = p.estoque_minimo ?? "";
  form.destaque = Boolean(p.destaque);
  form.ativo = p.ativo !== false;
  imagemAtual.value = resolverUrlMidia(p.imagem);
}

function selecionarImagem(e) {
  const f = e.target.files?.[0] || null;
  imagem.value = f;
  if (previewTemporario.value) URL.revokeObjectURL(previewTemporario.value);
  previewTemporario.value = f ? URL.createObjectURL(f) : "";
}

function erroApi(e) {
  const d = e.response?.data;
  if (d && typeof d === "object") {
    for (const v of Object.values(d)) {
      if (Array.isArray(v) && v[0]) return String(v[0]);
      if (typeof v === "string") return v;
    }
  }
  return "Não foi possível salvar o produto.";
}

async function salvar() {
  salvando.value = true;
  erro.value = "";
  try {
    const payload = { ...form, imagem: imagem.value };
    if (editando.value)
      await adminService.atualizarProduto(route.params.id, payload);
    else await adminService.criarProduto(payload);
    await router.replace({ name: "admin-produtos" });
  } catch (e) {
    erro.value = erroApi(e);
  } finally {
    salvando.value = false;
  }
}

async function carregar() {
  try {
    categorias.value = await adminService.listarCategorias();
    if (editando.value)
      preencher(await adminService.obterProduto(route.params.id));
  } catch {
    erro.value =
      "Não foi possível carregar os dados necessários para o formulário.";
  }
}

onMounted(carregar);
onBeforeUnmount(() => {
  if (previewTemporario.value) URL.revokeObjectURL(previewTemporario.value);
});
</script>

<style scoped>
.product-form__back {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  margin-bottom: 10px;
  color: var(--admin-muted);
  font-size: 12px;
  font-weight: 650;
}
.product-form {
  display: grid;
  grid-template-columns: minmax(0, 1.55fr) minmax(300px, 0.65fr);
  gap: 14px;
}
.product-form__main {
  overflow: hidden;
}
.product-form__fields {
  padding: 18px;
}
.product-form__side {
  display: grid;
  align-content: start;
  gap: 14px;
}
.product-image-panel {
  padding: 16px;
}
.product-image-panel > img,
.product-image-panel__empty {
  width: 100%;
  height: 210px;
  border-radius: 10px;
  object-fit: cover;
  background: #f5f5f4;
}
.product-image-panel__empty {
  display: grid;
  place-items: center;
  align-content: center;
  gap: 8px;
  color: var(--admin-muted);
  font-size: 12px;
}
.product-image-panel__upload {
  width: 100%;
  margin-top: 10px;
}
.product-image-panel__upload input {
  display: none;
}
.product-options {
  padding: 6px 16px;
}
.product-options label {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 13px 0;
  border-bottom: 1px solid #efeeec;
  cursor: pointer;
}
.product-options label:last-child {
  border-bottom: 0;
}
.product-options input {
  margin-top: 2px;
}
.product-options strong,
.product-options small {
  display: block;
}
.product-options strong {
  color: var(--admin-text);
  font-size: 12px;
}
.product-options small {
  margin-top: 3px;
  color: var(--admin-muted);
  font-size: 11px;
  line-height: 1.4;
}
.product-form__actions {
  display: grid;
  grid-template-columns: 1fr 1.4fr;
  gap: 8px;
}
@media (max-width: 900px) {
  .product-form {
    grid-template-columns: 1fr;
  }
}
</style>
