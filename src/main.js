import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'
import router from './router'
import revelar from './directives/revelar'
import { onExternalSessionChange } from './services/api'
import './assets/styles/tokens.css'
import './assets/styles/auth-forms.css'
import './assets/styles/student.css'
import './assets/styles/card-actions.css'

const app = createApp(App)
const pinia = createPinia()
let mounted = false

app.use(pinia)
const stopSessionListener = onExternalSessionChange(() => {
  // Descarta também estado privado local às views/modais e seus timers/polling.
  if (mounted) app.unmount()
  for (const store of pinia._s.values()) store.$reset()
  document.getElementById('app')?.replaceChildren()
  window.location.replace('/login?motivo=sessao-alterada')
})
if (import.meta.hot) import.meta.hot.dispose(stopSessionListener)
app.use(router)
// Seções que aparecem suavemente na rolagem (área do cliente).
app.directive('revelar', revelar)
app.mount('#app')
mounted = true
