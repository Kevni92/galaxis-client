// Feature: GAL-CLIENT-STATE-001
// Fachlicher Vertrag: docs/contracts/rest-api/galaxis-rest-v1.md (Abschnitt "Anforderungen an Client")

import { isApiError } from './apiError'
import type { HttpMethod } from './restClient'

/**
 * Nur sichere, idempotente HTTP-Methoden dürfen automatisch wiederholt werden. Befehle wie
 * `POST` verändern serverseitigen Zustand und dürfen nie stillschweigend dupliziert werden.
 */
export const SAFE_HTTP_METHODS: readonly HttpMethod[] = ['GET']

export interface SafeRetryOptions {
  /** Methode der Operation; nur `SAFE_HTTP_METHODS` werden überhaupt wiederholt. */
  method: HttpMethod
  /** Zusätzliche Versuche nach dem ersten Fehlversuch (Standard: 2). */
  retries?: number
  /** Wartezeit zwischen zwei Versuchen in Millisekunden (Standard: 300). */
  delayMs?: number
  /** Injizierbare Wartefunktion, damit Wiederholungen ohne echte Zeit getestet werden können. */
  sleep?: (ms: number) => Promise<void>
}

function isSafeMethod(method: HttpMethod): boolean {
  return SAFE_HTTP_METHODS.includes(method)
}

/** Ein Fehler rechtfertigt eine Wiederholung nur, wenn ihn der Vertrag als wiederholbar meldet. */
function isRetryable(error: unknown): boolean {
  return isApiError(error) && error.retryable
}

const defaultSleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms))

/**
 * Führt eine Operation aus und wiederholt sie ausschließlich bei sicheren Abfragen (GET) und
 * nur bei als wiederholbar markierten Transportfehlern. Befehle (POST/PUT/PATCH/DELETE) und
 * nicht wiederholbare Fehler (z. B. `401`) werden genau einmal versucht, damit keine
 * Serveraktion unbeabsichtigt dupliziert wird. Der zuletzt aufgetretene Fehler wird geworfen.
 */
export async function withSafeRetry<T>(
  operation: () => Promise<T>,
  options: SafeRetryOptions,
): Promise<T> {
  const attempts = isSafeMethod(options.method) ? Math.max(0, options.retries ?? 2) + 1 : 1
  const delayMs = options.delayMs ?? 300
  const sleep = options.sleep ?? defaultSleep

  let lastError: unknown
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await operation()
    } catch (error) {
      lastError = error
      const canRetry = attempt < attempts && isRetryable(error)
      if (!canRetry) break
      if (delayMs > 0) await sleep(delayMs)
    }
  }
  throw lastError
}
