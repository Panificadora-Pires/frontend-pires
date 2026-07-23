<template>
    <div class="login">
        <!-- ===== Painel do formulário ===== -->
        <section class="login__panel">
            <div class="login__watermark" aria-hidden="true">
                <Croissant :size="400" />
            </div>

            <div class="login__content">
                <div class="login__brand">
                    <img src="/logo.png" alt="Logo Pires Panificadora" class="login__logo" />
                </div>

                <h1 class="login__title">
                    Crie sua conta na <span class="login__title-gold">Pires Panificadora</span>
                </h1>
                <p class="login__subtitle">
                    Faça cadastro para acessar o sistema de pedidos da nossa cantina.
                </p>

                <form class="login__form" @submit.prevent="handleRegister" novalidate>
                    <BaseInput v-model="form.name" label="Nome Completo" placeholder="Digite seu nome" :icon="User"
                        :error="errors.name" />
                    <BaseInput v-model="form.email" label="E-mail" type="email" placeholder="seu@email.com" :icon="Mail"
                        :error="errors.email" />
                    <BaseInput v-model="form.password" label="Senha" type="password" placeholder="Mínimo 6 caracteres"
                        :icon="Lock" :error="errors.password" />
                    <BaseInput v-model="form.passwordConfirm" label="Confirmar Senha" type="password"
                        placeholder="Repita a senha" :icon="Lock" :error="errors.passwordConfirm" />

                    <BaseButton type="submit" block :icon="UserPlus" :loading="auth.carregando"
                        loading-text="Criando conta...">
                        Criar conta
                    </BaseButton>
                </form>

                <div class="login__footer">
                    <p>Já tem uma conta? <router-link :to="{ name: 'login' }" class="login__link">Faça
                            login</router-link></p>
                </div>
            </div>
        </section>

        <!-- ===== Painel da foto ===== -->
        <aside class="login__photo" aria-hidden="true">
            <div class="login__photo-overlay"></div>
            <div class="login__photo-vignette"></div>
        </aside>
    </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { User, Mail, Lock, UserPlus, Croissant } from 'lucide-vue-next'
import { useAuthStore } from '@/stores/auth'
import BaseInput from '@/components/ui/BaseInput.vue'
import BaseButton from '@/components/ui/BaseButton.vue'

const router = useRouter()
const auth = useAuthStore()

const form = reactive({
    name: '',
    email: '',
    password: '',
    passwordConfirm: ''
})

const errors = reactive({
    name: '',
    email: '',
    password: '',
    passwordConfirm: ''
})

const clearErrors = () => {
    errors.name = ''
    errors.email = ''
    errors.password = ''
    errors.passwordConfirm = ''
}

const validate = () => {
    clearErrors()
    let isValid = true

    if (!form.name) { errors.name = 'Informe seu nome.'; isValid = false }
    if (!form.email) { errors.email = 'Informe seu e-mail.'; isValid = false }
    if (!form.password || form.password.length < 6) { errors.password = 'A senha deve ter no mínimo 6 caracteres.'; isValid = false }
    if (form.password !== form.passwordConfirm) { errors.passwordConfirm = 'As senhas não coincidem.'; isValid = false }

    return isValid
}

const handleRegister = async () => {
    if (!validate()) return

    const sucesso = await auth.register(form.name, form.email, form.password)
    if (sucesso) {
        router.push('/')
    }
}
</script>

<style scoped>
/* Reutiliza exatamente o mesmo CSS premium do LoginView */
.login {
    min-height: 100vh;
    display: grid;
    grid-template-columns: 1fr 1fr;
}

.login__panel {
    background: var(--pp-gradient-left);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: var(--pp-space-6) var(--pp-space-5);
    position: relative;
    overflow: hidden;
}

.login__watermark {
    position: absolute;
    bottom: -10%;
    right: -5%;
    color: var(--pp-cream);
    opacity: 0.03;
    pointer-events: none;
    z-index: 0;
    transform: rotate(-15deg);
}

.login__content {
    width: 100%;
    max-width: 420px;
    position: relative;
    z-index: 1;
}

.login__brand {
    margin-bottom: var(--pp-space-5);
}

.login__logo {
    width: 180px;
    height: auto;
    object-fit: contain;
}

.login__title {
    font-family: var(--pp-font-body);
    font-size: 36px;
    font-weight: 700;
    color: var(--pp-cream);
    line-height: 1.2;
    margin: 0 0 var(--pp-space-3);
}

.login__title-gold {
    color: var(--pp-gold);
}

.login__subtitle {
    color: var(--pp-cream-dim);
    font-size: 16px;
    line-height: 1.5;
    margin: 0 0 var(--pp-space-5);
}

.login__form {
    display: flex;
    flex-direction: column;
    gap: 2px;
    /* Gap menor porque o BaseInput já tem margin */
}

.login__footer {
    text-align: center;
    margin-top: var(--pp-space-5);
    color: var(--pp-cream-dim);
    font-size: 14px;
}

.login__link {
    color: var(--pp-gold);
    font-weight: 600;
    transition: color 250ms;
}

.login__link:hover {
    color: var(--pp-cream);
}

/* Painel da Foto */
.login__photo {
    position: relative;
    background: url('/background-image.png') center/cover no-repeat;
    background-color: var(--pp-bg-dark-soft);
}

.login__photo-overlay {
    position: absolute;
    inset: 0;
    background: rgba(0, 0, 0, 0.1);
    mix-blend-mode: multiply;
    filter: contrast(1.1) saturate(1.1);
}

.login__photo-vignette {
    position: absolute;
    inset: 0;
    background: radial-gradient(circle, transparent 50%, rgba(0, 0, 0, 0.4) 100%);
}

@media (max-width: 768px) {
    .login {
        grid-template-columns: 1fr;
    }

    .login__photo {
        display: none;
    }

    .login__title {
        font-size: 28px;
    }
}
</style>