import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import CredentialsForm from './CredentialsForm.vue'
import type { AuthFormError } from './authError'

function mountForm(props: Partial<InstanceType<typeof CredentialsForm>['$props']> = {}) {
  return mount(CredentialsForm, {
    props: {
      idPrefix: 'login',
      submitLabel: 'Anmelden',
      pending: false,
      error: null,
      passwordAutocomplete: 'current-password',
      ...props,
    },
  })
}

describe('CredentialsForm', () => {
  it('verknüpft Labels und Felder für die Tastatur- und Screenreader-Bedienung', () => {
    const wrapper = mountForm()

    const emailInput = wrapper.get('[data-testid="email-input"]')
    expect(wrapper.find('label[for="login-email"]').exists()).toBe(true)
    expect(emailInput.attributes('id')).toBe('login-email')
    expect(emailInput.attributes('autocomplete')).toBe('email')
    expect(wrapper.get('[data-testid="password-input"]').attributes('autocomplete')).toBe(
      'current-password',
    )
  })

  it('sperrt das Absenden bei leeren Pflichtfeldern', async () => {
    const wrapper = mountForm()
    const button = wrapper.get('[data-testid="submit-button"]')

    expect(button.attributes('disabled')).toBeDefined()

    await wrapper.get('[data-testid="email-input"]').setValue('captain@example.test')
    await wrapper.get('[data-testid="password-input"]').setValue('pw')

    expect(button.attributes('disabled')).toBeUndefined()
  })

  it('sendet getrimmte Zugangsdaten beim Absenden', async () => {
    const wrapper = mountForm()

    await wrapper.get('[data-testid="email-input"]').setValue('  captain@example.test  ')
    await wrapper.get('[data-testid="password-input"]').setValue('secret')
    await wrapper.get('form').trigger('submit')

    expect(wrapper.emitted('submit')).toEqual([
      [{ email: 'captain@example.test', password: 'secret' }],
    ])
  })

  it('verhindert einen Doppel-Request während eines laufenden Requests', async () => {
    const wrapper = mountForm({ pending: true })

    await wrapper.get('[data-testid="email-input"]').setValue('captain@example.test')
    await wrapper.get('[data-testid="password-input"]').setValue('secret')
    await wrapper.get('form').trigger('submit')

    expect(wrapper.emitted('submit')).toBeUndefined()
    expect(wrapper.get('[data-testid="submit-button"]').attributes('disabled')).toBeDefined()
    expect(wrapper.get('[data-testid="email-input"]').attributes('disabled')).toBeDefined()
  })

  it('zeigt allgemeine und feldbezogene Serverfehler barrierefrei an', () => {
    const error: AuthFormError = {
      message: 'Anmeldung fehlgeschlagen.',
      fieldErrors: { email: 'Ungültiges Format.' },
    }
    const wrapper = mountForm({ error })

    const general = wrapper.get('[data-testid="form-error"]')
    expect(general.attributes('role')).toBe('alert')
    expect(general.text()).toBe('Anmeldung fehlgeschlagen.')

    const emailInput = wrapper.get('[data-testid="email-input"]')
    expect(emailInput.attributes('aria-invalid')).toBe('true')
    expect(emailInput.attributes('aria-describedby')).toBe('login-email-error')
    expect(wrapper.get('#login-email-error').text()).toBe('Ungültiges Format.')
  })
})
