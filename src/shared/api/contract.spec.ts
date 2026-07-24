import { describe, expect, it, vi } from 'vitest'
import { createRestClient } from './restClient'
import type { GameSchemas } from './contract'

/**
 * Mock-Contract-Test: Die Mock-Antwort wird gegen die aus der OpenAPI generierten
 * Typen geprüft. Weicht der Vertrag ab, bricht bereits die Typprüfung dieses Tests.
 */
describe('REST-Client gegen Vertragstypen', () => {
  it('liefert eine vertragskonforme Kampagnenliste typisiert zurück', async () => {
    const body: GameSchemas['CampaignListResponse'] = {
      campaigns: [
        {
          campaignId: 'cmp_1',
          type: 'singleplayer',
          status: 'running',
          seed: 42,
          timeProfile: 'standard',
          balancingVersion: '1.0.0',
          catalogVersion: '1.0.0',
          balancingHash: 'hash',
          stateVersion: 1,
          createdAt: '2026-07-23T12:00:00Z',
        },
      ],
    }
    const fetch = vi.fn(
      async () =>
        new Response(JSON.stringify(body), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
    ) as unknown as typeof globalThis.fetch

    const client = createRestClient({ baseUrl: '', fetch })
    const result = await client.get<GameSchemas['CampaignListResponse']>('/api/v1/campaigns')

    expect(result.campaigns).toHaveLength(1)
    expect(result.campaigns[0].campaignId).toBe('cmp_1')
    expect(result.campaigns[0].type).toBe('singleplayer')
  })
})
