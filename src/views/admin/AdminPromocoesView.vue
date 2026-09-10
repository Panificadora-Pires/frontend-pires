<template>
  <section class="admin-page">
    <header class="admin-page-header">
      <div>
        <h1 class="admin-page-title">Promoções</h1>
        <p class="admin-page-subtitle">
          Gerencie preços promocionais e períodos de vigência dos produtos.
        </p>
      </div>
      <div class="admin-actions">
        <button class="admin-btn admin-btn--primary" @click="novo">
          <Plus :size="16" />Nova promoção
        </button>
      </div>
    </header>

    <div v-if="erro" class="admin-alert admin-alert--error">
      <CircleAlert :size="17" />{{ erro }}
    </div>

    <div v-if="!promocoes.length" class="admin-card admin-empty">
      <Tags :size="28" /><strong>Nenhuma promoção cadastrada</strong>
    </div>
    <div v-else class="admin-table-wrap">
      <table class="admin-table promotions-table">
        <thead>
          <tr>
            <th>Produto</th>
            <th>Preço promocional</th>
            <th>Início</th>
            <th>Fim</th>
            <th>Situação</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="p in promocoes" :key="p.id">
            <td>
              <strong>{{ p.produto_nome }}</strong>
            </td>
            <td>
              <strong>{{ moeda(p.preco_promocional) }}</strong>
            </td>
            <td>{{ data(p.data_inicio) }}</td>
            <td>{{ data(p.data_fim) }}</td>
            <td>
              <span class="admin-badge" :class="badgeEstado(p)">{{
                estado(p)
              }}</span>
            </td>
            <td>
              <div class="promotion-actions">
                <button class="admin-btn admin-btn--sm" @click="editar(p)">
                  <Pencil :size="14" />Editar</button
                ><button
                  class="admin-btn admin-btn--sm admin-btn--danger"
                  @click="excluir(p)"
                >
                  <Trash2 :size="14" />Excluir
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-if="formAberto" class="admin-modal" @click.self="formAberto = false">
      <form class="admin-modal-card" @submit.prevent="salvar">
        <div class="admin-modal-header">
          <h2>{{ form.id ? "Editar promoção" : "Nova promoção" }}</h2>
          <button
            type="button"
            class="admin-btn admin-btn--ghost admin-btn--sm"
            @click="formAberto = false"
          >
            Fechar
          </button>
        </div>
        <div class="admin-modal-body admin-form-grid">
          <label class="admin-field admin-field--full"
            ><span class="admin-field-label">Produto</span
            ><select v-model="form.produto" required>
              <option value="" disabled>Selecione</option>
              <option v-for="p in produtos" :key="p.id" :value="p.id">
                {{ p.nome }}
              </option>
            </select></label
          >
          <label class="admin-field admin-field--full"
            ><span class="admin-field-label">Preço promocional</span
            ><input
              v-model="form.preco_promocional"
              type="number"
              min="0.01"
              step="0.01"
              required
          /></label>
          <label class="admin-field"
            ><span class="admin-field-label">Data inicial</span
            ><input v-model="form.data_inicio" type="date" required
          /></label>
          <label class="admin-field"
            ><span class="admin-field-label">Data final</span
            ><input v-model="form.data_fim" type="date" required
          /></label>
        </div>
        <div class="admin-modal-footer">
          <button type="button" class="admin-btn" @click="formAberto = false">
            Cancelar</button
          ><button class="admin-btn admin-btn--primary" type="submit">
            Salvar
          </button>
        </div>
      </form>
    </div>
  </section>
</template>

<script setup>
import { onMounted, reactive, ref } from "vue";
import { CircleAlert, Pencil, Plus, Tags, Trash2 } from "lucide-vue-next";
import adminService from "@/services/admin.service";

const promocoes = ref([]);
const produtos = ref([]);
const erro = ref("");
const formAberto = ref(false);
const form = reactive({
  id: null,
  produto: "",
  preco_promocional: "",
  data_inicio: "",
  data_fim: "",
});

function novo() {
  Object.assign(form, {
    id: null,
    produto: "",
    preco_promocional: "",
    data_inicio: "",
    data_fim: "",
  });
  formAberto.value = true;
}
function editar(p) {
  Object.assign(form, p);
  formAberto.value = true;
}
function moeda(v) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(Number(v || 0));
}
function data(v) {
  return v ? new Date(`${v}T12:00:00`).toLocaleDateString("pt-BR") : "—";
}
function estado(p) {
  const h = new Date().toISOString().slice(0, 10);
  return h < p.data_inicio
    ? "Agendada"
    : h > p.data_fim
      ? "Encerrada"
      : "Ativa";
}
function badgeEstado(p) {
  const e = estado(p);
  return e === "Ativa"
    ? "admin-badge--success"
    : e === "Agendada"
      ? "admin-badge--info"
      : "admin-badge--neutral";
}
async function carregar() {
  try {
    [promocoes.value, produtos.value] = await Promise.all([
      adminService.listarPromocoes(),
      adminService.listarProdutos({ ativo: true }),
    ]);
  } catch {
    erro.value = "Não foi possível carregar as promoções.";
  }
}
async function salvar() {
  try {
    const payload = {
      produto: form.produto,
      preco_promocional: form.preco_promocional,
      data_inicio: form.data_inicio,
      data_fim: form.data_fim,
    };
    if (form.id) await adminService.atualizarPromocao(form.id, payload);
    else await adminService.criarPromocao(payload);
    formAberto.value = false;
    await carregar();
  } catch (e) {
    const d = e.response?.data;
    erro.value =
      typeof d?.non_field_errors?.[0] === "string"
        ? d.non_field_errors[0]
        : typeof d?.detail === "string"
          ? d.detail
          : "Não foi possível salvar a promoção.";
  }
}
async function excluir(p) {
  if (!confirm(`Excluir a promoção de ${p.produto_nome}?`)) return;
  try {
    await adminService.excluirPromocao(p.id);
    await carregar();
  } catch {
    erro.value = "Não foi possível excluir a promoção.";
  }
}
onMounted(carregar);
</script>

<style scoped>
.promotions-table {
  min-width: 820px;
}
.promotion-actions {
  display: flex;
  justify-content: flex-end;
  gap: 6px;
  min-width: 160px;
}
</style>
