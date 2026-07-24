import { beforeEach, describe, expect, it } from 'vitest'
import { createTokenStorage, SESSION_TOKEN_KEY } from './tokenStorage'

/** In-Memory-Ersatz für `sessionStorage`, um Persistenz deterministisch zu prüfen. */
function fakeStorage(seed: Record<string, string> = {}) {
  const map = new Map<string, string>(Object.entries(seed))
  return {
    getItem: (key: string) => map.get(key) ?? null,
    setItem: (key: string, value: string) => void map.set(key, value),
    removeItem: (key: string) => void map.delete(key),
    snapshot: () => Object.fromEntries(map),
  }
}

/** Speicher, dessen Zugriffe werfen (z. B. Privatmodus), um stille Degradierung zu prüfen. */
const throwingStorage = {
  getItem: () => {
    throw new Error('blocked')
  },
  setItem: () => {
    throw new Error('blocked')
  },
  removeItem: () => {
    throw new Error('blocked')
  },
}

describe('createTokenStorage', () => {
  beforeEach(() => {
    globalThis.sessionStorage?.clear()
  })

  it('hält das Token im Speicher ohne Persistenz', () => {
    const tokens = createTokenStorage({ persist: false })

    expect(tokens.get()).toBeUndefined()
    tokens.set('tok_1')
    expect(tokens.get()).toBe('tok_1')
    tokens.clear()
    expect(tokens.get()).toBeUndefined()
  })

  it('spiegelt das Token in den bereitgestellten Storage', () => {
    const storage = fakeStorage()
    const tokens = createTokenStorage({ storage })

    tokens.set('tok_2')
    expect(storage.snapshot()[SESSION_TOKEN_KEY]).toBe('tok_2')

    tokens.clear()
    expect(storage.snapshot()[SESSION_TOKEN_KEY]).toBeUndefined()
  })

  it('übernimmt ein bereits persistiertes Token beim Anlegen', () => {
    const storage = fakeStorage({ [SESSION_TOKEN_KEY]: 'tok_persisted' })
    const tokens = createTokenStorage({ storage })

    expect(tokens.get()).toBe('tok_persisted')
  })

  it('degradiert still, wenn der Storage-Zugriff wirft', () => {
    const tokens = createTokenStorage({ storage: throwingStorage })

    expect(tokens.get()).toBeUndefined()
    expect(() => tokens.set('tok_3')).not.toThrow()
    expect(tokens.get()).toBe('tok_3')
    expect(() => tokens.clear()).not.toThrow()
    expect(tokens.get()).toBeUndefined()
  })
})
