<template>
  <div class="pp-field">
    <label v-if="label" :for="id" class="pp-field__label">{{ label }}</label>

    <div class="pp-field__control" :class="{ 'pp-field__control--error': error }">
      <component :is="icon" v-if="icon" class="pp-field__icon" :size="20" />

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
        <component :is="mostrarSenha ? EyeOff : Eye" :size="20" />
      </button>
    </div>

    <transition name="slide-fade">
      <p v-if="error" class="pp-field__error">{{ error }}</p>
    </transition>
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
  margin-bottom: var(--pp-space-2);
}

.pp-field__label {
  display: block;
  font-size: 14px;
  font-weight: 600;
  color: var(--pp-cream-dim);
  margin-bottom: 6px; /* Aproximado ao input */
  letter-spacing: 0.01em;
}

.pp-field__control {
  display: flex;
  align-items: center;
  gap: var(--pp-space-2);
  background: var(--pp-bg-input);
  border: 1.5px solid var(--pp-border-input); /* Borda menos avermelhada */
  border-radius: var(--pp-radius-input);
  padding: 0 var(--pp-space-3);
  height: 52px; /* Altura exata */
  transition: all 250ms ease;
}

.pp-field__control:hover {
  border-color: var(--pp-cream-faint);
}

.pp-field__control:focus-within {
  border-color: var(--pp-gold);
  box-shadow: 0 0 0 3px var(--pp-gold-soft);
}

.pp-field__control--error {
  border-color: var(--pp-error);
  box-shadow: 0 0 0 3px var(--pp-error-bg);
}

.pp-field__icon {
  color: var(--pp-cream-faint);
  flex-shrink: 0;
  transition: color 250ms ease;
}

.pp-field__control:focus-within .pp-field__icon {
  color: var(--pp-gold);
}

.pp-field__input {
  flex: 1;
  background: transparent;
  border: none;
  outline: none;
  color: var(--pp-cream);
  font-family: var(--pp-font-body);
  font-size: 16px;
  padding: 0;
  min-width: 0;
  font-weight: 400;
}

.pp-field__input::placeholder {
  color: var(--pp-cream-faint);
  opacity: 0.8;
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
  transition: color 250ms ease;
}

.pp-field__toggle:hover {
  color: var(--pp-cream);
}

.pp-field__error {
  color: var(--pp-error);
  font-size: 12px;
  margin: 6px 2px 0;
  font-weight: 500;
}

.slide-fade-enter-active { transition: all 250ms ease-out; }
.slide-fade-leave-active { transition: all 250ms ease-in; }
.slide-fade-enter-from { transform: translateY(-4px); opacity: 0; }
.slide-fade-leave-to { transform: translateY(4px); opacity: 0; }
.pp-field__input:-webkit-autofill,
.pp-field__input:-webkit-autofill:hover,
.pp-field__input:-webkit-autofill:focus {
  -webkit-text-fill-color: var(--pp-cream);
  -webkit-box-shadow: 0 0 0 1000px var(--pp-bg-input) inset !important;
  transition: background-color 5000s ease-in-out 0s;
}

.pp-field__input:autofill {
  -webkit-text-fill-color: var(--pp-cream);
  box-shadow: 0 0 0 1000px var(--pp-bg-input) inset !important;
  transition: background-color 5000s ease-in-out 0s;
}
</style>