import { describe, expect, it } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { h } from 'vue'
import ModalWindow from './ModalWindow.vue'

function mountWindow(slots: Record<string, unknown> = {}) {
  return mount(ModalWindow, {
    props: { title: 'Heimatplanet', subtitle: 'pln_home' },
    slots: { default: () => h('button', { type: 'button' }, 'Inhalt'), ...slots },
    attachTo: document.body,
  })
}

describe('ModalWindow', () => {
  it('zeigt Titel und Untertitel als beschriftetes modales Fenster', () => {
    const wrapper = mountWindow()

    const dialog = wrapper.get('[data-testid="modal-window"]')
    expect(dialog.attributes('role')).toBe('dialog')
    expect(dialog.attributes('aria-modal')).toBe('true')
    expect(dialog.attributes('aria-labelledby')).toBe(
      wrapper.get('[data-testid="modal-title"]').attributes('id'),
    )
    expect(wrapper.get('[data-testid="modal-title"]').text()).toBe('Heimatplanet')
    expect(wrapper.get('[data-testid="modal-subtitle"]').text()).toBe('pln_home')

    wrapper.unmount()
  })

  it('meldet den Schließwunsch per Schließen-Knopf, Overlay-Klick und ESC', async () => {
    const wrapper = mountWindow()

    await wrapper.get('[data-testid="modal-close"]').trigger('click')
    await wrapper.get('[data-testid="modal-overlay"]').trigger('click')
    await wrapper.get('[data-testid="modal-window"]').trigger('keydown', { key: 'Escape' })

    expect(wrapper.emitted('close')).toHaveLength(3)
    wrapper.unmount()
  })

  it('rendert den Aktionsbereich nur, wenn Aktionen bereitgestellt werden', () => {
    const withoutActions = mountWindow()
    expect(withoutActions.find('[data-testid="modal-actions"]').exists()).toBe(false)
    withoutActions.unmount()

    const withActions = mountWindow({ actions: () => h('button', { type: 'button' }, 'Schließen') })
    expect(withActions.find('[data-testid="modal-actions"]').exists()).toBe(true)
    withActions.unmount()
  })

  it('gibt den Fokus beim Schließen an das auslösende Element zurück', async () => {
    const trigger = document.createElement('button')
    document.body.appendChild(trigger)
    trigger.focus()
    expect(document.activeElement).toBe(trigger)

    const wrapper = mountWindow()
    await flushPromises()
    // Der Fokus wandert beim Öffnen in das Fenster.
    expect(document.activeElement).not.toBe(trigger)

    wrapper.unmount()
    expect(document.activeElement).toBe(trigger)
    trigger.remove()
  })
})
