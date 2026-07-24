import './assets/base.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './app/router'

const app = createApp(App)

// Letzte Auffanglinie zusätzlich zur komponentenbasierten Fehlergrenze.
app.config.errorHandler = (err) => {
  console.error('[galaxis-client] Unbehandelter Fehler:', err)
}

app.use(createPinia())
app.use(router)

app.mount('#app')
