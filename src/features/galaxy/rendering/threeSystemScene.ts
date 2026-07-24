// Feature: GAL-GALAXY-HOME-VIEW-001
// Designentscheidung: docs/decisions/0007-client-ui-rendering-und-lokalisierung.md (Three.js über gekapselte Schicht)
//
// Three.js-Implementierung der Sternensystem-Szene. Nur diese Datei kennt Three.js; sie enthält
// keine Spielregeln. Die fachliche XY-Ebene des Servers wird auf die horizontale XZ-Ebene abgebildet;
// die schräge Kamera erzeugt räumliche Tiefe (rein präsentational, ohne fachliche Wirkung).

import {
  AmbientLight,
  Color,
  Group,
  Mesh,
  MeshStandardMaterial,
  PerspectiveCamera,
  PointLight,
  Raycaster,
  Scene,
  SphereGeometry,
  Vector2,
  WebGLRenderer,
} from 'three'
import type { SceneObject, SystemScene, SystemSceneFactory } from './systemScene'
import { bodyRadius, viewRadiusFor } from './framing'

const HIGHLIGHT_SCALE = 1.35

/** Gemerkter Ausgangszustand je Körper, um Hervorhebungen verlustfrei zurücknehmen zu können. */
interface MeshUserData {
  id: string
  baseEmissiveColor: Color
  baseEmissiveIntensity: number
  baseScale: number
}

/** Leitet aus dem präsentationalen Renderhinweis eine stabile Farbe ab (kein fachlicher Wert). */
function colorFor(object: SceneObject): Color {
  if (object.kind === 'star') return new Color('#ffd36b')
  let hash = 0
  for (const ch of object.renderKind) hash = (hash * 31 + ch.charCodeAt(0)) & 0xffff
  return new Color().setHSL((hash % 360) / 360, 0.45, 0.6)
}

function prefersReducedMotion(): boolean {
  return globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
}

export const createThreeSystemScene: SystemSceneFactory = (
  canvas: HTMLCanvasElement,
): SystemScene => {
  const scene = new Scene()
  scene.background = new Color('#05070f')

  const camera = new PerspectiveCamera(50, 1, 0.1, 2000)
  const renderer = new WebGLRenderer({ canvas, antialias: true })
  renderer.setPixelRatio(globalThis.devicePixelRatio ?? 1)

  scene.add(new AmbientLight(0xffffff, 0.7))
  const keyLight = new PointLight(0xffffff, 1.2)
  keyLight.position.set(40, 80, 40)
  scene.add(keyLight)

  const group = new Group()
  scene.add(group)

  const geometry = new SphereGeometry(1, 32, 24)
  const meshes = new Map<string, Mesh<SphereGeometry, MeshStandardMaterial>>()
  const raycaster = new Raycaster()
  const pointer = new Vector2()
  let selectHandler: ((objectId: string) => void) | null = null
  let animation = 0
  const animate = !prefersReducedMotion()

  function frameCamera(objects: readonly SceneObject[]): void {
    const distance = viewRadiusFor(objects) * 2.4
    camera.position.set(0, distance * 0.7, distance)
    camera.lookAt(0, 0, 0)
  }

  function applyHighlight(mesh: Mesh<SphereGeometry, MeshStandardMaterial>, on: boolean): void {
    const base = mesh.userData as MeshUserData
    // Beim Aufheben den gemerkten Ausgangszustand wiederherstellen (u. a. der Sterneigenglanz).
    mesh.material.emissive = on ? new Color('#4f7cff') : base.baseEmissiveColor.clone()
    mesh.material.emissiveIntensity = on ? 0.9 : base.baseEmissiveIntensity
    mesh.scale.setScalar(on ? base.baseScale * HIGHLIGHT_SCALE : base.baseScale)
  }

  function clearMeshes(): void {
    for (const mesh of meshes.values()) {
      group.remove(mesh)
      mesh.material.dispose()
    }
    meshes.clear()
  }

  function setObjects(objects: readonly SceneObject[]): void {
    clearMeshes()
    // Körpergröße relativ zur Systemausdehnung, damit weit außen liegende Planeten sichtbar bleiben.
    const viewRadius = viewRadiusFor(objects)
    for (const object of objects) {
      const material = new MeshStandardMaterial({ color: colorFor(object) })
      const mesh = new Mesh(geometry, material)
      const isStar = object.kind === 'star'
      material.emissiveIntensity = isStar ? 0.6 : 0.1
      material.emissive = isStar ? new Color('#ffb020') : new Color('#000000')
      const scale = bodyRadius(object.kind, viewRadius)
      mesh.userData = {
        id: object.id,
        baseEmissiveColor: material.emissive.clone(),
        baseEmissiveIntensity: material.emissiveIntensity,
        baseScale: scale,
      } satisfies MeshUserData
      mesh.scale.setScalar(scale)
      // Fachliche XY-Ebene → horizontale XZ-Ebene; die visuelle Höhe (Y) bleibt 0 (präsentational).
      mesh.position.set(object.x, 0, object.y)
      group.add(mesh)
      meshes.set(object.id, mesh)
    }
    frameCamera(objects)
    render()
  }

  function setSelection(objectId: string | null): void {
    for (const [id, mesh] of meshes) applyHighlight(mesh, id === objectId)
    render()
  }

  function onSelect(handler: (objectId: string) => void): void {
    selectHandler = handler
  }

  function pick(event: PointerEvent): void {
    if (!selectHandler) return
    const rect = canvas.getBoundingClientRect()
    if (rect.width === 0 || rect.height === 0) return
    pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
    pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1
    raycaster.setFromCamera(pointer, camera)
    const hit = raycaster.intersectObjects(group.children, false)[0]
    const id = hit?.object.userData.id
    if (typeof id === 'string') selectHandler(id)
  }

  function resize(width: number, height: number): void {
    if (width === 0 || height === 0) return
    renderer.setSize(width, height, false)
    camera.aspect = width / height
    camera.updateProjectionMatrix()
    render()
  }

  function render(): void {
    renderer.render(scene, camera)
  }

  function loop(): void {
    if (animate) group.rotation.y += 0.0015
    render()
    animation = globalThis.requestAnimationFrame(loop)
  }

  function dispose(): void {
    if (animation) globalThis.cancelAnimationFrame(animation)
    canvas.removeEventListener('pointerdown', pick)
    clearMeshes()
    geometry.dispose()
    renderer.dispose()
    selectHandler = null
  }

  canvas.addEventListener('pointerdown', pick)
  if (animate) animation = globalThis.requestAnimationFrame(loop)

  return { setObjects, setSelection, onSelect, resize, dispose }
}
