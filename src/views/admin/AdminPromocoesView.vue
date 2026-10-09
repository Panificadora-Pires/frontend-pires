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
                  @click="abrirExclusao(p)"
                >
                  <Trash2 :size="14" />Excluir
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>


    <div
      v-if="promocaoParaExcluir"
      class="admin-modal"
      @click.self="fecharExclusao"
    >
      <div
        class="admin-modal-card promotion-delete-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="promotion-delete-title"
      >
        <div class="admin-modal-header">
          <div>
            <h2 id="promotion-delete-title">Excluir promoção</h2>
            <p class="promotion-delete-modal__subtitle">
              Esta ação remove a promoção cadastrada para
              <strong>{{ promocaoParaExcluir.produto_nome }}</strong>.
            </p>
          </div>
          <button
            type="button"
            class="admin-btn admin-btn--ghost admin-btn--sm"
            :disabled="excluindo"
            @click="fecharExclusao"
          >
            Fechar
          </button>
        </div>

        <div class="admin-modal-body promotion-delete-modal__body">
          <div class="promotion-delete-modal__icon">
            <CircleAlert :size="22" />
          </div>
          <div>
            <strong>Deseja realmente excluir esta promoção?</strong>
            <p>
              O produto continuará cadastrado normalmente, mas deixará de usar
              este preço promocional.
            </p>
          </div>
        </div>

        <div class="admin-modal-footer">
          <button
            type="button"
            class="admin-btn"
            :disabled="excluindo"
            @click="fecharExclusao"
          >
            Voltar
          </button>
          <button
            type="button"
            class="admin-btn admin-btn--danger"
            :disabled="excluindo"
            @click="confirmarExclusao"
          >
            <Trash2 :size="15" />
            {{ excluindo ? "Excluindo..." : "Excluir promoção" }}
          </button>
        </div>
      </div>
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
import adminService, { mensagemErroApi } from "@/services/admin.service";

const promocoes = ref([]);
const produtos = ref([]);
const erro = ref("");
const formAberto = ref(false);
const promocaoParaExcluir = ref(null);
const excluindo = ref(false);
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
    erro.value = mensagemErroApi(e, "Não foi possível salvar a promoção.");
  }
}
function abrirExclusao(p) {
  erro.value = "";
  promocaoParaExcluir.value = p;
}

function fecharExclusao() {
  if (excluindo.value) return;
  promocaoParaExcluir.value = null;
}

async function confirmarExclusao() {
  if (!promocaoParaExcluir.value) return;

  excluindo.value = true;
  erro.value = "";

  try {
    await adminService.excluirPromocao(promocaoParaExcluir.value.id);
    promocaoParaExcluir.value = null;
    await carregar();
  } catch (e) {
    erro.value = mensagemErroApi(e, "Não foi possível excluir a promoção.");
  } finally {
    excluindo.value = false;
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

.promotion-delete-modal {
  width: min(500px, calc(100vw - 32px));
}
.promotion-delete-modal__subtitle {
  margin: 5px 0 0;
  color: var(--admin-muted);
  font-size: 12px;
  line-height: 1.45;
}
.promotion-delete-modal__body {
  display: flex;
  align-items: flex-start;
  gap: 13px;
}
.promotion-delete-modal__body strong {
  display: block;
  color: var(--admin-text);
  font-size: 14px;
}
.promotion-delete-modal__body p {
  margin: 7px 0 0;
  color: var(--admin-text-soft);
  font-size: 12px;
  line-height: 1.55;
}
.promotion-delete-modal__icon {
  width: 38px;
  height: 38px;
  flex: 0 0 38px;
  display: grid;
  place-items: center;
  border-radius: 10px;
  background: #fef2f2;
  color: #b91c1c;
}

</style>
