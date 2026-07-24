<script setup lang="ts">
// Feature: GAL-COLONY-HOME-001
// Designentscheidung: docs/decisions/0007-client-ui-rendering-und-lokalisierung.md (Game Shell und Fenster)
//
// Wiederverwendbare, fachlich neutrale Fensterhülle über der permanenten Raumansicht: gemeinsame
// Titelzeile, Inhaltsbereich und einheitlicher Aktionsbereich. Das Fenster ist modal, per Tastatur
// bedienbar (ESC schließt, Tab bleibt im Fenster) und gibt den Fokus beim Schließen zurück. Es kennt
// keine Fachlogik; Inhalt und Aktionen liefern die aufrufenden Feature-Fenster über Slots.
import { nextTick, onBeforeUnmount, onMounted, ref, useId } from 'vue'

withDefaults(
  defineProps<{
    /** Sichtbarer Fenstertitel in der festen Titelzeile. */
    title: string
    /** Optionale zweite Titelzeile, z. B. eine Objektkennung. */
    subtitle?: string
  }>(),
  { subtitle: undefined },
)

const emit = defineEmits<{ close: [] }>()

const titleId = useId()
const windowRef = ref<HTMLElement | null>(null)
let previouslyFocused: HTMLElement | null = null

function emitClose(): void {
  emit('close')
}

/** Alle tastaturfokussierbaren Elemente im Fenster; Grundlage für den Fokuseinschluss. */
function focusables(): HTMLElement[] {
  if (!windowRef.value) return []
  const selector =
    'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
  return Array.from(windowRef.value.querySelectorAll<HTMLElement>(selector))
}

function onKeydown(event: KeyboardEvent): void {
  if (event.key === 'Escape') {
    event.stopPropagation()
    emitClose()
    return
  }
  if (event.key !== 'Tab') return
  const elements = focusables()
  if (elements.length === 0) {
    event.preventDefault()
    windowRef.value?.focus()
    return
  }
  const first = elements[0]
  const last = elements[elements.length - 1]
  const active = document.activeElement
  if (event.shiftKey && active === first) {
    event.preventDefault()
    last.focus()
  } else if (!event.shiftKey && active === last) {
    event.preventDefault()
    first.focus()
  }
}

onMounted(async () => {
  previouslyFocused = (document.activeElement as HTMLElement | null) ?? null
  await nextTick()
  const elements = focusables()
  ;(elements[0] ?? windowRef.value)?.focus()
})

// Den Fokus beim Schließen an das auslösende Element zurückgeben (Tastaturbedienbarkeit).
onBeforeUnmount(() => previouslyFocused?.focus?.())
</script>

<template>
  <div class="modal-window__overlay" data-testid="modal-overlay" @click.self="emitClose">
    <div
      ref="windowRef"
      class="modal-window"
      role="dialog"
      aria-modal="true"
      :aria-labelledby="titleId"
      tabindex="-1"
      data-testid="modal-window"
      @keydown="onKeydown"
    >
      <header class="modal-window__titlebar">
        <div class="modal-window__titles">
          <h2 :id="titleId" class="modal-window__title" data-testid="modal-title">{{ title }}</h2>
          <p v-if="subtitle" class="modal-window__subtitle" data-testid="modal-subtitle">
            {{ subtitle }}
          </p>
        </div>
        <button
          type="button"
          class="modal-window__close"
          aria-label="Fenster schließen"
          data-testid="modal-close"
          @click="emitClose"
        >
          ✕
        </button>
      </header>

      <div class="modal-window__body" data-testid="modal-body">
        <slot />
      </div>

      <footer v-if="$slots.actions" class="modal-window__actions" data-testid="modal-actions">
        <slot name="actions" />
      </footer>
    </div>
  </div>
</template>

<style scoped>
.modal-window__overlay {
  position: fixed;
  inset: 0;
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1.5rem;
  /* Halbtransparent, damit die Raumansicht als Arbeitsfläche im Hintergrund sichtbar bleibt. */
  background: rgba(6, 8, 18, 0.55);
}

.modal-window {
  display: flex;
  flex-direction: column;
  width: min(44rem, 100%);
  max-height: min(90vh, 48rem);
  border: 1px solid var(--color-border, #3a3f55);
  border-radius: 0.6rem;
  background: var(--color-surface, #12141f);
  box-shadow: 0 1.5rem 3rem rgba(0, 0, 0, 0.45);
  overflow: hidden;
}

.modal-window:focus {
  outline: none;
}

.modal-window__titlebar {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.85rem 1rem;
  border-bottom: 1px solid var(--color-border, #3a3f55);
}

.modal-window__title {
  margin: 0;
  font-size: 1.1rem;
}

.modal-window__subtitle {
  margin: 0.15rem 0 0;
  font-size: 0.8rem;
  opacity: 0.75;
}

.modal-window__close {
  border: 1px solid var(--color-border, #3a3f55);
  border-radius: 0.35rem;
  background: transparent;
  color: inherit;
  cursor: pointer;
  padding: 0.25rem 0.55rem;
  line-height: 1;
}

.modal-window__body {
  padding: 1rem;
  overflow: auto;
}

.modal-window__actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  border-top: 1px solid var(--color-border, #3a3f55);
}
</style>
