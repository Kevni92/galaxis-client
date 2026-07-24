import { describe, it, expect } from 'vitest'
import { resolveAppConfig, apiUrl } from './appConfig'

describe('resolveAppConfig', () => {
  it('behandelt eine fehlende Basis-URL als server-relativ', () => {
    expect(resolveAppConfig({}).apiBaseUrl).toBe('')
  })

  it('übernimmt eine konfigurierte Basis-URL', () => {
    const config = resolveAppConfig({ VITE_API_BASE_URL: 'http://localhost:3000' })
    expect(config.apiBaseUrl).toBe('http://localhost:3000')
  })

  it('entfernt einen abschließenden Schrägstrich', () => {
    const config = resolveAppConfig({ VITE_API_BASE_URL: 'https://api.example/' })
    expect(config.apiBaseUrl).toBe('https://api.example')
  })
})

describe('apiUrl', () => {
  it('bleibt server-relativ ohne konfigurierte Basis-URL', () => {
    expect(apiUrl('/api/v1/auth/session', { apiBaseUrl: '' })).toBe('/api/v1/auth/session')
  })

  it('hängt den Pfad an die Basis-URL an', () => {
    expect(apiUrl('/health/ready', { apiBaseUrl: 'http://localhost:3000' })).toBe(
      'http://localhost:3000/health/ready',
    )
  })

  it('ergänzt einen fehlenden führenden Schrägstrich', () => {
    expect(apiUrl('health/live', { apiBaseUrl: 'http://localhost:3000' })).toBe(
      'http://localhost:3000/health/live',
    )
  })
})
