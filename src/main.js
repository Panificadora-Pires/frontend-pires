import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'
import router from './router'
import revelar from './directives/revelar'
import './assets/styles/tokens.css'
import './assets/styles/auth-forms.css'
import './assets/styles/student.css'

const app = createApp(App)

app.use(createPinia())
app.use(router)
// Seções que aparecem suavemente na rolagem (área do cliente).
app.directive('revelar', revelar)
app.mount('#app')
