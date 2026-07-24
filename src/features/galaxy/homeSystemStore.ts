// Feature: GAL-GALAXY-HOME-VIEW-001
// Feature: GAL-CLIENT-A1-NAV-001
// Fachlicher Vertrag: docs/contracts/rest-api/galaxis-rest-v1-a1.yaml (/campaigns/{id}/galaxy, /systems/{systemId})
// Designentscheidung: docs/decisions/0007-client-ui-rendering-und-lokalisierung.md

import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { toUiError, type UiError } from '@/shared/api'
import type { GalaxyApi, PlanetObject, StarObject, SystemDetailResponse } from './galaxyApi'
import type { SceneObject } from './rendering/systemScene'

/** Ladezustand des Heimatsystems; `ready` wird erst nach einer Serverantwort gesetzt. */
export type HomeSystemStatus = 'idle' | 'loading' | 'ready' | 'empty' | 'error'

/** Normalisierte, ausschließlich serverbekannte Sicht auf ein Raumobjekt für Liste und Szene. */
export interface SystemObject {
  id: string
  kind: 'star' | 'planet'
  /** Sichtbarer, lokalisierbarer Namensschlüssel des Servers. */
  displayNameKey: string
  /** Wissensstufe des kontrollierten Reiches. */
  knowledgeLevel: string
  /** Autoritative lokale XY-Position. */
  x: number
  y: number
  /** Rein präsentationaler Renderhinweis. */
  renderKind: string
  /** Serverautoritatives Merkmal für den sichtbaren Heimatplaneten. */
  homeworldEligible?: boolean
}

function fromStar(star: StarObject): SystemObject {
  return {
    id: star.starId,
    kind: 'star',
    displayNameKey: star.displayNameKey,
    knowledgeLevel: star.knowledgeLevel,
    x: star.localPosition.x,
    y: star.localPosition.y,
    renderKind: star.renderKind,
  }
}

function fromPlanet(planet: PlanetObject): SystemObject {
  return {
    id: planet.planetId,
    kind: 'planet',
    displayNameKey: planet.displayNameKey,
    knowledgeLevel: planet.knowledgeLevel,
    x: planet.localPosition.x,
    y: planet.localPosition.y,
    renderKind: planet.renderKind,
    homeworldEligible: planet.homeworldEligible,
  }
}

/**
 * Lädt und hält das bekannte Heimatsternsystem. Es werden ausschließlich serverseitig gelieferte,
 * bekannte Objekte samt autoritativer XY-Positionen dargestellt; der Client leitet keine Objekte,
 * Positionen oder Wissensstände selbst ab. Die Auswahl ist reiner Clientzustand.
 */
export const useHomeSystemStore = defineStore('homeSystem', () => {
  let api: GalaxyApi | null = null

  const system = ref<SystemDetailResponse | null>(null)
  const status = ref<HomeSystemStatus>('idle')
  const error = ref<UiError | null>(null)
  const selectedObjectId = ref<string | null>(null)
  const loadedGalaxyLink = ref<string | null>(null)

  /** Nur bekannte Sterne und Planeten des geladenen Systems, für Liste und Szene normalisiert. */
  const objects = computed<SystemObject[]>(() => {
    if (!system.value) return []
    return [...system.value.stars.map(fromStar), ...system.value.planets.map(fromPlanet)]
  })

  /** Reine Darstellungsobjekte für die gekapselte 3D-Szene. */
  const sceneObjects = computed<SceneObject[]>(() =>
    objects.value.map((o) => ({
      id: o.id,
      kind: o.kind,
      x: o.x,
      y: o.y,
      renderKind: o.renderKind,
    })),
  )

  const selectedObject = computed<SystemObject | null>(
    () => objects.value.find((o) => o.id === selectedObjectId.value) ?? null,
  )

  function useApi(next: GalaxyApi): void {
    api = next
  }

  function requireApi(): GalaxyApi {
    if (!api) throw new Error('Galaxie-API wurde nicht initialisiert (useApi fehlt).')
    return api
  }

  /**
   * Lädt das Heimatsystem über die Linkrelationen: zuerst die bekannte Galaxie, dann das Startsystem
   * über dessen `self`-Link. `ready` gilt erst nach der Systemantwort. Fehler (auch fehlender Zugriff
   * oder ein inkonsistenter Galaxiestand) werden ohne interne Details als UiError dargestellt.
   */
  async function loadFromGalaxy(galaxyLink: string, requestedSystemId?: string): Promise<void> {
    if (
      status.value === 'ready' &&
      loadedGalaxyLink.value === galaxyLink &&
      typeof requestedSystemId === 'string' &&
      system.value?.systemId === requestedSystemId
    ) {
      return
    }
    const client = requireApi()
    system.value = null
    selectedObjectId.value = null
    loadedGalaxyLink.value = null
    status.value = 'loading'
    error.value = null
    try {
      const galaxy = await client.getGalaxy(galaxyLink)
      const targetSystemId = requestedSystemId ?? galaxy.startSystemId
      const home = galaxy.knownSystems.find((s) => s.systemId === targetSystemId)
      const systemLink = home?.links?.self
      if (!systemLink) {
        // Ein Deep-Link darf keine nicht sichtbare System-ID erraten oder aufzählen.
        status.value = 'empty'
        return
      }
      const detail = await client.getSystem(systemLink)
      system.value = detail
      loadedGalaxyLink.value = galaxyLink
      status.value = 'ready'
    } catch (cause) {
      error.value = toUiError(cause)
      status.value = 'error'
    }
  }

  /** Wählt ein bekanntes Objekt aus; unbekannte oder nicht mehr vorhandene IDs werden verworfen. */
  function select(objectId: string | null): void {
    if (objectId === null) {
      selectedObjectId.value = null
      return
    }
    selectedObjectId.value = objects.value.some((o) => o.id === objectId) ? objectId : null
  }

  return {
    system,
    status,
    error,
    selectedObjectId,
    objects,
    sceneObjects,
    selectedObject,
    useApi,
    loadFromGalaxy,
    select,
  }
})

export type HomeSystemStore = ReturnType<typeof useHomeSystemStore>
