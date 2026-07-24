import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import ErrorNotice from './ErrorNotice.vue'
import type { UiError } from '@/shared/api'

function uiError(overrides: Partial<UiError> = {}): UiError {
  return {
    kind: 'server',
    code: 'SOME_CODE',
    message: 'Etwas ist schiefgelaufen.',
    correlationId: 'cor_abc123',
    retryable: false,
    details: [],
    ...overrides,
  }
}

describe('ErrorNotice', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('unterscheidet Serverausfall von einem fachlichen Fehler in der Überschrift', () => {
    const network = mount(ErrorNotice, { props: { error: uiError({ kind: 'network' }) } })
    expect(network.get('[data-testid="error-title"]').text()).toBe('Server nicht erreichbar')

    const server = mount(ErrorNotice, { props: { error: uiError({ kind: 'server' }) } })
    expect(server.get('[data-testid="error-title"]').text()).toBe('Es ist ein Fehler aufgetreten')
  })

  it('zeigt die Servermeldung unverändert', () => {
    const wrapper = mount(ErrorNotice, {
      props: { error: uiError({ message: 'Anmeldung fehlgeschlagen.' }) },
    })
    expect(wrapper.get('[data-testid="error-message"]').text()).toBe('Anmeldung fehlgeschlagen.')
  })

  it('kopiert die Korrelations-ID in die Zwischenablage', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    vi.stubGlobal('navigator', { clipboard: { writeText } })

    const wrapper = mount(ErrorNotice, { props: { error: uiError({ correlationId: 'cor_xyz' }) } })
    await wrapper.get('[data-testid="copy-correlation-id"]').trigger('click')

    expect(writeText).toHaveBeenCalledWith('cor_xyz')
    expect(wrapper.get('[data-testid="copy-correlation-id"]').text()).toBe('Kopiert')
  })

  it('blendet den Korrelationsblock ohne ID aus', () => {
    const wrapper = mount(ErrorNotice, { props: { error: uiError({ correlationId: undefined }) } })
    expect(wrapper.find('[data-testid="correlation-id"]').exists()).toBe(false)
  })

  it('bietet Wiederholung nur bei wiederholbaren Fehlern', () => {
    const notRetryable = mount(ErrorNotice, { props: { error: uiError({ retryable: false }) } })
    expect(notRetryable.find('[data-testid="retry-button"]').exists()).toBe(false)

    const retryable = mount(ErrorNotice, { props: { error: uiError({ retryable: true }) } })
    expect(retryable.find('[data-testid="retry-button"]').exists()).toBe(true)
  })

  it('unterdrückt die Wiederholung bei retry="never" (z. B. Befehle)', () => {
    const wrapper = mount(ErrorNotice, {
      props: { error: uiError({ retryable: true }), retry: 'never' },
    })
    expect(wrapper.find('[data-testid="retry-button"]').exists()).toBe(false)
  })

  it('erzwingt die Wiederholung bei retry="always" trotz retryable=false', () => {
    const wrapper = mount(ErrorNotice, {
      props: { error: uiError({ retryable: false }), retry: 'always' },
    })
    expect(wrapper.find('[data-testid="retry-button"]').exists()).toBe(true)
  })

  it('meldet einen Wiederholungswunsch an den Aufrufer', async () => {
    const wrapper = mount(ErrorNotice, { props: { error: uiError({ retryable: true }) } })
    await wrapper.get('[data-testid="retry-button"]').trigger('click')
    expect(wrapper.emitted('retry')).toHaveLength(1)
  })
})
