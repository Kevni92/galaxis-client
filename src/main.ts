import './assets/base.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './app/router'
import { createRestClient } from '@/shared/api'
import {
  createAccountApi,
  createSessionApi,
  createSessionGuard,
  useAccountStore,
  useSessionStore,
} from '@/features/auth'

const app = createApp(App)

// Letzte Auffanglinie zusätzlich zur komponentenbasierten Fehlergrenze.
app.config.errorHandler = (err) => {
  console.error('[galaxis-client] Unbehandelter Fehler:', err)
}

app.use(createPinia())

// Session-Store und REST-Client verbinden: Der Client zieht das Token aus dem Store,
// der Store spricht über den Client mit den serverautoritativen Session-Endpunkten.
const session = useSessionStore()
const restClient = createRestClient({ session: session.sessionProvider })
session.useApi(createSessionApi(restClient))
useAccountStore().useApi(createAccountApi(restClient))

// Nicht angemeldete Zugriffe auf geschützte Routen landen auf der Anmeldemaske;
// der ursprüngliche Pfad wird als `redirect`-Query mitgegeben.
router.beforeEach(
  createSessionGuard(session, {
    redirectTo: (to) => ({ name: 'login', query: { redirect: to.fullPath } }),
  }),
)
app.use(router)

// Startprüfung anstoßen; der Guard wartet bei geschützten Routen auf das Ergebnis.
void session.ensureVerified()

app.mount('#app')
