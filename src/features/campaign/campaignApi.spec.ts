import { describe, expect, it, vi } from 'vitest'
import type { RestClient } from '@/shared/api'
import { createCampaignApi } from './campaignApi'

const campaign = {
  campaignId: 'cmp_1',
  type: 'singleplayer',
  status: 'running',
  seed: 1337,
  timeProfile: 'standard',
  balancingVersion: '0.1.0',
  catalogVersion: '0.1.0',
  balancingHash: 'sha256:example',
  stateVersion: 1,
  createdAt: '2026-07-23T12:00:00Z',
}

/** Minimaler REST-Client-Mock, der nur die von der Kampagnen-API genutzten Methoden protokolliert. */
function mockClient(result: unknown) {
  const get = vi.fn(async () => result)
  const post = vi.fn(async () => result)
  const client = { get, post } as unknown as RestClient
  return { client, get, post }
}

describe('createCampaignApi', () => {
  it('listet über GET /api/v1/campaigns', async () => {
    const { client, get } = mockClient({ campaigns: [campaign] })

    const result = await createCampaignApi(client).list()

    expect(get).toHaveBeenCalledWith('/api/v1/campaigns')
    expect(result).toEqual({ campaigns: [campaign] })
  })

  it('erstellt über POST /api/v1/campaigns mit Idempotency-Key-Header', async () => {
    const { client, post } = mockClient(campaign)

    const result = await createCampaignApi(client).create(
      { seed: 1337, timeProfile: 'standard' },
      'idk_abc',
    )

    expect(post).toHaveBeenCalledWith(
      '/api/v1/campaigns',
      { seed: 1337, timeProfile: 'standard' },
      { headers: { 'Idempotency-Key': 'idk_abc' } },
    )
    expect(result).toEqual(campaign)
  })
})
