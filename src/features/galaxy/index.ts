// Feature: GAL-GALAXY-HOME-VIEW-001
// Öffentliche Schnittstelle des Galaxie-Moduls: bekannte Heimatsystemansicht und API-Anbindung.

export { createGalaxyApi } from './galaxyApi'
export type {
  GalaxyApi,
  GalaxyOverviewResponse,
  SystemDetailResponse,
  StarObject,
  PlanetObject,
} from './galaxyApi'
export { useHomeSystemStore } from './homeSystemStore'
export type { HomeSystemStore, HomeSystemStatus, SystemObject } from './homeSystemStore'
export type { SceneObject, SystemScene, SystemSceneFactory } from './rendering/systemScene'
// `HomeSystemView` wird bewusst nicht über die Barrel exportiert, damit die Shell sie per
// Lazy-Import in einen eigenen Chunk laden kann (Three.js bleibt außerhalb des Startbundles).
