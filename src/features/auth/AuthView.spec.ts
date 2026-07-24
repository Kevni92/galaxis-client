import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter, type Router } from 'vue-router'
import { flushPromises, mount } from '@vue/test-utils'
import { defineComponent } from 'vue'
import AuthView from './AuthView.vue'
import { useAccountStore } from './accountStore'
import { useSessionStore } from './sessionStore'
import { ApiError } from '@/shared/api'
import type { AccountApi } from './accountApi'

const created = {
  sessionId: 'ses_1',
  accountId: 'acc_1',
  email: 'captain@example.test',
  token: 'tok_new',
  createdAt: '2026-07-24T12:00:00Z',
  expiresAt: '2026-07-25T12:00:00Z',
}

const account = {
  accountId: 'acc_1',
  email: 'captain@example.test',
  createdAt: '2026-07-24T12:00:00Z',
}

const Stub = defineComponent({ template: '<div />' })

function buildRouter(): Router {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', name: 'home', component: Stub },
      { path: '/login', name: 'login', component: AuthView },
      { path: '/campaigns', name: 'campaigns', component: Stub },
    ],
  })
}

async function mountAt(fullPath: string, api: AccountApi) {
  const router = buildRouter()
  useAccountStore().useApi(api)
  router.push(fullPath)
  await router.isReady()
  const wrapper = mount(AuthView, { global: { plugins: [router] } })
  return { wrapper, router }
}

function mockApi(overrides: Partial<AccountApi> = {}): AccountApi {
  return {
    register: vi.fn(async () => account),
    login: vi.fn(async () => created),
    ...overrides,
  }
}

async function fillAndSubmit(wrapper: Awaited<ReturnType<typeof mountAt>>['wrapper']) {
  await wrapper.get('[data-testid="email-input"]').setValue('captain@example.test')
  await wrapper.get('[data-testid="password-input"]').setValue('secret')
  await wrapper.get('form').trigger('submit')
  await flushPromises()
}

describe('AuthView', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    globalThis.sessionStorage.clear()
  })

  it('meldet an und leitet auf das Redirect-Ziel weiter', async () => {
    const api = mockApi()
    const { wrapper, router } = await mountAt('/login?redirect=/campaigns', api)

    await fillAndSubmit(wrapper)

    expect(api.login).toHaveBeenCalledWith({ email: 'captain@example.test', password: 'secret' })
    expect(useSessionStore().isAuthenticated).toBe(true)
    expect(router.currentRoute.value.fullPath).toBe('/campaigns')
  })

  it('leitet ohne gültigen Redirect auf die Startseite', async () => {
    const { wrapper, router } = await mountAt('/login', mockApi())

    await fillAndSubmit(wrapper)

    expect(router.currentRoute.value.name).toBe('home')
  })

  it('ignoriert ein fremdes Redirect-Ziel und bleibt lokal', async () => {
    const { wrapper, router } = await mountAt('/login?redirect=//evil.example', mockApi())

    await fillAndSubmit(wrapper)

    expect(router.currentRoute.value.name).toBe('home')
  })

  it('zeigt bei fehlgeschlagener Anmeldung die generische Servermeldung', async () => {
    const api = mockApi({
      login: vi.fn(async () => {
        throw new ApiError({
          kind: 'server',
          code: 'AUTHENTICATION_FAILED',
          message: 'Anmeldung fehlgeschlagen.',
          status: 401,
        })
      }),
    })
    const { wrapper, router } = await mountAt('/login', api)

    await fillAndSubmit(wrapper)

    expect(wrapper.get('[data-testid="form-error"]').text()).toBe('Anmeldung fehlgeschlagen.')
    expect(useSessionStore().isAuthenticated).toBe(false)
    expect(router.currentRoute.value.name).toBe('login')
  })

  it('wechselt nach erfolgreicher Registrierung in den Anmeldemodus mit Hinweis', async () => {
    const api = mockApi()
    const { wrapper } = await mountAt('/login', api)

    await wrapper.get('[data-testid="tab-register"]').trigger('click')
    await fillAndSubmit(wrapper)

    expect(api.register).toHaveBeenCalledOnce()
    expect(wrapper.get('[data-testid="tab-login"]').attributes('aria-selected')).toBe('true')
    expect(wrapper.find('[data-testid="form-notice"]').exists()).toBe(true)
  })

  it('sendet trotz mehrfachen Absendens nur einen Anmelde-Request', async () => {
    let resolveLogin: () => void = () => {}
    const api = mockApi({
      login: vi.fn(
        () =>
          new Promise<typeof created>((resolve) => {
            resolveLogin = () => resolve(created)
          }),
      ),
    })
    const { wrapper } = await mountAt('/login', api)

    await wrapper.get('[data-testid="email-input"]').setValue('captain@example.test')
    await wrapper.get('[data-testid="password-input"]').setValue('secret')
    await wrapper.get('form').trigger('submit')
    await wrapper.get('form').trigger('submit')

    expect(api.login).toHaveBeenCalledOnce()
    resolveLogin()
    await flushPromises()
  })

  it('leitet bereits angemeldete Nutzer von der Maske weg', async () => {
    const session = useSessionStore()
    session.adoptSession(created)

    const { router } = await mountAt('/login', mockApi())
    await flushPromises()

    expect(router.currentRoute.value.name).toBe('home')
  })
})
