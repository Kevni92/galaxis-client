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
import { createHealthApi, HEALTH_API_KEY, useConnectionStore } from '@/features/connection'
import { createCampaignApi, useCampaignStore } from '@/features/campaign'

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
useCampaignStore().useApi(createCampaignApi(restClient))

// Verbindungszustand aus den technischen Health-Endpunkten ableiten; die Health-API steht der
// Entwicklungsanzeige zusätzlich per Bereitstellung zur Verfügung.
const healthApi = createHealthApi(restClient)
const connection = useConnectionStore()
connection.useApi(healthApi)
app.provide(HEALTH_API_KEY, healthApi)

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
// Erreichbarkeit des Servers einmalig prüfen; weitere Prüfungen laufen nur auf Nutzeraktion.
void connection.check()

app.mount('#app')
