// Feature: GAL-CAMPAIGN-CREATE-001
// Öffentliche Schnittstelle des Kampagnen-Moduls: Kampagnenliste, Erstellung und API-Anbindung.

export { createCampaignApi } from './campaignApi'
export type {
  CampaignApi,
  CampaignResponse,
  CampaignListResponse,
  CreateCampaignRequest,
} from './campaignApi'
export { useCampaignStore } from './campaignStore'
export type { CampaignStore, CampaignListStatus } from './campaignStore'
export { extractCampaignError } from './campaignError'
export type { CampaignFormError } from './campaignError'
export { createIdempotencyKey } from './idempotency'
export type { IdempotencyKeyFactory } from './idempotency'
// Die Ansichten `CampaignListView`/`CampaignView` werden bewusst nicht über die Barrel exportiert,
// damit die Routen sie weiterhin per Lazy-Import in eigene Chunks laden können.
