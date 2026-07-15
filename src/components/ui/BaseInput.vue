<template>
  <div class="pp-field">
    <label v-if="label" :for="id" class="pp-field__label">{{ label }}</label>

    <div class="pp-field__control" :class="{ 'pp-field__control--error': error }">
      <component :is="icon" v-if="icon" class="pp-field__icon" :size="18" />

      <input
        :id="id"
        :type="tipoReal"
        :value="modelValue"
        :placeholder="placeholder"
        :autocomplete="autocomplete"
        class="pp-field__input"
        @input="$emit('update:modelValue', $event.target.value)"
        @blur="$emit('blur')"
      />

      <button
        v-if="type === 'password'"
        type="button"
        class="pp-field__toggle"
        :aria-label="mostrarSenha ? 'Ocultar senha' : 'Mostrar senha'"
        @click="mostrarSenha = !mostrarSenha"
      >
        <component :is="mostrarSenha ? EyeOff : Eye" :size="18" />
      </button>
    </div>

    <p v-if="error" class="pp-field__error">{{ error }}</p>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { Eye, EyeOff } from 'lucide-vue-next'

const props = defineProps({
  modelValue: { type: String, default: '' },
  label: { type: String, default: '' },
  type: { type: String, default: 'text' },
  placeholder: { type: String, default: '' },
  icon: { type: [Object, Function], default: null },
  error: { type: String, default: '' },
  autocomplete: { type: String, default: 'off' },
  id: { type: String, default: () => `field-${Math.random().toString(36).slice(2, 9)}` },
})

defineEmits(['update:modelValue', 'blur'])

const mostrarSenha = ref(false)
const tipoReal = computed(() => {
  if (props.type !== 'password') return props.type
  return mostrarSenha.value ? 'text' : 'password'
})
</script>

<style scoped>
.pp-field {
  margin-bottom: var(--pp-space-4);
}

.pp-field__label {
  display: block;
  font-size: 13px;
  font-weight: 600;
  color: var(--pp-cream);
  margin-bottom: var(--pp-space-2);
}

.pp-field__control {
  display: flex;
  align-items: center;
  gap: var(--pp-space-2);
  background: var(--pp-bg-input);
  border: 1.5px solid var(--pp-border);
  border-radius: var(--pp-radius-sm);
  padding: 0 var(--pp-space-3);
  transition: border-color 0.15s;
}

.pp-field__control:focus-within {
  border-color: var(--pp-gold);
}

.pp-field__control--error {
  border-color: var(--pp-error);
}

.pp-field__icon {
  color: var(--pp-cream-faint);
  flex-shrink: 0;
}

.pp-field__input {
  flex: 1;
  background: transparent;
  border: none;
  outline: none;
  color: var(--pp-cream);
  font-family: var(--pp-font-body);
  font-size: 14px;
  padding: 12px 0;
  min-width: 0;
}

.pp-field__input::placeholder {
  color: var(--pp-cream-faint);
}

.pp-field__toggle {
  background: none;
  border: none;
  color: var(--pp-cream-faint);
  cursor: pointer;
  display: flex;
  align-items: center;
  padding: 4px;
  flex-shrink: 0;
}

.pp-field__toggle:hover {
  color: var(--pp-cream);
}

.pp-field__error {
  color: var(--pp-error);
  font-size: 12.5px;
  margin: 6px 2px 0;
}
</style>
