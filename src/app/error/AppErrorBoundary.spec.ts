import { describe, it, expect, vi } from 'vitest'
import { defineComponent, h } from 'vue'
import { mount } from '@vue/test-utils'
import AppErrorBoundary from './AppErrorBoundary.vue'

describe('AppErrorBoundary', () => {
  it('rendert den Slot-Inhalt im Normalfall', () => {
    const wrapper = mount(AppErrorBoundary, {
      slots: { default: '<p data-testid="child">Inhalt</p>' },
    })

    expect(wrapper.find('[data-testid="child"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="error-boundary"]').exists()).toBe(false)
  })

  it('zeigt die Ersatzdarstellung, wenn eine Kindkomponente wirft', async () => {
    // Vue meldet gefangene Fehler zusätzlich über console.warn – hier bewusst unterdrückt.
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})

    const Boom = defineComponent({
      setup() {
        throw new Error('kaputt')
      },
      render: () => h('div'),
    })

    const wrapper = mount(AppErrorBoundary, {
      slots: { default: () => h(Boom) },
    })
    await wrapper.vm.$nextTick()

    const fallback = wrapper.find('[data-testid="error-boundary"]')
    expect(fallback.exists()).toBe(true)
    expect(fallback.attributes('role')).toBe('alert')

    warn.mockRestore()
  })
})
