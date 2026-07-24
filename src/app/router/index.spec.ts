import { describe, expect, it } from 'vitest'
import router from './index'

describe('application routes', () => {
  it('resolves the campaign system deep-link with campaign and system context', () => {
    const resolved = router.resolve(
      '/campaigns/cmp_1/systems/sys_home?object=pln_home&window=colony',
    )

    expect(resolved.name).toBe('campaign-system')
    expect(resolved.params).toMatchObject({ campaignId: 'cmp_1', systemId: 'sys_home' })
    expect(resolved.query).toEqual({ object: 'pln_home', window: 'colony' })
    expect(resolved.meta.requiresAuth).toBe(true)
  })
})
