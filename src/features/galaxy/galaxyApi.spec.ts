import { describe, expect, it, vi } from 'vitest'
import type { RestClient } from '@/shared/api'
import { createGalaxyApi } from './galaxyApi'

function mockClient(result: unknown) {
  const get = vi.fn(async () => result)
  const client = { get } as unknown as RestClient
  return { client, get }
}

describe('createGalaxyApi', () => {
  it('lädt die Galaxie über die übergebene Linkrelation ohne selbst gebaute URL', async () => {
    const overview = { startSystemId: 'sys_home', knownSystems: [], knownConnections: [] }
    const { client, get } = mockClient(overview)

    const result = await createGalaxyApi(client).getGalaxy('/api/v1/campaigns/cmp_1/galaxy')

    expect(get).toHaveBeenCalledWith('/api/v1/campaigns/cmp_1/galaxy')
    expect(result).toEqual(overview)
  })

  it('lädt das System über die Linkrelation aus der Galaxieübersicht', async () => {
    const detail = { systemId: 'sys_home', stars: [], planets: [] }
    const { client, get } = mockClient(detail)

    const result = await createGalaxyApi(client).getSystem(
      '/api/v1/campaigns/cmp_1/systems/sys_home',
    )

    expect(get).toHaveBeenCalledWith('/api/v1/campaigns/cmp_1/systems/sys_home')
    expect(result).toEqual(detail)
  })
})
