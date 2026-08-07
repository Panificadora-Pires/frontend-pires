<template>
  <div class="pp-field">
    <label v-if="label" :for="fieldId" class="pp-field__label">
      {{ label }}
    </label>

    <div
      class="pp-field__control"
      :class="{
        'pp-field__control--error': error,
        'pp-field__control--disabled': disabled,
      }"
    >
      <component
        :is="icon"
        v-if="icon"
        class="pp-field__icon"
        :size="20"
        aria-hidden="true"
      />

      <input
        v-bind="$attrs"
        :id="fieldId"
        :type="tipoReal"
        :value="modelValue"
        :placeholder="placeholder"
        :autocomplete="autocomplete"
        :disabled="disabled"
        :aria-invalid="Boolean(error)"
        :aria-describedby="error ? errorId : undefined"
        class="pp-field__input"
        @input="$emit('update:modelValue', $event.target.value)"
        @blur="$emit('blur')"
      />

      <button
        v-if="type === 'password'"
        type="button"
        class="pp-field__toggle"
        :disabled="disabled"
        :aria-label="mostrarSenha ? 'Ocultar senha' : 'Mostrar senha'"
        @click="mostrarSenha = !mostrarSenha"
      >
        <component :is="mostrarSenha ? EyeOff : Eye" :size="20" />
      </button>
    </div>

    <Transition name="slide-fade">
      <p v-if="error" :id="errorId" class="pp-field__error" role="alert">
        {{ error }}
      </p>
    </Transition>
  </div>
</template>

<script setup>
import { computed, ref, useId } from 'vue'
import { Eye, EyeOff } from 'lucide-vue-next'

defineOptions({ inheritAttrs: false })

const props = defineProps({
  modelValue: { type: String, default: '' },
  label: { type: String, default: '' },
  type: { type: String, default: 'text' },
  placeholder: { type: String, default: '' },
  icon: { type: [Object, Function], default: null },
  error: { type: String, default: '' },
  autocomplete: { type: String, default: 'off' },
  id: { type: String, default: '' },
  disabled: { type: Boolean, default: false },
})

defineEmits(['update:modelValue', 'blur'])

const generatedId = useId()
const mostrarSenha = ref(false)

const fieldId = computed(() => props.id || `pp-field-${generatedId}`)
const errorId = computed(() => `${fieldId.value}-error`)
const tipoReal = computed(() => {
  if (props.type !== 'password') return props.type
  return mostrarSenha.value ? 'text' : 'password'
})
</script>

<style scoped>
.pp-field {
  min-width: 0;
}

.pp-field__label {
  display: block;
  margin-bottom: 7px;
  color: var(--pp-cream);
  font-size: 13px;
  font-weight: 500;
}

.pp-field__control {
  display: flex;
  align-items: center;
  gap: 12px;
  height: 50px;
  padding: 0 14px;
  border: 1px solid rgba(243, 233, 216, 0.28);
  border-radius: 8px;
  background: rgba(26, 12, 5, 0.24);
  transition: border-color 180ms ease, box-shadow 180ms ease, background 180ms ease;
}

.pp-field__control:hover:not(.pp-field__control--disabled) {
  border-color: rgba(243, 233, 216, 0.46);
}

.pp-field__control:focus-within {
  border-color: var(--pp-gold);
  box-shadow: 0 0 0 3px var(--pp-gold-soft);
  background: rgba(26, 12, 5, 0.38);
}

.pp-field__control--error {
  border-color: var(--pp-error);
  box-shadow: 0 0 0 3px var(--pp-error-bg);
}

.pp-field__control--disabled {
  opacity: 0.62;
}

.pp-field__icon {
  flex: 0 0 auto;
  color: var(--pp-cream-dim);
}

.pp-field__input {
  min-width: 0;
  flex: 1;
  padding: 0;
  border: 0;
  outline: 0;
  background: transparent;
  color: var(--pp-cream);
  font: inherit;
  font-size: 14px;
}

.pp-field__input::placeholder {
  color: var(--pp-cream-faint);
}

.pp-field__toggle {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 4px;
  border: 0;
  background: transparent;
  color: var(--pp-cream-dim);
  cursor: pointer;
}

.pp-field__toggle:hover:not(:disabled) {
  color: var(--pp-cream);
}

.pp-field__error {
  margin: 6px 2px 0;
  color: var(--pp-error);
  font-size: 12px;
  font-weight: 500;
  line-height: 1.35;
}

.slide-fade-enter-active,
.slide-fade-leave-active {
  transition: opacity 160ms ease, transform 160ms ease;
}

.slide-fade-enter-from,
.slide-fade-leave-to {
  opacity: 0;
  transform: translateY(-3px);
}

.pp-field__input:-webkit-autofill,
.pp-field__input:-webkit-autofill:hover,
.pp-field__input:-webkit-autofill:focus {
  -webkit-text-fill-color: var(--pp-cream);
  -webkit-box-shadow: 0 0 0 1000px #251108 inset !important;
  caret-color: var(--pp-cream);
}
</style>
