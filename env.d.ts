/// <reference types="vite/client" />

// Typisierte, konfigurierbare Umgebungsvariablen des Clients.
// Siehe src/shared/config/appConfig.ts und .env.example.
interface ImportMetaEnv {
  /** Basis-URL der Galaxis-REST-API. Leer bedeutet server-relativ (siehe OpenAPI `servers: /`). */
  readonly VITE_API_BASE_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
