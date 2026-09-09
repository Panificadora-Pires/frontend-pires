<template>
  <section class="admin-page">
    <header class="admin-page-header">
      <div>
        <h1 class="admin-page-title">Categorias</h1>
        <p class="admin-page-subtitle">Organize a estrutura do cardápio e a ordem de exibição das categorias.</p>
      </div>
      <div class="admin-actions"><button class="admin-btn admin-btn--primary" @click="novo"><Plus :size="16" />Nova categoria</button></div>
    </header>

    <div v-if="erro" class="admin-alert admin-alert--error"><CircleAlert :size="17" />{{ erro }}</div>

    <div v-if="!categorias.length" class="admin-card admin-empty"><Layers3 :size="28" /><strong>Nenhuma categoria cadastrada</strong></div>
    <div v-else class="admin-table-wrap">
      <table class="admin-table categories-table">
        <thead><tr><th>Categoria</th><th>Descrição</th><th>Ordem</th><th>Situação</th><th></th></tr></thead>
        <tbody>
          <tr v-for="c in categorias" :key="c.id">
            <td><strong>{{ c.nome }}</strong><small>{{ c.slug }}</small></td>
            <td>{{ c.descricao || '—' }}</td>
            <td>{{ c.ordem }}</td>
            <td><span class="admin-badge" :class="c.ativa ? 'admin-badge--success' : 'admin-badge--neutral'">{{ c.ativa ? 'Ativa' : 'Inativa' }}</span></td>
            <td class="categories-table__action"><button class="admin-btn admin-btn--sm" @click="editar(c)"><Pencil :size="14" />Editar</button></td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-if="formAberto" class="admin-modal" @click.self="formAberto = false">
      <form class="admin-modal-card" @submit.prevent="salvar">
        <div class="admin-modal-header"><h2>{{ form.id ? 'Editar categoria' : 'Nova categoria' }}</h2><button type="button" class="admin-btn admin-btn--ghost admin-btn--sm" @click="formAberto = false">Fechar</button></div>
        <div class="admin-modal-body admin-form-grid">
          <label class="admin-field admin-field--full"><span class="admin-field-label">Nome</span><input v-model.trim="form.nome" required /></label>
          <label class="admin-field admin-field--full"><span class="admin-field-label">Descrição</span><input v-model.trim="form.descricao" /></label>
          <label class="admin-field"><span class="admin-field-label">Ordem de exibição</span><input v-model.number="form.ordem" type="number" min="0" /></label>
          <label class="category-check"><input v-model="form.ativa" type="checkbox" /><span><strong>Categoria ativa</strong><small>Permite exibir a categoria no cardápio.</small></span></label>
        </div>
        <div class="admin-modal-footer"><button type="button" class="admin-btn" @click="formAberto = false">Cancelar</button><button class="admin-btn admin-btn--primary" type="submit">Salvar</button></div>
      </form>
    </div>
  </section>
</template>

<script setup>
import { onMounted, reactive, ref } from 'vue'
import { CircleAlert, Layers3, Pencil, Plus } from 'lucide-vue-next'
import adminService from '@/services/admin.service'

const categorias = ref([])
const erro = ref('')
const formAberto = ref(false)
const form = reactive({ id: null, nome: '', descricao: '', ordem: 0, ativa: true })

function novo() { Object.assign(form, { id: null, nome: '', descricao: '', ordem: 0, ativa: true }); formAberto.value = true }
function editar(c) { Object.assign(form, c); formAberto.value = true }
async function carregar() { try { categorias.value = await adminService.listarCategorias() } catch { erro.value = 'Não foi possível carregar as categorias.' } }
async function salvar() {
  try {
    const payload = { nome: form.nome, descricao: form.descricao, ordem: form.ordem, ativa: form.ativa }
    if (form.id) await adminService.atualizarCategoria(form.id, payload)
    else await adminService.criarCategoria(payload)
    formAberto.value = false
    await carregar()
  } catch (e) {
    erro.value = e.response?.data?.detail || Object.values(e.response?.data || {})?.[0]?.[0] || 'Não foi possível salvar a categoria.'
  }
}
onMounted(carregar)
</script>

<style scoped>
.categories-table { min-width: 720px; }
.categories-table__action { text-align: right; }
.category-check { align-self: end; display: flex; align-items: flex-start; gap: 9px; padding: 8px 0; cursor: pointer; }
.category-check input { margin-top: 3px; }
.category-check strong,
.category-check small { display: block; }
.category-check strong { color: var(--admin-text); font-size: 12px; }
.category-check small { margin-top: 3px; color: var(--admin-muted); font-size: 11px; }
</style>
